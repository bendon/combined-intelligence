# Combined Intelligence — Full Build Plan

> **For Cursor:** This document is the single source of truth for the platform.
> Read it fully before writing any code. Every architectural decision is explained.
> When in doubt, follow existing patterns over inventing new ones.

---

## 1. What This Is

**Combined Intelligence** (`combinedintelligence.us`) is an African-centred financial intelligence
publishing platform. The editorial team uploads reports (PDF, PPTX, documents). An AI synthesis
pipeline reads each submission, understands its structure and genre, extracts structured intelligence
using the BISE framework, and generates a uniquely shaped webpage for each report. Readers access
content through tiered memberships. Every forward-looking prediction is tracked publicly in The Ledger.

**BISE framework:** Behavioural · Institutional · Sectoral · Economic

**Core editorial workflow:**
```
Editorial uploads document
        ↓
Classification (Anthropic API) — detects genre, decides page layout
        ↓
Ingestion — extracts text, chunks, embeds into Qdrant
        ↓
Synthesis (Ollama/DeepSeek on GCP VM) — enriched with scraped context
        ↓
Structured report document saved to MongoDB
        ↓
Published — unique webpage rendered by Reader
```

**Autopilot mode** (when editorial queue is empty):
```
Celery Beat triggers at 07:30 UTC
        ↓
Check editorial queue — if empty, find richest scrape cluster by country
        ↓
Generate Signals Brief from cluster → saved as draft for editorial review
```

---

## 2. Tech Stack

### Backend
| Layer | Technology | Version |
|---|---|---|
| Framework | FastAPI | 0.115.5 |
| Server | Uvicorn | 0.32.1 |
| Database | MongoDB (Motor async) | motor 3.6.0 |
| Vector DB | Qdrant | qdrant-client 1.12.1 |
| Task queue | Celery + Redis | 5.4.0 |
| File storage | Scaleway S3 (boto3) | nl-ams region |
| Inference | Ollama (DeepSeek-R1:8b) | on-demand GCP VM |
| Classification | Anthropic API | claude-haiku-4-5-20251001 |
| Auth | Google OAuth2 + JWT cookies | python-jose |
| Push | Web Push VAPID | pywebpush 2.0.0 |
| PDF | pdfplumber | 0.11.4 |
| PPTX | python-pptx | *(to be added)* |
| Scraper | feedparser + trafilatura + bs4 | — |

### Frontend
| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18.3.1 |
| Router | React Router v6 | BrowserRouter (path-based) |
| Build | Vite | 6.0.0 |
| PWA | vite-plugin-pwa | injectManifest strategy |
| Styling | CSS-in-JS (StyleTag) | design tokens in shared.jsx |
| Fonts | Inter + DM Serif Display + JetBrains Mono | Google Fonts |

### Infrastructure
| Component | Technology |
|---|---|
| Reverse proxy | Nginx (TLS, gzip, SPA catch-all) |
| Container orchestration | Docker Compose |
| Celery scheduler | Celery Beat (in-process schedule) |
| Celery monitoring | Flower (basic auth, internal only) |
| Inference VM | GCP Compute Engine (on-demand start/stop) |
| Embedding model | nomic-embed-text via Ollama (768-dim) |
| Synthesis model | deepseek-r1:8b via Ollama |

---

## 3. Repository Structure

