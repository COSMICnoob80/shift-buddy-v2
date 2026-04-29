"""Alert service — pure evaluators + transaction coordinators (P1b).

evaluate_vital_thresholds and build_lab_alert are pure functions: no DB,
no side effects. All threshold comparisons delegate to clinical_config
(Principle XI — zero threshold literals in this module).

create_vitals_with_alerts and create_lab_with_alerts are transaction
coordinators. They call db.flush() (not commit) to assign PKs, then add
alert rows, then commit — making the write atomic. P1a service functions
(create_vitals, create_lab) remain UNCHANGED.
"""

from __future__ import annotations

import math
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import structlog
from fastapi import Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clinical_config import ClinicalConfig, get_clinical_config, get_vital_thresholds
from app.models.alert import Alert
from app.models.db import get_session
from app.models.lab_result import LabResult
from app.models.vital_signs import VitalSigns
from app.schemas.alerts import (
    AcknowledgeResponse,
    AlertCreate,
    AlertListResponse,
    AlertRead,
)
from app.schemas.labs import LabCreate, LabRead
from app.schemas.vitals import VitalsCreate, VitalsRead
from app.services.lab_service import compute_is_critical
from app.services.patient_service import get_patient_or_404

_logger = structlog.get_logger(__name__)

_VITAL_PARAMETERS = (
    "heart_rate",
    "systolic_bp",
    "diastolic_bp",
    "temperature",
    "spo2",
    "respiratory_rate",
    "blood_sugar",
)

_LAB_PROTOCOL_MAP: dict[str, str] = {
    "K+": "hyperkalemia",
    "Creatinine": "aki_staging",
    "Blood Sugar": "dka",
}


def evaluate_vital_thresholds(
    vitals: VitalSigns,
    config: ClinicalConfig,
) -> list[AlertCreate]:
    """Return one AlertCreate per parameter that crossed a threshold (highest severity wins).

    Pure function — no DB calls, no side effects.
    Zero threshold literals; all values sourced from config.
    """
    alerts: list[AlertCreate] = []

    for param in _VITAL_PARAMETERS:
        value: float | int | None = getattr(vitals, param, None)
        if value is None:
            continue

        threshold = config.get_vital_thresholds(param)
        if threshold is None:
            continue

        float_val = float(value)
        alert_type: str | None = None

        # Critical tier takes priority over warning
        if threshold.crit_high is not None and float_val > threshold.crit_high:
            alert_type = "critical"
        elif threshold.crit_low is not None and float_val < threshold.crit_low:
            alert_type = "critical"
        elif threshold.warn_high is not None and float_val > threshold.warn_high:
            alert_type = "warning"
        elif threshold.warn_low is not None and float_val < threshold.warn_low:
            alert_type = "warning"

        if alert_type is not None:
            tier = "Critical" if alert_type == "critical" else "Warning"
            msg = f"{param.replace('_', ' ')} {float_val} — {tier} value."
            alerts.append(
                AlertCreate(
                    patient_id=uuid.UUID(str(vitals.patient_id)),
                    alert_type=alert_type,  # type: ignore[arg-type]
                    trigger_source="vital",
                    trigger_parameter=param,
                    trigger_value=float_val,
                    message=msg,
                )
            )

    return alerts


def build_lab_alert(
    lab: LabResult,
    config: ClinicalConfig,
) -> AlertCreate | None:
    """Return AlertCreate for a critical lab result, or None.

    Pure function — no DB calls. Returns None when lab.is_critical is False.
    protocol_link set when test_name maps to a supported protocol.
    """
    if not lab.is_critical:
        return None

    test_name = str(lab.test_name)
    protocol = _LAB_PROTOCOL_MAP.get(test_name)
    protocol_link: str | None = (
        f"/api/v1/protocols/evaluate?protocol={protocol}" if protocol else None
    )

    msg = f"{test_name} {float(lab.value)} {lab.unit} — Critical value."
    return AlertCreate(
        patient_id=uuid.UUID(str(lab.patient_id)),
        alert_type="critical",
        trigger_source="lab",
        trigger_parameter=test_name,
        trigger_value=float(lab.value),
        message=msg,
        protocol_link=protocol_link,
    )


