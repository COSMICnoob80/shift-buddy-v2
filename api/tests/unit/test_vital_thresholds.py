"""T098/T104 — VitalThreshold import guard + evaluate_vital_thresholds boundary suite.

T098 RED: import guards (now green after T099).
T104 RED: evaluate_vital_thresholds boundary parametrize (fails until T105).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest


def test_get_vital_thresholds_importable() -> None:
    from app.core.clinical_config import VitalThreshold, get_vital_thresholds  # noqa: F401

    assert callable(get_vital_thresholds)


def test_vital_threshold_model_importable() -> None:
    from app.core.clinical_config import VitalThreshold

    vt = VitalThreshold(warn_low=50.0)
    assert vt.warn_low == 50.0
    assert vt.warn_high is None


def test_get_vital_thresholds_gcs_returns_none() -> None:
    from app.core.clinical_config import get_vital_thresholds

    assert get_vital_thresholds("gcs") is None


def test_get_vital_thresholds_heart_rate_not_none() -> None:
    from app.core.clinical_config import VitalThreshold, get_vital_thresholds

    result = get_vital_thresholds("heart_rate")
    assert isinstance(result, VitalThreshold)


# ── T104: evaluate_vital_thresholds boundary suite ────────────────────────────


def _make_vitals(**kwargs: object) -> object:
    """Build a minimal VitalSigns-like namespace with recorded_at and the given fields."""

    now = datetime.now(UTC)
    defaults: dict[str, object] = {
        "id": uuid.uuid4(),
        "patient_id": uuid.uuid4(),
        "recorded_at": now,
        "heart_rate": None,
        "systolic_bp": None,
        "diastolic_bp": None,
        "temperature": None,
        "spo2": None,
        "respiratory_rate": None,
        "gcs": None,
        "urine_output": None,
        "blood_sugar": None,
    }
    defaults.update(kwargs)

    class _FakeVitals:
        pass

    obj = _FakeVitals()
    for k, v in defaults.items():
        setattr(obj, k, v)
    return obj


# ── T106: build_lab_alert unit suite ─────────────────────────────────────────


def _make_lab(
    test_name: str,
    value: float,
    unit: str = "mEq/L",
    is_critical: bool = True,
) -> object:
    """Build a minimal LabResult-like namespace."""
    import uuid
    from datetime import UTC, datetime

    class _FakeLab:
        pass

    obj = _FakeLab()
    obj.id = uuid.uuid4()  # type: ignore[attr-defined]
    obj.patient_id = uuid.uuid4()  # type: ignore[attr-defined]
    obj.test_name = test_name  # type: ignore[attr-defined]
    obj.value = value  # type: ignore[attr-defined]
    obj.unit = unit  # type: ignore[attr-defined]
    obj.is_critical = is_critical  # type: ignore[attr-defined]
    obj.recorded_at = datetime.now(UTC)  # type: ignore[attr-defined]
    return obj


def test_build_lab_alert_k_critical_returns_alert_with_protocol_link() -> None:
    from app.core.clinical_config import get_clinical_config as _gcfg

    _gcfg.cache_clear()  # type: ignore[attr-defined]
    from app.core.clinical_config import get_clinical_config
    from app.services.alert_service import build_lab_alert

    lab = _make_lab("K+", 6.2, is_critical=True)
    result = build_lab_alert(lab, get_clinical_config())  # type: ignore[arg-type]
    assert result is not None
    assert result.trigger_source == "lab"
    assert result.alert_type == "critical"
    assert result.protocol_link is not None
    assert "hyperkalemia" in result.protocol_link


def test_build_lab_alert_k_not_critical_returns_none() -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.alert_service import build_lab_alert

    lab = _make_lab("K+", 4.5, is_critical=False)
    result = build_lab_alert(lab, get_clinical_config())  # type: ignore[arg-type]
    assert result is None


def test_build_lab_alert_creatinine_critical_returns_aki_link() -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.alert_service import build_lab_alert

    lab = _make_lab("Creatinine", 3.5, unit="mg/dL", is_critical=True)
    result = build_lab_alert(lab, get_clinical_config())  # type: ignore[arg-type]
    assert result is not None
    assert result.protocol_link is not None
    assert "aki_staging" in result.protocol_link


def test_build_lab_alert_troponin_critical_no_protocol_link() -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.alert_service import build_lab_alert

    lab = _make_lab("Troponin", 0.5, unit="ng/mL", is_critical=True)
    result = build_lab_alert(lab, get_clinical_config())  # type: ignore[arg-type]
    assert result is not None
    assert result.protocol_link is None


@pytest.mark.parametrize(
    "field,value,expected_type,expected_count",
    [
        ("heart_rate", 135, "critical", 1),  # above hr_max (130 test default → 160 P0 default)
        ("heart_rate", 55, "warning", 1),  # below vital_hr_warn_low=50 … above hr_min=40
        ("heart_rate", 80, None, 0),  # normal range
        ("spo2", 91, "warning", 1),  # below vital_spo2_warn_low=94
        ("spo2", 89, "critical", 1),  # below vital_spo2_crit_low=90
        ("temperature", 39.6, "critical", 1),  # above vital_temp_crit_high=39.5
        ("systolic_bp", 181, "critical", 1),  # above vital_sbp_crit_high=180
    ],
)
def test_evaluate_vital_thresholds_boundary(
    field: str,
    value: int | float,
    expected_type: str | None,
    expected_count: int,
) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.core.clinical_config import get_clinical_config as _gcfg
    from app.services.alert_service import evaluate_vital_thresholds

    _gcfg.cache_clear()  # type: ignore[attr-defined]

    config = get_clinical_config()
    vitals = _make_vitals(**{field: value})
    results = evaluate_vital_thresholds(vitals, config)  # type: ignore[arg-type]

    assert len(results) == expected_count, (
        f"{field}={value}: expected {expected_count} alerts, got {len(results)}"
    )
    if expected_type is not None:
        assert results[0].alert_type == expected_type, (
            f"{field}={value}: expected alert_type={expected_type!r}, got {results[0].alert_type!r}"
        )
