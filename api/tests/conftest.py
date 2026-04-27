"""Shared fixtures: in-memory SQLite app for contract/integration tests."""

from __future__ import annotations

import os
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


@pytest.fixture(autouse=True, scope="session")
def _clinical_env_defaults() -> None:
    """Set required clinical config env vars for test session (no real .env available)."""
    os.environ.setdefault("CLINICAL_HR_MIN", "40")
    os.environ.setdefault("CLINICAL_HR_MAX", "160")
    os.environ.setdefault("CLINICAL_SBP_MIN", "90")
    os.environ.setdefault("CLINICAL_LAB_K_CRITICAL_HIGH", "6.0")
    os.environ.setdefault("CLINICAL_LAB_K_CRITICAL_LOW", "2.5")
    os.environ.setdefault("CLINICAL_LAB_NA_CRITICAL_HIGH", "155.0")
    os.environ.setdefault("CLINICAL_LAB_NA_CRITICAL_LOW", "125.0")
    os.environ.setdefault("CLINICAL_LAB_HB_CRITICAL_LOW", "7.0")
    os.environ.setdefault("CLINICAL_LAB_PLT_CRITICAL_LOW", "50.0")
    os.environ.setdefault("CLINICAL_LAB_INR_CRITICAL_HIGH", "3.0")
    os.environ.setdefault("CLINICAL_LAB_BS_CRITICAL_HIGH", "400.0")
    os.environ.setdefault("CLINICAL_LAB_BS_CRITICAL_LOW", "54.0")
    os.environ.setdefault("CLINICAL_LAB_LACTATE_CRITICAL_HIGH", "4.0")


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
