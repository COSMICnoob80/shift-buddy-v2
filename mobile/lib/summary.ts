/**
 * T021 — Patient summary text generator (stub; full implementation in Day 5).
 * Format: WhatsApp-ready text with bold via *asterisks*.
 */

import { SQLiteDatabase } from 'expo-sqlite';

interface PatientRow {
  name: string; bed_number: string; diagnosis: string; current_medications: string | null;
}
interface LatestVitals {
  heart_rate: number | null; systolic_bp: number | null; diastolic_bp: number | null;
  spo2: number | null; temperature: number | null; respiratory_rate: number | null;
}
interface LabRow { test_name: string; value: number; unit: string }
interface AlertRow { message: string }

export async function generateSummary(patientId: string, db: SQLiteDatabase): Promise<string> {
  const patient = await db.getFirstAsync<PatientRow>('SELECT * FROM patients WHERE id = ?', [patientId]);
  if (!patient) return 'Patient not found.';

  const vitals = await db.getFirstAsync<LatestVitals>(
    'SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1',
    [patientId],
  );

  const labMap = new Map<string, LabRow>();
  const allLabs = await db.getAllAsync<LabRow>(
    'SELECT test_name, value, unit FROM lab_results WHERE patient_id = ? ORDER BY recorded_at DESC',
    [patientId],
  );
  for (const lab of allLabs) {
    if (!labMap.has(lab.test_name)) labMap.set(lab.test_name, lab);
  }

  const activeAlerts = await db.getAllAsync<AlertRow>(
    'SELECT message FROM alerts WHERE patient_id = ? AND acknowledged = 0 ORDER BY created_at DESC',
    [patientId],
  );

  const v = vitals;
  const vitalsLine = v
    ? `HR ${v.heart_rate ?? '—'} | BP ${v.systolic_bp ?? '—'}/${v.diastolic_bp ?? '—'} | SpO₂ ${v.spo2 ?? '—'}% | Temp ${v.temperature ?? '—'}°C | RR ${v.respiratory_rate ?? '—'}`
    : '—';

  const labParts = ['K+', 'Na+', 'Creatinine', 'Hemoglobin']
    .map((name) => {
      const lab = labMap.get(name);
      return lab ? `${name} ${lab.value}` : null;
    })
    .filter(Boolean)
    .join(' | ');

  const alertText = activeAlerts.length > 0
    ? activeAlerts.map((a) => a.message).join('; ')
    : 'None';

  return [
    `*${patient.name}* — Bed ${patient.bed_number}`,
    `*Dx:* ${patient.diagnosis}`,
    `*Vitals:* ${vitalsLine}`,
    `*Labs:* ${labParts || '—'}`,
    `*⚠ Alert:* ${alertText}`,
    `— Sent via Shift Buddy`,
  ].join('\n');
}
