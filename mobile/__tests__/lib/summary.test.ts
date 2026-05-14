import { generateSummary } from '../../lib/summary';

describe('generateSummary', () => {
  function mockDb(overrides: {
    patient?: Record<string, unknown> | null;
    vitals?: Record<string, unknown> | null;
    labs?: Record<string, unknown>[];
    alerts?: Record<string, unknown>[];
  } = {}) {
    return {
      getFirstAsync: jest.fn((sql: string, _params: unknown[]) => {
        if (sql.includes('vitals')) return Promise.resolve(overrides.vitals != null ? { ...overrides.vitals } : null) as never;
        return Promise.resolve(overrides.patient != null ? { ...overrides.patient } : null) as never;
      }),
      getAllAsync: jest.fn((sql: string, _params?: unknown[]) => {
        if (sql.includes('lab_results')) return Promise.resolve(overrides.labs ?? []) as never;
        if (sql.includes('alerts')) return Promise.resolve(overrides.alerts ?? []) as never;
        return Promise.resolve([] as never);
      }),
    };
  }

  it('generates summary for patient with full data', async () => {
    const db = mockDb({
      patient: {
        name: 'Ahmed Khan',
        bed_number: '5A',
        diagnosis: 'DKA',
        current_medications: 'Insulin, NS',
      },
      vitals: {
        heart_rate: 92,
        systolic_bp: 118,
        diastolic_bp: 76,
        spo2: 97,
        temperature: 37.1,
        respiratory_rate: 16,
      },
      labs: [
        { test_name: 'K+', value: 4.2, unit: 'mEq/L' },
        { test_name: 'Na+', value: 138, unit: 'mEq/L' },
        { test_name: 'Creatinine', value: 1.1, unit: 'mg/dL' },
        { test_name: 'Hemoglobin', value: 12.5, unit: 'g/dL' },
      ],
      alerts: [
        { message: 'DKA moderate severity', acknowledged: 0 },
      ],
    });

    const summary = await generateSummary('p1', db as never);

    expect(summary).toContain('*Ahmed Khan*');
    expect(summary).toContain('Bed 5A');
    expect(summary).toContain('*Dx:* DKA');
    expect(summary).toContain('HR 92');
    expect(summary).toContain('K+ 4.2');
    expect(summary).toContain('DKA moderate severity');
    expect(summary).toContain('Sent via Doctor On Duty 2021');
  });

  it('handles patient with no vitals or labs', async () => {
    const db = mockDb({
      patient: { name: 'B', bed_number: '1', diagnosis: 'Unknown' },
      vitals: null,
      labs: [],
      alerts: [],
    });

    const summary = await generateSummary('p2', db as never);

    expect(summary).toContain('*B*');
    expect(summary).toContain('*Labs:* —');
    expect(summary).toContain('*⚠ Alert:* None');
  });

  it('handles vitals with null fields', async () => {
    const db = mockDb({
      patient: { name: 'C', bed_number: '2', diagnosis: 'Headache' },
      vitals: {
        heart_rate: 72,
        systolic_bp: null,
        diastolic_bp: null,
        spo2: 98,
        temperature: null,
        respiratory_rate: null,
      },
      labs: [],
      alerts: [],
    });

    const summary = await generateSummary('p3', db as never);

    expect(summary).toContain('HR 72');
    expect(summary).toContain('BP —/—');
    expect(summary).toContain('Temp —°C');
  });

  it('returns error for missing patient', async () => {
    const db = mockDb({ patient: null });

    const summary = await generateSummary('bad', db as never);
    expect(summary).toBe('Patient not found.');
  });

  it('includes only first result per lab test (deduplication)', async () => {
    const db = mockDb({
      patient: { name: 'D', bed_number: '3', diagnosis: 'AKI' },
      vitals: null,
      labs: [
        { test_name: 'K+', value: 5.8, unit: 'mEq/L' },
        { test_name: 'K+', value: 5.2, unit: 'mEq/L' },
        { test_name: 'Creatinine', value: 3.2, unit: 'mg/dL' },
        { test_name: 'Creatinine', value: 2.8, unit: 'mg/dL' },
      ],
      alerts: [],
    });

    const summary = await generateSummary('p4', db as never);

    expect(summary).toContain('K+ 5.8');
    expect(summary).toContain('Creatinine 3.2');
    expect(summary).not.toContain('K+ 5.2');
    expect(summary).not.toContain('Creatinine 2.8');
  });

  it('omits labs not in the standard set', async () => {
    const db = mockDb({
      patient: { name: 'E', bed_number: '4', diagnosis: 'Sepsis' },
      vitals: null,
      labs: [
        { test_name: 'Lactate', value: 4.5, unit: 'mmol/L' },
        { test_name: 'INR', value: 2.1, unit: '' },
        { test_name: 'Troponin', value: 0.12, unit: 'ng/mL' },
      ],
      alerts: [],
    });

    const summary = await generateSummary('p5', db as never);

    expect(summary).toContain('*Labs:* —');
  });

  it('handles patient with medications null', async () => {
    const db = mockDb({
      patient: { name: 'F', bed_number: '6', diagnosis: 'Fracture', current_medications: null },
      vitals: null,
      labs: [],
      alerts: [],
    });

    const summary = await generateSummary('p6', db as never);
    expect(summary).toContain('*F*');
  });
});
