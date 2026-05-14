import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrate';

let _db: SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (_db !== null) return _db;
  _db = await openDatabaseAsync('shift_buddy.db');
  await runMigrations(_db);
  return _db;
}

export async function dischargePatient(id: string) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE patients SET status = ?, discharge_date = ?, updated_at = ? WHERE id = ?',
    ['discharged', new Date().toISOString(), new Date().toISOString(), id],
  );
}

export async function dischargeWithNotes(
  id: string,
  notes: string,
  treatment: string,
  followup: string,
) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE patients SET status = ?, discharge_date = ?, discharge_notes = ?,
     discharge_treatment = ?, discharge_followup = ?, updated_at = ? WHERE id = ?`,
    ['discharged', now, notes, treatment, followup, now, id],
  );
}

export interface Patient {
  id: string;
  name: string;
  bedNumber: string;
  diagnosis: string;
  acuity: string;
  alertCount: number;
  status: string;
  discharge_date?: string;
  discharge_notes?: string;
  discharge_treatment?: string;
  discharge_followup?: string;
}

// Placeholder for Patient interface - to be fully defined based on actual schema
// This will be needed when PatientCard and other components fetch patient data
export interface Patient {
  id: string;
  name: string;
  bedNumber: string;
  diagnosis: string;
  acuity: string; // Should match Acuity type from PatientCard.tsx
  alertCount: number;
  status: string; // e.g., 'active', 'discharged'
  discharge_date?: string;
}
