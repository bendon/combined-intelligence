// CMS Reports screen — literal port of designs/cms-screens.jsx :: ReportsScreen.
// Visual match. Data: live from reportsApi.list(); falls back to CI_DATA seed.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { reports as reportsApi } from "../../api.js";
import {
  PageHeader, Icons, TierBadge, StatusDot,
} from "../../shared.jsx";
import { CI_DATA } from "../../data.js";

export function ReportsScreen() {
  const navigate = useNavigate();
  const [api, setApi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    reportsApi.list().then(setApi).catch(() => setApi([])).finally(() => setLoading(false));
  }, []);

  // Use API data when available, fall back to seed data for the literal design.
  const source = api && api.length > 0 ? api : CI_DATA.reports;

  const reports = useMemo(
    () => source.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (q && !(r.title.toLowerCase().includes(q.toLowerCase()) || r.id.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    }),
    [source, filter, q],
  );

  const counts = useMemo(() => ({
    all:       source.length,
    published: source.filter((r) => r.status === "published").length,
    draft:     source.filter((r) => r.status === "draft").length,
    retired:   source.filter((r) => r.status === "retired").length,
  }), [source]);

  const onNew = async () => {
    const title = prompt("Report title:");
    if (!title) return;
    try {
      const r = await reportsApi.create({ title });
      navigate(`/cms/reports/${r.id}/edit`);
    } catch (e) {
      alert(e.message);
    }
  };

  const pad2 = (n) => String(n).padStart(2, "0");

  return (
    <>
      <PageHeader
        crumb={["CMS", "WORKBENCH", "REPORTS"]}
        title="Synthesis Repository"
        sub="All published, drafted, and retired intelligence vectors."
        code={`CI.REPO · ${pad2(counts.all)} ACTIVE`}
        actions={
          <button onClick={onNew} className="mono" style={{ background: "var(--ink)", color: "#fff", padding: "9px 14px", fontSize: 10, letterSpacing: ".18em", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Icons.Plus size={12} color="#fff" /> NEW SYNTHESIS
          </button>
        }
      />

      <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Filters */}
        <div className="surface" style={{ display: "flex", alignItems: "center", gap: 0, padding: 0 }}>
          <div style={{ display: "flex", borderRight: "1px solid var(--line)" }}>
            {[
              ["all", "All", pad2(counts.all)],
              ["published", "Live", pad2(counts.published)],
              ["draft", "Draft", pad2(counts.draft)],
              ["retired", "Retired", pad2(counts.retired)],
            ].map(([id, l, n]) => (
              <button key={id} onClick={() => setFilter(id)} className="mono" style={{
                padding: "12px 18px", fontSize: 10, letterSpacing: ".18em", fontWeight: 700,
                background: filter === id ? "var(--ink)" : "transparent",
                color: filter === id ? "#fff" : "var(--muted)",
                borderRight: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8,
              }}>
                {l} <span style={{ opacity: .55, fontSize: 9 }}>{n}</span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 14px", gap: 8 }}>
            <Icons.Search size={13} color="var(--muted)" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title or ID…"
              className="mono"
              style={{ background: "transparent", border: 0, outline: 0, flex: 1, fontSize: 11, letterSpacing: ".04em" }}
            />
          </div>
          <button className="mono" style={{ padding: "12px 16px", fontSize: 10, letterSpacing: ".18em", color: "var(--muted)", borderLeft: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icons.Filter size={11} /> FILTERS
          </button>
        </div>

        {/* Table */}
        <div className="surface">
          <div className="mono" style={{
            display: "grid", gridTemplateColumns: "90px 1fr 110px 80px 90px 90px 70px 110px 40px",
            fontSize: 9, letterSpacing: ".18em", color: "var(--muted)", fontWeight: 700,
            padding: "12px 18px", borderBottom: "1px solid var(--line)", background: "var(--bg)",
          }}>
            <div>VECTOR ID</div>
            <div>TITLE</div>
            <div>DOMAIN</div>
            <div>YEAR</div>
            <div>ACCESS</div>
            <div>STATUS</div>
            <div>HIT</div>
            <div>UPDATED</div>
            <div></div>
          </div>

          {loading && (
            <div className="mono" style={{ padding: 24, color: "var(--muted)", fontSize: 11, letterSpacing: ".18em", textAlign: "center" }}>
              LOADING…
            </div>
          )}

          {!loading && reports.length === 0 && (
            <div className="mono" style={{ padding: 24, color: "var(--muted)", fontSize: 11, letterSpacing: ".18em", textAlign: "center" }}>
              NO REPORTS MATCH
            </div>
          )}

          {!loading && reports.map((r, i) => {
            const rowKey = r._id || r.id;
            const isFromApi = Boolean(r._id);
            const editId = isFromApi ? r._id : r.id;
            return (
              <div
                key={rowKey}
                onClick={() => navigate(isFromApi ? `/cms/reports/${editId}/edit` : `/cms/reports/${editId}/edit`)}
                style={{
                  display: "grid", gridTemplateColumns: "90px 1fr 110px 80px 90px 90px 70px 110px 40px",
                  alignItems: "center", padding: "14px 18px",
                  borderBottom: i < reports.length - 1 ? "1px solid var(--line-soft)" : "0",
                  background: r.id === "RW-FIN-26" ? "rgba(255,92,26,.04)" : "var(--paper)",
                  cursor: "pointer",
                }}
              >
                <div className="mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--purple)", letterSpacing: ".06em" }}>{r.id}</div>
                <div>
                  <div className="serif" style={{ fontSize: 15, lineHeight: 1.2, marginBottom: 2 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>{r.subtitle || (r.hook ? r.hook.slice(0, 80) : "")}</div>
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink)", letterSpacing: ".06em" }}>{r.domain || r.tag || "—"}</div>
                <div className="mono tnum" style={{ fontSize: 11, color: "var(--muted)" }}>{r.year || "—"}</div>
                <div><TierBadge tier={r.access} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StatusDot status={r.status} />
                  <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", color: "var(--ink)" }}>{(r.status || "").toUpperCase()}</span>
                </div>
                <div className="mono tnum" style={{
                  fontSize: 11, fontWeight: 700,
                  color: r.hitRate > .75 ? "var(--green)" : r.hitRate ? "var(--ink)" : "var(--muted)",
                }}>
                  {r.hitRate ? `${Math.round(r.hitRate * 100)}%` : "—"}
                </div>
                <div className="mono tnum" style={{ fontSize: 10, color: "var(--muted)" }}>{r.date || "—"}</div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {r.id === "RW-FIN-26" && <Icons.Eye size={14} color="var(--orange)" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            ["VECTORS PUBLISHED", pad2(counts.published),                  "var(--green)",  "+1 this quarter"],
            ["IN DRAFT",          pad2(counts.draft),                       "var(--amber)",  "EAC-STBL-26 active"],
            ["HIT-RATE (12mo)",   "76%",                                    "var(--purple)", "Across 31 resolved predictions"],
            ["PIPELINE LATENCY",  "2m 41s",                                 "var(--blue)",   "p50 · synthesis → seal"],
          ].map(([l, v, c, d], i) => (
            <div key={i} className="surface" style={{ padding: 16, borderLeft: `3px solid ${c}` }}>
              <div className="lbl">{l}</div>
              <div className="serif tnum" style={{ fontSize: 28, fontWeight: 400, marginTop: 4, letterSpacing: "-.02em" }}>{v}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".06em", marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
