import { CLINICAL_CONFIG, getLabThresholds, getVitalThresholds } from '../../lib/clinical_config';

describe('CLINICAL_CONFIG', () => {
  it('lab K+ critical high is 6.0', () => {
    expect(CLINICAL_CONFIG.lab_k_critical_high).toBe(6.0);
  });

  it('lab K+ critical low is 2.5', () => {
    expect(CLINICAL_CONFIG.lab_k_critical_low).toBe(2.5);
  });

  it('lab Na+ critical high is 155', () => {
    expect(CLINICAL_CONFIG.lab_na_critical_high).toBe(155.0);
  });

  it('lab Na+ critical low is 125', () => {
    expect(CLINICAL_CONFIG.lab_na_critical_low).toBe(125.0);
  });

  it('lab Hb critical low is 7.0', () => {
    expect(CLINICAL_CONFIG.lab_hb_critical_low).toBe(7.0);
  });

  it('lab Plt critical low is 50', () => {
    expect(CLINICAL_CONFIG.lab_plt_critical_low).toBe(50.0);
  });

  it('lab INR critical high is 3.0', () => {
    expect(CLINICAL_CONFIG.lab_inr_critical_high).toBe(3.0);
  });

  it('lab Lactate critical high is 4.0', () => {
    expect(CLINICAL_CONFIG.lab_lactate_critical_high).toBe(4.0);
  });

  it('vital HR critical high is 130', () => {
    expect(CLINICAL_CONFIG.vital_hr_crit_high).toBe(130.0);
  });

  it('vital SpO2 critical low is 90', () => {
    expect(CLINICAL_CONFIG.vital_spo2_crit_low).toBe(90.0);
  });

  it('vital temperature critical low is 35', () => {
    expect(CLINICAL_CONFIG.vital_temp_crit_low).toBe(35.0);
  });
});

describe('getLabThresholds', () => {
  it('returns K+ thresholds', () => {
    const t = getLabThresholds('K+');
    expect(t).not.toBeNull();
    expect(t!.criticalHigh).toBe(6.0);
    expect(t!.criticalLow).toBe(2.5);
  });

  it('returns null for unknown test', () => {
    expect(getLabThresholds('Bogus')).toBeNull();
  });

  it('Hemoglobin has no criticalHigh', () => {
    const t = getLabThresholds('Hemoglobin');
    expect(t!.criticalHigh).toBeNull();
    expect(t!.criticalLow).toBe(7.0);
  });

  it('INR has no criticalLow', () => {
    const t = getLabThresholds('INR');
    expect(t!.criticalHigh).toBe(3.0);
    expect(t!.criticalLow).toBeNull();
  });
});

describe('getVitalThresholds', () => {
  it('returns heart_rate thresholds', () => {
    const t = getVitalThresholds('heart_rate');
    expect(t).not.toBeNull();
    expect(t!.critHigh).toBe(130.0);
    expect(t!.critLow).toBe(40.0);
  });

  it('returns null for unknown param', () => {
    expect(getVitalThresholds('unknown')).toBeNull();
  });

  it('spo2 has no critHigh', () => {
    const t = getVitalThresholds('spo2');
    expect(t!.critHigh).toBeNull();
    expect(t!.critLow).toBe(90.0);
  });
});
