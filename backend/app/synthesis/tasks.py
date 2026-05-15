"""
Celery tasks for report synthesis.

Two modes:
  • Enhanced synthesis  – Editorial uploads a PDF → the configured LLM backend
                         synthesises it enriched with relevant scraped context
                         (recent news, central bank signals, trade data) for the
                         same country/topic.

  • Auto-generation     – When the editorial queue is empty, the system clusters recent
                         scrape_items by country, picks the richest cluster, and generates
                         a Signals Brief automatically (lands as a draft for review).

The LLM call goes through app.synthesis.llm_backend.select_backend(), which
picks between the Ollama-on-Compute-VM path and the JetStream-on-Spot-TPU
path based on SYNTHESIS_BACKEND in backend/.env. Tasks don't know or care
which one runs - the budget-truncation + prompt-formatting logic below is
identical for both.

Flow (enhanced):
  ingest_report → synthesize_report

Flow (auto):
  auto_generate_report → checks queue → builds composite text → calls LLM
"""
import io
import httpx
import pdfplumber
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from celery.utils.log import get_task_logger

from celery_app import celery
from app.config import get_settings
from app.storage.s3 import get_presigned_url
from app.search.qdrant import upsert_chunks

log = get_task_logger(__name__)
settings = get_settings()

# ── Prompt templates ───────────────────────────────────────────────────────────

_SYNTHESIS_PROMPT = """\
You are a strategic analyst at Combined Intelligence using the BISE framework \
(Behavioural, Institutional, Sectoral, Economic).

You have been given:
1. PRIMARY SOURCE — the full text of the report being analysed.
2. SUPPLEMENTARY CONTEXT — recent news articles and signals about the same \
country/region/topic, scraped from African news sources and institutional publications. \
Use this to enrich, cross-check, and add recency to your analysis. \
Do NOT hallucinate facts not present in either source.

Produce a JSON object with exactly these keys:

- "hook": string ≤160 chars — one punchy sentence capturing the key finding
- "subtitle": string ≤80 chars
- "read_time": string e.g. "8 min read"
- "stats": array of 3–5 objects {label, value, desc} — key quantitative findings
- "headlines": array of 4–8 objects {n, title, body, tier}
  - tier: "free" (top-level findings) | "members" (deeper analysis) | "paid" (predictive/strategic)
- "correlations": array of 2–4 objects {id, r, sign, a, b, insight}
  - r: float -1..1, sign: "positive"|"negative"|"neutral"
- "predictions": array of 3–6 objects {id, statement, target, status, outcome, confidence, tier}
  - status: "pending", outcome: null, target: ISO date ~12 months out, confidence: float 0–1
- "context_sources": array of strings — names of supplementary sources that contributed
- "sections": array — the document's structural sections extracted faithfully from the PRIMARY SOURCE.
  Preserve the actual part/chapter order. Aim for 6–12 sections. Do not invent sections.
  Each section object has:
  • "type": one of "narrative" | "kpi_grid" | "correlation_matrix" | "data_table" | "strategic_matrix"
  • "part": integer — sequential section number (1-based)
  • "title": string — section title as it appears in the source document
  • "content": string — for "narrative": 200–500 word markdown prose capturing this section's key points
                         for other types: 1–2 sentence description of what this section shows
  • "tier": "free" | "members" | "paid"
    Use "free" for overview/macro sections, "members" for detailed analysis, "paid" for strategic/forward-looking
  • "data": null for "narrative"; for other types use these exact shapes:
    - kpi_grid:           [{label, value, desc, change}] — change is "+X%" or "-X%" or null
    - correlation_matrix: [{a, b, r, sign, insight}] — r is float -1..1
    - data_table:         {columns: [str], rows: [[str]]}
    - strategic_matrix:   {axes: {x_label, y_label}, cells: [{name, x, y, desc}]}
      where x and y are floats 0–1 representing position on each axis

Return ONLY valid JSON. No markdown fences, no commentary.

━━━ PRIMARY SOURCE ━━━
{primary_text}

━━━ SUPPLEMENTARY CONTEXT ━━━
{context_text}
"""

