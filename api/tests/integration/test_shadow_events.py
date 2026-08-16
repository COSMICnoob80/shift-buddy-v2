"""T121 RED — Shadow events integration tests (Story 4 ACs).

Verifies:
(a) POST /protocols/evaluate → shadow_events row with correct event_type + ho_user_id.
(b) Payload keys are exactly {"protocol", "severity", "actions_count"} — no PHI.
(c) DKA evaluate → second row written.
(d) GET /protocols (list) → zero new shadow_events rows.

Uses a shared SQLite session so both HTTP calls and DB assertions hit the same DB.
All cases fail until T122 creates shadow_event_service.py and wires it to the router.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import date

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models.shadow_event  # noqa: F401 — ensure ShadowEvent table in metadata
from app.core.ratelimit import limiter
from app.main import create_app
from app.models.base import Base
from app.models.db import get_session


@pytest_asyncio.fixture
async def app_with_session() -> AsyncIterator[tuple[FastAPI, async_sessionmaker[AsyncSession]]]:
    """Yield (app, session_factory) sharing the same in-memory SQLite DB."""
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
    app_with_session: tuple[FastAPI, async_sessionmaker[AsyncSession]],
) -> AsyncIterator[tuple[httpx.AsyncClient, async_sessionmaker[AsyncSession]]]:
    application, factory = app_with_session
    transport = httpx.ASGITransport(app=application)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c, factory


_REG = {
    "name": "Shadow HO",
    "email": "ho-shadow@testshadow.com",
    "password": "StrongPass!234",
    "pmdc_number": "88888-S",
    "hospital_code": "FSL",
    "department": "General Medicine",
}
_PATIENT = {
    "bed_number": "SHD-1",
    "name": "Shadow Patient",
    "age": 50,
    "sex": "male",
    "date_of_admission": str(date.today()),
    "provisional_diagnosis": "Shadow test",
    "ward": "surgical_itc",
    "acuity": "stable",
}


async def _setup(
    client: httpx.AsyncClient,
    reg: dict[str, str] | None = None,
) -> tuple[dict[str, str], str, str]:
    r = await client.post("/api/v1/auth/register", json=reg or _REG)
    assert r.status_code == 201, r.text
    token = r.json()["token"]
    user_id = r.json()["id"]
    headers = {"Authorization": f"Bearer {token}"}
    pr = await client.post("/api/v1/patients", json=_PATIENT, headers=headers)
    assert pr.status_code == 201, pr.text
    return headers, user_id, pr.json()["id"]


async def _count_shadow_events(factory: async_sessionmaker[AsyncSession]) -> int:
    from app.models.shadow_event import ShadowEvent

    async with factory() as db:
        result = await db.execute(select(ShadowEvent))
        return len(list(result.scalars().all()))


async def _get_latest_shadow_event(
    factory: async_sessionmaker[AsyncSession],
) -> object:
    from app.models.shadow_event import ShadowEvent

    async with factory() as db:
        result = await db.execute(
            select(ShadowEvent).order_by(ShadowEvent.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()


@pytest.mark.asyncio
async def test_protocol_evaluate_writes_shadow_event(
    client_and_session: tuple[httpx.AsyncClient, async_sessionmaker[AsyncSession]],
) -> None:
    """POST /protocols/evaluate → shadow_events row with correct event_type + ho_user_id."""
    client, factory = client_and_session
    headers, user_id, patient_id = await _setup(client)

    count_before = await _count_shadow_events(factory)

    resp = await client.post(
        "/api/v1/protocols/evaluate",
        json={"protocol": "hyperkalemia", "patient_id": patient_id, "values": {"potassium": 6.2, "ecg_changes": False}},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text

    count_after = await _count_shadow_events(factory)
    assert count_after == count_before + 1, (
        f"Expected {count_before + 1} shadow_events, got {count_after}"
    )

    event = await _get_latest_shadow_event(factory)
    assert event is not None
    assert str(event.event_type) == "protocol_evaluation"  # type: ignore[attr-defined]
    assert str(event.ho_user_id) == user_id  # type: ignore[attr-defined]
    assert event.divergence_score is None  # type: ignore[attr-defined]
    assert event.shift_id is None  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_shadow_event_payload_is_phi_free(
    client_and_session: tuple[httpx.AsyncClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Payload keys must be exactly {protocol, severity, actions_count} — no patient_id."""
    client, factory = client_and_session
    headers, user_id, patient_id = await _setup(client)

    resp = await client.post(
        "/api/v1/protocols/evaluate",
        json={"protocol": "hyperkalemia", "patient_id": patient_id, "values": {"potassium": 6.2, "ecg_changes": False}},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text

    event = await _get_latest_shadow_event(factory)
    assert event is not None
    payload = event.payload  # type: ignore[attr-defined]
    assert set(payload.keys()) == {"protocol", "severity", "actions_count"}, (
        f"Unexpected payload keys: {set(payload.keys())}"
    )
    assert "patient_id" not in payload
    assert "patient_name" not in payload
    assert payload["protocol"] == "hyperkalemia"
    assert payload["severity"] == "severe"
    assert isinstance(payload["actions_count"], int)
    assert payload["actions_count"] > 0


@pytest.mark.asyncio
async def test_dka_evaluate_writes_second_shadow_event(
    client_and_session: tuple[httpx.AsyncClient, async_sessionmaker[AsyncSession]],
) -> None:
    """Two protocol evaluations → two additional shadow_events rows."""
    client, factory = client_and_session
    headers, user_id, patient_id = await _setup(client)

    count_before = await _count_shadow_events(factory)

    r1 = await client.post(
        "/api/v1/protocols/evaluate",
        json={"protocol": "hyperkalemia", "patient_id": patient_id, "values": {"potassium": 6.2}},
        headers=headers,
    )
    assert r1.status_code == 200

    r2 = await client.post(
        "/api/v1/protocols/evaluate",
        json={"protocol": "dka", "patient_id": patient_id, "values": {"blood_sugar": 380.0, "ph": 7.15, "hco3": 12.0, "mental_status": "alert"}},
        headers=headers,
    )
    assert r2.status_code == 200

    count_after = await _count_shadow_events(factory)
    assert count_after == count_before + 2, (
        f"Expected {count_before + 2} shadow_events, got {count_after}"
    )


@pytest.mark.asyncio
async def test_get_protocols_list_writes_no_shadow_event(
    client_and_session: tuple[httpx.AsyncClient, async_sessionmaker[AsyncSession]],
) -> None:
    """GET /protocols list must NOT write shadow_events rows."""
    client, factory = client_and_session
    r = await client.post(
        "/api/v1/auth/register",
        json={**_REG, "email": "shadow2@test.com", "pmdc_number": "99999-T"},
    )
    assert r.status_code == 201, r.text
    headers = {"Authorization": f"Bearer {r.json()['token']}"}

    count_before = await _count_shadow_events(factory)
    resp = await client.get("/api/v1/protocols", headers=headers)
    assert resp.status_code == 200

    count_after = await _count_shadow_events(factory)
    assert count_after == count_before, (
        f"GET /protocols should not write shadow_events (before={count_before}, after={count_after})"
    )
