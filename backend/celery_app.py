from celery import Celery
from celery.schedules import crontab
from app.config import get_settings

settings = get_settings()

celery = Celery(
    "comban",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.synthesis.tasks", "app.push.tasks", "app.scraper.tasks"],
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.synthesis.tasks.*": {"queue": "synthesis"},
        "app.push.tasks.*":      {"queue": "push"},
        "app.scraper.tasks.*":   {"queue": "synthesis"},
    },
    beat_schedule={
        # News feeds — every 2 hours, offset to avoid peak
        "scrape-news-feeds": {
            "task": "app.scraper.tasks.scrape_news",
            "schedule": crontab(minute=15, hour="*/2"),
        },
        # Institutional report PDFs — twice a day (06:00 and 18:00 UTC)
        "scrape-report-pdfs": {
            "task": "app.scraper.tasks.scrape_reports",
            "schedule": crontab(minute=0, hour="6,18"),
        },
        # Auto-generation — every morning at 07:30 UTC
        # Checks editorial queue; only fires if nothing is pending
        "auto-generate-brief": {
            "task": "app.synthesis.tasks.auto_generate_report",
            "schedule": crontab(minute=30, hour=7),
        },
    },
)

