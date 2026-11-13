import { Contract, JsonRpcProvider, Wallet, formatEther, parseEther } from "ethers";
import { tokenisedDepositAbi } from "./abi.js";

export type AppConfig = {
  rpcUrl: string;
  tokenAddress: string;
  chainId: number;
  issuerKey: string;
  custodianKey: string;
  deployerKey: string;
};

export function createChain(config: AppConfig) {
  const provider = new JsonRpcProvider(config.rpcUrl, config.chainId, {
    staticNetwork: true,
  });
  const issuer = new Wallet(config.issuerKey, provider);
  const custodian = new Wallet(config.custodianKey, provider);
  /** Relayer submits EIP-712 mints so the issuer only signs (avoids nonce clashes). */
  const relayer = new Wallet(config.deployerKey, provider);
  const reader = new Contract(config.tokenAddress, tokenisedDepositAbi, provider);
  const issuerContract = reader.connect(issuer) as Contract;
  const custodianContract = reader.connect(custodian) as Contract;
  const relayerContract = reader.connect(relayer) as Contract;

  return {
    provider,
    issuer,
    custodian,
    relayer,
    reader,
    issuerContract,
    custodianContract,
    relayerContract,
    parseAmount: (value: string) => parseEther(value),
    formatAmount: (value: bigint) => formatEther(value),
  };
}

export type Chain = ReturnType<typeof createChain>;
