from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import re

from app.config import get_settings
from app.database import init_indexes, close_db
from app.auth.router import router as auth_router
from app.reports.router import router as reports_router
from app.reports.og import build_og_html
from app.synthesis.router import router as synthesis_router
from app.push.router import router as push_router
from app.search.router import router as search_router
from app.predictions.router import router as predictions_router
from app.scraper.router import router as scraper_router

settings = get_settings()

# Social crawler user-agent patterns
_BOT_RE = re.compile(
    r"(Twitterbot|LinkedInBot|facebookexternalhit|WhatsApp|TelegramBot"
    r"|Slackbot|Discordbot|GoogleBot|bingbot|rogerbot|embedly)",
    re.IGNORECASE,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_indexes()
    yield
    await close_db()


app = FastAPI(
    title="Combined Intelligence API",
    version="1.0.0",
    docs_url="/api/docs" if settings.is_dev else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ──────────────────────────────────────────────────────────────
app.include_router(auth_router,      prefix="/api/auth",     tags=["auth"])
app.include_router(reports_router,   prefix="/api/reports",  tags=["reports"])
app.include_router(synthesis_router, prefix="/api/jobs",     tags=["jobs"])
app.include_router(push_router,      prefix="/api/push",     tags=["push"])
app.include_router(search_router,       prefix="/api/search",      tags=["search"])
app.include_router(predictions_router,  prefix="/api/predictions", tags=["predictions"])
app.include_router(scraper_router,      prefix="/api/scraper",     tags=["scraper"])


# ── OG bot-detection middleware ──────────────────────────────────────────────
@app.middleware("http")
async def og_middleware(request: Request, call_next):
    ua = request.headers.get("user-agent", "")
    path = request.url.path

    # Only intercept /reports/<slug> paths for crawlers
    if _BOT_RE.search(ua) and path.startswith("/reports/"):
        slug = path.removeprefix("/reports/").strip("/")
        if slug:
            from app.database import get_db
            db = get_db()
            doc = await db.reports.find_one({"slug": slug, "status": "published"})
            if doc:
                return HTMLResponse(build_og_html(doc))

    return await call_next(request)


# ── SPA catch-all (must be last) ─────────────────────────────────────────────
# In production, nginx serves the built frontend and this is never hit.
# In dev, point vite dev server separately.
try:
    app.mount("/", StaticFiles(directory="frontend_dist", html=True), name="spa")
except RuntimeError:
    # frontend_dist not built yet — dev mode, frontend runs on Vite
    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return Response(
            content="<h1>Run the frontend separately: cd frontend && npm run dev</h1>",
            media_type="text/html",
        )
