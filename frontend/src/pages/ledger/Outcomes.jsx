import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "../../components/PageLayout.jsx";
import { predictions as predictionsApi } from "../../api.js";

export function OutcomesPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    predictionsApi.stats().then(setStats).finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <div className="section-page">
        <div className="section-page-header">
          <h1 className="section-page-title">Outcomes</h1>
          <p className="section-page-sub">
            Aggregate statistics on our prediction track record across all published reports.
          </p>
        </div>

        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : !stats || stats.total === 0 ? (
          <p className="empty-state">No predictions recorded yet.</p>
        ) : (
          <>
            <div className="kpi-row">
              <KPI value={stats.total}   label="Total predictions" />
              <KPI value={stats.pending} label="Open / pending" />
              <KPI value={stats.resolved} label="Resolved" />
              <KPI
                value={stats.hit_rate != null ? `${Math.round(stats.hit_rate * 100)}%` : "—"}
                label="Hit rate"
                highlight
              />
              <KPI value={stats.correct}  label="Correct" color="var(--green)" />
              <KPI value={stats.partial}  label="Partial" color="var(--accent)" />
              <KPI value={stats.wrong}    label="Wrong"   color="var(--red)" />
            </div>

            <HitRateBar stats={stats} />

            <div style={{ marginTop: 40 }}>
              <h2 style={{ fontFamily: "DM Serif Display, serif", fontSize: 22, marginBottom: 16 }}>
                Understand the numbers
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(240px,100%), 1fr))", gap: 16 }}>
                <InfoCard
                  title="How hit rate is calculated"
                  body="Correct outcomes score 1.0. Partial outcomes score 0.5. Wrong outcomes score 0. Hit rate = (correct + 0.5×partial) / resolved."
                />
                <InfoCard
                  title="What counts as resolved"
                  body="A prediction is resolved when its target date passes and an analyst reviews the outcome against primary sources. Resolution may be delayed if data is unavailable."
                />
                <InfoCard
                  title="Confidence levels"
                  body="Confidence is expressed as a probability (0–1) representing the analyst's degree of belief at the time of publication. See the Calibration Plot to assess accuracy vs. stated confidence."
                />
                <InfoCard
                  title="Partial outcomes"
                  body={`A "partial" outcome means the direction of the prediction was correct but the magnitude, timing, or specific condition was not fully met. We err toward strictness in resolving claims.`}
                />
              </div>
            </div>

            <div style={{ marginTop: 32, fontSize: 13, color: "var(--muted)" }}>
              View the full prediction history in{" "}
              <Link to="/ledger/resolved" style={{ color: "var(--accent)" }}>Resolved Claims</Link>{" "}
              or track current forecasts in{" "}
              <Link to="/ledger/open" style={{ color: "var(--accent)" }}>Open Predictions</Link>.
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}

function KPI({ value, label, highlight, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-value" style={{ color: color || (highlight ? "var(--accent)" : "var(--text)") }}>
        {value ?? "—"}
      </div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

function HitRateBar({ stats }) {
  const { correct, partial, wrong, resolved } = stats;
  if (!resolved) return null;
  const pct = (v) => `${Math.round((v / resolved) * 100)}%`;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
        Outcome distribution across {resolved} resolved predictions
      </div>
      <div style={{
        display: "flex", height: 14, borderRadius: 7, overflow: "hidden",
        background: "var(--surface)",
      }}>
        <div style={{ width: pct(correct), background: "var(--green)" }} title={`Correct: ${correct}`} />
        <div style={{ width: pct(partial), background: "var(--accent)" }} title={`Partial: ${partial}`} />
        <div style={{ width: pct(wrong),   background: "var(--red)" }}   title={`Wrong: ${wrong}`} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
        <span style={{ color: "var(--green)" }}>● Correct {pct(correct)}</span>
        <span style={{ color: "var(--accent)" }}>● Partial {pct(partial)}</span>
        <span style={{ color: "var(--red)" }}>● Wrong {pct(wrong)}</span>
      </div>
    </div>
  );
}

function InfoCard({ title, body }) {
  return (
    <div style={{
      background: "var(--carbon)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "18px 20px",
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}
