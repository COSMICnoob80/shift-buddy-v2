"""T141 RED — Shadow suggest endpoint contract tests.

Tests:
(a) FEATURE_SHADOW_SUGGEST=false (default) → 404
(b) unknown patient_id → 404
(c) patient with K+=6.2 lab → returns severity="severe"
(d) shadow_events row written after call
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, patch

import httpx
import pytest

_REG_PAYLOAD = {
    "name": "Shadow HO",
    "email": "shadow_ho@test.com",
    "password": "StrongPass!234",
    "pmdc_number": "55555-A",
    "hospital_code": "LAHORE-GH",
    "department": "Internal Medicine",
}


async def _auth_header(client: httpx.AsyncClient) -> dict[str, str]:
    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _patient_payload(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "bed_number": "SW-1",
        "name": "Shadow Patient",
        "age": 50,
        "sex": "male",
        "date_of_admission": str(date.today()),
        "provisional_diagnosis": "Hyperkalemia workup",
        "acuity": "urgent",
        "ward": "family",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_shadow_suggest_flag_off_returns_404(client: httpx.AsyncClient) -> None:
    """(a) FEATURE_SHADOW_SUGGEST defaults to false → 404."""
    headers = await _auth_header(client)
    pid = str(uuid.uuid4())
    r = await client.get(
        f"/api/v1/shadow/suggest?patient_id={pid}",
        headers=headers,
    )
    assert r.status_code == 404, r.text
    assert r.json()["error"] == "feature_disabled"


@pytest.mark.asyncio
async def test_shadow_suggest_unknown_patient_returns_404(client: httpx.AsyncClient) -> None:
    """(b) Flag on but patient_id not found → 404 patient_not_found."""
    headers = await _auth_header(client)
    pid = str(uuid.uuid4())
    with patch("app.routers.shadow.get_feature_flags") as mock_flags:
        mock_flags.return_value.shadow_suggest = True
        r = await client.get(
            f"/api/v1/shadow/suggest?patient_id={pid}",
            headers=headers,
        )
    assert r.status_code == 404, r.text
    assert r.json()["error"] == "patient_not_found"


@pytest.mark.asyncio
async def test_shadow_suggest_k_plus_6_2_returns_severe(client: httpx.AsyncClient) -> None:
    """(c) Patient with K+=6.2 → severity="severe"."""
    headers = await _auth_header(client)

    # Create patient
    pr = await client.post("/api/v1/patients", json=_patient_payload(), headers=headers)
    assert pr.status_code == 201, pr.text
    patient_id = pr.json()["id"]

    # Add K+ = 6.2 lab
    lab_payload = {
        "test_name": "K+",
        "value": 6.2,
        "unit": "mEq/L",
        "reference_low": 3.5,
        "reference_high": 5.0,
        "recorded_at": datetime.now(UTC).isoformat(),
    }
    lr = await client.post(f"/api/v1/patients/{patient_id}/labs", json=lab_payload, headers=headers)
    assert lr.status_code == 201, lr.text

    with patch("app.routers.shadow.get_feature_flags") as mock_flags:
        mock_flags.return_value.shadow_suggest = True
        r = await client.get(
            f"/api/v1/shadow/suggest?patient_id={patient_id}&context=vitals",
            headers=headers,
        )

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["confidence"] == "deterministic"
    assert body["source"] == "protocol_engine"
    assert body["disclaimer"] == "SHADOW MODE — advisory only"
    assert body["severity"] == "severe"
    assert body["protocol"] == "hyperkalemia"
    assert len(body["suggestion"]) > 0


@pytest.mark.asyncio
async def test_shadow_suggest_writes_shadow_event(client: httpx.AsyncClient) -> None:
    """(d) shadow_events row is written — verified via shadow_event_service mock."""
    headers = await _auth_header(client)

    pr = await client.post("/api/v1/patients", json=_patient_payload(bed_number="SW-2"), headers=headers)
    assert pr.status_code == 201
    patient_id = pr.json()["id"]

    lab_payload = {
        "test_name": "K+",
        "value": 6.2,
        "unit": "mEq/L",
        "reference_low": 3.5,
        "reference_high": 5.0,
        "recorded_at": datetime.now(UTC).isoformat(),
    }
    await client.post(f"/api/v1/patients/{patient_id}/labs", json=lab_payload, headers=headers)

    with patch("app.routers.shadow.get_feature_flags") as mock_flags, \
         patch("app.routers.shadow.shadow_event_service.record_protocol_evaluation", new_callable=AsyncMock) as mock_log:
        mock_flags.return_value.shadow_suggest = True
        r = await client.get(
            f"/api/v1/shadow/suggest?patient_id={patient_id}",
            headers=headers,
        )

    assert r.status_code == 200, r.text
    # Synchronous log — must have been called exactly once
    mock_log.assert_called_once()
