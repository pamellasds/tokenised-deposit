import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, Meta, MirrorEvent } from "./api";

type Role = "investor" | "issuer" | "custodian";

type Session = {
  role: Role;
  label: string;
  address: string;
};

/** Anvil demo accounts (local only). */
const ACCOUNTS = {
  investor: {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    key: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    label: "Ana Costa",
    subtitle: "Investor · personal banking",
  },
  issuer: {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    label: "Issuer desk",
    subtitle: "Bank ops · certificate issuance",
  },
  custodian: {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    label: "Custodian desk",
    subtitle: "Custody · redeem settlement",
  },
} as const;

const ROLE_OPTIONS: { role: Role; title: string; blurb: string }[] = [
  {
    role: "investor",
    title: "Investor",
    blurb: "View your certificate balance and request redeem.",
  },
  {
    role: "issuer",
    title: "Issuer desk",
    blurb: "Mint tDEP after a deposit is booked off-chain.",
  },
  {
    role: "custodian",
    title: "Custodian desk",
    blurb: "Confirm fiat payout and settle redeem requests.",
  },
];

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [balance, setBalance] = useState("0");
  const [events, setEvents] = useState<MirrorEvent[]>([]);
  const [mintAmount, setMintAmount] = useState("100");
  const [redeemAmount, setRedeemAmount] = useState("25");
  const [redeemId, setRedeemId] = useState("0");
  const [investorAddress, setInvestorAddress] = useState(ACCOUNTS.investor.address);
  const [showSignedMint, setShowSignedMint] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(false);

  const refresh = useCallback(async () => {
    const [m, b, e] = await Promise.all([
      api.meta(),
      api.balance(ACCOUNTS.investor.address),
      api.events(),
    ]);
    setMeta(m);
    setBalance(b.balance);
    setEvents(e.events);
    setOnline(true);
  }, []);

  useEffect(() => {
    refresh().catch((err) => {
      setOnline(false);
      setError(String(err.message ?? err));
    });
    const timer = setInterval(() => {
      refresh()
        .then(() => setOnline(true))
        .catch(() => setOnline(false));
    }, 4000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setStatus(`${label}…`);
    try {
      const result = await action();
      setStatus(`${label} completed`);
      console.info(label, result);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  function login(role: Role) {
    const account = ACCOUNTS[role];
    setSession({
      role,
      label: account.label,
      address: account.address,
    });
    setError("");
    setStatus("");
  }

  function logout() {
    setSession(null);
    setShowSignedMint(false);
    setStatus("");
    setError("");
  }

  if (!session) {
    return (
      <div className="shell">
        <div className="atmosphere" aria-hidden="true" />
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">DepositRail</span>
          </div>
          <div className="topbar-meta">
            <span className={`pulse ${online ? "on" : "off"}`}>
              {online ? "Anvil connected" : "Offline"}
            </span>
            <span className="chip">Anvil · 31337</span>
          </div>
        </header>

        <main className="page login-page">
          <section className="hero login-hero">
            <p className="eyebrow">On-chain bank deposit certificate</p>
            <h1>DepositRail</h1>
            <p className="lede">
              Programmable twin of a Brazilian <strong>CDB</strong> / international{" "}
              <strong>Certificate of Deposit</strong>: cash stays with the custodian;{" "}
              <span className="mono">tDEP</span> is the on-chain certificate.
            </p>
          </section>

          <section className="login-panel">
            <div className="login-panel-head">
              <h2>Sign in</h2>
              <p>Select your workspace to continue.</p>
            </div>
            <div className="login-grid">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.role}
                  type="button"
                  className="login-card"
                  onClick={() => login(option.role)}
                >
                  <span className="login-role">{option.title}</span>
                  <span className="login-name">{ACCOUNTS[option.role].label}</span>
                  <span className="login-blurb">{option.blurb}</span>
                  <span className="mono login-addr">{shorten(ACCOUNTS[option.role].address)}</span>
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">DepositRail</span>
        </div>
        <div className="session-bar">
          <div className="session-who">
            <span className="session-role">{session.role}</span>
            <strong>{session.label}</strong>
            <span className="mono">{shorten(session.address)}</span>
          </div>
          <button type="button" className="btn-secondary btn-compact" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="page">
        <section className="overview compact">
          <div className="stat">
            <span className="stat-label">Certificates outstanding</span>
            <strong>{meta ? formatQty(meta.totalSupply) : "..."}</strong>
            <span className="stat-unit">tDEP</span>
          </div>
          <div className="stat">
            <span className="stat-label">Investor position</span>
            <strong>{formatQty(balance)}</strong>
            <span className="stat-unit">tDEP · {shorten(ACCOUNTS.investor.address)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Network</span>
            <strong>{online ? "Live" : "Offline"}</strong>
            <span className="stat-unit">Anvil · 31337</span>
          </div>
        </section>

        {session.role === "investor" && (
          <section className="ops">
            <div className="ops-head">
              <div>
                <h2>Your deposit certificate</h2>
                <p>
                  Request redeem when you want cash back. The custodian settles payout off-chain
                  before the certificate is burned.
                </p>
              </div>
            </div>

            <div className="role-layout">
              <form
                className="op"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  void run("Redeem request", async () => {
                    const result = await api.requestRedeem(
                      ACCOUNTS.investor.key,
                      redeemAmount,
                    );
                    setRedeemId(result.redeemId);
                    return result;
                  });
                }}
              >
                <header>
                  <h3>Request redeem</h3>
                  <p>Locks your tDEP until the custodian confirms fiat payout (or you cancel).</p>
                </header>
                <label>
                  Amount (tDEP)
                  <input
                    inputMode="decimal"
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(e.target.value)}
                  />
                </label>
                <div className="actions">
                  <button type="submit" className="btn-primary" disabled={busy}>
                    Submit redeem request
                  </button>
                </div>
              </form>

              <form
                className="op"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  void run("Cancel redeem", () =>
                    api.cancelRedeem(redeemId, ACCOUNTS.investor.key),
                  );
                }}
              >
                <header>
                  <h3>Cancel pending redeem</h3>
                  <p>Only if the custodian has not settled yet. Returns locked tDEP to you.</p>
                </header>
                <label>
                  Redeem ID
                  <input value={redeemId} onChange={(e) => setRedeemId(e.target.value)} />
                </label>
                <div className="actions">
                  <button type="submit" className="btn-secondary" disabled={busy}>
                    Cancel request
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {session.role === "issuer" && (
          <section className="ops">
            <div className="ops-head">
              <div>
                <h2>Issuance desk</h2>
                <p>
                  After the bank books the client deposit (CDB/CD style), mint the on-chain
                  certificate to the investor.
                </p>
              </div>
            </div>

            <form
              className="op op-wide"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                void run("Issue certificate", () =>
                  api.mint(investorAddress.trim(), mintAmount),
                );
              }}
            >
              <header>
                <h3>Issue certificate</h3>
                <p>
                  Standard path: the issuer wallet submits <span className="mono">mint</span>{" "}
                  on-chain after deposit booking.
                </p>
              </header>
              <div className="field-row">
                <label>
                  Investor address
                  <input
                    value={investorAddress}
                    onChange={(e) => setInvestorAddress(e.target.value)}
                  />
                </label>
                <label>
                  Amount (tDEP)
                  <input
                    inputMode="decimal"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                  />
                </label>
              </div>
              <div className="actions">
                <button type="submit" className="btn-primary" disabled={busy}>
                  Issue to investor
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowSignedMint((v) => !v)}
                >
                  {showSignedMint ? "Hide" : "Advanced"}: signed mint (EIP-712)
                </button>
              </div>

              {showSignedMint && (
                <div className="advanced">
                  <p>
                    <strong>Issue vs signed mint:</strong> with Issue, the issuer account sends
                    the transaction itself. With signed mint, the issuer only signs an EIP-712
                    authorisation offline; a relayer submits{" "}
                    <span className="mono">mintWithAuthorization</span>. Same end result
                    (investor receives tDEP); different who pays gas and who broadcasts.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() =>
                      void run("Signed mint (EIP-712)", () =>
                        api.mintWithAuth(investorAddress.trim(), mintAmount),
                      )
                    }
                  >
                    Run signed mint via relayer
                  </button>
                </div>
              )}
            </form>
          </section>
        )}

        {session.role === "custodian" && (
          <section className="ops">
            <div className="ops-head">
              <div>
                <h2>Settlement desk</h2>
                <p>
                  After fiat payout is done off-chain, confirm the redeem so locked certificates
                  are burned.
                </p>
              </div>
            </div>

            <form
              className="op op-wide"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                void run("Settle redeem", () => api.confirmRedeem(redeemId));
              }}
            >
              <header>
                <h3>Confirm redeem</h3>
                <p>Use the redeem ID created when the investor submitted their request.</p>
              </header>
              <label>
                Redeem ID
                <input value={redeemId} onChange={(e) => setRedeemId(e.target.value)} />
              </label>
              <div className="actions">
                <button type="submit" className="btn-primary" disabled={busy}>
                  Confirm payout &amp; burn
                </button>
              </div>
            </form>
          </section>
        )}

        {(status || error) && (
          <div className={`toast ${error ? "error" : "ok"}`} role="status">
            {error ? error : status}
          </div>
        )}

        <section className="activity">
          <div className="ops-head">
            <div>
              <h2>Activity</h2>
              <p>Recent certificate and redeem activity.</p>
            </div>
          </div>
          {events.length === 0 ? (
            <p className="empty">No movements yet.</p>
          ) : (
            <ul className="timeline">
              {events.map((event) => (
                <li key={`${event.txHash}-${event.type}-${event.id ?? event.to}`}>
                  <div className="timeline-main">
                    <strong>{labelEvent(event.type)}</strong>
                    <span>
                      {event.amount ? `${event.amount} tDEP` : ""}
                      {event.id != null ? ` · redeem #${event.id}` : ""}
                    </span>
                  </div>
                  <span className="mono">{shorten(event.txHash)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function shorten(value: string): string {
  if (value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatQty(value: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function labelEvent(type: string): string {
  switch (type) {
    case "Minted":
      return "Certificate issued";
    case "RedeemRequested":
      return "Redeem requested";
    case "RedeemConfirmed":
      return "Redeem settled";
    case "RedeemCancelled":
      return "Redeem cancelled";
    default:
      return type;
  }
}