_AUTOGEN_PROMPT = """\
You are a strategic analyst at Combined Intelligence using the BISE framework.

The editorial team has no submissions today. You have been given a collection of \
recent news articles and signals about {country_or_topic} from African news sources \
and institutional publications. Your task is to synthesise these into a \
"Signals Brief" — a structured analytical report covering the most significant \
recent developments.

Produce a JSON object with exactly these keys:
- "title": string — a compelling report title (max 80 chars)
- "subtitle": string — analytical subtitle (max 80 chars)
- "hook": string ≤160 chars — the single most significant finding
- "stats": array of 3–5 objects {label, value, desc}
- "headlines": array of 4–6 objects {n, title, body, tier}
  - tier: "free"|"members"|"paid"
- "correlations": array of 1–3 objects {id, r, sign, a, b, insight}
- "predictions": array of 2–4 objects {id, statement, target, status, outcome, confidence, tier}
  - status: "pending", outcome: null, confidence: float 0–1
- "read_time": string e.g. "5 min read"
- "content_md": string — a 400–600 word markdown body for the report
- "context_sources": array of strings — names of sources used

Return ONLY valid JSON. No markdown fences, no commentary.

━━━ SIGNALS ({country_or_topic}) ━━━
{signals_text}
"""


# ── Ingest ────────────────────────────────────────────────────────────────────

@celery.task(bind=True, name="app.synthesis.tasks.ingest_report", queue="synthesis",
             max_retries=3, default_retry_delay=60)
def ingest_report(self, report_id: str, s3_key: str):
    """Download PDF, extract text, chunk, embed into Qdrant."""
    log.info("Ingesting report %s from s3://%s", report_id, s3_key)
    _update_job_status(report_id, "processing")
    try:
        url = get_presigned_url(s3_key, expires=300)
        resp = httpx.get(url, timeout=60)
        resp.raise_for_status()

        text = _extract_text(resp.content)
        chunks = _chunk_text(text)
        upsert_chunks(report_id, chunks)
        _store_raw_text(report_id, text)
        log.info("Ingested %d chunks for report %s", len(chunks), report_id)
    except Exception as exc:
        log.exception("Ingest failed for %s", report_id)
        _update_job_status(report_id, "failed", error=str(exc))
        raise self.retry(exc=exc)


# ── Enhanced synthesis ─────────────────────────────────────────────────────────

@celery.task(bind=True, name="app.synthesis.tasks.synthesize_report", queue="synthesis",
             max_retries=2, default_retry_delay=120, time_limit=1800)
def synthesize_report(self, report_id: str):
    """
    Enhanced synthesis: primary report text + scraped contextual signals → LLM.

    Backend is picked from settings.synthesis_backend:
      "ollama_vm"     - Compute VM running Ollama (legacy)
      "tpu_jetstream" - Spot TPU running JetStream/MaxText (new)
    """
    from app.synthesis.llm_backend import select_backend

    log.info("Synthesizing report %s", report_id)
    _update_job_status(report_id, "running")

    backend = select_backend()
    started_here = False
    try:
        started_here = backend.ensure_up()

        primary_text = _get_raw_text(report_id)
        if not primary_text:
            raise RuntimeError("No raw text found — run ingest first")

        report_meta = _get_report_meta(report_id)
        context_text, context_sources = _build_context(report_meta)

        result = _call_llm_enhanced(backend, primary_text, context_text)
        result["context_sources"] = context_sources
        _apply_synthesis(report_id, result)
        _update_job_status(report_id, "completed")
        log.info("Synthesis complete for %s (backend=%s, context sources: %d)",
                 report_id, backend.name, len(context_sources))

    except Exception as exc:
        log.exception("Synthesis failed for %s", report_id)
        _update_job_status(report_id, "failed", error=str(exc))
        raise self.retry(exc=exc)
    finally:
        backend.release(started_here)


# ── Auto-generation ────────────────────────────────────────────────────────────

@celery.task(bind=True, name="app.synthesis.tasks.auto_generate_report", queue="synthesis",
             max_retries=1, time_limit=2400)
