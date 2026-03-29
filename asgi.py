"""
ASGI entry when the process starts from the repository root (e.g. Render).

Render often runs `uvicorn app.main:app` from `/opt/render/project/src`, which fails because
the Python package `app` lives under `backend/`. Importing this module instead:

    uvicorn asgi:app --host 0.0.0.0 --port $PORT

adds `backend/` to sys.path and sets the working directory to `backend/` so uploads and
relative paths match local development.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent / "backend"
os.chdir(_backend)
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from app.main import app  # noqa: E402
