// CMS Editor screen — literal port of designs/cms-screens.jsx :: EditorScreen.
// Visual match (synthesis engine | markdown editor | inspector). Wired to the
// real API for save/upload/synthesize. Falls back to CI_DATA seed when the
// backend has no record matching :id (so the design demonstrates as-is).

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  reports as reportsApi, jobs as jobsApi, push as pushApi,
} from "../../api.js";
import {
  PageHeader, Icons, TierBadge, StatusDot,
} from "../../shared.jsx";
import { CI_DATA } from "../../data.js";

export function EditorScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [tab, setTab] = useState("content");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [jobStatus, setJobStatus] = useState(null);
  const pdfRef = useRef();

  useEffect(() => {
    let cancelled = false;
    reportsApi.list()
      .then((list) => {
        if (cancelled) return null;
        const match = list.find((x) => x.id === id || x._id === id);
        if (!match) {
          const seed = CI_DATA.reports.find((r) => r.id === id) || CI_DATA.reports[0];
          setReport({ ...seed, _seed: true });
          setContent(CI_DATA.contentExcerpt);
          return null;
        }
        return reportsApi.get(match.slug).then((full) => {
          if (cancelled) return;
          setReport(full);
          setContent(full.content_md || CI_DATA.contentExcerpt);
        });
      })
      .catch(() => {
        const seed = CI_DATA.reports[0];
        setReport({ ...seed, _seed: true });
        setContent(CI_DATA.contentExcerpt);
      });
    return () => { cancelled = true; };
  }, [id]);

  const seedRwanda = CI_DATA.reports[0];

  // Merge live report with seed fields so the inspector can render the literal
  // design (constraints, predictions, stats) regardless of backend completeness.
  const r = useMemo(() => {
    if (!report) return null;
    return {
      ...seedRwanda,
      ...report,
      constraintIds: report.constraintIds || report.constraint_ids || seedRwanda.constraintIds,
      predictions:   report.predictions   || seedRwanda.predictions,
      stats:         report.stats         || seedRwanda.stats,
      headlines:     report.headlines     || seedRwanda.headlines,
      pages:         report.pages         || seedRwanda.pages,
      method:        report.method        || seedRwanda.method,
      horizon:       report.horizon       || seedRwanda.horizon,
      author:        report.author        || seedRwanda.author,
      readTime:      report.read_time     || report.readTime || seedRwanda.readTime,
    };
  }, [report, seedRwanda]);

  if (!r) {
    return (
      <div style={{ padding: 28, color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase" }}>
        Loading…
      </div>
    );
  }

  const onSave = async () => {
    if (r._seed) return;
    setSaving(true);
    try {
      await reportsApi.update(r._id || r.id, {
        title: r.title, subtitle: r.subtitle, hook: r.hook,
        content_md: content, access: r.access, status: r.status,
        tag: r.tag, domain: r.domain, year: r.year,
      });
    } finally {
      setSaving(false);
    }
  };

  const onPdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || r._seed) return;
    await reportsApi.uploadPdf(r._id || r.id, file);
    alert("PDF uploaded — ingestion queued");
  };

  const onSynthesize = async () => {
    if (r._seed) return;
    if (!confirm("Start AI synthesis? This will start the GCP VM.")) return;
    const res = await jobsApi.synthesize(r._id || r.id);
    setJobStatus(`Queued: task ${res.task_id}`);
  };

  const onNotify = async () => {
    if (!r.slug || r._seed) return;
    await pushApi.notifyReport(r.slug);
    alert("Push notification sent to all subscribers");
  };

  return (
    <>
      <PageHeader
        crumb={["CMS", "EDITOR", r.id]}
        title={r.title}
        sub={r.subtitle}
        code={`${r.id} · ${r.pages || "—"}p · BISE`}
        actions={
          <>
            {r.slug && (
              <Link
                to={`/reports/${r.slug}`}
                target="_blank"
                className="mono"
                style={{
                  background: "transparent", color: "var(--ink)", padding: "9px 12px",
                  fontSize: 10, letterSpacing: ".18em", fontWeight: 700,
                  border: "1px solid var(--line)",
                  display: "flex", alignItems: "center", gap: 6, textDecoration: "none",
                }}
              >
                <Icons.Eye size={12} /> PREVIEW PUBLIC
              </Link>
            )}
            <button onClick={onSave} disabled={saving || r._seed} className="mono" style={{
              background: "var(--ink)", color: "#fff", padding: "9px 14px",
              fontSize: 10, letterSpacing: ".18em", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 8,
              opacity: r._seed ? .5 : 1,
            }}>
              <Icons.Save size={12} color="#fff" /> {saving ? "SAVING…" : "UPDATE ARCHIVE"}
            </button>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: 0, height: "calc(100vh - 28px - 89px)" }}>
        {/* LEFT: Synthesis Engine */}
        <div style={{ borderRight: "1px solid var(--line)", background: "var(--paper)", overflowY: "auto" }}>
          <div style={{ padding: 20, borderBottom: "1px solid var(--line)" }}>
            <div className="lbl" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Upload size={11} /> SYNTHESIS ENGINE
            </div>
            <div style={{
              border: "1.5px dashed var(--line)", padding: 24, textAlign: "center",
              background: "var(--bg)", position: "relative",
            }}>
              <div style={{
                width: 44, height: 44, background: "var(--paper)", display: "flex",
                alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
                border: "1px solid var(--line)",
              }}>
                <Icons.FileText size={20} color="var(--purple)" />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                {r.slug ? `${r.slug}.pdf` : "Rwanda's Financial Overview.pdf"}
              </div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: ".16em", color: "var(--muted)" }}>
                4.2 MB · {r.pages || 50} PAGES · INGESTED 10:22
              </div>
              <input ref={pdfRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={onPdfUpload} />
            </div>
            <button
              onClick={() => pdfRef.current?.click()}
              disabled={r._seed}
              className="mono"
              style={{
                width: "100%", marginTop: 12, background: "var(--ink)", color: "#fff",
                padding: "11px", fontSize: 10, letterSpacing: ".2em", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: r._seed ? .5 : 1,
              }}
            >
              <Icons.Plus size={11} color="#fff" /> UPLOAD PDF
            </button>
            <button
              onClick={onSynthesize}
              disabled={r._seed}
              className="mono"
              style={{
                width: "100%", marginTop: 8, background: "var(--purple)", color: "#fff",
                padding: "11px", fontSize: 10, letterSpacing: ".2em", fontWeight: 700,
                opacity: r._seed ? .5 : 1,
              }}
            >
              ⚡ RE-GENERATE SYNTHESIS
            </button>
          </div>

          {/* Refinement console */}
          <div style={{ padding: 20, background: "var(--ink)", color: "#fff", borderBottom: "1px solid #1f1f1f" }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: ".22em", fontWeight: 700, color: "var(--purple)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Refresh size={11} color="var(--purple)" /> REFINEMENT ENGINE
            </div>
            <div className="mono" style={{ fontSize: 10, color: "#999", letterSpacing: ".06em", marginBottom: 10, lineHeight: 1.5 }}>
              Secondary instructions to optimize synthesis.
            </div>
            <textarea
              defaultValue="Tighten the cybersecurity narrative in §07 — emphasize the 12-18mo lag correlation."
              style={{
                width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                padding: 10, color: "#fff", fontSize: 11, height: 70, resize: "none", outline: "none",
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            <button className="mono" style={{
              width: "100%", marginTop: 10, background: "var(--purple)", color: "#fff",
              padding: "9px", fontSize: 10, letterSpacing: ".18em", fontWeight: 700,
            }}>REFINE ›</button>
          </div>

          {/* Pipeline feedback */}
          <div style={{ padding: 20 }}>
            <div className="lbl" style={{ marginBottom: 12 }}>PIPELINE FEEDBACK</div>
            {[
              { ok: true,   t: "10:22", m: "PDF ingested · 50 pages parsed" },
              { ok: true,   t: "10:23", m: "8 headlines extracted" },
              { ok: true,   t: "10:24", m: "BISE correlations · r ≥ 0.45" },
              { ok: true,   t: "10:25", m: "7 constraints auto-bound" },
              { ok: "live", t: "10:31", m: "Refinement queued · Section 03" },
            ].map((j, i, arr) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0",
                borderBottom: i < arr.length - 1 ? "1px solid var(--line-soft)" : 0,
              }}>
                <span style={{
                  width: 6, height: 6, marginTop: 6,
                  background: j.ok === true ? "var(--green)" : "var(--blue)",
                  animation: j.ok === "live" ? "pulse-dot 1.4s ease-in-out infinite" : "none",
                }} />
                <div style={{ flex: 1 }}>
                  <div className="mono tnum" style={{ fontSize: 9, color: "var(--muted)", letterSpacing: ".1em" }}>{j.t}</div>
                  <div style={{ fontSize: 11, color: "var(--ink)", marginTop: 2 }}>{j.m}</div>
                </div>
              </div>
            ))}
            {jobStatus && (
              <div className="mono" style={{ fontSize: 11, color: "var(--blue)", marginTop: 12 }}>{jobStatus}</div>
            )}
          </div>
        </div>

        {/* CENTER: Editor */}
        <div style={{ background: "var(--paper)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
            {[["content", "Markdown"], ["structured", "Structured Data"], ["versions", "Versions · 14"]].map(([tid, l]) => (
              <button key={tid} onClick={() => setTab(tid)} className="mono" style={{
                padding: "12px 18px", fontSize: 10, letterSpacing: ".18em", fontWeight: 700,
                color: tab === tid ? "var(--ink)" : "var(--muted)",
                borderBottom: `2px solid ${tab === tid ? "var(--purple)" : "transparent"}`,
                marginBottom: -1,
              }}>{l}</button>
            ))}
            <div style={{ flex: 1 }} />
            {tab === "content" && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 14px" }}>
                <span className="mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--muted)", marginRight: 8 }}>WRAP TIER ›</span>
                {["free", "members", "paid"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setContent((c) => `${c}\n:::${t}\n…\n:::\n`)}
                    className="mono"
                    style={{
                      fontSize: 9, padding: "5px 10px", letterSpacing: ".1em", fontWeight: 700,
                      border: "1px solid var(--line)", background: "var(--paper)",
                    }}
                  >:::{t}</button>
                ))}
              </div>
            )}
          </div>

          {tab === "content" && (
            <textarea value={content} onChange={(e) => setContent(e.target.value)} style={{
              flex: 1, padding: 28, border: 0, outline: 0, resize: "none",
              fontFamily: "JetBrains Mono, monospace", fontSize: 12.5, lineHeight: 1.75,
              color: "var(--ink-2)", background: "var(--paper)",
            }} />
          )}

          {tab === "structured" && <StructuredDataEditor report={r} />}
          {tab === "versions"   && <VersionsList />}

          {/* Footer status bar */}
          <div className="mono" style={{
            display: "flex", alignItems: "center", gap: 16, padding: "10px 18px",
            fontSize: 9, letterSpacing: ".14em", color: "var(--muted)",
            borderTop: "1px solid var(--line)", background: "var(--bg)",
          }}>
            <span><StatusDot status="live" /> &nbsp; {r._seed ? "DEMO MODE" : "AUTO-SAVED"} · 14:31:55</span>
            <span>·</span>
            <span>{content.length.toLocaleString()} CHARS</span>
            <span>·</span>
            <span>3 TIER DIRECTIVES</span>
            <div style={{ flex: 1 }} />
            <button onClick={onNotify} disabled={r._seed} className="mono" style={{ fontSize: 9, color: "var(--blue)", letterSpacing: ".14em", fontWeight: 700, opacity: r._seed ? .4 : 1 }}>
              NOTIFY SUBSCRIBERS ›
            </button>
            <span style={{ color: "var(--purple)" }}>SEAL: 9F4A·B21E</span>
          </div>
        </div>

        {/* RIGHT: Inspector */}
        <div style={{ borderLeft: "1px solid var(--line)", background: "var(--bg)", overflowY: "auto" }}>
          <InspectorSection title="LIFECYCLE">
            <div style={{ display: "flex", background: "var(--paper)", border: "1px solid var(--line)" }}>
              {["draft", "published", "retired"].map((s, i, arr) => (
                <button
                  key={s}
                  onClick={() => setReport((p) => p ? { ...p, status: s } : p)}
                  className="mono"
                  style={{
                    flex: 1, padding: "8px 0", fontSize: 9, letterSpacing: ".18em", fontWeight: 700,
                    background: r.status === s ? "var(--ink)" : "transparent",
                    color: r.status === s ? "#fff" : "var(--muted)",
                    borderRight: i < arr.length - 1 ? "1px solid var(--line)" : "0",
                    textTransform: "uppercase",
                  }}
                >
                  {s === "published" ? "Live" : s}
                </button>
              ))}
            </div>
          </InspectorSection>

          <InspectorSection title="ACCESS TIER">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {[
                ["free",    "Free",    Icons.Globe,  "var(--muted)"],
                ["members", "Members", Icons.Shield, "var(--blue)"],
                ["paid",    "Paid",    Icons.Lock,   "var(--purple)"],
              ].map(([tid, l, Ic, c]) => {
                const active = r.access === tid;
                return (
                  <button
                    key={tid}
                    onClick={() => setReport((p) => p ? { ...p, access: tid } : p)}
                    className="mono"
                    style={{
                      padding: "14px 4px", fontSize: 9, letterSpacing: ".14em", fontWeight: 700,
                      background: active ? "#fff" : "transparent",
                      border: `1px solid ${active ? c : "var(--line)"}`,
                      color: active ? c : "var(--muted)",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    }}
                  >
                    <Ic size={13} color={active ? c : "var(--muted)"} />
                    {l.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </InspectorSection>

          <InspectorSection title="MASTER VARIABLES" badge={`${r.constraintIds.length} BOUND`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CI_DATA.constraints.filter((c) => r.constraintIds.includes(c.id)).map((c) => (
                <div key={c.id} className="mono" style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 9px",
                  background: "var(--paper)", border: "1px solid var(--line)", fontSize: 10,
                }}>
                  <span style={{ color: "var(--purple)", fontWeight: 700, letterSpacing: ".06em" }}>{c.code}</span>
                  <span style={{ flex: 1, color: "var(--ink)", fontFamily: "inherit", textTransform: "none", letterSpacing: 0 }}>{c.name}</span>
                  <Icons.X size={10} color="var(--muted)" />
                </div>
              ))}
              <button className="mono" style={{
                padding: "8px", fontSize: 9, letterSpacing: ".18em",
                color: "var(--blue)", border: "1px dashed var(--line)", fontWeight: 700, marginTop: 4,
              }}>+ BIND CONSTRAINT</button>
            </div>
          </InspectorSection>

          <InspectorSection title="PREDICTION LEDGER" badge={`${r.predictions.length} CLAIMS`} accent="var(--orange)">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {r.predictions.slice(0, 4).map((p) => (
                <div key={p.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <StatusDot status={p.status === "resolved" ? (p.outcome === "true" ? "complete" : p.outcome === "partial" ? "pending" : "error") : "pending"} />
                    <span className="mono" style={{ fontSize: 9, letterSpacing: ".14em", fontWeight: 700, color: "var(--ink)" }}>{p.id.toUpperCase()}</span>
                    <TierBadge tier={p.tier} />
                    <span style={{ flex: 1 }} />
                    <span className="mono tnum" style={{ fontSize: 9, color: "var(--muted)" }}>{p.target}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-2)", lineHeight: 1.5 }}>{p.statement}</div>
                  {p.status === "resolved" && (
                    <div className="mono" style={{
                      fontSize: 9, letterSpacing: ".14em",
                      color: p.outcome === "true" ? "var(--green)" : p.outcome === "partial" ? "var(--amber)" : "var(--red)",
                      marginTop: 6, fontWeight: 700,
                    }}>
                      ◆ SEALED · {p.outcome.toUpperCase()} · CONF {p.confidence}
                    </div>
                  )}
                </div>
              ))}
              <button className="mono" style={{
                padding: "8px", fontSize: 9, letterSpacing: ".18em",
                color: "var(--orange)", border: "1px dashed var(--orange)", fontWeight: 700, marginTop: 4,
              }}>+ ADD PREDICTION</button>
            </div>
          </InspectorSection>

          <InspectorSection title="METADATA">
            {[
              ["Display year", r.year],
              ["Domain tag",   r.domain],
              ["Read time",    r.readTime || r.read_time],
              ["Method",       r.method],
              ["Horizon",      r.horizon],
              ["Author",       r.author],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line-soft)" }}>
                <div className="mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--muted)", width: 100, fontWeight: 700 }}>{k.toUpperCase()}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink)", flex: 1, letterSpacing: ".02em" }}>{v || "—"}</div>
              </div>
            ))}
          </InspectorSection>
        </div>
      </div>
    </>
  );
}