```
comban/
├── backend/
│   ├── Dockerfile
│   ├── celery_app.py          # Celery + Beat schedule
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI app, middleware, router registration
│       ├── config.py          # All settings via pydantic-settings
│       ├── database.py        # Motor client + index creation
│       ├── auth/
│       │   ├── google.py      # OAuth2 URL + code exchange
│       │   ├── jwt.py         # Token create/verify, cookie helpers, Depends
│       │   └── router.py      # /api/auth/*
│       ├── reports/
│       │   ├── models.py      # Pydantic models + MongoDB doc builders
│       │   ├── router.py      # /api/reports/* (CRUD, PDF upload, OG image)
│       │   └── og.py          # OG HTML builder for social crawlers
│       ├── synthesis/
│       │   ├── gcp.py         # start_vm / stop_vm / vm_status
│       │   ├── tasks.py       # Celery tasks: ingest, synthesize, auto_generate
│       │   └── router.py      # /api/jobs/* (list, get, trigger synthesis, ingest, auto-gen)
│       ├── search/
│       │   ├── qdrant.py      # Qdrant client + upsert/search/delete
│       │   └── router.py      # /api/search/*
│       ├── push/
│       │   ├── tasks.py       # Celery: send_push_notification
│       │   └── router.py      # /api/push/* (subscribe, unsubscribe, send)
│       ├── scraper/
│       │   ├── sources.py     # 30 African sources as @dataclass Source
│       │   ├── run.py         # _scrape_rss, _scrape_pdf_index, _scrape_html, scrape_all
│       │   ├── tasks.py       # Celery: scrape_news, scrape_reports, scrape_source_task
│       │   └── router.py      # /api/scraper/* (list sources, trigger, browse items, stats)
│       ├── predictions/
│       │   └── router.py      # /api/predictions/* (list, stats, calibration)
│       └── storage/
│           └── s3.py          # upload_fileobj, get_presigned_url, delete_object
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js         # Vite + PWA + /api proxy for dev
│   └── src/
│       ├── main.jsx           # React Router + all lazy-loaded routes
│       ├── api.js             # All API calls (relative /api base)
│       ├── auth.jsx           # AuthProvider, useAuth, LoginButton
│       ├── shared.jsx         # Design tokens CSS + all shared components
│       ├── sw.js              # Service worker (injectManifest)
│       ├── components/
│       │   ├── GlobalNav.jsx  # Sticky nav with hover dropdowns + mobile menu
│       │   └── PageLayout.jsx # PageLayout, ProseLayout, SiteFooter
│       └── pages/
│           ├── Landing.jsx
│           ├── Reader.jsx     # Report reader with SectionRenderer
│           ├── synthesis/
│           │   ├── Method.jsx
│           │   ├── LatestReports.jsx
│           │   └── Library.jsx
│           ├── ledger/
│           │   ├── OpenPredictions.jsx
│           │   ├── ResolvedClaims.jsx
│           │   ├── CalibrationPlot.jsx
│           │   └── Outcomes.jsx
│           ├── desk/
│           │   ├── About.jsx
│           │   ├── Authors.jsx
│           │   ├── EditorialStandards.jsx
│           │   └── Contact.jsx
│           ├── legal/
│           │   ├── Terms.jsx
│           │   ├── Privacy.jsx
│           │   ├── Methodology.jsx
│           │   └── Sources.jsx
│           └── cms/           # Admin only — behind AdminRoute guard
│               ├── Layout.jsx
│               ├── Reports.jsx
│               ├── Editor.jsx
│               └── Jobs.jsx
│
└── infra/
    ├── docker-compose.yml
    ├── .env.example
    ├── nginx/
    │   └── combinedintelligence.us.conf
    └── gcp/
        └── vm-bootstrap.sh    # Installs Ollama, pulls models
```

---

## 4. Environment Variables (complete)

All variables live in `infra/.env` (gitignored). Copy from `infra/.env.example`.

```bash
# Application
BASE_URL=https://combinedintelligence.us
COOKIE_DOMAIN=combinedintelligence.us
COOKIE_SECURE=true
ENVIRONMENT=production          # "development" enables /api/docs

# Google OAuth2 (console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://combinedintelligence.us/api/auth/google/callback

# JWT
JWT_SECRET=                     # python -c "import secrets; print(secrets.token_hex(32))"
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080        # 7 days

# MongoDB
MONGO_USER=ci_admin
MONGO_PASSWORD=
MONGO_DB=combined_intelligence
MONGO_URL=mongodb://ci_admin:PASSWORD@mongo:27017/combined_intelligence?authSource=admin

# Redis
REDIS_PASSWORD=
REDIS_URL=redis://:PASSWORD@redis:6379/0

# Qdrant
QDRANT_URL=http://qdrant:6333

# Scaleway S3 (nl-ams region)
S3_ENDPOINT_URL=https://s3.nl-ams.scw.cloud
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=combined-intelligence-assets

# GCP (Ollama VM)
GCP_PROJECT=
GCP_ZONE=us-central1-a
GCP_VM_INSTANCE=ci-ollama-inference
GOOGLE_APPLICATION_CREDENTIALS=/app/gcp/service-account.json

# Ollama (GCP VM external/internal IP)
OLLAMA_BASE_URL=http://10.128.0.x:11434
OLLAMA_MODEL=deepseek-r1:8b

# VAPID (Web Push)
VAPID_PRIVATE_KEY=
VAPID_PUBLIC_KEY=
VAPID_CLAIMS_SUB=mailto:desk@combinedintelligence.us

# External LLM APIs (optional — for classification pipeline)
ANTHROPIC_API_KEY=              # claude-haiku-4-5-20251001 for classification
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
OPENAI_API_KEY=                 # fallback if Anthropic unavailable
OPENAI_MODEL=gpt-4o-mini

# Flower monitoring
FLOWER_USER=admin
FLOWER_PASSWORD=
```

---

## 5. MongoDB Collections & Schemas

### `users`
```json
{
  "_id": ObjectId,
  "google_id": "string (unique)",
  "email": "string (unique)",
  "name": "string",
  "picture": "string (URL)",
  "role": "free | members | paid | admin | super_admin",
  "created_at": ISODate,
  "last_login": ISODate
}
```
**Indexes:** `email` (unique), `google_id` (unique, sparse)

