import { SQLiteDatabase } from 'expo-sqlite';

export interface DrugRow {
  id: string;
  genericName: string;
  brandNames: string;
  category: string;
  subcategory: string | null;
  route: string | null;
  strengths: string | null;
  chapterRef: string | null;
  isPaediatric: number;
}

/** Get a single drug by its ID. */
export async function getDrugById(
  db: SQLiteDatabase,
  drugId: string,
): Promise<DrugRow | null> {
  const row = await db.getFirstAsync<DrugRow>(
    `SELECT id, generic_name AS genericName, brand_names AS brandNames, category, subcategory, route, strengths, chapter_ref AS chapterRef, is_paediatric AS isPaediatric
     FROM drugs WHERE id = ?`,
    [drugId],
  );
  return row ?? null;
}

/** Full-text search across generic name, brand names, and category. */
export async function searchDrugs(
  db: SQLiteDatabase,
  query: string,
): Promise<DrugRow[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // Try FTS5 first
  try {
    const ftsQuery = trimmed
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .map((w) => `"${w}"`)
      .join(' OR ');

    if (!ftsQuery) return [];

    const rows = await db.getAllAsync<DrugRow>(
      `SELECT d.id, d.generic_name AS genericName, d.brand_names AS brandNames,
              d.category, d.subcategory, d.route, d.strengths,
              d.chapter_ref AS chapterRef, d.is_paediatric AS isPaediatric
       FROM drugs d
       JOIN drugs_fts f ON d.id = f.rowid
       WHERE drugs_fts MATCH ?
       ORDER BY rank
       LIMIT 30`,
      [ftsQuery],
    );
    if (rows.length > 0) return rows;
  } catch {
    // FTS5 not available — fall through to LIKE
  }

  // LIKE fallback (searches generic_name and brand_names)
  const like = `%${trimmed}%`;
  const rows = await db.getAllAsync<DrugRow>(
    `SELECT id, generic_name AS genericName, brand_names AS brandNames,
            category, subcategory, route, strengths,
            chapter_ref AS chapterRef, is_paediatric AS isPaediatric
     FROM drugs
     WHERE generic_name LIKE ? OR brand_names LIKE ? OR category LIKE ?
     ORDER BY category ASC, generic_name ASC
     LIMIT 30`,
    [like, like, like],
  );
  return rows;
}

/** Get drugs by category. */
export async function getDrugsByCategory(
  db: SQLiteDatabase,
  category: string,
): Promise<DrugRow[]> {
  const rows = await db.getAllAsync<DrugRow>(
    `SELECT id, generic_name AS genericName, brand_names AS brandNames,
            category, subcategory, route, strengths,
            chapter_ref AS chapterRef, is_paediatric AS isPaediatric
     FROM drugs
     WHERE category = ?
     ORDER BY generic_name ASC`,
    [category],
  );
  return rows;
}

/** Get all unique drug categories. */
export async function getDrugCategories(
  db: SQLiteDatabase,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ category: string }>(
    'SELECT DISTINCT category FROM drugs ORDER BY category ASC',
  );
  return rows.map((r) => r.category);
}

/** Parse brand names JSON string into array. */
export function parseBrands(brandNames: string): string[] {
  try {
    const parsed = JSON.parse(brandNames);
    return Array.isArray(parsed) ? parsed : [brandNames];
  } catch {
    return [brandNames];
  }
}

/** Parse strengths JSON string into array. */
export function parseStrengths(strengths: string | null): string[] {
  if (!strengths) return [];
  try {
    const parsed = JSON.parse(strengths);
    return Array.isArray(parsed) ? parsed : [strengths];
  } catch {
    return [strengths];
  }
}