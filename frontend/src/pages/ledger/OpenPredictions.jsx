import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout.jsx";
import { predictions as predictionsApi } from "../../api.js";

export function OpenPredictionsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    predictionsApi.list({ status: "pending", limit: 100 })
      .then(setList)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <div className="section-page">
        <div className="section-page-header">
          <h1 className="section-page-title">Open Predictions</h1>
          <p className="section-page-sub">
            Forecasts currently under observation. Each will be resolved on or after its target date.
          </p>
        </div>

        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : list.length === 0 ? (
          <p className="empty-state">No open predictions yet. They appear as reports are published.</p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              {list.length} active prediction{list.length !== 1 ? "s" : ""}
            </p>
            <div className="table-scroll">
              <table className="pred-table">
                <thead>
                  <tr>
                    <th style={{ width: "42%" }}>Statement</th>
                    <th className="hide-mobile">Report</th>
                    <th>Target date</th>
                    <th>Confidence</th>
                    <th className="hide-mobile">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p, i) => (
                    <tr key={p.id || i}>
                      <td><div className="pred-statement">{p.statement}</div></td>
                      <td className="hide-mobile">
                        <Link to={`/reports/${p.report_slug}`} className="pred-report-link">
                          {p.report_title}
                        </Link>
                      </td>
                      <td><span className="pred-target">{p.target}</span></td>
                      <td>
                        <span className="pred-conf">
                          {p.confidence != null ? `${Math.round(p.confidence * 100)}%` : "—"}
                        </span>
                      </td>
                      <td className="hide-mobile">
                        <span className={`tier-badge ${p.tier}`}>{p.tier}</span>
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
