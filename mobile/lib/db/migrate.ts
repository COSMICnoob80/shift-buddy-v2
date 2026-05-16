import { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_SQL, BOOK_FTS_SQL, DRUG_FTS_SQL } from './schema';

let seeded = false;

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(SCHEMA_SQL);

  // v0.5.1 — add discharge columns (may already exist from prior partial migration)
  for (const col of ['discharge_date', 'discharge_notes', 'discharge_treatment', 'discharge_followup']) {
    try {
      await db.execAsync(`ALTER TABLE patients ADD COLUMN ${col} TEXT`);
    } catch {
      // column already exists — ignore
    }
  }

  // v0.5.2 — settings table for user preferences
  try {
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    );
  } catch {
    // table already exists
  }

  // Create FTS5 virtual tables (gracefully handle missing FTS5 support)
  try {
    await db.execAsync(BOOK_FTS_SQL);
  } catch {
    // FTS5 not available — search falls back to LIKE
  }
  try {
    await db.execAsync(DRUG_FTS_SQL);
  } catch {
    // FTS5 not available — drug search falls back to LIKE
  }

  // Seed book content on first run
  if (!seeded) {
    const bookRow = await db.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM book_sections',
    );
    if (bookRow && bookRow.cnt === 0) {
      await seedBookContent(db);
    }
    const drugRow = await db.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM drugs',
    );
    if (drugRow && drugRow.cnt === 0) {
      await seedDrugFormulary(db);
    }
    seeded = true;
  }
}

async function seedBookContent(db: SQLiteDatabase): Promise<void> {
  const data = require('../../assets/doctor-on-duty-full.json');
  const { sections } = data;

  if (!sections || sections.length === 0) return;

  // Batch insert sections
  const stmt = await db.prepareAsync(
    'INSERT OR IGNORE INTO book_sections (id, chapter_id, chapter_number, chapter_title, title, content) VALUES (?, ?, ?, ?, ?, ?)',
  );

  for (const s of sections) {
    if (!s.content) continue;
    await stmt.executeAsync(s.id, s.chapterId, s.chapterNumber, s.chapterTitle, s.title, s.content);
  }

  await stmt.finalizeAsync();

  // Add AKI section if missing (needed for param-to-book mapping)
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM book_sections WHERE id = 'ch10-acute-kidney-injury-er-ward-rx'",
  );
  if (!existing) {
    const akiStmt = await db.prepareAsync(
      'INSERT OR IGNORE INTO book_sections (id, chapter_id, chapter_number, chapter_title, title, content) VALUES (?, ?, ?, ?, ?, ?)',
    );
    await akiStmt.executeAsync(
      'ch10-acute-kidney-injury-er-ward-rx',
      'ch10',
      10,
      'EMERGENCY / ACUTE MEDICINE',
      'Acute Kidney Injury (AKI) — ER & Ward Management',
      '**ASSESSMENT**\n\n**History:** Check for prerenal (vomiting/diarrhea, hemorrhage, sepsis, heart failure), renal (nephrotoxins, glomerulonephritis, rhabdomyolysis), postrenal (obstruction — prostate, stones, mass)\n\n**Examination:** Volume status (JVP, skin turgor, edema, BP), bladder fullness, urine output\n\n**Investigations:**\n- U&E (K+, Na+, Creatinine, BUN) — STAT\n- Urine R/E + microscopy (casts, RBCs, WBCs)\n- Renal ultrasound (rule out obstruction)\n- Urine output monitoring — hourly\n\n**SEVERITY (KDIGO 2023):**\n- Stage 1: Cr rise ≥0.3 mg/dL in 48h OR 1.5-1.9× baseline\n- Stage 2: Cr 2.0-2.9× baseline\n- Stage 3: Cr ≥3.0× baseline OR ≥4.0 mg/dL OR RRT initiation\n\n**MANAGEMENT**\n\n**IMMEDIATE:**\n1. Identify and treat the cause (prerenal → fluids, renal → stop toxins, postrenal → catheter)\n2. Hold nephrotoxic drugs: NSAIDs, ACEi/ARB, aminoglycosides, vancomycin, contrast\n3. Fluid challenge: 250mL NS over 1h (if not fluid-overloaded). Monitor for pulmonary edema\n\n**FOR ALL STAGES:**\n- Strict I/O charting\n- Daily U&E and creatinine\n- Renal dose adjust ALL medications (use eGFR < 30 for most renally-cleared drugs)\n- Monitor K+ closely — hyperkalemia is the most lethal complication\n\n**INDICATIONS FOR RRT (DIALYSIS):**\n- Refractory hyperkalemia (K+ > 6.5 despite medical therapy)\n- Severe metabolic acidosis (pH < 7.1)\n- Fluid overload refractory to diuretics\n- Uremic complications (pericarditis, encephalopathy)\n\n**ESCALATE:** Involve nephrology if Stage 2 or above, if K+ rising, or if urine output < 0.5 mL/kg/h for 6 hours.',
    );
    await akiStmt.finalizeAsync();
  }

  // Seed FTS if available
  try {
    const ftsRow = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM book_fts",
    );
    if (ftsRow && ftsRow.cnt === 0) {
      const ftsStmt = await db.prepareAsync(
        'INSERT INTO book_fts (id, chapter_title, title, content) VALUES (?, ?, ?, ?)',
      );
      for (const s of sections) {
        if (!s.content) continue;
        await ftsStmt.executeAsync(s.id, s.chapterTitle, s.title, s.content);
      }
      // Also index the AKI section if we added it
      if (!existing) {
        await ftsStmt.executeAsync(
          'ch10-acute-kidney-injury-er-ward-rx',
          'EMERGENCY / ACUTE MEDICINE',
          'Acute Kidney Injury (AKI) — ER & Ward Management',
          'AKI management content',
        );
      }
      await ftsStmt.finalizeAsync();
    }
  } catch {
    // FTS not available — that's fine
  }
}

async function seedDrugFormulary(db: SQLiteDatabase): Promise<void> {
  const data = require('../../assets/drug-formulary.json');
  const { drugs } = data;

  if (!drugs || drugs.length === 0) return;

  const stmt = await db.prepareAsync(
    'INSERT OR IGNORE INTO drugs (id, generic_name, brand_names, category, subcategory, route, strengths, chapter_ref, is_paediatric) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );

  for (const d of drugs) {
    await stmt.executeAsync(
      d.id,
      d.generic_name,
      d.brand_names,
      d.category,
      d.subcategory ?? null,
      d.route ?? null,
      d.strengths ?? null,
      d.chapter_ref ?? null,
      d.is_paediatric ?? 0,
    );
  }

  await stmt.finalizeAsync();

  // Seed FTS for drugs if available
  try {
    const ftsRow = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM drugs_fts",
    );
    if (ftsRow && ftsRow.cnt === 0) {
      const ftsStmt = await db.prepareAsync(
        'INSERT INTO drugs_fts (generic_name, brand_names, category) VALUES (?, ?, ?)',
      );
      for (const d of drugs) {
        await ftsStmt.executeAsync(d.generic_name, d.brand_names, d.category);
      }
      await ftsStmt.finalizeAsync();
    }
  } catch {
    // FTS not available
  }
}