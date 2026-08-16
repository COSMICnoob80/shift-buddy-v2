import { evaluateAki } from '../../lib/protocols/aki_staging';

const PATIENT_ID = 'test-patient-001';
const RECORDED_AT = new Date('2026-01-01T12:00:00.000Z');

function makeDb(baselineValue: number | null) {
  return {
    getFirstSync: jest.fn().mockReturnValue(
      baselineValue !== null ? { value: baselineValue } : null
    ),
  };
}

describe('aki_staging.evaluateAki', () => {
  it('no baseline → insufficient_data', () => {
    const db = makeDb(null);
    const result = evaluateAki(1.4, PATIENT_ID, RECORDED_AT, db);
    expect(result.severity).toBe('insufficient_data');
    expect(result.alertGenerated).toBe(false);
  });

  it('Cr 1.0 → 1.2 (delta 0.2) → normal', () => {
    const db = makeDb(1.0);
    const result = evaluateAki(1.2, PATIENT_ID, RECORDED_AT, db);
    expect(result.severity).toBe('normal');
    expect(result.alertGenerated).toBe(false);
  });

  it('Cr 1.0 → 1.4 (delta 0.4 ≥ 0.3) → stage_1', () => {
    const db = makeDb(1.0);
    const result = evaluateAki(1.4, PATIENT_ID, RECORDED_AT, db);
    expect(result.severity).toBe('stage_1');
    expect(result.alertGenerated).toBe(true);
  });

  it('Cr 1.0 → 2.5 (ratio 2.5 ≥ 2.0) → stage_2', () => {
    const db = makeDb(1.0);
    const result = evaluateAki(2.5, PATIENT_ID, RECORDED_AT, db);
    expect(result.severity).toBe('stage_2');
    expect(result.escalation).toMatch(/Senior review/);
  });

  it('Cr 1.0 → 4.2 (value ≥ 4.0) → stage_3 with escalation', () => {
    const db = makeDb(1.0);
    const result = evaluateAki(4.2, PATIENT_ID, RECORDED_AT, db);
    expect(result.severity).toBe('stage_3');
    expect(result.escalation).toMatch(/CALL SENIOR IMMEDIATELY/);
    expect(result.alertGenerated).toBe(true);
  });

  it('calls getFirstSync with correct 48h window params', () => {
    const db = makeDb(1.0);
    evaluateAki(1.5, PATIENT_ID, RECORDED_AT, db);
    expect(db.getFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('lab_results'),
      PATIENT_ID,
      expect.stringContaining('2025-12-30'), // 48h before 2026-01-01T12:00
      RECORDED_AT.toISOString(),
    );
  });

  // Boundary: ratio exactly 3.0 → stage_3
  it('Cr 1.0 → 3.0 (ratio exactly 3.0) → stage_3', () => {
    const db = makeDb(1.0);
    const result = evaluateAki(3.0, PATIENT_ID, RECORDED_AT, db);
    expect(result.severity).toBe('stage_3');
  });
});
