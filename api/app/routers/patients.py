"""Patients router (P1a T080) — all 5 patient endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.middleware import current_user_id
from app.core.pagination import PaginationParams
from app.models.db import get_session
from app.models.patient import Patient
from app.schemas.patient import (
    DischargeRequest,
    DischargeResponse,
    PatientCreate,
    PatientDetailResponse,
    PatientListResponse,
    PatientPatch,
    PatientRead,
)
from app.services import patient_service

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", status_code=201, response_model=PatientRead)
async def create_patient(
    payload: PatientCreate,
    user_id: uuid.UUID = Depends(current_user_id),
    db: AsyncSession = Depends(get_session),
) -> PatientRead:
    return await patient_service.create_patient(payload, user_id, db)


@router.get("", response_model=PatientListResponse)
async def list_patients(
    ward: str | None = Query(None),
    acuity: str | None = Query(None),
    assigned_ho: uuid.UUID | None = Query(None),
    status: str | None = Query(None),
    sort: str | None = Query(None),
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_session),
) -> PatientListResponse:
    return await patient_service.list_patients(
        ward=ward,
        acuity=acuity,
        assigned_ho=assigned_ho,
        status=status,
        page=pagination.page,
        limit=pagination.limit,
        db=db,
    )


@router.get("/{patient_id}", response_model=PatientDetailResponse)
async def get_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
) -> PatientDetailResponse:
    return await patient_service.get_patient_detail(patient_id, db)


@router.patch("/{patient_id}", response_model=PatientRead)
async def update_patient(
    patch: PatientPatch,
    patient: Patient = Depends(patient_service.get_patient_or_404),
    db: AsyncSession = Depends(get_session),
) -> PatientRead:
    return await patient_service.update_patient(patient, patch, db)


@router.post("/{patient_id}/discharge", response_model=DischargeResponse)
async def discharge_patient(
    patient_id: uuid.UUID,
    body: DischargeRequest,
    db: AsyncSession = Depends(get_session),
) -> DischargeResponse:
    patient = await patient_service.get_patient_or_404(patient_id, db)
    return await patient_service.discharge_patient(patient, body.condition_at_discharge, db)
