"""Clinical threshold loader (Principle XI).

Schema + env plumbing ONLY. No protocol logic, no comparisons, no literals.
Hospitals tune clinical thresholds by changing environment — never by
patching code. P0 ships the loader; P1a extends it with lab thresholds.
"""

from __future__ import annotations

from decimal import Decimal
from functools import lru_cache

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class LabThreshold(BaseModel):
    """Critical-value bounds for a single lab test (both bounds optional)."""

    critical_high: float | None = None
    critical_low: float | None = None


class ClinicalConfig(BaseSettings):
    """Typed accessors for clinical thresholds. No semantics attached here."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Vitals thresholds (P0) ────────────────────────────────────────────────
    hr_min: int = Field(alias="CLINICAL_HR_MIN")
    hr_max: int = Field(alias="CLINICAL_HR_MAX")
    sbp_min: Decimal = Field(alias="CLINICAL_SBP_MIN")

    # ── Lab thresholds (P1a) — 14 vars for 7 tests ───────────────────────────
    lab_k_critical_high: float = Field(default=6.0, alias="CLINICAL_LAB_K_CRITICAL_HIGH")
    lab_k_critical_low: float = Field(default=2.5, alias="CLINICAL_LAB_K_CRITICAL_LOW")
    lab_na_critical_high: float = Field(default=155.0, alias="CLINICAL_LAB_NA_CRITICAL_HIGH")
    lab_na_critical_low: float = Field(default=125.0, alias="CLINICAL_LAB_NA_CRITICAL_LOW")
    lab_hb_critical_low: float = Field(default=7.0, alias="CLINICAL_LAB_HB_CRITICAL_LOW")
    lab_plt_critical_low: float = Field(default=50.0, alias="CLINICAL_LAB_PLT_CRITICAL_LOW")
    lab_inr_critical_high: float = Field(default=3.0, alias="CLINICAL_LAB_INR_CRITICAL_HIGH")
    lab_bs_critical_high: float = Field(default=400.0, alias="CLINICAL_LAB_BS_CRITICAL_HIGH")
    lab_bs_critical_low: float = Field(default=54.0, alias="CLINICAL_LAB_BS_CRITICAL_LOW")
    lab_lactate_critical_high: float = Field(
        default=4.0, alias="CLINICAL_LAB_LACTATE_CRITICAL_HIGH"
    )

    def get_lab_thresholds(self, test_name: str) -> LabThreshold | None:
        """Return LabThreshold for a supported test name, or None."""
        _map: dict[str, LabThreshold] = {
            "K+": LabThreshold(
                critical_high=self.lab_k_critical_high,
                critical_low=self.lab_k_critical_low,
            ),
            "Na+": LabThreshold(
                critical_high=self.lab_na_critical_high,
                critical_low=self.lab_na_critical_low,
            ),
            "Hemoglobin": LabThreshold(critical_low=self.lab_hb_critical_low),
            "Platelets": LabThreshold(critical_low=self.lab_plt_critical_low),
            "INR": LabThreshold(critical_high=self.lab_inr_critical_high),
            "Blood Sugar": LabThreshold(
                critical_high=self.lab_bs_critical_high,
                critical_low=self.lab_bs_critical_low,
            ),
            "Lactate": LabThreshold(critical_high=self.lab_lactate_critical_high),
        }
        return _map.get(test_name)


@lru_cache(maxsize=1)
def get_clinical_config() -> ClinicalConfig:
    return ClinicalConfig()  # type: ignore[call-arg]


def get_lab_thresholds(test_name: str) -> LabThreshold | None:
    """Module-level convenience wrapper — delegates to the cached config singleton."""
    return get_clinical_config().get_lab_thresholds(test_name)
