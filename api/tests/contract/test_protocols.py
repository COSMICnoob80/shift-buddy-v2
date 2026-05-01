"""T102/T119 RED — Protocol schema import guard + full contract tests.

T102: schema import guard (already passing after T103).
T119: full contract tests — all 5 cases fail until T120 implements the router.
"""

from __future__ import annotations

from datetime import UTC, date, datetime

import httpx
import pytest


def test_protocol_schemas_importable() -> None:
    from app.schemas.protocols import (  # noqa: F401
        ProtocolEvaluateRequest,
        ProtocolEvaluateResponse,
        Recommendation,
    )

    assert ProtocolEvaluateRequest is not None
    assert ProtocolEvaluateResponse is not None
    assert Recommendation is not None


# ── Helpers ────────────────────────────────────────────────────────────────────

_REG_PAYLOAD = {
    "name": "Protocol HO",
    "email": "ho-proto@testproto.com",
    "password": "StrongPass!234",
    "pmdc_number": "77777-P",
    "hospital_code": "FSL",
    "department": "General Medicine",
}

_PATIENT_PAYLOAD = {
    "bed_number": "PROTO-1",
    "name": "Proto Patient",
    "age": 55,
    "sex": "male",
    "date_of_admission": str(date.today()),
    "provisional_diagnosis": "Protocol test",
    "ward": "surgical_itc",
    "acuity": "stable",
}


async def _setup_patient(client: httpx.AsyncClient) -> tuple[dict[str, str], str]:
    """Register + login + create patient; return (auth_headers, patient_id)."""
    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    token = r.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    pr = await client.post("/api/v1/patients", json=_PATIENT_PAYLOAD, headers=headers)
    assert pr.status_code == 201, pr.text
    patient_id = pr.json()["id"]
    return headers, patient_id


# ── T119 contract cases ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_protocols_list(client: httpx.AsyncClient) -> None:
    """GET /protocols returns 200 with static list; no DB hit required."""
    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    headers = {"Authorization": f"Bearer {r.json()['token']}"}

    resp = await client.get("/api/v1/protocols", headers=headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "protocols" in body
    names = [p["name"] for p in body["protocols"]]
    assert "hyperkalemia" in names
    assert "aki_staging" in names
    assert "dka" in names


@pytest.mark.asyncio
async def test_evaluate_unknown_protocol_returns_400(client: httpx.AsyncClient) -> None:
    """POST /protocols/evaluate with unknown protocol → 400 protocol_not_found."""
    r = await client.post("/api/v1/auth/register", json={**_REG_PAYLOAD, "email": "u2@p.com", "pmdc_number": "11111-Z"})
    assert r.status_code == 201, r.text
    headers = {"Authorization": f"Bearer {r.json()['token']}"}

    resp = await client.post(
        "/api/v1/protocols/evaluate",
        json={"protocol": "unknown_protocol", "patient_id": "00000000-0000-0000-0000-000000000001", "values": {}},
        headers=headers,
    )
    assert resp.status_code == 400, resp.text
    assert resp.json()["error"] == "protocol_not_found"


@pytest.mark.asyncio
async def test_evaluate_hyperkalemia_severe(client: httpx.AsyncClient) -> None:
    """POST /protocols/evaluate hyperkalemia K+=6.2 → severity=severe, Calcium Gluconate priority 1."""
    headers, patient_id = await _setup_patient(client)

    resp = await client.post(
        "/api/v1/protocols/evaluate",
        json={
            "protocol": "hyperkalemia",
            "patient_id": patient_id,
            "values": {"potassium": 6.2, "ecg_changes": False},
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["severity"] == "severe"
    assert body["alert_generated"] is True
    recs = body["recommendations"]
    assert len(recs) > 0
    priority_1 = next((r for r in recs if r["priority"] == 1), None)
    assert priority_1 is not None
    assert "Calcium Gluconate" in priority_1["action"]
    for rec in recs:
        assert rec["source"], f"Recommendation '{rec['action']}' missing source (Principle IX)"


@pytest.mark.asyncio
async def test_evaluate_aki_no_baseline_returns_insufficient_data(client: httpx.AsyncClient) -> None:
    """POST /protocols/evaluate aki_staging with no prior Creatinine → insufficient_data."""
    headers, patient_id = await _setup_patient(client)

    resp = await client.post(
        "/api/v1/protocols/evaluate",
        json={
            "protocol": "aki_staging",
            "patient_id": patient_id,
            "values": {"creatinine_current": 1.4},
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["severity"] == "insufficient_data"
    assert body["alert_generated"] is False


@pytest.mark.asyncio
async def test_evaluate_unauthenticated_returns_401(client: httpx.AsyncClient) -> None:
    """Protocol endpoints require authentication."""
    resp = await client.get("/api/v1/protocols")
    assert resp.status_code == 401

    resp2 = await client.post(
        "/api/v1/protocols/evaluate",
        json={"protocol": "hyperkalemia", "patient_id": "00000000-0000-0000-0000-000000000001", "values": {"potassium": 6.2}},
    )
    assert resp2.status_code == 401