### `reports`
```json
{
  "_id": ObjectId,
  "slug": "string (unique)",
  "title": "string",
  "subtitle": "string",
  "hook": "string (≤160 chars)",
  "tag": "string (e.g. 'Strategic Sector', 'Signals Brief')",
  "domain": "string (country or region, comma-separated)",
  "year": "string",
  "date": "YYYY-MM-DD",
  "read_time": "string (e.g. '8 min read')",
  "access": "free | members | paid",
  "status": "draft | processing | published | retired",
  "author": "string (email or display name)",
  "auto_generated": "boolean (true for autopilot briefs)",
  "layout": "narrative | data-brief | thesis | slide-digest (set by classification)",
  "hit_rate": "float | null",

  "content_md": "string (prose fallback for auto-generated reports)",
  "sections": [
    {
      "type": "narrative | kpi_grid | correlation_matrix | data_table | strategic_matrix",
      "part": 1,
      "title": "string",
      "content": "string (markdown for narrative; description for others)",
      "tier": "free | members | paid",
      "data": null
    }
  ],
  "stats": [{"label": "", "value": "", "desc": ""}],
  "headlines": [{"n": "01", "title": "", "body": "", "tier": "free|members|paid"}],
  "correlations": [{"id": "", "r": 0.83, "sign": "positive|negative|neutral", "a": "", "b": "", "insight": ""}],
  "predictions": [
    {
      "id": "",
      "statement": "",
      "target": "YYYY-MM-DD",
      "status": "pending | resolved",
      "outcome": "true | false | partial | null",
      "confidence": 0.75,
      "tier": "free | members | paid"
    }
  ],
  "context_sources": ["string"],
  "constraint_ids": ["ObjectId string"],
  "s3_pdf_key": "string | null (e.g. reports/rwanda-2026/report.pdf)",
  "og_image_url": "string | null (public S3 URL)",
  "created_at": ISODate,
  "updated_at": ISODate
}
```
**Indexes:** `slug` (unique), `status`, text index on `title + hook`

### `scrape_items`
```json
{
  "_id": ObjectId,
  "url_hash": "string (SHA256 of URL, unique)",
  "source_id": "string (from sources.py)",
  "source_name": "string",
  "feed_type": "rss | pdf | html",
  "url": "string",
  "title": "string",
  "summary": "string",
  "body": "string (full extracted text)",
  "date": ISODate,
  "countries": ["Rwanda", "Kenya"],
  "tags": ["banking", "fintech"],
  "status": "new | ingested | failed",
  "scraped_at": ISODate,
  "s3_pdf_key": "string | null (for PDF items)",
  "report_id": "string | null (set when consumed by synthesis)"
}
```
**Indexes:** `url_hash` (unique), `source_id`, `status`, `type`, `scraped_at`, `countries`

### `jobs`
```json
{
  "_id": ObjectId,
  "report_id": "string",
  "status": "pending | running | completed | failed",
  "error": "string | null",
  "created_at": ISODate,
  "updated_at": ISODate
}
```
**Indexes:** `status`, `report_id`, `created_at`

### `push_subscriptions`
```json
{
  "_id": ObjectId,
  "user_id": "string",
  "endpoint": "string (unique)",
  "keys": {"p256dh": "", "auth": ""},
  "created_at": ISODate
}
```

### `report_texts`
```json
{
  "_id": ObjectId,
  "report_id": "string",
  "text": "string (full extracted text for synthesis)"
}
```

---

## 6. API Endpoints

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/google/login` | — | Redirect to Google consent screen |
| GET | `/google/callback` | — | Exchange code, set JWT cookie, redirect to / |
| POST | `/logout` | — | Clear auth cookie |
| GET | `/me` | JWT | Return current user from DB |

### Reports — `/api/reports`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | JWT (admin sees all, others see published) | List reports |
| GET | `/public` | — | List published reports (no auth) |
| GET | `/{slug}` | JWT optional | Full report with tier-gating |
| GET | `/public/{slug}` | — | Published report, free-tier only |
| POST | `/` | Admin | Create draft report |
| PATCH | `/{report_id}` | Admin | Update report fields |
| DELETE | `/{report_id}` | Admin | Delete report |
| POST | `/{report_id}/pdf` | Admin | Upload PDF → S3, queue ingest |
| POST | `/{report_id}/og-image` | Admin | Upload OG image → S3 (public) |

### Jobs — `/api/jobs`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Admin | List jobs (filter by status) |
| GET | `/{job_id}` | Admin | Get single job |
| POST | `/synthesize/{report_id}` | Admin | Queue synthesis for report |
| POST | `/ingest/{report_id}` | Admin | Re-queue PDF ingestion |
| POST | `/auto-generate` | Admin | Manually trigger autopilot generation |

### Search — `/api/search`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/?q=...` | JWT optional | Semantic search (Qdrant) |

### Predictions — `/api/predictions`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List predictions (filter: status, tier, limit) |
| GET | `/stats` | — | Aggregate counts + hit_rate |
| GET | `/calibration` | — | 5 confidence buckets (observed vs expected) |

