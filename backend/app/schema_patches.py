"""
Idempotent DDL for older databases (e.g. Render) that predate migration_002.

Safe to run on every startup: ADD COLUMN IF NOT EXISTS, CREATE IF NOT EXISTS, etc.
Disable with env DISABLE_AUTO_SCHEMA_PATCHES=1 if you manage migrations externally.
"""
import os

from sqlalchemy import text
from sqlalchemy.engine import Engine


def apply_postgres_patches(engine: Engine) -> None:
    if engine.dialect.name != "postgresql":
        return
    if os.getenv("DISABLE_AUTO_SCHEMA_PATCHES", "").lower() in ("1", "true", "yes"):
        return

    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS department_scope VARCHAR(128)",
        # Inline CHECK names vary by PG version; drop any category enum check, then add a stable name.
        """
        DO $$
        DECLARE
          con record;
        BEGIN
          FOR con IN
            SELECT c.conname AS name
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            WHERE t.relname = 'enrollment_forms'
              AND c.contype = 'c'
              AND pg_get_constraintdef(c.oid) ILIKE '%category%'
              AND pg_get_constraintdef(c.oid) ILIKE '%New%'
              AND pg_get_constraintdef(c.oid) NOT ILIKE '%Transfer%'
          LOOP
            EXECUTE format('ALTER TABLE enrollment_forms DROP CONSTRAINT IF EXISTS %I', con.name);
          END LOOP;
        END $$
        """,
        """
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            WHERE t.relname = 'enrollment_forms' AND c.conname = 'enrollment_forms_category_check'
          ) THEN
            ALTER TABLE enrollment_forms ADD CONSTRAINT enrollment_forms_category_check
            CHECK (category IN ('New', '2nd Year', '3rd Year', '4th Year', 'Transfer'));
          END IF;
        END $$
        """,
        """
        CREATE TABLE IF NOT EXISTS enrollment_transfer (
          id SERIAL PRIMARY KEY,
          enrollment_form_id INTEGER NOT NULL UNIQUE REFERENCES enrollment_forms(id) ON DELETE CASCADE,
          current_school VARCHAR(255) NOT NULL,
          current_program VARCHAR(255),
          last_semester_attended VARCHAR(128),
          previous_course_code VARCHAR(64),
          units_completed VARCHAR(64),
          reason_for_transfer TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_enrollment_transfer_form ON enrollment_transfer(enrollment_form_id)",
        """
        INSERT INTO roles (name, description)
        SELECT 'Department', 'Department dashboard — enrolled students by program'
        WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Department')
        """,
    ]

    with engine.begin() as conn:
        for raw in statements:
            stmt = text(raw.strip())
            conn.execute(stmt)
