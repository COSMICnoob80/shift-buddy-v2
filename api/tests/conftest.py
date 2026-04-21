"""Shared fixtures: in-memory SQLite app for contract/integration tests."""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.ratelimit import limiter
from app.main import create_app
from app.models.base import Base
from app.models.db import get_session


@pytest_asyncio.fixture
async def app() -> AsyncIterator[FastAPI]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def _override() -> AsyncIterator[AsyncSession]:
        async with factory() as sess:
            yield sess

    application = create_app()
    application.dependency_overrides[get_session] = _override
    limiter.reset()
    yield application
    application.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
def valid_register_payload() -> Iterator[dict[str, str]]:
    yield {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "password": "StrongPass!234",
        "pmdc_number": "12345-A",
        "hospital_code": "FSL",
        "department": "General Surgery",
    }
