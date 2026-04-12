"""
PostgreSQL schema alignment — no manual SQL clients required.

Runs after SQLAlchemy create_all on app startup (see main.py).
Each DDL step uses its own transaction so a failure in one step does not roll back
earlier steps (e.g. users.department_scope must survive a bad constraint script).

Opt out: set SKIP_AUTO_DB_SETUP=1 (you manage DDL elsewhere).
"""
import os

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine


def _skip() -> bool:
    return os.getenv("SKIP_AUTO_DB_SETUP", "").lower() in ("1", "true", "yes")


def _table_exists(conn: Connection, table_name: str) -> bool:
    r = conn.execute(
        text(
            """
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = :t
            )
            """
        ),
        {"t": table_name},
    )
    return bool(r.scalar())


def _exec_block(engine: Engine, label: str, fn) -> None:
    """Run a callable (conn) -> None inside its own committed transaction."""
    try:
        with engine.begin() as conn:
            fn(conn)
    except Exception as e:
        raise RuntimeError(f"Schema patch step failed ({label}): {e}") from e


def apply_postgres_patches(engine: Engine, *, force: bool = False) -> None:
    if engine.dialect.name != "postgresql":
        return
    if not force and _skip():
        return

    def patch_users(conn: Connection) -> None:
        if _table_exists(conn, "users"):
            conn.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS department_scope VARCHAR(128)")
            )

    _exec_block(engine, "users.department_scope", patch_users)

    def patch_category_constraints(conn: Connection) -> None:
        if not _table_exists(conn, "enrollment_forms"):
            return
        conn.execute(
            text(
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
                """
            )
        )
        conn.execute(
            text(
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
                """
            )
        )

    _exec_block(engine, "enrollment_forms.category_check", patch_category_constraints)

    def patch_enrollment_transfer(conn: Connection) -> None:
        if not _table_exists(conn, "enrollment_forms"):
            return
        conn.execute(
            text(
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
                """
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS idx_enrollment_transfer_form ON enrollment_transfer(enrollment_form_id)"
            )
        )

    _exec_block(engine, "enrollment_transfer", patch_enrollment_transfer)

    def patch_department_role(conn: Connection) -> None:
        if not _table_exists(conn, "roles"):
            return
        conn.execute(
            text(
                """
                INSERT INTO roles (name, description)
                SELECT 'Department', 'Department dashboard — enrolled students by program'
                WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Department')
                """
            )
        )

    _exec_block(engine, "roles.department", patch_department_role)


def ensure_schema(engine: Engine, *, force: bool = False) -> None:
    """
    Register ORM models, create missing tables, then patch legacy PostgreSQL DBs.
    Call once at application startup (unless SKIP_AUTO_DB_SETUP is set).
    Use force=True from seed.py so CLI seeding always runs DDL even if the env skip flag is set.
    """
    if not force and _skip():
        return

    # Load all model modules so Base.metadata is complete
    import app.models  # noqa: F401

    from app.database import Base

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        raise RuntimeError(f"create_all failed: {e}") from e

    apply_postgres_patches(engine, force=force)
