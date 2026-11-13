# Requirements - Tokenised Deposit (P1)

Sibling doc: [`poc.md`](./poc.md) (market language: CDB / CD / deposit token).

## 1. Vision

Proof of concept for a **tokenised bank deposit certificate**:

| Reference | Instrument |
| --- | --- |
| Brazil | On-chain analogue of a **CDB (Certificado de Depósito Bancário)** |
| International | Analogue of a **Certificate of Deposit (CD)** or **bank deposit token** |

Cash stays **off-chain** (account/custody). On-chain there is an **ERC-20 certificate (`tDEP`)** representing the investor's claim on that deposit.

This is **not** a credit/loan certificate: it is proof of a **deposit**. Issuance and redemption follow issuer + custodian. Portfolio PoC only; not a regulated offering.

## 2. Business goals (demo)

| ID | Goal |
| --- | --- |
| Biz-01 | Show certificate issuance after a deposit booking |
| Biz-02 | Show two-step redemption (investor request + custodian confirmation) |
| Biz-03 | Separate issuer and custodian roles (four-eyes) |
| Biz-04 | Expose the flow via API, UI, and e2e tests for the portfolio |

## 3. Actors

| Actor | Responsibility |
| --- | --- |
| Admin | Grants roles; can pause the contract |
| Issuer | Confirms off-chain deposit booking (CDB/CD-style) and **mints** the `tDEP` certificate |
| Custodian | Confirms off-chain payout on redeem and **burns** locked certificates |
| Investor (holder) | Holds `tDEP`; requests or cancels redeem |
| Relayer / API | Signs EIP-712 (issuer) and/or submits txs; mirrors events in memory for the UI |

## 4. Functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| RF-01 | Issue `tDEP` certificate to an address (issuer mint) | Must |
| RF-02 | Issue via **EIP-712** (`mintWithAuthorization`) with nonce and deadline | Must |
| RF-03 | Investor requests redeem: certificates lock in the contract; a `redeemId` is created | Must |
| RF-04 | Custodian confirms redeem: burns locked certificates | Must |
| RF-05 | Investor cancels a pending redeem and receives certificates back | Must |
| RF-06 | Admin can pause / unpause sensitive operations | Must |
| RF-07 | REST API for meta, balance, mint, redeem, events | Must |
| RF-08 | DepositRail web console with mock sign-in by role (investor / issuer / custodian); each role only sees its own actions | Must |
| RF-08b | Console copy states CDB/CD positioning briefly on the sign-in screen | Must |
| RF-09 | Bruno collection covering the API e2e flow | Must |
| RF-10 | Deploy and test on **Anvil** | Must |
| RF-11 | `docs/` with PoC brief, requirements, and architecture (Mermaid) | Must |

## 5. Non-functional requirements

| ID | Requirement |
| --- | --- |
| RNF-01 | Simple, readable code; no over-engineering |
| RNF-02 | OpenZeppelin for ERC-20, AccessControl, Pausable, EIP-712 |
| RNF-03 | Foundry tests (unit + basic fuzz) |
| RNF-04 | No paid services required for the local demo |
| RNF-05 | Secrets only in `.env` (documented Anvil demo keys) |
| RNF-06 | Consistent PoC language: **deposit** certificate, not credit certificate |
| RNF-07 | Docs and user-facing/code comments in **English** |

## 6. Out of scope (v1)

- Real custody / bank integration / CDB registration
- On-chain KYC/AML
- CDB yield (rate, CDI index, maturity)
- Upgradeability / Diamond
- Cross-chain bridge
- Production Postgres indexer (API uses an in-memory event mirror)
- Regulatory requirements (CVM / Bacen / ANBIMA / SEC)

## 7. Acceptance criteria (local testable version)

1. `forge test` passes  
2. Anvil + deploy script writes `TOKEN_ADDRESS`  
3. API starts and `/health` returns ok  
4. Role-based UI flow works: issuer issues, investor requests redeem, custodian confirms (and Bruno covers the API)  
5. `docs/poc.md`, `docs/requirements.md`, and `docs/architecture.md` describe the PoC as a tokenised CDB/CD and the role-based console  
