import { buildContentOnlyHtml, buildGridPageHtml } from './print-binder-template.js';
import { strict as assert } from 'assert';

// Test 1: Content HTML includes content section structure and annotation margin via @page
const contentHtml = buildContentOnlyHtml(['<p>Hello world</p>'], { title: 'Test' });
assert(contentHtml.includes('class="content-section"'), 'should have content section class');
assert(contentHtml.includes('1.5in'), 'should have annotation margin space (1.5in left @page margin)');
assert(contentHtml.includes('Hello world'), 'should include content');

// Test 2: Multiple content sections
const multiHtml = buildContentOnlyHtml(['<p>Page 1</p>', '<p>Page 2</p>', '<p>Page 3</p>'], { title: 'Test' });
const contentSections = (multiHtml.match(/class="content-section"/g) || []).length;
assert.equal(contentSections, 3, 'should have 3 content sections');

// Test 3: Font size option works
const bigHtml = buildContentOnlyHtml(['<p>Big</p>'], { title: 'Test', fontSize: 12 });
assert(bigHtml.includes('font-size: 12pt'), 'should apply custom font size');

// Test 4: Grid page has SVG pattern
const gridHtml = buildGridPageHtml({});
assert(gridHtml.includes('patternUnits="userSpaceOnUse"'), 'grid should use SVG pattern');
assert(gridHtml.includes('14.17'), 'grid should use ~5mm spacing (14.17px)');

// Test 5: Grid page has header by default
assert(gridHtml.includes('Topic:'), 'grid should have topic header');
assert(gridHtml.includes('Date:'), 'grid should have date header');

// Test 6: No grid header option
const gridNoHeader = buildGridPageHtml({ noGridHeader: true });
assert(!gridNoHeader.includes('Topic:'), 'should omit header when noGridHeader is true');

// Test 7: Grid page has 3-hole punch gutter
assert(gridHtml.includes('0.75in'), 'grid should have gutter for 3-hole punch');

console.log('All template tests passed!');
