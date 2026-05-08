import { evaluate } from '../../lib/protocols/hyperkalemia';

describe('hyperkalemia.evaluate', () => {
  it('K+ 5.4 → normal, no recommendations', () => {
    const result = evaluate(5.4);
    expect(result.severity).toBe('normal');
    expect(result.recommendations).toHaveLength(0);
    expect(result.alertGenerated).toBe(false);
  });

  it('K+ 5.6 → moderate, alert generated', () => {
    const result = evaluate(5.6);
    expect(result.severity).toBe('moderate');
    expect(result.alertGenerated).toBe(true);
  });

  it('K+ 6.0, no ECG changes → severe', () => {
    const result = evaluate(6.0, false);
    expect(result.severity).toBe('severe');
    expect(result.alertGenerated).toBe(true);
    expect(result.escalation).toBeNull();
  });

  it('K+ 6.0, ECG changes → emergency_ecg', () => {
    const result = evaluate(6.0, true);
    expect(result.severity).toBe('emergency_ecg');
    expect(result.escalation).toMatch(/Cardiology consult/);
  });

  it('K+ 6.7 → emergency, escalation includes "CALL SENIOR"', () => {
    const result = evaluate(6.7);
    expect(result.severity).toBe('emergency');
    expect(result.escalation).toMatch(/CALL SENIOR/);
    expect(result.alertGenerated).toBe(true);
  });

  // Boundary: 5.5 is the first moderate threshold
  it('K+ 5.5 exactly → moderate', () => {
    expect(evaluate(5.5).severity).toBe('moderate');
  });

  // Boundary: just below moderate
  it('K+ 5.49 → normal', () => {
    expect(evaluate(5.49).severity).toBe('normal');
  });

  // Boundary: 6.5 is emergency
  it('K+ 6.5 exactly → emergency', () => {
    expect(evaluate(6.5).severity).toBe('emergency');
  });
});
