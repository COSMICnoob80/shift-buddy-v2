import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrate';

let _db: SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (_db !== null) return _db;
  _db = await openDatabaseAsync('shift_buddy.db');
  await runMigrations(_db);
  return _db;
}