function InspectorSection({ title, badge, accent, children }) {
  return (
    <div style={{ borderBottom: "1px solid var(--line)", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: ".22em", fontWeight: 700, color: accent || "var(--ink)" }}>{title}</div>
        {badge && <span className="mono" style={{ marginLeft: "auto", fontSize: 8, letterSpacing: ".16em", color: "var(--muted)", fontWeight: 700 }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function StructuredDataEditor({ report }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
      <div className="lbl" style={{ marginBottom: 14 }}>CORE STATISTICS · {String(report.stats.length).padStart(2, "0")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 32 }}>
        {report.stats.map((s, i) => (
          <div key={i} className="surface" style={{ padding: 14, position: "relative", borderTop: "2px solid var(--purple)" }}>
            <input defaultValue={s.value} className="serif tnum" style={{
              width: "100%", fontSize: 22, fontWeight: 400, border: 0, outline: 0,
              background: "transparent", letterSpacing: "-.01em",
            }} />
            <input defaultValue={s.label} className="mono" style={{
              width: "100%", fontSize: 10, letterSpacing: ".14em", color: "var(--muted)",
              border: 0, outline: 0, background: "transparent", textTransform: "uppercase",
              marginTop: 6, fontWeight: 700,
            }} />
            <input defaultValue={s.desc} style={{
              width: "100%", fontSize: 11, color: "var(--muted)", border: 0, outline: 0,
              background: "transparent", marginTop: 6, fontStyle: "italic",
            }} />
          </div>
        ))}
      </div>

      <div className="lbl" style={{ marginBottom: 14 }}>HEADLINES · {String(report.headlines.length).padStart(2, "0")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {report.headlines.map((h) => (
          <div key={h.n} className="surface" style={{
            padding: 16, display: "grid", gridTemplateColumns: "40px 1fr 90px",
            gap: 14, alignItems: "flex-start",
          }}>
            <div className="serif" style={{ fontSize: 28, color: "var(--line)", lineHeight: 1, fontStyle: "italic" }}>{h.n}</div>
            <div>
              <input defaultValue={h.title} style={{ width: "100%", fontSize: 14, fontWeight: 700, border: 0, outline: 0, background: "transparent" }} />
              <textarea defaultValue={h.body} rows={2} style={{
                width: "100%", fontSize: 12, color: "var(--muted)", border: 0, outline: 0,
                background: "transparent", resize: "none", fontFamily: "inherit",
                marginTop: 4, lineHeight: 1.5,
              }} />
            </div>
            <TierBadge tier={h.tier} />
          </div>
        ))}
      </div>
    </div>
  );
}

function VersionsList() {
  const versions = [
    { v: 14, t: "just now",     who: "bendonmurgor", m: "Tier-gated Section 06 · sealed paid",   diff: "+128 / −44" },
    { v: 13, t: "2 hours ago",  who: "n.uwase",      m: "Bound C-X01 cyber constraint",          diff: "+12 / −0" },
    { v: 12, t: "today 10:25",  who: "AI · Refine",  m: "Sharpened §07 cyber narrative",         diff: "+241 / −189" },
    { v: 11, t: "today 10:23",  who: "AI · Synth",   m: "Initial synthesis from Rwanda PDF",     diff: "+8,442 / −0" },
    { v: 10, t: "yesterday",    who: "k.mensah",     m: "Editorial pass · headlines tightened",  diff: "+88 / −156" },
    { v: 9,  t: "2 days ago",   who: "n.uwase",      m: "Stats block restructured",              diff: "+44 / −22" },
  ];
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {versions.map((v) => (
        <div key={v.v} style={{
          display: "grid", gridTemplateColumns: "60px 1fr 140px 110px 100px",
          gap: 16, alignItems: "center", padding: "14px 28px",
          borderBottom: "1px solid var(--line-soft)",
        }}>
          <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: "var(--purple)" }}>v{v.v}</div>
          <div>
            <div style={{ fontSize: 13 }}>{v.m}</div>
            <div className="mono" style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--muted)", marginTop: 3 }}>{v.t.toUpperCase()}</div>
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink)" }}>{v.who}</div>
          <div className="mono tnum" style={{ fontSize: 10, color: "var(--muted)" }}>{v.diff}</div>
          <button className="mono" style={{ fontSize: 9, letterSpacing: ".18em", color: "var(--blue)", fontWeight: 700, justifySelf: "end" }}>RESTORE ›</button>
        </div>
      ))}
    </div>
  );
}
