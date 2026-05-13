/**
 * Lab and vital critical-level evaluators.
 * Port of api/app/services/lab_service.py + alert_service.py evaluate_vital_thresholds.
 * Pure functions: no DB calls, no side effects. All thresholds from clinical_config.
 */

import { getLabThresholds, getVitalThresholds } from './clinical_config';

export interface CriticalIntervention {
  severity: 'critical';
  message: string;
  protocol: string;
}

/**
 * Returns true when a lab value crosses a critical_high or critical_low threshold.
 * Returns false for unsupported test names or values within range.
 */
export function isLabCritical(testName: string, value: number): CriticalIntervention | null {
  const thresholds = getLabThresholds(testName);
  
  // Specific intervention logic for critical lab values
  if (testName === 'Hb' && value < 7) {
    return { severity: 'critical', message: 'Transfusion likely required', protocol: 'anemia' };
  }
  if (testName === 'INR' && value > 3) {
    return { severity: 'critical', message: 'Risk of bleeding. Check Vit K/FFP', protocol: 'coagulopathy' };
  }
  if (testName === 'Lactate' && value > 4) {
    return { severity: 'critical', message: 'Severe Sepsis/Shock risk', protocol: 'resuscitation' };
  }

  if (thresholds === null) return null;
  const crossesHigh = thresholds.criticalHigh !== null && value > thresholds.criticalHigh;
  const crossesLow = thresholds.criticalLow !== null && value < thresholds.criticalLow;
  
  if (crossesHigh || crossesLow) {
    // For generic critical lab values, return a default critical intervention
    return {
      severity: 'critical',
      message: `${testName} is critically ${value > (thresholds.criticalHigh ?? value + 1) ? 'high' : 'low'}.`,
      protocol: 'general_critical_lab', // A generic protocol for other critical labs
    };
  }

  return null;
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
