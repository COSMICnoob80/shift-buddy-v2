"""T113 RED — Hyperkalemia protocol unit tests (SPEC §4.1 — all 6 cases).

All cases fail until T114 creates api/app/protocols/hyperkalemia.py.
Every non-empty recommendation must have a non-empty source (Principle IX).
"""

from __future__ import annotations

import pytest


@pytest.mark.parametrize(
    "potassium,ecg_changes,expected_severity,expect_empty_recs,expect_escalation",
    [
        (5.0, False, "normal", True, False),   # K+ < 5.5 — no alert
        (5.6, False, "moderate", False, False),  # Kayexalate tier
        (6.2, False, "severe", False, False),    # Calcium Gluconate priority 1
        (6.2, True, "emergency_ecg", False, True),  # ECG changes — escalate
        (6.7, False, "emergency", False, True),  # ≥ 6.5 — CALL SENIOR IMMEDIATELY
        (3.0, False, "normal", True, False),     # Low K+ — no alert (below trigger range)
    ],
)
def test_hyperkalemia_evaluate(
    potassium: float,
    ecg_changes: bool,
    expected_severity: str,
    expect_empty_recs: bool,
    expect_escalation: bool,
) -> None:
    from app.protocols.hyperkalemia import evaluate

    result = evaluate(potassium=potassium, ecg_changes=ecg_changes)

    assert result.severity == expected_severity, (
        f"K+={potassium} ecg={ecg_changes}: expected severity={expected_severity!r}, "
        f"got {result.severity!r}"
    )

    if expect_empty_recs:
        assert len(result.recommendations) == 0, (
            f"K+={potassium}: expected no recommendations, got {result.recommendations}"
        )
    else:
        assert len(result.recommendations) > 0, (
            f"K+={potassium}: expected recommendations, got none"
        )
        for rec in result.recommendations:
            assert rec.source, (
                f"K+={potassium}: recommendation '{rec.action}' has empty source (Principle IX)"
            )

    if expect_escalation:
        assert result.escalation is not None, (
            f"K+={potassium} ecg={ecg_changes}: expected escalation text, got None"
        )
    else:
        assert result.escalation is None, (
            f"K+={potassium}: expected no escalation, got {result.escalation!r}"
        )


def test_hyperkalemia_severe_calcium_gluconate_priority_1() -> None:
    """Calcium Gluconate must be priority 1 action for severe tier (K+ 6.0-6.4, no ECG)."""
    from app.protocols.hyperkalemia import evaluate

    result = evaluate(potassium=6.2, ecg_changes=False)
    assert result.severity == "severe"
    priority_1 = next((r for r in result.recommendations if r.priority == 1), None)
    assert priority_1 is not None
    assert "Calcium Gluconate" in priority_1.action


def test_hyperkalemia_emergency_call_senior() -> None:
    """Emergency tier (K+ ≥ 6.5) escalation must mention CALL SENIOR IMMEDIATELY."""
    from app.protocols.hyperkalemia import evaluate

    result = evaluate(potassium=6.7, ecg_changes=False)
    assert result.severity == "emergency"
    assert result.escalation is not None
    assert "CALL SENIOR" in result.escalation


def test_hyperkalemia_alert_generated_normal_is_false() -> None:
    from app.protocols.hyperkalemia import evaluate

    result = evaluate(potassium=5.0)
    assert result.alert_generated is False


def test_hyperkalemia_alert_generated_moderate_is_true() -> None:
    from app.protocols.hyperkalemia import evaluate

    result = evaluate(potassium=5.6)
    assert result.alert_generated is True
