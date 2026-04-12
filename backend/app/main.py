"""
FastAPI application entry — CORS, static frontend, API routers.
"""
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

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

# Render cold start / DB not ready yet — retry schema setup before failing the process.
_SCHEMA_STARTUP_ATTEMPTS = int(os.getenv("DB_STARTUP_ATTEMPTS", "10"))
_SCHEMA_STARTUP_DELAY_SEC = float(os.getenv("DB_STARTUP_DELAY_SEC", "2.5"))


def _is_recoverable_db_startup_error(exc: BaseException) -> bool:
    """
    True for wrong password / unreachable host — app can still serve /health and static UI
    while DATABASE_URL is fixed. False for SQL bugs in migrations (must fail deploy).
    """
    if isinstance(exc, RuntimeError):
        s = str(exc)
        if "Schema patch step failed" in s or "ensure_schema failed" in s:
            return False
        return "DATABASE_URL was rejected" in s or "hostname could not be resolved" in s
    if isinstance(exc, OperationalError):
        raw = (str(getattr(exc, "orig", None) or exc)).lower()
        return any(
            phrase in raw
            for phrase in (
                "password authentication failed",
                "connection refused",
                "could not connect",
                "timeout",
                "could not translate host name",
                "name or service not known",
                "server closed the connection",
            )
        )
    return False


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

    If DATABASE_URL is wrong or DB is unreachable, by default the app still starts (degraded)
    so Render binds a port and /health works; set STRICT_DB_STARTUP=true to fail deploy instead.
    """
    strict_db = os.getenv("STRICT_DB_STARTUP", "false").lower() in ("1", "true", "yes")

    if os.getenv("SKIP_AUTO_DB_SETUP", "").lower() in ("1", "true", "yes"):
        logger.warning("SKIP_AUTO_DB_SETUP is set — skipping automatic schema (create_all + patches).")
        app.state.db_ready = True
        yield
        return

    attempts = max(1, _SCHEMA_STARTUP_ATTEMPTS)
    for attempt in range(1, attempts + 1):
        try:
            ensure_schema(engine)
            logger.info("Database schema ready on attempt %s/%s.", attempt, attempts)
            app.state.db_ready = True
            break
        except Exception as e:
            logger.warning(
                "Database schema setup attempt %s/%s failed: %s",
                attempt,
                attempts,
                e,
            )
            recoverable = _is_recoverable_db_startup_error(e)
            if attempt < attempts:
                time.sleep(_SCHEMA_STARTUP_DELAY_SEC)
                continue
            if recoverable and not strict_db:
                logger.error(
                    "Starting in degraded mode: database not reachable or credentials rejected. "
                    "Update DATABASE_URL on Render and redeploy. "
                    "Set STRICT_DB_STARTUP=true if you want the deploy to fail when the DB is unavailable."
                )
                app.state.db_ready = False
                break
            logger.exception("Database schema setup failed after all retries.")
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
    if getattr(app.state, "db_ready", True) is False:
        payload["status"] = "degraded"
        payload["database"] = "unavailable"
        payload["hint"] = "DATABASE_URL rejected or DB unreachable at startup — update credentials on Render."
        return payload
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
