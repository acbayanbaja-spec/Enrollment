"""
ASGI entry when Render "Root Directory" is set to `backend`.

Start command: uvicorn asgi:app --host 0.0.0.0 --port $PORT

If Root Directory is empty (repo root), use the parent ../asgi.py instead.
"""
from app.main import app

__all__ = ["app"]
