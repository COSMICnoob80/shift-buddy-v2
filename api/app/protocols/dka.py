"""DKA protocol — deterministic severity tiers per SPEC §4.4.

Tier constants are fixed clinical guidelines — NOT configurable via clinical_config.py.
Pure function: no DB calls, no side effects.
"""

from __future__ import annotations

from app.protocols.hyperkalemia import ProtocolResult
from app.schemas.protocols import Recommendation

_SOURCE = "DKA Management Guidelines (ADA 2024 / WHO)"

# Fixed clinical severity thresholds (pH and HCO3 — both must be met for classification,
# lowest tier (most severe) wins when either criterion is crossed)
_SEVERE_PH_MAX: float = 7.00
_SEVERE_HCO3_MAX: float = 10.0
_MODERATE_PH_MAX: float = 7.25  # pH 7.00–7.24
_MODERATE_HCO3_MAX: float = 15.0  # HCO3 10–14
_MILD_PH_MAX: float = 7.31  # pH 7.25–7.30


def evaluate(
    blood_sugar: float,
    ph: float,
    hco3: float,
    mental_status: str,
) -> ProtocolResult:
    """Evaluate DKA severity and return ranked recommendations.

    Severity determined by pH and HCO3 per SPEC §4.4 table.
    Worst criterion wins (pH < 7.00 OR HCO3 < 10 → severe, regardless of other).
    """
    severity = _classify(ph, hco3)

    if severity == "normal":
        return ProtocolResult(
            severity="normal",
            recommendations=[],
            escalation=None,
            alert_generated=False,
        )

    if severity == "severe":
        return _severe(blood_sugar, ph, hco3, mental_status)
    if severity == "moderate":
        return _moderate(blood_sugar, ph, hco3)
    return _mild(blood_sugar, ph, hco3)


def _classify(ph: float, hco3: float) -> str:
    if ph < _SEVERE_PH_MAX or hco3 < _SEVERE_HCO3_MAX:
        return "severe"
    if ph < _MODERATE_PH_MAX or hco3 < _MODERATE_HCO3_MAX:
        return "moderate"
    if ph < _MILD_PH_MAX:
        return "mild"
    return "normal"


def _common_initial_recs() -> list[Recommendation]:
    return [
        Recommendation(
            action="ABG STAT (pH, HCO3, pCO2)",
            priority=1,
            rationale="Confirm diagnosis and severity classification",
            source=_SOURCE,
        ),
        Recommendation(
            action="BMP STAT (K+, Na+, Cl-, BUN, Creatinine)",
            priority=2,
            rationale="Electrolyte status critical — K+ may drop rapidly with insulin",
            source=_SOURCE,
        ),
        Recommendation(
            action="Blood sugar (lab, not glucometer — for accuracy)",
            priority=3,
            rationale="Glucometer values unreliable in extreme hyperglycemia",
            source=_SOURCE,
        ),
        Recommendation(
            action="Urine ketones or serum beta-hydroxybutyrate",
            priority=4,
            rationale="Confirm ketosis",
            source=_SOURCE,
        ),
        Recommendation(
            action="NS 1L bolus over 1 hour (unless heart failure)",
            priority=5,
            rationale="Initial volume resuscitation",
            source=_SOURCE,
        ),
    ]


def _mild(blood_sugar: float, ph: float, hco3: float) -> ProtocolResult:
    recs = _common_initial_recs()
    recs += [
        Recommendation(
            action="Insulin infusion 0.1 units/kg/hr after potassium ≥ 3.5 mEq/L confirmed",
            priority=6,
            rationale=f"Mild DKA (pH {ph:.2f}, HCO3 {hco3:.1f}) — ward management",
            source=_SOURCE,
        ),
        Recommendation(
            action="Hourly blood glucose monitoring",
            priority=7,
            rationale="Titrate insulin to glucose reduction 50–75 mg/dL/hr",
            source=_SOURCE,
        ),
    ]
    return ProtocolResult(
        severity="mild",
        alert_generated=True,
        escalation=None,
        recommendations=recs,
    )


def _moderate(blood_sugar: float, ph: float, hco3: float) -> ProtocolResult:
    recs = _common_initial_recs()
    recs += [
        Recommendation(
            action="Insulin infusion 0.1 units/kg/hr — check K+ first",
            priority=6,
            rationale=f"Moderate DKA (pH {ph:.2f}, HCO3 {hco3:.1f})",
            source=_SOURCE,
        ),
        Recommendation(
            action="Step-down unit if available, frequent nursing checks",
            priority=7,
            rationale="Moderate DKA — needs closer monitoring than standard ward",
            source=_SOURCE,
        ),
        Recommendation(
            action="Potassium replacement per sliding scale (K+ < 3.5 → hold insulin)",
            priority=8,
            rationale="Insulin drives K+ into cells — prevent life-threatening hypokalemia",
            source=_SOURCE,
        ),
    ]
    return ProtocolResult(
        severity="moderate",
        alert_generated=True,
        escalation=None,
        recommendations=recs,
    )


def _severe(blood_sugar: float, ph: float, hco3: float, mental_status: str) -> ProtocolResult:
    recs = _common_initial_recs()
    recs += [
        Recommendation(
            action="ICU admission — continuous cardiac monitoring",
            priority=6,
            rationale=f"Severe DKA (pH {ph:.2f}, HCO3 {hco3:.1f}) — life-threatening",
            source=_SOURCE,
        ),
        Recommendation(
            action="Insulin infusion 0.1 units/kg/hr after K+ ≥ 3.5 confirmed",
            priority=7,
            rationale="Do NOT start insulin until potassium repleted",
            source=_SOURCE,
        ),
        Recommendation(
            action="Potassium aggressive replacement (K+ replacement mandatory)",
            priority=8,
            rationale="Severe metabolic acidosis — electrolyte derangement expected",
            source=_SOURCE,
        ),
        Recommendation(
            action="Consider bicarbonate therapy only if pH < 6.9",
            priority=9,
            rationale="Routine bicarbonate not recommended above pH 6.9 per ADA guidelines",
            source=_SOURCE,
        ),
    ]
    if mental_status == "obtunded":
        recs.append(
            Recommendation(
                action="Secure airway — consider intubation if GCS declining",
                priority=10,
                rationale=f"Mental status: {mental_status} — airway at risk",
                source=_SOURCE,
            )
        )
    return ProtocolResult(
        severity="severe",
        alert_generated=True,
        escalation="CALL SENIOR STAT + ICU transfer — severe DKA (pH < 7.00 or HCO3 < 10)",
        recommendations=recs,
    )
