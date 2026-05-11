from fastapi import APIRouter, Query, Depends
from app.search.qdrant import semantic_search
from app.database import get_db
from app.auth.jwt import current_user

router = APIRouter()


@router.get("/")
async def search(
    q: str = Query(..., min_length=2, max_length=500),
    limit: int = Query(5, le=20),
    report_id: str | None = Query(None),
):
    """
    Semantic search over report chunks.
    Returns matching chunks with their parent report slugs.
    """
    hits = semantic_search(q, limit=limit, report_id=report_id)

    # Enrich with report metadata
    db = get_db()
    report_ids = list({h["report_id"] for h in hits})
    from bson import ObjectId
    docs = {}
    async for doc in db.reports.find(
        {"_id": {"$in": [ObjectId(r) for r in report_ids if len(r) == 24]}},
        {"slug": 1, "title": 1, "access": 1, "status": 1},
    ):
        docs[str(doc["_id"])] = doc

    results = []
    for hit in hits:
        meta = docs.get(hit["report_id"], {})
        if meta.get("status") != "published" and not meta:
            continue
        results.append({
            "score": round(hit["score"], 4),
            "text": hit["text"],
            "report_id": hit["report_id"],
            "slug": meta.get("slug", ""),
            "title": meta.get("title", ""),
            "access": meta.get("access", "free"),
        })
    return results
