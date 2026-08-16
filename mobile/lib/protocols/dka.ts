/**
 * DKA protocol — deterministic severity tiers (ADA 2024 / WHO).
 * Port of api/app/protocols/dka.py — same boundary values, same logic.
 * Pure function: no DB calls, no side effects.
 */

import { ProtocolResult, Recommendation } from './types';

const SOURCE = 'DKA Management Guidelines (ADA 2024 / WHO)';

// Fixed clinical severity thresholds — NOT hospital-configurable
const SEVERE_PH_MAX = 7.00;
const SEVERE_HCO3_MAX = 10.0;
const MODERATE_PH_MAX = 7.25;
const MODERATE_HCO3_MAX = 15.0;
const MILD_PH_MAX = 7.31;

export function evaluate(
  bloodSugar: number,
  ph: number,
  hco3: number,
  mentalStatus: string,
): ProtocolResult {
  const severity = _classify(ph, hco3);
  if (severity === 'normal') return { severity: 'normal', recommendations: [], escalation: null, alertGenerated: false };
  if (severity === 'severe') return _severe(bloodSugar, ph, hco3, mentalStatus);
  if (severity === 'moderate') return _moderate(bloodSugar, ph, hco3);
  return _mild(bloodSugar, ph, hco3);
}

function _classify(ph: number, hco3: number): string {
  if (ph < SEVERE_PH_MAX || hco3 < SEVERE_HCO3_MAX) return 'severe';
  if (ph < MODERATE_PH_MAX || hco3 < MODERATE_HCO3_MAX) return 'moderate';
  if (ph < MILD_PH_MAX) return 'mild';
  return 'normal';
}

function _commonInitialRecs(): Recommendation[] {
  return [
    { action: 'ABG STAT (pH, HCO3, pCO2)', priority: 1, rationale: 'Confirm diagnosis and severity classification', source: SOURCE },
    { action: 'BMP STAT (K+, Na+, Cl-, BUN, Creatinine)', priority: 2, rationale: 'Electrolyte status critical — K+ may drop rapidly with insulin', source: SOURCE },
    { action: 'Blood sugar (lab, not glucometer — for accuracy)', priority: 3, rationale: 'Glucometer values unreliable in extreme hyperglycemia', source: SOURCE },
    { action: 'Urine ketones or serum beta-hydroxybutyrate', priority: 4, rationale: 'Confirm ketosis', source: SOURCE },
    { action: 'NS 1L bolus over 1 hour (unless heart failure)', priority: 5, rationale: 'Initial volume resuscitation', source: SOURCE },
  ];
}

function _mild(bloodSugar: number, ph: number, hco3: number): ProtocolResult {
  const recs = _commonInitialRecs();
  recs.push(
    { action: 'Insulin infusion 0.1 units/kg/hr after potassium ≥ 3.5 mEq/L confirmed', priority: 6, rationale: `Mild DKA (pH ${ph.toFixed(2)}, HCO3 ${hco3.toFixed(1)}) — ward management`, source: SOURCE },
    { action: 'Hourly blood glucose monitoring', priority: 7, rationale: 'Titrate insulin to glucose reduction 50–75 mg/dL/hr', source: SOURCE },
  );
  return { severity: 'mild', recommendations: recs, escalation: null, alertGenerated: true };
}

function _moderate(bloodSugar: number, ph: number, hco3: number): ProtocolResult {
  const recs = _commonInitialRecs();
  recs.push(
    { action: 'Insulin infusion 0.1 units/kg/hr — check K+ first', priority: 6, rationale: `Moderate DKA (pH ${ph.toFixed(2)}, HCO3 ${hco3.toFixed(1)})`, source: SOURCE },
    { action: 'Step-down unit if available, frequent nursing checks', priority: 7, rationale: 'Moderate DKA — needs closer monitoring than standard ward', source: SOURCE },
    { action: 'Potassium replacement per sliding scale (K+ < 3.5 → hold insulin)', priority: 8, rationale: 'Insulin drives K+ into cells — prevent life-threatening hypokalemia', source: SOURCE },
  );
  return { severity: 'moderate', recommendations: recs, escalation: null, alertGenerated: true };
}

function _severe(bloodSugar: number, ph: number, hco3: number, mentalStatus: string): ProtocolResult {
  const recs = _commonInitialRecs();
  recs.push(
    { action: 'ICU admission — continuous cardiac monitoring', priority: 6, rationale: `Severe DKA (pH ${ph.toFixed(2)}, HCO3 ${hco3.toFixed(1)}) — life-threatening`, source: SOURCE },
    { action: 'Insulin infusion 0.1 units/kg/hr after K+ ≥ 3.5 confirmed', priority: 7, rationale: 'Do NOT start insulin until potassium repleted', source: SOURCE },
    { action: 'Potassium aggressive replacement (K+ replacement mandatory)', priority: 8, rationale: 'Severe metabolic acidosis — electrolyte derangement expected', source: SOURCE },
    { action: 'Consider bicarbonate therapy only if pH < 6.9', priority: 9, rationale: 'Routine bicarbonate not recommended above pH 6.9 per ADA guidelines', source: SOURCE },
  );
  if (mentalStatus === 'obtunded') {
    recs.push({ action: 'Secure airway — consider intubation if GCS declining', priority: 10, rationale: `Mental status: ${mentalStatus} — airway at risk`, source: SOURCE });
  }
  return { severity: 'severe', recommendations: recs, escalation: 'CALL SENIOR STAT + ICU transfer — severe DKA (pH < 7.00 or HCO3 < 10)', alertGenerated: true };
}
