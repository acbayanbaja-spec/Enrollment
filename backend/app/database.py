"""
SQLAlchemy engine and session factory.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import get_settings

settings = get_settings()
# Prefer psycopg3 driver when URL is plain postgresql://
_db_url = settings.database_url
if _db_url.startswith("postgresql://") and "+psycopg" not in _db_url and "+psycopg2" not in _db_url:
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)
engine = create_engine(
    _db_url,
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
