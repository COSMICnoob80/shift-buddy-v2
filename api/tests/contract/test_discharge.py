"""T079 RED — Discharge endpoint contract tests (FR-008).

Tests: POST /patients/{id}/discharge returns 200 with status+discharged_at,
patient is soft-deleted (still accessible), 409 on second discharge, 404 on unknown.
"""

from __future__ import annotations

import uuid
from datetime import date

import httpx
import pytest


# ── helpers ──────────────────────────────────────────────────────────────────

_REG_PAYLOAD = {
    "name": "Discharge HO",
    "email": "ho@testdischarge.com",
    "password": "StrongPass!234",
    "pmdc_number": "54321-B",
    "hospital_code": "FSL",
    "department": "General Surgery",
}


async def _auth_header(client: httpx.AsyncClient) -> dict[str, str]:
    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _patient_payload() -> dict[str, object]:
    return {
        "bed_number": "D-1",
        "name": "Discharge Patient",
        "age": 40,
        "sex": "female",
        "date_of_admission": str(date.today()),
        "provisional_diagnosis": "Post-op recovery",
        "acuity": "stable",
        "ward": "ortho",
    }


# ── T079 tests ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_discharge_returns_200_with_status_and_timestamp(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    r = await client.post("/api/v1/patients", json=_patient_payload(), headers=headers)
    assert r.status_code == 201
    pid = r.json()["id"]

    r2 = await client.post(
        f"/api/v1/patients/{pid}/discharge",
        json={"condition_at_discharge": "Improved"},
        headers=headers,
    )
    assert r2.status_code == 200, r2.text
    body = r2.json()
    assert body["status"] == "discharged"
    assert "discharged_at" in body
    assert body["discharged_at"] is not None


@pytest.mark.asyncio
async def test_discharged_patient_still_accessible(client: httpx.AsyncClient) -> None:
    headers = await _auth_header(client)
    r = await client.post("/api/v1/patients", json=_patient_payload(), headers=headers)
    assert r.status_code == 201
    pid = r.json()["id"]

    await client.post(
        f"/api/v1/patients/{pid}/discharge",
        json={"condition_at_discharge": "Improved"},
        headers=headers,
    )

    r2 = await client.get(f"/api/v1/patients/{pid}", headers=headers)
    assert r2.status_code == 200, r2.text
    body = r2.json()
    assert body["status"] == "discharged"
    assert body["condition_at_discharge"] == "Improved"


@pytest.mark.asyncio
async def test_discharge_already_discharged_returns_409(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    r = await client.post("/api/v1/patients", json=_patient_payload(), headers=headers)
    assert r.status_code == 201
    pid = r.json()["id"]

    await client.post(
        f"/api/v1/patients/{pid}/discharge",
        json={"condition_at_discharge": "Improved"},
        headers=headers,
    )

    r2 = await client.post(
        f"/api/v1/patients/{pid}/discharge",
        json={"condition_at_discharge": "Improved again"},
        headers=headers,
    )
    assert r2.status_code == 409, r2.text
    assert r2.json()["error"] == "already_discharged"


@pytest.mark.asyncio
async def test_discharge_nonexistent_patient_returns_404(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    fake_id = str(uuid.uuid4())

    r = await client.post(
        f"/api/v1/patients/{fake_id}/discharge",
        json={"condition_at_discharge": "Improved"},
        headers=headers,
    )
    assert r.status_code == 404, r.text
    assert r.json()["error"] == "patient_not_found"
