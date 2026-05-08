/** Minimal expo-sqlite mock for Jest (Node environment — no native module). */

export class SQLiteDatabase {
  getFirstSync<T>(_source: string, ..._params: unknown[]): T | null { return null; }
  execAsync(_source: string): Promise<void> { return Promise.resolve(); }
}

export function openDatabaseAsync(_name: string): Promise<SQLiteDatabase> {
  return Promise.resolve(new SQLiteDatabase());
}

export function openDatabaseSync(_name: string): SQLiteDatabase {
  return new SQLiteDatabase();
}
