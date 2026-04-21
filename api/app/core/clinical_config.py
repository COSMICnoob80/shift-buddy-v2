"""Clinical threshold loader (Principle XI).

Schema + env plumbing ONLY. No protocol logic, no comparisons, no literals.
Hospitals tune clinical thresholds by changing environment — never by
patching code. P0 ships the loader; protocol code lands in P1+.
"""

from __future__ import annotations

from decimal import Decimal
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ClinicalConfig(BaseSettings):
    """Typed accessors for clinical thresholds. No semantics attached here."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    hr_min: int = Field(alias="CLINICAL_HR_MIN")
    hr_max: int = Field(alias="CLINICAL_HR_MAX")
    sbp_min: Decimal = Field(alias="CLINICAL_SBP_MIN")


@lru_cache(maxsize=1)
def get_clinical_config() -> ClinicalConfig:
    return ClinicalConfig()  # type: ignore[call-arg]
