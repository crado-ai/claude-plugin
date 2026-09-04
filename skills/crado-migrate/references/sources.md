# Source-specific conversion notes

How to get each source into files on disk, and what to watch for when converting. In every case the end product is one self-contained HTML document per page, per the rules in SKILL.md Step 2.

## Markdown files (.md)

- Convert GitHub-flavored Markdown faithfully: headings, fenced code blocks (keep the language as a `class` if you add highlighting styles), tables, task lists, footnotes.
- Local image references (`![...](./img/x.png)`) → read the file, embed as a `data:` URI.
- Remote image references → download once, embed; if unreachable, keep the alt text and note it in the report.
- If `pandoc` is available it's a shortcut: `pandoc -f gfm --standalone --embed-resources file.md -o out.html` — but restyle the output with the reading template rather than shipping pandoc's default look.

## HTML exports (.html)

Already HTML, but almost never self-contained:

- Inline any local `<link rel="stylesheet">` and local `<script src>`; embed local images.
- External CDN references (scripts, stylesheets, fonts) will be blocked by crado's CSP — inline them if they matter to the document, otherwise strip them.
- Strip trackers, analytics snippets, and `<base>` tags.

## Word documents (.docx)

- `pandoc -f docx --standalone --embed-resources file.docx -o out.html` handles text, images (embedded as data URIs), and tables. Restyle with the reading template.
- Without pandoc, ask the user to export the doc as HTML or Markdown first.

## Notion

Export: workspace or page → `⋯` → **Export** → format **Markdown & CSV** (zip). Notes:

- Filenames and folder names carry a 32-hex-character ID suffix (`My Page 0a1b2c….md`) — strip it for the title.
- Each page with images gets a sibling asset folder with the same name; embed those images.
- Nested pages arrive as nested folders — flatten; top-level folder → collection.
- `.csv` files are Notion databases. Convert to an HTML table if small; for large ones, ask the user whether they want them as pages at all.
- Internal Notion links point at exported files; rewrite them to the crado URLs after those pages are published (second pass with `update_page`), or leave them as plain text and note it.

## Google Docs

- Single doc: **File → Download → Web Page (.html, zipped)** — unzip, embed the `images/` folder, restyle. (Markdown download also exists but drops images.)
- Many docs: Google Takeout → Drive → export as HTML.

## Claude Artifacts

- The user downloads the artifact from claude.ai (or copies its content). HTML artifacts often reference CDN scripts (React, Tailwind) — those are blocked by crado's CSP. Document-like artifacts: strip the scripts and keep the content. App-like artifacts (interactive React): warn the user they won't run on crado unless all JS is inlined and dependency-free.
- Markdown artifacts: treat as Markdown files.

## ChatGPT Canvas / Gemini Canvas / Copilot Pages

- ChatGPT Canvas: no file export — the user copies the canvas content (it's Markdown-shaped); save to a `.md` file and treat as Markdown.
- Gemini Canvas: **Export to Google Docs**, then follow the Google Docs path.
- Copilot Pages: copy out, or export via Word → follow the docx path.
