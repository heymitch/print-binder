/**
 * print-binder-template.js
 *
 * Exports two functions that produce standalone HTML documents for Playwright → PDF:
 *   buildContentOnlyHtml(contentPages, opts)  — content pages with annotation margin
 *   buildGridPageHtml(opts)                   — single grid notes page
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wraps one document's HTML in a content section.
 * For multi-doc inputs, inserts a page break between documents.
 */
function buildContentSection(html, docNum, totalDocs, title) {
  const breakBefore = docNum > 1 ? ' style="page-break-before: always;"' : '';
  return `
<section class="content-section"${breakBefore}>
  <div class="section-header">
    <span class="section-header-title">${escapeHtml(title)}</span>
    <span class="section-header-count">${docNum} / ${totalDocs}</span>
  </div>
  <div class="page-body">
    ${html}
  </div>
</section>`.trim();
}

// ---------------------------------------------------------------------------
// buildContentOnlyHtml
// ---------------------------------------------------------------------------

/**
 * @param {string[]} contentPages  Array of HTML strings, one per page.
 * @param {object}  opts
 * @param {string}  [opts.title='']        Document title.
 * @param {number}  [opts.fontSize=11]     Body font size in pt.
 * @returns {string} Full HTML document.
 */
export function buildContentOnlyHtml(contentPages, opts = {}) {
  const { title = '', fontSize = 6 } = opts;
  const total = contentPages.length;

  const sectionsHtml = contentPages
    .map((html, i) => buildContentSection(html, i + 1, total, title))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
  @page {
    size: Letter;
    /* Annotation margin (left 1.6in) and gutter (right 0.85in) via @page margins.
       This lets content flow naturally and Playwright paginates at paper boundaries. */
    margin: 0.45in 0.85in 0.45in 1.5in;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    background: white;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: ${fontSize}pt;
    line-height: 1.3;
    color: #111;
  }

  /* ------------------------------------------------------------------ */
  /* Content section (one per input document)                            */
  /* ------------------------------------------------------------------ */
  .content-section {
    /* Content flows naturally — Playwright paginates via @page */
  }

  /* ------------------------------------------------------------------ */
  /* Section header (appears once per document)                          */
  /* ------------------------------------------------------------------ */
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 8pt;
    color: #666;
    border-bottom: 0.5pt solid #ccc;
    padding-bottom: 4pt;
    margin-bottom: 14pt;
  }

  .section-header-title {
    font-style: italic;
  }

  /* ------------------------------------------------------------------ */
  /* Typography                                                          */
  /* ------------------------------------------------------------------ */
  .page-body h1 { font-size: calc(${fontSize}pt * 1.5);  margin: 0.5em 0 0.25em; break-after: avoid; }
  .page-body h2 { font-size: calc(${fontSize}pt * 1.2);  margin: 0.5em 0 0.2em; break-after: avoid; }
  .page-body h3 { font-size: calc(${fontSize}pt * 1.1);  margin: 0.4em 0 0.15em; break-after: avoid; }
  .page-body h4 { font-size: ${fontSize}pt; font-weight: bold; margin: 0.35em 0 0.1em; color: #222; break-after: avoid; }
  .page-body p  { margin: 0 0 0.4em; }

  .page-body ul,
  .page-body ol {
    margin: 0 0 0.4em 1.2em;
    padding: 0;
  }

  .page-body li {
    margin-bottom: 0.15em;
  }

  .page-body blockquote {
    margin: 0.4em 0;
    padding: 0.15em 0.6em;
    border-left: 2pt solid #888;
    color: #444;
    font-style: italic;
  }

  .page-body table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.75em 0;
    font-size: calc(${fontSize}pt * 0.85);
  }

  .page-body table th {
    background: #222;
    color: white;
    padding: 2pt 5pt;
    text-align: left;
  }

  .page-body table td {
    border: 0.5pt solid #bbb;
    padding: 2pt 5pt;
  }

  .page-body pre,
  .page-body code {
    font-family: 'Courier New', Courier, monospace;
    font-size: calc(${fontSize}pt * 0.85);
    background: #f4f4f4;
  }

  .page-body pre {
    padding: 8pt;
    overflow: auto;
    border-radius: 2pt;
    margin: 0.75em 0;
  }

  .page-body img {
    max-width: 100%;
    height: auto;
    filter: grayscale(100%);
    display: block;
    margin: 0.5em 0;
  }

  /* Page numbers not used in content-only render — pdf-lib handles final page count */
