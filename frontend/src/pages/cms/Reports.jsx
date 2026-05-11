import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { reports as reportsApi } from "../../api.js";
import { TierBadge, StatusDot, Pill } from "../../shared.jsx";

export function ReportsScreen() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () =>
    reportsApi.list().then(setList).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const title = prompt("Report title:");
    if (!title) return;
    try {
      const r = await reportsApi.create({ title });
      navigate(`/cms/reports/${r.id}/edit`);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await reportsApi.delete(id);
    setList((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="cms-page">
      <div className="cms-page-header">
        <h1 className="cms-page-title">Reports</h1>
        <button onClick={handleCreate} className="btn-primary btn-sm">+ New report</button>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : list.length === 0 ? (
        <p className="empty-state">No reports yet.</p>
      ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Tag</th>
              <th>Access</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to={`/cms/reports/${r.id}/edit`} className="table-link">
                    {r.title}
                  </Link>
                </td>
                <td><Pill label={r.tag} /></td>
                <td><TierBadge tier={r.access} /></td>
                <td><StatusDot status={r.status} /> {r.status}</td>
                <td>{r.date}</td>
                <td className="table-actions">
                  <Link to={`/reports/${r.slug}`} className="btn-ghost btn-xs" target="_blank">
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(r.id, r.title)}
                    className="btn-danger btn-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
