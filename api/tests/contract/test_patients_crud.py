"""T078 RED — Patient CRUD contract tests (Story 1 ACs 1–5 + edge cases).

Tests: POST /patients (201 + validation), GET /patients (ward filter + summary),
PATCH /patients/{id} (partial update, empty body), unauthenticated → 401.
"""

from __future__ import annotations

import uuid
from datetime import date

import httpx
import pytest

# ── helpers ──────────────────────────────────────────────────────────────────

_REG_PAYLOAD = {
    "name": "Test HO",
    "email": "ho@testpatients.com",
    "password": "StrongPass!234",
    "pmdc_number": "12345-A",
    "hospital_code": "FSL",
    "department": "General Surgery",
}


async def _auth_header(client: httpx.AsyncClient) -> dict[str, str]:
    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _patient_payload(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "bed_number": "ICU-1",
        "name": "Cook Lateef",
        "age": 45,
        "sex": "male",
        "date_of_admission": str(date.today()),
        "provisional_diagnosis": "Right hypochondriac pain",
        "acuity": "stable",
        "ward": "ortho",
    }
    base.update(overrides)
    return base


# ── T078 tests ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_patient_returns_201(client: httpx.AsyncClient) -> None:
    headers = await _auth_header(client)
    r = await client.post("/api/v1/patients", json=_patient_payload(), headers=headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert uuid.UUID(body["id"])
    assert body["status"] == "admitted"
    assert body["ward"] == "ortho"
    assert body["created_by"] is not None
    # timestamps should be present
    assert "created_at" in body
    assert "updated_at" in body


@pytest.mark.asyncio
async def test_create_patient_missing_bed_number_returns_400(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    payload = _patient_payload()
    del payload["bed_number"]
    r = await client.post("/api/v1/patients", json=payload, headers=headers)
    assert r.status_code == 400, r.text
    assert r.json()["error"] == "validation_error"


@pytest.mark.asyncio
async def test_create_patient_future_admission_returns_400(
    client: httpx.AsyncClient,
) -> None:
    from datetime import timedelta

    headers = await _auth_header(client)
    tomorrow = str(date.today() + timedelta(days=1))
    r = await client.post(
        "/api/v1/patients",
        json=_patient_payload(date_of_admission=tomorrow),
        headers=headers,
    )
    assert r.status_code == 400, r.text
    assert r.json()["error"] == "validation_error"


@pytest.mark.asyncio
async def test_list_patients_ward_filter(client: httpx.AsyncClient) -> None:
    headers = await _auth_header(client)
    # Create ortho patient
    r1 = await client.post("/api/v1/patients", json=_patient_payload(ward="ortho"), headers=headers)
    assert r1.status_code == 201
    # Create family patient
    r2 = await client.post(
        "/api/v1/patients",
        json=_patient_payload(bed_number="F-1", ward="family"),
        headers=headers,
    )
    assert r2.status_code == 201

    r = await client.get("/api/v1/patients", params={"ward": "ortho"}, headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "patients" in body
    assert "summary" in body
    for p in body["patients"]:
        assert p["ward"] == "ortho"


@pytest.mark.asyncio
async def test_list_patients_summary_counts(client: httpx.AsyncClient) -> None:
    headers = await _auth_header(client)
    await client.post("/api/v1/patients", json=_patient_payload(acuity="critical"), headers=headers)
    await client.post(
        "/api/v1/patients",
        json=_patient_payload(bed_number="2", acuity="stable"),
        headers=headers,
    )

    r = await client.get("/api/v1/patients", headers=headers)
    assert r.status_code == 200
    summary = r.json()["summary"]
    assert "total" in summary
    assert "critical" in summary
    assert summary["critical"] >= 1
    assert summary["stable"] >= 1


@pytest.mark.asyncio
async def test_patch_patient_acuity(client: httpx.AsyncClient) -> None:
    headers = await _auth_header(client)
    r = await client.post("/api/v1/patients", json=_patient_payload(), headers=headers)
    assert r.status_code == 201
    pid = r.json()["id"]

    r2 = await client.patch(f"/api/v1/patients/{pid}", json={"acuity": "urgent"}, headers=headers)
    assert r2.status_code == 200, r2.text
    body = r2.json()
    assert body["acuity"] == "urgent"
    assert body["bed_number"] == "ICU-1"  # other fields unchanged


@pytest.mark.asyncio
async def test_patch_patient_empty_body_accepted(client: httpx.AsyncClient) -> None:
    headers = await _auth_header(client)
    r = await client.post("/api/v1/patients", json=_patient_payload(), headers=headers)
    assert r.status_code == 201
    pid = r.json()["id"]

    r2 = await client.patch(f"/api/v1/patients/{pid}", json={}, headers=headers)
    assert r2.status_code == 200, r2.text


@pytest.mark.asyncio
async def test_create_patient_bed_number_icu3_accepted(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    r = await client.post(
        "/api/v1/patients", json=_patient_payload(bed_number="ICU-3"), headers=headers
    )
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_unauthenticated_request_returns_401(client: httpx.AsyncClient) -> None:
    r = await client.post("/api/v1/patients", json=_patient_payload())
    assert r.status_code == 401
