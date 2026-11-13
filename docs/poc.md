# PoC - DepositRail (tokenised bank deposit certificate)

## 1. What it is

**DepositRail** is a **proof of concept** for an **on-chain bank deposit certificate**.

The client deposits cash with the institution (off-chain). The institution issues an **ERC-20 certificate (`tDEP`)** that represents that deposit. Cash does **not** enter the smart contract; the token is the programmable proof of claim on the deposit.

## 2. Real-world instrument names

| Region | Closest instrument | How DepositRail relates |
| --- | --- | --- |
| **Brazil** | **CDB** (Certificado de Depósito Bancário) | On-chain / tokenised form of a bank deposit certificate |
| **US / general** | **Certificate of Deposit (CD)** | Same idea: a certificate of a bank deposit |
| **Banks / BIS / markets** | **Bank deposit token** / tokenised deposit | On-chain receipt of a bank deposit (issuer/bank liability), distinct from a generic reserve-backed stablecoin |

## 3. What it is **not**

| Confusing term | Why not |
| --- | --- |
| **"Certificado de crédito" / credit certificate** | Sounds like a loan or another credit claim. The underlying here is a **deposit**. |
| Reserve-backed stablecoin | Different model and regulation; a deposit token is tied to a bank deposit/account. |
| DeFi vault (ERC-4626) | A vault assumes an **on-chain** ERC-20 asset and shares. Here the underlying is **off-chain** fiat. |
| Retail CBDC / Drex | Central-bank money scope; this PoC models a **private/institutional** deposit certificate. |

## 4. Why this PoC exists

1. **Record** the deposit in a transferable, auditable on-chain form  
2. **Settle / transfer** economic interest without moving fiat on every hop  
3. Support **capital-markets / RWA** workflows (collateral, portfolios, settlement) while cash stays in traditional custody  
4. **Redeem** with operational control: investor requests; custodian confirms payout; only then the certificate is burned  

## 5. Roles (CDB/CD operations mirrored)

| Role | Real world (simplified) | In this PoC |
| --- | --- | --- |
| Institution / issuer | Bank or platform that takes the deposit and issues the certificate | `ISSUER_ROLE` (mint); Issuer desk in the console |
| Custodian | Holds cash and executes payout on redeem | `CUSTODIAN_ROLE` (confirmRedeem); Custodian desk in the console |
| Investor | Client who holds the CDB/CD | Holder of `tDEP`; Investor workspace in the console |
| Risk admin | Operational controls | pause / roles |

The DepositRail web app signs the user into **one role at a time**. Each workspace only exposes that role's actions.

## 6. Business flow (summary)

```text
Fiat deposit booked in custody
        ↓
Issuer mints tDEP certificate (direct mint or EIP-712)
        ↓
Investor holds / transfers the certificate on-chain
        ↓
Investor requests redeem (locks tDEP)
        ↓
Custodian pays fiat and confirms on-chain (burn)
```

## 7. Disclaimer

This is a **portfolio PoC**. It is not a registered CDB, not a public offering, and it does not implement Brazilian (CVM, Bacen, ANBIMA) or international regulatory requirements.
