import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reports as reportsApi } from "../api.js";
import { useAuth, subscribeToPush } from "../auth.jsx";
import { StyleTag, Pill, TierBadge } from "../shared.jsx";
import { GlobalNav } from "../components/GlobalNav.jsx";
import { SiteFooter } from "../components/PageLayout.jsx";

export function LandingPage() {
  const { user } = useAuth();
  const [featured, setFeatured] = useState([]);
  const [pushDone, setPushDone] = useState(false);

  useEffect(() => {
    reportsApi.listPublic({ limit: 3 }).then(setFeatured).catch(() => {});
  }, []);

  const handlePush = async () => {
    const ok = await subscribeToPush();
    if (ok) setPushDone(true);
  };

  return (
    <>
      <StyleTag />
      <div className="ci-root">
        <GlobalNav />

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="hero">
          <div className="hero-inner">
            <Pill label="Strategic Foresight" />
            <h1 className="hero-title">
              Intelligence<br /><em>before</em> the market.
            </h1>
            <p className="hero-sub">
              Combined Intelligence publishes structured analytical reports on frontier and
              emerging markets — built around the BISE framework and verified against primary sources.
            </p>
            <div className="hero-actions">
              {user === null && (
                <Link to="/synthesis/library" className="btn-primary">Browse reports</Link>
              )}
              {user === null && (
                <Link to="/synthesis/method" className="btn-secondary">The method</Link>
              )}
              {user && !pushDone && (
                <button onClick={handlePush} className="btn-secondary">Enable report alerts</button>
              )}
            </div>
          </div>
        </section>

        {/* ── Featured reports ──────────────────────────────────────────────── */}
        {featured.length > 0 && (
          <section className="reports-grid-section">
            <div className="section-header">
              <h2 className="section-title">Latest Reports</h2>
              <Link to="/synthesis/reports" style={{ fontSize: 13, color: "var(--accent)" }}>
                View all →
              </Link>
            </div>
            <div className="reports-grid">
              {featured.map((r) => (
                <Link key={r.id} to={`/reports/${r.slug}`} className="report-card">
                  <div className="rc-meta">
                    <Pill label={r.tag || "Report"} />
                    <TierBadge tier={r.access} />
                  </div>
                  <h3 className="rc-title">{r.title}</h3>
                  {r.subtitle && <p className="rc-sub">{r.subtitle}</p>}
                  <div className="rc-footer">
                    <span className="rc-date">{r.date}</span>
                    <span className="rc-read">{r.read_time}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── BISE method ───────────────────────────────────────────────────── */}
        <section className="bise-section">
          <div className="bise-inner">
            <h2 className="section-title">The BISE Framework</h2>
            <p className="section-desc">
              Every report examines four analytical dimensions before reaching conclusions.
              Structure is our competitive advantage.
            </p>
            <div className="bise-grid">
              {BISE.map(({ letter, label, desc, color }) => (
                <div key={letter} className="bise-card" style={{ borderColor: color }}>
                  <div className="bise-letter" style={{ color }}>{letter}</div>
                  <div className="bise-label">{label}</div>
                  <div className="bise-desc">{desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28 }}>
              <Link to="/synthesis/method" className="btn-secondary" style={{ display: "inline-flex" }}>
                Read the full methodology →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Ledger preview ────────────────────────────────────────────────── */}
        <section className="reports-grid-section">
          <div className="section-header">
            <h2 className="section-title">The Ledger</h2>
            <Link to="/ledger/open" style={{ fontSize: 13, color: "var(--accent)" }}>
              View all predictions →
            </Link>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, maxWidth: "min(560px, 100%)", marginBottom: 32 }}>
            Every report publishes forward-looking predictions with explicit confidence levels.
            We track and publish the outcome of every forecast — no exceptions.
          </p>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <LedgerLink to="/ledger/open"        label="Open Predictions"  desc="Forecasts under observation" />
            <LedgerLink to="/ledger/resolved"    label="Resolved Claims"   desc="Published outcomes" />
            <LedgerLink to="/ledger/calibration" label="Calibration"       desc="Confidence vs accuracy" />
          </div>
        </section>

        {/* ── Membership ────────────────────────────────────────────────────── */}
        <section className="tiers-section">
          <h2 className="section-title" style={{ textAlign: "center" }}>Membership</h2>
          <div className="tiers-grid">
            {TIERS.map((t) => (
              <div key={t.name} className={`tier-card ${t.featured ? "tier-featured" : ""}`}>
                <TierBadge tier={t.name.toLowerCase()} />
                <div className="tier-price">{t.price}</div>
                <ul className="tier-perks">{t.perks.map((p) => <li key={p}>{p}</li>)}</ul>
                {user === null && (
                  <Link to="/synthesis/reports" className="btn-tier">Browse reports</Link>
                )}
              </div>
            ))}
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}

function LedgerLink({ to, label, desc }) {
  return (
    <Link to={to} style={{
      background: "var(--carbon)", border: "1px solid var(--border)", borderRadius: 8,
      padding: "16px 20px", flex: "1 1 160px", textDecoration: "none",
      transition: "border-color .15s",
    }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{desc}</div>
    </Link>
  );
}

const BISE = [
  { letter: "B", label: "Behavioural", desc: "Consumer psychology, market sentiment, and decision patterns.", color: "#f97316" },
  { letter: "I", label: "Institutional", desc: "Regulatory frameworks, governance quality, and policy risk.", color: "#6366f1" },
  { letter: "S", label: "Sectoral", desc: "Industry dynamics, competitive positioning, and value chains.", color: "#10b981" },
  { letter: "E", label: "Economic", desc: "Macro indicators, capital flows, and growth trajectories.", color: "#3b82f6" },
];

const TIERS = [
  { name: "Free",    price: "$0 / mo",  featured: false, perks: ["Headline findings", "Weekly digest", "Open predictions"] },
  { name: "Members", price: "$29 / mo", featured: true,  perks: ["Full report access", "PDF downloads", "BISE deep-dives", "Slack community"] },
  { name: "Paid",    price: "$99 / mo", featured: false, perks: ["All Members perks", "Raw data exports", "Analyst Q&A", "API access"] },
];
