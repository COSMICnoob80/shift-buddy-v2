"""Shadow suggest router — GET /api/v1/shadow/suggest (P1c T141).

Returns a deterministic ProtocolEngine recommendation for a patient.
Controlled by FEATURE_SHADOW_SUGGEST flag (404 when off).
Every call writes a ShadowEvent row for telemetry (Principle XIII + XIV).
No generative model is called in P1c — confidence is always "deterministic".
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.feature_flags import get_feature_flags
from app.core.middleware import current_user_id
from app.models.db import get_session
from app.models.lab_result import LabResult
from app.models.patient import Patient
from app.models.shadow_suggest import ShadowSuggestResponse
from app.models.vital_signs import VitalSigns
from app.protocols import aki_staging, dka, hyperkalemia
from app.services import shadow_event_service

_logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/shadow", tags=["shadow"])

_SEVERITY_RANK: dict[str, int] = {
    "emergency": 10,
    "emergency_ecg": 9,
    "severe": 8,
    "stage_3": 7,
    "moderate": 6,
    "stage_2": 5,
    "mild": 4,
    "stage_1": 3,
    "normal": 1,
    "insufficient_data": 0,
}

_LAB_WINDOW_HOURS = 24


@router.get("/suggest", response_model=ShadowSuggestResponse)
async def shadow_suggest(
    patient_id: uuid.UUID,
    context: str = "vitals",
    user_id: uuid.UUID = Depends(current_user_id),
    db: AsyncSession = Depends(get_session),
) -> ShadowSuggestResponse:
    """Return deterministic ProtocolEngine recommendation for a patient.

    Shadow mode only — advisory, never autonomous.
    """
    flags = get_feature_flags()
    if not flags.shadow_suggest:
        raise HTTPException(
            status_code=404,
            detail={"error": "feature_disabled", "message": "Shadow suggest is not enabled"},
        )

    patient = await db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "patient_not_found", "message": "Patient not found"},
        )

    cutoff = datetime.now(UTC) - timedelta(hours=_LAB_WINDOW_HOURS)

    lab_stmt = (
        select(LabResult)
        .where(LabResult.patient_id == patient_id)
        .where(LabResult.recorded_at >= cutoff)
        .order_by(LabResult.recorded_at.desc())
        .limit(5)
    )
    lab_rows = (await db.execute(lab_stmt)).scalars().all()

    labs: dict[str, float] = {}
    for row in lab_rows:
        name_lower = row.test_name.lower().replace("+", "").strip()
        name_canonical = row.test_name
        if name_canonical not in labs:
            labs[name_canonical] = float(row.value)
        # also store lower-case key for flexible lookup
        if name_lower not in labs:
            labs[name_lower] = float(row.value)

    vitals_stmt = (
        select(VitalSigns)
        .where(VitalSigns.patient_id == patient_id)
        .order_by(VitalSigns.recorded_at.desc())
        .limit(3)
    )
    vitals_rows = (await db.execute(vitals_stmt)).scalars().all()

    best_result = None
    best_rank = -1
    best_protocol = "none"

    # Hyperkalemia — uses K+ lab
    potassium = labs.get("K+") or labs.get("k")
    if potassium is not None:
        hk_result = hyperkalemia.evaluate(float(potassium))
        rank = _SEVERITY_RANK.get(hk_result.severity, 0)
        if rank > best_rank:
            best_result = hk_result
            best_rank = rank
            best_protocol = "hyperkalemia"

    # DKA — uses blood_sugar, pH, HCO3
    bs_lab = labs.get("blood_sugar") or labs.get("Blood Sugar")
    ph_lab = labs.get("pH") or labs.get("ph")
    hco3_lab = labs.get("HCO3") or labs.get("hco3") or labs.get("Bicarbonate")

    # also check vitals for blood_sugar
    if bs_lab is None and vitals_rows:
        for v in vitals_rows:
            if v.blood_sugar is not None:
                bs_lab = float(v.blood_sugar)
                break

    if bs_lab is not None and ph_lab is not None and hco3_lab is not None:
        dka_result = dka.evaluate(
            blood_sugar=float(bs_lab),
            ph=float(ph_lab),
            hco3=float(hco3_lab),
            mental_status="alert",
        )
        rank = _SEVERITY_RANK.get(dka_result.severity, 0)
        if rank > best_rank:
            best_result = dka_result
            best_rank = rank
            best_protocol = "dka"

    # AKI staging — uses Creatinine
    creatinine = labs.get("Creatinine") or labs.get("creatinine")
    if creatinine is not None:
        creat_lab_stmt = (
            select(LabResult)
            .where(LabResult.patient_id == patient_id)
            .where(LabResult.test_name == "Creatinine")
            .order_by(LabResult.recorded_at.desc())
            .limit(1)
        )
        creat_row = (await db.execute(creat_lab_stmt)).scalar_one_or_none()
        if creat_row is not None:
            aki_result = await aki_staging.evaluate(
                creatinine_current=float(creatinine),
                patient_id=patient_id,
                recorded_at=creat_row.recorded_at,
                db=db,
            )
            rank = _SEVERITY_RANK.get(aki_result.severity, 0)
            if rank > best_rank:
                best_result = aki_result
                best_rank = rank
                best_protocol = "aki_staging"

    if best_result is None or best_rank <= 0:
        suggestion = "No actionable findings from available lab data."
        severity = None
        protocol = None
        actions_count = 0
    else:
        top_rec = best_result.recommendations[0] if best_result.recommendations else None
        suggestion = top_rec.action if top_rec else f"{best_protocol}: {best_result.severity}"
        severity = best_result.severity
        protocol = best_protocol
        actions_count = len(best_result.recommendations)

    # Write shadow event inline (Principle XIII telemetry — lightweight INSERT)
    try:
        await shadow_event_service.record_protocol_evaluation(
            ho_user_id=user_id,
            protocol=best_protocol,
            severity=severity or "none",
            actions_count=actions_count,
            db=db,
        )
        await db.commit()
    except Exception:
        _logger.exception("shadow_event_log_failed")

    return ShadowSuggestResponse(
        suggestion=suggestion,
        confidence="deterministic",
        source="protocol_engine",
        disclaimer="SHADOW MODE — advisory only",
        protocol=protocol,
        severity=severity,
    )
