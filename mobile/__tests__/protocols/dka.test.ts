import { evaluate } from '../../lib/protocols/dka';

describe('dka.evaluate', () => {
  it('pH 7.28, HCO3 16 → mild', () => {
    const result = evaluate(300, 7.28, 16, 'alert');
    expect(result.severity).toBe('mild');
    expect(result.alertGenerated).toBe(true);
    expect(result.escalation).toBeNull();
  });

  it('pH 7.10, HCO3 12 → moderate', () => {
    const result = evaluate(350, 7.10, 12, 'alert');
    expect(result.severity).toBe('moderate');
    expect(result.alertGenerated).toBe(true);
  });

  it('pH 6.95, HCO3 8 → severe, escalation includes "CALL SENIOR STAT"', () => {
    const result = evaluate(500, 6.95, 8, 'alert');
    expect(result.severity).toBe('severe');
    expect(result.escalation).toMatch(/CALL SENIOR STAT/);
    expect(result.alertGenerated).toBe(true);
  });

  it('pH 6.95, HCO3 8, mentalStatus obtunded → severe + airway recommendation', () => {
    const result = evaluate(500, 6.95, 8, 'obtunded');
    expect(result.severity).toBe('severe');
    const hasAirway = result.recommendations.some(r => r.action.toLowerCase().includes('airway'));
    expect(hasAirway).toBe(true);
  });

  it('normal pH and HCO3 → normal', () => {
    const result = evaluate(200, 7.40, 22, 'alert');
    expect(result.severity).toBe('normal');
    expect(result.alertGenerated).toBe(false);
  });

  // Boundary: pH 7.00 uses strict < in source — 7.00 is NOT severe (boundary is exclusive)
  it('pH 7.00 exactly → moderate (strict < boundary)', () => {
    const result = evaluate(400, 7.00, 18, 'alert');
    expect(result.severity).toBe('moderate');
  });

  it('pH 6.99 → severe (strict < 7.00)', () => {
    const result = evaluate(400, 6.99, 18, 'alert');
    expect(result.severity).toBe('severe');
  });

  // pH 7.01 is just above severe_ph_max, check HCO3
  it('pH 7.01, HCO3 18 → moderate', () => {
    const result = evaluate(300, 7.01, 18, 'alert');
    expect(result.severity).toBe('moderate');
  });

  // HCO3 < 10 triggers severe regardless of pH
  it('pH 7.15, HCO3 9 → severe (HCO3 criterion)', () => {
    const result = evaluate(400, 7.15, 9, 'alert');
    expect(result.severity).toBe('severe');
  });
});
