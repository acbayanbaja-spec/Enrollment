#!/usr/bin/env bash
# Render / Linux: run API from backend/ so `import app` resolves.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}/backend"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:?}"