def auto_generate_report(self):
    """
    Autopilot mode: if the editorial queue is empty, synthesise a Signals Brief
    from the richest recent scrape cluster.

    A brief is created as status='draft' with auto_generated=True so editorial
    can review before it goes live.
    """
    # ── 1. Check editorial queue ──────────────────────────────────────────────
    db = _db()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=12)
    pending = db.reports.count_documents({
        "status": {"$in": ["draft", "processing"]},
        "auto_generated": {"$ne": True},           # don't count previous auto drafts
        "created_at": {"$gte": cutoff},
    })
    if pending:
        log.info("auto_generate: editorial queue has %d item(s) — skipping", pending)
        return {"skipped": True, "reason": "editorial_queue_not_empty"}

    # ── 2. Find richest scrape cluster ────────────────────────────────────────
    cluster = _find_best_cluster()
    if not cluster:
        log.info("auto_generate: no rich enough cluster found — skipping")
        return {"skipped": True, "reason": "no_cluster"}

    country = cluster["country"]
    items   = cluster["items"]
    log.info("auto_generate: generating brief for '%s' (%d signals)", country, len(items))

    # ── 3. Build signals text ─────────────────────────────────────────────────
    signals_text = _format_signals(items)
    source_names = list({i["source_name"] for i in items})

    # ── 4. Call the configured LLM backend ───────────────────────────────────
    from app.synthesis.llm_backend import select_backend
    backend = select_backend()
    started_here = False
    try:
        started_here = backend.ensure_up()
        result = _call_llm_autogen(backend, country, signals_text)

    except Exception as exc:
        log.exception("auto_generate LLM call failed (backend=%s)", backend.name)
        raise self.retry(exc=exc)
    finally:
        backend.release(started_here)

    # ── 5. Persist as draft report ────────────────────────────────────────────
    from python_slugify import slugify
    title    = result.get("title", f"{country} Signals Brief")
    base_slug = slugify(title)[:80]
    slug = base_slug
    n = 1
    while db.reports.count_documents({"slug": slug}, limit=1):
        slug = f"{base_slug}-{n}"; n += 1

    now = datetime.now(timezone.utc)
    report_doc = {
        "slug":          slug,
        "title":         title,
        "subtitle":      result.get("subtitle", ""),
        "hook":          result.get("hook", ""),
        "tag":           "Signals Brief",
        "domain":        country,
        "year":          str(now.year),
        "date":          now.strftime("%Y-%m-%d"),
        "read_time":     result.get("read_time", "5 min read"),
        "access":        "free",
        "status":        "draft",            # editorial reviews before publishing
        "auto_generated": True,
        "author":        "Combined Intelligence Desk (Auto)",
        "hit_rate":      None,
        "content_md":    result.get("content_md", ""),
        "stats":         result.get("stats", []),
        "headlines":     result.get("headlines", []),
        "correlations":  result.get("correlations", []),
        "predictions":   result.get("predictions", []),
        "context_sources": source_names,
        "constraint_ids": [],
        "s3_pdf_key":    None,
        "og_image_url":  None,
        "created_at":    now,
        "updated_at":    now,
    }
    inserted = db.reports.insert_one(report_doc)
    report_id = str(inserted.inserted_id)

    # Mark scrape items as consumed
    item_ids = [i["_id"] for i in items if "_id" in i]
    if item_ids:
        db.scrape_items.update_many(
            {"_id": {"$in": item_ids}},
            {"$set": {"status": "ingested", "report_id": report_id}},
        )

    log.info("auto_generate: created draft report %s ('%s')", report_id, title)
    return {"report_id": report_id, "slug": slug, "country": country, "signals": len(items)}


# ── Context builder ────────────────────────────────────────────────────────────

def _get_report_meta(report_id: str) -> dict:
    doc = _db().reports.find_one({"_id": ObjectId(report_id)}) or {}
    return {
        "countries": doc.get("domain", ""),
        "tags":      doc.get("tag", "").split(","),
        "title":     doc.get("title", ""),
    }


def _build_context(meta: dict, max_items: int = 8, max_words_per_item: int = 300) -> tuple[str, list[str]]:
    """
    Fetch recent scrape_items relevant to the report's country/topic.
    Returns (formatted_context_text, list_of_source_names).
    """
    db = _db()
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    # Build a filter: match country or tags
    countries = [c.strip() for c in (meta.get("countries") or "").split(",") if c.strip()]
    country_filter = {"countries": {"$in": countries + ["*"]}} if countries else {}

    items = list(
        db.scrape_items.find(
            {**country_filter, "scraped_at": {"$gte": cutoff}, "status": "new"},
            {"title": 1, "summary": 1, "body": 1, "source_name": 1, "date": 1, "url": 1},
        )
        .sort("scraped_at", -1)
        .limit(max_items)
    )

    if not items:
        return "(No supplementary context available.)", []

    parts = []
    sources = []
    for item in items:
        text = item.get("body") or item.get("summary") or ""
        words = text.split()[:max_words_per_item]
        excerpt = " ".join(words)
        date_str = item["date"].strftime("%Y-%m-%d") if item.get("date") else "recent"
        parts.append(
            f"[{item['source_name']} | {date_str}]\n"
            f"Title: {item['title']}\n"
            f"{excerpt}"
        )
        sources.append(item["source_name"])

    return "\n\n---\n\n".join(parts), list(dict.fromkeys(sources))  # deduplicated


