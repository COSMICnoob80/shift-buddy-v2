"""T102/T108 — Alert engine contract tests (Story 1+2 ACs).

T102 (now green): schema import guard.
T108 RED: POST /vitals HR=135 → 201 + Alert row; POST /labs K+=6.2 → alert with protocol_link;
POST /vitals normal → no new alerts; rollback test (DB error during alert insert).
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import app.models.alert  # noqa: F401
from app.models.alert import Alert
from app.models.db import get_session


@asynccontextmanager
async def _db_session(app: FastAPI) -> AsyncIterator[AsyncSession]:
    """Extract a usable session from the test override async generator."""
    gen = app.dependency_overrides[get_session]()
    session: AsyncSession = await gen.__anext__()
    try:
        yield session
    finally:
        await gen.aclose()


# ── helpers ───────────────────────────────────────────────────────────────────

_REG_PAYLOAD = {
    "name": "Alert Engine HO",
    "email": "ho@alertengine.com",
    "password": "StrongPass!234",
    "pmdc_number": "11111-A",
    "hospital_code": "FSL",
    "department": "General Medicine",
}


async def _auth_header(client: httpx.AsyncClient) -> dict[str, str]:
    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


async def _create_patient(client: httpx.AsyncClient, headers: dict[str, str]) -> str:
    r = await client.post(
        "/api/v1/patients",
        json={
            "bed_number": "AE-1",
            "name": "Alert Patient",
            "age": 45,
            "sex": "male",
            "date_of_admission": str(date.today()),
            "provisional_diagnosis": "Monitoring",
            "acuity": "stable",
            "ward": "ortho",
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


def _now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


# ── T102 schema import guard ──────────────────────────────────────────────────


def test_alert_schemas_importable() -> None:
    from app.schemas.alerts import AcknowledgeResponse, AlertListResponse, AlertRead  # noqa: F401

    assert AlertRead is not None
    assert AlertListResponse is not None
    assert AcknowledgeResponse is not None


# ── T108 Story 1+2 integration ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_post_critical_vitals_creates_alert(
    client: httpx.AsyncClient,
    app: FastAPI,
) -> None:
    """AC 1: POST /vitals HR=135 → 201 + unacknowledged Alert row in DB."""
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    r = await client.post(
        f"/api/v1/patients/{pid}/vitals",
        json={"heart_rate": 135, "recorded_at": _now()},
        headers=headers,
    )
    assert r.status_code == 201, r.text

    # Check DB directly via the overridden session
    async with _db_session(app) as db:
        result = await db.execute(select(Alert).where(Alert.trigger_parameter == "heart_rate"))
        alerts = list(result.scalars().all())

    assert len(alerts) == 1
    assert alerts[0].alert_type == "critical"
    assert float(alerts[0].trigger_value) == 135.0
    assert alerts[0].acknowledged is False


@pytest.mark.asyncio
async def test_post_normal_vitals_creates_no_alert(
    client: httpx.AsyncClient,
    app: FastAPI,
) -> None:
    """AC 2: POST /vitals HR=80 → 201 + zero new alert rows."""
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    r = await client.post(
        f"/api/v1/patients/{pid}/vitals",
        json={"heart_rate": 80, "recorded_at": _now()},
        headers=headers,
    )
    assert r.status_code == 201, r.text

    # Normal HR should not create alerts
    async with _db_session(app) as db:
        total = await db.scalar(
            select(func.count()).select_from(Alert).where(Alert.patient_id == pid)
        )
    assert total == 0


@pytest.mark.asyncio
async def test_post_critical_lab_creates_alert_with_protocol_link(
    client: httpx.AsyncClient,
    app: FastAPI,
) -> None:
    """AC 3: POST /labs K+=6.2 (critical) → 201 + Alert with hyperkalemia protocol_link."""
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    r = await client.post(
        f"/api/v1/patients/{pid}/labs",
        json={
            "test_name": "K+",
            "value": 6.2,
            "unit": "mEq/L",
            "reference_low": 3.5,
            "reference_high": 5.0,
            "recorded_at": _now(),
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    assert r.json()["is_critical"] is True

    async with _db_session(app) as db:
        result = await db.execute(select(Alert).where(Alert.patient_id == pid))
        alerts = list(result.scalars().all())

    assert len(alerts) == 1
    assert alerts[0].trigger_source == "lab"
    assert alerts[0].protocol_link is not None
    assert "hyperkalemia" in str(alerts[0].protocol_link)
