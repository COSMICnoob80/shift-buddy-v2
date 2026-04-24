"""T059 — shadow_events migration: roundtrip, row insert/fetch, and downgrade.

All three cases require a live Postgres reachable via TEST_DATABASE_URL.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import uuid
from pathlib import Path

import asyncpg
import pytest

API_DIR = Path(__file__).resolve().parents[2]

pytestmark = pytest.mark.skipif(
    not os.environ.get("TEST_DATABASE_URL"),
    reason="requires live Postgres via TEST_DATABASE_URL",
)


def _alembic(*args: str, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    merged = {**os.environ, **(env or {})}
    return subprocess.run(
        [".venv/bin/alembic", *args],
        cwd=API_DIR,
        env=merged,
        capture_output=True,
        text=True,
        check=False,
    )


async def _raw_query(db_url: str, sql: str, *args: object) -> list[asyncpg.Record]:
    """Run a query via asyncpg and return records."""
    # asyncpg uses "postgresql://" not "postgresql+asyncpg://"
    conn_str = db_url.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(conn_str)
    try:
        return await conn.fetch(sql, *args)  # type: ignore[return-value]
    finally:
        await conn.close()


async def _raw_execute(db_url: str, sql: str, *args: object) -> None:
    """Execute a statement via asyncpg (no result needed)."""
    conn_str = db_url.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(conn_str)
    try:
        await conn.execute(sql, *args)
    finally:
        await conn.close()


def test_shadow_events_migration_roundtrip() -> None:
    """upgrade head → downgrade -1 → upgrade head must all succeed."""
    db_url = os.environ["TEST_DATABASE_URL"]

    up1 = _alembic("upgrade", "head", env={"DATABASE_URL": db_url})
    assert up1.returncode == 0, f"upgrade head failed:\n{up1.stderr}"

    down = _alembic("downgrade", "-1", env={"DATABASE_URL": db_url})
    assert down.returncode == 0, f"downgrade -1 failed:\n{down.stderr}"

    up2 = _alembic("upgrade", "head", env={"DATABASE_URL": db_url})
    assert up2.returncode == 0, f"upgrade head (second) failed:\n{up2.stderr}"


def test_shadow_events_row_insert_and_fetch() -> None:
    """After upgrade head, insert a synthetic row and assert columns are correct."""
    db_url = os.environ["TEST_DATABASE_URL"]

    # Ensure schema is at head
    up = _alembic("upgrade", "head", env={"DATABASE_URL": db_url})
    assert up.returncode == 0, f"upgrade head failed:\n{up.stderr}"

    async def _run() -> None:
        # Obtain or create a valid user id for the FK
        rows = await _raw_query(db_url, "SELECT id FROM users LIMIT 1")
        if rows:
            ho_user_id = rows[0]["id"]
        else:
            ho_user_id = uuid.uuid4()
            await _raw_execute(
                db_url,
                """
                INSERT INTO users (id, name, email, password_hash, pmdc_number,
                                   hospital_code, department, role)
                VALUES ($1, 'Test HO', 'test-ho@example.com', 'hash', 'PMDC0001',
                        'HOSP01', 'Internal Medicine', 'ho')
                """,
                ho_user_id,
            )

        # Insert a shadow_events row with minimal fields
        await _raw_execute(
            db_url,
            """
            INSERT INTO shadow_events (ho_user_id, event_type, payload, shift_id, divergence_score)
            VALUES ($1, 'agent_suggestion', '{"note":"synthetic"}'::jsonb, NULL, NULL)
            """,
            ho_user_id,
        )

        # Fetch it back
        result = await _raw_query(
            db_url,
            "SELECT id, created_at, divergence_score, event_type"
            " FROM shadow_events WHERE ho_user_id = $1 ORDER BY created_at DESC LIMIT 1",
            ho_user_id,
        )
        assert len(result) == 1, "Expected one shadow_events row"
        row = result[0]
        assert row["id"] is not None, "id should be auto-generated UUID"
        assert row["created_at"] is not None, "created_at should be server-defaulted"
        assert row["divergence_score"] is None, "divergence_score should be NULL"
        assert row["event_type"] == "agent_suggestion"

    asyncio.run(_run())


def test_shadow_events_downgrade_drops_table() -> None:
    """After downgrade -1, shadow_events must not exist in information_schema."""
    db_url = os.environ["TEST_DATABASE_URL"]

    # Ensure we start at head
    up = _alembic("upgrade", "head", env={"DATABASE_URL": db_url})
    assert up.returncode == 0, f"upgrade head failed:\n{up.stderr}"

    # Downgrade only 0002
    down = _alembic("downgrade", "-1", env={"DATABASE_URL": db_url})
    assert down.returncode == 0, f"downgrade -1 failed:\n{down.stderr}"

    async def _check_table_absent() -> None:
        rows = await _raw_query(
            db_url,
            "SELECT table_name FROM information_schema.tables"
            " WHERE table_schema = 'public' AND table_name = 'shadow_events'",
        )
        assert len(rows) == 0, "shadow_events table should not exist after downgrade -1"

    asyncio.run(_check_table_absent())

    # Restore state to head so subsequent tests are unaffected
    up2 = _alembic("upgrade", "head", env={"DATABASE_URL": db_url})
    assert up2.returncode == 0, f"upgrade head (restore) failed:\n{up2.stderr}"
