"""Labs router (P1a T086) — POST and GET lab results."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import PaginationParams
from app.models.db import get_session
from app.models.patient import Patient
from app.schemas.labs import LabCreate, LabListResponse, LabRead
from app.services import lab_service, patient_service

router = APIRouter(tags=["labs"])


@router.post("/{patient_id}/labs", status_code=201, response_model=LabRead)
async def add_lab(
    payload: LabCreate,
    patient: Patient = Depends(patient_service.get_patient_or_404),
    db: AsyncSession = Depends(get_session),
) -> LabRead:
    return await lab_service.create_lab(patient.id, payload, db)


@router.get("/{patient_id}/labs", response_model=LabListResponse)
async def list_labs(
    test_name: str | None = Query(None),
    patient: Patient = Depends(patient_service.get_patient_or_404),
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_session),
) -> LabListResponse:
    return await lab_service.list_labs(
        patient.id,
        test_name=test_name,
        page=pagination.page,
        limit=pagination.limit,
        db=db,
    )
