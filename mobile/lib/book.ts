import { SQLiteDatabase } from 'expo-sqlite';

export interface BookSection {
  id: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  title: string;
  content: string;
}

export interface SearchResult {
  id: string;
  chapterTitle: string;
  title: string;
  snippet: string;
  score: number;
}

/** Get a single section by its ID. */
export async function getBookSection(
  db: SQLiteDatabase,
  sectionId: string,
): Promise<BookSection | null> {
  const row = await db.getFirstAsync<BookSection>(
    'SELECT id, chapter_id AS chapterId, chapter_number AS chapterNumber, chapter_title AS chapterTitle, title, content FROM book_sections WHERE id = ?',
    [sectionId],
  );
  return row ?? null;
}

/** Get multiple sections by IDs. Returns in the order of the provided IDs. */
export async function getBookSections(
  db: SQLiteDatabase,
  sectionIds: string[],
): Promise<BookSection[]> {
  if (sectionIds.length === 0) return [];
  const placeholders = sectionIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<BookSection>(
    `SELECT id, chapter_id AS chapterId, chapter_number AS chapterNumber, chapter_title AS chapterTitle, title, content FROM book_sections WHERE id IN (${placeholders})`,
    ...sectionIds,
  );
  // Preserve the order of sectionIds
  const map = new Map(rows.map((r) => [r.id, r]));
  return sectionIds.map((id) => map.get(id)).filter((r): r is BookSection => r != null);
}

/** Full-text search across all book content. */
export async function searchBook(
  db: SQLiteDatabase,
  query: string,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // Try FTS5 first (faster, better relevance)
  const ftsResults = await searchFts(db, trimmed);
  if (ftsResults.length > 0) return ftsResults;

  // Fallback: LIKE search
  return searchLike(db, trimmed);
}

async function searchFts(
  db: SQLiteDatabase,
  query: string,
): Promise<SearchResult[]> {
  try {
    const ftsQuery = query
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .map((w) => `"${w}"`)
      .join(' OR ');

    if (!ftsQuery) return [];

    const rows = await db.getAllAsync<{
      id: string;
      chapter_title: string;
      title: string;
      content: string;
    }>(
      `SELECT id, chapter_title, title, content FROM book_fts WHERE book_fts MATCH ? ORDER BY rank LIMIT 30`,
      [ftsQuery],
    );

    return rows.map((r) => ({
      id: r.id,
      chapterTitle: r.chapter_title,
      title: r.title,
      snippet: snippetFromContent(r.content, query, 150),
      score: 1,
    }));
  } catch {
    return [];
  }
}

async function searchLike(
  db: SQLiteDatabase,
  query: string,
): Promise<SearchResult[]> {
  const like = `%${query}%`;
  const rows = await db.getAllAsync<BookSection>(
    `SELECT id, chapter_id AS chapterId, chapter_number AS chapterNumber, chapter_title AS chapterTitle, title, content
     FROM book_sections
     WHERE title LIKE ? OR content LIKE ?
     ORDER BY chapter_number ASC, id ASC
     LIMIT 30`,
    [like, like],
  );

  return rows.map((r) => ({
    id: r.id,
    chapterTitle: r.chapterTitle,
    title: r.title,
    snippet: snippetFromContent(r.content, query, 150),
    score: 0,
  }));
}

/** Build a concise snippet around the first occurrence of query terms. */
function snippetFromContent(content: string, query: string, maxLen: number): string {
  const lower = content.toLowerCase();
  const qLower = query.toLowerCase();

  const idx = lower.indexOf(qLower);
  if (idx === -1) {
    return content.length > maxLen ? content.slice(0, maxLen) + '…' : content;
  }

  const start = Math.max(0, idx - Math.floor(maxLen / 3));
  const end = Math.min(content.length, idx + qLower.length + Math.floor((maxLen * 2) / 3));

  let snippet = content.slice(start, end);
  if (start > 0) snippet = '…' + snippet;
  if (end < content.length) snippet = snippet + '…';

  return snippet;
}

/** List all chapters with section count. */
export async function getChapterIndex(
  db: SQLiteDatabase,
): Promise<{ chapterId: string; chapterNumber: number; chapterTitle: string; sectionCount: number }[]> {
  const rows = await db.getAllAsync<{
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    sectionCount: number;
  }>(
    `SELECT chapter_id AS chapterId, chapter_number AS chapterNumber, chapter_title AS chapterTitle, COUNT(*) AS sectionCount
     FROM book_sections
     GROUP BY chapter_id
     ORDER BY chapter_number ASC`,
  );
  return rows;
}

/** Get all sections within a chapter. */
export async function getSectionsInChapter(
  db: SQLiteDatabase,
  chapterId: string,
): Promise<BookSection[]> {
  const rows = await db.getAllAsync<BookSection>(
    `SELECT id, chapter_id AS chapterId, chapter_number AS chapterNumber, chapter_title AS chapterTitle, title, content
     FROM book_sections
     WHERE chapter_id = ?
     ORDER BY id ASC`,
    [chapterId],
  );
  return rows;
}