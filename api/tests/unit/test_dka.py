"""T115 RED — DKA protocol unit tests (SPEC §4.4).

All cases fail until T116 creates api/app/protocols/dka.py.
Every non-empty recommendation must have a non-empty source (Principle IX).
"""

from __future__ import annotations

import pytest


@pytest.mark.parametrize(
    "ph,hco3,blood_sugar,mental_status,expected_severity,expect_escalation",
    [
        # SPEC §4.4 severity classification table
        (7.27, 16.0, 300.0, "alert", "mild", False),
        (7.15, 12.0, 380.0, "alert", "moderate", False),
        (6.95, 8.0, 450.0, "obtunded", "severe", True),
        # pH outside DKA range (pH ≥ 7.31) → normal
        (7.35, 20.0, 200.0, "alert", "normal", False),
        # HCO3 boundary — < 10 → severe even if pH borderline
        (7.05, 9.0, 400.0, "alert", "severe", True),
    ],
)
def test_dka_evaluate(
    ph: float,
    hco3: float,
    blood_sugar: float,
    mental_status: str,
    expected_severity: str,
    expect_escalation: bool,
) -> None:
    from app.protocols.dka import evaluate

    result = evaluate(blood_sugar=blood_sugar, ph=ph, hco3=hco3, mental_status=mental_status)

    assert result.severity == expected_severity, (
        f"pH={ph} HCO3={hco3}: expected severity={expected_severity!r}, got {result.severity!r}"
    )

    if expected_severity != "normal":
        assert len(result.recommendations) > 0, (
            f"pH={ph}: expected recommendations for {expected_severity}, got none"
        )
        for rec in result.recommendations:
            assert rec.source, (
                f"pH={ph}: recommendation '{rec.action}' has empty source (Principle IX)"
            )

    if expect_escalation:
        assert result.escalation is not None, (
            f"pH={ph}: expected escalation for {expected_severity}, got None"
        )
    else:
        assert result.escalation is None, (
            f"pH={ph}: expected no escalation for {expected_severity}, got {result.escalation!r}"
        )


def test_dka_normal_has_no_recommendations() -> None:
    from app.protocols.dka import evaluate

    result = evaluate(blood_sugar=200.0, ph=7.35, hco3=20.0, mental_status="alert")
    assert result.severity == "normal"
    assert result.recommendations == []
    assert result.alert_generated is False


def test_dka_severe_alert_generated() -> None:
    from app.protocols.dka import evaluate

    result = evaluate(blood_sugar=450.0, ph=6.95, hco3=8.0, mental_status="obtunded")
    assert result.severity == "severe"
    assert result.alert_generated is True


def test_dka_moderate_alert_generated() -> None:
    from app.protocols.dka import evaluate

    result = evaluate(blood_sugar=380.0, ph=7.15, hco3=12.0, mental_status="alert")
    assert result.severity == "moderate"
    assert result.alert_generated is True
