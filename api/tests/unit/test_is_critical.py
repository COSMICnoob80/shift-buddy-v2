"""T061 RED — Clinical config lab threshold extension (Principle XI).

First half: asserts get_lab_thresholds exists with correct K+ defaults,
returns None for unsupported tests, and rejects non-numeric env overrides.

Second half (T063): imports compute_is_critical from lab_service and
exercises all boundary values from plan.md §Boundary values.
"""

from __future__ import annotations

import pytest


# ── helpers ──────────────────────────────────────────────────────────────────

def _set_k_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CLINICAL_HR_MIN", "40")
    monkeypatch.setenv("CLINICAL_HR_MAX", "160")
    monkeypatch.setenv("CLINICAL_SBP_MIN", "90")
    monkeypatch.setenv("CLINICAL_LAB_K_CRITICAL_HIGH", "6.0")
    monkeypatch.setenv("CLINICAL_LAB_K_CRITICAL_LOW", "2.5")
    monkeypatch.setenv("CLINICAL_LAB_NA_CRITICAL_HIGH", "155.0")
    monkeypatch.setenv("CLINICAL_LAB_NA_CRITICAL_LOW", "125.0")
    monkeypatch.setenv("CLINICAL_LAB_HB_CRITICAL_LOW", "7.0")
    monkeypatch.setenv("CLINICAL_LAB_PLT_CRITICAL_LOW", "50.0")
    monkeypatch.setenv("CLINICAL_LAB_INR_CRITICAL_HIGH", "3.0")
    monkeypatch.setenv("CLINICAL_LAB_BS_CRITICAL_HIGH", "400.0")
    monkeypatch.setenv("CLINICAL_LAB_BS_CRITICAL_LOW", "54.0")
    monkeypatch.setenv("CLINICAL_LAB_LACTATE_CRITICAL_HIGH", "4.0")


# ── T061 threshold tests ──────────────────────────────────────────────────────

def test_k_threshold_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config, get_lab_thresholds

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()

    threshold = get_lab_thresholds("K+")
    assert threshold is not None
    assert threshold.critical_high == 6.0
    assert threshold.critical_low == 2.5


def test_creatinine_returns_none(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config, get_lab_thresholds

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()

    assert get_lab_thresholds("Creatinine") is None


def test_unknown_test_returns_none(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config, get_lab_thresholds

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()

    assert get_lab_thresholds("Unknown") is None


def test_non_numeric_k_critical_high_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    from pydantic import ValidationError

    from app.core.clinical_config import ClinicalConfig

    _set_k_env(monkeypatch)
    monkeypatch.setenv("CLINICAL_LAB_K_CRITICAL_HIGH", "not-a-number")
    with pytest.raises(ValidationError):
        ClinicalConfig()


# ── T063 boundary tests (added after compute_is_critical exists) ──────────────

def test_k_low_boundary_below(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("K+", 2.4, None, None) is True


def test_k_low_boundary_at(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("K+", 2.5, None, None) is False


def test_k_high_boundary_at(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("K+", 6.0, None, None) is False


def test_k_high_boundary_above(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("K+", 6.1, None, None) is True


def test_na_low_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Na+", 124.9, None, None) is True


def test_na_high_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Na+", 155.1, None, None) is True


def test_hb_low_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Hemoglobin", 6.9, None, None) is True


def test_hb_at_boundary_not_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Hemoglobin", 7.0, None, None) is False


def test_plt_low_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Platelets", 49, None, None) is True


def test_plt_at_boundary_not_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Platelets", 50, None, None) is False


def test_inr_high_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("INR", 3.1, None, None) is True


def test_inr_at_boundary_not_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("INR", 3.0, None, None) is False


def test_bs_low_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Blood Sugar", 53.9, None, None) is True


def test_bs_high_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Blood Sugar", 400.1, None, None) is True


def test_lactate_high_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Lactate", 4.1, None, None) is True


def test_lactate_at_boundary_not_critical(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Lactate", 4.0, None, None) is False


def test_creatinine_always_false(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Creatinine", 9999.0, None, None) is False


def test_troponin_always_false(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("Troponin", 9999.0, None, None) is False


def test_outside_ref_range_true_overrides_threshold(monkeypatch: pytest.MonkeyPatch) -> None:
    """K+ 6.1 with reference_high=7.0 (value inside ref range) → false."""
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("K+", 6.1, 3.5, 7.0) is False


def test_outside_ref_range_with_narrow_ref(monkeypatch: pytest.MonkeyPatch) -> None:
    """K+ 6.1 with reference_low=3.5, reference_high=5.0 (outside ref) → true."""
    from app.core.clinical_config import get_clinical_config
    from app.services.lab_service import compute_is_critical

    _set_k_env(monkeypatch)
    get_clinical_config.cache_clear()
    assert compute_is_critical("K+", 6.1, 3.5, 5.0) is True
