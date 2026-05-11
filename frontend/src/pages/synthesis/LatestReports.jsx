import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout.jsx";
import { reports as reportsApi } from "../../api.js";
import { Pill, TierBadge, StatusDot } from "../../shared.jsx";

export function LatestReportsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PER_PAGE = 12;

  const load = async (skip = 0) => {
    setLoading(true);
    try {
      const batch = await reportsApi.listPublic({ limit: PER_PAGE + 1, skip });
      const more = batch.length > PER_PAGE;
      setList((prev) => skip === 0 ? batch.slice(0, PER_PAGE) : [...prev, ...batch.slice(0, PER_PAGE)]);
      setHasMore(more);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(0); }, []);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next * PER_PAGE);
  };

  return (
    <PageLayout>
      <div className="section-page">
        <div className="section-page-header">
          <h1 className="section-page-title">Latest Reports</h1>
          <p className="section-page-sub">
            Our most recently published strategic analysis, ordered chronologically.
          </p>
        </div>

        {loading && list.length === 0 ? (
          <p className="empty-state">Loading reports…</p>
        ) : list.length === 0 ? (
          <p className="empty-state">No reports published yet.</p>
        ) : (
          <>
            <div className="reports-grid">
              {list.map((r) => <ReportCard key={r.id} report={r} />)}
            </div>
            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 40 }}>
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-secondary"
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}

function ReportCard({ report }) {
  return (
    <Link to={`/reports/${report.slug}`} className="report-card">
      <div className="rc-meta">
        <Pill label={report.tag || "Report"} />
        <TierBadge tier={report.access} />
      </div>
      <h3 className="rc-title">{report.title}</h3>
      {report.subtitle && <p className="rc-sub">{report.subtitle}</p>}
      <div className="rc-footer">
        <span className="rc-date">{report.date}</span>
        <span className="rc-read">{report.read_time}</span>
      </div>
    </Link>
  );
}
