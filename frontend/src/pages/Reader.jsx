// Reader screen — literal port of designs/reader.jsx into the React+Vite app.
// Visual + content match: section-by-section, attribute-for-attribute,
// driven by CI_DATA.reports[0] (the Rwanda report). For non-Rwanda slugs we
// fall back to a slimmer API-driven renderer.
//
// Differences from designs/reader.jsx (mechanical, not visual):
//   • window.CI_DATA      → import { CI_DATA } from "../data.js"
//   • window.CILogoMark   → import primitives from "../shared.jsx"
//   • go('reports')       → useNavigate() to /synthesis/library

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TierBadge, Icons, StatusDot } from "../shared.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { CI_DATA } from "../data.js";
import { reports as reportsApi } from "../api.js";

export function ReaderScreen() {
  const { slug } = useParams();
  const seed = CI_DATA.reports[0];

  if (!slug || slug === seed.slug) {
    return <RwandaReader r={seed} />;
  }
  return <ApiBackedReader slug={slug} />;
}

// ─── ArticleToolbar (shared between Rwanda + API-backed readers) ─────────────
function ArticleToolbar({ tier, setTier, meta }) {
  return (
    <>
      <div className="article-toolbar">
        <div className="article-toolbar-inner">
          <Link to="/synthesis/library" className="mono" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 10, letterSpacing: ".18em", color: "var(--muted)",
            fontWeight: 700, textDecoration: "none",
          }}>
            ← BACK TO LIBRARY
          </Link>
          <div style={{ flex: 1 }} />
          {setTier && (
            <>
              <span className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700 }}>READING AS:</span>
              <div className="tier-toggle">
                {["free", "members", "paid"].map((t) => (
                  <button key={t} onClick={() => setTier(t)} className={tier === t ? "active" : ""}>{t}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {meta && (
        <div className="article-toolbar-strip">
          {meta.map((m, i) => (
            <span key={i} style={{ color: m.color || "#999" }}>{m.label}</span>
          ))}
        </div>
      )}
    </>
  );
}

// ─── RwandaReader — literal port ─────────────────────────────────────────────
function RwandaReader({ r }) {
  const data = CI_DATA;
  const [tier, setTier] = useState("free");

  const meta = [
    { label: `● ${r.id}`,              color: "var(--orange)" },
    { label: r.tag.toUpperCase() },
    { label: r.year },
    { label: r.readTime.toUpperCase() },
    { label: r.method.toUpperCase() },
    { label: `HORIZON ${r.horizon}` },
    { label: "SEAL · 9F4A·B21E",       color: "var(--purple)" },
  ];

  return (
    <PageLayout withSubstrip={false}>
      <div style={{ background: "var(--bg)" }}>
        <ArticleToolbar tier={tier} setTier={setTier} meta={meta} />

        <article style={{ maxWidth: 1280, margin: "0 auto", padding: "60px 32px 80px" }}>
          {/* Hero */}
          <header style={{ marginBottom: 64, paddingBottom: 40, borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <span className="mono" style={{ padding: "5px 10px", background: "var(--purple)", color: "#fff", fontSize: 9, letterSpacing: ".22em", fontWeight: 800 }}>STRATEGIC SECTOR REPORT</span>
              <span className="mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "var(--muted)", fontWeight: 700 }}>RWANDA · 2026</span>
              <span className="mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "var(--muted)", fontWeight: 700 }}>04 / 12</span>
            </div>

            <h1 className="serif" style={{ fontSize: "clamp(48px, 7vw, 96px)", lineHeight: .95, margin: 0, letterSpacing: "-.025em", fontWeight: 400, marginBottom: 20 }}>
              {r.title}
            </h1>
            <h2 className="serif" style={{ fontSize: "clamp(20px, 2.4vw, 32px)", lineHeight: 1.2, margin: 0, fontWeight: 400, fontStyle: "italic", color: "var(--muted)", marginBottom: 32, maxWidth: 800 }}>
              {r.subtitle}
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: "var(--ink-2)", maxWidth: 760, margin: 0, marginBottom: 28 }}>
              {r.hook}
            </p>

            {/* byline strip */}
            <div style={{ display: "flex", alignItems: "center", gap: 32, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
              <div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700 }}>BY</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{r.author}</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700 }}>PUBLISHED</div>
                <div className="mono tnum" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{r.date}</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700 }}>HIT-RATE (PRIOR)</div>
                <div className="mono tnum" style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: "var(--green)" }}>{Math.round(r.hitRate * 100)}% · 19 RESOLVED</div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700 }}>BISE CONSTRAINTS</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: "var(--purple)" }}>{r.constraintIds.length} BOUND</div>
              </div>
              <div style={{ flex: 1 }} />
              <button className="mono" style={{ padding: "10px 16px", background: "var(--ink)", color: "#fff", fontSize: 10, letterSpacing: ".18em", fontWeight: 700 }}>
                SAVE TO VAULT ›
              </button>
            </div>
          </header>

          {/* Two-column: stats grid + at-a-glance sidebar */}
          <section style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 56, marginBottom: 80 }}>
            <div>
              <div className="lbl" style={{ marginBottom: 24 }}>RWANDA AT A GLANCE · 06 SIGNALS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, border: "1px solid var(--line)", background: "var(--paper)" }}>
                {r.stats.map((s, i) => (
                  <div key={i} style={{
                    padding: 24,
                    borderRight: (i + 1) % 3 ? "1px solid var(--line)" : 0,
                    borderBottom: i < 3 ? "1px solid var(--line)" : 0,
                    position: "relative",
                  }}>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700, marginBottom: 12 }}>{s.label.toUpperCase()}</div>
                    <div className="serif tnum" style={{ fontSize: 38, fontWeight: 400, letterSpacing: "-.02em", lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5, fontStyle: "italic" }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar — Predictions + Constraints */}
            <aside style={{ position: "sticky", top: 140, alignSelf: "flex-start" }}>
              <div className="surface" style={{ padding: 0, borderTop: "3px solid var(--orange)" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.Target size={13} color="var(--orange)" />
                  <span className="mono" style={{ fontSize: 9, letterSpacing: ".22em", fontWeight: 800 }}>LIVE LEDGER</span>
                  <span style={{ flex: 1 }} />
                  <span className="mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--muted)", fontWeight: 700 }}>8 CLAIMS</span>
                </div>
                {r.predictions.slice(0, 5).map((p, i) => {
                  const locked = (p.tier === "paid" && tier !== "paid") || (p.tier === "members" && tier === "free");
                  return (
                    <div key={p.id} style={{ padding: 14, borderBottom: i < 4 ? "1px solid var(--line-soft)" : 0, position: "relative" }}>
                      {locked && (
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "rgba(244,241,234,.92)", backdropFilter: "blur(2px)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          zIndex: 2, gap: 6, flexDirection: "column",
                        }}>
                          <Icons.Lock size={14} color="var(--purple)" />
                          <span className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--purple)", fontWeight: 700 }}>{p.tier.toUpperCase()} TIER</span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <StatusDot status={p.status === "resolved" ? (p.outcome === "true" ? "complete" : p.outcome === "partial" ? "pending" : "error") : "pending"} />
                        <span className="mono" style={{ fontSize: 9, letterSpacing: ".16em", fontWeight: 700 }}>{p.id.toUpperCase()}</span>
                        {p.status === "resolved" ? (
                          <span className="mono" style={{
                            marginLeft: "auto", fontSize: 8, letterSpacing: ".14em", fontWeight: 800,
                            padding: "3px 6px", color: "#fff",
                            background: p.outcome === "true" ? "var(--green)" : p.outcome === "partial" ? "var(--amber)" : "var(--red)",
                          }}>◆ {p.outcome.toUpperCase()}</span>
                        ) : (
                          <span className="mono tnum" style={{ marginLeft: "auto", fontSize: 9, color: "var(--muted)" }}>{p.target}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.45 }}>{p.statement}</div>
                    </div>
                  );
                })}
              </div>

              <div className="surface" style={{ padding: 0, marginTop: 12, borderTop: "3px solid var(--purple)" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.Layers size={13} color="var(--purple)" />
                  <span className="mono" style={{ fontSize: 9, letterSpacing: ".22em", fontWeight: 800 }}>BOUND CONSTRAINTS</span>
                </div>
                {data.constraints.filter((c) => r.constraintIds.includes(c.id)).slice(0, 5).map((c, i, arr) => (
                  <div key={c.id} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--line-soft)" : 0 }}>
                    <div className="mono" style={{ fontSize: 9, color: "var(--purple)", fontWeight: 700, letterSpacing: ".06em", marginBottom: 4 }}>{c.code} · {c.domain.toUpperCase()}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</div>
                    <div className="mono tnum" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{c.lastObs}</div>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          {/* THE HEADLINES */}
          <section style={{ marginBottom: 96 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800 }}>EXECUTIVE SUMMARY · 02</span>
              <span className="serif" style={{ fontSize: 32, fontStyle: "italic", color: "var(--ink)" }}>The Headlines</span>
              <span style={{ flex: 1 }} />
              <span className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".14em" }}>Eight signals defining Rwandan finance today</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0, border: "1px solid var(--line)" }}>
              {r.headlines.map((h, i) => {
                const locked = (h.tier === "paid" && tier !== "paid") || (h.tier === "members" && tier === "free");
                return (
                  <div key={h.n} style={{
                    padding: 28, position: "relative", minHeight: 200,
                    borderRight: (i + 1) % 2 ? "1px solid var(--line)" : 0,
                    borderBottom: i < r.headlines.length - 2 ? "1px solid var(--line)" : 0,
                    background: "var(--paper)",
                  }}>
                    {locked && (
                      <div style={{
                        position: "absolute", inset: 0, background: "rgba(10,10,10,.92)", color: "#fff",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        gap: 12, zIndex: 2, padding: 24, textAlign: "center",
                      }}>
                        <div style={{ width: 36, height: 36, border: "1.5px solid var(--purple)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icons.Lock size={15} color="var(--purple)" />
                        </div>
                        <div className="mono" style={{ fontSize: 10, letterSpacing: ".22em", fontWeight: 800, color: "var(--purple)" }}>SEALED · {h.tier.toUpperCase()} TIER</div>
                        <div style={{ fontSize: 12, color: "#bbb", maxWidth: 280, lineHeight: 1.5 }}>This signal is part of the {h.tier} synthesis layer.</div>
                        <button className="mono" style={{ marginTop: 8, padding: "8px 14px", background: "var(--purple)", color: "#fff", fontSize: 9, letterSpacing: ".18em", fontWeight: 800 }}>UNLOCK ›</button>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                      <div className="serif" style={{ fontSize: 56, color: "rgba(124,58,237,.18)", lineHeight: .9, fontStyle: "italic", fontWeight: 400, flexShrink: 0 }}>{h.n}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <TierBadge tier={h.tier} />
                        </div>
                        <h3 className="serif" style={{ fontSize: 22, lineHeight: 1.2, margin: 0, marginBottom: 10, fontWeight: 400, letterSpacing: "-.005em" }}>{h.title}</h3>
                        <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--muted)", margin: 0 }}>{h.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* THE GDP CHART */}
          <section style={{ marginBottom: 96 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800 }}>PART 01 · MACRO LANDSCAPE</span>
              <span className="serif" style={{ fontSize: 32, fontStyle: "italic" }}>GDP Trajectory</span>
              <span style={{ flex: 1 }} />
              <a className="mono" style={{ fontSize: 10, color: "var(--blue)", letterSpacing: ".14em", fontWeight: 700 }}>► BOUND TO C-E01</a>
            </div>

            <div className="surface" style={{ padding: 36 }}>
              <div className="lbl" style={{ marginBottom: 8 }}>REAL GDP GROWTH · 2020-2025 · % YoY</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 24, height: 280, marginTop: 32, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}>
                {r.gdpSeries.map((d, i) => {
                  const isNeg = d.v < 0;
                  const max = 12;
                  const pct = Math.abs(d.v) / max * 100;
                  return (
                    <div key={i} style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: isNeg ? "var(--red)" : "var(--ink)", marginBottom: 8 }}>
                        {isNeg ? "" : "+"}{d.v}%
                      </div>
                      <div style={{
                        width: "100%", maxWidth: 80,
                        height: `${pct * 1.6}px`,
                        background: isNeg ? "var(--red)" : i === r.gdpSeries.length - 1 ? "var(--purple)" : "var(--ink)",
                      }} />
                      <div className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", marginTop: 8, letterSpacing: ".14em" }}>{d.y}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginTop: 24 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--orange)", fontWeight: 800, padding: "6px 10px", border: "1px solid var(--orange)" }}>► Q3 2025: +11.8%</div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65, fontStyle: "italic", flex: 1 }}>
                  The longest sustained acceleration of any East African economy. Beneath the headline: rebased GDP, 70%-private-consumption, public debt nearing 80% of GDP — a structural import dependence that shapes every banking decision.
                </div>
              </div>
            </div>
          </section>

          {/* GEOGRAPHY */}
          <section style={{ marginBottom: 96 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800 }}>PART 03 · GEOGRAPHY OF MONEY</span>
              <span className="serif" style={{ fontSize: 32, fontStyle: "italic" }}>The Kigali Gravity Well</span>
            </div>

            <p className="serif" style={{ fontSize: 22, lineHeight: 1.45, fontStyle: "italic", color: "var(--ink-2)", maxWidth: 900, margin: 0, marginBottom: 40, paddingLeft: 32, borderLeft: "3px solid var(--purple)" }}>
              12% of Rwandans live in Kigali. They access 60% of bank branches, generate ~55% of formal credit, and pay average 16% lending rates. The other 88% rely on mobile money and Umurenge SACCOs.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: "1px solid var(--line)", background: "var(--paper)" }}>
              {/* Left: provinces table */}
              <div style={{ padding: 24, borderRight: "1px solid var(--line)" }}>
                <div className="lbl" style={{ marginBottom: 16 }}>5 PROVINCES · BRANCH SHARE</div>
                {r.provinces.map((p) => (
                  <div key={p.name} style={{ padding: "14px 0", borderBottom: "1px solid var(--line-soft)" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                      <div className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: p.tier === 1 ? "var(--orange)" : p.tier === 2 ? "var(--blue)" : "var(--muted)", fontWeight: 800 }}>T{p.tier}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{p.name}</div>
                      <div className="mono tnum" style={{ fontSize: 12, color: "var(--muted)" }}>{p.pop}M · {p.share}%</div>
                      <div className="mono tnum" style={{ fontSize: 14, fontWeight: 700, width: 50, textAlign: "right" }}>{p.branches}%</div>
                    </div>
                    <div style={{ height: 4, background: "var(--line-soft)", position: "relative" }}>
                      <div style={{ width: `${p.branches}%`, height: "100%", background: p.tier === 1 ? "var(--orange)" : p.tier === 2 ? "var(--blue)" : "var(--muted)" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: scatter (branch density vs economic output) */}
              <div style={{ padding: 24, position: "relative" }}>
                <div className="lbl" style={{ marginBottom: 16 }}>BRANCH DENSITY × ECONOMIC OUTPUT · r = +0.83</div>
                <div style={{ position: "relative", height: 300, border: "1px solid var(--line)", background: "#fafaf6" }}>
                  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="none">
                    <line x1="8%" y1="92%" x2="92%" y2="8%" stroke="var(--purple)" strokeWidth="1.5" strokeDasharray="4,4" opacity=".5" />
                  </svg>
                  {[
                    { x: .92, y: .95, n: "Gasabo" },
                    { x: .85, y: .88, n: "Nyarugenge" },
                    { x: .78, y: .78, n: "Kicukiro" },
                    { x: .55, y: .50, n: "Musanze" },
                    { x: .50, y: .45, n: "Rubavu" },
                    { x: .42, y: .38, n: "Huye" },
                    { x: .38, y: .30, n: "Rusizi" },
                    { x: .20, y: .18, n: "" },
                    { x: .15, y: .12, n: "" },
                    { x: .30, y: .22, n: "" },
                    { x: .25, y: .15, n: "" },
                    { x: .32, y: .20, n: "" },
                  ].map((p, i) => (
                    <div key={i} style={{ position: "absolute", left: `calc(${p.x * 100}% - 6px)`, bottom: `calc(${p.y * 100}% - 6px)` }}>
                      <div style={{ width: 10, height: 10, background: i < 3 ? "var(--orange)" : i < 7 ? "var(--blue)" : "var(--ink)" }} />
                      {p.n && <div className="mono" style={{ position: "absolute", left: 14, top: -4, fontSize: 9, color: "var(--ink)", whiteSpace: "nowrap", fontWeight: 700, letterSpacing: ".04em" }}>{p.n}</div>}
                    </div>
                  ))}
                  <div className="mono" style={{ position: "absolute", left: 8, bottom: 8, fontSize: 9, color: "var(--muted)", letterSpacing: ".14em" }}>OUTPUT →</div>
                  <div className="mono" style={{ position: "absolute", left: 8, top: 8, fontSize: 9, color: "var(--muted)", letterSpacing: ".14em" }}>↑ DENSITY</div>
                </div>
              </div>
            </div>
          </section>

          {/* TIER GATE — markdown body section */}
          <BodyContent tier={tier} />

          {/* BISE CORRELATIONS */}
          <section style={{ marginBottom: 96 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800 }}>PART 09 · BISE FINDINGS</span>
              <span className="serif" style={{ fontSize: 32, fontStyle: "italic" }}>Eight Hidden Correlations</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 0, border: "1px solid var(--line)" }}>
              {r.correlations.map((c, i) => (
                <div key={c.id} style={{
                  padding: 24, background: "var(--paper)",
                  borderRight: (i + 1) % 2 ? "1px solid var(--line)" : 0,
                  borderBottom: i < r.correlations.length - 2 ? "1px solid var(--line)" : 0,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{
                      width: 64, flexShrink: 0, padding: "14px 0", textAlign: "center",
                      background: c.sign === "+" ? "var(--ink)" : "var(--paper)",
                      color: c.sign === "+" ? "#fff" : "var(--ink)",
                      border: c.sign === "+" ? "0" : "1.5px solid var(--ink)",
                    }}>
                      <div className="mono" style={{ fontSize: 9, letterSpacing: ".14em", fontWeight: 700, opacity: .7 }}>r =</div>
                      <div className="mono tnum" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{c.sign}{c.r}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700, marginBottom: 6 }}>FINDING {c.id}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{c.a}</div>
                      <div className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", margin: "4px 0", fontWeight: 700 }}>↔</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>{c.b}</div>
                      <p className="serif" style={{ fontSize: 14, fontStyle: "italic", color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>{c.insight}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* THE EIGHT SHIFTS */}
          <section style={{ marginBottom: 96, background: "var(--ink)", color: "#fff", margin: "0 -32px 96px", padding: "64px 64px" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 40 }}>
                <span className="mono" style={{ fontSize: 11, letterSpacing: ".22em", color: "var(--orange)", fontWeight: 800 }}>THE CLOSING ARGUMENT</span>
                <span className="serif" style={{ fontSize: 36, fontStyle: "italic", fontWeight: 400 }}>Eight Shifts to Watch</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "#1f1f1f" }}>
                {r.shifts.map((s, i) => (
                  <div key={i} style={{ background: "var(--ink)", padding: 24 }}>
                    <div className="mono" style={{ fontSize: 32, fontWeight: 800, color: "var(--purple)", marginBottom: 14, letterSpacing: "-.02em" }}>{String(i + 1).padStart(2, "0")}</div>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: ".14em", color: "#888", marginBottom: 8, fontWeight: 700, textTransform: "uppercase" }}>{s[0]}</div>
                    <div className="serif" style={{ fontSize: 22, lineHeight: 1.15, fontStyle: "italic", color: "var(--orange)" }}>{s[1]}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CUSTOMER ARCHETYPES */}
          <section style={{ marginBottom: 96 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800 }}>PART 09 · OUTLOOK</span>
              <span className="serif" style={{ fontSize: 32, fontStyle: "italic" }}>Six Rwandans the next bank must serve</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
              {r.personas.map((p) => (
                <div key={p.name} style={{ background: "var(--paper)", padding: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                    <div style={{ width: 42, height: 42, background: "var(--ink)", color: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "JetBrains Mono", fontWeight: 800, fontSize: 16 }}>{p.i}</div>
                    <div>
                      <div className="serif" style={{ fontSize: 20, lineHeight: 1.1 }}>{p.name} <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)", fontStyle: "normal", marginLeft: 4 }}>· {p.age}</span></div>
                      <div className="mono" style={{ fontSize: 9, letterSpacing: ".16em", color: "var(--purple)", fontWeight: 700, marginTop: 2, textTransform: "uppercase" }}>{p.role}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 10px", fontSize: 11 }}>
                    <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: ".14em", fontWeight: 700, paddingTop: 2 }}>POP</div>
                    <div className="mono tnum" style={{ fontWeight: 700 }}>{p.n} like them</div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: ".14em", fontWeight: 700, paddingTop: 2 }}>NEEDS</div>
                    <div style={{ lineHeight: 1.5 }}>{p.needs}</div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: ".14em", fontWeight: 700, paddingTop: 2 }}>HOW</div>
                    <div style={{ lineHeight: 1.5, fontStyle: "italic", color: "var(--muted)" }}>{p.how}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* COLOPHON */}
          <footer style={{ paddingTop: 32, borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
              <div>
                <div className="lbl" style={{ marginBottom: 8 }}>METHOD</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--muted)" }}>
                  BISE four-lens cross-correlation: Behavioural · Institutional · Sectoral · Economic. Every insight triangulates ≥2 lenses. Reported correlations have r ≥ 0.45 across 5+ years of public data.
                </div>
              </div>
              <div>
                <div className="lbl" style={{ marginBottom: 8 }}>SOURCES</div>
                <div className="mono" style={{ fontSize: 10, lineHeight: 1.7, color: "var(--muted)", letterSpacing: ".04em" }}>
                  BNR · NISR · FinScope 2024 · RBA SBIR 2025 · RURA · MTN/Airtel · World Bank · IMF · CMA · INTERPOL · GSMA · AFR · UNCDF · FSDA · Tracxn · Disrupt Africa
                </div>
              </div>
              <div>
                <div className="lbl" style={{ marginBottom: 8 }}>SEAL</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--purple)", fontWeight: 700, letterSpacing: ".06em", lineHeight: 1.6 }}>
                  9F4A·B21E·CI.SYNTH.Q2<br />SHA-256 · 2026-04-12 14:31
                </div>
              </div>
              <div>
                <div className="lbl" style={{ marginBottom: 8 }}>CITE THIS</div>
                <div style={{ fontSize: 12, lineHeight: 1.55, fontStyle: "italic", color: "var(--muted)" }}>
                  Combined Intelligence Desk. <em>Rwanda's Financial Overview</em>. RW-FIN-26. April 2026.
                </div>
              </div>
            </div>
          </footer>
        </article>
      </div>
    </PageLayout>
  );
}

