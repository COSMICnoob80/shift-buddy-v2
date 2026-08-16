"""Clinical threshold loader (Principle XI).

Schema + env plumbing ONLY. No protocol logic, no comparisons, no literals.
Hospitals tune clinical thresholds by changing environment — never by
patching code. P0 ships the loader; P1a extends it with lab thresholds;
P1b adds vital-sign warning+critical tiers.
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


class VitalThreshold(BaseModel):
    """Warning and critical bounds for a single vital sign (all bounds optional)."""

    warn_low: float | None = None
    warn_high: float | None = None
    crit_low: float | None = None
    crit_high: float | None = None


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

    # ── Vital-sign thresholds (P1b) — 21 new fields ──────────────────────────
    vital_hr_warn_low: float = Field(default=50.0, alias="CLINICAL_VITAL_HR_WARN_LOW")
    vital_hr_warn_high: float = Field(default=110.0, alias="CLINICAL_VITAL_HR_WARN_HIGH")
    vital_sbp_warn_low: float = Field(default=100.0, alias="CLINICAL_VITAL_SBP_WARN_LOW")
    vital_sbp_warn_high: float = Field(default=160.0, alias="CLINICAL_VITAL_SBP_WARN_HIGH")
    vital_sbp_crit_high: float = Field(default=180.0, alias="CLINICAL_VITAL_SBP_CRIT_HIGH")
    vital_dbp_warn_high: float = Field(default=100.0, alias="CLINICAL_VITAL_DBP_WARN_HIGH")
    vital_dbp_crit_high: float = Field(default=110.0, alias="CLINICAL_VITAL_DBP_CRIT_HIGH")
    vital_temp_warn_low: float = Field(default=36.0, alias="CLINICAL_VITAL_TEMP_WARN_LOW")
    vital_temp_warn_high: float = Field(default=38.0, alias="CLINICAL_VITAL_TEMP_WARN_HIGH")
    vital_temp_crit_low: float = Field(default=35.0, alias="CLINICAL_VITAL_TEMP_CRIT_LOW")
    vital_temp_crit_high: float = Field(default=39.5, alias="CLINICAL_VITAL_TEMP_CRIT_HIGH")
    vital_spo2_warn_low: float = Field(default=94.0, alias="CLINICAL_VITAL_SPO2_WARN_LOW")
    vital_spo2_crit_low: float = Field(default=90.0, alias="CLINICAL_VITAL_SPO2_CRIT_LOW")
    vital_rr_warn_low: float = Field(default=10.0, alias="CLINICAL_VITAL_RR_WARN_LOW")
    vital_rr_warn_high: float = Field(default=24.0, alias="CLINICAL_VITAL_RR_WARN_HIGH")
    vital_rr_crit_low: float = Field(default=8.0, alias="CLINICAL_VITAL_RR_CRIT_LOW")
    vital_rr_crit_high: float = Field(default=30.0, alias="CLINICAL_VITAL_RR_CRIT_HIGH")
    vital_bs_warn_low: float = Field(default=70.0, alias="CLINICAL_VITAL_BS_WARN_LOW")
    vital_bs_warn_high: float = Field(default=250.0, alias="CLINICAL_VITAL_BS_WARN_HIGH")
    vital_bs_crit_low: float = Field(default=54.0, alias="CLINICAL_VITAL_BS_CRIT_LOW")
    vital_bs_crit_high: float = Field(default=400.0, alias="CLINICAL_VITAL_BS_CRIT_HIGH")

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

    def get_vital_thresholds(self, parameter: str) -> VitalThreshold | None:
        """Return VitalThreshold for a supported vital parameter, or None.

        Existing P0 aliases (hr_min/hr_max/sbp_min) map to critical tiers here
        so callers see one unified view per parameter.
        """
        _map: dict[str, VitalThreshold] = {
            "heart_rate": VitalThreshold(
                warn_low=self.vital_hr_warn_low,
                warn_high=self.vital_hr_warn_high,
                crit_low=float(self.hr_min),
                crit_high=float(self.hr_max),
            ),
            "systolic_bp": VitalThreshold(
                warn_low=self.vital_sbp_warn_low,
                warn_high=self.vital_sbp_warn_high,
                crit_low=float(self.sbp_min),
                crit_high=self.vital_sbp_crit_high,
            ),
            "diastolic_bp": VitalThreshold(
                warn_high=self.vital_dbp_warn_high,
                crit_high=self.vital_dbp_crit_high,
            ),
            "temperature": VitalThreshold(
                warn_low=self.vital_temp_warn_low,
                warn_high=self.vital_temp_warn_high,
                crit_low=self.vital_temp_crit_low,
                crit_high=self.vital_temp_crit_high,
            ),
            "spo2": VitalThreshold(
                warn_low=self.vital_spo2_warn_low,
                crit_low=self.vital_spo2_crit_low,
            ),
            "respiratory_rate": VitalThreshold(
                warn_low=self.vital_rr_warn_low,
                warn_high=self.vital_rr_warn_high,
                crit_low=self.vital_rr_crit_low,
                crit_high=self.vital_rr_crit_high,
            ),
            "blood_sugar": VitalThreshold(
                warn_low=self.vital_bs_warn_low,
                warn_high=self.vital_bs_warn_high,
                crit_low=self.vital_bs_crit_low,
                crit_high=self.vital_bs_crit_high,
            ),
        }
        return _map.get(parameter)


@lru_cache(maxsize=1)
def get_clinical_config() -> ClinicalConfig:
    return ClinicalConfig()  # type: ignore[call-arg]


def get_lab_thresholds(test_name: str) -> LabThreshold | None:
    """Module-level convenience wrapper — delegates to the cached config singleton."""
    return get_clinical_config().get_lab_thresholds(test_name)


def get_vital_thresholds(parameter: str) -> VitalThreshold | None:
    """Module-level convenience wrapper — delegates to the cached config singleton."""
    return get_clinical_config().get_vital_thresholds(parameter)
