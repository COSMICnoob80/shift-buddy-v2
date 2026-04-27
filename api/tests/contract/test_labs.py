"""T085 RED — Labs contract tests (Story 3 ACs 1–4 + is_critical logic).

Tests: POST K+ 6.2 → is_critical=true; K+ 4.0 → false; test_name filter;
sort by recorded_at; client-supplied is_critical → 400; reference range override;
Creatinine → false; nonexistent patient → 404.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

import httpx
import pytest

# ── helpers ───────────────────────────────────────────────────────────────────

_REG_PAYLOAD = {
    "name": "Labs HO",
    "email": "ho@testlabs.com",
    "password": "StrongPass!234",
    "pmdc_number": "66666-L",
    "hospital_code": "FSL",
    "department": "General Surgery",
}


async def _auth_header(client: httpx.AsyncClient) -> dict[str, str]:
    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


async def _create_patient(client: httpx.AsyncClient, headers: dict[str, str]) -> str:
    payload = {
        "bed_number": "L-1",
        "name": "Labs Patient",
        "age": 50,
        "sex": "female",
        "date_of_admission": str(date.today()),
        "provisional_diagnosis": "Lab testing",
        "acuity": "stable",
        "ward": "ortho",
    }
    r = await client.post("/api/v1/patients", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


def _recorded_at(offset_seconds: int = 0) -> str:
    from datetime import timedelta

    t = datetime(2026, 2, 16, 15, 0, 0, tzinfo=UTC) + timedelta(seconds=offset_seconds)
    return t.isoformat().replace("+00:00", "Z")


# ── T085 tests ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_post_lab_k_plus_critical_returns_is_critical_true(
    client: httpx.AsyncClient,
) -> None:
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
            "recorded_at": _recorded_at(),
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert uuid.UUID(body["id"])
    assert body["patient_id"] == pid
    assert body["is_critical"] is True


@pytest.mark.asyncio
async def test_post_lab_k_plus_normal_returns_is_critical_false(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    r = await client.post(
        f"/api/v1/patients/{pid}/labs",
        json={
            "test_name": "K+",
            "value": 4.0,
            "unit": "mEq/L",
            "reference_low": 3.5,
            "reference_high": 5.0,
            "recorded_at": _recorded_at(),
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    assert r.json()["is_critical"] is False


@pytest.mark.asyncio
async def test_list_labs_test_name_filter(client: httpx.AsyncClient) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    await client.post(
        f"/api/v1/patients/{pid}/labs",
        json={"test_name": "K+", "value": 4.0, "unit": "mEq/L", "recorded_at": _recorded_at(0)},
        headers=headers,
    )
    await client.post(
        f"/api/v1/patients/{pid}/labs",
        json={
            "test_name": "Na+",
            "value": 140.0,
            "unit": "mEq/L",
            "recorded_at": _recorded_at(1),
        },
        headers=headers,
    )

    r = await client.get(
        f"/api/v1/patients/{pid}/labs",
        params={"test_name": "K+"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["labs"]) == 1
    assert body["labs"][0]["test_name"] == "K+"


@pytest.mark.asyncio
async def test_list_labs_no_filter_sorted_ascending(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    await client.post(
        f"/api/v1/patients/{pid}/labs",
        json={
            "test_name": "Na+",
            "value": 140.0,
            "unit": "mEq/L",
            "recorded_at": _recorded_at(60),
        },
        headers=headers,
    )
    await client.post(
        f"/api/v1/patients/{pid}/labs",
        json={
            "test_name": "K+",
            "value": 4.0,
            "unit": "mEq/L",
            "recorded_at": _recorded_at(0),
        },
        headers=headers,
    )

    r = await client.get(f"/api/v1/patients/{pid}/labs", headers=headers)
    assert r.status_code == 200, r.text
    labs = r.json()["labs"]
    assert len(labs) == 2
    assert labs[0]["test_name"] == "K+"  # earlier timestamp first
    assert labs[1]["test_name"] == "Na+"


@pytest.mark.asyncio
async def test_post_lab_client_supplied_is_critical_returns_400(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    r = await client.post(
        f"/api/v1/patients/{pid}/labs",
        json={
            "test_name": "K+",
            "value": 6.2,
            "unit": "mEq/L",
            "is_critical": True,
            "recorded_at": _recorded_at(),
        },
        headers=headers,
    )
    assert r.status_code == 400, r.text
    assert r.json()["error"] in ("validation_error", "field_not_allowed")


@pytest.mark.asyncio
async def test_post_lab_k_plus_inside_ref_range_is_not_critical(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    r = await client.post(
        f"/api/v1/patients/{pid}/labs",
        json={
            "test_name": "K+",
            "value": 6.2,
            "unit": "mEq/L",
            "reference_low": 3.5,
            "reference_high": 7.0,
            "recorded_at": _recorded_at(),
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    assert r.json()["is_critical"] is False


@pytest.mark.asyncio
async def test_post_lab_creatinine_always_not_critical(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    pid = await _create_patient(client, headers)

    r = await client.post(
        f"/api/v1/patients/{pid}/labs",
        json={
            "test_name": "Creatinine",
            "value": 999.0,
            "unit": "mg/dL",
            "recorded_at": _recorded_at(),
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text
    assert r.json()["is_critical"] is False


@pytest.mark.asyncio
async def test_post_lab_nonexistent_patient_returns_404(
    client: httpx.AsyncClient,
) -> None:
    headers = await _auth_header(client)
    fake_id = str(uuid.uuid4())
    r = await client.post(
        f"/api/v1/patients/{fake_id}/labs",
        json={
            "test_name": "K+",
            "value": 4.0,
            "unit": "mEq/L",
            "recorded_at": _recorded_at(),
        },
        headers=headers,
    )
    assert r.status_code == 404, r.text
    assert r.json()["error"] == "patient_not_found"