// ─── BodyContent — markdown excerpt with tier directives ─────────────────────
function BodyContent({ tier }) {
  const blocks = useMemo(() => {
    const text = CI_DATA.contentExcerpt;
    const re = /:::(free|members|paid)\n([\s\S]*?):::/g;
    const out = [];
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ kind: "open", text: text.slice(last, m.index) });
      out.push({ kind: "tier", tier: m[1], text: m[2] });
      last = re.lastIndex;
    }
    if (last < text.length) out.push({ kind: "open", text: text.slice(last) });
    return out;
  }, []);

  const renderMd = (txt) =>
    txt.split("\n").map((line, i) => {
      if (line.startsWith("## "))  return <h3 key={i} className="serif" style={{ fontSize: 28, fontStyle: "normal", margin: "32px 0 16px", fontWeight: 400, letterSpacing: "-.005em" }}>{line.slice(3)}</h3>;
      if (line.startsWith("### ")) return <h4 key={i} className="mono"  style={{ fontSize: 11, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800, margin: "24px 0 12px" }}>{line.slice(4).toUpperCase()}</h4>;
      if (!line.trim()) return null;
      const html = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>");
      return <p key={i} style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", margin: "0 0 14px" }} dangerouslySetInnerHTML={{ __html: html }} />;
    });

  return (
    <section style={{ marginBottom: 96, maxWidth: 760, marginLeft: 0 }}>
      {blocks.map((b, i) => {
        if (b.kind === "open") return <div key={i}>{renderMd(b.text)}</div>;
        const locked = (b.tier === "paid" && tier !== "paid") || (b.tier === "members" && tier === "free");
        if (locked) {
          return (
            <div key={i} style={{ position: "relative", margin: "24px 0" }}>
              <div style={{ background: "var(--ink)", color: "#fff", padding: "40px 32px", position: "relative", overflow: "hidden" }}>
                {[[0,0],[1,0],[0,1],[1,1]].map(([rx,ry],k) => (
                  <div key={k} style={{
                    position: "absolute",
                    [rx ? "right" : "left"]: 6,
                    [ry ? "bottom" : "top"]: 6,
                    width: 10, height: 10,
                    borderTop:    !ry ? "1.5px solid var(--purple)" : "",
                    borderBottom:  ry ? "1.5px solid var(--purple)" : "",
                    borderLeft:   !rx ? "1.5px solid var(--purple)" : "",
                    borderRight:   rx ? "1.5px solid var(--purple)" : "",
                  }} />
                ))}
                <div className="mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800, marginBottom: 14 }}>◆ SEALED · {b.tier.toUpperCase()} TIER</div>
                <div className="serif" style={{ fontSize: 24, lineHeight: 1.3, marginBottom: 14, fontStyle: "italic", maxWidth: 600 }}>
                  This section is part of the {b.tier} synthesis layer.
                </div>
                <div style={{ fontSize: 13, color: "#999", maxWidth: 500, lineHeight: 1.6, marginBottom: 18 }}>
                  Approximately {Math.round(b.text.length / 6)} words · including the constraint-level breakdown of concentration risk and the strategic question on Rwandan banking consolidation.
                </div>
                <button className="mono" style={{ padding: "10px 16px", background: "var(--purple)", color: "#fff", fontSize: 10, letterSpacing: ".18em", fontWeight: 800 }}>UNLOCK {b.tier.toUpperCase()} ›</button>
              </div>
            </div>
          );
        }
        return (
          <div key={i} style={{ position: "relative", margin: "24px 0", padding: "20px 24px", background: "rgba(124,58,237,.04)", borderLeft: "3px solid var(--purple)" }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800, marginBottom: 8 }}>◆ {b.tier.toUpperCase()} TIER · UNLOCKED</div>
            {renderMd(b.text)}
          </div>
        );
      })}
    </section>
  );
}

