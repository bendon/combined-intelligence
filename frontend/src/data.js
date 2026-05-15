// Seed data — literal port of designs/data.js to an ES module.
// Real seed data extracted from "Rwanda's Financial Overview" CI Report
// plus a few synthetic siblings to populate the Reports list.
// Used as fallback when the API has no published reports yet.

export const CI_DATA = {
  user: {
    email: "bendonmurgor@gmail.com",
    role: "super_admin",
    label: "Super Administrator",
  },

  // Master Variables — the BISE framework + supporting constraints
  constraints: [
    { id: "C-B01", code: "B-01", name: "Mobile-money penetration", domain: "Behavioural", description: "% of adults transacting on a wallet at least monthly. Drives FX-velocity, female labour-force participation, SME formalisation.", linkedReports: 3, lastObs: "86% (2025)" },
    { id: "C-B02", code: "B-02", name: "Savings-group membership", domain: "Behavioural", description: "% of adults in ibimina / VSLAs. Indicator of credit-readiness floor.", linkedReports: 2, lastObs: "52% (2024)" },
    { id: "C-I01", code: "I-01", name: "Banking concentration (top-3 share)", domain: "Institutional", description: "Combined gross-loan share of top-3 banks. Measures sector consolidation pressure.", linkedReports: 4, lastObs: "63.6% (Q1 2026)" },
    { id: "C-I02", code: "I-02", name: "Cost-to-income ratio (sector mean)", domain: "Institutional", description: "Weighted CIR across 11 commercial banks. Each 10pp digital-channel shift cuts CIR ~3.5pp.", linkedReports: 2, lastObs: "54.2%" },
    { id: "C-S01", code: "S-01", name: "Credit-to-GDP by sector", domain: "Sectoral", description: "Loan book composition vs sectoral GDP contribution. Reveals under/over-banked sectors.", linkedReports: 3, lastObs: "Agri 4% / GDP 24%" },
    { id: "C-E01", code: "E-01", name: "Real GDP growth", domain: "Economic", description: "YoY real GDP, NISR-rebased 2024. Five-year compounded acceleration.", linkedReports: 5, lastObs: "9.4% (2025), Q3 11.8%" },
    { id: "C-E02", code: "E-02", name: "Diaspora remittances (USD)", domain: "Economic", description: "Inbound remittance flow. 4× growth 2014→2024. Concentrated in 5 Kigali sectors.", linkedReports: 2, lastObs: "$502M (2024)" },
    { id: "C-E03", code: "E-03", name: "Public debt / GDP", domain: "Economic", description: "Headline ratio. Approaching 80% — fiscal headroom constraint.", linkedReports: 1, lastObs: "78.4%" },
    { id: "C-X01", code: "X-01", name: "Cyber-incident frequency", domain: "Cross-cutting", description: "Reported financial-sector cyber events per quarter. Leads digital-banking growth by 12-18mo.", linkedReports: 2, lastObs: "+41% YoY" },
  ],

  reports: [
    {
      id: "RW-FIN-26",
      slug: "rwanda-financial-overview-2026",
      title: "Rwanda's Financial Overview",
      subtitle: "Singapore of Africa, ahead of schedule.",
      hook: "A correlation-driven analysis of 11 banks, 5 provinces, the 86% mobile-money revolution, the Fintech Strategy 2024–2029, and the structural shifts that will define Rwandan finance through Vision 2050.",
      tag: "Strategic Sector",
      domain: "Africa / Finance",
      year: "2026",
      date: "2026-04-12",
      readTime: "22 min read",
      pages: 50,
      method: "BISE correlation framework · expert synthesis",
      horizon: "2020 — Q1 2026",
      access: "paid",
      status: "published",
      author: "Combined Intelligence Desk",
      hitRate: 0.82,
      constraintIds: ["C-B01", "C-I01", "C-I02", "C-S01", "C-E01", "C-E02", "C-X01"],
      stats: [
        { label: "Banking assets 2024", value: "RWF 8.7T", desc: "+19.1% YoY · 67.5% of financial sector" },
        { label: "Financial inclusion", value: "96%", desc: "From 48% in 2008 — best in Africa" },
        { label: "Mobile-money use", value: "86%", desc: "From 62% in 2020 — wallet is the bank" },
        { label: "GDP growth 2025", value: "9.4%", desc: "Q3 hit 11.8% — fastest in EAC" },
        { label: "Diaspora remittances", value: "$502M", desc: "From $128M in 2014 — 4× growth" },
        { label: "Avg lending rate", value: "16.0%", desc: "High — limits SME affordability" },
      ],
      headlines: [
        { n: "01", title: "Banks are quietly profitable", body: "RWF 8.7T total assets (+19.1%), RWF 282.5B net profit (+29% YoY), RoE of 20.8% and RoA of 4.9% — a sector that is growing and stabilizing simultaneously.", tier: "free" },
        { n: "02", title: "Mobile money is the front door", body: "9.8M wallets · 86% of adults use mobile money · 246M monthly transactions on MTN alone. The phone is the primary financial product, not the branch.", tier: "free" },
        { n: "03", title: "96% are formally included", body: "Up from 48% in 2008. Rwanda is closer to universal access than almost any African market — but the depth of services per included adult is the next frontier.", tier: "free" },
        { n: "04", title: "Fintech is the strategic bet", body: "From 17 → 75 fintechs. Strategy 2024-2029 targets $200M, 7,500 jobs, top-30 global ranking. Kigali ranks 7th in MEA, 61st globally for fintech.", tier: "members" },
        { n: "05", title: "Concentration is the structure", body: "Top 3 banks hold 63.6% of gross loans and 60.8% of deposits. BK alone is ~33% of total assets. Tier-2/3 must specialise or shrink.", tier: "members" },
        { n: "06", title: "Crypto is gated, CBDC is coming", body: "BNR working on CBDC. Draft VASP law approved March 2026 — conditional licensing route, but FRW remains sole legal tender. Stablecoin is coming.", tier: "paid" },
        { n: "07", title: "Cross-border is the next chapter", body: "BK launched PAPSS first in Rwanda. Rwanda-Ghana licence-passporting MOU active. BK opened a branch at the DRC border.", tier: "paid" },
        { n: "08", title: "Cyber is becoming structural", body: "BNR website itself targeted in DDoS solicitation (May 2025). Multiple .gov.rw breaches. National Cybersecurity Strategy 2024-2029 now active.", tier: "paid" },
      ],
      gdpSeries: [
        { y: "2020", v: -3.4 },
        { y: "2021", v: 10.9 },
        { y: "2022", v: 8.2 },
        { y: "2023", v: 8.2 },
        { y: "2024", v: 8.9 },
        { y: "2025", v: 9.4 },
      ],
      provinces: [
        { name: "Kigali City", pop: 1.75, share: 12, branches: 60, tier: 1 },
        { name: "Eastern",     pop: 3.96, share: 28, branches: 13, tier: 3 },
        { name: "Southern",    pop: 3.28, share: 23, branches:  9, tier: 3 },
        { name: "Western",     pop: 3.31, share: 23, branches: 11, tier: 3 },
        { name: "Northern",    pop: 1.85, share: 13, branches:  7, tier: 2 },
      ],
      correlations: [
        { id: "01", r: 0.78, sign: "+", a: "Mobile-money penetration", b: "Female labour-force participation", insight: "Wallets are an empowerment instrument disguised as a payment tool." },
        { id: "02", r: 0.58, sign: "−", a: "Bank-branch density",       b: "District poverty rate",            insight: "Yet ATM density correlates much weaker — phygital access still matters as much as tech." },
        { id: "03", r: 0.61, sign: "+", a: "eKash adoption",            b: "SME formalisation rate",            insight: "Real-time rails pull informal traders into the visible economy." },
        { id: "04", r: 0.71, sign: "−", a: "Bank cost-to-income",       b: "Digital-channel transaction share", insight: "Each 10pp shift to digital cuts CIR by ~3.5pp · the only path to mid-tier survival." },
        { id: "05", r: 0.52, sign: "+", a: "Diaspora remittances",      b: "Kigali housing prices",             insight: "USD 502M remittances reshape urban form · concentrated in 5 sectors." },
        { id: "06", r: 0.69, sign: "−", a: "Crop-insurance penetration",b: "Default rate on agri-loans",        insight: "Insurance is a credit-quality lever, not just a product line." },
        { id: "07", r: 0.55, sign: "+", a: "Fintech presence",          b: "Formal credit access (district)",   insight: "Fintechs lift the floor; banks raise the ceiling — they are complements." },
        { id: "08", r: 0.83, sign: "+", a: "Cyber-incident frequency",  b: "Digital-banking growth",            insight: "Fraud follows adoption with 12-18 month lag · investment must precede launch." },
      ],
      shifts: [
        ["From Cash-and-branch",            "Wallet-and-API"],
        ["From Product-led",                "Customer-life-led"],
        ["From Risk-as-collateral",         "Risk-as-data"],
        ["From Domestic banks",             "Pan-African franchises"],
        ["From Manual fraud chase",         "Predictive fraud prevention"],
        ["From Crypto-feared",              "Stablecoin-issued"],
        ["From Diaspora-as-afterthought",   "Diaspora-as-strategy"],
        ["From Bank-vs-fintech",            "Bank-fintech-telco stack"],
      ],
      personas: [
        { i: "A", name: "Aline",       age: 21, role: "Urban first-earner",    n: "1.4M",  needs: "Wallet · savings · micro-credit · embedded health", how: "Lives on TikTok + MTN MoMo; never seen a branch" },
        { i: "J", name: "Jean",        age: 38, role: "Rural smallholder",     n: "5.2M",  needs: "Input loan · weather cover · harvest-day liquidity", how: "Phone with MoMo; cash converts at agents" },
        { i: "C", name: "Clementine",  age: 44, role: "Market-trader mama",    n: "0.6M",  needs: "Working capital · wholesaler credit · savings group", how: "M-Koba member; uses MoMoPay; no formal score" },
        { i: "E", name: "Eric",        age: 27, role: "Moto-taxi / gig",       n: "0.4M",  needs: "Asset finance · daily-revenue loan · motor cover", how: "Pays loans daily through wallet rails" },
        { i: "G", name: "Grace",       age: 47, role: "SME owner (5–15 staff)",n: "0.18M", needs: "Trade finance · payroll · growth term loan", how: "Has BK account · uses MoMo for everything else" },
        { i: "D", name: "Dr. Patrick", age: 53, role: "Diaspora professional", n: "0.6M",  needs: "Remit · FX · diaspora bonds · family health cover", how: "WhatsApp + bank app; sends $250/mo home" },
      ],
      predictions: [
        { id: "p1", statement: "Top-3 bank concentration exceeds 65% of gross loans by year-end.",              target: "2026-12-31", status: "pending",  tier: "members" },
        { id: "p2", statement: "BNR issues conditional VASP licence to at least 2 operators.",                  target: "2026-09-30", status: "resolved", outcome: "true",    confidence: 0.74, tier: "paid" },
        { id: "p3", statement: "Mobile-money active wallets cross 11M.",                                        target: "2026-12-31", status: "pending",  tier: "free" },
        { id: "p4", statement: "Diaspora remittances surpass $560M.",                                           target: "2026-12-31", status: "pending",  tier: "free" },
        { id: "p5", statement: "A Rwandan bank issues an EAC-grade stablecoin.",                                target: "2027-06-30", status: "pending",  tier: "paid" },
        { id: "p6", statement: "Cyber-incident reports rise 12-18mo behind digital-banking growth (r=+0.83 holds).", target: "2026-06-30", status: "resolved", outcome: "true",    confidence: 0.91, tier: "members" },
        { id: "p7", statement: "Sector cost-to-income drops below 50%.",                                        target: "2027-12-31", status: "pending",  tier: "paid" },
        { id: "p8", statement: "BK Group cross-border revenue exceeds 25% of group total.",                     target: "2027-12-31", status: "resolved", outcome: "partial", confidence: 0.6,  tier: "members" },
      ],
    },

    {
      id: "KE-AGRI-26", slug: "kenya-agritech", title: "Kenya's AgriTech Pivot",
      subtitle: "From M-Pesa to M-Pesa-for-fields.",
      hook: "Why Safaricom's agri-rails will determine 2027 food security in the EAC corridor.",
      tag: "Strategic Sector", domain: "Africa / Agri", year: "2026", date: "2026-03-21",
      readTime: "14 min read", access: "members", status: "published", hitRate: 0.71,
    },
    {
      id: "NG-LCY-26", slug: "naira-velocity", title: "Naira Velocity",
      subtitle: "The hidden gradient inside Nigeria's FX reform.",
      hook: "Tracking dollar-liquidity and parallel-market spread across 14 quarters.",
      tag: "Macro", domain: "Africa / FX", year: "2026", date: "2026-02-08",
      readTime: "9 min read", access: "paid", status: "published", hitRate: 0.66,
    },
    {
      id: "ZA-INFRA-26", slug: "loadshedding-end", title: "South Africa's End-of-Loadshedding Trade",
      subtitle: "Capex, not promises.",
      hook: "Mapping the JSE-listed names whose CAPEX schedules align with the 2027 grid horizon.",
      tag: "Equity", domain: "Africa / Energy", year: "2026", date: "2026-01-30",
      readTime: "11 min read", access: "members", status: "published", hitRate: 0.78,
    },
    {
      id: "EAC-STBL-26", slug: "stablecoin-eac", title: "An EAC Stablecoin Stack",
      subtitle: "Working draft — not for distribution.",
      hook: "Why the path to a regional unit-of-account runs through Kigali, not Nairobi.",
      tag: "Frontier", domain: "EAC / Crypto", year: "2026", date: "2026-04-02",
      readTime: "—", access: "paid", status: "draft", hitRate: null,
    },
    {
      id: "GH-INSUR-25", slug: "ghana-insurance", title: "Ghana's Bancassurance Ceiling",
      subtitle: "Why penetration stalls at 1.1%.",
      hook: "The structural reasons sub-Saharan insurance hits a wall — and what breaks it.",
      tag: "Strategic Sector", domain: "Africa / Insurance", year: "2025", date: "2025-11-14",
      readTime: "16 min read", access: "free", status: "retired", hitRate: 0.69,
    },
  ],

  jobs: [
    { id: "J-9F4A", kind: "AI Synthesis",       source: "Rwanda's Financial Overview.pdf",         status: "complete",   progress: 100, started: "10:22:14", duration: "2m 41s", message: "Synthesis sealed · 50 pages · 8 headlines · 8 correlations" },
    { id: "J-B21E", kind: "Constraint Re-bind", source: "RW-FIN-26 / 7 constraints",               status: "complete",   progress: 100, started: "10:25:02", duration: "0m 12s", message: "Bound to C-B01 · C-I01 · C-I02 · C-S01 · C-E01 · C-E02 · C-X01" },
    { id: "J-C7D2", kind: "AI Refinement",      source: "EAC-STBL-26 — sharpen Section 03",        status: "processing", progress:  64, started: "10:31:48", duration: "—",      message: "Cross-referencing BNR / Bank of Tanzania / CBK statements..." },
    { id: "J-A104", kind: "Tier Diff",          source: "RW-FIN-26 — paid vs members",             status: "queued",     progress:   0, started: "—",        duration: "—",      message: "Awaiting 1 upstream job" },
    { id: "J-7E91", kind: "Prediction Resolve", source: "p2 · VASP licence",                       status: "complete",   progress: 100, started: "09:41:09", duration: "0m 04s", message: "Sealed TRUE · conf 0.74 · evidence linked" },
    { id: "J-8821", kind: "Ingest",             source: "BNR-MPS-2026Q1.pdf",                      status: "error",      progress:  38, started: "08:14:55", duration: "—",      message: "Scan failed at p.27 — encoding mismatch. Retry suggested." },
  ],

  team: [
    { email: "bendonmurgor@gmail.com",     role: "super_admin",   label: "Super Administrator", initial: "BM", added: "2025-09-12", you: true },
    { email: "n.uwase@combined.intel",     role: "admin",         label: "Admin",               initial: "NU", added: "2025-10-04" },
    { email: "k.mensah@combined.intel",    role: "publisher",     label: "Publisher",           initial: "KM", added: "2025-11-22" },
    { email: "a.diallo@combined.intel",    role: "editor",        label: "Editor",              initial: "AD", added: "2026-01-08" },
    { email: "t.okafor@combined.intel",    role: "analyst",       label: "Analyst",             initial: "TO", added: "2026-01-19" },
    { email: "m.cohen@combined.intel",     role: "ledger_keeper", label: "Ledger Keeper",       initial: "MC", added: "2026-02-02" },
  ],

  contentExcerpt: `## Macro Landscape

Rwanda has compounded GDP at 8%+ since 2021. In 2025 it grew 9.4%, with Q3 hitting 11.8%. But beneath the headline are tighter currents: rebased GDP, a 70%-private-consumption economy, public debt nearing 80% of GDP, and a structural import dependence that shapes every banking decision.

### What is driving it

70% — Private consumption. GDP rebasing made private consumption visible — youth-driven.
+25% — ICT growth. Mobile money, fintech, e-commerce — fastest sub-sector.
+15% — Public spending. Government injection drove circulation, infrastructure.

:::members
## The Concentration Story

Top 3 banks hold 63.6% of gross loans and 60.8% of deposits. BK alone is ~33% of total assets. Tier-2/3 must specialise or shrink.

The strategic question: does Rwanda need 11 banks, or 7 well-capitalised pan-African champions plus a long tail of fintech-MFI specialists?
:::

:::paid
## The CBDC & VASP Vector

BNR is working on a CBDC. The draft VASP law was approved in March 2026 — a conditional licensing route, but FRW remains sole legal tender.

The path to an **EAC-grade stablecoin** runs through Kigali, not Nairobi. The institution that issues the first regional unit-of-account will define a decade of cross-border settlement.
:::

## The Eight Shifts

The next decade will separate institutions that read these correlations from those that don't. Eight structural shifts, ranked by inevitability — see Section 09.`,
};
