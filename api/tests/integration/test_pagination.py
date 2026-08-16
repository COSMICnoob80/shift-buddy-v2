"""T081 RED — Pagination validation and behavior across all list endpoints.

Tests: GET /patients with invalid page/limit → 400; empty ward → 200 zeros;
25 ortho patients → page 1 returns 20, page 2 returns 5.
Also tests /vitals and /labs pagination params (RED until T084/T086).
"""

from __future__ import annotations

from datetime import date

import httpx
import pytest

# ── helpers ───────────────────────────────────────────────────────────────────

_REG_PAYLOAD = {
    "name": "Pagination HO",
    "email": "ho@testpagination.com",
    "password": "StrongPass!234",
    "pmdc_number": "99999-P",
    "hospital_code": "FSL",
    "department": "General Surgery",
}


async def _auth_header(client: httpx.AsyncClient) -> dict[str, str]:
    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _patient_payload(idx: int, ward: str = "ortho") -> dict[str, object]:
    return {
        "bed_number": str(idx),
        "name": f"Patient {idx}",
        "age": 30,
        "sex": "male",
        "date_of_admission": str(date.today()),
        "provisional_diagnosis": "Test diagnosis",
        "acuity": "stable",
        "ward": ward,
    }


# ── T081 tests ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_patients_limit_over_100_returns_400(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    r = await client.get("/api/v1/patients", params={"limit": 101}, headers=headers)
    assert r.status_code == 400, r.text
    assert r.json()["error"] == "validation_error"


@pytest.mark.asyncio
async def test_list_patients_page_zero_returns_400(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    r = await client.get("/api/v1/patients", params={"page": 0}, headers=headers)
    assert r.status_code == 400, r.text
    assert r.json()["error"] == "validation_error"


@pytest.mark.asyncio
async def test_list_patients_empty_ward_returns_200_zeros(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    r = await client.get("/api/v1/patients", params={"ward": "child"}, headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["patients"] == []
    assert body["summary"]["total"] == 0
    assert body["summary"]["critical"] == 0
    assert body["summary"]["urgent"] == 0
    assert body["summary"]["stable"] == 0
    assert body["summary"]["discharge_ready"] == 0
    assert body["page"] == 1
    assert body["limit"] == 20
    assert body["total_pages"] == 0


@pytest.mark.asyncio
async def test_list_patients_pagination_25_patients(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    for i in range(1, 26):
        r = await client.post(
            "/api/v1/patients", json=_patient_payload(i, "ortho"), headers=headers
        )
        assert r.status_code == 201, r.text

    r1 = await client.get(
        "/api/v1/patients", params={"ward": "ortho", "limit": 20}, headers=headers
    )
    assert r1.status_code == 200, r1.text
    body1 = r1.json()
    assert len(body1["patients"]) == 20
    assert body1["total_pages"] == 2
    assert body1["page"] == 1

    r2 = await client.get(
        "/api/v1/patients", params={"ward": "ortho", "limit": 20, "page": 2}, headers=headers
    )
    assert r2.status_code == 200, r2.text
    body2 = r2.json()
    assert len(body2["patients"]) == 5
    assert body2["page"] == 2


@pytest.mark.asyncio
async def test_list_vitals_limit_over_100_returns_400(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    r = await client.post("/api/v1/patients", json=_patient_payload(900), headers=headers)
    assert r.status_code == 201
    pid = r.json()["id"]

    rv = await client.get(f"/api/v1/patients/{pid}/vitals", params={"limit": 101}, headers=headers)
    assert rv.status_code == 400, rv.text
    assert rv.json()["error"] == "validation_error"


@pytest.mark.asyncio
async def test_list_labs_limit_over_100_returns_400(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    r = await client.post("/api/v1/patients", json=_patient_payload(901), headers=headers)
    assert r.status_code == 201
    pid = r.json()["id"]

    rl = await client.get(f"/api/v1/patients/{pid}/labs", params={"limit": 101}, headers=headers)
    assert rl.status_code == 400, rl.text
    assert rl.json()["error"] == "validation_error"
