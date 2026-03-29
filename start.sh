#!/usr/bin/env bash
# Optional launcher — prefer: uvicorn asgi:app (see ../asgi.py)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}"
exec uvicorn asgi:app --host 0.0.0.0 --port "${PORT:?}"
