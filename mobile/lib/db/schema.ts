/**
 * SQLite schema — 9 tables per SPEC §3 + book_sections table + drug table + FTS5.
 * Tables: patients, vitals, lab_results, alerts, shadow_events, settings,
 *          book_sections, book_fts, drugs, drugs_fts
 */

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

CREATE TABLE IF NOT EXISTS book_sections (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drugs (
  id TEXT PRIMARY KEY,
  generic_name TEXT NOT NULL,
  brand_names TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  route TEXT,
  strengths TEXT,
  chapter_ref TEXT,
  is_paediatric INTEGER NOT NULL DEFAULT 0
);
`;

/** FTS5 virtual table for full-text search across book content. */
export const BOOK_FTS_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS book_fts USING fts5(
  id UNINDEXED,
  chapter_title,
  title,
  content,
  tokenize='unicode61'
);
`;

/** FTS5 virtual table for drug search. */
export const DRUG_FTS_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS drugs_fts USING fts5(
  generic_name,
  brand_names,
  category,
  tokenize='unicode61'
);
`;
