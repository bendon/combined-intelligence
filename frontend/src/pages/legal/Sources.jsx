import { ProseLayout } from "../../components/PageLayout.jsx";

const SOURCES = [
  {
    category: "Macroeconomic data",
    items: [
      { name: "IMF World Economic Outlook (WEO)", url: "https://imf.org/en/Publications/WEO", freq: "Biannual" },
      { name: "IMF International Financial Statistics (IFS)", url: "https://data.imf.org", freq: "Monthly" },
      { name: "World Bank Open Data", url: "https://data.worldbank.org", freq: "Annual" },
      { name: "World Bank World Development Indicators", url: "https://datatopics.worldbank.org/world-development-indicators", freq: "Annual" },
    ],
  },
  {
    category: "Trade and investment",
    items: [
      { name: "UN Comtrade Database", url: "https://comtradeplus.un.org", freq: "Monthly" },
      { name: "UNCTAD World Investment Report", url: "https://unctad.org/wir", freq: "Annual" },
      { name: "WTO Statistics Database", url: "https://stats.wto.org", freq: "Quarterly" },
    ],
  },
  {
    category: "Institutional and governance",
    items: [
      { name: "World Bank Country Policy and Institutional Assessment (CPIA)", url: "https://databank.worldbank.org/source/country-policy-and-institutional-assessment", freq: "Annual" },
      { name: "Mo Ibrahim Foundation Index of African Governance (IIAG)", url: "https://mo.ibrahim.foundation/iiag", freq: "Annual" },
      { name: "Transparency International Corruption Perceptions Index", url: "https://transparency.org/en/cpi", freq: "Annual" },
      { name: "Fraser Institute Economic Freedom of the World", url: "https://fraserinstitute.org/economic-freedom", freq: "Annual" },
    ],
  },
  {
    category: "Regional and country-specific",
    items: [
      { name: "African Development Bank Statistics", url: "https://dataportal.opendataforafrica.org", freq: "Varies" },
      { name: "National central bank publications", url: null, freq: "Monthly/Quarterly" },
      { name: "National statistics offices (NSO) — country-specific", url: null, freq: "Varies" },
      { name: "East African Community Statistics", url: "https://statistics.eac.int", freq: "Annual" },
    ],
  },
  {
    category: "Financial markets",
    items: [
      { name: "Bloomberg Terminal (subscription)", url: null, freq: "Real-time" },
      { name: "Exchange filings — country securities exchanges", url: null, freq: "Per filing" },
      { name: "BIS Locational Banking Statistics", url: "https://stats.bis.org", freq: "Quarterly" },
    ],
  },
];

export function SourcesPage() {
  return (
    <ProseLayout
      title="Sources"
      subtitle="Primary data sources used in Combined Intelligence reports"
    >
      <p>
        We use only primary sources as the authoritative reference for quantitative claims.
        The following are the principal databases and publications we draw from. Country-specific
        reports may supplement these with national-level sources, which are cited within each
        report.
      </p>

      {SOURCES.map((group) => (
        <div key={group.category}>
          <h2>{group.category}</h2>
          <ul>
            {group.items.map((s) => (
              <li key={s.name}>
                {s.url
                  ? <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
                  : s.name}{" "}
                <span style={{ color: "var(--muted)", fontSize: "0.85em" }}>— {s.freq}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h2>Source reliability assessment</h2>
      <p>
        Not all sources are equal. We apply the following reliability hierarchy when multiple
        sources provide conflicting figures:
      </p>
      <ol>
        <li><strong>Primary official sources</strong> — national statistics offices, central banks, regulatory bodies</li>
        <li><strong>International organisations</strong> — IMF, World Bank, UN agencies (which apply standardised methodologies)</li>
        <li><strong>Development finance institutions</strong> — AfDB, IFC (regional coverage, project-level data)</li>
        <li><strong>Academic and research institutions</strong> — peer-reviewed datasets</li>
      </ol>
      <p>
        Where significant discrepancies exist between official national data and international
        estimates, we note both figures and the likely source of divergence. We do not silently
        prefer one over the other.
      </p>

      <h2>Data vintage</h2>
      <p>
        Each report states the data vintage — the date through which data was current at time
        of publication. We do not retroactively update historical reports to reflect later data
        releases; instead, updated analysis is published as a new report.
      </p>
    </ProseLayout>
  );
}
