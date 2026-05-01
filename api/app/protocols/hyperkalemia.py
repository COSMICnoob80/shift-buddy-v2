"""Hyperkalemia protocol — deterministic tier table (AHA 2023 / KDIGO 2023).

Tier constants are fixed clinical guidelines — NOT configurable via clinical_config.py.
Pure function: no DB calls, no side effects, zero threshold literals from config.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.schemas.protocols import Recommendation

_SOURCE = "AHA 2023 Hyperkalemia Guidelines"

# Tier thresholds (fixed KDIGO/AHA guidelines — not hospital-configurable)
_MODERATE_LOW: float = 5.5
_SEVERE_LOW: float = 6.0
_EMERGENCY_LOW: float = 6.5


@dataclass
class ProtocolResult:
    severity: str
    recommendations: list[Recommendation]
    escalation: str | None
    alert_generated: bool


def evaluate(potassium: float, ecg_changes: bool = False) -> ProtocolResult:
    """Evaluate hyperkalemia severity and return ranked recommendations.

    Returns normal with empty recommendations when K+ < 5.5 (below moderate trigger).
    """
    if potassium >= _EMERGENCY_LOW:
        return _emergency(potassium)

    if potassium >= _SEVERE_LOW:
        if ecg_changes:
            return _emergency_ecg(potassium)
        return _severe(potassium)

    if potassium >= _MODERATE_LOW:
        return _moderate(potassium)

    # Below trigger threshold → normal
    return ProtocolResult(
        severity="normal",
        recommendations=[],
        escalation=None,
        alert_generated=False,
    )


def _moderate(potassium: float) -> ProtocolResult:
    return ProtocolResult(
        severity="moderate",
        alert_generated=True,
        escalation=None,
        recommendations=[
            Recommendation(
                action="Stop potassium-sparing drugs (spironolactone, ACEi, ARB)",
                priority=1,
                rationale=f"Reduce exogenous potassium load — K+ {potassium} mEq/L",
                source=_SOURCE,
            ),
            Recommendation(
                action="Kayexalate (sodium polystyrene sulfonate) 15g PO",
                priority=2,
                rationale="GI potassium excretion",
                source=_SOURCE,
            ),
            Recommendation(
                action="Recheck K+ in 4 hours",
                priority=3,
                rationale="Monitor treatment response",
                source=_SOURCE,
            ),
        ],
    )


def _severe(potassium: float) -> ProtocolResult:
    recs = [
        Recommendation(
            action="IV Calcium Gluconate 10% 10ml over 10 minutes",
            priority=1,
            rationale=f"Cardiac membrane stabilization — K+ {potassium} mEq/L > 6.0",
            source=_SOURCE,
        ),
        Recommendation(
            action="Insulin 10 units + Dextrose 25g (50ml D50) IV",
            priority=2,
            rationale="Intracellular potassium shift",
            source=_SOURCE,
        ),
        Recommendation(
            action="Stop potassium-sparing drugs (spironolactone, ACEi, ARB)",
            priority=3,
            rationale="Reduce ongoing potassium load",
            source=_SOURCE,
        ),
        Recommendation(
            action="Kayexalate 15g PO",
            priority=4,
            rationale="GI potassium excretion",
            source=_SOURCE,
        ),
        Recommendation(
            action="ECG stat — check for peaked T waves, widened QRS",
            priority=5,
            rationale="Detect cardiac toxicity",
            source=_SOURCE,
        ),
        Recommendation(
            action="Recheck K+ in 2 hours",
            priority=6,
            rationale="Monitor treatment response",
            source=_SOURCE,
        ),
    ]
    return ProtocolResult(
        severity="severe",
        alert_generated=True,
        escalation=None,
        recommendations=recs,
    )


def _emergency_ecg(potassium: float) -> ProtocolResult:
    recs = [
        Recommendation(
            action="IV Calcium Gluconate 10% 10ml over 10 minutes — STAT",
            priority=1,
            rationale=f"Cardiac membrane stabilization — K+ {potassium} mEq/L with ECG changes",
            source=_SOURCE,
        ),
        Recommendation(
            action="Insulin 10 units + Dextrose 25g IV",
            priority=2,
            rationale="Intracellular potassium shift",
            source=_SOURCE,
        ),
        Recommendation(
            action="Continuous cardiac monitoring",
            priority=3,
            rationale="ECG changes present — risk of fatal arrhythmia",
            source=_SOURCE,
        ),
        Recommendation(
            action="Cardiology consult",
            priority=4,
            rationale="ECG changes with severe hyperkalemia require specialist review",
            source=_SOURCE,
        ),
        Recommendation(
            action="Consider ICU transfer",
            priority=5,
            rationale="High-risk cardiac situation",
            source=_SOURCE,
        ),
    ]
    return ProtocolResult(
        severity="emergency_ecg",
        alert_generated=True,
        escalation="Cardiology consult URGENT — ECG changes with K+ 6.0–6.4 mEq/L",
        recommendations=recs,
    )


def _emergency(potassium: float) -> ProtocolResult:
    recs = [
        Recommendation(
            action="IV Calcium Gluconate 10% 10ml over 10 minutes — STAT",
            priority=1,
            rationale=f"Cardiac membrane stabilization — K+ {potassium} mEq/L ≥ 6.5",
            source=_SOURCE,
        ),
        Recommendation(
            action="Insulin 10 units + Dextrose 25g IV",
            priority=2,
            rationale="Intracellular potassium shift",
            source=_SOURCE,
        ),
        Recommendation(
            action="Nebulized salbutamol 10mg",
            priority=3,
            rationale="Additional intracellular potassium shift",
            source=_SOURCE,
        ),
        Recommendation(
            action="ICU transfer",
            priority=4,
            rationale="Life-threatening hyperkalemia requires intensive monitoring",
            source=_SOURCE,
        ),
        Recommendation(
            action="Consider dialysis — nephrology consult",
            priority=5,
            rationale="Definitive potassium removal for refractory cases",
            source=_SOURCE,
        ),
    ]
    return ProtocolResult(
        severity="emergency",
        alert_generated=True,
        escalation="CALL SENIOR IMMEDIATELY — K+ ≥ 6.5 mEq/L, ICU transfer required",
        recommendations=recs,
    )
