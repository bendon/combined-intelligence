import { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout.jsx";
import { predictions as predictionsApi } from "../../api.js";

export function CalibrationPlotPage() {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    predictionsApi.calibration().then(setBuckets).finally(() => setLoading(false));
  }, []);

  const hasData = buckets.some((b) => b.n > 0);

  return (
    <PageLayout>
      <div className="section-page">
        <div className="section-page-header">
          <h1 className="section-page-title">Calibration Plot</h1>
          <p className="section-page-sub">
            For predictions made at a given confidence level, what fraction actually came true?
            A well-calibrated forecaster's bars should match the reference line.
          </p>
        </div>

        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : !hasData ? (
          <p className="empty-state">
            No resolved predictions yet. The calibration plot will populate as claims are resolved.
          </p>
        ) : (
          <>
            <CalChart buckets={buckets} />
            <CalNote buckets={buckets} />
          </>
        )}
      </div>
    </PageLayout>
  );
}

function CalChart({ buckets }) {
  return (
    <div className="cal-chart-wrap">
      <div className="cal-chart-title">
        Confidence stated vs. frequency correct — bars show actual hit rate, shading shows expected
      </div>
      {buckets.map((b) => {
        const expected = b.predicted;   // 0–1
        const actual   = b.actual;      // 0–1 or null
        return (
          <div key={b.label} className="cal-bucket-row">
            <div className="cal-bucket-label">{b.label}</div>
            <div className="cal-bucket-bar-wrap">
              {/* Expected band */}
              <div
                className="cal-bucket-bar-expected"
                style={{ width: `${expected * 100}%` }}
              />
              {/* Actual bar */}
              {actual != null && (
                <div
                  className="cal-bucket-bar-actual"
                  style={{ width: `${actual * 100}%`, opacity: 0.85 }}
                />
              )}
              {/* Diagonal reference tick */}
              <div style={{
                position: "absolute",
                left: `${expected * 100}%`,
                top: 0, bottom: 0,
                width: 2,
                background: "rgba(255,255,255,.2)",
              }} />
            </div>
            <div className="cal-bucket-n">
              {b.n === 0
                ? "0 predictions"
                : actual != null
                  ? `${Math.round(actual * 100)}% / ${b.n}`
                  : `${b.n} pending`}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginTop: 20, fontSize: 12, color: "var(--muted)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 16, height: 10, background: "rgba(99,102,241,.3)", borderRadius: 2 }} />
          Expected (stated confidence)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 16, height: 10, background: "var(--accent)", borderRadius: 2, opacity: .85 }} />
          Actual (observed frequency)
        </div>
      </div>
    </div>
  );
}

function CalNote({ buckets }) {
  const withData = buckets.filter((b) => b.n > 0 && b.actual != null);
  if (withData.length === 0) return null;

  // Simple calibration score: mean absolute deviation from perfect calibration
  const mad = withData.reduce((sum, b) => sum + Math.abs(b.actual - b.predicted), 0) / withData.length;
  const quality = mad < 0.08 ? "well-calibrated" : mad < 0.18 ? "slightly miscalibrated" : "significantly miscalibrated";

  return (
    <div style={{
      background: "var(--carbon)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "20px 24px",
    }}>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Calibration assessment</div>
      <div style={{ fontSize: 16, color: "var(--text)", fontWeight: 500 }}>
        Our predictions are currently <strong style={{ color: mad < 0.08 ? "var(--green)" : "var(--accent)" }}>
          {quality}
        </strong>.
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
        Mean absolute deviation from perfect calibration: {(mad * 100).toFixed(1)} percentage points
        across {withData.length} resolved bucket{withData.length !== 1 ? "s" : ""}.
      </div>
    </div>
  );
}
