import { isLabCritical, isVitalCritical } from '../../lib/is_critical';

describe('isLabCritical', () => {
  describe('K+', () => {
    it('K+ 6.1 > 6.0 critical_high → truthy with message', () => {
      const result = isLabCritical('K+', 6.1);
      expect(result).toBeTruthy();
      expect(result!.severity).toBe('critical');
    });

    it('K+ 6.0 exactly (not >) → null', () => {
      expect(isLabCritical('K+', 6.0)).toBeNull();
    });

    it('K+ 5.7 (below critical threshold) → null', () => {
      expect(isLabCritical('K+', 5.7)).toBeNull();
    });

    it('K+ 5.0 → null', () => {
      expect(isLabCritical('K+', 5.0)).toBeNull();
    });

    it('K+ 2.4 < 2.5 critical_low → truthy', () => {
      expect(isLabCritical('K+', 2.4)).toBeTruthy();
    });
  });

  describe('Na+', () => {
    it('Na+ 156 → truthy (> 155 critical_high)', () => {
      expect(isLabCritical('Na+', 156)).toBeTruthy();
    });

    it('Na+ 124 → truthy (< 125 critical_low)', () => {
      expect(isLabCritical('Na+', 124)).toBeTruthy();
    });

    it('Na+ 140 → null', () => {
      expect(isLabCritical('Na+', 140)).toBeNull();
    });
  });

  it('unknown test name → null', () => {
    expect(isLabCritical('UnknownTest', 99)).toBeNull();
  });

  describe('Hb', () => {
    it('Hb < 7 → critical with transfusion message', () => {
      const result = isLabCritical('Hb', 6.5);
      expect(result).toBeTruthy();
      expect(result!.message).toContain('Transfusion');
      expect(result!.protocol).toBe('anemia');
    });
  });

  describe('INR', () => {
    it('INR > 3 → critical with bleeding message', () => {
      const result = isLabCritical('INR', 3.5);
      expect(result).toBeTruthy();
      expect(result!.message).toContain('bleeding');
      expect(result!.protocol).toBe('coagulopathy');
    });
  });

  describe('Lactate', () => {
    it('Lactate > 4 → critical with sepsis message', () => {
      const result = isLabCritical('Lactate', 5.0);
      expect(result).toBeTruthy();
      expect(result!.message).toContain('Sepsis');
      expect(result!.protocol).toBe('resuscitation');
    });
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
      expect(isVitalCritical('heart_rate', 80)).toBeNull();
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
      expect(isVitalCritical('spo2', 98)).toBeNull();
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
      expect(isVitalCritical('temperature', 37.0)).toBeNull();
    });
  });

  it('unknown parameter → null', () => {
    expect(isVitalCritical('unknown_param', 100)).toBeNull();
  });
});
