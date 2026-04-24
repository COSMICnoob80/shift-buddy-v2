"""T019 RED — Error envelope (NFR-003): {"error", "message"}, never {"detail"}."""

from __future__ import annotations

import httpx
import pytest
from fastapi import HTTPException

from app.main import create_app


@pytest.mark.asyncio
async def test_http_exception_rendered_as_error_envelope() -> None:
    app = create_app()

    @app.get("/_test/teapot", include_in_schema=False)
    async def _teapot() -> None:
        raise HTTPException(status_code=418, detail="invalid_credentials")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/_test/teapot")

    assert response.status_code == 418
    body = response.json()
    assert set(body.keys()) == {"error", "message"}
    assert "detail" not in body
    assert body["error"] == "invalid_credentials"
