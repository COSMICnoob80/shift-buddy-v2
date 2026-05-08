/**
 * Lab and vital critical-level evaluators.
 * Port of api/app/services/lab_service.py + alert_service.py evaluate_vital_thresholds.
 * Pure functions: no DB calls, no side effects. All thresholds from clinical_config.
 */

import { getLabThresholds, getVitalThresholds } from './clinical_config';

/**
 * Returns true when a lab value crosses a critical_high or critical_low threshold.
 * Returns false for unsupported test names or values within range.
 */
export function isLabCritical(testName: string, value: number): boolean {
  const thresholds = getLabThresholds(testName);
  if (thresholds === null) return false;
  const crossesHigh = thresholds.criticalHigh !== null && value > thresholds.criticalHigh;
  const crossesLow = thresholds.criticalLow !== null && value < thresholds.criticalLow;
  return crossesHigh || crossesLow;
}

/**
 * Returns 'critical', 'warning', or null for a vital sign parameter.
 * Critical tier takes priority over warning.
 * Returns null for unsupported parameters or values within normal range.
 */
export function isVitalCritical(param: string, value: number): 'warning' | 'critical' | null {
  const thresholds = getVitalThresholds(param);
  if (thresholds === null) return null;

  const critHigh = thresholds.critHigh !== null && value > thresholds.critHigh;
  const critLow = thresholds.critLow !== null && value < thresholds.critLow;
  if (critHigh || critLow) return 'critical';

  const warnHigh = thresholds.warnHigh !== null && value > thresholds.warnHigh;
  const warnLow = thresholds.warnLow !== null && value < thresholds.warnLow;
  if (warnHigh || warnLow) return 'warning';

  return null;
}
