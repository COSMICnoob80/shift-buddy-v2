/**
 * Hyperkalemia protocol — deterministic tier table (AHA 2023 / KDIGO 2023).
 * Port of api/app/protocols/hyperkalemia.py — same boundary values, same logic.
 * Pure function: no DB calls, no side effects.
 */

import { ProtocolResult, Recommendation } from './types';

const SOURCE = 'AHA 2023 Hyperkalemia Guidelines';

// Fixed clinical guidelines — NOT hospital-configurable
const MODERATE_LOW = 5.5;
const SEVERE_LOW = 6.0;
const EMERGENCY_LOW = 6.5;

export function evaluate(potassium: number, ecgChanges = false): ProtocolResult {
  if (potassium >= EMERGENCY_LOW) return _emergency(potassium);
  if (potassium >= SEVERE_LOW) {
    if (ecgChanges) return _emergencyEcg(potassium);
    return _severe(potassium);
  }
  if (potassium >= MODERATE_LOW) return _moderate(potassium);
  return { severity: 'normal', recommendations: [], escalation: null, alertGenerated: false };
}

function _moderate(potassium: number): ProtocolResult {
  const recommendations: Recommendation[] = [
    { action: 'Stop potassium-sparing drugs (spironolactone, ACEi, ARB)', priority: 1, rationale: `Reduce exogenous potassium load — K+ ${potassium} mEq/L`, source: SOURCE },
    { action: 'Kayexalate (sodium polystyrene sulfonate) 15g PO', priority: 2, rationale: 'GI potassium excretion', source: SOURCE },
    { action: 'Recheck K+ in 4 hours', priority: 3, rationale: 'Monitor treatment response', source: SOURCE },
  ];
  return { severity: 'moderate', recommendations, escalation: null, alertGenerated: true };
}

function _severe(potassium: number): ProtocolResult {
  const recommendations: Recommendation[] = [
    { action: 'IV Calcium Gluconate 10% 10ml over 10 minutes', priority: 1, rationale: `Cardiac membrane stabilization — K+ ${potassium} mEq/L > 6.0`, source: SOURCE },
    { action: 'Insulin 10 units + Dextrose 25g (50ml D50) IV', priority: 2, rationale: 'Intracellular potassium shift', source: SOURCE },
    { action: 'Stop potassium-sparing drugs (spironolactone, ACEi, ARB)', priority: 3, rationale: 'Reduce ongoing potassium load', source: SOURCE },
    { action: 'Kayexalate 15g PO', priority: 4, rationale: 'GI potassium excretion', source: SOURCE },
    { action: 'ECG stat — check for peaked T waves, widened QRS', priority: 5, rationale: 'Detect cardiac toxicity', source: SOURCE },
    { action: 'Recheck K+ in 2 hours', priority: 6, rationale: 'Monitor treatment response', source: SOURCE },
  ];
  return { severity: 'severe', recommendations, escalation: null, alertGenerated: true };
}

function _emergencyEcg(potassium: number): ProtocolResult {
  const recommendations: Recommendation[] = [
    { action: 'IV Calcium Gluconate 10% 10ml over 10 minutes — STAT', priority: 1, rationale: `Cardiac membrane stabilization — K+ ${potassium} mEq/L with ECG changes`, source: SOURCE },
    { action: 'Insulin 10 units + Dextrose 25g IV', priority: 2, rationale: 'Intracellular potassium shift', source: SOURCE },
    { action: 'Continuous cardiac monitoring', priority: 3, rationale: 'ECG changes present — risk of fatal arrhythmia', source: SOURCE },
    { action: 'Cardiology consult', priority: 4, rationale: 'ECG changes with severe hyperkalemia require specialist review', source: SOURCE },
    { action: 'Consider ICU transfer', priority: 5, rationale: 'High-risk cardiac situation', source: SOURCE },
  ];
  return { severity: 'emergency_ecg', recommendations, escalation: 'Cardiology consult URGENT — ECG changes with K+ 6.0–6.4 mEq/L', alertGenerated: true };
}

function _emergency(potassium: number): ProtocolResult {
  const recommendations: Recommendation[] = [
    { action: 'IV Calcium Gluconate 10% 10ml over 10 minutes — STAT', priority: 1, rationale: `Cardiac membrane stabilization — K+ ${potassium} mEq/L ≥ 6.5`, source: SOURCE },
    { action: 'Insulin 10 units + Dextrose 25g IV', priority: 2, rationale: 'Intracellular potassium shift', source: SOURCE },
    { action: 'Nebulized salbutamol 10mg', priority: 3, rationale: 'Additional intracellular potassium shift', source: SOURCE },
    { action: 'ICU transfer', priority: 4, rationale: 'Life-threatening hyperkalemia requires intensive monitoring', source: SOURCE },
    { action: 'Consider dialysis — nephrology consult', priority: 5, rationale: 'Definitive potassium removal for refractory cases', source: SOURCE },
  ];
  return { severity: 'emergency', recommendations, escalation: 'CALL SENIOR IMMEDIATELY — K+ ≥ 6.5 mEq/L, ICU transfer required', alertGenerated: true };
}
