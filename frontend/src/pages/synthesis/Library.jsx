import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout.jsx";
import { reports as reportsApi } from "../../api.js";
import { Pill, TierBadge } from "../../shared.jsx";

const TIERS = ["all", "free", "members", "paid"];

export function LibraryPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");
  const [domain, setDomain] = useState("all");
  const [year, setYear] = useState("all");

  useEffect(() => {
    reportsApi.listPublic({ limit: 100 }).then(setAll).finally(() => setLoading(false));
  }, []);

  const domains = useMemo(() => {
    const set = new Set(all.map((r) => r.domain).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [all]);

  const years = useMemo(() => {
    const set = new Set(all.map((r) => r.year).filter(Boolean));
    return ["all", ...Array.from(set).sort().reverse()];
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return all.filter((r) => {
      if (tier !== "all" && r.access !== tier) return false;
      if (domain !== "all" && r.domain !== domain) return false;
      if (year !== "all" && r.year !== year) return false;
      if (q && !r.title.toLowerCase().includes(q) &&
          !(r.subtitle || "").toLowerCase().includes(q) &&
          !(r.tag || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, query, tier, domain, year]);

  return (
    <PageLayout>
      <div className="section-page">
        <div className="section-page-header">
          <h1 className="section-page-title">The Library</h1>
          <p className="section-page-sub">
            Complete archive of published reports. Filter by tier, domain, or year.
          </p>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <input
            className="filter-input"
            placeholder="Search reports…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="filter-pills">
            {TIERS.map((t) => (
              <button
                key={t}
                className={`filter-pill ${tier === t ? "active" : ""}`}
                onClick={() => setTier(t)}
              >
                {t === "all" ? "All tiers" : t}
              </button>
            ))}
          </div>
          {domains.length > 2 && (
            <select
              className="field-select"
              style={{ width: "auto" }}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            >
              {domains.map((d) => (
                <option key={d} value={d}>{d === "all" ? "All domains" : d}</option>
              ))}
            </select>
          )}
          {years.length > 2 && (
            <select
              className="field-select"
              style={{ width: "auto" }}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y === "all" ? "All years" : y}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">No reports match the current filters.</p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
              {filtered.length} report{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="library-list">
              {filtered.map((r) => <LibraryRow key={r.id} report={r} />)}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}

function LibraryRow({ report }) {
  return (
    <Link to={`/reports/${report.slug}`} className="library-row">
      <div className="library-row-left">
        <div className="library-row-title">{report.title}</div>
        {report.subtitle && <div className="library-row-sub">{report.subtitle}</div>}
        <div className="library-row-meta">
          {report.domain && <span>{report.domain}</span>}
          {report.domain && report.year && <span>·</span>}
          {report.year && <span>{report.year}</span>}
        </div>
      </div>
      <div className="library-row-right">
        <Pill label={report.tag || "Report"} />
        <TierBadge tier={report.access} />
        <span className="library-row-date">{report.date}</span>
        <span className="library-row-read">{report.read_time}</span>
      </div>
    </Link>
  );
}
