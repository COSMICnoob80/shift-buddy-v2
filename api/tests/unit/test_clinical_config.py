"""T010 RED — Clinical config loader + schema (Principle XI).

Asserts: schema rejects missing vars, rejects non-numeric values,
exposes typed accessors (Decimal/int), and the loader module contains
ZERO threshold-comparison operators (no protocol code — Principle III).
"""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import pytest

MONITORED_ENV_VARS = ("CLINICAL_HR_MIN", "CLINICAL_HR_MAX", "CLINICAL_SBP_MIN")


def _clear_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for var in MONITORED_ENV_VARS:
        monkeypatch.delenv(var, raising=False)


def _set_ok_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CLINICAL_HR_MIN", "40")
    monkeypatch.setenv("CLINICAL_HR_MAX", "160")
    monkeypatch.setenv("CLINICAL_SBP_MIN", "90")


def test_missing_envvars_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    from pydantic import ValidationError

    from app.core.clinical_config import ClinicalConfig

    _clear_env(monkeypatch)
    with pytest.raises(ValidationError):
        ClinicalConfig()


def test_non_numeric_threshold_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    from pydantic import ValidationError

    from app.core.clinical_config import ClinicalConfig

    _set_ok_env(monkeypatch)
    monkeypatch.setenv("CLINICAL_HR_MIN", "not-a-number")
    with pytest.raises(ValidationError):
        ClinicalConfig()


def test_typed_accessors(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.clinical_config import ClinicalConfig, get_clinical_config

    _set_ok_env(monkeypatch)
    get_clinical_config.cache_clear()
    cfg: ClinicalConfig = get_clinical_config()
    assert isinstance(cfg.hr_min, int)
    assert isinstance(cfg.hr_max, int)
    assert isinstance(cfg.sbp_min, Decimal)
    assert cfg.hr_min == 40
    assert cfg.sbp_min == Decimal("90")


def test_no_protocol_code_in_loader() -> None:
    """Principle III: loader ships only schema + env plumbing, no comparisons."""
    path = Path(__file__).resolve().parents[2] / "app" / "core" / "clinical_config.py"
    assert path.exists(), f"missing loader: {path}"
    source = path.read_text(encoding="utf-8")
    banned = (" > ", " < ", " >= ", " <= ")
    for token in banned:
        assert token not in source, (
            f"clinical_config.py must contain zero threshold comparisons, found: {token!r}"
        )
