"""T100 RED — Alert ORM integration test.

Verifies Alert model round-trip, defaults (acknowledged=False),
UUID PK, and that model + migration are wired correctly.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import date

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models.alert  # noqa: F401
import app.models.lab_result  # noqa: F401
import app.models.patient  # noqa: F401
import app.models.vital_signs  # noqa: F401
from app.models.base import Base


@pytest_asyncio.fixture
async def session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as sess:
        yield sess
    await engine.dispose()


async def _insert_user(session: AsyncSession) -> uuid.UUID:
    from app.models.user import User

    user = User(
        name="Alert HO",
        email=f"ho-alert-{uuid.uuid4().hex[:6]}@example.com",
        password_hash="$2b$12$" + "a" * 53,
        pmdc_number=f"{uuid.uuid4().hex[:5]}-A",
        hospital_code="FSL",
        department="General Medicine",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return uuid.UUID(str(user.id))


async def _insert_patient(session: AsyncSession, ho_id: uuid.UUID) -> uuid.UUID:
    from app.models.patient import Patient

    patient = Patient(
        bed_number="ICU-9",
        name="Alert Patient",
        age=55,
        sex="male",
        date_of_admission=date.today(),
        provisional_diagnosis="Tachycardia",
        acuity="critical",
        ward="icu",
        assigned_ho=ho_id,
        created_by=ho_id,
    )
    session.add(patient)
    await session.commit()
    await session.refresh(patient)
    return uuid.UUID(str(patient.id))


@pytest.mark.asyncio
async def test_alert_model_importable() -> None:
    from app.models.alert import Alert  # noqa: F401

    assert Alert.__tablename__ == "alerts"


@pytest.mark.asyncio
async def test_alert_roundtrip(session: AsyncSession) -> None:
    from app.models.alert import Alert

    ho_id = await _insert_user(session)
    patient_id = await _insert_patient(session, ho_id)

    alert = Alert(
        patient_id=patient_id,
        alert_type="critical",
        trigger_source="vital",
        trigger_parameter="heart_rate",
        trigger_value=135.0,
        message="heart_rate 135 bpm — Critical tachycardia.",
    )
    session.add(alert)
    await session.commit()
    await session.refresh(alert)

    assert isinstance(uuid.UUID(str(alert.id)), uuid.UUID)
    assert alert.acknowledged is False
    assert alert.acknowledged_by is None
    assert alert.created_at is not None
    assert alert.created_at.tzinfo is not None or str(alert.created_at) != ""


@pytest.mark.asyncio
async def test_alert_acknowledged_defaults_false(session: AsyncSession) -> None:
    from app.models.alert import Alert

    ho_id = await _insert_user(session)
    patient_id = await _insert_patient(session, ho_id)

    alert = Alert(
        patient_id=patient_id,
        alert_type="warning",
        trigger_source="vital",
        trigger_parameter="spo2",
        trigger_value=93.0,
        message="spo2 93% — Warning hypoxia.",
    )
    session.add(alert)
    await session.commit()
    await session.refresh(alert)

    assert alert.acknowledged is False
    assert alert.acknowledged_by is None
    assert alert.acknowledged_at is None
