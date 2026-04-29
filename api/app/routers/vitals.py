"""Vitals router (P1a T084 / P1b T109) — POST and GET vital signs.

POST /vitals uses create_vitals_with_alerts coordinator (P1b) so that
alert records are created atomically in the same transaction.
The P1a create_vitals function remains unchanged (used by other callers).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PaginationParams
from app.models.db import get_session
from app.models.patient import Patient
from app.schemas.vitals import VitalsCreate, VitalsListResponse, VitalsRead
from app.services import alert_service, patient_service, vitals_service

router = APIRouter(tags=["vitals"])


@router.post("/{patient_id}/vitals", status_code=201, response_model=VitalsRead)
async def add_vitals(
    payload: VitalsCreate,
    patient: Patient = Depends(patient_service.get_patient_or_404),
    db: AsyncSession = Depends(get_session),
) -> VitalsRead:
    return await alert_service.create_vitals_with_alerts(patient.id, payload, db)


@router.get("/{patient_id}/vitals", response_model=VitalsListResponse)
async def list_vitals(
    patient: Patient = Depends(patient_service.get_patient_or_404),
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_session),
) -> VitalsListResponse:
    return await vitals_service.list_vitals(patient.id, pagination.page, pagination.limit, db)
