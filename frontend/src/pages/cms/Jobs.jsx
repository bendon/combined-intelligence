// CMS Jobs screen — literal port of designs/cms-screens.jsx :: JobsScreen.
// Visual match. Data: live from jobsApi.list() (polled); seed data fallback.

import { Fragment, useEffect, useMemo, useState } from "react";
import { jobs as jobsApi } from "../../api.js";
import { PageHeader, StatusDot } from "../../shared.jsx";
import { CI_DATA } from "../../data.js";

export function JobsScreen() {
  const [api, setApi] = useState(null);

  useEffect(() => {
    const load = () => jobsApi.list().then(setApi).catch(() => setApi([]));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  // Normalize API jobs into the design's shape; fall back to seed data when
  // the backend has none, so the screen still demonstrates correctly.
  const jobs = useMemo(() => {
    if (!api) return null;
    if (api.length === 0) return CI_DATA.jobs;
    return api.map((j) => ({
      id: j.task_id || j._id,
      kind: j.kind || "AI Synthesis",
      source: j.report_id,
      status: j.status,
      progress: typeof j.progress === "number" ? j.progress : statusToProgress(j.status),
      started: j.created_at ? new Date(j.created_at).toLocaleTimeString() : "—",
      duration: j.duration || "—",
      message: j.error || j.message || j.status,
    }));
  }, [api]);

  const counts = useMemo(() => {
    if (!jobs) return { active: 0, err: 0 };
    return {
      active: jobs.filter((j) => j.status === "processing" || j.status === "queued").length,
      err:    jobs.filter((j) => j.status === "error").length,
    };
  }, [jobs]);

  return (
    <>
      <PageHeader
        crumb={["CMS", "PIPELINE"]}
        title="Job Monitor"
        sub="Async synthesis, refinement, ingestion, and resolution jobs."
        code={`PIPE · ${pad2(counts.active)} ACTIVE · ${pad2(counts.err)} ERR`}
      />

      <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Job stream */}
        <div className="surface" style={{ padding: 0 }}>
          <div className="mono" style={{
            display: "grid", gridTemplateColumns: "90px 130px 1fr 110px 90px 90px 110px",
            fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700,
            padding: "12px 18px", borderBottom: "1px solid var(--line)", background: "var(--bg)",
          }}>
            <div>JOB ID</div>
            <div>KIND</div>
            <div>SOURCE / MESSAGE</div>
            <div>STATUS</div>
            <div>PROGRESS</div>
            <div>STARTED</div>
            <div>DURATION</div>
          </div>

          {jobs === null && (
            <div className="mono" style={{ padding: 24, color: "var(--muted)", fontSize: 11, letterSpacing: ".18em", textAlign: "center" }}>
              LOADING…
            </div>
          )}

          {jobs && jobs.map((j, i) => {
            const statusColor = {
              complete:   "var(--green)",
              processing: "var(--blue)",
              queued:     "var(--muted)",
              error:      "var(--red)",
            }[j.status] || "var(--muted)";
            return (
              <div key={j.id} style={{
                display: "grid", gridTemplateColumns: "90px 130px 1fr 110px 90px 90px 110px",
                alignItems: "center", padding: "14px 18px",
                borderBottom: i < jobs.length - 1 ? "1px solid var(--line-soft)" : "0",
                background:
                  j.status === "processing" ? "rgba(0,180,224,.04)" :
                  j.status === "error"      ? "rgba(229,72,77,.04)" : "var(--paper)",
              }}>
                <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)" }}>{j.id}</div>
                <div className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--ink)", letterSpacing: ".06em" }}>{j.kind}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{j.source}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, letterSpacing: ".04em" }}>{j.message}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StatusDot status={j.status} />
                  <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", color: statusColor }}>{(j.status || "").toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, height: 4, background: "var(--line-soft)" }}>
                    <div style={{ width: `${j.progress}%`, height: "100%", background: statusColor, transition: "width .4s" }} />
                  </div>
                  <span className="mono tnum" style={{ fontSize: 9, color: "var(--muted)", width: 24, textAlign: "right", fontWeight: 700 }}>{j.progress}</span>
                </div>
                <div className="mono tnum" style={{ fontSize: 10, color: "var(--muted)" }}>{j.started}</div>
                <div className="mono tnum" style={{ fontSize: 10, color: "var(--muted)" }}>{j.duration}</div>
              </div>
            );
          })}
        </div>

        {/* Pipeline diagram */}
        <div className="surface" style={{ padding: 24 }}>
          <div className="lbl" style={{ marginBottom: 18 }}>SYNTHESIS PIPELINE · CANONICAL FLOW</div>
          <div style={{ display: "flex", alignItems: "center", gap: 0, justifyContent: "space-between" }}>
            {[
              ["INGEST", "PDF / image scan",          "var(--blue)"],
              ["PARSE",  "Section + stat extraction", "var(--blue)"],
              ["BIND",   "Auto-link constraints",     "var(--purple)"],
              ["SYNTH",  "BISE correlation pass",     "var(--purple)"],
              ["REFINE", "Editorial AI loop",         "var(--orange)"],
              ["SEAL",   "Cryptographic + tier",      "var(--green)"],
            ].map(([k, d, c], i, arr) => (
              <Fragment key={k}>
                <div style={{ flex: 1, textAlign: "center", padding: "0 8px" }}>
                  <div style={{
                    width: 36, height: 36, border: `1.5px solid ${c}`, color: c, margin: "0 auto 8px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "JetBrains Mono", fontWeight: 800, fontSize: 11,
                  }}>{pad2(i + 1)}</div>
                  <div className="mono" style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".16em", color: "var(--ink)" }}>{k}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{d}</div>
                </div>
                {i < arr.length - 1 && <div style={{ width: 30, height: 1, background: "var(--line)", flexShrink: 0 }} />}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function pad2(n) { return String(n).padStart(2, "0"); }
function statusToProgress(s) {
  return s === "complete" ? 100 : s === "processing" ? 64 : s === "error" ? 38 : 0;
}