// ─── API-backed fallback for non-seed reports ────────────────────────────────
function ApiBackedReader({ slug }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    reportsApi.getPublic(slug)
      .then(setReport)
      .catch((e) => {
        if (e.status === 404) navigate("/", { replace: true });
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  if (loading) {
    return (
      <PageLayout withSubstrip={false}>
        <ArticleToolbar />
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "40vh", padding: 40,
          color: "var(--muted)", fontFamily: "var(--font-mono)",
          fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: 700,
        }}>Loading report…</div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout withSubstrip={false}>
        <ArticleToolbar />
        <div style={{ color: "var(--red)", padding: 40, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".06em" }}>{error}</div>
      </PageLayout>
    );
  }
  if (!report) return null;

  const meta = [
    ...(report.id ? [{ label: `● ${report.id}`, color: "var(--orange)" }] : []),
    ...(report.tag ? [{ label: report.tag.toUpperCase() }] : []),
    ...(report.year ? [{ label: report.year }] : []),
    ...(report.read_time ? [{ label: report.read_time.toUpperCase() }] : []),
  ];

  return (
    <PageLayout withSubstrip={false}>
      <ArticleToolbar meta={meta.length ? meta : null} />
      <article className="reader-article">
        <header className="article-header">
          <div className="article-tags">
            <TierBadge tier={report.access} />
          </div>
          <h1 className="article-title serif">{report.title}</h1>
          {report.subtitle && <h2 className="article-subtitle serif">{report.subtitle}</h2>}
          <div className="article-meta">
            {report.date && <span>{report.date}</span>}
            {report.date && report.read_time && <span>·</span>}
            {report.read_time && <span>{report.read_time}</span>}
            {report.author && <><span>·</span><span>{report.author}</span></>}
          </div>
          {report.hook && <blockquote className="article-hook">{report.hook}</blockquote>}
        </header>
        {report.content_md && (
          <div className="article-body" dangerouslySetInnerHTML={{ __html:
            report.content_md
              .replace(/^### (.+)$/gm, "<h3>$1</h3>")
              .replace(/^## (.+)$/gm, "<h2>$1</h2>")
              .replace(/^# (.+)$/gm, "<h1>$1</h1>")
              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
              .replace(/\*(.+?)\*/g, "<em>$1</em>")
              .replace(/\n\n/g, "</p><p>")
              .replace(/^/, "<p>").replace(/$/, "</p>")
          }} />
        )}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
          <Link to="/synthesis/library" className="mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>
            ← Back to library
          </Link>
        </div>
      </article>
    </PageLayout>
  );
}
