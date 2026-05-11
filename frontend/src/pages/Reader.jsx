import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { reports as reportsApi } from "../api.js";
import { useAuth, LoginButton } from "../auth.jsx";
import { StyleTag, Pill, TierBadge, StatCard, GatedBlock } from "../shared.jsx";
import { GlobalNav } from "../components/GlobalNav.jsx";
import { SiteFooter } from "../components/PageLayout.jsx";

export function ReaderScreen() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetcher = user ? reportsApi.get(slug) : reportsApi.getPublic(slug);
    fetcher
      .then(setReport)
      .catch((e) => {
        if (e.status === 404) navigate("/", { replace: true });
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [slug, user]);

  if (loading) return <ReadLoading />;
  if (error)   return <div style={{ color: "#ef4444", padding: 40 }}>{error}</div>;
  if (!report) return null;

  const hasSections = report.sections?.length > 0;
  const userRole = user?.role || "free";

  return (
    <>
      <StyleTag />
      <div className="ci-root">
        <GlobalNav />
        <article className="reader-article">

          {/* ── Header ── */}
          <header className="article-header">
            <div className="article-tags">
              <Pill label={report.tag || "Report"} />
              <TierBadge tier={report.access} />
            </div>
            <h1 className="article-title">{report.title}</h1>
            {report.subtitle && <p className="article-subtitle">{report.subtitle}</p>}
            <div className="article-meta">
              <span>{report.date}</span>
              <span>·</span>
              <span>{report.read_time}</span>
              <span>·</span>
              <span>{report.author}</span>
            </div>
            {report.hook && <blockquote className="article-hook">{report.hook}</blockquote>}
          </header>

          {/* ── Key Stats ── */}
          {report.stats?.length > 0 && (
            <div className="stats-row">
              {report.stats.map((s, i) => <StatCard key={i} stat={s} />)}
            </div>
          )}

          {/* ── Structured sections (editorial PDFs) or prose fallback ── */}
          {hasSections ? (
            <div className="report-sections">
              {report.sections.map((s, i) =>
                s.__gated
                  ? <GatedSection key={i} section={s} />
                  : <SectionRenderer key={i} section={s} userRole={userRole} />
              )}
            </div>
          ) : (
            <div className="article-body">
              <BodyContent md={report.content_md} userRole={userRole} />
            </div>
          )}

          {/* ── Key Insights (headlines) ── */}
          {report.headlines?.length > 0 && (
            <section className="headlines-section">
              <h2 className="section-title">Key Insights</h2>
              <div className="headlines-list">
                {report.headlines.map((h, i) =>
                  h.__gated
                    ? <GatedBlock key={i} tier={h.tier} />
                    : <HeadlineCard key={i} h={h} />
                )}
              </div>
            </section>
          )}

          {/* ── Correlations ── */}
          {report.correlations?.length > 0 && (
            <section className="correlations-section">
              <h2 className="section-title">Signal Correlations</h2>
              <div className="correlations-list">
                {report.correlations.map((c, i) => <CorrelationRow key={i} c={c} />)}
              </div>
            </section>
          )}

          {/* ── PDF / upgrade prompt ── */}
          <div className="pdf-download">
            {report.pdf_url ? (
              <a href={report.pdf_url} target="_blank" rel="noreferrer" className="btn-primary">
                Download PDF
              </a>
            ) : user === null ? (
              <>
                <LoginButton className="btn-secondary" />
                <span className="hero-note">Sign in to unlock member content and PDF</span>
              </>
            ) : null}
          </div>

          {/* ── Back link ── */}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <Link to="/synthesis/library" style={{ fontSize: 13, color: "var(--muted)" }}>
              ← Back to library
            </Link>
          </div>
        </article>
        <SiteFooter />
      </div>
    </>
  );
}

// ── Section dispatcher ─────────────────────────────────────────────────────────

function SectionRenderer({ section, userRole }) {
  switch (section.type) {
    case "kpi_grid":          return <KpiGridSection section={section} />;
    case "correlation_matrix": return <CorrelationMatrixSection section={section} />;
    case "data_table":        return <DataTableSection section={section} />;
    case "strategic_matrix":  return <StrategicMatrixSection section={section} />;
    default:                  return <NarrativeSection section={section} userRole={userRole} />;
  }
}

function GatedSection({ section }) {
  return (
    <div className="report-section report-section--gated">
      <div className="rs-part-label">Part {section.part}</div>
      <h3 className="rs-title">{section.title}</h3>
      <GatedBlock tier={section.tier} />
    </div>
  );
}

// ── Section types ──────────────────────────────────────────────────────────────

function NarrativeSection({ section, userRole }) {
  return (
    <div className={`report-section report-section--narrative tier-border-${section.tier || "free"}`}>
      <div className="rs-part-label">Part {section.part}</div>
      <h2 className="rs-title">{section.title}</h2>
      <div className="article-body">
        <BodyContent md={section.content} userRole={userRole} />
      </div>
    </div>
  );
}

