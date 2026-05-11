"""Celery tasks for the scraper — news (frequent) and reports (less frequent)."""
import logging
from celery_app import celery
from celery.utils.log import get_task_logger

log = get_task_logger(__name__)


@celery.task(
    name="app.scraper.tasks.scrape_news",
    queue="synthesis",
    max_retries=2,
    default_retry_delay=300,
)
def scrape_news():
    """Scrape RSS news feeds — runs every 2 hours via beat."""
    from app.scraper.run import scrape_all
    results = scrape_all(feed_types=["rss"])
    total = sum(r.get("new_items", 0) for r in results)
    log.info("scrape_news complete: %d new articles", total)
    return {"new_items": total, "sources": len(results)}


@celery.task(
    name="app.scraper.tasks.scrape_reports",
    queue="synthesis",
    max_retries=2,
    default_retry_delay=600,
    time_limit=3600,  # 1 hour max — PDF downloads take time
)
def scrape_reports():
    """Scrape institutional report pages — runs every 12 hours via beat."""
    from app.scraper.run import scrape_all
    results = scrape_all(feed_types=["pdf_index"])
    total = sum(r.get("new_items", 0) for r in results)
    log.info("scrape_reports complete: %d new PDFs", total)
    return {"new_items": total, "sources": len(results)}


@celery.task(
    name="app.scraper.tasks.scrape_source",
    queue="synthesis",
    max_retries=2,
    default_retry_delay=120,
)
def scrape_source_task(source_id: str):
    """Scrape a single source by ID — callable from CMS or API."""
    from app.scraper.run import scrape_source
    from app.scraper.sources import SOURCE_MAP
    source = SOURCE_MAP.get(source_id)
    if not source:
        raise ValueError(f"Unknown source: {source_id}")
    result = scrape_source(source)
    log.info("scrape_source %s: %d new items", source_id, result.get("new_items", 0))
    return result
