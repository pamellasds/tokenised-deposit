# DepositRail · Tokenised Deposit (PoC)

Proof of concept for an on-chain **bank deposit certificate** in institutional tokenisation workflows.

Cash stays in custody. `tDEP` is the transferable ERC-20 proof of that deposit, the programmable analogue of a Brazilian **CDB (Certificado de Depósito Bancário)** or an international **Certificate of Deposit (CD)** / **bank deposit token**.

Stack: smart contracts, API, role-based console, tests, and design docs.

## Why this PoC

Banks and capital-markets desks need a way to represent a booked deposit on-chain without putting fiat inside a smart contract. DepositRail models that certificate so teams can:

- **Issue** a deposit certificate after off-chain booking
- **Hold / transfer** the claim on-chain
- **Redeem** with a two-step settlement (investor request, custodian confirmation after fiat payout)

It is intentionally **not** a credit/loan certificate, not a reserve-backed stablecoin, and not a DeFi vault with on-chain collateral.

## Technical highlights

| Layer | Choices |
| --- | --- |
| Contracts | Solidity 0.8.24, Foundry, OpenZeppelin (ERC-20, AccessControl, Pausable, EIP-712) |
| Issuance | Direct `mint` by issuer; optional `mintWithAuthorization` (EIP-712 signature + relayer) |
| Redeem | Lock in contract → custodian `confirmRedeem` (burn) or investor `cancelRedeem` |
| Backend | TypeScript, Express, ethers v6 against local **Anvil** |
| Frontend | Vite + React console with **mock sign-in by role** (investor / issuer / custodian) |
| Quality | Foundry unit + fuzz tests; Bruno HTTP collection; smoke script |

Roles mirror real desks: **issuer** mints, **investor** requests/cancels redeem, **custodian** settles after payout.

## Main requirements (summary)

| Area | Requirement |
| --- | --- |
| PoC scope | On-chain deposit certificate (CDB/CD analogue); cash off-chain |
| Access | Separate issuer and custodian roles; pause control |
| Issuance | Issuer mint and EIP-712 authorised mint |
| Redeem | Two-step redeem with lock, confirm, and cancel |
| Platform | REST API, role-based UI, Anvil-local deploy, automated tests |
| Docs | PoC brief, requirements, and architecture in English |

Full requirement list: [`docs/requirements.md`](./docs/requirements.md)

## Documentation

| Doc | Contents |
| --- | --- |
| [`docs/poc.md`](./docs/poc.md) | PoC framing (CDB / CD / deposit token), what it is and is not |
| [`docs/requirements.md`](./docs/requirements.md) | Functional and non-functional requirements, scope |
| [`docs/architecture.md`](./docs/architecture.md) | On-chain/off-chain design, sequences, role-based console, decisions |

## Repository layout

```text
contracts/   Foundry · TokenisedDeposit.sol
api/         Express + ethers
web/         DepositRail console
bruno/       API e2e collection
docs/        PoC · requirements · architecture
scripts/     Local deploy and smoke
```

## Run locally

```bash
anvil --chain-id 31337
./scripts/deploy-local.sh
cd api && npm install && npm run dev
cd web && npm install && npm run dev
```

Then open http://127.0.0.1:5173 and sign in as Investor, Issuer desk, or Custodian desk.

```bash
cd contracts && forge test
./scripts/smoke-api.sh
```

## Author

Pamella Soares · blockchain developer & researcher  
Portfolio: [pamellasds.github.io](https://pamellasds.github.io/)
