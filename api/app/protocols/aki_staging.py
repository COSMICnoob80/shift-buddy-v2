"""AKI staging protocol — KDIGO 2023 creatinine criteria.

Async: requires one DB query for baseline Creatinine within 48h of current recording.
Returns ProtocolResult with severity in {insufficient_data, normal, stage_1, stage_2, stage_3}.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lab_result import LabResult
from app.protocols.hyperkalemia import ProtocolResult
from app.schemas.protocols import Recommendation

_SOURCE = "KDIGO 2023 AKI Clinical Practice Guidelines"

# KDIGO stage thresholds (fixed guidelines — not hospital-configurable)
_DELTA_STAGE_1: float = 0.3  # mg/dL rise in 48h → Stage 1
_RATIO_STAGE_1: float = 1.5  # 1.5–1.9× baseline → Stage 1
_RATIO_STAGE_2: float = 2.0  # 2.0–2.9× baseline → Stage 2
_RATIO_STAGE_3: float = 3.0  # ≥ 3× baseline → Stage 3
_VALUE_STAGE_3: float = 4.0  # absolute ≥ 4.0 mg/dL → Stage 3
_BASELINE_WINDOW_HOURS: int = 48


async def evaluate(
    creatinine_current: float,
    patient_id: uuid.UUID,
    recorded_at: datetime,
    db: AsyncSession,
) -> ProtocolResult:
    """Evaluate AKI stage using KDIGO criteria with DB baseline lookup.

    Baseline = earliest Creatinine for patient within 48h preceding recorded_at.
    Returns insufficient_data when no baseline found.
    """
    cutoff = recorded_at - timedelta(hours=_BASELINE_WINDOW_HOURS)

    stmt = (
        select(LabResult)
        .where(LabResult.patient_id == patient_id)
        .where(LabResult.test_name == "Creatinine")
        .where(LabResult.recorded_at >= cutoff)
        .where(LabResult.recorded_at < recorded_at)
        .order_by(LabResult.recorded_at.asc())
        .limit(1)
    )
    result = await db.execute(stmt)
    baseline_row = result.scalar_one_or_none()

    if baseline_row is None:
        return ProtocolResult(
            severity="insufficient_data",
            recommendations=[],
            escalation=None,
            alert_generated=False,
        )

    baseline = float(baseline_row.value)
    delta = creatinine_current - baseline
    ratio = creatinine_current / baseline if baseline > 0 else 0.0

    stage = _classify(creatinine_current, delta, ratio)

    if stage == "normal":
        return ProtocolResult(
            severity="normal",
            recommendations=[],
            escalation=None,
            alert_generated=False,
        )

    return _build_result(stage, creatinine_current, baseline, delta, ratio)


def _classify(current: float, delta: float, ratio: float) -> str:
    if ratio >= _RATIO_STAGE_3 or current >= _VALUE_STAGE_3:
        return "stage_3"
    if ratio >= _RATIO_STAGE_2:
        return "stage_2"
    if delta >= _DELTA_STAGE_1 or ratio >= _RATIO_STAGE_1:
        return "stage_1"
    return "normal"


def _build_result(
    stage: str,
    current: float,
    baseline: float,
    delta: float,
    ratio: float,
) -> ProtocolResult:
    detail = (
        f"Creatinine {current:.2f} mg/dL "
        f"(baseline {baseline:.2f}, delta +{delta:.2f}, ratio {ratio:.2f}×)"
    )

    if stage == "stage_1":
        return ProtocolResult(
            severity="stage_1",
            alert_generated=True,
            escalation=None,
            recommendations=[
                Recommendation(
                    action="Hold nephrotoxic drugs (NSAIDs, aminoglycosides, ACEi/ARB)",
                    priority=1,
                    rationale=f"AKI Stage 1 — {detail}",
                    source=_SOURCE,
                ),
                Recommendation(
                    action="Fluid challenge 250ml NS over 1 hour (if not fluid-overloaded)",
                    priority=2,
                    rationale="Optimize renal perfusion",
                    source=_SOURCE,
                ),
                Recommendation(
                    action="Monitor urine output hourly",
                    priority=3,
                    rationale="Oliguria worsening may indicate progression to Stage 2/3",
                    source=_SOURCE,
                ),
                Recommendation(
                    action="Recheck creatinine in 12 hours",
                    priority=4,
                    rationale="Early detection of progression",
                    source=_SOURCE,
                ),
            ],
        )

    if stage == "stage_2":
        return ProtocolResult(
            severity="stage_2",
            alert_generated=True,
            escalation="Senior review required — AKI Stage 2",
            recommendations=[
                Recommendation(
                    action="Hold nephrotoxic drugs",
                    priority=1,
                    rationale=f"AKI Stage 2 — {detail}",
                    source=_SOURCE,
                ),
                Recommendation(
                    action="Renal dose adjustment for ALL medications",
                    priority=2,
                    rationale="Impaired creatinine clearance — standard dosing may be toxic",
                    source=_SOURCE,
                ),
                Recommendation(
                    action="Daily U&E monitoring",
                    priority=3,
                    rationale="Track electrolyte derangement",
                    source=_SOURCE,
                ),
                Recommendation(
                    action="Strict intake/output charting",
                    priority=4,
                    rationale="Fluid balance management",
                    source=_SOURCE,
                ),
                Recommendation(
                    action="Senior physician review",
                    priority=5,
                    rationale="Stage 2 AKI requires specialist oversight",
                    source=_SOURCE,
                ),
            ],
        )

    # stage_3
    return ProtocolResult(
        severity="stage_3",
        alert_generated=True,
        escalation="CALL SENIOR IMMEDIATELY + Nephrology consult — AKI Stage 3",
        recommendations=[
            Recommendation(
                action="CALL SENIOR IMMEDIATELY",
                priority=1,
                rationale=f"Life-threatening AKI Stage 3 — {detail}",
                source=_SOURCE,
            ),
            Recommendation(
                action="Nephrology consult",
                priority=2,
                rationale="Stage 3 AKI — consider dialysis access",
                source=_SOURCE,
            ),
            Recommendation(
                action="Urgent K+, pH, bicarbonate",
                priority=3,
                rationale="Hyperkalemia and metabolic acidosis common in Stage 3",
                source=_SOURCE,
            ),
            Recommendation(
                action="Hold all nephrotoxic drugs",
                priority=4,
                rationale="Prevent further renal injury",
                source=_SOURCE,
            ),
            Recommendation(
                action="Consider dialysis access preparation",
                priority=5,
                rationale="May require renal replacement therapy",
                source=_SOURCE,
            ),
        ],
    )
