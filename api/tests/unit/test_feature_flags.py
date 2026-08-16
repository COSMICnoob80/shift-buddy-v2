"""T056/T057 RED — FeatureFlags loader tests.

Verifies that:
  (a) all flags default to OFF / zero with no env vars set,
  (b) FEATURE_SHADOW_MODE_ENABLED=true flips the boolean flag,
  (c) FEATURE_AGENT_AUTONOMY_LEVEL is coerced to int and rejects non-int,
  (d) an unknown FEATURE_* key is rejected (extra="forbid").

Each test constructs ``FeatureFlags()`` directly — never via the cached
``get_feature_flags()`` accessor — so that monkeypatched env vars are
visible to the fresh Pydantic-settings instance.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.feature_flags import FeatureFlags

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ALL_FEATURE_VARS = (
    "FEATURE_SHADOW_MODE_ENABLED",
    "FEATURE_AGENT_AUTONOMY_LEVEL",
    "FEATURE_DIVERGENCE_LOGGING_ENABLED",
)


def _clear_all(monkeypatch: pytest.MonkeyPatch) -> None:
    """Remove every FEATURE_ env var so tests start from a clean slate."""
    for var in _ALL_FEATURE_VARS:
        monkeypatch.delenv(var, raising=False)


# ---------------------------------------------------------------------------
# (a) Defaults — all flags off/zero when no env vars are present
# ---------------------------------------------------------------------------


def test_defaults_all_off(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_all(monkeypatch)

    flags = FeatureFlags()

    assert flags.shadow_mode_enabled is False
    assert flags.agent_autonomy_level == 0
    assert flags.divergence_logging_enabled is False


# ---------------------------------------------------------------------------
# (b) Flip shadow_mode_enabled via env var
# ---------------------------------------------------------------------------


def test_shadow_mode_enabled_env_flip(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_all(monkeypatch)
    monkeypatch.setenv("FEATURE_SHADOW_MODE_ENABLED", "true")

    flags = FeatureFlags()

    assert flags.shadow_mode_enabled is True


# ---------------------------------------------------------------------------
# (c) agent_autonomy_level: int coercion + validation error on bad input
# ---------------------------------------------------------------------------


def test_agent_autonomy_level_int_coercion_and_validation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Valid integer string → coerced to int
    _clear_all(monkeypatch)
    monkeypatch.setenv("FEATURE_AGENT_AUTONOMY_LEVEL", "2")

    flags = FeatureFlags()
    assert flags.agent_autonomy_level == 2

    # Non-integer string → ValidationError
    monkeypatch.setenv("FEATURE_AGENT_AUTONOMY_LEVEL", "notanint")
    with pytest.raises(ValidationError):
        FeatureFlags()


# ---------------------------------------------------------------------------
# (d) Unknown FEATURE_* key → ValidationError (extra="forbid")
# ---------------------------------------------------------------------------


def test_unknown_env_key_rejected() -> None:
    # extra="forbid" intercepts unknown constructor kwargs, not env vars.
    # pydantic-settings only reads env vars matching declared field names.
    with pytest.raises(ValidationError):
        FeatureFlags(bogus="xyz")  # type: ignore[call-arg]
