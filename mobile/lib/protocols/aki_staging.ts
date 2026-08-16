/**
 * AKI staging protocol — KDIGO 2023 creatinine criteria.
 * Port of api/app/protocols/aki_staging.py using synchronous SQLite query.
 * Takes a db instance with getFirstSync (expo-sqlite v16+ SQLiteDatabase).
 */

import { ProtocolResult, Recommendation } from './types';

const SOURCE = 'KDIGO 2023 AKI Clinical Practice Guidelines';

// KDIGO stage thresholds — fixed guidelines, NOT hospital-configurable
const DELTA_STAGE_1 = 0.3;
const RATIO_STAGE_1 = 1.5;
const RATIO_STAGE_2 = 2.0;
const RATIO_STAGE_3 = 3.0;
const VALUE_STAGE_3 = 4.0;
const BASELINE_WINDOW_HOURS = 48;

interface BaselineRow {
  value: number;
}

// Minimal interface — satisfied by expo-sqlite SQLiteDatabase (structural typing)
interface AkiDb {
  getFirstSync<T>(source: string, ...params: unknown[]): T | null;
}

export function evaluateAki(
  current: number,
  patientId: string,
  recordedAt: Date,
  db: AkiDb,
): ProtocolResult {
  const cutoff = new Date(recordedAt.getTime() - BASELINE_WINDOW_HOURS * 60 * 60 * 1000);

  const row = db.getFirstSync<BaselineRow>(
    `SELECT value FROM lab_results
     WHERE patient_id = ? AND test_name = 'Creatinine'
     AND recorded_at >= ? AND recorded_at < ?
     ORDER BY recorded_at ASC LIMIT 1`,
    patientId,
    cutoff.toISOString(),
    recordedAt.toISOString(),
  );

  if (row === null) {
    return { severity: 'insufficient_data', recommendations: [], escalation: null, alertGenerated: false };
  }

  const baseline = row.value;
  const delta = current - baseline;
  const ratio = baseline > 0 ? current / baseline : 0;
  const stage = _classify(current, delta, ratio);

  if (stage === 'normal') {
    return { severity: 'normal', recommendations: [], escalation: null, alertGenerated: false };
  }

  return _buildResult(stage, current, baseline, delta, ratio);
}

function _classify(current: number, delta: number, ratio: number): string {
  if (ratio >= RATIO_STAGE_3 || current >= VALUE_STAGE_3) return 'stage_3';
  if (ratio >= RATIO_STAGE_2) return 'stage_2';
  if (delta >= DELTA_STAGE_1 || ratio >= RATIO_STAGE_1) return 'stage_1';
  return 'normal';
}

function _buildResult(stage: string, current: number, baseline: number, delta: number, ratio: number): ProtocolResult {
  const detail = `Creatinine ${current.toFixed(2)} mg/dL (baseline ${baseline.toFixed(2)}, delta +${delta.toFixed(2)}, ratio ${ratio.toFixed(2)}×)`;

  if (stage === 'stage_1') {
    const recommendations: Recommendation[] = [
      { action: 'Hold nephrotoxic drugs (NSAIDs, aminoglycosides, ACEi/ARB)', priority: 1, rationale: `AKI Stage 1 — ${detail}`, source: SOURCE },
      { action: 'Fluid challenge 250ml NS over 1 hour (if not fluid-overloaded)', priority: 2, rationale: 'Optimize renal perfusion', source: SOURCE },
      { action: 'Monitor urine output hourly', priority: 3, rationale: 'Oliguria worsening may indicate progression to Stage 2/3', source: SOURCE },
      { action: 'Recheck creatinine in 12 hours', priority: 4, rationale: 'Early detection of progression', source: SOURCE },
    ];
    return { severity: 'stage_1', recommendations, escalation: null, alertGenerated: true };
  }

  if (stage === 'stage_2') {
    const recommendations: Recommendation[] = [
      { action: 'Hold nephrotoxic drugs', priority: 1, rationale: `AKI Stage 2 — ${detail}`, source: SOURCE },
      { action: 'Renal dose adjustment for ALL medications', priority: 2, rationale: 'Impaired creatinine clearance — standard dosing may be toxic', source: SOURCE },
      { action: 'Daily U&E monitoring', priority: 3, rationale: 'Track electrolyte derangement', source: SOURCE },
      { action: 'Strict intake/output charting', priority: 4, rationale: 'Fluid balance management', source: SOURCE },
      { action: 'Senior physician review', priority: 5, rationale: 'Stage 2 AKI requires specialist oversight', source: SOURCE },
    ];
    return { severity: 'stage_2', recommendations, escalation: 'Senior review required — AKI Stage 2', alertGenerated: true };
  }

  // stage_3
  const recommendations: Recommendation[] = [
    { action: 'CALL SENIOR IMMEDIATELY', priority: 1, rationale: `Life-threatening AKI Stage 3 — ${detail}`, source: SOURCE },
    { action: 'Nephrology consult', priority: 2, rationale: 'Stage 3 AKI — consider dialysis access', source: SOURCE },
    { action: 'Urgent K+, pH, bicarbonate', priority: 3, rationale: 'Hyperkalemia and metabolic acidosis common in Stage 3', source: SOURCE },
    { action: 'Hold all nephrotoxic drugs', priority: 4, rationale: 'Prevent further renal injury', source: SOURCE },
    { action: 'Consider dialysis access preparation', priority: 5, rationale: 'May require renal replacement therapy', source: SOURCE },
  ];
  return { severity: 'stage_3', recommendations, escalation: 'CALL SENIOR IMMEDIATELY + Nephrology consult — AKI Stage 3', alertGenerated: true };
}
