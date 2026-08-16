"""T013 RED — User ORM integration test (data-model.md §Fields)."""

from __future__ import annotations

from collections.abc import AsyncIterator
from uuid import UUID

import pytest
import pytest_asyncio
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.base import Base
from app.models.user import User, UserRole


@pytest_asyncio.fixture
async def session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as sess:
        yield sess
    await engine.dispose()


def _mk_user(**overrides: object) -> User:
    defaults: dict[str, object] = {
        "name": "Test User",
        "email": "user@example.com",
        "password_hash": "$2b$12$" + "a" * 53,  # bcrypt hash length = 60
        "pmdc_number": "12345-A",
        "hospital_code": "FSL",
        "department": "General Surgery",
    }
    defaults.update(overrides)
    return User(**defaults)


async def test_user_roundtrip_defaults(session: AsyncSession) -> None:
    user = _mk_user()
    session.add(user)
    await session.commit()
    await session.refresh(user)

    assert isinstance(user.id, UUID)
    assert len(user.password_hash) == 60
    assert user.locked_until is None
    assert user.failed_login_count == 0
    assert user.role is UserRole.HO


async def test_duplicate_email_case_insensitive(session: AsyncSession) -> None:
    session.add(_mk_user(email="dup@example.com", pmdc_number="11111-A"))
    await session.commit()

    session.add(_mk_user(email="DUP@Example.com", pmdc_number="22222-B"))
    with pytest.raises(IntegrityError):
        await session.commit()
    await session.rollback()


async def test_duplicate_pmdc_rejected(session: AsyncSession) -> None:
    session.add(_mk_user(email="a@example.com", pmdc_number="33333-C"))
    await session.commit()

    session.add(_mk_user(email="b@example.com", pmdc_number="33333-C"))
    with pytest.raises(IntegrityError):
        await session.commit()
    await session.rollback()
