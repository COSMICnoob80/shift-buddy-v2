"""T027 RED — 5-fail / 15-min account lockout state machine (Story 2 AC3)."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import httpx
import pytest

from app.core.ratelimit import limiter
from app.services import auth_service


@pytest.fixture(autouse=True)
def _disable_rate_limit() -> Iterator[None]:
    """Lockout asserts ≥5 failed logins; rate-limit interference is tested
    separately in test_login_rate_limit.py."""
    limiter.enabled = False
    yield
    limiter.enabled = True


@pytest.mark.asyncio
async def test_lockout_after_five_failed_logins(
    client: httpx.AsyncClient, valid_register_payload: dict[str, str]
) -> None:
    r = await client.post("/api/v1/auth/register", json=valid_register_payload)
    assert r.status_code == 201

    body = {"email": valid_register_payload["email"], "password": "WrongPass!9999"}

    for _ in range(5):
        bad = await client.post("/api/v1/auth/login", json=body)
        assert bad.status_code == 401

    # 6th attempt, even with CORRECT password, must return 401 account_locked.
    locked = await client.post(
        "/api/v1/auth/login",
        json={
            "email": valid_register_payload["email"],
            "password": valid_register_payload["password"],
        },
    )
    assert locked.status_code == 401
    assert locked.json()["error"] == "account_locked"


@pytest.mark.asyncio
async def test_lockout_expires_after_window(
    client: httpx.AsyncClient,
    valid_register_payload: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    r = await client.post("/api/v1/auth/register", json=valid_register_payload)
    assert r.status_code == 201

    bad_body = {"email": valid_register_payload["email"], "password": "WrongPass!9999"}
    for _ in range(5):
        await client.post("/api/v1/auth/login", json=bad_body)

    # Advance clock past the 15-minute lockout window.
    future = datetime.now(UTC) + timedelta(minutes=20)
    monkeypatch.setattr(auth_service, "_utcnow", lambda: future)

    ok = await client.post(
        "/api/v1/auth/login",
        json={
            "email": valid_register_payload["email"],
            "password": valid_register_payload["password"],
        },
    )
    assert ok.status_code == 200, ok.json()
