"""
FastAPI application entry — CORS, static frontend, API routers.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import Base, engine
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Optional auto-create tables for development (production: use schema.sql + migrations)."""
    if os.getenv("INIT_DB", "").lower() in ("1", "true", "yes"):
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
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


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name}


@app.get("/")
def root() -> dict:
    return {
        "message": "SEAIT Enrollment API",
        "docs": "/docs",
        "frontend": "/app/index.html",
    }
