from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId

from app.database import get_db
from app.auth.jwt import require_admin, current_user
from app.synthesis.tasks import synthesize_report, ingest_report, auto_generate_report

router = APIRouter()


@router.get("/")
async def list_jobs(
    status: str | None = Query(None),
    limit: int = Query(20, le=100),
    user: dict = Depends(require_admin),
):
    db = get_db()
    filt = {}
    if status:
        filt["status"] = status
    cursor = db.jobs.find(filt).sort("created_at", -1).limit(limit)
    jobs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        jobs.append(doc)
    return jobs


@router.get("/{job_id}")
async def get_job(job_id: str, user: dict = Depends(require_admin)):
    db = get_db()
    try:
        oid = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job id")
    doc = await db.jobs.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    doc["_id"] = str(doc["_id"])
    return doc


@router.post("/synthesize/{report_id}", status_code=202)
async def trigger_synthesis(report_id: str, user: dict = Depends(require_admin)):
    """Queue a synthesis job for an existing report."""
    db = get_db()
    try:
        oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report id")

    report = await db.reports.find_one({"_id": oid})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    task = synthesize_report.apply_async(args=[report_id], queue="synthesis")
    return {"ok": True, "task_id": task.id, "report_id": report_id}


@router.post("/auto-generate", status_code=202)
async def trigger_auto_generate(user: dict = Depends(require_admin)):
    """
    Manually trigger the auto-generation pipeline.
    Respects the same editorial queue check as the scheduled task.
    """
    task = auto_generate_report.apply_async(queue="synthesis")
    return {"ok": True, "task_id": task.id}


@router.post("/ingest/{report_id}", status_code=202)
async def trigger_ingest(report_id: str, user: dict = Depends(require_admin)):
    """Re-trigger PDF ingestion (embedding) for an existing report."""
    db = get_db()
    try:
        oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report id")

    report = await db.reports.find_one({"_id": oid})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    s3_key = report.get("s3_pdf_key")
    if not s3_key:
        raise HTTPException(status_code=400, detail="No PDF uploaded for this report")

    task = ingest_report.apply_async(args=[report_id, s3_key], queue="synthesis")
    return {"ok": True, "task_id": task.id, "report_id": report_id}
