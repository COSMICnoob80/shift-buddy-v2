"""T123 RED — PHI redaction across P1b endpoints (Principle IV / NFR-001).

Verifies:
(a) POST /vitals heart_rate=135 → structlog output does NOT contain patient name or bed_number.
(b) Alert message in DB does NOT contain patient name.
(c) POST /protocols/evaluate → shadow_events payload does NOT contain patient_id or patient name.

At least one assertion is expected to fail until T124 confirms redaction covers alert messages.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from datetime import UTC, date, datetime

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models.shadow_event  # noqa: F401
from app.core.ratelimit import limiter
from app.main import create_app
from app.models.base import Base
from app.models.db import get_session

_REG_PAYLOAD = {
    "name": "Redact P1b HO",
    "email": "ho@testredactp1b.com",
    "password": "StrongPass!234",
    "pmdc_number": "44444-R",
    "hospital_code": "FSL",
    "department": "General Surgery",
}

_PATIENT_NAME = "Jane Redact"
_PATIENT_BED = "PHI-1"

_PATIENT_PAYLOAD = {
    "bed_number": _PATIENT_BED,
    "name": _PATIENT_NAME,
    "age": 40,
    "sex": "female",
    "date_of_admission": str(date.today()),
    "provisional_diagnosis": "PHI redaction test",
    "ward": "surgical_itc",
    "acuity": "stable",
}


@pytest_asyncio.fixture
async def app_with_session() -> AsyncIterator[tuple[object, async_sessionmaker[AsyncSession]]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def _override() -> AsyncIterator[AsyncSession]:
        async with factory() as sess:
            yield sess

    application = create_app()
    application.dependency_overrides[get_session] = _override
    limiter.reset()
    yield application, factory
    application.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def client_and_session(
    app_with_session: tuple[object, async_sessionmaker[AsyncSession]],
) -> AsyncIterator[tuple[httpx.AsyncClient, async_sessionmaker[AsyncSession]]]:
    application, factory = app_with_session
    transport = httpx.ASGITransport(app=application)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c, factory


@pytest.mark.asyncio
async def test_vitals_phi_not_in_logs(
    client_and_session: tuple[httpx.AsyncClient, async_sessionmaker[AsyncSession]],
    caplog: pytest.LogCaptureFixture,
) -> None:
    """POST /vitals heart_rate=135 → patient name and bed_number absent from all log events."""
    client, factory = client_and_session
    caplog.set_level(logging.INFO)

    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    headers = {"Authorization": f"Bearer {r.json()['token']}"}

    pr = await client.post("/api/v1/patients", json=_PATIENT_PAYLOAD, headers=headers)
    assert pr.status_code == 201, pr.text
    patient_id = pr.json()["id"]

    caplog.clear()
    vr = await client.post(
        f"/api/v1/patients/{patient_id}/vitals",
        json={"heart_rate": 135, "recorded_at": datetime.now(UTC).isoformat()},
        headers=headers,
    )
    assert vr.status_code == 201, vr.text

    log_text = caplog.text
    assert _PATIENT_NAME not in log_text, (
        f"Patient name '{_PATIENT_NAME}' found in logs after vitals POST (PHI leak)"
    )
    assert _PATIENT_BED not in log_text, (
        f"Bed number '{_PATIENT_BED}' found in logs after vitals POST (PHI leak)"
    )


@pytest.mark.asyncio
async def test_alert_message_does_not_contain_patient_name(
    client_and_session: tuple[httpx.AsyncClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Alert message in DB must not contain the patient's name."""
    from app.models.alert import Alert

    client, factory = client_and_session

    r = await client.post("/api/v1/auth/register", json={**_REG_PAYLOAD, "email": "ho2@redact.com", "pmdc_number": "55555-R"})
    assert r.status_code == 201, r.text
    headers = {"Authorization": f"Bearer {r.json()['token']}"}

    pr = await client.post("/api/v1/patients", json=_PATIENT_PAYLOAD, headers=headers)
    assert pr.status_code == 201, pr.text
    patient_id = pr.json()["id"]

    vr = await client.post(
        f"/api/v1/patients/{patient_id}/vitals",
        json={"heart_rate": 135, "recorded_at": datetime.now(UTC).isoformat()},
        headers=headers,
    )
    assert vr.status_code == 201, vr.text

    async with factory() as db:
        result = await db.execute(select(Alert))
        alerts = list(result.scalars().all())

    assert len(alerts) >= 1, "Expected at least one alert to be created"
    for alert in alerts:
        assert _PATIENT_NAME not in str(alert.message), (
            f"Alert message contains patient name '{_PATIENT_NAME}': {alert.message}"
        )
        assert _PATIENT_BED not in str(alert.message), (
            f"Alert message contains bed number '{_PATIENT_BED}': {alert.message}"
        )


@pytest.mark.asyncio
async def test_shadow_events_payload_no_phi(
    client_and_session: tuple[httpx.AsyncClient, async_sessionmaker[AsyncSession]],
) -> None:
    """POST /protocols/evaluate → shadow_events payload must not contain patient_id or patient name."""
    from app.models.shadow_event import ShadowEvent

    client, factory = client_and_session

    r = await client.post("/api/v1/auth/register", json={**_REG_PAYLOAD, "email": "ho3@redact.com", "pmdc_number": "66666-R"})
    assert r.status_code == 201, r.text
    headers = {"Authorization": f"Bearer {r.json()['token']}"}

    pr = await client.post("/api/v1/patients", json=_PATIENT_PAYLOAD, headers=headers)
    assert pr.status_code == 201, pr.text
    patient_id = pr.json()["id"]

    resp = await client.post(
        "/api/v1/protocols/evaluate",
        json={"protocol": "hyperkalemia", "patient_id": patient_id, "values": {"potassium": 6.2, "ecg_changes": False}},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text

    async with factory() as db:
        result = await db.execute(
            select(ShadowEvent).order_by(ShadowEvent.created_at.desc()).limit(1)
        )
        event = result.scalar_one_or_none()

    assert event is not None
    payload = event.payload  # type: ignore[attr-defined]
    payload_str = str(payload)

    assert patient_id not in payload_str, (
        f"patient_id '{patient_id}' found in shadow_events payload"
    )
    assert _PATIENT_NAME not in payload_str, (
        f"Patient name '{_PATIENT_NAME}' found in shadow_events payload"
    )
