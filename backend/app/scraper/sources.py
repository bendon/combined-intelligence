"""
Source registry for the Combined Intelligence scraper.

Three feed types:
  rss        – RSS/Atom feed → articles
  pdf_index  – HTML page to scan for PDF links → downloadable reports
  html       – HTML page with article list (CSS selector-based)
"""
from dataclasses import dataclass, field
from typing import Literal

FeedType = Literal["rss", "pdf_index", "html"]


@dataclass
class Source:
    id: str
    name: str
    url: str
    feed_type: FeedType
    countries: list[str] = field(default_factory=list)   # ["*"] = pan-African
    tags: list[str] = field(default_factory=list)
    rate_limit: float = 3.0          # seconds between requests to this domain
    auto_synthesize: bool = False     # queue PDF for AI synthesis on discovery
    # html scraper selectors (feed_type="html")
    item_selector: str = "article"
    link_selector: str = "a"
    title_selector: str = "h2"
    date_selector: str = "time"
    # pdf discovery (feed_type="pdf_index")
    pdf_must_contain: str = ".pdf"   # substring filter on href
    pdf_min_size_kb: int = 100       # skip tiny PDFs (icons, etc.)


SOURCES: list[Source] = [

    # ══════════════════════════════════════════════════════════════════
    # PAN-AFRICAN NEWS (RSS)
    # ══════════════════════════════════════════════════════════════════

    Source(
        id="allafrica",
        name="AllAfrica",
        url="https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf",
        feed_type="rss",
        countries=["*"],
        tags=["news", "africa"],
        rate_limit=3.0,
    ),
    Source(
        id="theafricareport",
        name="The Africa Report",
        url="https://www.theafricareport.com/feed/",
        feed_type="rss",
        countries=["*"],
        tags=["news", "business", "politics", "economy"],
        rate_limit=2.0,
    ),
    Source(
        id="africanbusiness",
        name="African Business Magazine",
        url="https://african.business/feed",
        feed_type="rss",
        countries=["*"],
        tags=["business", "investment", "economics"],
        rate_limit=2.0,
    ),
    Source(
        id="quartz_africa",
        name="Quartz Africa",
        url="https://qz.com/africa/rss",
        feed_type="rss",
        countries=["*"],
        tags=["technology", "business", "economy"],
        rate_limit=2.0,
    ),
    Source(
        id="africaconfidential",
        name="Africa Confidential",
        url="https://www.africa-confidential.com/rss",
        feed_type="rss",
        countries=["*"],
        tags=["politics", "intelligence", "governance"],
        rate_limit=3.0,
    ),

    # ══════════════════════════════════════════════════════════════════
    # EAST AFRICA (RSS)
    # ══════════════════════════════════════════════════════════════════

    Source(
        id="theeastafrican",
        name="The East African",
        url="https://www.theeastafrican.co.ke/tea/business/rss",
        feed_type="rss",
        countries=["Kenya", "Uganda", "Tanzania", "Rwanda", "Burundi"],
        tags=["business", "economy", "east-africa"],
        rate_limit=2.0,
    ),
    Source(
        id="newtimes_rw",
        name="New Times Rwanda",
        url="https://www.newtimes.co.rw/rss",
        feed_type="rss",
        countries=["Rwanda"],
        tags=["news", "economy", "business"],
        rate_limit=2.0,
    ),
    Source(
        id="monitor_ug",
        name="Daily Monitor Uganda",
        url="https://www.monitor.co.ug/uganda/business/rss",
        feed_type="rss",
        countries=["Uganda"],
        tags=["news", "economy", "business"],
        rate_limit=2.0,
    ),
    Source(
        id="thecitizen_tz",
        name="The Citizen Tanzania",
        url="https://www.thecitizen.co.tz/tanzania/rss",
        feed_type="rss",
        countries=["Tanzania"],
        tags=["news", "economy", "business"],
        rate_limit=2.0,
    ),
    Source(
        id="nation_ke",
        name="Daily Nation Kenya",
        url="https://nation.africa/kenya/business/rss",
        feed_type="rss",
        countries=["Kenya"],
        tags=["news", "economy", "business", "finance"],
        rate_limit=2.0,
    ),

    # ══════════════════════════════════════════════════════════════════
    # WEST AFRICA (RSS)
    # ══════════════════════════════════════════════════════════════════

    Source(
        id="businessday_ng",
        name="BusinessDay Nigeria",
        url="https://businessday.ng/feed/",
        feed_type="rss",
        countries=["Nigeria"],
        tags=["business", "finance", "economy", "banking"],
        rate_limit=2.0,
    ),
    Source(
        id="ghanaian_times",
        name="Graphic Online Ghana",
        url="https://www.graphic.com.gh/rss",
        feed_type="rss",
        countries=["Ghana"],
        tags=["news", "economy", "business"],
        rate_limit=2.0,
    ),

    # ══════════════════════════════════════════════════════════════════
    # SOUTHERN AFRICA (RSS)
    # ══════════════════════════════════════════════════════════════════

    Source(
        id="mg_za",
        name="Mail & Guardian South Africa",
        url="https://mg.co.za/rss/",
        feed_type="rss",
        countries=["South Africa"],
        tags=["news", "politics", "economy", "business"],
        rate_limit=2.0,
    ),
    Source(
        id="moneyweb",
        name="Moneyweb",
        url="https://www.moneyweb.co.za/feed/",
        feed_type="rss",
        countries=["South Africa"],
        tags=["finance", "investment", "markets", "economy"],
        rate_limit=2.0,
    ),

    # ══════════════════════════════════════════════════════════════════
    # INSTITUTIONAL REPORTS (PDF discovery)
    # ══════════════════════════════════════════════════════════════════

    Source(
        id="afdb_publications",
        name="African Development Bank Publications",
        url="https://www.afdb.org/en/documents/publications",
        feed_type="pdf_index",
        countries=["*"],
        tags=["development", "finance", "infrastructure", "research"],
        rate_limit=6.0,
        auto_synthesize=True,
    ),
    Source(
        id="uneca",
        name="UN Economic Commission for Africa",
        url="https://www.uneca.org/publications",
        feed_type="pdf_index",
        countries=["*"],
        tags=["development", "statistics", "economic", "research"],
        rate_limit=5.0,
        auto_synthesize=True,
    ),
    Source(
        id="moibrahim",
        name="Mo Ibrahim Foundation Research",
        url="https://mo.ibrahim.foundation/research-publications",
        feed_type="pdf_index",
        countries=["*"],
        tags=["governance", "leadership", "africa", "index"],
        rate_limit=4.0,
        auto_synthesize=True,
    ),
    Source(
        id="imf_africa",
        name="IMF Africa Regional Reports",
        url="https://www.imf.org/en/Publications/Search#sort=relevance&f:region=[Africa]",
        feed_type="pdf_index",
        countries=["*"],
        tags=["imf", "economic", "monetary", "fiscal"],
        rate_limit=5.0,
        auto_synthesize=True,
    ),
    Source(
        id="worldbank_africa",
        name="World Bank Africa Research",
        url="https://openknowledge.worldbank.org/collections/e7df9f56-e9a4-5e56-9125-59cb3ab36ce0",
        feed_type="pdf_index",
        countries=["*"],
        tags=["world-bank", "development", "research", "economic"],
        rate_limit=5.0,
        auto_synthesize=True,
    ),
    Source(
        id="unctad_africa",
        name="UNCTAD Africa Reports",
        url="https://unctad.org/publications?f%5B0%5D=field_region_id%3A9",
        feed_type="pdf_index",
        countries=["*"],
        tags=["trade", "investment", "development", "fdi"],
        rate_limit=5.0,
        auto_synthesize=True,
    ),

    # ══════════════════════════════════════════════════════════════════
    # CENTRAL BANKS (PDF discovery)
    # ══════════════════════════════════════════════════════════════════

    Source(
        id="bnr_rwanda",
        name="National Bank of Rwanda",
        url="https://www.bnr.rw/financial-stability/publications/",
        feed_type="pdf_index",
        countries=["Rwanda"],
        tags=["monetary-policy", "central-bank", "financial-stability"],
        rate_limit=4.0,
        auto_synthesize=True,
    ),
    Source(
        id="cbn_nigeria",
        name="Central Bank of Nigeria",
        url="https://www.cbn.gov.ng/publicationspublicnotices/publications.asp",
        feed_type="pdf_index",
        countries=["Nigeria"],
        tags=["monetary-policy", "central-bank", "banking"],
        rate_limit=4.0,
        auto_synthesize=True,
    ),
    Source(
        id="cbk_kenya",
        name="Central Bank of Kenya",
        url="https://www.centralbank.go.ke/publications/",
        feed_type="pdf_index",
        countries=["Kenya"],
        tags=["monetary-policy", "central-bank", "banking"],
        rate_limit=4.0,
        auto_synthesize=True,
    ),
    Source(
        id="bou_uganda",
        name="Bank of Uganda",
        url="https://www.bou.or.ug/bou/bou-downloads/publications.html",
        feed_type="pdf_index",
        countries=["Uganda"],
        tags=["monetary-policy", "central-bank", "banking"],
        rate_limit=4.0,
        auto_synthesize=True,
    ),
    Source(
        id="bog_ghana",
        name="Bank of Ghana",
        url="https://www.bog.gov.gh/publications/",
        feed_type="pdf_index",
        countries=["Ghana"],
        tags=["monetary-policy", "central-bank", "banking"],
        rate_limit=4.0,
        auto_synthesize=True,
    ),
    Source(
        id="sarb",
        name="South African Reserve Bank",
        url="https://www.resbank.co.za/en/home/publications",
        feed_type="pdf_index",
        countries=["South Africa"],
        tags=["monetary-policy", "central-bank", "financial-stability"],
        rate_limit=4.0,
        auto_synthesize=True,
    ),
    Source(
        id="bceao",
        name="BCEAO (West African CFA)",
        url="https://www.bceao.int/fr/publications",
        feed_type="pdf_index",
        countries=["Senegal", "Ivory Coast", "Mali", "Burkina Faso", "Niger", "Guinea-Bissau", "Togo", "Benin"],
        tags=["monetary-policy", "central-bank", "west-africa", "cfa"],
        rate_limit=4.0,
        auto_synthesize=True,
    ),
    Source(
        id="beac",
        name="BEAC (Central African CFA)",
        url="https://www.beac.int/publications/",
        feed_type="pdf_index",
        countries=["Cameroon", "CAR", "Chad", "DRC", "Equatorial Guinea", "Gabon"],
        tags=["monetary-policy", "central-bank", "central-africa", "cfa"],
        rate_limit=4.0,
        auto_synthesize=True,
    ),
]

