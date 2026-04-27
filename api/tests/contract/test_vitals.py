"""T083 RED — Vitals contract tests (Story 2 ACs 1–3 + validation).

Tests: POST partial vitals → 201; future recorded_at → 400; all-null → 400;
GET sorted ascending; nonexistent patient → 404; unauthenticated → 401.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

import httpx
import pytest

# ── helpers ───────────────────────────────────────────────────────────────────

_REG_PAYLOAD = {
    "name": "Vitals HO",
    "email": "ho@testvitals.com",
    "password": "StrongPass!234",
    "pmdc_number": "77777-V",
    "hospital_code": "FSL",
    "department": "General Surgery",
}


async def _auth_header(client: httpx.AsyncClient) -> dict[str, str]:
    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


async def _create_patient(client: httpx.AsyncClient, headers: dict[str, str]) -> str:
    payload = {
        "bed_number": "V-1",
        "name": "Vitals Patient",
        "age": 35,
        "sex": "male",
        "date_of_admission": str(date.today()),
        "provisional_diagnosis": "Monitoring",
        "acuity": "stable",
        "ward": "ortho",
    }
    r = await client.post("/api/v1/patients", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


def _now_utc_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


# ── T083 tests ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_post_partial_vitals_returns_201(client: httpx.AsyncClient) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    r = await client.post(
        f"/api/v1/patients/{pid}/vitals",
        json={"heart_rate": 88, "spo2": 97, "recorded_at": _now_utc_iso()},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert uuid.UUID(body["id"])
    assert body["patient_id"] == pid
    assert body["heart_rate"] == 88
    assert body["spo2"] == 97
    assert body["systolic_bp"] is None
    assert "recorded_at" in body


@pytest.mark.asyncio
async def test_post_vitals_future_recorded_at_returns_400(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    future = (datetime.now(UTC) + timedelta(minutes=1)).isoformat().replace("+00:00", "Z")
    r = await client.post(
        f"/api/v1/patients/{pid}/vitals",
        json={"heart_rate": 88, "recorded_at": future},
        headers=headers,
    )
    assert r.status_code == 400, r.text
    assert r.json()["error"] == "validation_error"


@pytest.mark.asyncio
async def test_post_vitals_all_null_measurements_returns_400(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    r = await client.post(
        f"/api/v1/patients/{pid}/vitals",
        json={"recorded_at": _now_utc_iso()},
        headers=headers,
    )
    assert r.status_code == 400, r.text
    assert r.json()["error"] == "validation_error"


@pytest.mark.asyncio
async def test_list_vitals_sorted_ascending(client: httpx.AsyncClient) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    t1 = "2026-01-01T10:00:00Z"
    t2 = "2026-01-01T11:00:00Z"

    await client.post(
        f"/api/v1/patients/{pid}/vitals",
        json={"heart_rate": 70, "recorded_at": t2},
        headers=headers,
    )
    await client.post(
        f"/api/v1/patients/{pid}/vitals",
        json={"heart_rate": 65, "recorded_at": t1},
        headers=headers,
    )

    r = await client.get(f"/api/v1/patients/{pid}/vitals", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "vitals" in body
    assert len(body["vitals"]) == 2
    assert body["vitals"][0]["heart_rate"] == 65  # t1 first
    assert body["vitals"][1]["heart_rate"] == 70  # t2 second


@pytest.mark.asyncio
async def test_list_vitals_nonexistent_patient_returns_404(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    fake_id = str(uuid.uuid4())
    r = await client.get(f"/api/v1/patients/{fake_id}/vitals", headers=headers)
    assert r.status_code == 404, r.text
    assert r.json()["error"] == "patient_not_found"


@pytest.mark.asyncio
async def test_post_vitals_unauthenticated_returns_401(
    client: httpx.AsyncClient,
) -> None:
    fake_id = str(uuid.uuid4())
    r = await client.post(
        f"/api/v1/patients/{fake_id}/vitals",
        json={"heart_rate": 80, "recorded_at": _now_utc_iso()},
    )
    assert r.status_code == 401
