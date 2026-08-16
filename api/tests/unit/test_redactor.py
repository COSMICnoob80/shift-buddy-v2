"""FR-008 / NFR-001 — structlog RedactingProcessor unit tests.

Every one of `name`, `email`, `pmdc`, `pmdc_number`, `mrn`, `dob`, `phone`,
`password`, `token`, `authorization` MUST be replaced with the literal
`[REDACTED]` in serialized event dicts. Nested dicts and lists of dicts
MUST also be walked (PHI can hide two levels deep in request bodies).
"""

from __future__ import annotations

from typing import Any

import pytest

from app.core.logging import RedactingProcessor

REDACTED = "[REDACTED]"

SENSITIVE_KEYS = [
    "name",
    "email",
    "pmdc",
    "pmdc_number",
    "mrn",
    "dob",
    "phone",
    "password",
    "token",
    "authorization",
]


@pytest.fixture
def processor() -> RedactingProcessor:
    return RedactingProcessor()


@pytest.mark.parametrize("key", SENSITIVE_KEYS)
def test_top_level_key_redacted(processor: RedactingProcessor, key: str) -> None:
    event: dict[str, Any] = {"event": "login_attempt", key: "real-phi-value"}
    out = processor(None, "info", event)
    assert out[key] == REDACTED
    assert out["event"] == "login_attempt"


def test_nested_dict_redacted(processor: RedactingProcessor) -> None:
    event: dict[str, Any] = {
        "event": "register",
        "payload": {"email": "ho@example.com", "hospital_code": "FSL"},
    }
    out = processor(None, "info", event)
    assert out["payload"]["email"] == REDACTED
    assert out["payload"]["hospital_code"] == "FSL"


def test_list_of_dicts_redacted(processor: RedactingProcessor) -> None:
    event: dict[str, Any] = {
        "event": "batch",
        "users": [
            {"email": "a@b.c", "role": "ho"},
            {"phone": "+92 300 0000000", "role": "ho"},
        ],
    }
    out = processor(None, "info", event)
    assert out["users"][0]["email"] == REDACTED
    assert out["users"][0]["role"] == "ho"
    assert out["users"][1]["phone"] == REDACTED


def test_non_sensitive_keys_preserved(processor: RedactingProcessor) -> None:
    event: dict[str, Any] = {
        "event": "request",
        "route": "/api/v1/health",
        "status": 200,
        "latency_ms": 3,
        "user_id": "11111111-1111-1111-1111-111111111111",
    }
    out = processor(None, "info", event)
    assert out == event
