"""Alerts router (P1b T111).

GET /patients/{patient_id}/alerts — list with filters (registered under /api/v1/patients).
POST /alerts/{alert_id}/acknowledge — acknowledge (registered under /api/v1).
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.middleware import current_user_id
from app.core.pagination import PaginationParams
from app.models.db import get_session
from app.models.patient import Patient
from app.schemas.alerts import AcknowledgeResponse, AlertListResponse
from app.services import alert_service, patient_service

router = APIRouter(tags=["alerts"])


@router.get("/{patient_id}/alerts", response_model=AlertListResponse)
async def list_patient_alerts(
    alert_type: str | None = Query(default=None, pattern="^(critical|warning)$"),
    acknowledged: bool | None = Query(default=None),
    patient: Patient = Depends(patient_service.get_patient_or_404),
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_session),
) -> AlertListResponse:
    return await alert_service.list_alerts(
        patient_id=uuid.UUID(str(patient.id)),
        alert_type=alert_type,
        acknowledged=acknowledged,
        page=pagination.page,
        limit=pagination.limit,
        db=db,
    )


# This sub-router handles /alerts/{alert_id}/acknowledge — prefix wired from main.py
alerts_acknowledge_router = APIRouter(prefix="/alerts", tags=["alerts"])


@alerts_acknowledge_router.post("/{alert_id}/acknowledge", response_model=AcknowledgeResponse)
async def acknowledge_alert(
    alert_id: uuid.UUID,
    user_id: uuid.UUID = Depends(current_user_id),
    db: AsyncSession = Depends(get_session),
) -> AcknowledgeResponse:
    return await alert_service.acknowledge_alert(alert_id, user_id, db)
