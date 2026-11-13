import type { Wallet } from "ethers";

const mintAuthTypes = {
  MintAuthorization: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export async function signMintAuthorization(
  issuer: Wallet,
  tokenAddress: string,
  chainId: number,
  params: { to: string; amount: bigint; nonce: bigint; deadline: bigint },
): Promise<string> {
  const domain = {
    name: "Tokenised Deposit Receipt",
    version: "1",
    chainId,
    verifyingContract: tokenAddress,
  };

  return issuer.signTypedData(domain, mintAuthTypes, {
    to: params.to,
    amount: params.amount,
    nonce: params.nonce,
    deadline: params.deadline,
  });
}
