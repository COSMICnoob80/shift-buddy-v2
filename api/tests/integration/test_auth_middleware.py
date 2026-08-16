"""T029 RED — BearerAuthMiddleware behaviour on a throwaway protected route.

Mirrors the public-allowlist policy: missing/malformed/expired/invalid tokens
return {error, message} envelopes with WWW-Authenticate: Bearer; a valid
token attaches request.state.user_id and allows the route.
"""

from __future__ import annotations

import uuid

import httpx
import pytest
from fastapi import FastAPI, Request

from app.services import jwt_service
from app.services.jwt_service import issue_token


def _attach_probe(app: FastAPI) -> None:
    @app.get("/api/v1/_probe")
    async def _probe(request: Request) -> dict[str, str]:
        return {"user_id": str(request.state.user_id)}


@pytest.mark.asyncio
async def test_missing_bearer_returns_401(app: FastAPI, client: httpx.AsyncClient) -> None:
    _attach_probe(app)
    r = await client.get("/api/v1/_probe")
    assert r.status_code == 401
    assert r.json()["error"] == "unauthenticated"
    assert r.headers.get("WWW-Authenticate") == "Bearer"


@pytest.mark.asyncio
async def test_malformed_bearer_returns_401(app: FastAPI, client: httpx.AsyncClient) -> None:
    _attach_probe(app)
    r = await client.get(
        "/api/v1/_probe",
        headers={"Authorization": "NotBearer xxx.yyy.zzz"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_returns_token_expired(
    app: FastAPI, client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    _attach_probe(app)
    t0 = 1_700_000_000
    monkeypatch.setattr(jwt_service, "_now", lambda: t0)
    token = issue_token(uuid.uuid4())
    monkeypatch.setattr(jwt_service, "_now", lambda: t0 + 10_000)

    r = await client.get("/api/v1/_probe", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401
    assert r.json()["error"] == "token_expired"


@pytest.mark.asyncio
async def test_valid_token_allows_request(app: FastAPI, client: httpx.AsyncClient) -> None:
    _attach_probe(app)
    user_id = uuid.uuid4()
    token = issue_token(user_id)
    r = await client.get("/api/v1/_probe", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json() == {"user_id": str(user_id)}


@pytest.mark.asyncio
async def test_public_paths_do_not_require_token(app: FastAPI, client: httpx.AsyncClient) -> None:
    r = await client.get("/api/v1/health")
    assert r.status_code == 200
