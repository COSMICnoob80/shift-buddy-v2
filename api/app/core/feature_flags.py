"""Feature flags — env-driven via pydantic-settings (P0 loader only).

No consumers are wired in P0. This module is loader + model only.
Toggle flags by setting environment variables with the ``FEATURE_`` prefix,
e.g. ``FEATURE_SHADOW_MODE_ENABLED=true``.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class FeatureFlags(BaseSettings):
    """Runtime feature flags.  All flags default OFF / zero.

    Environment variable mapping (prefix ``FEATURE_``):
      - ``FEATURE_SHADOW_MODE_ENABLED``      → shadow_mode_enabled (bool)
      - ``FEATURE_AGENT_AUTONOMY_LEVEL``     → agent_autonomy_level (int)
      - ``FEATURE_DIVERGENCE_LOGGING_ENABLED`` → divergence_logging_enabled (bool)
    """

    model_config = SettingsConfigDict(
        env_prefix="FEATURE_",
        extra="forbid",
    )

    shadow_mode_enabled: bool = False
    agent_autonomy_level: int = 0
    divergence_logging_enabled: bool = False


@lru_cache(maxsize=1)
def get_feature_flags() -> FeatureFlags:
    """Return the cached singleton ``FeatureFlags`` instance."""
    return FeatureFlags()
