"""
SQLAlchemy engine and session factory.
"""
import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import get_settings


def _normalize_database_url(raw: str) -> str:
    """Use psycopg3 driver, timeouts, and TLS for hosted Postgres (Render, RDS, etc.)."""
    s = raw
    if s.startswith("postgresql://") and "+psycopg" not in s and "+psycopg2" not in s:
        s = s.replace("postgresql://", "postgresql+psycopg://", 1)
    url = make_url(s)
    if url.get_backend_name() != "postgresql":
        return s

    q = dict(url.query)
    # libpq connect_timeout (seconds) — avoids long hangs when DB is unreachable
    if "connect_timeout" not in q:
        url = url.update_query_dict({"connect_timeout": "10"})

    # Remote Postgres (Render, Neon, RDS, …) almost always requires TLS.
    host = (url.host or "").lower()
    is_local = host in ("localhost", "127.0.0.1", "::1") or not host
    ssl_mode = os.getenv("DATABASE_SSL_MODE", "").strip().lower()
    if ssl_mode in ("disable", "allow", "prefer", "require", "verify-ca", "verify-full"):
        url = url.update_query_dict({"sslmode": ssl_mode})
    elif not is_local and "sslmode" not in q and "ssl" not in q:
        # Prefer TLS when available; set DATABASE_SSL_MODE=require for strict SSL (many cloud DBs).
        url = url.update_query_dict({"sslmode": "prefer"})

    return str(url)


settings = get_settings()
engine = create_engine(
    _normalize_database_url(settings.database_url),
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
