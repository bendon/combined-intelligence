import { ProseLayout } from "../../components/PageLayout.jsx";

export function MethodologyPage() {
  return (
    <ProseLayout
      title="Methodology"
      subtitle="Technical note on the BISE framework, synthesis process, and prediction scoring"
    >
      <p>
        This document describes in technical terms how Combined Intelligence research is produced,
        structured, and assessed for accuracy over time.
      </p>

      <h2>The BISE Framework</h2>
      <p>
        BISE is a four-dimensional analytical framework. Each dimension examines a distinct
        class of variables that influence economic and strategic outcomes:
      </p>
      <ul>
        <li>
          <strong>Behavioural (B):</strong> Consumer sentiment, investor risk appetite, remittance
          behaviour, household savings rates, trust in institutions, and other psychological and
          social variables that drive real-economy outcomes.
        </li>
        <li>
          <strong>Institutional (I):</strong> Regulatory quality (World Bank CPIA scores, Ease of
          Doing Business indicators), rule of law indices, political stability indices, government
          effectiveness ratings, and policy consistency assessments.
        </li>
        <li>
          <strong>Sectoral (S):</strong> Industry value-add as a share of GDP, export concentration
          indices (Herfindahl-Hirschman), supply chain exposure, sectoral productivity differentials,
          and formal/informal sector split.
        </li>
        <li>
          <strong>Economic (E):</strong> GDP growth decomposition, current account balance,
          inflation (headline and core), monetary policy rate, FDI net flows, public debt-to-GDP,
          and foreign exchange reserves (months of import cover).
        </li>
      </ul>

      <h2>Document ingestion and synthesis</h2>
      <p>
        Source documents (PDF reports, statistical releases) are ingested using PDFPlumber for
        text extraction. Text is split into 500-word chunks with 50-word overlap and embedded
        using the <code>nomic-embed-text</code> model (768-dimensional vectors) stored in Qdrant.
      </p>
      <p>
        Synthesis is performed by DeepSeek-R1-8B running on a dedicated GPU instance. The model
        receives the full document text (truncated to 12,000 words where necessary) and is
        prompted to produce a structured JSON output containing stats, headlines, correlations,
        predictions, hook, and subtitle.
      </p>
      <p>
        Temperature is set to 0.2 to minimise hallucination. The output is then reviewed by a
        human analyst before publication. See our <a href="/desk/editorial-standards">editorial
        standards</a> for the review process.
      </p>

      <h2>Prediction scoring</h2>
      <p>
        Each prediction is scored as follows upon resolution:
      </p>
      <ul>
        <li><strong>True (1.0):</strong> The stated condition was met on or before the target date, as verified against primary sources.</li>
        <li><strong>Partial (0.5):</strong> The direction was correct but the magnitude, timing, or specific condition was not fully met.</li>
        <li><strong>False (0.0):</strong> The stated condition was not met, or the opposite occurred.</li>
      </ul>

      <h2>Calibration methodology</h2>
      <p>
        We assess calibration by grouping resolved predictions into five equal-width confidence
        buckets (0–20%, 20–40%, 40–60%, 60–80%, 80–100%) and calculating the observed frequency
        of correct outcomes within each bucket. Partial outcomes contribute 0.5 to the numerator.
      </p>
      <p>
        A perfectly calibrated forecaster would show observed frequencies matching the midpoint
        of each bucket (10%, 30%, 50%, 70%, 90%). Our calibration plot visualises the deviation
        from perfect calibration and we report mean absolute deviation (MAD) as a scalar calibration
        quality metric.
      </p>
      <p>
        MAD &lt; 8 percentage points: well-calibrated. MAD 8–18pp: slightly miscalibrated.
        MAD &gt; 18pp: significantly miscalibrated.
      </p>

      <h2>Limitations</h2>
      <p>
        The synthesis system can misattribute figures or extract erroneous correlations, particularly
        where source documents contain complex tables or mixed-currency data. Human review is
        designed to catch these errors but may not catch all of them. Where errors are found after
        publication, we correct and disclose per our corrections policy.
      </p>
      <p>
        The calibration framework requires a minimum of 10 resolved predictions per bucket to produce
        statistically meaningful estimates. With small samples, reported calibration metrics should
        be interpreted with appropriate caution.
      </p>
    </ProseLayout>
  );
}
