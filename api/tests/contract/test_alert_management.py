"""T110 RED — Alert management contract tests.

GET /patients/{id}/alerts: pagination, alert_type filter, acknowledged filter, 401.
POST /alerts/{id}/acknowledge: 200, 409 repeat, 404 unknown.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert
from app.models.db import get_session

# ── helpers ───────────────────────────────────────────────────────────────────

_REG_PAYLOAD = {
    "name": "Alert Mgmt HO",
    "email": "ho@alertmgmt.com",
    "password": "StrongPass!234",
    "pmdc_number": "22222-B",
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
            "bed_number": "AM-1",
            "name": "Mgmt Patient",
            "age": 50,
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


@asynccontextmanager
async def _db_session(app: FastAPI) -> AsyncIterator[AsyncSession]:
    gen = app.dependency_overrides[get_session]()
    session: AsyncSession = await gen.__anext__()
    try:
        yield session
    finally:
        await gen.aclose()


async def _insert_alert(
    app: FastAPI,
    patient_id: str,
    alert_type: str = "critical",
) -> str:
    """Directly insert an alert row for testing list/acknowledge."""
    async with _db_session(app) as db:
        alert = Alert(
            patient_id=uuid.UUID(patient_id),
            alert_type=alert_type,
            trigger_source="vital",
            trigger_parameter="heart_rate",
            trigger_value=135.0 if alert_type == "critical" else 55.0,
            message=f"test alert ({alert_type})",
        )
        db.add(alert)
        await db.commit()
        await db.refresh(alert)
        return str(alert.id)


# ── T110 tests ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_alerts_empty_returns_200_not_404(
    client: httpx.AsyncClient,
    app: FastAPI,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    r = await client.get(f"/api/v1/patients/{pid}/alerts", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["alerts"] == []
    assert body["page"] == 1
    assert body["limit"] == 20
    assert body["total_pages"] == 0


@pytest.mark.asyncio
async def test_get_alerts_filter_by_alert_type(
    client: httpx.AsyncClient,
    app: FastAPI,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    await _insert_alert(app, pid, "critical")
    await _insert_alert(app, pid, "critical")
    await _insert_alert(app, pid, "warning")

    r_crit = await client.get(
        f"/api/v1/patients/{pid}/alerts?alert_type=critical", headers=headers
    )
    assert r_crit.status_code == 200, r_crit.text
    assert len(r_crit.json()["alerts"]) == 2

    r_warn = await client.get(
        f"/api/v1/patients/{pid}/alerts?alert_type=warning", headers=headers
    )
    assert r_warn.status_code == 200, r_warn.text
    assert len(r_warn.json()["alerts"]) == 1


@pytest.mark.asyncio
async def test_get_alerts_filter_by_acknowledged(
    client: httpx.AsyncClient,
    app: FastAPI,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    alert_id = await _insert_alert(app, pid)

    r = await client.get(
        f"/api/v1/patients/{pid}/alerts?acknowledged=false", headers=headers
    )
    assert r.status_code == 200, r.text
    assert len(r.json()["alerts"]) == 1

    # Acknowledge it, then filter should return 0
    await client.post(f"/api/v1/alerts/{alert_id}/acknowledge", headers=headers)

    r_after = await client.get(
        f"/api/v1/patients/{pid}/alerts?acknowledged=false", headers=headers
    )
    assert r_after.status_code == 200, r_after.text
    assert len(r_after.json()["alerts"]) == 0


@pytest.mark.asyncio
async def test_acknowledge_alert_returns_200(
    client: httpx.AsyncClient,
    app: FastAPI,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)
    alert_id = await _insert_alert(app, pid)

    r = await client.post(f"/api/v1/alerts/{alert_id}/acknowledge", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["acknowledged"] is True
    assert uuid.UUID(body["acknowledged_by"])
    assert body["acknowledged_at"] is not None


@pytest.mark.asyncio
async def test_acknowledge_alert_twice_returns_409(
    client: httpx.AsyncClient,
    app: FastAPI,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)
    alert_id = await _insert_alert(app, pid)

    r1 = await client.post(f"/api/v1/alerts/{alert_id}/acknowledge", headers=headers)
    assert r1.status_code == 200, r1.text

    r2 = await client.post(f"/api/v1/alerts/{alert_id}/acknowledge", headers=headers)
    assert r2.status_code == 409, r2.text
    assert r2.json()["error"] == "already_acknowledged"


@pytest.mark.asyncio
async def test_acknowledge_nonexistent_alert_returns_404(
    client: httpx.AsyncClient,
    app: FastAPI,
) -> None:
    headers = await _auth_header(client)
    fake_id = str(uuid.uuid4())

    r = await client.post(f"/api/v1/alerts/{fake_id}/acknowledge", headers=headers)
    assert r.status_code == 404, r.text
    assert r.json()["error"] == "alert_not_found"


@pytest.mark.asyncio
async def test_get_alerts_unauthenticated_returns_401(
    client: httpx.AsyncClient,
    app: FastAPI,
) -> None:
    r = await client.get(f"/api/v1/patients/{uuid.uuid4()}/alerts")
    assert r.status_code == 401, r.text
