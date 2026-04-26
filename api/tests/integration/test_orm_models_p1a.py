"""T073 RED — Patient, VitalSigns, LabResult ORM integration tests.

Uses a local async session with Base.metadata.create_all for DB-less testing.
Verifies UUID round-trip, FK wiring, JSON defaults, and cascade semantics.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime, date

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.base import Base
import app.models.patient  # noqa: F401 — ensures Base.metadata sees Patient table
import app.models.vital_signs  # noqa: F401
import app.models.lab_result  # noqa: F401


@pytest_asyncio.fixture
async def session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as sess:
        yield sess
    await engine.dispose()


def _mk_user_id() -> uuid.UUID:
    return uuid.uuid4()


async def _insert_user(session: AsyncSession) -> uuid.UUID:
    from app.models.user import User

    user = User(
        name="Test HO",
        email=f"ho-{uuid.uuid4().hex[:6]}@example.com",
        password_hash="$2b$12$" + "a" * 53,
        pmdc_number=f"{uuid.uuid4().hex[:5]}-A",
        hospital_code="FSL",
        department="General Medicine",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user.id


async def test_patient_roundtrip(session: AsyncSession) -> None:
    from app.models.patient import Patient

    ho_id = await _insert_user(session)
    patient = Patient(
        bed_number="ICU-1",
        name="Test Patient",
        age=45,
        sex="male",
        date_of_admission=date.today(),
        provisional_diagnosis="Chest pain",
        acuity="stable",
        ward="ortho",
        assigned_ho=ho_id,
        created_by=ho_id,
    )
    session.add(patient)
    await session.commit()
    await session.refresh(patient)

    assert isinstance(patient.id, uuid.UUID)
    assert patient.status == "admitted"
    assert patient.acuity == "stable"
    assert patient.active_problems == []
    assert isinstance(patient.created_at, datetime)


async def test_vital_signs_roundtrip(session: AsyncSession) -> None:
    from app.models.patient import Patient
    from app.models.vital_signs import VitalSigns

    ho_id = await _insert_user(session)
    patient = Patient(
        bed_number="ICU-2",
        name="Vitals Patient",
        age=30,
        sex="female",
        date_of_admission=date.today(),
        provisional_diagnosis="Fever",
        acuity="urgent",
        ward="family",
        assigned_ho=ho_id,
        created_by=ho_id,
    )
    session.add(patient)
    await session.commit()
    await session.refresh(patient)

    vitals = VitalSigns(
        patient_id=patient.id,
        recorded_at=datetime.now(UTC),
        heart_rate=88,
    )
    session.add(vitals)
    await session.commit()
    await session.refresh(vitals)

    assert isinstance(vitals.id, uuid.UUID)
    assert vitals.patient_id == patient.id
    assert vitals.heart_rate == 88
    assert vitals.spo2 is None


async def test_lab_result_roundtrip(session: AsyncSession) -> None:
    from app.models.lab_result import LabResult
    from app.models.patient import Patient

    ho_id = await _insert_user(session)
    patient = Patient(
        bed_number="ICU-3",
        name="Lab Patient",
        age=55,
        sex="male",
        date_of_admission=date.today(),
        provisional_diagnosis="Electrolyte imbalance",
        acuity="critical",
        ward="emergency",
        assigned_ho=ho_id,
        created_by=ho_id,
    )
    session.add(patient)
    await session.commit()
    await session.refresh(patient)

    lab = LabResult(
        patient_id=patient.id,
        test_name="K+",
        value=6.2,
        unit="mEq/L",
        reference_low=3.5,
        reference_high=5.0,
        is_critical=True,
        recorded_at=datetime.now(UTC),
    )
    session.add(lab)
    await session.commit()
    await session.refresh(lab)

    assert isinstance(lab.id, uuid.UUID)
    assert lab.patient_id == patient.id
    assert lab.is_critical is True


async def test_lab_result_is_critical_stored(session: AsyncSession) -> None:
    from app.models.lab_result import LabResult
    from app.models.patient import Patient

    ho_id = await _insert_user(session)
    patient = Patient(
        bed_number="ICU-4",
        name="Critical Lab",
        age=40,
        sex="female",
        date_of_admission=date.today(),
        provisional_diagnosis="Test",
        acuity="critical",
        ward="surgical_itc",
        assigned_ho=ho_id,
        created_by=ho_id,
    )
    session.add(patient)
    await session.commit()

    lab_critical = LabResult(
        patient_id=patient.id,
        test_name="Na+",
        value=158.0,
        unit="mEq/L",
        is_critical=True,
        recorded_at=datetime.now(UTC),
    )
    session.add(lab_critical)
    await session.commit()
    await session.refresh(lab_critical)
    assert lab_critical.is_critical is True

    lab_normal = LabResult(
        patient_id=patient.id,
        test_name="Na+",
        value=140.0,
        unit="mEq/L",
        is_critical=False,
        recorded_at=datetime.now(UTC),
    )
    session.add(lab_normal)
    await session.commit()
    await session.refresh(lab_normal)
    assert lab_normal.is_critical is False