### Push — `/api/push`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/vapid-public-key` | — | Return VAPID public key |
| POST | `/subscribe` | JWT | Save push subscription |
| DELETE | `/unsubscribe` | JWT | Remove push subscription |
| POST | `/send` | Admin | Send push to all subscribers |

### Scraper — `/api/scraper`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/sources` | Admin | List all configured sources |
| POST | `/run` | Admin | Trigger full scrape (body: feed_types, source_ids) |
| POST | `/source/{source_id}` | Admin | Trigger single source scrape |
| GET | `/items` | Admin | Browse scrape_items (filter: status, country, source) |
| GET | `/stats` | Admin | Items per source + feed_type breakdown |

---

## 7. The Synthesis Pipeline (Full Detail)

### Step 1: Document Classification (NOT YET IMPLEMENTED)

When editorial uploads a PDF or PPTX:

1. Extract full text (PDF → pdfplumber, PPTX → python-pptx)
2. If PPTX: also extract speaker notes and render slides as images
3. Call **Anthropic API** (claude-haiku-4-5-20251001) with extracted text
4. Classification prompt returns:
   ```json
   {
     "layout": "narrative | data-brief | thesis | slide-digest",
     "genre": "country-brief | sector-report | signals-brief | thesis | policy-paper",
     "dominant_section_types": ["narrative", "kpi_grid", "correlation_matrix"],
     "countries": ["Rwanda", "Kenya"],
     "topic_tags": ["banking", "fintech", "mobile-money"],
     "language_tone": "analytical | journalistic | advocacy",
     "estimated_sections": 9
   }
   ```
5. Save `layout`, `domain` (countries), `tag` (genre) to the report document
6. Start GCP VM spin-up **in parallel** (saves time vs waiting for synthesis)
7. Queue `ingest_report` Celery task

**Classification implementation file to create:**
`backend/app/synthesis/classify.py`

```python
# async def classify_document(text: str, filename: str, settings) -> dict:
#   Uses settings.anthropic_api_key if available, else falls back to basic heuristics
#   Returns layout, genre, countries, topic_tags, dominant_section_types
```

### Step 2: Ingestion (`ingest_report` Celery task)

1. Download PDF from S3 presigned URL
2. Extract text with pdfplumber
3. Chunk text (500 words, 50-word overlap)
4. Generate embeddings via Ollama `nomic-embed-text` (768-dim)
5. Upsert chunks to Qdrant collection `report_chunks`
6. Store full text in `report_texts` collection

### Step 3: Synthesis (`synthesize_report` Celery task)

1. Start GCP VM if not running (`gcp.py: start_vm()`)
2. Wait for Ollama to be ready (poll `/api/tags`, 24 retries × 5s)
3. Fetch raw text from `report_texts`
4. Fetch supplementary context from `scrape_items` (last 30 days, matching countries)
5. Call Ollama with `_SYNTHESIS_PROMPT` — primary text (8k words) + context (4k words)
6. Prompt instructs model to output JSON with:
   - `hook`, `subtitle`, `read_time`
   - `stats[]`, `headlines[]`, `correlations[]`, `predictions[]`
   - `context_sources[]`
   - `sections[]` — structured breakdown matching the document's actual part structure
7. Save all fields to the report document, set `status: "published"`
8. Stop GCP VM (unless it was already running when task started)

### Step 4: Section Extraction (Prompt-driven)

The synthesis prompt instructs the model to extract `sections[]` matching the document's real structure:

| Section type | `data` shape | When to use |
|---|---|---|
| `narrative` | null | Prose analysis sections |
| `kpi_grid` | `[{label, value, desc, change}]` | Stat-heavy overviews |
| `correlation_matrix` | `[{a, b, r, sign, insight}]` | Correlation findings |
| `data_table` | `{columns, rows}` | Province/bank breakdowns |
| `strategic_matrix` | `{axes:{x_label,y_label}, cells:[{name,x,y,desc}]}` | Positioning matrices |

Each section has `tier: "free|members|paid"` for access gating.

### Autopilot Mode (`auto_generate_report` Celery task)

Runs at 07:30 UTC via Beat if editorial queue is empty:

1. Count reports created by humans in last 12h with status draft/processing
2. If count > 0: skip (editorial has content)
3. Find country with most `scrape_items` in last 48h (min 3 items)
4. Format top 20 items as signals text
5. Call Ollama with `_AUTOGEN_PROMPT` — produces `content_md` (prose body)
6. Save as `status: "draft"`, `auto_generated: true`
7. Mark consumed scrape_items as `status: "ingested"`

---

## 8. The Reader — How Reports Render

The Reader (`pages/Reader.jsx`) branches on `report.sections?.length > 0`:

**If `sections` exist (editorial PDFs):**
- Each section routed through `SectionRenderer` by `type`
- `NarrativeSection` — prose with left accent border coloured by tier
- `KpiGridSection` — card grid with value, change indicator, desc
- `CorrelationMatrixSection` — pair labels + proportional bar (green=positive, red=negative)
- `DataTableSection` — HTML table with column headers from data
- `StrategicMatrixSection` — 2D scatter chart + card list below

**If no sections (auto-generated Signals Briefs):**
- Falls back to `BodyContent` rendering `content_md` with `:::members` / `:::paid` fence gating

**Tier gating:**
- Backend gates at the API level — gated sections returned as `{__gated: true, tier, part, title}`
- Reader renders `GatedSection` for gated items (shows title, prompts upgrade)
- Headlines and predictions similarly gated

---

## 9. Frontend Routes

```
/                          Landing
/reports/:slug             Reader (public or authenticated)
/synthesis/method          The Method (BISE framework explanation)
/synthesis/reports         Latest Reports (grid)
/synthesis/library         The Library (filterable list)
/synthesis/rwanda-2026     Featured report redirect (or specific report page)
/ledger/open               Open Predictions table
/ledger/resolved           Resolved Claims table
/ledger/calibration        Calibration Plot
/ledger/outcomes           Outcomes & hit rate stats
/desk/about                About
/desk/authors              Authors
/desk/editorial-standards  Editorial Standards
/desk/contact              Contact
/legal/terms               Terms of Service
/legal/privacy             Privacy Policy
/legal/methodology         Methodology
/legal/sources             Sources & Data
/cms/reports               Admin: report list
/cms/reports/:id/edit      Admin: report editor
/cms/jobs                  Admin: synthesis jobs monitor

/synthesis  → redirect to /synthesis/method
/ledger     → redirect to /ledger/open
/desk       → redirect to /desk/about
/legal      → redirect to /legal/terms
```

All routes are lazy-loaded. Admin routes wrapped in `AdminRoute` guard (checks `user.role`).

---

## 10. Frontend Design System

**All CSS lives in `src/shared.jsx` as the `TOKENS` string inside a `<style>` tag.**
No external CSS files. No CSS modules. Every page imports `<StyleTag />`.

**Design tokens:**
```
--obsidian: #0d0d14  (page background)
--carbon:   #13131f  (card/section background)
--surface:  #1a1a2e  (input/hover background)
--border:   #2a2a3e
--muted:    #6b7280
--text:     #e2e8f0
--accent:   #f97316  (orange — primary CTA, active states)
--blue:     #3b82f6
--purple:   #6366f1  (members tier)
--green:    #10b981  (free tier, correct outcomes)
--red:      #ef4444  (wrong outcomes, negative correlations)
```

**Fonts (Google Fonts):**
- `Inter` — body text
- `DM Serif Display` — headings, titles, wordmark
- `JetBrains Mono` — code, numbers, stats

**Responsive breakpoints:**
- `768px` — tablet: nav collapses to burger, CMS sidebar becomes tab bar, editor stacks
- `640px` — large phone: grids collapse, typography scales down, CTAs stack
- `480px` — small phone: BISE single column, tables compress, full-width buttons

**Key shared components (exported from `shared.jsx`):**
- `StyleTag` — renders all CSS
- `CILogoMark` — SVG logo (orange + purple overlapping squares)
- `Pill` — tag chip
- `TierBadge` — free/members/paid badge
- `StatusDot` — coloured dot for job/report status
- `StatCard` — KPI card (label, value, desc)
- `GatedBlock` — "requires X membership" prompt

---

## 11. GlobalNav Structure

```
COMBINED INTELLIGENCE [logo]

SYNTHESIS ▾          LEDGER ▾         DESK ▾           LEGAL ▾
  The Method           Open Predictions   About             Terms
  Latest Reports       Resolved Claims    Authors           Privacy
  The Library          Calibration Plot   Editorial Stds    Methodology
  Rwanda 2026 ★        Outcomes           Contact           Sources
```

- Hover to open dropdowns (120ms close delay to prevent flicker)
- Active section detection via `useLocation` path prefix
- Mobile: burger → vertical stacked sections with all links visible
- `★ Rwanda 2026` marked with `accent` class (orange text)

---

## 12. The Scraper System

### Sources (`app/scraper/sources.py`)
30 African sources across three feed types:

**RSS feeds** — feedparser → trafilatura full-text extraction:
- Business Daily Africa, The East African, AllAfrica, The Africa Report
- This is Africa, Financial Afrik, Quartz Africa, TechCabal
- South African: Business Day, Fin24, Daily Maverick
- West Africa: Businessday NG, Ventures Africa

**PDF indexes** — BeautifulSoup scans for .pdf hrefs:
- African Development Bank publications
- IMF Africa regional reports
- World Bank Africa data
- Central Bank of Kenya, SARB, BNR (Rwanda), CBN, Bank of Ghana
- African Export-Import Bank

