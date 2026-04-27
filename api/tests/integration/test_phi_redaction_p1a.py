"""T088 RED — PHI redaction across P1a endpoints (Principle IV).

POSTs a patient with name and bed_number, then vitals and labs.
Asserts that name and bed_number never appear as literals in any log event.
Fails while bed_number is absent from SENSITIVE_KEYS; passes after T090.
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime

import httpx
import pytest

_REG_PAYLOAD = {
    "name": "Redact HO",
    "email": "ho@testredact.com",
    "password": "StrongPass!234",
    "pmdc_number": "55555-R",
    "hospital_code": "FSL",
    "department": "General Surgery",
}

_PATIENT_NAME = "John Doe"
_PATIENT_BED = "ICU-1"


@pytest.mark.asyncio
async def test_patient_phi_not_in_logs(
    client: httpx.AsyncClient,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO)

    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    headers = {"Authorization": f"Bearer {r.json()['token']}"}

    patient_payload = {
        "bed_number": _PATIENT_BED,
        "name": _PATIENT_NAME,
        "age": 45,
        "sex": "male",
        "date_of_admission": str(date.today()),
        "provisional_diagnosis": "Test PHI redaction",
        "acuity": "stable",
        "ward": "ortho",
    }
    rp = await client.post("/api/v1/patients", json=patient_payload, headers=headers)
    assert rp.status_code == 201, rp.text
    pid = rp.json()["id"]

    now_str = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    await client.post(
        f"/api/v1/patients/{pid}/vitals",
        json={"heart_rate": 80, "recorded_at": now_str},
        headers=headers,
    )

    lab_str = "2026-02-16T15:00:00Z"
    await client.post(
        f"/api/v1/patients/{pid}/labs",
        json={"test_name": "K+", "value": 4.0, "unit": "mEq/L", "recorded_at": lab_str},
        headers=headers,
    )

    combined = "\n".join(rec.getMessage() for rec in caplog.records)

    assert _PATIENT_NAME not in combined, (
        f"PHI leaked: patient name '{_PATIENT_NAME}' found in logs"
    )
    assert _PATIENT_BED not in combined, f"PHI leaked: bed_number '{_PATIENT_BED}' found in logs"
