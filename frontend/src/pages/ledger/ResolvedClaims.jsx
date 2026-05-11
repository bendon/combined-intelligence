import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout.jsx";
import { predictions as predictionsApi } from "../../api.js";

export function ResolvedClaimsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | true | false | partial

  useEffect(() => {
    predictionsApi.list({ status: "resolved", limit: 200 })
      .then(setList)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? list : list.filter((p) => p.outcome === filter);

  return (
    <PageLayout>
      <div className="section-page">
        <div className="section-page-header">
          <h1 className="section-page-title">Resolved Claims</h1>
          <p className="section-page-sub">
            Every prediction we have made with a known outcome, published transparently.
          </p>
        </div>

        <div className="filter-bar" style={{ marginBottom: 24 }}>
          <div className="filter-pills">
            {["all", "true", "partial", "false"].map((v) => (
              <button
                key={v}
                className={`filter-pill ${filter === v ? "active" : ""}`}
                onClick={() => setFilter(v)}
              >
                {v === "all" ? "All outcomes" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="empty-state">
            {list.length === 0
              ? "No resolved predictions yet."
              : "No predictions match this filter."}
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              {filtered.length} resolved claim{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="table-scroll">
              <table className="pred-table">
                <thead>
                  <tr>
                    <th style={{ width: "40%" }}>Statement</th>
                    <th className="hide-mobile">Report</th>
                    <th>Outcome</th>
                    <th>Confidence</th>
                    <th className="hide-mobile">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id || i}>
                      <td><div className="pred-statement">{p.statement}</div></td>
                      <td className="hide-mobile">
                        <Link to={`/reports/${p.report_slug}`} className="pred-report-link">
                          {p.report_title}
                        </Link>
                      </td>
                      <td>
                        <span className={`outcome-badge ${p.outcome || "pending"}`}>
                          {p.outcome || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="pred-conf">
                          {p.confidence != null ? `${Math.round(p.confidence * 100)}%` : "—"}
                        </span>
                      </td>
                      <td className="hide-mobile">
                        <span className="pred-target">{p.target}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
