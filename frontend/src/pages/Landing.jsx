// Landing screen — literal port of designs/landing.jsx into the React+Vite app.
// Visual + content match: section-by-section, attribute-for-attribute.
//
// Header and footer are global (PageLayout / GlobalNav / SiteFooter), so this
// file only contributes the sections between them.
//
// Differences from the original (mechanical, not visual):
//   • window.CI_DATA      → import { CI_DATA } from "../data.js"
//   • window.CILogoMark   → import primitives from "../shared.jsx"
//   • go('reader')        → useNavigate() to /reports/<slug>
//   • go('reports')       → useNavigate() to /synthesis/library (or /cms/reports for admins)

import { Link, useNavigate } from "react-router-dom";
import { TierBadge, Icons } from "../shared.jsx";
import { PageLayout } from "../components/PageLayout.jsx";
import { CI_DATA } from "../data.js";

function lensChipsForReport(report, constraints) {
  const out = [];
  const seen = new Set();
  for (const cid of report.constraintIds || []) {
    const c = constraints.find((x) => x.id === cid);
    if (!c?.code) continue;
    const letter = c.code[0];
    if (!["B", "I", "S", "E"].includes(letter) || seen.has(letter)) continue;
    seen.add(letter);
    const color =
      letter === "B" ? "var(--blue)" :
      letter === "I" ? "var(--purple)" :
      letter === "S" ? "var(--orange)" : "var(--green)";
    out.push({ letter, code: c.code, color });
    if (out.length >= 4) break;
  }
  return out;
}

function formatSerDate(iso) {
  if (!iso || typeof iso !== "string") return "—";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  const [y, m, d] = p;
  return `${m} / ${d} · '${y.slice(2)}`;
}

