const fs = require('fs');
const path = require('path');

// Read the param-to-book source to extract all section IDs
const src = fs.readFileSync(
  path.join(__dirname, '..', 'lib', 'param-to-book.ts'),
  'utf-8',
);

const idRegex = /sectionId:\s*'([^']+)'/g;
const refIds = new Set();
let match;
while ((match = idRegex.exec(src)) !== null) {
  refIds.add(match[1]);
}

// Read the book JSON
const book = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'assets', 'doctor-on-duty-full.json'),
    'utf-8',
  ),
);

const existingIds = new Set(book.sections.map((s) => s.id));

let missing = 0;
for (const id of refIds) {
  if (!existingIds.has(id)) {
    console.log('MISSING:', id);
    missing++;
  }
}

if (missing === 0) {
  console.log(`✓ All ${refIds.size} referenced section IDs exist in the book data`);
} else {
  console.log(`✗ ${missing}/${refIds.size} section IDs missing from book data`);
  process.exit(1);
}