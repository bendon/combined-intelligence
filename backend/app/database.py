from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import get_settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(settings.mongo_url)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    settings = get_settings()
    return get_client()[settings.mongo_db]


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        _client = None


async def init_indexes() -> None:
    """Create MongoDB indexes on startup."""
    db = get_db()

    await db.users.create_index("email", unique=True)
    await db.users.create_index("google_id", unique=True, sparse=True)

    await db.reports.create_index("slug", unique=True)
    await db.reports.create_index("status")
    await db.reports.create_index([("title", "text"), ("hook", "text")])

    await db.push_subscriptions.create_index("user_id")
    await db.push_subscriptions.create_index("endpoint", unique=True)

    await db.jobs.create_index("status")
    await db.jobs.create_index("report_id")
    await db.jobs.create_index("created_at")

    await db.predictions.create_index("report_id")
    await db.predictions.create_index("status")

    await db.constraints.create_index("code", unique=True)

    # Scraper
    await db.scrape_items.create_index("url_hash", unique=True)
    await db.scrape_items.create_index("source_id")
    await db.scrape_items.create_index("status")
    await db.scrape_items.create_index("type")
    await db.scrape_items.create_index("scraped_at")
    await db.scrape_items.create_index("countries")
