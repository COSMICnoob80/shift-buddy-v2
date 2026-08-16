import { calcGFR, calcCorrectedCalcium, calcAnionGap } from '../../lib/calculators';

describe('calcGFR (CKD-EPI 2021 race-free)', () => {
  it('healthy young female — high eGFR', () => {
    const gfr = calcGFR('female', 30, 0.8);
    expect(gfr).toBeGreaterThan(100);
  });

  it('older male with elevated creatinine — reduced eGFR', () => {
    const gfr = calcGFR('male', 65, 2.5);
    expect(gfr).toBeGreaterThan(0);
    expect(gfr).toBeLessThan(40);
  });

  it('male age 55, Cr 1.0 — eGFR ~80–100 range', () => {
    const gfr = calcGFR('male', 55, 1.0);
    expect(gfr).toBeGreaterThan(70);
    expect(gfr).toBeLessThan(120);
  });

  it('female age 40, Cr 0.7 — normal eGFR', () => {
    const gfr = calcGFR('female', 40, 0.7);
    expect(gfr).toBeGreaterThan(90);
  });

  it('male eGFR > female eGFR at same creatinine (lower muscle mass → creatinine is higher relative impairment for females)', () => {
    const female = calcGFR('female', 50, 1.2);
    const male = calcGFR('male', 50, 1.2);
    expect(male).toBeGreaterThan(female);
  });
});

describe('calcCorrectedCalcium', () => {
  it('normal albumin 4.0 — no correction', () => {
    expect(calcCorrectedCalcium(9.0, 4.0)).toBeCloseTo(9.0, 2);
  });

  it('low albumin 2.0 — adds 1.6 to calcium', () => {
    expect(calcCorrectedCalcium(8.0, 2.0)).toBeCloseTo(9.6, 2);
  });

  it('albumin 3.5 — adds 0.4', () => {
    expect(calcCorrectedCalcium(8.5, 3.5)).toBeCloseTo(8.9, 2);
  });

  it('albumin 1.5 — adds 2.0 (severe hypoalbuminaemia)', () => {
    expect(calcCorrectedCalcium(7.5, 1.5)).toBeCloseTo(9.5, 2);
  });
});

describe('calcAnionGap', () => {
  it('normal anion gap — 12', () => {
    expect(calcAnionGap(140, 104, 24)).toBe(12);
  });

  it('elevated anion gap — MUDPILES category', () => {
    expect(calcAnionGap(140, 100, 16)).toBe(24);
  });

  it('low anion gap', () => {
    expect(calcAnionGap(135, 108, 22)).toBe(5);
  });
});
