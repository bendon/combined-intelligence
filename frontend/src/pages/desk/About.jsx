import { ProseLayout } from "../../components/PageLayout.jsx";
import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <ProseLayout
      title="About Combined Intelligence"
      subtitle="An independent strategic analysis desk for frontier and emerging markets"
    >
      <p>
        Combined Intelligence is built on a single premise: that most analytical failures in
        frontier markets are not failures of data — they are failures of structure. Analysts
        apply economic lenses to institutional problems, financial models to behavioural phenomena,
        and sector frameworks to macro dynamics. The result is analysis that is technically
        sophisticated but practically misleading.
      </p>
      <p>
        We exist to do it differently. The <Link to="/synthesis/method">BISE framework</Link> is
        our forcing function — a structured methodology that demands all four dimensions of an
        environment be examined before conclusions are drawn. Every report we publish is organised
        around this framework, making our analysis comparable across markets and disciplines.
      </p>

      <h2>What we publish</h2>
      <p>
        We publish strategic analytical reports focused on frontier and emerging markets. Each
        report synthesises quantitative data with qualitative institutional assessment to produce
        structured intelligence: key statistics, insight headlines, cross-variable correlations,
        and forward-looking predictions.
      </p>
      <p>
        Our flagship outputs are country-level financial and economic overviews, sector deep-dives,
        and thematic analyses that cut across markets. We also publish a running prediction ledger
        — a public record of every forecast we have made and its eventual outcome.
      </p>

      <h2>AI-assisted synthesis</h2>
      <p>
        We use AI to accelerate the synthesis process, not to replace analytical judgment.
        Our system — running DeepSeek on dedicated compute — ingests source documents and extracts
        structured findings across all four BISE dimensions. A human analyst then reviews, verifies,
        and calibrates every output before publication.
      </p>
      <p>
        We are transparent about this process. The AI-generated draft is a starting point, not an
        endpoint. Every data point in a published report traces back to a primary source that a
        human has verified.
      </p>

      <h2>Independence</h2>
      <p>
        Combined Intelligence is independently funded through subscriptions. We do not accept
        advertising, sponsored content, or payments from governments, state-owned enterprises, or
        companies whose activities we analyse. Our editorial decisions are made independently of
        commercial relationships.
      </p>

      <h2>Access tiers</h2>
      <p>
        We publish across three access tiers. Free-tier content is available to all readers and
        provides the headline findings of each report. Members content provides the analytical
        depth required to evaluate strategic options. Paid content provides the full predictive
        framework, raw data exports, and direct analyst access.
      </p>
      <p>
        We believe that the core findings of strategic analysis should be publicly accessible.
        The premium tiers fund the work that makes the free tier possible.
      </p>
    </ProseLayout>
  );
}
