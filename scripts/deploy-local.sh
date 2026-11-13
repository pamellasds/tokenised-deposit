#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
# Anvil account #0
DEPLOYER_KEY="${DEPLOYER_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
# Anvil #1 issuer, #2 custodian
ISSUER_ADDRESS="${ISSUER_ADDRESS:-0x70997970C51812dc3A010C7d01b50e0d17dc79C8}"
CUSTODIAN_ADDRESS="${CUSTODIAN_ADDRESS:-0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC}"

if ! curl -s -X POST "$RPC_URL" -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' >/dev/null; then
  echo "Anvil not reachable at $RPC_URL"
  echo "Start it with: anvil --chain-id 31337"
  exit 1
fi

cd "$ROOT/contracts"

echo "Deploying TokenisedDeposit…"
OUT="$(
  DEPLOYER_KEY="$DEPLOYER_KEY" \
  ADMIN_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
  ISSUER_ADDRESS="$ISSUER_ADDRESS" \
  CUSTODIAN_ADDRESS="$CUSTODIAN_ADDRESS" \
  forge script script/Deploy.s.sol:DeployScript \
    --rpc-url "$RPC_URL" \
    --broadcast \
    -vv
)"

echo "$OUT"

TOKEN_ADDRESS="$(echo "$OUT" | sed -n 's/.*TokenisedDeposit[[:space:]]*\(0x[0-9a-fA-F]*\).*/\1/p' | tail -1)"
if [[ -z "$TOKEN_ADDRESS" ]]; then
  # Fallback: parse broadcast JSON
  BROADCAST="$(ls -1t "$ROOT/contracts/broadcast/Deploy.s.sol/31337/run-latest.json" 2>/dev/null | head -1 || true)"
  if [[ -n "${BROADCAST:-}" ]]; then
    TOKEN_ADDRESS="$(python3 - <<PY
import json
with open("$BROADCAST") as f:
    data=json.load(f)
for tx in data.get("transactions", []):
    if tx.get("contractName") == "TokenisedDeposit" and tx.get("contractAddress"):
        print(tx["contractAddress"])
        break
PY
)"
  fi
fi

if [[ -z "$TOKEN_ADDRESS" ]]; then
  echo "Could not parse TOKEN_ADDRESS from deploy output"
  exit 1
fi

ENV_FILE="$ROOT/api/.env"
cat > "$ENV_FILE" <<EOF
PORT=3001
RPC_URL=$RPC_URL
CHAIN_ID=31337
DEPLOYER_KEY=$DEPLOYER_KEY
ISSUER_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
CUSTODIAN_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
TOKEN_ADDRESS=$TOKEN_ADDRESS
EOF

echo "Wrote $ENV_FILE"
echo "TOKEN_ADDRESS=$TOKEN_ADDRESS"
