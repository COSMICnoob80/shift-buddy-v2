/**
 * Hypoglycemia protocol — deterministic severity tiers.
 * Source: Doctor On Duty 2021 (ch10-hypoglycemia-er-ward-rx)
 * Pure function: no DB calls, no side effects.
 */

import { ProtocolResult, Recommendation } from './types';

const SOURCE = 'Hypoglycemia Management (Doctor On Duty 2021 / ADA)';

const HYPOGLYCEMIA_THRESHOLD = 70;

export function evaluate(bloodSugar: number, conscious: boolean): ProtocolResult {
  if (bloodSugar >= HYPOGLYCEMIA_THRESHOLD) {
    return { severity: 'normal', recommendations: [], escalation: null, alertGenerated: false };
  }
  if (!conscious) return _unconscious(bloodSugar);
  return _conscious(bloodSugar);
}

function _conscious(bloodSugar: number): ProtocolResult {
  const recommendations: Recommendation[] = [
    { action: 'Give oral glucose 15-20g (3 tbsp sugar in water, or 175ml fruit juice, or 3-4 glucose tabs)', priority: 1, rationale: `BSR ${bloodSugar} mg/dL — conscious, can swallow`, source: SOURCE },
    { action: 'Recheck BSR in 15 minutes', priority: 2, rationale: 'Confirm response to oral glucose', source: SOURCE },
    { action: 'If BSR still < 70 mg/dL after 15 min, repeat oral glucose', priority: 3, rationale: 'Inadequate initial response', source: SOURCE },
    { action: 'Once BSR ≥ 70 mg/dL, give complex carbohydrate (sandwich, biscuits, or next meal)', priority: 4, rationale: 'Prevent recurrence', source: SOURCE },
    { action: 'Identify and treat underlying cause (missed meal, excess insulin, sulfonylurea overdose)', priority: 5, rationale: 'Prevent recurrence', source: SOURCE },
  ];
  return { severity: 'mild', recommendations, escalation: null, alertGenerated: true };
}

function _unconscious(bloodSugar: number): ProtocolResult {
  const recommendations: Recommendation[] = [
    { action: 'IV D50% (Dextrose 50%) 25ml (12.5g) bolus over 1-3 minutes', priority: 1, rationale: `Unconscious — BSR ${bloodSugar} mg/dL, rapid IV dextrose`, source: SOURCE },
    { action: 'If no IV access: IM Glucagon 1mg (adult) / 0.5mg (child <25kg)', priority: 2, rationale: 'Alternative when IV access unavailable', source: SOURCE },
    { action: 'Recheck BSR every 15 minutes until consciousness returns', priority: 3, rationale: 'Monitor response', source: SOURCE },
    { action: 'Once conscious, transition to oral glucose + complex carbohydrate', priority: 4, rationale: 'Maintain stable blood sugar', source: SOURCE },
    { action: 'If no IV access obtained and no response to IM glucagon after 10 min, call senior for central line or intraosseous access', priority: 5, rationale: 'Refractory hypoglycemia requires definitive access', source: SOURCE },
  ];
  return {
    severity: 'emergency',
    recommendations,
    escalation: 'CALL SENIOR IMMEDIATELY — unconscious patient with hypoglycemia (BSR < 70 mg/dL) requiring IV dextrose',
    alertGenerated: true,
  };
}