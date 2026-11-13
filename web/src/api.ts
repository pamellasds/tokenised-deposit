const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? `HTTP ${response.status}`);
  }
  return data as T;
}

export type Meta = {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  paused: boolean;
  tokenAddress: string;
  issuer: string;
  custodian: string;
};

export type MirrorEvent = {
  type: string;
  txHash: string;
  amount?: string;
  to?: string;
  holder?: string;
  id?: string;
  actor?: string;
};

export const api = {
  health: () => request<{ ok: boolean }>("/health"),
  meta: () => request<Meta>("/meta"),
  balance: (address: string) =>
    request<{ address: string; balance: string }>(`/balances/${address}`),
  events: () => request<{ events: MirrorEvent[] }>("/events"),
  mint: (to: string, amount: string) =>
    request<{ txHash: string }>("/mint", {
      method: "POST",
      body: JSON.stringify({ to, amount }),
    }),
  mintWithAuth: (to: string, amount: string) =>
    request<{ txHash: string }>("/mint-with-authorization", {
      method: "POST",
      body: JSON.stringify({ to, amount }),
    }),
  requestRedeem: (holderKey: string, amount: string) =>
    request<{ txHash: string; redeemId: string }>("/redeem/request", {
      method: "POST",
      body: JSON.stringify({ holderKey, amount }),
    }),
  confirmRedeem: (id: string) =>
    request<{ txHash: string }>("/redeem/confirm", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  cancelRedeem: (id: string, holderKey: string) =>
    request<{ txHash: string }>("/redeem/cancel", {
      method: "POST",
      body: JSON.stringify({ id, holderKey }),
    }),
};
