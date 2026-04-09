# print-binder

Print-ready PDF generator for lay-flat binders. Every spread shows content on the left and a 5mm fine grid notes page on the right.

## What it does

Takes markdown, HTML, or plain text and generates a duplex-aware PDF where:
- **Left page** (back of sheet): your content with a wide annotation margin
- **Right page** (front of sheet): 5mm grid for handwritten notes

Print duplex (long-edge flip) on US Letter paper, hole-punch, and drop into a binder.

## Install

```bash
git clone https://github.com/heymitch/print-binder.git
cd print-binder
npm install
npx playwright install chromium
```

## Usage

```bash
# Single file
node print-binder.js input.md

# Custom output path
node print-binder.js input.md -o my-binder.pdf

# Multiple files (each starts on a fresh page)
node print-binder.js chapter1.md chapter2.md chapter3.md

# Smaller/larger text (default: 6pt)
node print-binder.js input.md --font-size 8

# Remove topic/date header from grid pages
node print-binder.js input.md --no-grid-header
```

## Page layout

```
BINDER OPEN:
+-------------------+  +-------------------+
|        |          |  |    |               |
| annot. | content  |  | 3h |   5mm grid    |
| margin |          |  |gutter              |
| (blank)| text     |  |    |   for notes   |
|        |          |  |    |               |
|        |   3h     |  |    |               |
|        |  gutter  |  |    |               |
+-------------------+  +-------------------+
   LEFT (content)          RIGHT (grid)
   back of sheet           front of sheet
```

- **Annotation margin**: 1.5" blank space on the left of content pages (no ink)
- **3-hole punch gutter**: 0.75" on spine side of both page types
- **Grid**: 5mm squares, light gray (#e0e0e0)
- **Typography**: Georgia serif, 6pt body, 1.3 line-height

## How it works

1. Converts markdown to HTML via `marked`
2. Renders content pages to PDF via Playwright (headless Chromium)
3. Renders a single grid page to PDF via Playwright
4. Uses `pdf-lib` to interleave: grid page before each content page
5. Output is duplex-ready (grid on front of sheet, content on back)

## Tests

```bash
npm test
```

## License

MIT
