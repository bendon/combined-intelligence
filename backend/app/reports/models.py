from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field
from bson import ObjectId


# ── Tier / access ─────────────────────────────────────────────────────────────
AccessTier = Literal["free", "members", "paid"]
ReportStatus = Literal["draft", "processing", "published", "retired"]


# ── Pydantic models (API layer) ───────────────────────────────────────────────
class StatBlock(BaseModel):
    label: str
    value: str
    desc: str


class Headline(BaseModel):
    n: str
    title: str
    body: str
    tier: AccessTier


class Correlation(BaseModel):
    id: str
    r: float
    sign: str
    a: str
    b: str
    insight: str


class Prediction(BaseModel):
    id: str
    statement: str
    target: str                     # ISO date string
    status: Literal["pending", "resolved"]
    outcome: Literal["true", "false", "partial"] | None = None
    confidence: float | None = None
    tier: AccessTier


class ReportCreate(BaseModel):
    title: str
    subtitle: str = ""
    hook: str = ""
    tag: str = "Strategic Sector"
    domain: str = ""
    year: str = ""
    access: AccessTier = "paid"


class ReportUpdate(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    hook: str | None = None
    status: ReportStatus | None = None
    access: AccessTier | None = None
    content_md: str | None = None
    stats: list[StatBlock] | None = None
    headlines: list[Headline] | None = None
    correlations: list[Correlation] | None = None
    predictions: list[Prediction] | None = None
    constraint_ids: list[str] | None = None


class ReportOut(BaseModel):
    id: str
    slug: str
    title: str
    subtitle: str
    hook: str
    tag: str
    domain: str
    year: str
    date: str
    read_time: str
    access: AccessTier
    status: ReportStatus
    hit_rate: float | None
    author: str
    og_image_url: str | None = None


# ── MongoDB document builder ──────────────────────────────────────────────────
def new_report_doc(data: ReportCreate, slug: str, author_email: str) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "slug": slug,
        "title": data.title,
        "subtitle": data.subtitle,
        "hook": data.hook,
        "tag": data.tag,
        "domain": data.domain,
        "year": data.year or str(now.year),
        "date": now.strftime("%Y-%m-%d"),
        "read_time": "—",
        "access": data.access,
        "status": "draft",
        "author": author_email,
        "hit_rate": None,
        "content_md": "",
        "stats": [],
        "headlines": [],
        "correlations": [],
        "predictions": [],
        "constraint_ids": [],
        "s3_pdf_key": None,
        "og_image_url": None,
        "created_at": now,
        "updated_at": now,
    }


def doc_to_out(doc: dict) -> ReportOut:
    return ReportOut(
        id=str(doc["_id"]),
        slug=doc["slug"],
        title=doc["title"],
        subtitle=doc.get("subtitle", ""),
        hook=doc.get("hook", ""),
        tag=doc.get("tag", ""),
        domain=doc.get("domain", ""),
        year=doc.get("year", ""),
        date=doc.get("date", ""),
        read_time=doc.get("read_time", "—"),
        access=doc["access"],
        status=doc["status"],
        hit_rate=doc.get("hit_rate"),
        author=doc.get("author", "Combined Intelligence Desk"),
        og_image_url=doc.get("og_image_url"),
    )
