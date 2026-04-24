"""T028 RED — /auth/login rate-limit (5/min/IP) → 429."""

from __future__ import annotations

import httpx
import pytest


@pytest.mark.asyncio
async def test_sixth_login_within_60s_returns_429(
    client: httpx.AsyncClient,
) -> None:
    body = {"email": "nobody@example.com", "password": "WhateverPass!234"}

    # First 5 within the window → 401 invalid_credentials (user doesn't exist).
    for _ in range(5):
        r = await client.post("/api/v1/auth/login", json=body)
        assert r.status_code == 401

    # 6th in the same window → 429 via slowapi + envelope.
    r6 = await client.post("/api/v1/auth/login", json=body)
    assert r6.status_code == 429
    assert r6.json() == {"error": "rate_limited", "message": "Too many requests. Slow down."}
