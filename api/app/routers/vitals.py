"""Vitals router (P1a T084) — POST and GET vital signs."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PaginationParams
from app.models.db import get_session
from app.models.patient import Patient
from app.schemas.vitals import VitalsCreate, VitalsListResponse, VitalsRead
from app.services import patient_service, vitals_service

router = APIRouter(tags=["vitals"])


@router.post("/{patient_id}/vitals", status_code=201, response_model=VitalsRead)
async def add_vitals(
    payload: VitalsCreate,
    patient: Patient = Depends(patient_service.get_patient_or_404),
    db: AsyncSession = Depends(get_session),
) -> VitalsRead:
    return await vitals_service.create_vitals(patient.id, payload, db)


@router.get("/{patient_id}/vitals", response_model=VitalsListResponse)
async def list_vitals(
    patient: Patient = Depends(patient_service.get_patient_or_404),
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_session),
) -> VitalsListResponse:
    return await vitals_service.list_vitals(patient.id, pagination.page, pagination.limit, db)