export function LandingPage() {
  const navigate = useNavigate();
  const data = CI_DATA;
  const featured = data.reports[0]; // Rwanda
  const goReader = (slug = featured.slug) => navigate(`/reports/${slug}`);
  const goReports = () => navigate("/synthesis/library");
  const lensChips = lensChipsForReport(featured, data.constraints);
  const serStamp = formatSerDate(featured.date);
  const deskConf = featured.hitRate != null ? `${Math.round(featured.hitRate * 100)}% DESK` : null;

  return (
    <PageLayout variant="landing">
      <div className="landing-page">
        <div className="landing-shell">
          {/* ============ HERO ============ */}
          <section className="hero-section">
            <div className="hero-inner">
              <div className="hero-kicker" role="presentation">
                <span className="hero-kicker-line" aria-hidden />
                <span className="hero-kicker-text">Manifesto · 04.2026 · CI.SYNTH.Q2</span>
                <span className="hero-kicker-line" aria-hidden />
              </div>

              <div className="hero-mast">
                <h1 className="hero-title">
                  The Synthesis<br />
                  of <em>Inevitability</em>.
                </h1>

                <button type="button" className="hero-featured" onClick={() => goReader()} aria-label={`Open featured report: ${featured.title}`}>
                  <div className="hero-featured-card">
                    <div className="hero-featured-rail" aria-hidden>
                      <span>Synthesis index · {featured.id}</span>
                    </div>
                    <div className="hero-featured-main">
                      <div className="hero-featured-top">
                        <div className="hero-featured-bise">
                          {lensChips.map(({ letter, code, color }) => (
                            <span key={code} className="hero-featured-bise-i">
                              <i style={{ background: color }} title={code} /> {letter}
                            </span>
                          ))}
                        </div>
                        <span className="hero-featured-flag">● FEATURED</span>
                        <span className="hero-featured-meta">
                          {featured.id} · {serStamp}
                          <span style={{ margin: "0 6px", opacity: 0.35 }}>|</span>
                          9F4A·B21E
                        </span>
                      </div>
                      <div className="hero-featured-body">
                        <div className="hero-featured-eyebrow">
                          Rwanda · {featured.tag.toUpperCase()} · {featured.year}
                        </div>
                        <h2 className="hero-featured-title">{featured.title}</h2>
                        <p className="hero-featured-sub">{featured.subtitle}</p>
                        {featured.hook && (
                          <p className="hero-featured-hook">{featured.hook}</p>
                        )}
                        <div className="hero-featured-stats">
                          {featured.stats.slice(0, 3).map((s) => (
                            <div key={s.label} className="hero-featured-stat">
                              <div className="hero-featured-stat-val">{s.value}</div>
                              <div className="hero-featured-stat-lbl">{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="hero-featured-foot">
                        <span>Read full synthesis</span>
                        <span style={{ flex: 1, minWidth: 8 }} aria-hidden />
                        <span style={{ color: "var(--orange)", textAlign: "right" }}>
                          {featured.readTime.toUpperCase()} · {featured.pages}P
                          {deskConf && (
                            <>
                              <span style={{ color: "rgba(255,255,255,.35)" }}> · </span>
                              {deskConf}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                <div className="hero-copy-col">
                  <p className="hero-pull">
                    Reports are everywhere. Insight is rare.
                  </p>
                  <p className="hero-body">
                    We ingest the public corpus — central-bank filings, sectoral surveys, regulatory primary data — and pass every claim through the <strong>BISE lens</strong>: Behavioural, Institutional, Sectoral, Economic.
                  </p>
                  <p className="hero-body">
                    Only signals that triangulate across <strong>two or more</strong> lenses make the cut. Every claim is sealed, dated, and posted to the public Ledger — where you can track us as we get things wrong.
                  </p>
                  <div className="hero-cta-row">
                    <button type="button" onClick={() => goReader()} className="hero-btn-primary">
                      Read the featured report ›
                    </button>
                    <a href="#synthesis" className="hero-btn-secondary">
                      The method
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ============ SYNTHESIS METHOD (BISE) ============ */}
          <section id="synthesis" style={{ padding: "80px 0", borderBottom: "1px solid var(--line)" }}>
            <SectionHeader num="01" tag="THE METHOD" title="A four-lens triangulation" lede="Every claim must clear two of four. No exceptions." />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, marginTop: 48, border: "1px solid var(--line)" }}>
              {[
                { code: "B", label: "BEHAVIOURAL",   title: "How people transact",      desc: "Wallet adoption, savings groups, credit habits. The intent layer beneath every formal number.",       accent: "var(--blue)",   count: "02" },
                { code: "I", label: "INSTITUTIONAL", title: "How the system organises", desc: "Bank concentration, regulator stance, capital adequacy. Structure that shapes behaviour.",          accent: "var(--purple)", count: "02" },
                { code: "S", label: "SECTORAL",      title: "Where money flows",        desc: "Loan-book composition vs sectoral GDP. Reveals systematic over- and under-banking.",                accent: "var(--orange)", count: "01" },
                { code: "E", label: "ECONOMIC",      title: "The macro envelope",       desc: "GDP, debt, remittances, FX. The constraints inside which everything else operates.",                accent: "var(--green)",  count: "03" },
              ].map((l, i, arr) => (
                <div key={l.code} style={{ padding: 28, background: "var(--paper)", borderRight: i < arr.length - 1 ? "1px solid var(--line)" : "0", position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
                    <div style={{ width: 56, height: 56, background: l.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Serif Display", fontSize: 32 }}>{l.code}</div>
                    <div style={{ flex: 1 }}>
                      <div className="mono" style={{ fontSize: 9, letterSpacing: ".22em", color: l.accent, fontWeight: 800, marginBottom: 4 }}>LENS · {l.label}</div>
                      <div className="serif" style={{ fontSize: 20, lineHeight: 1.15 }}>{l.title}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--muted)", margin: 0, marginBottom: 20 }}>{l.desc}</p>
                  <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700 }}>BOUND CONSTRAINTS</span>
                    <span className="mono tnum" style={{ fontSize: 14, fontWeight: 700, color: l.accent }}>{l.count}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Triangulation diagram */}
            <div className="surface" style={{ padding: 32, marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
              <div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800, marginBottom: 14 }}>◆ THE GATE</div>
                <div className="serif" style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 18 }}>
                  A claim crosses <em style={{ color: "var(--purple)" }}>two lenses</em>, or it doesn't ship.
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--muted)", margin: 0, marginBottom: 14, maxWidth: 540 }}>
                  Single-lens findings are commentary. We've published over 600 of them internally. Only the {" "}
                  <strong style={{ color: "var(--ink)" }}>~14%</strong> that survive triangulation make it to the Ledger.
                </p>
                <div style={{ display: "flex", gap: 24, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                  <div>
                    <div className="serif tnum" style={{ fontSize: 32, letterSpacing: "-.02em" }}>647</div>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700 }}>SINGLE-LENS</div>
                  </div>
                  <div>
                    <div className="serif tnum" style={{ fontSize: 32, letterSpacing: "-.02em", color: "var(--purple)" }}>91</div>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--purple)", fontWeight: 700 }}>TRIANGULATED</div>
                  </div>
                  <div>
                    <div className="serif tnum" style={{ fontSize: 32, letterSpacing: "-.02em", color: "var(--orange)" }}>31</div>
                    <div className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--orange)", fontWeight: 700 }}>SEALED</div>
                  </div>
                </div>
              </div>

              {/* Venn-ish visual */}
              <div style={{ position: "relative", height: 320 }}>
                <svg viewBox="0 0 320 320" style={{ width: "100%", height: "100%" }}>
                  <circle cx="120" cy="120" r="90" fill="var(--blue)"   opacity=".25" />
                  <circle cx="200" cy="120" r="90" fill="var(--purple)" opacity=".25" />
                  <circle cx="120" cy="200" r="90" fill="var(--orange)" opacity=".25" />
                  <circle cx="200" cy="200" r="90" fill="var(--green)"  opacity=".25" />
                  <rect x="148" y="148" width="24" height="24" fill="var(--ink)" transform="rotate(45 160 160)" />
                  <text x="120" y="74"  fontFamily="JetBrains Mono" fontSize="11" fontWeight="800" letterSpacing="2.5" fill="var(--blue)">B</text>
                  <text x="200" y="74"  fontFamily="JetBrains Mono" fontSize="11" fontWeight="800" letterSpacing="2.5" fill="var(--purple)">I</text>
                  <text x="120" y="260" fontFamily="JetBrains Mono" fontSize="11" fontWeight="800" letterSpacing="2.5" fill="var(--orange)">S</text>
                  <text x="200" y="260" fontFamily="JetBrains Mono" fontSize="11" fontWeight="800" letterSpacing="2.5" fill="var(--green)">E</text>
                  <text x="160" y="166" fontFamily="JetBrains Mono" fontSize="9"  fontWeight="800" letterSpacing="2"   fill="#fff" textAnchor="middle">SYNTH</text>
                </svg>
              </div>
            </div>
          </section>

          {/* ============ LATEST REPORTS GRID ============ */}
          <section id="reports" style={{ padding: "80px 0", borderBottom: "1px solid var(--line)" }}>
            <SectionHeader num="02" tag="THE LIBRARY" title="Latest synthesis" lede="Six reports active. Click any to read the full synthesis." />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, marginTop: 48, border: "1px solid var(--line)" }}>
              {data.reports.map((r, i, arr) => {
                const inLastRow = i >= arr.length - (arr.length % 3 || 3);
                return (
                  <button
                    key={r.id}
                    onClick={() => r.status !== "retired" && goReader(r.slug)}
                    style={{
                      padding: 28, background: "var(--paper)", textAlign: "left",
                      borderRight: (i + 1) % 3 ? "1px solid var(--line)" : "0",
                      borderBottom: !inLastRow ? "1px solid var(--line)" : "0",
                      cursor: r.status === "retired" ? "default" : "pointer",
                      opacity: r.status === "retired" ? .5 : 1,
                      position: "relative", minHeight: 280,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <span className="mono" style={{ fontSize: 9, letterSpacing: ".2em", color: "var(--purple)", fontWeight: 800 }}>{r.id}</span>
                      <span className="mono" style={{ fontSize: 9, letterSpacing: ".2em", color: "var(--muted)", fontWeight: 700 }}>· {r.year}</span>
                      <span style={{ flex: 1 }} />
                      <TierBadge tier={r.access} />
                    </div>
                    <div className="serif" style={{ fontSize: 28, lineHeight: 1.05, letterSpacing: "-.015em", marginBottom: 10 }}>{r.title}</div>
                    <div className="serif" style={{ fontSize: 14, fontStyle: "italic", color: "var(--muted)", lineHeight: 1.4, marginBottom: 20 }}>{r.subtitle || ""}</div>
                    <div style={{ position: "absolute", bottom: 28, left: 28, right: 28, display: "flex", alignItems: "center", gap: 12, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
                      <span className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700 }}>{r.tag.toUpperCase()}</span>
                      <span style={{ flex: 1 }} />
                      {r.hitRate ? (
                        <span className="mono tnum" style={{ fontSize: 11, fontWeight: 700, color: r.hitRate > .75 ? "var(--green)" : "var(--ink)" }}>
                          {Math.round(r.hitRate * 100)}% HIT
                        </span>
                      ) : (
                        <span className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700 }}>{r.status.toUpperCase()}</span>
                      )}
                      {r.id === "RW-FIN-26" && <span style={{ color: "var(--orange)" }}>→</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ============ THE SCAN ============ */}
          <section id="scan" style={{ padding: "80px 0", borderBottom: "1px solid var(--line)" }}>
            <SectionHeader num="03" tag="THE SCAN" title="Live signal feed" lede="Real-time observations from the desk. Refreshed continuously." />

            <div className="surface" style={{ padding: 0, marginTop: 48, background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 8, height: 8, background: "var(--green)", animation: "pulse-dot 1.4s ease-in-out infinite" }} />
                <span className="mono" style={{ fontSize: 10, letterSpacing: ".2em", fontWeight: 800 }}>LIVE · DESK SCAN</span>
                <span className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "#888", fontWeight: 700 }}>· UTC 14:32</span>
                <span style={{ flex: 1 }} />
                <span className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "#888", fontWeight: 700 }}>14 SIGNALS · LAST 24H</span>
              </div>
              {[
                { t: "14:31", tag: "RWF", c: "var(--orange)", m: "BNR holds CBR at 7.50% — fifth consecutive print. Real rate now +3.4%." },
                { t: "13:58", tag: "BIN", c: "var(--purple)", m: "Top-3 Rwandan bank concentration ticks 63.2 → 63.6% in Q1 — consolidation thesis intact." },
                { t: "12:14", tag: "KES", c: "var(--blue)",   m: "Kenya 10y bond yield slips to 14.62%. Diaspora-bond appetite reportedly strong at the cut." },
                { t: "11:02", tag: "CYB", c: "var(--red)",    m: "X-01 ticks +41% YoY — fourth consecutive quarterly acceleration. Watch the digital-banking lag." },
                { t: "09:47", tag: "EAC", c: "var(--green)",  m: "EAC monetary-union pre-paper drops; convergence criteria tighter than 2024 draft." },
                { t: "08:12", tag: "NGN", c: "var(--orange)", m: "CBN hikes MPR 50bps to 27.50%. Naira firms 1,548 → 1,524 against the dollar." },
              ].map((s, i, arr) => (
                <div key={i} style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "60px 60px 1fr", gap: 14, alignItems: "center", borderBottom: i < arr.length - 1 ? "1px solid #1f1f1f" : "0" }}>
                  <span className="mono tnum" style={{ fontSize: 10, color: "#666", letterSpacing: ".06em" }}>{s.t}</span>
                  <span className="mono" style={{ fontSize: 9, letterSpacing: ".2em", fontWeight: 800, color: s.c }}>{s.tag}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.5, color: "#ddd" }}>{s.m}</span>
                </div>
              ))}
              <div style={{ padding: "14px 20px", textAlign: "center", background: "#0f0f0f" }}>
                <button className="mono" style={{ fontSize: 10, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800 }}>VIEW FULL SCAN ARCHIVE ›</button>
              </div>
            </div>
          </section>

          {/* ============ THE LEDGER ============ */}
          <section id="ledger" style={{ padding: "80px 0", borderBottom: "1px solid var(--line)" }}>
            <SectionHeader num="04" tag="THE LEDGER" title="Track us as we get it wrong" lede="Every prediction we publish lands here. Sealed at issue, resolved publicly." />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 48 }}>
              {[
                ["LIFETIME CLAIMS", "31",  "var(--ink)"],
                ["RESOLVED",        "19",  "var(--purple)"],
                ["HIT RATE",        "76%", "var(--green)"],
                ["PARTIAL",         "03",  "var(--amber)"],
                ["MISSED",          "03",  "var(--red)"],
              ].map(([l, v, c], i) => (
                <div key={i} className="surface" style={{ padding: 18, borderTop: `3px solid ${c}` }}>
                  <div className="lbl" style={{ fontSize: 9 }}>{l}</div>
                  <div className="serif tnum" style={{ fontSize: 36, fontWeight: 400, marginTop: 6, letterSpacing: "-.02em", color: c }}>{v}</div>
                </div>
              ))}
            </div>

            <div className="surface" style={{ marginTop: 16, padding: 0 }}>
              <div className="mono" style={{ display: "grid", gridTemplateColumns: "90px 1.5fr 110px 110px 100px 90px", fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700, padding: "12px 20px", borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
                <div>CLAIM</div><div>STATEMENT</div><div>VECTOR</div><div>SEALED</div><div>RESOLVED</div><div>OUTCOME</div>
              </div>
              {[
                { id: "P-014", s: "Top-3 Rwandan bank concentration crosses 65% by Q4 2025",            v: "RW-FIN-25",  sealed: "2024.06", res: "2025.12", o: "true" },
                { id: "P-019", s: "Kenya tea-export receipts decouple from rainfall index for first time", v: "KE-AGRI-25", sealed: "2024.11", res: "2025.10", o: "true" },
                { id: "P-021", s: "EAC monetary union signed with binding criteria by end-2025",         v: "EAC-STBL-25",sealed: "2024.09", res: "2025.12", o: "false" },
                { id: "P-024", s: "Mobile-money penetration crosses 85% in Rwanda",                       v: "RW-FIN-25",  sealed: "2024.06", res: "2025.08", o: "true" },
                { id: "P-027", s: "Cyber-incident frequency leads digital-banking growth by 12-18mo",     v: "RW-FIN-25",  sealed: "2025.01", res: "2025.11", o: "partial" },
              ].map((p, i, arr) => (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "90px 1.5fr 110px 110px 100px 90px", alignItems: "center", padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--line-soft)" : "0" }}>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)" }}>{p.id}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.4 }}>{p.s}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--ink)", fontWeight: 700 }}>{p.v}</span>
                  <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>{p.sealed}</span>
                  <span className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>{p.res}</span>
                  <span className="mono" style={{
                    fontSize: 9, letterSpacing: ".18em", fontWeight: 800, padding: "4px 8px",
                    color: "#fff", justifySelf: "start",
                    background: p.o === "true" ? "var(--green)" : p.o === "partial" ? "var(--amber)" : "var(--red)",
                  }}>
                    ◆ {p.o.toUpperCase()}
                  </span>
                </div>
              ))}
              <div style={{ padding: "14px 20px", textAlign: "center", borderTop: "1px solid var(--line)", background: "var(--bg)" }}>
                <Link to="/ledger/open" className="mono" style={{ fontSize: 10, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800, textDecoration: "none" }}>
                  OPEN FULL LEDGER · 31 CLAIMS ›
                </Link>
              </div>
            </div>
          </section>

          {/* ============ CONSTRAINTS PREVIEW ============ */}
          <section id="constraints" style={{ padding: "80px 0", borderBottom: "1px solid var(--line)" }}>
            <SectionHeader num="05" tag="MASTER VARIABLES" title="The constraints that bind" lede="09 cross-cutting variables. Every report triangulates ≥2." />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 48 }}>
              {data.constraints.slice(0, 6).map((c) => {
                const domainColor = {
                  "Behavioural":   "var(--blue)",
                  "Institutional": "var(--purple)",
                  "Sectoral":      "var(--orange)",
                  "Economic":      "var(--green)",
                  "Cross-cutting": "var(--red)",
                }[c.domain] || "var(--muted)";
                return (
                  <div key={c.id} className="surface" style={{ padding: 20, borderLeft: `3px solid ${domainColor}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span className="mono" style={{ background: domainColor, color: "#fff", padding: "3px 7px", fontSize: 9, letterSpacing: ".14em", fontWeight: 800 }}>{c.code}</span>
                      <span className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: domainColor, fontWeight: 800 }}>{c.domain.toUpperCase()}</span>
                      <span style={{ flex: 1 }} />
                      <span className="mono" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: ".14em" }}>{c.linkedReports} REPORTS</span>
                    </div>
                    <div className="serif" style={{ fontSize: 18, lineHeight: 1.2, marginBottom: 8 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, marginBottom: 14 }}>{c.description}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 10, borderTop: "1px solid var(--line-soft)" }}>
                      <span className="mono" style={{ fontSize: 8, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700 }}>LATEST</span>
                      <span className="mono tnum" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{c.lastObs}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button onClick={goReports} className="mono" style={{ padding: "12px 22px", fontSize: 10, letterSpacing: ".22em", color: "var(--ink)", fontWeight: 800, border: "1px solid var(--ink)" }}>
                VIEW ALL 09 CONSTRAINTS ›
              </button>
            </div>
          </section>

          {/* ============ MEMBERSHIP TIERS ============ */}
          <section id="tiers" style={{ padding: "80px 0", borderBottom: "1px solid var(--line)" }}>
            <SectionHeader num="06" tag="MEMBERSHIP" title="Three layers of access" lede="Every synthesis is gated. Every claim is sealed." />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 48 }}>
              {[
                { tier: "free",     label: "FREE",          price: "$0",     period: "/forever", icon: Icons.Globe,  color: "var(--muted)",
                  desc: "The headlines. The Ledger. The Scan.",
                  features: ["Every report headline + executive summary", "Full Ledger access", "Live Scan feed", "Constraints library (read-only)"] },
                { tier: "members",  label: "MEMBERS",       price: "$24",    period: "/month",   icon: Icons.Shield, color: "var(--blue)",
                  desc: "The full reports. Members-tier sections.",
                  features: ["Everything in Free", "Full reports including Members sections", "Quarterly briefings", "Member-only Scan annotations", "Comment + flag on Ledger items"] },
                { tier: "paid",     label: "INSTITUTIONAL", price: "$2,400", period: "/year",    icon: Icons.Lock,   color: "var(--purple)",
                  desc: "Sealed Paid sections. Constraint API. Embargo access.",
                  features: ["Everything in Members", "Sealed Paid-tier deep dives", "24-hour pre-publish embargo", "BISE constraint API access", "Custom constraint binding (5/year)", "Direct desk access"] },
              ].map((t) => {
                const Icon = t.icon;
                const featuredTier = t.tier === "paid";
                return (
                  <div key={t.tier} className="surface" style={{
                    padding: 28, position: "relative",
                    background: featuredTier ? "var(--ink)" : "var(--paper)",
                    color: featuredTier ? "#fff" : "var(--ink)",
                    borderColor: featuredTier ? "var(--ink)" : "var(--line)",
                    borderTop: `3px solid ${t.color}`,
                  }}>
                    {featuredTier && (
                      <div className="mono" style={{ position: "absolute", top: -1, right: -1, background: t.color, color: "#fff", padding: "4px 10px", fontSize: 9, letterSpacing: ".2em", fontWeight: 800 }}>
                        RECOMMENDED
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                      <div style={{ width: 36, height: 36, border: `1.5px solid ${t.color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon size={16} color={t.color} />
                      </div>
                      <div>
                        <div className="mono" style={{ fontSize: 10, letterSpacing: ".22em", color: t.color, fontWeight: 800 }}>{t.label}</div>
                        <div style={{ fontSize: 12, color: featuredTier ? "#999" : "var(--muted)", marginTop: 2, fontStyle: "italic" }}>{t.desc}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 24, paddingBottom: 20, borderBottom: featuredTier ? "1px solid #2a2a2a" : "1px solid var(--line)" }}>
                      <span className="serif tnum" style={{ fontSize: 56, lineHeight: 1, letterSpacing: "-.025em" }}>{t.price}</span>
                      <span className="mono" style={{ fontSize: 11, color: featuredTier ? "#999" : "var(--muted)", letterSpacing: ".14em", fontWeight: 700 }}>{t.period}</span>
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 28 }}>
                      {t.features.map((f) => (
                        <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", fontSize: 13, lineHeight: 1.5 }}>
                          <Icons.Check size={12} color={t.color} style={{ marginTop: 4, flexShrink: 0 }} />
                          <span style={{ color: featuredTier ? "#ddd" : "var(--ink-2)" }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button className="mono" style={{
                      width: "100%", padding: 14, fontSize: 11, letterSpacing: ".22em", fontWeight: 800,
                      background: featuredTier ? t.color : "transparent",
                      color: featuredTier ? "#fff" : t.color,
                      border: featuredTier ? "0" : `1.5px solid ${t.color}`,
                    }}>
                      {t.tier === "free" ? "CREATE ACCOUNT ›" : t.tier === "members" ? "SUBSCRIBE ›" : "TALK TO THE DESK ›"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ============ SIGNUP / CTA ============ */}
          <section style={{ padding: "96px 0", background: "var(--ink)", color: "#fff", margin: "0 -32px" }}>
            <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 80, alignItems: "center" }}>
              <div>
                <div className="mono" style={{ fontSize: 11, letterSpacing: ".28em", color: "var(--purple)", fontWeight: 800, marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ width: 28, height: 1, background: "var(--purple)" }} />
                  THE BRIEFING
                </div>
                <div className="serif" style={{ fontSize: 56, lineHeight: 1, letterSpacing: "-.025em", marginBottom: 20 }}>
                  One synthesis<br />a week. <em style={{ color: "var(--orange)", fontStyle: "italic" }}>Free.</em>
                </div>
                <p style={{ fontSize: 16, lineHeight: 1.65, color: "#bbb", maxWidth: 520, margin: 0, marginBottom: 24 }}>
                  Friday morning. The single most important synthesis of the week, the constraints it triangulates, and the open prediction it puts on the Ledger.
                </p>
                <div className="mono" style={{ fontSize: 10, letterSpacing: ".18em", color: "#666", fontWeight: 700 }}>
                  4,200+ READERS · GOVERNMENTS · BANKS · DESKS
                </div>
              </div>
              <div>
                <form onSubmit={(e) => e.preventDefault()} style={{ background: "rgba(255,255,255,.04)", border: "1px solid #1f1f1f", padding: 28 }}>
                  <div className="mono" style={{ fontSize: 9, letterSpacing: ".22em", color: "var(--purple)", fontWeight: 800, marginBottom: 18 }}>◆ THE BRIEFING · WEEKLY</div>
                  <input placeholder="you@institution.org" className="mono" style={{
                    width: "100%", padding: "14px 16px", background: "#fff", color: "var(--ink)",
                    border: 0, outline: 0, fontSize: 13, letterSpacing: ".04em", marginBottom: 10,
                  }} />
                  <select defaultValue="" className="mono" style={{ width: "100%", padding: "14px 16px", background: "#fff", color: "var(--ink)", border: 0, outline: 0, fontSize: 11, letterSpacing: ".18em", fontWeight: 700, marginBottom: 14, textTransform: "uppercase" }}>
                    <option value="">YOUR ROLE — INSTITUTION</option>
                    <option>BANK / FINANCIAL INSTITUTION</option>
                    <option>GOVERNMENT / REGULATOR</option>
                    <option>RESEARCH / ACADEMIC</option>
                    <option>FUND / ASSET MANAGER</option>
                    <option>OTHER</option>
                  </select>
                  <button className="mono" style={{ width: "100%", padding: 14, background: "var(--orange)", color: "var(--ink)", fontSize: 11, letterSpacing: ".22em", fontWeight: 800 }}>
                    SUBSCRIBE ›
                  </button>
                  <div className="mono" style={{ fontSize: 8, letterSpacing: ".18em", color: "#666", marginTop: 14, textAlign: "center", fontWeight: 700, lineHeight: 1.6 }}>
                    NO SPAM · UNSUBSCRIBE ANY TIME · GDPR-COMPLIANT
                  </div>
                </form>
              </div>
            </div>
          </section>

        </div>
      </div>
    </PageLayout>
  );
}

// SectionHeader — literal copy from designs/landing.jsx
function SectionHeader({ num, tag, title, lede }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <span className="mono" style={{ fontSize: 11, letterSpacing: ".22em", color: "var(--muted)", fontWeight: 800 }}>{num}</span>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span className="mono" style={{ fontSize: 11, letterSpacing: ".24em", color: "var(--purple)", fontWeight: 800 }}>{tag}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32 }}>
        <h2 className="serif" style={{ fontSize: 64, lineHeight: .95, margin: 0, letterSpacing: "-.025em", maxWidth: 760 }}>{title}</h2>
        {lede && <p className="serif" style={{ fontSize: 17, lineHeight: 1.45, color: "var(--muted)", margin: 0, maxWidth: 320, fontStyle: "italic" }}>{lede}</p>}
      </div>
    </div>
  );
}
