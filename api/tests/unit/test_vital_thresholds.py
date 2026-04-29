"""T098 RED — VitalThreshold import guard; T104 boundary suite added later.

Asserts get_vital_thresholds and VitalThreshold exist in clinical_config
and that get_vital_thresholds("gcs") returns None (deferred parameter).
"""

from __future__ import annotations

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
    """Import-level smoke test — heart_rate must return a VitalThreshold (not None)."""
    from app.core.clinical_config import VitalThreshold, get_vital_thresholds

    result = get_vital_thresholds("heart_rate")
    assert isinstance(result, VitalThreshold)
