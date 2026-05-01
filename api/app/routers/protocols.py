"""Protocols router (P1b T120).

GET /protocols   — static list of supported protocols (no DB hit, offline-capable).
POST /protocols/evaluate — dispatch to protocol module; AKI is async, others sync.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.middleware import current_user_id
from app.models.db import get_session
from app.protocols import aki_staging, dka, hyperkalemia
from app.schemas.protocols import ProtocolEvaluateRequest, ProtocolEvaluateResponse
from app.services import patient_service, shadow_event_service

_logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/protocols", tags=["protocols"])

PROTOCOL_LIST = [
    {
        "name": "hyperkalemia",
        "description": "Hyperkalemia management (AHA 2023 / KDIGO 2023)",
    },
    {
        "name": "aki_staging",
        "description": "AKI staging by KDIGO 2023 creatinine criteria",
    },
    {
        "name": "dka",
        "description": "Diabetic Ketoacidosis severity and management",
    },
]

_SUPPORTED_PROTOCOLS = {p["name"] for p in PROTOCOL_LIST}


@router.get("")
async def list_protocols(
    _user_id: uuid.UUID = Depends(current_user_id),
) -> dict[str, Any]:
    """Return static list of supported protocols — no DB hit, works fully offline."""
    return {"protocols": PROTOCOL_LIST}


@router.post("/evaluate", response_model=ProtocolEvaluateResponse)
async def evaluate_protocol(
    request_body: ProtocolEvaluateRequest,
    req: Request,
    user_id: uuid.UUID = Depends(current_user_id),
    db: AsyncSession = Depends(get_session),
) -> ProtocolEvaluateResponse:
    """Dispatch protocol evaluation; write shadow event; return result."""
    protocol = request_body.protocol
    values = request_body.values
    patient_id = request_body.patient_id

    if protocol not in _SUPPORTED_PROTOCOLS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "protocol_not_found",
                "message": f"Protocol '{protocol}' not supported",
            },
        )

    if protocol == "hyperkalemia":
        potassium = values.get("potassium")
        if potassium is None:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "missing_required_value",
                    "message": "values.potassium is required",
                },
            )
        ecg_changes = bool(values.get("ecg_changes", False))
        proto_result = hyperkalemia.evaluate(potassium=float(potassium), ecg_changes=ecg_changes)

    elif protocol == "dka":
        missing = [f for f in ("blood_sugar", "ph", "hco3") if values.get(f) is None]
        if missing:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "missing_required_value",
                    "message": f"Missing required values: {missing}",
                },
            )
        proto_result = dka.evaluate(
            blood_sugar=float(values["blood_sugar"]),
            ph=float(values["ph"]),
            hco3=float(values["hco3"]),
            mental_status=str(values.get("mental_status", "alert")),
        )

    else:  # aki_staging
        creatinine_current = values.get("creatinine_current")
        if creatinine_current is None:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "missing_required_value",
                    "message": "values.creatinine_current is required",
                },
            )
        await patient_service.get_patient_or_404(patient_id, db)
        proto_result = await aki_staging.evaluate(
            creatinine_current=float(creatinine_current),
            patient_id=patient_id,
            recorded_at=datetime.now(UTC),
            db=db,
        )

    response = ProtocolEvaluateResponse(
        protocol=protocol,
        severity=proto_result.severity,
        recommendations=proto_result.recommendations,
        escalation=proto_result.escalation,
        alert_generated=proto_result.alert_generated,
    )

    # Write shadow event — non-blocking; failure logged, not raised
    try:
        await shadow_event_service.record_protocol_evaluation(
            ho_user_id=user_id,
            protocol=protocol,
            severity=proto_result.severity,
            actions_count=len(proto_result.recommendations),
            db=db,
        )
        await db.commit()
    except Exception as exc:
        _logger.warning("shadow_event_write_failed", protocol=protocol, error=str(exc))

    return response
