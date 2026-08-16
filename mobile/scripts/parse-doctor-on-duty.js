const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', '..', 'references', 'Doctor on Duty 2021.md');
const OUTPUT = path.join(__dirname, '..', 'assets', 'doctor-on-duty-full.json');

const lines = fs.readFileSync(INPUT, 'utf-8').split('\n');

const CHAPTER_RE = /^## CHAPTER (\d+): (.+)$/i;
const SECTION_RE = /^### (.+)$/;

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

// First pass: split into raw chapters (start line → end line)
const chapters = [];
let current = null;

for (let i = 0; i < lines.length; i++) {
  const m = lines[i].trim().match(CHAPTER_RE);
  if (m) {
    if (current) chapters.push(current);
    current = { number: parseInt(m[1], 10), title: m[2].trim(), start: i };
  }
}
if (current) chapters.push(current);

// For each chapter, extract sections
const result = [];

for (const ch of chapters) {
  // Find end of this chapter (next chapter or EOF)
  const chIdx = chapters.indexOf(ch);
  const endLine = chIdx < chapters.length - 1 ? chapters[chIdx + 1].start : lines.length;
  const chLines = lines.slice(ch.start, endLine);

  const chId = `ch${ch.number}`;
  const chapterData = { id: chId, number: ch.number, title: ch.title, sections: [] };

  // Find all ### headings in this chapter
  const sectionIndices = [];
  for (let i = 0; i < chLines.length; i++) {
    if (SECTION_RE.test(chLines[i].trim())) {
      sectionIndices.push(i);
    }
  }

  if (sectionIndices.length === 0) {
    // No ### headings → whole chapter is one section
    const body = chLines.filter((_, i) => i > 0).join('\n').trim();
    if (body) {
      chapterData.sections.push({ id: slug(chId), title: ch.title, content: body });
    }
  } else {
    // Content before first heading
    const introLines = chLines.slice(1, sectionIndices[0]).join('\n').trim();
    if (introLines) {
      chapterData.sections.push({ id: slug(chId + '-overview'), title: 'Overview', content: introLines });
    }
    // Content between headings
    for (let si = 0; si < sectionIndices.length; si++) {
      const secLine = chLines[sectionIndices[si]];
      const secTitle = secLine.trim().match(SECTION_RE)[1].trim();
      const secStart = sectionIndices[si] + 1;
      const secEnd = si + 1 < sectionIndices.length ? sectionIndices[si + 1] : chLines.length;
      const secBody = chLines.slice(secStart, secEnd).join('\n').trim();
      if (secTitle && secBody) {
        chapterData.sections.push({ id: slug(chId + '-' + secTitle), title: secTitle, content: secBody });
      }
    }
  }

  result.push(chapterData);
}

const allSections = result.flatMap((ch) =>
  ch.sections.map((s) => ({
    id: s.id,
    chapterId: ch.id,
    chapterTitle: ch.title,
    chapterNumber: ch.number,
    title: s.title,
    content: s.content,
  }))
);

fs.writeFileSync(OUTPUT, JSON.stringify({ meta: { title: 'DOCTOR ON DUTY TREATMENT GUIDE', author: 'Dr. Asif Ali Khan', year: 2021 }, chapters: result, sections: allSections }, null, 2));
console.log(`✓ ${result.length} chapters, ${allSections.length} sections`);