**Source fields:**
```python
@dataclass
class Source:
    id: str
    name: str
    url: str
    feed_type: str          # "rss" | "pdf" | "html"
    countries: list[str]    # e.g. ["Kenya", "*"] (* = pan-African)
    tags: list[str]
    rate_limit: float       # seconds between requests
    auto_synthesize: bool   # True → auto-create report when PDF scraped
    pdf_must_contain: list[str]  # filter PDFs by keyword in URL
    pdf_min_size_kb: int    # ignore tiny PDFs
```

### Celery Beat Schedule
```
scrape-news-feeds   → scrape_news()    every 2h at :15 (RSS only)
scrape-report-pdfs  → scrape_reports() daily at 06:00 + 18:00 UTC (PDF only)
auto-generate-brief → auto_generate_report() daily at 07:30 UTC
```

### Deduplication
Every URL is SHA256-hashed and stored as `url_hash` with a unique index.
Duplicate URLs are silently skipped (upsert with `$setOnInsert`).

---

## 13. Infrastructure

### Docker Compose Services

| Service | Image | Purpose | Ports |
|---|---|---|---|
| `mongo` | mongo:7 | Primary database | 127.0.0.1:27017 |
| `qdrant` | qdrant/qdrant:v1.9.2 | Vector search | 127.0.0.1:6333 |
| `redis` | redis:7-alpine | Celery broker + backend | 127.0.0.1:6379 |
| `api` | ./backend | FastAPI (2 workers) | 127.0.0.1:8000 |
| `worker-synthesis` | ./backend | Celery synthesis queue, concurrency 1 | — |
| `worker-push` | ./backend | Celery push queue, concurrency 4 | — |
| `beat` | ./backend | Celery Beat scheduler | — |
| `flower` | ./backend | Celery monitoring | 127.0.0.1:5555 |

All bound to 127.0.0.1 — Nginx is the only public entry point.

### Nginx
- HTTP → HTTPS redirect
- `/api/*` → proxy to FastAPI on port 8000 (timeout 600s for long synthesis)
- `/flower/*` → proxy to Flower, restricted to internal IPs
- Static assets (js/css/images) — 1-year cache, immutable
- All other routes → `index.html` (React Router handles)
- TLS via Let's Encrypt (certbot)

### GCP VM (Ollama)
The inference VM is **stopped when idle** and **started on demand** when synthesis runs.
This keeps inference costs near-zero between reports.

VM spec recommendation: n1-standard-4 with T4 GPU or n2-standard-8 CPU-only.

Bootstrap script (`gcp/vm-bootstrap.sh`):
```bash
# Installs Ollama, pulls deepseek-r1:8b and nomic-embed-text
curl -fsSL https://ollama.com/install.sh | sh
ollama pull deepseek-r1:8b
ollama pull nomic-embed-text
```

### Single-Origin Architecture
There is **no API subdomain**. The frontend talks to `/api/*` which Nginx proxies to FastAPI.
In dev: Vite proxies `/api` to `http://localhost:8000` (configured in `vite.config.js`).
In production: Nginx handles the proxy. JWT cookies use `domain=combinedintelligence.us`,
`samesite=lax`, `secure=true`, `httponly=true`.

---

## 14. Authentication Flow

```
User clicks "Sign in with Google"
    ↓
GET /api/auth/google/login
    → generates CSRF state token, stores in memory _pending_states
    → redirects to Google consent screen
    ↓
User consents → Google redirects to:
GET /api/auth/google/callback?code=...&state=...
    → validates state, discards from set
    → exchanges code for Google user info via httpx
    → upserts user in MongoDB (role defaults to "free" on first login)
    → creates JWT (sub=user_id, email, role, exp=7 days)
    → sets HttpOnly cookie: ci_token
    → redirects to https://combinedintelligence.us
    ↓
Frontend useAuth() calls GET /api/auth/me on load
    → validates JWT from cookie
    → returns user doc from MongoDB
```

**Roles:** `free` · `members` · `paid` · `admin` · `super_admin`

**Note:** `_pending_states` is an in-memory Python set. For multi-instance deployments,
move CSRF state to Redis (key: `oauth_state:{state}`, TTL 300s).

---

## 15. Web Push Flow

```
User opts in → browser requests permission
    ↓
Frontend calls Notification.requestPermission()
    → fetch VAPID public key: GET /api/push/vapid-public-key
    → serviceWorker.pushManager.subscribe({userVisibleOnly: true, applicationServerKey})
    → POST /api/push/subscribe (endpoint + keys saved to push_subscriptions)
    ↓
When new report published:
    → POST /api/push/send (admin triggers)
    → Celery task: send_push_notification (queue: push, concurrency: 4)
    → pywebpush sends to each subscription endpoint
    → Browser shows notification → click opens /reports/:slug
```

---

## 16. What Is BUILT (Status: Complete)

