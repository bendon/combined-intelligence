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

      <h2>Expert-led synthesis</h2>
      <p>
        Combined Intelligence is a human-curated reporting engine. Our analysts read the
        underlying documents — central-bank publications, statistics releases, regulatory
        filings, sectoral surveys — and write every published claim, headline, and prediction
        themselves. Each report is signed off by a named human author before it is sealed to
        the ledger.
      </p>
      <p>
        We use software to take what an expert has already produced — typically a PDF or a
        long-form working document — and turn it into a structured, web-native report that
        readers around the world can access from a phone, a desk, or a low-bandwidth
        connection. The analysis is human; the distribution surface is engineered.
      </p>
      <p>
        Every data point in a published report traces back to a primary source that a human
        analyst has read and verified.
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
