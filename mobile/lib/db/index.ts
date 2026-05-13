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
  await db.runAsync('UPDATE patients SET status = ?, discharge_date = ? WHERE id = ?', ['discharged', new Date().toISOString(), id]);
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
