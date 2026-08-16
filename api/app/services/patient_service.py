"""Patient service — CRUD, discharge, acuity-sorted listing (P1a T080).

All string fields are stripped at service layer (FR-009).
assigned_ho defaults to current_user.id if not provided (FR-003).
created_by always equals current_user.id (FR-002).
"""

from __future__ import annotations

import math
import uuid
from datetime import UTC, datetime

import structlog
from fastapi import Depends, HTTPException
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.models.db import get_session
from app.models.lab_result import LabResult
from app.models.patient import Patient
from app.models.vital_signs import VitalSigns
from app.schemas.labs import LabRead
from app.schemas.patient import (
    DischargeResponse,
    PatientCreate,
    PatientDetailResponse,
    PatientListResponse,
    PatientPatch,
    PatientRead,
    PatientSummary,
)
from app.schemas.vitals import VitalsRead

_logger = structlog.get_logger(__name__)


def _acuity_sort_key() -> ColumnElement[int]:
    return case(
        (Patient.acuity == "critical", 0),
        (Patient.acuity == "urgent", 1),
        (Patient.acuity == "stable", 2),
        (Patient.acuity == "discharge_ready", 3),
        else_=99,
    )


async def get_patient_or_404(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
) -> Patient:
    result = await db.get(Patient, patient_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "patient_not_found", "message": "Patient not found"},
        )
    return result


async def create_patient(
    payload: PatientCreate,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> PatientRead:
    patient = Patient(
        bed_number=payload.bed_number.strip(),
        name=payload.name.strip(),
        age=payload.age,
        sex=payload.sex,
        rank_title=payload.rank_title,
        date_of_admission=payload.date_of_admission,
        provisional_diagnosis=payload.provisional_diagnosis.strip(),
        active_problems=payload.active_problems,
        current_medications=[m.model_dump() for m in payload.current_medications],
        allergies=payload.allergies,
        acuity=payload.acuity,
        ward=payload.ward,
        assigned_ho=payload.assigned_ho or user_id,
        status="admitted",
        created_by=user_id,
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    _logger.info(
        "patient_created",
        patient_id=str(patient.id),
        name=patient.name,
        bed_number=patient.bed_number,
        ward=patient.ward,
    )
    return PatientRead.model_validate(patient)


async def list_patients(
    *,
    ward: str | None,
    acuity: str | None,
    assigned_ho: uuid.UUID | None,
    status: str | None,
    page: int,
    limit: int,
    db: AsyncSession,
) -> PatientListResponse:
    _status = status or "admitted"
    base_q = select(Patient).where(Patient.status == _status)
    if ward:
        base_q = base_q.where(Patient.ward == ward)
    if acuity:
        base_q = base_q.where(Patient.acuity == acuity)
    if assigned_ho:
        base_q = base_q.where(Patient.assigned_ho == assigned_ho)

    all_result = await db.execute(base_q)
    all_patients = list(all_result.scalars().all())

    summary = PatientSummary(
        total=len(all_patients),
        critical=sum(1 for p in all_patients if p.acuity == "critical"),
        urgent=sum(1 for p in all_patients if p.acuity == "urgent"),
        stable=sum(1 for p in all_patients if p.acuity == "stable"),
        discharge_ready=sum(1 for p in all_patients if p.acuity == "discharge_ready"),
    )

    total = len(all_patients)
    total_pages = math.ceil(total / limit) if total > 0 else 0

    page_q = base_q.order_by(_acuity_sort_key()).offset((page - 1) * limit).limit(limit)
    page_result = await db.execute(page_q)
    patients = list(page_result.scalars().all())

    return PatientListResponse(
        patients=[PatientRead.model_validate(p) for p in patients],
        summary=summary,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


async def get_patient_detail(
    patient_id: uuid.UUID,
    db: AsyncSession,
) -> PatientDetailResponse:
    """Return patient with embedded vitals and labs sorted by recorded_at ASC."""
    patient = await db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "patient_not_found", "message": "Patient not found"},
        )

    vitals_q = (
        select(VitalSigns)
        .where(VitalSigns.patient_id == patient_id)
        .order_by(VitalSigns.recorded_at.asc())
    )
    labs_q = (
        select(LabResult)
        .where(LabResult.patient_id == patient_id)
        .order_by(LabResult.recorded_at.asc())
    )

    vitals_result = await db.execute(vitals_q)
    labs_result = await db.execute(labs_q)

    vitals = list(vitals_result.scalars().all())
    labs = list(labs_result.scalars().all())

    patient_data = PatientRead.model_validate(patient)
    return PatientDetailResponse(
        **patient_data.model_dump(),
        vitals=[VitalsRead.model_validate(v) for v in vitals],
        labs=[LabRead.model_validate(lab) for lab in labs],
    )


async def update_patient(
    patient: Patient,
    patch: PatientPatch,
    db: AsyncSession,
) -> PatientRead:
    updates = patch.model_dump(exclude_none=True, exclude_unset=True)
    for key, value in updates.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(patient, key, value)
    patient.updated_at = datetime.now(UTC)
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return PatientRead.model_validate(patient)


async def discharge_patient(
    patient: Patient,
    condition: str,
    db: AsyncSession,
) -> DischargeResponse:
    if patient.status == "discharged":
        raise HTTPException(
            status_code=409,
            detail={
                "error": "already_discharged",
                "message": "Patient is already discharged",
            },
        )
    now = datetime.now(UTC)
    patient.status = "discharged"
    patient.discharged_at = now
    patient.condition_at_discharge = condition
    patient.updated_at = now
    db.add(patient)
    await db.commit()
    return DischargeResponse(status="discharged", discharged_at=now)