# Fast lookup
SOURCE_MAP: dict[str, Source] = {s.id: s for s in SOURCES}

# All African countries for detection
AFRICAN_COUNTRIES = [
    "Nigeria", "Ethiopia", "Egypt", "DR Congo", "Tanzania", "Kenya", "Uganda",
    "Algeria", "Sudan", "Morocco", "Angola", "Mozambique", "Ghana", "Madagascar",
    "Cameroon", "Ivory Coast", "Niger", "Burkina Faso", "Mali", "Malawi",
    "Zambia", "Senegal", "Chad", "Somalia", "Zimbabwe", "Guinea", "Rwanda",
    "Benin", "Burundi", "Tunisia", "South Sudan", "Togo", "Sierra Leone",
    "Libya", "Congo", "Liberia", "Central African Republic", "Mauritania",
    "Eritrea", "Namibia", "Gambia", "Botswana", "Gabon", "Lesotho", "Guinea-Bissau",
    "Equatorial Guinea", "Mauritius", "Eswatini", "Djibouti", "Réunion",
    "Comoros", "Cape Verde", "Seychelles", "São Tomé and Príncipe",
    "South Africa", "Cabo Verde", "East Africa", "West Africa", "North Africa",
    "Southern Africa", "Central Africa", "Sub-Saharan Africa", "Horn of Africa",
    "Sahel", "EAC", "ECOWAS", "SADC", "AU", "African Union",
]