def _find_best_cluster(lookback_hours: int = 48, min_items: int = 3) -> dict | None:
    """
    Find the country with the most unprocessed scrape_items in recent hours.
    Returns {"country": str, "items": list[dict]} or None.
    """
    db = _db()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    pipeline = [
        {"$match": {"scraped_at": {"$gte": cutoff}, "status": "new"}},
        {"$unwind": "$countries"},
        {"$match": {"countries": {"$ne": "*"}}},
        {"$group": {"_id": "$countries", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1},
    ]
    rows = list(db.scrape_items.aggregate(pipeline))
    if not rows or rows[0]["count"] < min_items:
        return None

    country = rows[0]["_id"]
    items = list(
        db.scrape_items.find(
            {"countries": country, "scraped_at": {"$gte": cutoff}, "status": "new"},
            {"title": 1, "summary": 1, "body": 1, "source_name": 1, "date": 1, "_id": 1},
        )
        .sort("scraped_at", -1)
        .limit(20)
    )
    return {"country": country, "items": items}


def _format_signals(items: list[dict], max_words_per_item: int = 400) -> str:
    parts = []
    for item in items:
        text = item.get("body") or item.get("summary") or ""
        excerpt = " ".join(text.split()[:max_words_per_item])
        date_str = item["date"].strftime("%Y-%m-%d") if item.get("date") else "recent"
        parts.append(
            f"[{item['source_name']} | {date_str}]\n"
            f"Title: {item['title']}\n"
            f"{excerpt}"
        )
    return "\n\n---\n\n".join(parts)


# ── LLM callers (backend-agnostic) ─────────────────────────────────────────────
# These build the prompt + apply the same word-budget truncation as before,
# then delegate the actual HTTP call to the selected backend (Ollama VM or
# Spot-TPU JetStream). The prompt budgets stay aggressive on purpose: even
# v6e-1 with int8-quantised Gemma 2 9B has a context window  - we'd rather
# truncate the source than spend chip time on tokenising filler text.

def _call_llm_enhanced(backend, primary_text: str, context_text: str) -> dict:
    primary_words = primary_text.split()
    if len(primary_words) > 8000:
        primary_text = " ".join(primary_words[:8000]) + "\n[truncated]"

    context_words = context_text.split()
    if len(context_words) > 4000:
        context_text = " ".join(context_words[:4000]) + "\n[truncated]"

    prompt = _SYNTHESIS_PROMPT.format(
        primary_text=primary_text,
        context_text=context_text,
    )
    from app.synthesis.llm_backend import parse_llm_json
    return parse_llm_json(backend.generate(prompt))


def _call_llm_autogen(backend, country: str, signals_text: str) -> dict:
    words = signals_text.split()
    if len(words) > 10000:
        signals_text = " ".join(words[:10000]) + "\n[truncated]"

    prompt = _AUTOGEN_PROMPT.format(
        country_or_topic=country,
        signals_text=signals_text,
    )
    from app.synthesis.llm_backend import parse_llm_json
    return parse_llm_json(backend.generate(prompt))


# ── Shared helpers ─────────────────────────────────────────────────────────────

def _db():
    from pymongo import MongoClient
    return MongoClient(settings.mongo_url)[settings.mongo_db]


def _extract_text(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        return "\n\n".join(page.extract_text() or "" for page in pdf.pages)


def _chunk_text(text: str, size: int = 500, overlap: int = 50) -> list[str]:
    words = text.split()
    chunks, step = [], size - overlap
    for i in range(0, len(words), step):
        chunk = " ".join(words[i:i + size])
        if chunk:
            chunks.append(chunk)
    return chunks


def _update_job_status(report_id: str, status: str, error: str | None = None) -> None:
    upd: dict = {"status": status, "updated_at": datetime.now(timezone.utc)}
    if error:
        upd["error"] = error
    _db().jobs.update_one({"report_id": report_id}, {"$set": upd}, upsert=True)


def _store_raw_text(report_id: str, text: str) -> None:
    _db().report_texts.update_one(
        {"report_id": report_id},
        {"$set": {"text": text}},
        upsert=True,
    )


def _get_raw_text(report_id: str) -> str | None:
    doc = _db().report_texts.find_one({"report_id": report_id})
    return doc["text"] if doc else None


def _apply_synthesis(report_id: str, data: dict) -> None:
    updates = {"updated_at": datetime.now(timezone.utc), "status": "published"}
    for key in ("stats", "headlines", "correlations", "predictions",
                "hook", "subtitle", "read_time", "content_md", "sections", "context_sources"):
        if key in data:
            updates[key] = data[key]
    _db().reports.update_one({"_id": ObjectId(report_id)}, {"$set": updates})


def _get_report_meta(report_id: str) -> dict:
    doc = _db().reports.find_one({"_id": ObjectId(report_id)}) or {}
    return {
        "countries": doc.get("domain", ""),
        "tags":      doc.get("tag", "").split(","),
        "title":     doc.get("title", ""),
    }
