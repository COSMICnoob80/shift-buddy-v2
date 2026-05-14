/**
 * Anaphylaxis protocol — deterministic management algorithm.
 * Source: Doctor On Duty 2021 (ch10-anaphylaxis-er-ward-rx)
 * Pure function: no DB calls, no side effects.
 */

import { ProtocolResult, Recommendation } from './types';

const SOURCE = 'Anaphylaxis Management (Resuscitation Council UK 2021 / Doctor On Duty 2021)';

type AirwayStatus = 'patent' | 'stridor' | 'obstructed';
type ShockPresent = boolean;

export function evaluate(
  airway: AirwayStatus,
  shock: ShockPresent,
  skinChanges: boolean,
  weightKg: number,
): ProtocolResult {
  if (!airway && !shock && !skinChanges) {
    return { severity: 'normal', recommendations: [], escalation: null, alertGenerated: false };
  }

  const isAdult = weightKg >= 40;
  const adrenalineDose = isAdult ? '0.5mg (0.5mL of 1:1000) IM' : `${(0.01 * weightKg).toFixed(2)}mg (${(0.01 * weightKg).toFixed(2)}mL of 1:1000) IM`;

  const recs: Recommendation[] = [
    { action: `Adrenaline (Epinephrine) 1:1000 IM — ${adrenalineDose} into anterolateral thigh`, priority: 1, rationale: `FIRST LINE — ${isAdult ? 'adult' : 'pediatric'} dose, IM thigh is safest`, source: SOURCE },
    { action: 'Call for help — anaphylaxis is a medical emergency', priority: 2, rationale: 'Team response required', source: SOURCE },
    { action: 'Remove trigger if still present (stop infusion, remove stinger, etc.)', priority: 3, rationale: 'Stop ongoing allergen exposure', source: SOURCE },
    { action: 'High-flow O2 via non-rebreather mask — target SpO2 > 94%', priority: 4, rationale: 'Maximize oxygenation', source: SOURCE },
    { action: 'Position: supine with legs elevated — do NOT sit up suddenly', priority: 5, rationale: 'Prevent empty vena cava syndrome / cardiac arrest', source: SOURCE },
  ];

  if (shock) {
    recs.push(
      { action: `IV fluid bolus: Normal Saline 20mL/kg (adult: 500mL-1L rapid)`, priority: recs.length + 1, rationale: 'Hypotension — volume resuscitation', source: SOURCE },
      { action: 'Repeat adrenaline IM every 5-15 min if no improvement', priority: recs.length + 2, rationale: 'Titrate to response', source: SOURCE },
    );
  }

  if (airway === 'stridor' || airway === 'obstructed') {
    recs.push(
      { action: 'Prepare for airway intervention — call anesthesia/ICU', priority: recs.length + 1, rationale: `Airway: ${airway} — risk of complete obstruction`, source: SOURCE },
      { action: 'Nebulized adrenaline 5mg (5mL of 1:1000) if stridor', priority: recs.length + 2, rationale: 'Reduce laryngeal edema', source: SOURCE },
    );
  }

  // Adjuncts after stabilization
  recs.push(
    { action: 'Hydrocortisone 200mg IV (adult) / 4mg/kg IV (child)', priority: recs.length + 1, rationale: 'Prevent biphasic reaction — takes 4-6h to act', source: SOURCE },
    { action: 'Chlorpheniramine 10mg IV (adult) / 0.2mg/kg (child)', priority: recs.length + 2, rationale: 'H1 antihistamine as adjunct', source: SOURCE },
    { action: 'Monitor for 6-8 hours minimum — risk of biphasic reaction', priority: recs.length + 3, rationale: 'Symptoms can recur after initial resolution', source: SOURCE },
  );

  const isSevere = shock || airway !== 'patent';

  return {
    severity: isSevere ? 'emergency' : 'severe',
    recommendations: recs,
    escalation: isSevere
      ? 'CALL SENIOR + Anesthesia/ICU — anaphylaxis with shock or airway compromise'
      : 'Observe for biphasic reaction — anaphylaxis with skin/soft tissue involvement only',
    alertGenerated: true,
  };
}