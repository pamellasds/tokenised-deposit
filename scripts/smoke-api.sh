#!/usr/bin/env bash
# End-to-end smoke without Bruno CLI (curl).
set -euo pipefail

API="${API_URL:-http://127.0.0.1:3001}"
HOLDER="0x90F79bf6EB2c4f870365E785982E1f101E93b906"
HOLDER_KEY="0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"

echo "== health =="
curl -sf "$API/health" | tee /tmp/td-health.json
echo

echo "== mint =="
curl -sf -X POST "$API/mint" -H 'content-type: application/json' \
  -d "{\"to\":\"$HOLDER\",\"amount\":\"100\"}" | tee /tmp/td-mint.json
echo

echo "== mint-with-authorization =="
curl -sf -X POST "$API/mint-with-authorization" -H 'content-type: application/json' \
  -d "{\"to\":\"$HOLDER\",\"amount\":\"50\"}" | tee /tmp/td-mint-auth.json
echo

echo "== balance =="
curl -sf "$API/balances/$HOLDER" | tee /tmp/td-bal.json
echo

echo "== redeem request =="
REQ="$(curl -sf -X POST "$API/redeem/request" -H 'content-type: application/json' \
  -d "{\"holderKey\":\"$HOLDER_KEY\",\"amount\":\"25\"}")"
echo "$REQ" | tee /tmp/td-req.json
ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["redeemId"])' <<<"$REQ")"
echo "redeemId=$ID"

echo "== redeem confirm =="
curl -sf -X POST "$API/redeem/confirm" -H 'content-type: application/json' \
  -d "{\"id\":\"$ID\"}" | tee /tmp/td-confirm.json
echo

echo "== events =="
curl -sf "$API/events" | tee /tmp/td-events.json
echo
echo "SMOKE OK"