- [x] FastAPI app structure, all routers, all middleware
- [x] Google OAuth2 + JWT cookie auth
- [x] MongoDB Motor async client + all indexes
- [x] Reports CRUD with tier-gating
- [x] PDF upload to Scaleway S3 + ingest queue
- [x] OG image upload to S3 (public)
- [x] Bot-detection middleware → pre-rendered OG HTML for social crawlers
- [x] Qdrant vector search (nomic-embed-text 768-dim)
- [x] Celery synthesis tasks (ingest + synthesize + auto_generate)
- [x] GCP VM on-demand start/stop
- [x] Synthesis prompt with `sections[]` extraction
- [x] Scraper system (RSS + PDF + HTML, 30 sources)
- [x] Celery Beat schedule (scrape news 2h, PDFs 2x/day, auto-gen 07:30)
- [x] Push notifications (VAPID, pywebpush)
- [x] Predictions router (list, stats, calibration)
- [x] All frontend pages (18+ routes, lazy-loaded)
- [x] GlobalNav with hover dropdowns + mobile burger
- [x] SiteFooter
- [x] Reader with `SectionRenderer` (5 section types)
- [x] Tier-gated content (backend + frontend)
- [x] Responsive design (320px → 1440px, 3 breakpoints)
- [x] CMS admin pages (reports list, editor, jobs monitor)
- [x] PWA service worker
- [x] Docker Compose (all services)
- [x] Nginx config (TLS, proxy, SPA)
- [x] GCP VM bootstrap script
- [x] External LLM config (Anthropic + OpenAI keys wired in settings)

---

## 17. What Is NOT YET BUILT (Needs Implementation)

### Priority 1: Classification Pipeline
**File to create:** `backend/app/synthesis/classify.py`

The most important missing piece. Without it, every report uses the same synthesis prompt
regardless of document type and the `layout` field is never set.

```python
async def classify_document(text: str, filename: str) -> dict:
    """
    Call Anthropic API if key available, else fall back to heuristics.
    Returns: {layout, genre, countries, topic_tags, dominant_section_types}
    """
```

Wire into `ingest_report` task: after text extraction, before chunking, call classify.
Save results to the report document (`layout`, `domain` if empty, `tag` if empty).
Start GCP VM in parallel thread while classification runs.

### Priority 2: PPTX Ingestion
**Dependency to add:** `python-pptx==1.0.2` to `requirements.txt`

```python
# In tasks.py — add to _extract_text():
def _extract_pptx(pptx_bytes: bytes) -> str:
    from pptx import Presentation
    prs = Presentation(io.BytesIO(pptx_bytes))
    parts = []
    for slide in prs.slides:
        title = slide.shapes.title
        if title: parts.append(f"## {title.text}")
        for shape in slide.shapes:
            if shape.has_text_frame:
                parts.append(shape.text_frame.text)
        # Speaker notes
        if slide.has_notes_slide:
            notes = slide.notes_slide.notes_text_frame.text
            if notes.strip():
                parts.append(f"[Speaker notes: {notes}]")
    return "\n\n".join(parts)
```

Also update `upload_pdf` endpoint to accept PPTX:
- Accept `content_type` of `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- Route to `_extract_pptx` instead of pdfplumber in the ingest task

### Priority 3: Layout-aware Synthesis
Once classification sets `layout` on the report, the synthesis prompt should be
selected based on that layout. Add a `_LAYOUT_PROMPTS` dict in `tasks.py`:

```python
_LAYOUT_PROMPTS = {
    "narrative":    _SYNTHESIS_PROMPT,     # current default
    "data-brief":   _DATA_BRIEF_PROMPT,    # emphasises tables, matrices, correlations
    "thesis":       _THESIS_PROMPT,        # argument-led: claim → evidence → implication
    "slide-digest": _SLIDE_DIGEST_PROMPT,  # slide-by-slide summary + synthesis
}
```

### Priority 4: Admin User Management
No endpoint exists to change a user's role. Admins currently need direct MongoDB access.

**Endpoint to add to reports router or new `users` router:**
```
GET    /api/users          — list users (admin only)
PATCH  /api/users/:id      — update role (super_admin only)
```

### Priority 5: Redis CSRF State
`_pending_states` in `auth/router.py` is an in-memory Python set.
In a multi-container deployment this breaks because OAuth callbacks may hit a different
container than the one that generated the state.

**Fix:** Move to Redis. On login: `redis.setex(f"oauth:{state}", 300, "1")`.
On callback: `redis.get(f"oauth:{state}")` then `redis.delete(f"oauth:{state}")`.

### Priority 6: Report `sections` in Pydantic Models
`ReportUpdate` model and `new_report_doc` don't include `sections` or `layout`.
Add them so the editor can also manually set/override sections.

```python
# In models.py — add:
class Section(BaseModel):
    type: str
    part: int
    title: str
    content: str
    tier: AccessTier
    data: dict | list | None = None

# In ReportUpdate:
sections: list[Section] | None = None
layout: str | None = None

