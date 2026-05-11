"""Aggregate predictions stored inside report documents."""
from fastapi import APIRouter, Query
from app.database import get_db

router = APIRouter()


def _pred_pipeline(extra_match: dict | None = None) -> list:
    pipeline = [
        {"$match": {"status": "published"}},
        {"$unwind": "$predictions"},
        {"$replaceRoot": {"newRoot": {"$mergeObjects": [
            "$predictions",
            {
                "report_id":     {"$toString": "$$ROOT._id"},
                "report_slug":   "$$ROOT.slug",
                "report_title":  "$$ROOT.title",
                "report_domain": "$$ROOT.domain",
            },
        ]}}},
    ]
    if extra_match:
        pipeline.append({"$match": extra_match})
    return pipeline


@router.get("/")
async def list_predictions(
    status: str | None = Query(None, pattern="^(pending|resolved)$"),
    limit: int = Query(50, le=200),
    skip: int = Query(0),
):
    db = get_db()
    match = {"status": status} if status else None
    pipeline = _pred_pipeline(match) + [{"$skip": skip}, {"$limit": limit}]
    cursor = db.reports.aggregate(pipeline)
    return [doc async for doc in cursor]


@router.get("/stats")
async def prediction_stats():
    db = get_db()
    pipeline = [
        {"$match": {"status": "published"}},
        {"$unwind": "$predictions"},
        {"$group": {
            "_id": None,
            "total":   {"$sum": 1},
            "pending": {"$sum": {"$cond": [{"$eq": ["$predictions.status", "pending"]}, 1, 0]}},
            "resolved":{"$sum": {"$cond": [{"$eq": ["$predictions.status", "resolved"]}, 1, 0]}},
            "correct": {"$sum": {"$cond": [{"$eq": ["$predictions.outcome", "true"]}, 1, 0]}},
            "partial": {"$sum": {"$cond": [{"$eq": ["$predictions.outcome", "partial"]}, 1, 0]}},
            "wrong":   {"$sum": {"$cond": [{"$eq": ["$predictions.outcome", "false"]}, 1, 0]}},
        }},
    ]
    rows = await db.reports.aggregate(pipeline).to_list(1)
    if not rows:
        return {"total": 0, "pending": 0, "resolved": 0, "correct": 0, "partial": 0, "wrong": 0, "hit_rate": None}
    s = rows[0]
    del s["_id"]
    r = s["resolved"]
    s["hit_rate"] = round((s["correct"] + s["partial"] * 0.5) / r, 3) if r else None
    return s


@router.get("/calibration")
async def calibration_data():
    """Return confidence-bucket vs actual-frequency for a calibration plot."""
    db = get_db()
    pipeline = _pred_pipeline({"status": "resolved", "confidence": {"$ne": None}})
    resolved = [doc async for doc in db.reports.aggregate(pipeline)]

    # Five equal-width buckets across 0–1
    buckets = [
        {"label": f"{i*20}–{(i+1)*20}%", "centre": (i + 0.5) / 5, "n": 0, "hits": 0.0}
        for i in range(5)
    ]
    for p in resolved:
        conf = p.get("confidence", 0.5)
        outcome = p.get("outcome", "false")
        idx = min(int(conf * 5), 4)
        buckets[idx]["n"] += 1
        if outcome == "true":
            buckets[idx]["hits"] += 1.0
        elif outcome == "partial":
            buckets[idx]["hits"] += 0.5

    return [
        {
            "label":     b["label"],
            "predicted": b["centre"],
            "actual":    round(b["hits"] / b["n"], 3) if b["n"] else None,
            "n":         b["n"],
        }
        for b in buckets
    ]
