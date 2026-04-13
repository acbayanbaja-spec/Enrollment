"""
SQLAlchemy engine and session factory.

DATABASE_URL normalization is tuned for Render (internal dpg-…-a hostnames vs external *.postgres.render.com).
Override anytime with DATABASE_SSL_MODE=disable|allow|prefer|require|verify-full.
Internal-only override: RENDER_INTERNAL_PG_SSL (defaults to prefer).
"""
import os
import re
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import get_settings

_VALID_SSL = frozenset(("disable", "allow", "prefer", "require", "verify-ca", "verify-full"))


def _normalize_database_url(raw: str) -> str:
    """Use psycopg3 driver, explicit port when omitted, timeouts, and sensible TLS per host kind."""
    s = raw.strip()
    if s.startswith("postgresql://") and "+psycopg" not in s and "+psycopg2" not in s:
        s = s.replace("postgresql://", "postgresql+psycopg://", 1)
    url = make_url(s)
    if url.get_backend_name() != "postgresql":
        return str(url)

    host = (url.host or "").lower()
    is_local = host in ("localhost", "127.0.0.1", "::1") or not host

    # Render / cloud: libpq defaults port 5432 but being explicit avoids rare URL parse edge cases.
    if not is_local and url.port is None and host:
        url = url.set(port=5432)

    q = dict(url.query)
    if "connect_timeout" not in q:
        url = url.update_query_dict({"connect_timeout": "15"})

    ssl_env = os.getenv("DATABASE_SSL_MODE", "").strip().lower()
    if ssl_env in _VALID_SSL:
        url = url.update_query_dict({"sslmode": ssl_env})
    elif "sslmode" in q or "ssl" in q:
        pass  # pasted URL already includes ssl parameters
    elif is_local:
        pass
    elif "postgres.render.com" in host or re.search(
        r"dpg-[a-z0-9-]+\.[a-z0-9-]+\.postgres\.render\.com",
        host,
        flags=re.IGNORECASE,
    ):
        # External / public Render Postgres — TLS is mandatory.
        url = url.update_query_dict({"sslmode": "require"})
    elif re.fullmatch(r"dpg-[a-z0-9]+-[ab]", host, flags=re.IGNORECASE):
        # Private hostname inside Render (e.g. dpg-xxxxx-a). Try prefer; if auth still fails, set
        # RENDER_INTERNAL_PG_SSL=disable or require on the web service.
        internal = os.getenv("RENDER_INTERNAL_PG_SSL", "prefer").strip().lower()
        if internal in _VALID_SSL:
            url = url.update_query_dict({"sslmode": internal})
        else:
            url = url.update_query_dict({"sslmode": "prefer"})
    else:
        url = url.update_query_dict({"sslmode": "prefer"})

    return str(url)


settings = get_settings()
engine = create_engine(
    _normalize_database_url(settings.database_url),
    pool_pre_ping=True,
    connect_args={"application_name": "seait-enrollment"},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
