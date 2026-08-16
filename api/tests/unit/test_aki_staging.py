"""T117 RED — AKI staging protocol unit tests (SPEC §4.2 KDIGO criteria).

Uses an async SQLite session with real ORM inserts to test baseline Creatinine lookup.
All 5 cases fail until T118 creates api/app/protocols/aki_staging.py.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, date, datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.models.lab_result  # noqa: F401
import app.models.patient  # noqa: F401
import app.models.user  # noqa: F401
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
        name="AKI HO",
        email=f"ho-aki-{uuid.uuid4().hex[:6]}@example.com",
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
        bed_number="AKI-1",
        name="AKI Patient",
        age=60,
        sex="male",
        date_of_admission=date.today(),
        provisional_diagnosis="AKI workup",
        ward="surgical_itc",
        assigned_ho=ho_id,
        created_by=ho_id,
    )
    session.add(patient)
    await session.commit()
    await session.refresh(patient)
    return uuid.UUID(str(patient.id))


async def _insert_baseline_cr(
    session: AsyncSession,
    patient_id: uuid.UUID,
    baseline_value: float,
    hours_ago: int,
) -> None:
    from app.models.lab_result import LabResult

    recorded_at = datetime.now(UTC) - timedelta(hours=hours_ago)
    lab = LabResult(
        patient_id=patient_id,
        test_name="Creatinine",
        value=baseline_value,
        unit="mg/dL",
        is_critical=False,
        recorded_at=recorded_at,
    )
    session.add(lab)
    await session.commit()


@pytest.mark.asyncio
async def test_aki_no_baseline_insufficient_data(session: AsyncSession) -> None:
    """No baseline creatinine within 48h → severity=insufficient_data."""
    from app.protocols.aki_staging import evaluate

    ho_id = await _insert_user(session)
    patient_id = await _insert_patient(session, ho_id)

    result = await evaluate(
        creatinine_current=1.4,
        patient_id=patient_id,
        recorded_at=datetime.now(UTC),
        db=session,
    )

    assert result.severity == "insufficient_data"
    assert result.recommendations == []
    assert result.alert_generated is False


@pytest.mark.asyncio
async def test_aki_normal_below_threshold(session: AsyncSession) -> None:
    """Delta 0.2 < 0.3 and ratio 1.25× < 1.5× → normal (no AKI)."""
    from app.protocols.aki_staging import evaluate

    ho_id = await _insert_user(session)
    patient_id = await _insert_patient(session, ho_id)
    await _insert_baseline_cr(session, patient_id, baseline_value=0.8, hours_ago=24)

    result = await evaluate(
        creatinine_current=1.0,
        patient_id=patient_id,
        recorded_at=datetime.now(UTC),
        db=session,
    )

    assert result.severity == "normal", f"Expected normal, got {result.severity}"
    assert result.alert_generated is False


@pytest.mark.asyncio
async def test_aki_stage_1_delta(session: AsyncSession) -> None:
    """Delta 0.4 ≥ 0.3 → Stage 1 AKI."""
    from app.protocols.aki_staging import evaluate

    ho_id = await _insert_user(session)
    patient_id = await _insert_patient(session, ho_id)
    await _insert_baseline_cr(session, patient_id, baseline_value=0.8, hours_ago=24)

    result = await evaluate(
        creatinine_current=1.2,
        patient_id=patient_id,
        recorded_at=datetime.now(UTC),
        db=session,
    )

    assert result.severity == "stage_1"
    assert result.alert_generated is True
    for rec in result.recommendations:
        assert rec.source, f"Recommendation '{rec.action}' has empty source (Principle IX)"


@pytest.mark.asyncio
async def test_aki_stage_1_ratio(session: AsyncSession) -> None:
    """Ratio 1.625× (1.5–1.9×) → Stage 1 AKI."""
    from app.protocols.aki_staging import evaluate

    ho_id = await _insert_user(session)
    patient_id = await _insert_patient(session, ho_id)
    await _insert_baseline_cr(session, patient_id, baseline_value=0.8, hours_ago=24)

    result = await evaluate(
        creatinine_current=1.3,
        patient_id=patient_id,
        recorded_at=datetime.now(UTC),
        db=session,
    )

    assert result.severity == "stage_1"
    assert result.alert_generated is True


@pytest.mark.asyncio
async def test_aki_stage_2_ratio(session: AsyncSession) -> None:
    """Ratio 2.25× (2.0–2.9×) → Stage 2 AKI."""
    from app.protocols.aki_staging import evaluate

    ho_id = await _insert_user(session)
    patient_id = await _insert_patient(session, ho_id)
    await _insert_baseline_cr(session, patient_id, baseline_value=0.8, hours_ago=24)

    result = await evaluate(
        creatinine_current=1.8,
        patient_id=patient_id,
        recorded_at=datetime.now(UTC),
        db=session,
    )

    assert result.severity == "stage_2"
    assert result.alert_generated is True
    for rec in result.recommendations:
        assert rec.source, f"Recommendation '{rec.action}' has empty source (Principle IX)"