async def create_vitals_with_alerts(
    patient_id: uuid.UUID,
    payload: VitalsCreate,
    db: AsyncSession,
) -> VitalsRead:
    """Create vital signs and any triggered alerts in a single transaction."""
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
    await db.flush()  # assigns PK without committing

    config = get_clinical_config()
    alert_creates = evaluate_vital_thresholds(vitals, config)
    for ac in alert_creates:
        db.add(
            Alert(
                patient_id=ac.patient_id,
                alert_type=ac.alert_type,
                trigger_source=ac.trigger_source,
                trigger_parameter=ac.trigger_parameter,
                trigger_value=ac.trigger_value,
                message=ac.message,
                protocol_link=ac.protocol_link,
            )
        )

    await db.commit()
    await db.refresh(vitals)
    return VitalsRead.model_validate(vitals)


async def create_lab_with_alerts(
    patient_id: uuid.UUID,
    payload: LabCreate,
    db: AsyncSession,
) -> LabRead:
    """Create lab result and any triggered alert in a single transaction."""
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
    await db.flush()  # assigns PK without committing

    config = get_clinical_config()
    alert_create = build_lab_alert(lab, config)
    if alert_create is not None:
        db.add(
            Alert(
                patient_id=alert_create.patient_id,
                alert_type=alert_create.alert_type,
                trigger_source=alert_create.trigger_source,
                trigger_parameter=alert_create.trigger_parameter,
                trigger_value=alert_create.trigger_value,
                message=alert_create.message,
                protocol_link=alert_create.protocol_link,
            )
        )

    await db.commit()
    await db.refresh(lab)
    return LabRead.model_validate(lab)


async def list_alerts(
    patient_id: uuid.UUID,
    alert_type: str | None,
    acknowledged: bool | None,
    page: int,
    limit: int,
    db: AsyncSession,
) -> AlertListResponse:
    """Return paginated alerts for a patient, with optional filters."""
    base_q = select(Alert).where(Alert.patient_id == patient_id)
    if alert_type is not None:
        base_q = base_q.where(Alert.alert_type == alert_type)
    if acknowledged is not None:
        base_q = base_q.where(Alert.acknowledged == acknowledged)

    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.scalar(count_q)) or 0
    total_pages = math.ceil(total / limit) if total > 0 else 0

    page_q = (
        base_q.order_by(Alert.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    result = await db.execute(page_q)
    rows = list(result.scalars().all())

    return AlertListResponse(
        alerts=[AlertRead.model_validate(r) for r in rows],
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


async def acknowledge_alert(
    alert_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> AcknowledgeResponse:
    """Acknowledge an alert; raises 409 if already acknowledged, 404 if not found."""
    alert = await get_alert_or_404(alert_id, db)

    if alert.acknowledged:
        raise HTTPException(
            status_code=409,
            detail={"error": "already_acknowledged", "message": "Alert has already been acknowledged"},
        )

    now = datetime.now(UTC)
    alert.acknowledged = True
    alert.acknowledged_by = user_id
    alert.acknowledged_at = now
    await db.commit()
    await db.refresh(alert)

    return AcknowledgeResponse(
        acknowledged=True,
        acknowledged_by=uuid.UUID(str(alert.acknowledged_by)),
        acknowledged_at=now,
    )


async def get_alert_or_404(
    alert_id: uuid.UUID,
    db: AsyncSession,
) -> Alert:
    """FastAPI dependency: fetch Alert by PK or raise 404."""
    result = await db.get(Alert, alert_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "alert_not_found", "message": "Alert not found"},
        )
    return result
