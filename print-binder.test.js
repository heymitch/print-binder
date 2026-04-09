import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { strict as assert } from 'assert';
import { resolve } from 'path';

const testDir = resolve('scripts');
const testMd = resolve(testDir, '_test-binder-input.md');
const testOut = resolve(testDir, '_test-binder-input-binder.pdf');

// Create test markdown
writeFileSync(testMd, `# Chapter 1: Test Content

This is a test paragraph with **bold** and *italic* text.

## Section 1.1

- Item one
- Item two
- Item three

> This is a blockquote for emphasis.

Some more paragraph text to fill out the page with actual readable content that would appear in a real binder textbook.
`);

try {
  // Test 1: Script runs and produces a PDF
  console.log('Running print-binder.js...');
  execSync(`node scripts/print-binder.js "${testMd}"`, { stdio: 'pipe' });
  assert(existsSync(testOut), 'PDF output file should exist');

  // Test 2: PDF has content (not empty)
  const pdfBytes = readFileSync(testOut);
  assert(pdfBytes.length > 1000, `PDF should be non-trivial size, got ${pdfBytes.length} bytes`);

  // Test 3: PDF starts with %PDF header
  const header = pdfBytes.slice(0, 5).toString();
  assert.equal(header, '%PDF-', 'output should be a valid PDF');

  // Test 4: PDF has exactly 2 pages (1 grid + 1 content) for single-page input
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.load(pdfBytes);
  assert.equal(doc.getPageCount(), 2, 'single-page content should produce 2 pages (grid + content)');

  // Test 5: Custom output path
  const customOut = resolve(testDir, '_test-custom-output.pdf');
  execSync(`node scripts/print-binder.js "${testMd}" -o "${customOut}"`, { stdio: 'pipe' });
  assert(existsSync(customOut), 'custom output path should work');
  if (existsSync(customOut)) unlinkSync(customOut);

  // Test 6: Long content produces interleaved grid+content pages
  const longContent = '# Long Chapter\n\n' + Array(80).fill('This is a paragraph of text that should push the content across multiple printed pages when rendered at standard font size. It contains enough words to take up meaningful vertical space on the page.').join('\n\n');
  const longMd = resolve(testDir, '_test-binder-long.md');
  const longOut = resolve(testDir, '_test-binder-long-binder.pdf');
  writeFileSync(longMd, longContent);

  console.log('Running print-binder.js with long content...');
  execSync(`node scripts/print-binder.js "${longMd}"`, { stdio: 'pipe', timeout: 60000 });
  assert(existsSync(longOut), 'long content PDF should exist');

  const longPdfBytes = readFileSync(longOut);
  assert(longPdfBytes.length > pdfBytes.length, 'long content PDF should be larger than single-page PDF');

  const longPdf = await PDFDocument.load(longPdfBytes);
  const pageCount = longPdf.getPageCount();
  assert(pageCount % 2 === 0, `page count should be even (grid+content pairs), got ${pageCount}`);
  assert(pageCount >= 4, `long content should produce at least 4 pages (2+ content + 2+ grid), got ${pageCount}`);
  console.log(`Long content produced ${pageCount} pages (${pageCount / 2} spreads)`);

  if (existsSync(longMd)) unlinkSync(longMd);
  if (existsSync(longOut)) unlinkSync(longOut);

  console.log('All CLI tests passed!');
} finally {
  // Cleanup
  if (existsSync(testMd)) unlinkSync(testMd);
  if (existsSync(testOut)) unlinkSync(testOut);
}
