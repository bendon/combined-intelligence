import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import JSONResponse

from app.database import get_db
from app.auth.jwt import current_user, require_admin
from app.reports.models import ReportCreate, ReportUpdate, ReportOut, doc_to_out, new_report_doc
from app.storage.s3 import upload_fileobj, get_presigned_url, public_url
from app.synthesis.tasks import ingest_report
from python_slugify import slugify
from bson import ObjectId

router = APIRouter()


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report id")


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[ReportOut])
async def list_reports(
    status: str | None = Query(None),
    access: str | None = Query(None),
    limit: int = Query(20, le=100),
    skip: int = Query(0),
    user: dict = Depends(current_user),
):
    db = get_db()
    filt: dict = {}
    if status:
        filt["status"] = status
    if access:
        filt["access"] = access

    # Non-admins only see published reports
    if user.get("role") not in ("admin", "super_admin"):
        filt["status"] = "published"

    cursor = db.reports.find(filt).sort("date", -1).skip(skip).limit(limit)
    return [doc_to_out(doc) async for doc in cursor]


@router.get("/public", response_model=list[ReportOut])
async def list_public_reports(
    limit: int = Query(20, le=100),
    skip: int = Query(0),
):
    """Unauthenticated listing — published reports only."""
    db = get_db()
    cursor = db.reports.find({"status": "published"}).sort("date", -1).skip(skip).limit(limit)
    return [doc_to_out(doc) async for doc in cursor]


# ── Single report (full detail) ───────────────────────────────────────────────

@router.get("/{slug}")
async def get_report(slug: str, user: dict | None = Depends(current_user)):
    db = get_db()
    doc = await db.reports.find_one({"slug": slug})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")

    role = user.get("role", "free") if user else "free"
    is_admin = role in ("admin", "super_admin")

    if not is_admin and doc["status"] != "published":
        raise HTTPException(status_code=404, detail="Report not found")

    out = doc_to_out(doc)
    result = out.model_dump()

    # Include full content fields
    result["content_md"] = doc.get("content_md", "")
    result["stats"] = doc.get("stats", [])

    # Gate headlines, correlations, predictions by tier
    def gate(items: list, key: str = "tier") -> list:
        gated = []
        for item in items:
            item_tier = item.get(key, "free")
            if is_admin:
                gated.append(item)
            elif item_tier == "free":
                gated.append(item)
            elif item_tier == "members" and role in ("members", "paid"):
                gated.append(item)
            elif item_tier == "paid" and role == "paid":
                gated.append(item)
            else:
                # Return stub so client knows gated content exists
                gated.append({"__gated": True, "tier": item_tier})
        return gated

    result["headlines"] = gate(doc.get("headlines", []))
    result["correlations"] = doc.get("correlations", [])  # correlations not tiered
    result["predictions"] = gate(doc.get("predictions", []))

    # Sections with tier-gating
    raw_sections = doc.get("sections", [])
    if raw_sections:
        result["sections"] = [
            s if (is_admin or s.get("tier", "free") == "free"
                  or (s.get("tier") == "members" and role in ("members", "paid"))
                  or (s.get("tier") == "paid" and role == "paid"))
            else {"__gated": True, "tier": s.get("tier"), "part": s.get("part"), "title": s.get("title")}
            for s in raw_sections
        ]
    else:
        result["sections"] = []

    # S3 PDF presigned URL (24 h)
    if doc.get("s3_pdf_key") and (is_admin or role in ("members", "paid")):
        result["pdf_url"] = get_presigned_url(doc["s3_pdf_key"], expires=86400)
    else:
        result["pdf_url"] = None

    return result


# ── Public slug lookup (no auth required) ────────────────────────────────────

@router.get("/public/{slug}")
async def get_public_report(slug: str):
    db = get_db()
    doc = await db.reports.find_one({"slug": slug, "status": "published"})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")

    out = doc_to_out(doc)
    result = out.model_dump()
    result["content_md"] = doc.get("content_md", "")
    result["stats"] = doc.get("stats", [])

    def gate_free(items):
        return [i for i in items if i.get("tier", "free") == "free"]

    result["headlines"] = gate_free(doc.get("headlines", []))
    result["correlations"] = doc.get("correlations", [])
    result["predictions"] = gate_free(doc.get("predictions", []))
    result["pdf_url"] = None

    raw_sections = doc.get("sections", [])
    result["sections"] = [
        s if s.get("tier", "free") == "free"
        else {"__gated": True, "tier": s.get("tier"), "part": s.get("part"), "title": s.get("title")}
        for s in raw_sections
    ]
    return result


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=ReportOut, status_code=201)
async def create_report(
    body: ReportCreate,
    user: dict = Depends(require_admin),
):
    db = get_db()
    base_slug = slugify(body.title)
    slug = base_slug
    n = 1
    while await db.reports.find_one({"slug": slug}):
        slug = f"{base_slug}-{n}"
        n += 1

    doc = new_report_doc(body, slug, user["email"])
    result = await db.reports.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc_to_out(doc)


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{report_id}", response_model=ReportOut)
async def update_report(
    report_id: str,
    body: ReportUpdate,
    user: dict = Depends(require_admin),
):
    from datetime import datetime, timezone
    db = get_db()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc)

    # Recompute read_time if content changed
    if "content_md" in updates:
        words = len(updates["content_md"].split())
        minutes = max(1, round(words / 200))
        updates["read_time"] = f"{minutes} min read"

    result = await db.reports.find_one_and_update(
        {"_id": _oid(report_id)},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Report not found")
    return doc_to_out(result)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: str, user: dict = Depends(require_admin)):
    db = get_db()
    result = await db.reports.delete_one({"_id": _oid(report_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")


# ── PDF upload ────────────────────────────────────────────────────────────────

@router.post("/{report_id}/pdf")
async def upload_pdf(
    report_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_admin),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    db = get_db()
    doc = await db.reports.find_one({"_id": _oid(report_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")

    key = f"reports/{doc['slug']}/report.pdf"
    data = await file.read()
    stored_key = upload_fileobj(io.BytesIO(data), key, content_type="application/pdf")

    from datetime import datetime, timezone
    await db.reports.update_one(
        {"_id": _oid(report_id)},
        {"$set": {"s3_pdf_key": stored_key, "updated_at": datetime.now(timezone.utc)}},
    )

    # Queue PDF ingestion for synthesis
    ingest_report.apply_async(
        args=[report_id, stored_key],
        queue="synthesis",
    )

    return {"ok": True, "s3_key": stored_key}


# ── OG image upload ───────────────────────────────────────────────────────────

@router.post("/{report_id}/og-image")
async def upload_og_image(
    report_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_admin),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Image files only")

    db = get_db()
    doc = await db.reports.find_one({"_id": _oid(report_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Report not found")

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    key = f"reports/{doc['slug']}/og.{ext}"
    data = await file.read()
    upload_fileobj(io.BytesIO(data), key, content_type=file.content_type, public=True)

    og_url = public_url(key)

    from datetime import datetime, timezone
    await db.reports.update_one(
        {"_id": _oid(report_id)},
        {"$set": {"og_image_url": og_url, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"ok": True, "og_image_url": og_url}
