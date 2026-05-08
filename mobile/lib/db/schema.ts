/** SQLite schema — 5 tables per SPEC §3. */

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  bed_number TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  sex TEXT,
  rank_title TEXT,
  diagnosis TEXT NOT NULL,
  active_problems TEXT,
  current_medications TEXT,
  allergies TEXT,
  acuity TEXT NOT NULL DEFAULT 'stable',
  ward TEXT,
  status TEXT NOT NULL DEFAULT 'admitted',
  last_photo_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vitals (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  recorded_at TEXT NOT NULL,
  heart_rate INTEGER,
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  temperature REAL,
  spo2 INTEGER,
  respiratory_rate INTEGER,
  gcs INTEGER,
  blood_sugar REAL
);

CREATE TABLE IF NOT EXISTS lab_results (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  test_name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  is_critical INTEGER NOT NULL DEFAULT 0,
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  severity TEXT NOT NULL,
  parameter TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  message TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shadow_events (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  event_type TEXT NOT NULL,
  agent_recommendation TEXT,
  ho_decision TEXT,
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
