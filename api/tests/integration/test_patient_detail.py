"""T089 RED — GET /patients/{id} returns embedded vitals and labs (FR-006).

Fails until T090 wires get_patient_detail to actually load vitals and labs.
"""

from __future__ import annotations

from datetime import date

import httpx
import pytest

_REG_PAYLOAD = {
    "name": "Detail HO",
    "email": "ho@testdetail.com",
    "password": "StrongPass!234",
    "pmdc_number": "44444-D",
    "hospital_code": "FSL",
    "department": "General Surgery",
}


@pytest.mark.asyncio
async def test_patient_detail_embeds_vitals_and_labs(
    client: httpx.AsyncClient,
) -> None:
    r = await client.post("/api/v1/auth/register", json=_REG_PAYLOAD)
    assert r.status_code == 201, r.text
    headers = {"Authorization": f"Bearer {r.json()['token']}"}

    rp = await client.post(
        "/api/v1/patients",
        json={
            "bed_number": "DET-1",
            "name": "Detail Patient",
            "age": 40,
            "sex": "male",
            "date_of_admission": str(date.today()),
            "provisional_diagnosis": "Detail test",
            "acuity": "stable",
            "ward": "ortho",
        },
        headers=headers,
    )
    assert rp.status_code == 201, rp.text
    pid = rp.json()["id"]

    now1 = "2026-03-01T09:00:00Z"
    now2 = "2026-03-01T10:00:00Z"
    for t in [now1, now2]:
        rv = await client.post(
            f"/api/v1/patients/{pid}/vitals",
            json={"heart_rate": 72, "recorded_at": t},
            headers=headers,
        )
        assert rv.status_code == 201, rv.text

    lab1 = "2026-03-01T08:00:00Z"
    lab2 = "2026-03-01T11:00:00Z"
    for t in [lab2, lab1]:  # deliberately reversed to test sort
        rl = await client.post(
            f"/api/v1/patients/{pid}/labs",
            json={"test_name": "K+", "value": 4.0, "unit": "mEq/L", "recorded_at": t},
            headers=headers,
        )
        assert rl.status_code == 201, rl.text

    r_detail = await client.get(f"/api/v1/patients/{pid}", headers=headers)
    assert r_detail.status_code == 200, r_detail.text
    body = r_detail.json()

    assert "vitals" in body
    assert len(body["vitals"]) == 2
    assert body["vitals"][0]["recorded_at"] < body["vitals"][1]["recorded_at"]

    assert "labs" in body
    assert len(body["labs"]) == 2
    assert body["labs"][0]["recorded_at"] < body["labs"][1]["recorded_at"]

    assert body["id"] == pid
    assert body["bed_number"] == "DET-1"