# In new_report_doc:
"sections": [],
"layout": None,
```

---

## 18. Coding Conventions

### Backend
- All route handlers are `async def`
- Database calls use Motor async (`await db.collection.find_one(...)`)
- Celery tasks use synchronous pymongo (`_db()` returns a sync MongoClient)
  because Celery workers run in synchronous context
- Settings accessed via `get_settings()` (cached with `@lru_cache`)
- No raw SQL — MongoDB only
- Error responses: `raise HTTPException(status_code=..., detail="...")`
- Avoid try/except unless doing specific error handling — let FastAPI handle validation errors
- JWT lives in `ci_token` HttpOnly cookie only — never in response body
- All file uploads go to S3 first, then reference by key — never store files locally

### Frontend
- No CSS files — all styles in `shared.jsx` TOKENS string
- Inline styles only for truly one-off values (colours, margins) — use classes for layout
- `clamp()` for fluid sizing, `min()` inside `minmax()` for grid safety
- All API calls through `src/api.js` — never fetch directly in components
- No `useEffect` chains — one fetch per component mount
- Lazy-load all pages via `React.lazy()` in `main.jsx`
- Auth state in `useAuth()` from `auth.jsx` — never passed as props
- Gated content: backend gates first (returns stub), frontend renders `GatedBlock`
- Do not use `target="_blank"` without `rel="noreferrer"`

### General
- No `.env` in version control — only `.env.example`
- All secrets via environment variables — never hardcoded
- Docker services bind to `127.0.0.1` only — Nginx is the sole public listener
- Celery tasks: `bind=True`, `max_retries`, `default_retry_delay` always set
- GCP VM: always stop in `finally` block of synthesis tasks

---

## 19. Local Development Setup

```bash
# 1. Start infrastructure
cd infra
cp .env.example .env   # fill in values
docker compose up -d mongo qdrant redis

# 2. Backend
cd ../backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Celery worker (separate terminal)
celery -A celery_app worker -Q synthesis,push -c 2 --loglevel=info

# 4. Frontend
cd ../frontend
npm install
npm run dev   # Vite dev server on :5173, proxies /api to :8000
```

**Note:** Ollama synthesis will fail without the GCP VM. For local dev, install Ollama locally
(`ollama serve`) and set `OLLAMA_BASE_URL=http://localhost:11434` in your `.env`.

---

## 20. Deployment

```bash
# On the production server (Ubuntu 22.04 LTS)

# 1. Install Docker + Nginx + Certbot
# 2. Clone repo
# 3. Copy and fill in infra/.env
# 4. Copy GCP service account JSON to infra/gcp/service-account.json
# 5. Build and start all services
cd infra
docker compose up -d --build

# 6. Build frontend
cd ../frontend
npm install && npm run build
# Copy dist/ to /var/www/combinedintelligence.us/

# 7. Nginx
cp infra/nginx/combinedintelligence.us.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/combinedintelligence.us.conf /etc/nginx/sites-enabled/
certbot --nginx -d combinedintelligence.us -d www.combinedintelligence.us
nginx -t && systemctl reload nginx

# 8. Create first admin user
# Login with Google → find your user in MongoDB → set role to "super_admin"
# mongosh
# use combined_intelligence
# db.users.updateOne({email: "your@email.com"}, {$set: {role: "super_admin"}})
```

---

## 21. Key Design Decisions (Do Not Change Without Understanding)

**Why HTTP-only cookies, not localStorage for JWT?**
Prevents XSS from stealing tokens. Cookies are sent automatically — no auth header management.

**Why path-based routing, not hash routing (`#/reports/slug`)?**
Social media crawlers and OG scrapers ignore everything after `#`. Path-based routes
allow the bot-detection middleware to return pre-rendered OG HTML for social sharing.

**Why Ollama on an on-demand GCP VM, not an API?**
Cost. Synthesis runs for 5–20 minutes per report. At API token pricing this would be
expensive at scale. On a $50/month VM (off most of the time), marginal cost per report
is cents.

**Why Anthropic API for classification but Ollama for synthesis?**
Classification is a small, fast, one-time operation — frontier models are measurably
better at genre understanding. Synthesis is long, expensive per-token at API rates,
and runs on our own hardware where we control the cost.

**Why Qdrant separate from MongoDB?**
Vector similarity search. MongoDB Atlas Search has vector support but requires Atlas
(managed, expensive). Qdrant is purpose-built, open-source, runs in Docker.

**Why nomic-embed-text for embeddings?**
768-dimensional, runs on the same Ollama instance as synthesis. No separate embedding API.
Good quality for document retrieval. Free.

**Why two Celery queues (synthesis, push)?**
Synthesis tasks are slow (minutes), resource-heavy (GCP VM), and concurrency 1.
Push tasks are fast (milliseconds), I/O-bound, and concurrency 4. Mixing them would
cause push notifications to queue behind synthesis jobs.
