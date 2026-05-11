"""Admin API for the scraper — trigger runs, list items, inspect sources."""
from fastapi import APIRouter, Depends, Query, HTTPException
from app.auth.jwt import require_admin
from app.database import get_db
from app.scraper.sources import SOURCES, SOURCE_MAP

router = APIRouter()


@router.get("/sources")
async def list_sources(_=Depends(require_admin)):
    """Return all configured scraper sources."""
    return [
        {
            "id":         s.id,
            "name":       s.name,
            "feed_type":  s.feed_type,
            "url":        s.url,
            "countries":  s.countries,
            "tags":       s.tags,
            "auto_synthesize": s.auto_synthesize,
        }
        for s in SOURCES
    ]


@router.post("/run/{source_id}", status_code=202)
async def trigger_source(source_id: str, _=Depends(require_admin)):
    """Queue a single source scrape."""
    if source_id not in SOURCE_MAP:
        raise HTTPException(status_code=404, detail=f"Unknown source: {source_id}")
    from app.scraper.tasks import scrape_source_task
    task = scrape_source_task.apply_async(args=[source_id], queue="synthesis")
    return {"ok": True, "task_id": task.id, "source_id": source_id}


@router.post("/run-news", status_code=202)
async def trigger_news(_=Depends(require_admin)):
    """Queue a full RSS news scrape."""
    from app.scraper.tasks import scrape_news
    task = scrape_news.apply_async(queue="synthesis")
    return {"ok": True, "task_id": task.id}


@router.post("/run-reports", status_code=202)
async def trigger_reports(_=Depends(require_admin)):
    """Queue a full PDF report scrape."""
    from app.scraper.tasks import scrape_reports
    task = scrape_reports.apply_async(queue="synthesis")
    return {"ok": True, "task_id": task.id}


@router.get("/items")
async def list_items(
    source_id: str | None = Query(None),
    item_type: str | None = Query(None),
    status: str | None = Query(None),
    country: str | None = Query(None),
    limit: int = Query(50, le=200),
    skip: int = Query(0),
    _=Depends(require_admin),
):
    """Browse scraped items."""
    db = get_db()
    filt: dict = {}
    if source_id: filt["source_id"] = source_id
    if item_type:  filt["type"] = item_type
    if status:     filt["status"] = status
    if country:    filt["countries"] = country

    cursor = db.scrape_items.find(filt, {"body": 0}).sort("scraped_at", -1).skip(skip).limit(limit)
    items = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
    return items


@router.get("/items/{item_id}")
async def get_item(item_id: str, _=Depends(require_admin)):
    from bson import ObjectId
    db = get_db()
    try:
        doc = await db.scrape_items.find_one({"_id": ObjectId(item_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/stats")
async def scraper_stats(_=Depends(require_admin)):
    """Counts by source and type."""
    db = get_db()
    pipeline = [
        {"$group": {
            "_id": {"source": "$source_id", "type": "$type"},
            "count": {"$sum": 1},
            "latest": {"$max": "$scraped_at"},
        }},
        {"$sort": {"latest": -1}},
    ]
    rows = [doc async for doc in db.scrape_items.aggregate(pipeline)]
    return rows
