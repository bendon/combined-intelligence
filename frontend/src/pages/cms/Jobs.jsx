import { useEffect, useState } from "react";
import { jobs as jobsApi } from "../../api.js";
import { StatusDot } from "../../shared.jsx";

export function JobsScreen() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => jobsApi.list().then(setList).finally(() => setLoading(false));
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="cms-page">
      <div className="cms-page-header">
        <h1 className="cms-page-title">Synthesis Jobs</h1>
        <span className="cms-note">Auto-refreshes every 5 s</span>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : list.length === 0 ? (
        <p className="empty-state">No jobs yet.</p>
      ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Status</th>
              <th>Started</th>
              <th>Updated</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {list.map((j) => (
              <tr key={j._id}>
                <td><code>{j.report_id}</code></td>
                <td><StatusDot status={j.status} /> {j.status}</td>
                <td>{fmt(j.created_at)}</td>
                <td>{fmt(j.updated_at)}</td>
                <td className="error-cell">{j.error || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}
