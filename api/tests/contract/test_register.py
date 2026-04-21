"""T025 RED — /auth/register contract (Story 1 acceptance criteria)."""

from __future__ import annotations

import uuid

import httpx
import pytest

from app.services.jwt_service import verify_token


@pytest.mark.asyncio
async def test_register_happy_path_returns_201_with_jwt(
    client: httpx.AsyncClient, valid_register_payload: dict[str, str]
) -> None:
    response = await client.post("/api/v1/auth/register", json=valid_register_payload)
    assert response.status_code == 201
    body = response.json()
    assert set(body.keys()) == {"id", "token"}
    assert uuid.UUID(body["id"])
    claims = verify_token(body["token"])
    assert str(claims.user_id) == body["id"]


@pytest.mark.asyncio
async def test_register_weak_password_400(
    client: httpx.AsyncClient, valid_register_payload: dict[str, str]
) -> None:
    payload = valid_register_payload | {"password": "short"}
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    body = response.json()
    assert body["error"] == "weak_password"
    assert set(body.keys()) == {"error", "message"}


@pytest.mark.asyncio
async def test_register_breached_password_400(
    client: httpx.AsyncClient, valid_register_payload: dict[str, str]
) -> None:
    payload = valid_register_payload | {"password": "Password1234"}
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert response.json()["error"] == "breached_password"


@pytest.mark.asyncio
async def test_register_invalid_pmdc_400(
    client: httpx.AsyncClient, valid_register_payload: dict[str, str]
) -> None:
    payload = valid_register_payload | {"pmdc_number": "BADPMDC"}
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert response.json()["error"] == "invalid_pmdc"


@pytest.mark.asyncio
async def test_register_duplicate_returns_generic_409(
    client: httpx.AsyncClient, valid_register_payload: dict[str, str]
) -> None:
    r1 = await client.post("/api/v1/auth/register", json=valid_register_payload)
    assert r1.status_code == 201

    # Duplicate email (case-insensitive).
    dup_email = valid_register_payload | {
        "email": valid_register_payload["email"].upper(),
        "pmdc_number": "99999-Z",
    }
    r2 = await client.post("/api/v1/auth/register", json=dup_email)
    assert r2.status_code == 409
    body = r2.json()
    assert body["error"] == "already_registered"
    # Message MUST NOT disclose which field collided.
    assert "email" not in body["message"].lower()
    assert "pmdc" not in body["message"].lower()

    # Duplicate PMDC (different email).
    dup_pmdc = valid_register_payload | {
        "email": "someone.else@example.com",
    }
    r3 = await client.post("/api/v1/auth/register", json=dup_pmdc)
    assert r3.status_code == 409
    assert r3.json()["error"] == "already_registered"
