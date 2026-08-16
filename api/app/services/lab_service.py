"""Lab service — is_critical computation + write/list (P1a T064/T086).

compute_is_critical is a pure function: no DB call, no literals.
All threshold values are sourced from ClinicalConfig (Principle XI).
"""

from __future__ import annotations

import math
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clinical_config import get_clinical_config
from app.models.lab_result import LabResult
from app.schemas.labs import LabCreate, LabListResponse, LabRead


def compute_is_critical(
    test_name: str,
    value: float,
    reference_low: float | None,
    reference_high: float | None,
) -> bool:
    """Return True iff value is outside reference range AND crosses a critical threshold.

    When reference_low/reference_high are both absent, outside_ref_range
    defaults to True (only the critical threshold gate applies).
    """
    thresholds = get_clinical_config().get_lab_thresholds(test_name)
    if thresholds is None:
        return False

    if reference_low is not None and reference_high is not None:
        outside_ref_range = value < reference_low or value > reference_high
    else:
        outside_ref_range = True

    crosses_critical = (
        thresholds.critical_high is not None and value > thresholds.critical_high
    ) or (thresholds.critical_low is not None and value < thresholds.critical_low)

    return outside_ref_range and crosses_critical


async def create_lab(
    patient_id: uuid.UUID,
    payload: LabCreate,
    db: AsyncSession,
) -> LabRead:
    is_critical = compute_is_critical(
        test_name=payload.test_name,
        value=payload.value,
        reference_low=payload.reference_low,
        reference_high=payload.reference_high,
    )
    lab = LabResult(
        patient_id=patient_id,
        test_name=payload.test_name,
        value=payload.value,
        unit=payload.unit,
        reference_low=payload.reference_low,
        reference_high=payload.reference_high,
        is_critical=is_critical,
        recorded_at=payload.recorded_at,
    )
    db.add(lab)
    await db.commit()
    await db.refresh(lab)
    return LabRead.model_validate(lab)


async def list_labs(
    patient_id: uuid.UUID,
    test_name: str | None,
    page: int,
    limit: int,
    db: AsyncSession,
) -> LabListResponse:
    base_q = select(LabResult).where(LabResult.patient_id == patient_id)
    if test_name:
        base_q = base_q.where(LabResult.test_name == test_name)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.scalar(count_q)) or 0
    total_pages = math.ceil(total / limit) if total > 0 else 0

    page_q = base_q.order_by(LabResult.recorded_at.asc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(page_q)
    labs = list(result.scalars().all())

    return LabListResponse(
        labs=[LabRead.model_validate(lab) for lab in labs],
        page=page,
        limit=limit,
        total_pages=total_pages,
    )
