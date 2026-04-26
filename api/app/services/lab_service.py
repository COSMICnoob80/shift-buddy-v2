"""Lab service — is_critical computation (P1a).

compute_is_critical is a pure function: no DB call, no literals.
All threshold values are sourced from ClinicalConfig (Principle XI).
Caller (lab router) sets is_critical on the ORM object before db.add().
"""

from __future__ import annotations

from app.core.clinical_config import get_clinical_config


def compute_is_critical(
    test_name: str,
    value: float,
    reference_low: float | None,
    reference_high: float | None,
) -> bool:
    """Return True iff value is outside reference range AND crosses a critical threshold.

    When reference_low/reference_high are both absent, outside_ref_range
    defaults to True (only the critical threshold gate applies).
    """
    thresholds = get_clinical_config().get_lab_thresholds(test_name)
    if thresholds is None:
        return False

    if reference_low is not None and reference_high is not None:
        outside_ref_range = value < reference_low or value > reference_high
    else:
        outside_ref_range = True

    crosses_critical = (
        thresholds.critical_high is not None and value > thresholds.critical_high
    ) or (
        thresholds.critical_low is not None and value < thresholds.critical_low
    )

    return outside_ref_range and crosses_critical
