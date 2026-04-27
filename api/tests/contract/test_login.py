"""T026 RED — /auth/login contract (Story 2 ACs 1+2)."""

from __future__ import annotations

import httpx
import pytest


async def _register(client: httpx.AsyncClient, payload: dict[str, str]) -> None:
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_login_happy_path(
    client: httpx.AsyncClient, valid_register_payload: dict[str, str]
) -> None:
    await _register(client, valid_register_payload)
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": valid_register_payload["email"],
            "password": valid_register_payload["password"],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {"token", "user"}
    assert body["user"]["email"] == valid_register_payload["email"]
    assert body["user"]["role"] == "ho"
    assert "password" not in body["user"]


@pytest.mark.asyncio
async def test_login_wrong_password_returns_generic_401(
    client: httpx.AsyncClient, valid_register_payload: dict[str, str]
) -> None:
    await _register(client, valid_register_payload)
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": valid_register_payload["email"], "password": "WrongPass!2345"},
    )
    assert response.status_code == 401
    body = response.json()
    assert body == {"error": "invalid_credentials", "message": "Invalid email or password."}


@pytest.mark.asyncio
async def test_login_unknown_email_returns_identical_body(
    client: httpx.AsyncClient,
) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "WhateverPass!234"},
    )
    assert response.status_code == 401
    assert response.json() == {
        "error": "invalid_credentials",
        "message": "Invalid email or password.",
    }
