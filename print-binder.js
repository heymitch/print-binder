#!/usr/bin/env node
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, basename, dirname, extname } from 'path';
import { marked } from 'marked';
import { PDFDocument } from 'pdf-lib';
import { buildContentOnlyHtml, buildGridPageHtml } from './print-binder-template.js';

// Parse CLI args
const args = process.argv.slice(2);
const files = [];
let outputPath = null;
let fontSize = 11;
let noGridHeader = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' || args[i] === '--output') {
    outputPath = resolve(args[++i]);
  } else if (args[i] === '--font-size') {
    fontSize = parseInt(args[++i], 10);
  } else if (args[i] === '--no-grid-header') {
    noGridHeader = true;
  } else if (!args[i].startsWith('-')) {
    files.push(resolve(args[i]));
  }
}

if (files.length === 0) {
  console.error('Usage: print-binder.js <file.md> [file2.md ...] [-o output.pdf] [--font-size N] [--no-grid-header]');
  process.exit(1);
}

// Default output path
if (!outputPath) {
  const first = files[0];
  outputPath = resolve(dirname(first), `${basename(first, extname(first))}-binder.pdf`);
}

// Read and convert files to HTML
const allContentPages = [];
for (const file of files) {
  const raw = readFileSync(file, 'utf-8');
  const ext = extname(file).toLowerCase();
  let html;
  if (ext === '.html' || ext === '.htm') {
    html = raw;
  } else if (ext === '.md' || ext === '.markdown') {
    html = marked(raw);
  } else {
    html = `<pre>${raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
  }
  allContentPages.push(html);
}

// Derive title from first file
const title = basename(files[0], extname(files[0]))
  .replace(/[-_]/g, ' ')
  .replace(/\b\w/g, c => c.toUpperCase());

// Render and interleave
async function render() {
  console.log(`Rendering ${files.length} file(s) → ${outputPath}`);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Render content pages to PDF
  const contentHtml = buildContentOnlyHtml(allContentPages, { title, fontSize });
  await page.setContent(contentHtml, { waitUntil: 'networkidle' });
  const contentPdfBytes = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  // Render a single grid page to PDF
  const gridHtml = buildGridPageHtml({ noGridHeader });
  await page.setContent(gridHtml, { waitUntil: 'networkidle' });
  const gridPdfBytes = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();

  // Interleave: grid before each content page (for duplex: front=grid, back=content)
  const contentDoc = await PDFDocument.load(contentPdfBytes);
  const gridDoc = await PDFDocument.load(gridPdfBytes);
  const finalDoc = await PDFDocument.create();

  const contentPageCount = contentDoc.getPageCount();
  console.log(`Content: ${contentPageCount} page(s), interleaving grid pages...`);

  for (let i = 0; i < contentPageCount; i++) {
    const [gridCopy] = await finalDoc.copyPages(gridDoc, [0]);
    finalDoc.addPage(gridCopy);
    const [contentCopy] = await finalDoc.copyPages(contentDoc, [i]);
    finalDoc.addPage(contentCopy);
  }

  const finalBytes = await finalDoc.save();
  writeFileSync(outputPath, finalBytes);
  console.log(`Done! ${contentPageCount * 2} pages (${contentPageCount} spreads) → ${outputPath}`);
}

render().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
