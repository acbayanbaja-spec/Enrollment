"""
FastAPI application entry — CORS, static frontend, API routers.
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import get_settings
from app.database import engine
from app.schema_patches import ensure_schema
from app.routers import (
    ai_routes,
    announcements,
    auth,
    courses,
    cutoffs,
    enrollment,
    notifications,
    payments,
    reports,
)

settings = get_settings()
logger = logging.getLogger(__name__)


def _cors_middleware_kwargs():
    """Browsers reject allow_credentials=True with allow_origins=['*']; handle wildcard safely."""
    origins = settings.cors_origin_list
    if not origins:
        origins = ["http://localhost:8000", "http://127.0.0.1:8000"]
    if any(o == "*" for o in origins):
        return {"allow_origins": ["*"], "allow_credentials": False}
    return {"allow_origins": origins, "allow_credentials": True}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Ensure database tables exist and PostgreSQL is aligned with the ORM (no DBeaver required).
    Set SKIP_AUTO_DB_SETUP=1 to disable (external migrations only).
    """
    try:
        ensure_schema(engine)
        logger.info("Database schema ready (create_all + optional PostgreSQL patches).")
    except Exception:
        logger.exception("Database schema setup failed — fix DB connectivity or SQL errors below.")
        raise
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

_kw = _cors_middleware_kwargs()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_kw["allow_origins"],
    allow_credentials=_kw["allow_credentials"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(enrollment.router)
app.include_router(payments.router)
app.include_router(notifications.router)
app.include_router(announcements.router)
app.include_router(courses.router)
app.include_router(cutoffs.router)
app.include_router(reports.router)
app.include_router(ai_routes.router)

# Uploaded receipts (demo; protect behind auth in production hardening)
upload_dir = os.path.abspath(settings.upload_dir)
os.makedirs(upload_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=upload_dir), name="media")

# Frontend (built as static HTML/CSS/JS)
frontend_dir = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public")
)
if os.path.isdir(frontend_dir):
    app.mount("/app", StaticFiles(directory=frontend_dir, html=True), name="frontend")


@app.get("/health")
def health_live() -> dict:
    """Fast liveness — use this path for Render/load balancer probes (no DB round-trip)."""
    return {"status": "ok", "service": settings.app_name}


@app.get("/api/health")
def health_api() -> dict:
    """App status including database connectivity (may take up to connect_timeout if DB is down)."""
    payload: dict = {"status": "ok", "service": settings.app_name}
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        payload["database"] = "ok"
    except Exception:
        payload["status"] = "degraded"
        payload["database"] = "error"
    return payload


@app.get("/")
def root():
    """Browser-friendly root: send users to the static portal; API clients use /docs or /api/*."""
    if os.path.isdir(frontend_dir):
        return RedirectResponse(url="/app/index.html", status_code=307)
    return {
        "message": "SEAIT Enrollment API",
        "docs": "/docs",
        "frontend": "/app/index.html",
    }
