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

## Claude Design export (`canvas.json` + `*.dc.html`)

A zip or folder holding `canvas.json`, one `.dc.html` per artboard, the images they reference, and often a `support.js` (the Claude Design runtime — never published). Unzip first; `canvas.json` in the root is what identifies the source.

- **The whole export is one crado page**, not one page per artboard. `canvas.json` carries the artboard positions (`x`, `y`, `w`, `h`), the sticky notes, the pages and `launch`; crado rebuilds that board inside a single document, so the reader, visibility, revisions and Download PDF work as on any other page. One page per artboard would throw the layout away.
- Publish it with `publish_canvas` (SKILL.md Step 3), never `publish_page`. A canvas page's PDF gives each artboard its own page, in `canvas.json` order: an artboard with `print: fixed` (the default) prints as one page at the artboard's own size, one with `print: flow` paginates on A4.

Turn the artboards into the fragments the tool takes with the helper that ships with this skill:

```bash
node scripts/dc-static.mjs <export-dir> --out fragments.json
```

It writes `{"canvas": <parsed canvas.json>, "artboards": [{file, html}]}` — pass both straight through as the `canvas` and `artboards` arguments and add the `title` yourself — sent to the MCP endpoint over HTTP from the file, never inline in a tool call (SKILL.md, "Publishing a very large page without the MCP tool"). Per artboard it drops the `<script src="./support.js">` line and the `data-dc-script` block, keeps the `<helmet>` `<style>` blocks (its `<link>` tags and `@import` rules go — crado's CSP blocks them, so a Google-Fonts family falls back to the stack behind it; the helper warns per artboard and names the family, so inline the faces as `data:` URIs if the fallback is not good enough), keeps the `<x-dc>` markup, and inlines every image referenced by filename as a `data:` URI. **Resize images over about 1200 px on the long edge before running it** — the helper only base64-encodes, and 40 artboards of full-size photos will not fit under the 10 MiB page cap. Every warning it prints names the artboard; read them before publishing.

An artboard with logic — `data-dc-script`, `{{ holes }}`, `<sc-for>`, `<sc-if>`, `<dc-import>` — cannot be resolved by stripping text, and publishing the strip leaves the holes as literal `{{ text }}` on the page. Re-run with `--render` (add `--port` if 8731 is taken): the helper serves the export over HTTP, opens each such artboard in the local headless browser through the `agent-browser` CLI, waits for the runtime to mount and snapshots the rendered markup. Without `agent-browser` on the machine it warns per artboard and falls back to the static strip — say so in the report rather than publishing holes quietly.

What the migration loses:

- **Interactivity.** Artboards are static snapshots. An artboard that `canvas.json` marks `is_interactive` keeps the INTERACTIVE tag as information ("it has working controls in Claude Design"), but its controls do nothing on the crado page.
- **The editor.** Claude Design stays the place a canvas is edited. To change a published canvas page's content, change the artboards there, re-run the helper, and call `publish_canvas` again with the page's `page_id` — `update_page` refuses `html` on a canvas page, though its `title` and `collection` still go through it.
- An artboard `canvas.json` lists but the export did not carry stays in `canvas` with no fragment; crado draws a slot that names the missing file. Keep it, do not edit it out of `canvas.json`.

## ChatGPT Canvas / Gemini Canvas / Copilot Pages

- ChatGPT Canvas: no file export — the user copies the canvas content (it's Markdown-shaped); save to a `.md` file and treat as Markdown.
- Gemini Canvas: **Export to Google Docs**, then follow the Google Docs path.
- Copilot Pages: copy out, or export via Word → follow the docx path.
