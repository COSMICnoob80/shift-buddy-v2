"""Vitals service — write and list vital signs (P1a T084)."""

from __future__ import annotations

import math
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vital_signs import VitalSigns
from app.schemas.vitals import VitalsCreate, VitalsListResponse, VitalsRead


async def create_vitals(
    patient_id: uuid.UUID,
    payload: VitalsCreate,
    db: AsyncSession,
) -> VitalsRead:
    vitals = VitalSigns(
        patient_id=patient_id,
        recorded_at=payload.recorded_at,
        heart_rate=payload.heart_rate,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        temperature=payload.temperature,
        spo2=payload.spo2,
        respiratory_rate=payload.respiratory_rate,
        gcs=payload.gcs,
        urine_output=payload.urine_output,
        blood_sugar=payload.blood_sugar,
    )
    db.add(vitals)
    await db.commit()
    await db.refresh(vitals)
    return VitalsRead.model_validate(vitals)


async def list_vitals(
    patient_id: uuid.UUID,
    page: int,
    limit: int,
    db: AsyncSession,
) -> VitalsListResponse:
    count_q = select(func.count()).where(VitalSigns.patient_id == patient_id)
    total = (await db.scalar(count_q)) or 0
    total_pages = math.ceil(total / limit) if total > 0 else 0

    q = (
        select(VitalSigns)
        .where(VitalSigns.patient_id == patient_id)
        .order_by(VitalSigns.recorded_at.asc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(q)
    vitals = list(result.scalars().all())

    return VitalsListResponse(
        vitals=[VitalsRead.model_validate(v) for v in vitals],
        page=page,
        limit=limit,
        total_pages=total_pages,
    )
