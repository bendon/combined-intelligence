"""
Main scraper logic — async, rate-limited, deduplicated.

Entry points:
  • scrape_source(source)   – scrape one source
  • scrape_all(feed_types)  – scrape all (or filtered) sources
  • CLI: python -m app.scraper.run [--source id] [--type rss|pdf_index|html] [--all]
"""
import asyncio
import hashlib
import io
import logging
import re
import time
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

import feedparser
import httpx
import trafilatura
from bs4 import BeautifulSoup
from pymongo import MongoClient, UpdateOne

from app.config import get_settings
from app.scraper.sources import AFRICAN_COUNTRIES, SOURCE_MAP, SOURCES, Source

log = logging.getLogger("ci.scraper")
settings = get_settings()

# ── MongoDB (sync — scraper runs in Celery worker, not async FastAPI) ──────────
_mongo: MongoClient | None = None


def _db():
    global _mongo
    if _mongo is None:
        _mongo = MongoClient(settings.mongo_url)
    return _mongo[settings.mongo_db]


# ── HTTP client factory ────────────────────────────────────────────────────────
HEADERS = {
    "User-Agent": (
        "CombinedIntelligenceBot/1.0 (+https://combinedintelligence.us/desk/about; "
        "desk@combinedintelligence.us)"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml,application/rss+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _client() -> httpx.Client:
    return httpx.Client(
        headers=HEADERS,
        timeout=30,
        follow_redirects=True,
        verify=True,
    )


# ── Deduplication ──────────────────────────────────────────────────────────────

def _url_hash(url: str) -> str:
    return hashlib.sha256(url.strip().encode()).hexdigest()[:20]


def _already_seen(url: str) -> bool:
    h = _url_hash(url)
    return _db().scrape_items.count_documents({"url_hash": h}, limit=1) > 0


# ── Country detection ──────────────────────────────────────────────────────────

def _detect_countries(text: str) -> list[str]:
    found = []
    for country in AFRICAN_COUNTRIES:
        if re.search(r"\b" + re.escape(country) + r"\b", text, re.IGNORECASE):
            found.append(country)
    return found


# ── Persistence ───────────────────────────────────────────────────────────────

def _save_item(
    source: Source,
    url: str,
    title: str,
    summary: str = "",
    body: str | None = None,
    date: datetime | None = None,
    s3_pdf_key: str | None = None,
    item_type: str = "article",
) -> str | None:
    """Upsert a scraped item. Returns inserted _id or None if duplicate."""
    h = _url_hash(url)
    text_for_detection = f"{title} {summary} {body or ''}"
    countries = _detect_countries(text_for_detection) or source.countries

    doc = {
        "source_id":   source.id,
        "source_name": source.name,
        "url":         url,
        "url_hash":    h,
        "type":        item_type,
        "title":       title.strip(),
        "summary":     summary.strip(),
        "body":        body,
        "date":        date,
        "countries":   countries,
        "tags":        source.tags,
        "s3_pdf_key":  s3_pdf_key,
        "status":      "new",
        "scraped_at":  datetime.now(timezone.utc),
        "error":       None,
    }
    result = _db().scrape_items.update_one(
        {"url_hash": h},
        {"$setOnInsert": doc},
        upsert=True,
    )
    if result.upserted_id:
        return str(result.upserted_id)
    return None  # already existed


# ── RSS scraper ────────────────────────────────────────────────────────────────

def _scrape_rss(source: Source, client: httpx.Client) -> int:
    log.info("[%s] fetching RSS: %s", source.id, source.url)
    try:
        resp = client.get(source.url)
        resp.raise_for_status()
    except Exception as exc:
        log.warning("[%s] RSS fetch failed: %s", source.id, exc)
        return 0

    feed = feedparser.parse(resp.text)
    if not feed.entries:
        log.info("[%s] no RSS entries", source.id)
        return 0

    saved = 0
    for entry in feed.entries:
        url   = entry.get("link", "")
        title = entry.get("title", "")
        if not url or not title:
            continue
        if _already_seen(url):
            continue

        summary = entry.get("summary", "") or entry.get("description", "")
        # Strip HTML from summary
        summary = BeautifulSoup(summary, "html.parser").get_text(separator=" ", strip=True)

        # Parse date
        date = None
        if pub := entry.get("published_parsed") or entry.get("updated_parsed"):
            try:
                date = datetime(*pub[:6], tzinfo=timezone.utc)
            except Exception:
                pass

        # Full text extraction (best-effort, skip if slow)
        body = None
        try:
            time.sleep(source.rate_limit)
            downloaded = trafilatura.fetch_url(url)
            if downloaded:
                body = trafilatura.extract(
                    downloaded,
                    include_comments=False,
                    include_tables=True,
                    no_fallback=False,
                )
        except Exception as exc:
            log.debug("[%s] trafilatura failed for %s: %s", source.id, url, exc)

        inserted = _save_item(
            source, url, title,
            summary=summary, body=body, date=date,
            item_type="article",
        )
        if inserted:
            saved += 1
            log.debug("[%s] saved article: %s", source.id, title[:80])

    log.info("[%s] RSS done — %d new items", source.id, saved)
    return saved


# ── PDF index scraper ─────────────────────────────────────────────────────────

def _scrape_pdf_index(source: Source, client: httpx.Client) -> int:
    log.info("[%s] scanning PDF index: %s", source.id, source.url)
    try:
        resp = client.get(source.url)
        resp.raise_for_status()
    except Exception as exc:
        log.warning("[%s] PDF index fetch failed: %s", source.id, exc)
        return 0

    soup = BeautifulSoup(resp.text, "html.parser")
    base = f"{urlparse(source.url).scheme}://{urlparse(source.url).netloc}"

    saved = 0
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        # Resolve relative URLs
        abs_url = urljoin(base, href)
        # Filter: must contain .pdf marker
        if source.pdf_must_contain.lower() not in abs_url.lower():
            continue
        if _already_seen(abs_url):
            continue

        # Use link text as title; fall back to filename
        title = a.get_text(separator=" ", strip=True)
        if not title or len(title) < 4:
            title = abs_url.split("/")[-1].replace("-", " ").replace("_", " ").replace(".pdf", "")

        # Download PDF to S3
        s3_key = None
        try:
            time.sleep(source.rate_limit)
            pdf_resp = client.get(abs_url)
            pdf_resp.raise_for_status()

            # Skip if too small (likely not a real report)
            if len(pdf_resp.content) < source.pdf_min_size_kb * 1024:
                log.debug("[%s] skipping small PDF (%d bytes): %s", source.id, len(pdf_resp.content), abs_url)
                continue

            slug = re.sub(r"[^a-z0-9]+", "-", title.lower())[:60]
            logical_key = f"scrape/{source.id}/{slug}.pdf"

            from app.storage.s3 import upload_fileobj
            s3_key = upload_fileobj(
                io.BytesIO(pdf_resp.content),
                logical_key,
                content_type="application/pdf",
            )
            log.debug("[%s] uploaded PDF to s3://%s", source.id, s3_key)

        except Exception as exc:
            log.warning("[%s] PDF download failed %s: %s", source.id, abs_url, exc)
            # Still save the item so we don't retry the download endlessly
            s3_key = None

        inserted = _save_item(
            source, abs_url, title,
            s3_pdf_key=s3_key,
            item_type="report_pdf",
        )
        if inserted:
            saved += 1
            # Optionally queue synthesis
            if s3_key and source.auto_synthesize:
                _queue_synthesis(str(inserted), s3_key, title, source)

    log.info("[%s] PDF index done — %d new items", source.id, saved)
    return saved


# ── Synthesis queue ────────────────────────────────────────────────────────────

def _queue_synthesis(scrape_id: str, s3_key: str, title: str, source: Source) -> None:
    """
    Create a draft report document and queue ingest + synthesis.
    Only fires when auto_synthesize=True on the source.
    """
    try:
        from datetime import datetime, timezone
        from python_slugify import slugify
        from app.synthesis.tasks import ingest_report

        db = _db()
        base_slug = slugify(title)[:80]
        slug = base_slug
        n = 1
        while db.reports.count_documents({"slug": slug}, limit=1):
            slug = f"{base_slug}-{n}"; n += 1

        now = datetime.now(timezone.utc)
        result = db.reports.insert_one({
            "slug":       slug,
            "title":      title,
            "subtitle":   "",
            "hook":       "",
            "tag":        source.tags[0] if source.tags else "Research",
            "domain":     ", ".join(source.countries) if source.countries != ["*"] else "Africa",
            "year":       str(now.year),
            "date":       now.strftime("%Y-%m-%d"),
            "read_time":  "—",
            "access":     "free",
            "status":     "draft",
            "author":     source.name,
            "hit_rate":   None,
            "content_md": "",
            "stats":      [],
            "headlines":  [],
            "correlations": [],
            "predictions":  [],
            "constraint_ids": [],
            "s3_pdf_key": s3_key,
            "og_image_url": None,
            "scrape_id":  scrape_id,
            "source_id":  source.id,
            "created_at": now,
            "updated_at": now,
        })
        report_id = str(result.inserted_id)

        # Ingest → Synthesis pipeline
        ingest_report.apply_async(
            args=[report_id, s3_key],
            queue="synthesis",
            link=_synthesis_chain(report_id),
        )
        log.info("[%s] queued synthesis for report %s", source.id, report_id)

    except Exception as exc:
        log.warning("[%s] synthesis queue failed: %s", source.id, exc)


def _synthesis_chain(report_id: str):
    """Return a Celery chord that runs synthesize_report after ingest_report."""
    from app.synthesis.tasks import synthesize_report
    return synthesize_report.s(report_id).set(queue="synthesis")


# ── HTML index scraper (generic) ──────────────────────────────────────────────

def _scrape_html(source: Source, client: httpx.Client) -> int:
    log.info("[%s] fetching HTML index: %s", source.id, source.url)
    try:
        resp = client.get(source.url)
        resp.raise_for_status()
    except Exception as exc:
        log.warning("[%s] HTML fetch failed: %s", source.id, exc)
        return 0

    soup = BeautifulSoup(resp.text, "html.parser")
    base = f"{urlparse(source.url).scheme}://{urlparse(source.url).netloc}"
    items = soup.select(source.item_selector) or soup.find_all("article")

    saved = 0
    for item in items[:30]:  # cap at 30 per page to avoid runaway
        a_tag = item.select_one(source.link_selector) if source.link_selector else item.find("a")
        if not a_tag or not a_tag.get("href"):
            continue
        url = urljoin(base, a_tag["href"])
        if _already_seen(url):
            continue

        title_el = item.select_one(source.title_selector) if source.title_selector else a_tag
        title = title_el.get_text(strip=True) if title_el else ""
        if not title:
            continue

        body = None
        try:
            time.sleep(source.rate_limit)
            downloaded = trafilatura.fetch_url(url)
            if downloaded:
                body = trafilatura.extract(downloaded, include_tables=True, no_fallback=False)
        except Exception:
            pass

        inserted = _save_item(source, url, title, body=body, item_type="article")
        if inserted:
            saved += 1

    log.info("[%s] HTML done — %d new items", source.id, saved)
    return saved


# ── Orchestrator ───────────────────────────────────────────────────────────────

def scrape_source(source: Source) -> dict:
    """Scrape a single source. Returns summary dict."""
    with _client() as client:
        if source.feed_type == "rss":
            count = _scrape_rss(source, client)
        elif source.feed_type == "pdf_index":
            count = _scrape_pdf_index(source, client)
        elif source.feed_type == "html":
            count = _scrape_html(source, client)
        else:
            count = 0
    return {"source": source.id, "new_items": count}


def scrape_all(
    feed_types: list[str] | None = None,
    source_ids: list[str] | None = None,
) -> list[dict]:
    """
    Scrape all (or filtered) sources sequentially.

    Args:
        feed_types: restrict to specific feed types (e.g. ["rss"])
        source_ids: restrict to specific source IDs
    """
    targets = SOURCES
    if feed_types:
        targets = [s for s in targets if s.feed_type in feed_types]
    if source_ids:
        targets = [s for s in targets if s.id in source_ids]

    results = []
    for source in targets:
        try:
            result = scrape_source(source)
            results.append(result)
        except Exception as exc:
            log.error("[%s] unhandled error: %s", source.id, exc, exc_info=True)
            results.append({"source": source.id, "new_items": 0, "error": str(exc)})

    total = sum(r.get("new_items", 0) for r in results)
    log.info("Scrape complete — %d new items across %d sources", total, len(results))
    return results


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="Combined Intelligence African scraper")
    parser.add_argument("--source", action="append", dest="sources", metavar="ID",
                        help="Source ID(s) to scrape (repeatable)")
    parser.add_argument("--type", action="append", dest="types", metavar="TYPE",
                        help="Feed type(s): rss | pdf_index | html (repeatable)")
    parser.add_argument("--all", action="store_true", help="Scrape all sources")
    parser.add_argument("--list", action="store_true", help="List available sources and exit")
    args = parser.parse_args()

    if args.list:
        print(f"{'ID':<25} {'TYPE':<12} {'NAME'}")
        print("-" * 65)
        for s in SOURCES:
            print(f"{s.id:<25} {s.feed_type:<12} {s.name}")
        sys.exit(0)

    if not (args.all or args.sources or args.types):
        parser.print_help()
        sys.exit(1)

    results = scrape_all(
        feed_types=args.types,
        source_ids=args.sources,
    )

    print("\n── Results ──────────────────────────────")
    for r in results:
        status = f"✓ {r['new_items']:>3} new" if "error" not in r else f"✗ {r['error']}"
        print(f"  {r['source']:<25} {status}")
    print(f"\nTotal new items: {sum(r.get('new_items', 0) for r in results)}")
