"""
SQLAlchemy engine and session factory.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import get_settings

settings = get_settings()
# Prefer psycopg3 driver when URL is plain postgresql://
_raw = settings.database_url
if _raw.startswith("postgresql://") and "+psycopg" not in _raw and "+psycopg2" not in _raw:
    _raw = _raw.replace("postgresql://", "postgresql+psycopg://", 1)
_url = make_url(_raw)
# libpq connect_timeout (seconds) — avoids minute-long hangs when DB is unreachable
if _url.get_backend_name() == "postgresql" and "connect_timeout" not in dict(_url.query):
    _url = _url.update_query_dict({"connect_timeout": "10"})
engine = create_engine(
    _url,
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
