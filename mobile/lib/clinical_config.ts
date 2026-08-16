/**
 * Mobile clinical thresholds (Principle XI).
 * Fixed defaults only — no env vars on a phone runtime.
 * Values mirror api/app/core/clinical_config.py defaults.
 */

export interface LabThreshold {
  criticalHigh: number | null;
  criticalLow: number | null;
}

export interface VitalThreshold {
  warnLow: number | null;
  warnHigh: number | null;
  critLow: number | null;
  critHigh: number | null;
}

export const CLINICAL_CONFIG = {
  // ── Lab thresholds ────────────────────────────────────────────────────────
  lab_k_critical_high: 6.0,
  lab_k_critical_low: 2.5,
  lab_na_critical_high: 155.0,
  lab_na_critical_low: 125.0,
  lab_hb_critical_low: 7.0,
  lab_plt_critical_low: 50.0,
  lab_inr_critical_high: 3.0,
  lab_bs_critical_high: 400.0,
  lab_bs_critical_low: 54.0,
  lab_lactate_critical_high: 4.0,

  // ── Vital-sign thresholds ─────────────────────────────────────────────────
  vital_hr_warn_low: 50.0,
  vital_hr_warn_high: 110.0,
  vital_hr_crit_low: 40.0,
  vital_hr_crit_high: 130.0,
  vital_sbp_warn_low: 100.0,
  vital_sbp_warn_high: 160.0,
  vital_sbp_crit_low: 90.0,
  vital_sbp_crit_high: 180.0,
  vital_dbp_warn_high: 100.0,
  vital_dbp_crit_high: 110.0,
  vital_temp_warn_low: 36.0,
  vital_temp_warn_high: 38.0,
  vital_temp_crit_low: 35.0,
  vital_temp_crit_high: 39.5,
  vital_spo2_warn_low: 94.0,
  vital_spo2_crit_low: 90.0,
  vital_rr_warn_low: 10.0,
  vital_rr_warn_high: 24.0,
  vital_rr_crit_low: 8.0,
  vital_rr_crit_high: 30.0,
  vital_bs_warn_low: 70.0,
  vital_bs_warn_high: 250.0,
  vital_bs_crit_low: 54.0,
  vital_bs_crit_high: 400.0,
} as const;

const LAB_THRESHOLDS: Record<string, LabThreshold> = {
  'K+': { criticalHigh: CLINICAL_CONFIG.lab_k_critical_high, criticalLow: CLINICAL_CONFIG.lab_k_critical_low },
  'Na+': { criticalHigh: CLINICAL_CONFIG.lab_na_critical_high, criticalLow: CLINICAL_CONFIG.lab_na_critical_low },
  'Hemoglobin': { criticalHigh: null, criticalLow: CLINICAL_CONFIG.lab_hb_critical_low },
  'Platelets': { criticalHigh: null, criticalLow: CLINICAL_CONFIG.lab_plt_critical_low },
  'INR': { criticalHigh: CLINICAL_CONFIG.lab_inr_critical_high, criticalLow: null },
  'Blood Sugar': { criticalHigh: CLINICAL_CONFIG.lab_bs_critical_high, criticalLow: CLINICAL_CONFIG.lab_bs_critical_low },
  'Lactate': { criticalHigh: CLINICAL_CONFIG.lab_lactate_critical_high, criticalLow: null },
};

const VITAL_THRESHOLDS: Record<string, VitalThreshold> = {
  heart_rate: { warnLow: CLINICAL_CONFIG.vital_hr_warn_low, warnHigh: CLINICAL_CONFIG.vital_hr_warn_high, critLow: CLINICAL_CONFIG.vital_hr_crit_low, critHigh: CLINICAL_CONFIG.vital_hr_crit_high },
  systolic_bp: { warnLow: CLINICAL_CONFIG.vital_sbp_warn_low, warnHigh: CLINICAL_CONFIG.vital_sbp_warn_high, critLow: CLINICAL_CONFIG.vital_sbp_crit_low, critHigh: CLINICAL_CONFIG.vital_sbp_crit_high },
  diastolic_bp: { warnLow: null, warnHigh: CLINICAL_CONFIG.vital_dbp_warn_high, critLow: null, critHigh: CLINICAL_CONFIG.vital_dbp_crit_high },
  temperature: { warnLow: CLINICAL_CONFIG.vital_temp_warn_low, warnHigh: CLINICAL_CONFIG.vital_temp_warn_high, critLow: CLINICAL_CONFIG.vital_temp_crit_low, critHigh: CLINICAL_CONFIG.vital_temp_crit_high },
  spo2: { warnLow: CLINICAL_CONFIG.vital_spo2_warn_low, warnHigh: null, critLow: CLINICAL_CONFIG.vital_spo2_crit_low, critHigh: null },
  respiratory_rate: { warnLow: CLINICAL_CONFIG.vital_rr_warn_low, warnHigh: CLINICAL_CONFIG.vital_rr_warn_high, critLow: CLINICAL_CONFIG.vital_rr_crit_low, critHigh: CLINICAL_CONFIG.vital_rr_crit_high },
  blood_sugar: { warnLow: CLINICAL_CONFIG.vital_bs_warn_low, warnHigh: CLINICAL_CONFIG.vital_bs_warn_high, critLow: CLINICAL_CONFIG.vital_bs_crit_low, critHigh: CLINICAL_CONFIG.vital_bs_crit_high },
};

export function getLabThresholds(testName: string): LabThreshold | null {
  return LAB_THRESHOLDS[testName] ?? null;
}

export function getVitalThresholds(param: string): VitalThreshold | null {
  return VITAL_THRESHOLDS[param] ?? null;
}
