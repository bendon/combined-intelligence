import { ProseLayout } from "../../components/PageLayout.jsx";

const LENSES = [
  {
    letter: "B",
    name: "Behavioural",
    color: "#f97316",
    desc: "Consumer psychology, investor sentiment, social dynamics, and trust patterns that drive real economic behaviour. We examine how people actually act, not just how models assume they will.",
    questions: [
      "How do households allocate income under uncertainty?",
      "What drives investor risk appetite in this market?",
      "Are there trust deficits that impede formal sector participation?",
      "How do remittance flows shape consumption patterns?",
    ],
  },
  {
    letter: "I",
    name: "Institutional",
    color: "#6366f1",
    desc: "Regulatory frameworks, governance quality, rule of law, and the consistency of policy implementation. Institutions are the invisible infrastructure that either enables or constrains economic activity.",
    questions: [
      "How stable is the regulatory environment for foreign investors?",
      "What is the quality of contract enforcement and dispute resolution?",
      "Are policy announcements followed through?",
      "How do informal institutions interact with formal ones?",
    ],
  },
  {
    letter: "S",
    name: "Sectoral",
    color: "#10b981",
    desc: "Industry-level dynamics including competitive positioning, supply chain structure, value chain participation, and the concentration of market power across key sectors.",
    questions: [
      "Which sectors are exposed to import substitution risk?",
      "Where does domestic value add sit in the production chain?",
      "Are there sectors operating below productive capacity?",
      "What barriers protect incumbents from competitive disruption?",
    ],
  },
  {
    letter: "E",
    name: "Economic",
    color: "#3b82f6",
    desc: "Macroeconomic fundamentals: GDP composition, trade balances, monetary policy stance, inflation dynamics, capital flows, and the trajectory of key growth indicators.",
    questions: [
      "What is the quality of GDP growth — consumption or investment-led?",
      "How exposed is the current account to commodity price swings?",
      "What is the central bank's effective policy space?",
      "Are external debt levels sustainable on current growth paths?",
    ],
  },
];

export function MethodPage() {
  return (
    <ProseLayout
      title="The Method"
      subtitle="How we build structured intelligence from complex environments"
    >
      <p>
        Combined Intelligence uses the <strong>BISE framework</strong> — a four-lens analytical
        methodology developed to bring systematic rigour to environments where data is incomplete,
        institutions are evolving, and standard financial models consistently underperform.
      </p>
      <p>
        Most analytical failures in frontier markets stem not from bad data, but from analytical
        monoculture: applying economic lenses to questions that are fundamentally institutional,
        or behavioural lenses to problems that are structurally sectoral. BISE is a forcing
        function that demands all four perspectives be engaged before conclusions are drawn.
      </p>

      <h2>The Four Lenses</h2>
      {LENSES.map((lens) => (
        <div key={lens.letter} style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
            <span style={{
              fontFamily: "DM Serif Display, serif", fontSize: 36,
              color: lens.color, lineHeight: 1,
            }}>{lens.letter}</span>
            <h3 style={{ margin: 0 }}>{lens.name}</h3>
          </div>
          <p>{lens.desc}</p>
          <ul>
            {lens.questions.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </div>
      ))}

      <h2>The Synthesis Process</h2>
      <p>
        Each report begins with primary sources — central-bank publications, national statistics
        releases, regulatory filings, and trade data. A named human analyst reads these directly,
        triangulates findings across all four BISE dimensions, and writes the report: the
        statistics, the headlines, the correlations, and the predictions.
      </p>
      <p>
        Once the analyst has finished writing, the report is reviewed by a second editor who
        verifies every data point against its primary source, stress-tests the correlations, and
        calibrates prediction confidence levels against our historical ledger. The final report
        is released only after this dual-layer review is complete.
      </p>
      <p>
        Internally we use software to make the production faster — converting long-form working
        documents and PDFs into the structured web layout you read here — but the analysis itself
        is produced and signed off by human experts.
      </p>

      <h2>Predictions and the Ledger</h2>
      <p>
        Every report contains forward-looking predictions with explicit confidence levels and
        resolution dates. This is not decoration — it is accountability. We maintain a public
        ledger of every prediction we have made, its stated confidence, and its eventual outcome.
      </p>
      <p>
        Our calibration plot tracks whether our stated confidence levels accurately reflect our
        actual accuracy rates. If we say 70% confidence, we should be right 70% of the time.
        We publish this data transparently so readers can assess the reliability of our analysis
        over time.
      </p>
      <blockquote>
        "Intelligence without accountability is just opinion. The Ledger is how we hold ourselves
        to a higher standard."
      </blockquote>

      <h2>Tier Structure</h2>
      <p>
        Reports are structured around access tiers that reflect the depth of analysis required
        to act on the information. Free-tier content provides the headline findings — sufficient
        to understand the situation. Members content provides the analytical depth required to
        evaluate strategic options. Paid content provides the full predictive framework, raw
        data access, and direct analyst access for those making consequential decisions.
      </p>
    </ProseLayout>
  );
}
