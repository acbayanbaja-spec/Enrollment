"""
Application configuration via environment variables.
"""
from functools import lru_cache
from typing import List

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings (Render: set in dashboard or .env locally)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SEAIT Enrollment API"
    secret_key: str = "CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND_HEX_32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/enrollment_db",
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def _coalesce_empty_database_url(cls, v: object) -> object:
        """Treat blank env as unset; strip quotes/BOM/whitespace from pasted Render URLs."""
        if v is None or not isinstance(v, str):
            return v
        s = v.strip().strip("\ufeff\u200b")  # BOM / zero-width
        if not s:
            return "postgresql://postgres:postgres@localhost:5432/enrollment_db"
        if len(s) >= 2 and s[0] == s[-1] and s[0] in ('"', "'"):
            s = s[1:-1].strip()
        return s

    cors_origins: str = "http://localhost:8000,http://127.0.0.1:8000"

    upload_dir: str = "uploads"
    max_upload_mb: int = 8

    # Optional: OpenAI for smarter chatbot (leave empty for rule-based only)
    openai_api_key: str = ""  # env: OPENAI_API_KEY

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