function KpiGridSection({ section }) {
  const items = section.data || [];
  return (
    <div className="report-section report-section--kpi">
      <div className="rs-part-label">Part {section.part}</div>
      <h2 className="rs-title">{section.title}</h2>
      {section.content && <p className="rs-desc">{section.content}</p>}
      <div className="rs-kpi-grid">
        {items.map((item, i) => (
          <div key={i} className="rs-kpi-card">
            <div className="rs-kpi-label">{item.label}</div>
            <div className="rs-kpi-value">{item.value}</div>
            {item.change && (
              <div className={`rs-kpi-change ${item.change.startsWith("+") ? "pos" : "neg"}`}>
                {item.change}
              </div>
            )}
            {item.desc && <div className="rs-kpi-desc">{item.desc}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CorrelationMatrixSection({ section }) {
  const items = section.data || [];
  return (
    <div className="report-section report-section--correlation">
      <div className="rs-part-label">Part {section.part}</div>
      <h2 className="rs-title">{section.title}</h2>
      {section.content && <p className="rs-desc">{section.content}</p>}
      <div className="rs-corr-list">
        {items.map((item, i) => (
          <div key={i} className="rs-corr-row">
            <div className="rs-corr-pair">
              <span className="rs-corr-a">{item.a}</span>
              <span className="rs-corr-arrow">{item.sign === "positive" ? "↑↑" : item.sign === "negative" ? "↑↓" : "↔"}</span>
              <span className="rs-corr-b">{item.b}</span>
            </div>
            <div className="rs-corr-bar-wrap">
              <div
                className={`rs-corr-bar ${item.sign}`}
                style={{ width: `${Math.abs(item.r || 0) * 100}%` }}
              />
              <span className="rs-corr-r">r={typeof item.r === "number" ? item.r.toFixed(2) : item.r}</span>
            </div>
            {item.insight && <div className="rs-corr-insight">{item.insight}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTableSection({ section }) {
  const { columns = [], rows = [] } = section.data || {};
  return (
    <div className="report-section report-section--table">
      <div className="rs-part-label">Part {section.part}</div>
      <h2 className="rs-title">{section.title}</h2>
      {section.content && <p className="rs-desc">{section.content}</p>}
      <div className="rs-table-wrap">
        <table className="data-table">
          <thead>
            <tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => <td key={j}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StrategicMatrixSection({ section }) {
  const { axes = {}, cells = [] } = section.data || {};
  return (
    <div className="report-section report-section--matrix">
      <div className="rs-part-label">Part {section.part}</div>
      <h2 className="rs-title">{section.title}</h2>
      {section.content && <p className="rs-desc">{section.content}</p>}
      <div className="rs-matrix-wrap">
        <div className="rs-matrix-y-label">{axes.y_label}</div>
        <div className="rs-matrix-chart">
          {cells.map((cell, i) => (
            <div
              key={i}
              className="rs-matrix-cell"
              style={{
                left: `${(cell.x || 0) * 100}%`,
                bottom: `${(cell.y || 0) * 100}%`,
              }}
              title={cell.desc || cell.name}
            >
              <span className="rs-matrix-dot" />
              <span className="rs-matrix-cell-label">{cell.name}</span>
            </div>
          ))}
          <div className="rs-matrix-x-axis" />
          <div className="rs-matrix-y-axis" />
        </div>
        <div className="rs-matrix-x-label">{axes.x_label}</div>
      </div>
      {/* Card list below chart for mobile and detail */}
      <div className="rs-matrix-cards">
        {cells.map((cell, i) => (
          <div key={i} className="rs-matrix-card">
            <div className="rs-matrix-card-name">{cell.name}</div>
            {cell.desc && <div className="rs-matrix-card-desc">{cell.desc}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Prose content (for narrative sections and content_md fallback) ─────────────

function BodyContent({ md, userRole }) {
  if (!md) return null;
  const parts = md.split(/(:::(?:members|paid)\n[\s\S]*?:::)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^:::(members|paid)\n([\s\S]*?):::$/);
        if (m) {
          const tier = m[1];
          const content = m[2];
          const allowed = userRole === "paid" || (userRole === "members" && tier === "members");
          return allowed
            ? <div key={i} className={`tier-block tier-${tier}`} dangerouslySetInnerHTML={{ __html: simpleMd(content) }} />
            : <GatedBlock key={i} tier={tier} />;
        }
        return <div key={i} dangerouslySetInnerHTML={{ __html: simpleMd(part) }} />;
      })}
    </>
  );
}

function simpleMd(text) {
  return text
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>").replace(/$/, "</p>");
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function HeadlineCard({ h }) {
  return (
    <div className="headline-card">
      <div className="headline-n">{h.n}</div>
      <div className="headline-body">
        <div className="headline-title">{h.title}</div>
        <div className="headline-text">{h.body}</div>
      </div>
      <TierBadge tier={h.tier} />
    </div>
  );
}

function CorrelationRow({ c }) {
  const sign = c.sign || "neutral";
  return (
    <div className="rs-corr-row">
      <div className="rs-corr-pair">
        <span className="rs-corr-a">{c.a}</span>
        <span className="rs-corr-arrow">{sign === "positive" ? "↑↑" : sign === "negative" ? "↑↓" : "↔"}</span>
        <span className="rs-corr-b">{c.b}</span>
      </div>
      <div className="rs-corr-bar-wrap">
        <div
          className={`rs-corr-bar ${sign}`}
          style={{ width: `${Math.abs(c.r || 0) * 100}%` }}
        />
        <span className="rs-corr-r">r={typeof c.r === "number" ? c.r.toFixed(2) : c.r}</span>
      </div>
      {c.insight && <div className="rs-corr-insight">{c.insight}</div>}
    </div>
  );
}

function ReadLoading() {
  return (
    <>
      <StyleTag />
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0d0d14", color: "#6b7280", fontFamily: "Inter, sans-serif",
      }}>
        Loading report…
      </div>
    </>
  );
}