</style>
</head>
<body>
${sectionsHtml}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// buildGridPageHtml
// ---------------------------------------------------------------------------

/**
 * @param {object}  opts
 * @param {boolean} [opts.noGridHeader=false]  If true, omit the Topic/Date header.
 * @returns {string} Full HTML document for a single grid notes page.
 */
export function buildGridPageHtml(opts = {}) {
  const { noGridHeader = false } = opts;

  // 5 mm at 96 dpi  → 5 * 96 / 25.4 ≈ 18.90px
  // 5 mm at screen  → but Playwright uses CSS px at 96 dpi
  // Common binder grid uses exactly 5mm pitch.
  // 5 mm = 5/25.4 in * 96 px/in ≈ 18.90px — but the spec wants 14.17
  // 14.17px ≈ 5mm @ 72dpi (pt-based), which matches print pt units.
  const GRID_SIZE = 14.17; // px (~5mm at 72 dpi / 1pt = 1px print)

  // Layout constants (all in CSS, mixing in/px units)
  const GUTTER_LEFT = '0.75in';
  const GRID_LEFT   = '0.9in';
  const GRID_RIGHT  = '0.4in';
  const GRID_TOP    = noGridHeader ? '0.4in' : '0.7in';
  const GRID_BOTTOM = '0.5in';

  const headerHtml = noGridHeader ? '' : `
  <div class="grid-header">
    <span class="grid-header-field">Topic: <span class="grid-header-line"></span></span>
    <span class="grid-header-field">Date: <span class="grid-header-line"></span></span>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Grid Notes Page</title>
<style>
  @page {
    size: Letter;
    margin: 0;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
    background: white;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 10pt;
    color: #333;
  }

  /* ------------------------------------------------------------------ */
  /* Page shell                                                          */
  /* ------------------------------------------------------------------ */
  .grid-page {
    position: relative;
    width: 8.5in;
    height: 11in;
    overflow: hidden;
  }

  /* Left gutter for 3-hole punch */
  .grid-gutter {
    position: absolute;
    top: 0;
    left: 0;
    width: ${GUTTER_LEFT};
    height: 100%;
    background: white;
    border-right: 0.5pt solid #e0e0e0;
  }

  /* ------------------------------------------------------------------ */
  /* Header                                                              */
  /* ------------------------------------------------------------------ */
  .grid-header {
    position: absolute;
    top: 0.25in;
    left: ${GRID_LEFT};
    right: ${GRID_RIGHT};
    display: flex;
    gap: 2em;
    font-size: 9pt;
    color: #bbb;
    border-bottom: 0.5pt solid #e0e0e0;
    padding-bottom: 6pt;
  }

  .grid-header-field {
    display: flex;
    align-items: center;
    gap: 0.4em;
  }

  .grid-header-line {
    display: inline-block;
    width: 2in;
    border-bottom: 0.5pt solid #ccc;
  }

  /* ------------------------------------------------------------------ */
  /* SVG grid area                                                       */
  /* ------------------------------------------------------------------ */
  .grid-area {
    position: absolute;
    top: ${GRID_TOP};
    left: ${GRID_LEFT};
    right: ${GRID_RIGHT};
    bottom: ${GRID_BOTTOM};
  }

  .grid-area svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
</head>
<body>
<div class="grid-page">
  <div class="grid-gutter"></div>
  ${headerHtml}
  <div class="grid-area">
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <pattern id="gridPattern" width="${GRID_SIZE}" height="${GRID_SIZE}" patternUnits="userSpaceOnUse">
          <path d="M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}" fill="none" stroke="#e0e0e0" stroke-width="0.4"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#gridPattern)" />
    </svg>
  </div>
</div>
</body>
</html>`;
}
