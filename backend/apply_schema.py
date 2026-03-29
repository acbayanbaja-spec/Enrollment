"""
Apply database/schema.sql to PostgreSQL using DATABASE_URL (no psql required).

Usage (from backend/):
  set DATABASE_URL=postgresql://user:pass@host:port/dbname?sslmode=require
  python apply_schema.py

Or:  python apply_schema.py path/to/schema.sql
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

from psycopg import connect


def _split_sql_statements(sql: str) -> list[str]:
    """Split SQL file into executable statements (handles BEGIN/COMMIT blocks)."""
    # Strip block comments /* */ if any
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    lines = []
    for line in sql.splitlines():
        s = line.strip()
        if s.startswith("--"):
            continue
        lines.append(line)
    cleaned = "\n".join(lines)
    # Remove lone BEGIN/COMMIT so we can commit once at end
    cleaned = re.sub(r"^\s*BEGIN\s*;\s*", "", cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r"^\s*COMMIT\s*;\s*$", "", cleaned, flags=re.IGNORECASE | re.MULTILINE)

    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    i = 0
    while i < len(cleaned):
        c = cleaned[i]
        if c == "(":
            depth += 1
        elif c == ")":
            depth = max(0, depth - 1)
        if c == ";" and depth == 0:
            stmt = "".join(buf).strip()
            if stmt:
                parts.append(stmt)
            buf = []
            i += 1
            continue
        buf.append(c)
        i += 1
    tail = "".join(buf).strip()
    if tail:
        parts.append(tail)
    return [p for p in parts if p]


def main() -> None:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: Set DATABASE_URL (e.g. postgresql://user:pass@host/db?sslmode=require)", file=sys.stderr)
        sys.exit(1)

    if not url.startswith("postgresql+psycopg://") and "sslmode" not in url and "ssl" not in url.lower():
        sep = "&" if "?" in url else "?"
        url = url + sep + "sslmode=require"

    default = Path(__file__).resolve().parent.parent / "database" / "schema.sql"
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else default
    if not path.is_file():
        print(f"ERROR: File not found: {path}", file=sys.stderr)
        sys.exit(1)

    sql_text = path.read_text(encoding="utf-8")
    statements = _split_sql_statements(sql_text)
    if not statements:
        print("ERROR: No SQL statements found.", file=sys.stderr)
        sys.exit(1)

    print(f"Connecting… ({path.name}, {len(statements)} statement(s))")
    with connect(url, autocommit=False) as conn:
        with conn.cursor() as cur:
            for i, stmt in enumerate(statements, 1):
                preview = stmt[:72].replace("\n", " ")
                print(f"  [{i}/{len(statements)}] {preview}…")
                cur.execute(stmt)
        conn.commit()
    print("Done — schema applied successfully.")


if __name__ == "__main__":
    main()
