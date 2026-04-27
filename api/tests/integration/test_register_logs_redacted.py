"""T031 — Register path MUST NOT leak PHI to logs (FR-008, Principle IV).

Registers a user, captures every structlog JSON event emitted during the call,
and asserts the redactor replaced each sensitive field with ``[REDACTED]`` while
the non-sensitive user UUID remained intact for ops correlation.
"""

from __future__ import annotations

import json
import logging

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_redacts_phi_in_logs(
    client: AsyncClient,
    valid_register_payload: dict,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO)

    resp = await client.post("/api/v1/auth/register", json=valid_register_payload)
    assert resp.status_code == 201, resp.text
    user_id = resp.json()["id"]

    messages = [rec.getMessage() for rec in caplog.records]
    combined = "\n".join(messages)

    register_events = [m for m in messages if '"user_registered"' in m and '"event"' in m]
    assert register_events, f"expected a user_registered structlog event; captured: {messages!r}"

    forbidden = {
        "name": valid_register_payload["name"],
        "email": valid_register_payload["email"],
        "pmdc_number": valid_register_payload["pmdc_number"],
        "password": valid_register_payload["password"],
    }
    for field, value in forbidden.items():
        assert value not in combined, (
            f"PHI leaked to logs: {field}={value!r} found in captured output"
        )

    event = json.loads(register_events[0])
    assert event["event"] == "user_registered"
    assert event["name"] == "[REDACTED]"
    assert event["email"] == "[REDACTED]"
    assert event["pmdc_number"] == "[REDACTED]"
    assert event["user_id"] == user_id
