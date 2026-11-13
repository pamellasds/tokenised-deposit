import "dotenv/config";
import cors from "cors";
import express from "express";
import { Wallet } from "ethers";
import { z } from "zod";
import { createChain } from "./chain.js";
import { signMintAuthorization } from "./eip712.js";

const port = Number(process.env.PORT ?? 3001);
const tokenAddress = process.env.TOKEN_ADDRESS;
if (!tokenAddress) {
  console.error("TOKEN_ADDRESS is required. Run scripts/deploy-local.sh first.");
  process.exit(1);
}

const chainId = Number(process.env.CHAIN_ID ?? 31337);

const chain = createChain({
  rpcUrl: process.env.RPC_URL ?? "http://127.0.0.1:8545",
  tokenAddress,
  chainId,
  issuerKey: requiredEnv("ISSUER_KEY"),
  custodianKey: requiredEnv("CUSTODIAN_KEY"),
  deployerKey: requiredEnv("DEPLOYER_KEY"),
});

type MirrorEvent =
  | { type: "Minted"; to: string; amount: string; actor: string; txHash: string }
  | { type: "RedeemRequested"; id: string; holder: string; amount: string; txHash: string }
  | { type: "RedeemConfirmed"; id: string; holder: string; amount: string; txHash: string }
  | { type: "RedeemCancelled"; id: string; holder: string; amount: string; txHash: string };

const events: MirrorEvent[] = [];

function pushEvent(event: MirrorEvent) {
  events.unshift(event);
  if (events.length > 100) events.pop();
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, token: tokenAddress, chainId });
});

app.get("/meta", async (_req, res) => {
  const [name, symbol, decimals, totalSupply, paused, issuer, custodian] = await Promise.all([
    chain.reader.name(),
    chain.reader.symbol(),
    chain.reader.decimals(),
    chain.reader.totalSupply(),
    chain.reader.paused(),
    chain.issuer.getAddress(),
    chain.custodian.getAddress(),
  ]);
  res.json({
    name,
    symbol,
    decimals: Number(decimals),
    totalSupply: chain.formatAmount(totalSupply),
    paused,
    tokenAddress,
    issuer,
    custodian,
  });
});

app.get("/balances/:address", async (req, res) => {
  try {
    const address = z.string().parse(req.params.address);
    const balance = await chain.reader.balanceOf(address);
    res.json({ address, balance: chain.formatAmount(balance) });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

app.get("/redeems/:id", async (req, res) => {
  try {
    const id = z.coerce.bigint().parse(req.params.id);
    const result = await chain.reader.redeems(id);
    res.json({
      id: id.toString(),
      holder: result.holder as string,
      amount: chain.formatAmount(result.amount as bigint),
      pending: Boolean(result.pending),
    });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

app.get("/events", (_req, res) => {
  res.json({ events });
});

app.post("/mint", async (req, res) => {
  try {
    const body = z.object({ to: z.string().min(1), amount: z.string().min(1) }).parse(req.body);
    const amount = chain.parseAmount(body.amount);
    const tx = await chain.issuerContract.mint(body.to, amount);
    const receipt = await tx.wait();
    pushEvent({
      type: "Minted",
      to: body.to,
      amount: body.amount,
      actor: await chain.issuer.getAddress(),
      txHash: receipt.hash,
    });
    res.json({ txHash: receipt.hash });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

app.post("/mint-with-authorization", async (req, res) => {
  try {
    const body = z
      .object({
        to: z.string().min(1),
        amount: z.string().min(1),
        deadlineSeconds: z.number().int().positive().optional().default(3600),
      })
      .parse(req.body);
    const amount = chain.parseAmount(body.amount);
    const nonce: bigint = await chain.reader.mintNonces(body.to);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + body.deadlineSeconds);
    const signature = await signMintAuthorization(chain.issuer, tokenAddress, chainId, {
      to: body.to,
      amount,
      nonce,
      deadline,
    });
    // Relayer posts the signed auth; issuer key is only used for EIP-712.
    const tx = await chain.relayerContract.mintWithAuthorization(
      body.to,
      amount,
      nonce,
      deadline,
      signature,
    );
    const receipt = await tx.wait();
    pushEvent({
      type: "Minted",
      to: body.to,
      amount: body.amount,
      actor: await chain.issuer.getAddress(),
      txHash: receipt.hash,
    });
    res.json({
      txHash: receipt.hash,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      signature,
    });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

app.post("/redeem/request", async (req, res) => {
  try {
    const body = z
      .object({ holderKey: z.string().min(1), amount: z.string().min(1) })
      .parse(req.body);
    const holder = new Wallet(body.holderKey, chain.provider);
    const amount = chain.parseAmount(body.amount);
    const holderContract = chain.reader.connect(holder) as typeof chain.issuerContract;
    const tx = await holderContract.requestRedeem(amount);
    const receipt = await tx.wait();
    const nextId: bigint = await chain.reader.nextRedeemId();
    const id = (nextId - 1n).toString();
    pushEvent({
      type: "RedeemRequested",
      id,
      holder: await holder.getAddress(),
      amount: body.amount,
      txHash: receipt.hash,
    });
    res.json({ txHash: receipt.hash, redeemId: id });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

app.post("/redeem/confirm", async (req, res) => {
  try {
    const body = z.object({ id: z.union([z.string(), z.number()]) }).parse(req.body);
    const id = BigInt(body.id);
    const before = await chain.reader.redeems(id);
    const tx = await chain.custodianContract.confirmRedeem(id);
    const receipt = await tx.wait();
    pushEvent({
      type: "RedeemConfirmed",
      id: id.toString(),
      holder: before.holder as string,
      amount: chain.formatAmount(before.amount as bigint),
      txHash: receipt.hash,
    });
    res.json({ txHash: receipt.hash });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

app.post("/redeem/cancel", async (req, res) => {
  try {
    const body = z
      .object({
        id: z.union([z.string(), z.number()]),
        holderKey: z.string().min(1),
      })
      .parse(req.body);
    const holder = new Wallet(body.holderKey, chain.provider);
    const holderContract = chain.reader.connect(holder) as typeof chain.issuerContract;
    const id = BigInt(body.id);
    const before = await chain.reader.redeems(id);
    const tx = await holderContract.cancelRedeem(id);
    const receipt = await tx.wait();
    pushEvent({
      type: "RedeemCancelled",
      id: id.toString(),
      holder: before.holder as string,
      amount: chain.formatAmount(before.amount as bigint),
      txHash: receipt.hash,
    });
    res.json({ txHash: receipt.hash });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
});

app.listen(port, () => {
  console.log(`tokenised-deposit API on http://127.0.0.1:${port}`);
  console.log(`token ${tokenAddress}`);
});

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
