import { isLabCritical, isVitalCritical } from '../../lib/is_critical';

describe('isLabCritical', () => {
  describe('K+', () => {
    it('K+ 6.1 > 6.0 critical_high → true', () => {
      expect(isLabCritical('K+', 6.1)).toBe(true);
    });

    it('K+ 6.0 exactly (not >) → false', () => {
      expect(isLabCritical('K+', 6.0)).toBe(false);
    });

    it('K+ 5.7 (below critical threshold) → false', () => {
      expect(isLabCritical('K+', 5.7)).toBe(false);
    });

    it('K+ 5.0 → false', () => {
      expect(isLabCritical('K+', 5.0)).toBe(false);
    });

    it('K+ 2.4 < 2.5 critical_low → true', () => {
      expect(isLabCritical('K+', 2.4)).toBe(true);
    });
  });

  describe('Na+', () => {
    it('Na+ 156 → true (> 155 critical_high)', () => {
      expect(isLabCritical('Na+', 156)).toBe(true);
    });

    it('Na+ 124 → true (< 125 critical_low)', () => {
      expect(isLabCritical('Na+', 124)).toBe(true);
    });

    it('Na+ 140 → false', () => {
      expect(isLabCritical('Na+', 140)).toBe(false);
    });
  });

  it('unknown test name → false', () => {
    expect(isLabCritical('UnknownTest', 99)).toBe(false);
  });
});

describe('isVitalCritical', () => {
  describe('heart_rate', () => {
    it('HR 135 > 130 crit_high → critical', () => {
      expect(isVitalCritical('heart_rate', 135)).toBe('critical');
    });

    it('HR 115 > 110 warn_high → warning', () => {
      expect(isVitalCritical('heart_rate', 115)).toBe('warning');
    });

    it('HR 80 → null', () => {
      expect(isVitalCritical('heart_rate', 80)).toBe(null);
    });

    it('HR 38 < 40 crit_low → critical', () => {
      expect(isVitalCritical('heart_rate', 38)).toBe('critical');
    });

    it('HR 45 < 50 warn_low → warning', () => {
      expect(isVitalCritical('heart_rate', 45)).toBe('warning');
    });
  });

  describe('spo2', () => {
    it('SpO2 88 < 90 crit_low → critical', () => {
      expect(isVitalCritical('spo2', 88)).toBe('critical');
    });

    it('SpO2 92 < 94 warn_low → warning', () => {
      expect(isVitalCritical('spo2', 92)).toBe('warning');
    });

    it('SpO2 98 → null', () => {
      expect(isVitalCritical('spo2', 98)).toBe(null);
    });
  });

  describe('temperature', () => {
    it('Temp 40.0 > 39.5 crit_high → critical', () => {
      expect(isVitalCritical('temperature', 40.0)).toBe('critical');
    });

    it('Temp 38.5 > 38.0 warn_high → warning', () => {
      expect(isVitalCritical('temperature', 38.5)).toBe('warning');
    });

    it('Temp 34.5 < 35.0 crit_low → critical', () => {
      expect(isVitalCritical('temperature', 34.5)).toBe('critical');
    });

    it('Temp 37.0 → null', () => {
      expect(isVitalCritical('temperature', 37.0)).toBe(null);
    });
  });

  it('unknown parameter → null', () => {
    expect(isVitalCritical('unknown_param', 100)).toBe(null);
  });
});
