"""T018 RED — /api/v1/health liveness contract."""

from __future__ import annotations

import httpx
import pytest

from app.main import create_app


@pytest.mark.asyncio
async def test_health_returns_200_alive() -> None:
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "alive"
    assert isinstance(body["version"], str) and body["version"]


@pytest.mark.asyncio
async def test_health_does_not_touch_db(monkeypatch: pytest.MonkeyPatch) -> None:
    """Liveness MUST NOT open a DB connection (FR-001)."""

    def _boom(*_: object, **__: object) -> None:
        raise AssertionError("health endpoint should not create an engine")

    monkeypatch.setattr("app.models.db.get_engine", _boom)
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == 200
