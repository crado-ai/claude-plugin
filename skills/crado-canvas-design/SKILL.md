---
name: crado-canvas-design
description: Author a design canvas — several artboards laid out on one pan/zoom board — and publish it to crado as a canvas page with a shareable link. Screens, flows, mockups, posters, print pieces, anything the user wants drawn as frames rather than written as one document. The canvas is a folder of static artboards plus canvas.json, in the same shape as a Claude Design export, published through publish_canvas. Read this BEFORE drawing anything — a canvas page renders artboards as static snapshots inside crado's sandbox, so an artboard written like a web page silently loses its fonts, images and scripts.
when_to_use: The user asks to design, mock up, draw or sketch something with more than one frame — "design the settings page", "mock up this flow", "make a canvas of the three screens", "draw the poster in A3 and a phone version", "give me a link to the mockups" — or wants a design they can share as a URL and later export as a PDF. Not for a single document (that is crado-page-design) and not for an export that already exists (that is crado-migrate).
---

# Designing a canvas for crado

A canvas page is one crado page whose document is a board: every artboard sits at its `canvas.json` position as a white card with a name strip, sticky notes float between them, a pages chip switches between named pages, and a − / % / + / Reset view cluster zooms. Clicking an artboard's strip opens it alone; a phone opens on the entry artboard. Download PDF prints the artboards, one page each. The page has a stable URL, workspace visibility and revisions like any other page, and it is a viewer: artboards are static snapshots, nothing inside them runs.

You author a folder — `canvas.json` plus one `.dc.html` per artboard — in the same shape as a Claude Design export, so the folder also opens in Claude Design and re-migrates with `crado-migrate`. Then the `crado-migrate` helper turns the artboards into fragments and `publish_canvas` publishes the folder as one page. Never write the board's HTML yourself and never publish an artboard with `publish_page`.

## The working folder

```
settings-redesign/
  canvas.json          layout, notes, pages, launch view
  Main.dc.html         the entry artboard — always present, always this name
  Phone.dc.html        one file per artboard, named as the artboard
  logo.png             images the artboards reference by filename
```

Keep these files: every change re-runs the helper from them. `support.js` (the Claude Design runtime) is not needed and is never published; add it only if the folder must open in Claude Design.

## An artboard

Static markup only. crado renders what is on the page when the file is read, so none of the Claude Design runtime features exist here: no `{{ holes }}`, `<sc-for>`, `<sc-if>`, `<dc-import>`, `data-dc-script`, no `<script>` at all.

```html
<!doctype html>
<html>
<head><meta charset="utf-8" /><script src="./support.js"></script></head>
<body><x-dc><helmet>
  <style>
    body { margin: 0; font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif; background: #f4f2ee; }
    * { box-sizing: border-box; }
  </style>
</helmet>
<div style="width: 1440px; height: 900px; overflow: hidden; background: #f4f2ee; color: #1c1a17;">
  …the screen…
</div>
</x-dc></body>
</html>
```

- **`<helmet>` holds the styles, `<x-dc>` holds one root element** whose fixed `width` and `height` equal the frame's `w` and `h` in `canvas.json`. The frame neither scales nor crops: a 1440px root in a 1200px frame is clipped. A flowing artboard (a memo, a long list) gets a fixed width and a generous `h`.
- **Every rule of `crado-page-design`'s Hard constraints and Theme sections applies inside an artboard**, because the artboard ends up inside crado's sandbox: everything inline, images as `data:` URIs or files next to the artboard that the helper inlines (`<img src="logo.png">`, CSS `url(logo.png)`; resize to about 1200 px on the long edge first), no `fetch`, no storage, an explicit background on the root element (a helmet `body` rule becomes the card's own background too, so both work; a transparent root shows the board through).
- **Fonts.** A Google Fonts `<link>` in the helmet is fine for Claude Design but is stripped on publish (the helper warns), so every stack must end in a face that renders without it: either embed the face as a `@font-face` `data:` URI in the helmet, or design with system stacks from the start. Read `crado-page-design`'s "Type without webfonts" and the PDF font rule: the PDF renderer resolves only `serif`, `sans-serif`, `monospace`, `system-ui`, `Arial`, `Helvetica`.
- **Phones are 390 wide.** A phone artboard is a real 390×844 frame with the app's mobile chrome, not a desktop screen shrunk.
- **Copy is real.** Product names, numbers and labels the user would recognise, never lorem; a screen that needs data shows plausible data.

## canvas.json

```json
{
  "artboards": [
    { "file": "Main.dc.html", "x": 0, "y": 0, "w": 1440, "h": 900, "title": "Settings — desktop" },
    { "file": "Phone.dc.html", "x": 1560, "y": 0, "w": 390, "h": 844, "title": "Settings — phone" },
    { "file": "Memo.dc.html", "x": 0, "y": 1050, "w": 720, "h": 1400, "title": "Rationale", "print": "flow" }
  ],
  "annotations": [
    { "id": "brief", "x": 0, "y": -220, "w": 720, "text": "What this canvas decides and what is out of scope." }
  ],
  "pages": [
    { "id": "screens", "name": "Screens" },
    { "id": "print", "name": "Print" }
  ],
  "launch": { "view": "canvas" }
}
```

- **Artboards**: `file` (the stem is the artboard's identity), `x` `y` `w` `h` in CSS px at zoom 1, `title` (≤ 120 chars, shown on the name strip — say what the frame is, the file name is not a title), `print` (`"fixed"` default, `"flow"`), `page` (a listed page id; omit on a one-page canvas), `is_interactive` (`true` only for a frame that has working controls in Claude Design; crado shows the tag as information). One `Main.dc.html` is always listed.
- **Spacing**: at least 80 px between frames in a row and 120 px between rows — the name strip sits above each frame — and no frame over another. A frame's name strip may run past a narrow frame (a phone), so keep a phone artboard's title short.
- **Notes**: the opening view fits artboards and notes together, so a note far from the frames only shrinks everything. Put the brief above the first row (negative `y`), short notes beside the frame they explain, never on top of a frame. Notes show on every page.
- **Annotations**: `id` (1–40 chars, letters, digits, `-` `_`), `x` `y` `w`, `text` (≤ 5000 chars). crado draws every annotation as a sticky note. At most 40.
- **Pages**: at most 40 `{ id, name }`; every `page` an artboard names must be listed; artboards without a `page` land on the first page. Use pages for separate concerns (screens vs print, before vs after), not for pagination.
- **Launch**: `{ "view": "canvas" }` (optionally `"page"`), or `{ "view": "focused", "file": "Main.dc.html" }` to open on one artboard. A canvas that is really one piece (a poster) launches focused; a set of screens launches on the board.

## Frames and print

| piece | frame | print |
|---|---|---|
| desktop screen | 1440 × 900 (1280 × 800 for a dense admin) | fixed |
| phone screen | 390 × 844 | fixed |
| tablet | 834 × 1194 | fixed |
| A4 portrait page | 794 × 1123 | fixed, one artboard per page |
| A3 poster | 1123 × 1587 | fixed |
| memo, report, rationale | 720–800 wide, `h` as tall as the content | flow |

A fixed artboard prints as one PDF page at its own size, so a brochure is a series of single-page artboards in reading order and a poster is one frame. A flow artboard paginates on A4 with 18 mm margins, so a document-like piece is one artboard with `"print": "flow"` and its width inside A4 (under 720 px). Nothing else about the print pipeline reaches a canvas: no headers or footers, no `data-page`, and every artboard prints in `canvas.json` order.

## Design process

1. **Match the existing app before drawing anything.** Inside a codebase the user never has to ask for that. Find the design system — tokens, theme, `globals.css`, `tailwind.config`, the component library, icon set, brand fonts — and the existing screens closest to the ask, and lift exact values: colours, type ramp, weights, line heights, spacing, radii, borders, shadows, control heights, icon sizes. Follow tokens to their resolved values; never round to a grid the app does not use. Reproduce the app's standard components as markup with inline styles — since an artboard cannot import them — and extend that vocabulary for the new screen. Say in one line what you matched ("matching `packages/ui`: Inter, 6px radii, 32px controls"). Only when a real search finds no app and no design system fall back to `crado-page-design`'s Design process (a compact plan of colours, type roles and a layout concept, no AI-design clichés) — and say you looked.
2. **Decide the frames first**: which screens, which sizes, which states. One artboard per screen or state that the user has to see; a flow of five steps is five frames in a row with the note explaining the order, not one tall frame.
3. **Generate shared chrome.** When three or more artboards share a header, sidebar or footer, write a small `build.mjs` that holds the tokens and the chrome as functions and writes every `.dc.html` — one place to change the header, and the chrome stays pixel-identical across frames. Keep the generator in the folder; it is a source, not an output.
4. **Look at every artboard before publishing.** Open each `.dc.html` straight from disk in a browser (agent-browser: `open file:///…/Main.dc.html`, `screenshot`) — unknown elements render their content, so the file previews as the artboard will look; a blank card means the root has no background, a clipped edge means the root is larger than the frame. The board itself has no local preview: publish the page and open the URL for the layout, then iterate with `page_id`. The page is private to the workspace, so a browser that is not signed in as its owner gets "This page isn't here" — do not read that as a failed publish; if you cannot sign in, say you have not seen the board and ask the user to open it.
5. **Notes say something true**: the brief, a decision, what a state means. A note that restates the artboard's title is noise.

## Publish and iterate

The helper and the publish route belong to `crado-migrate`; read its "Publishing a very large page without the MCP tool" section for the exact commands. In short:

1. `node <crado-migrate skill folder>/scripts/dc-static.mjs <folder> --out fragments.json` (the `crado-migrate` skill sits next to this one in the plugin) — writes `{ canvas, artboards }`, one fragment per artboard, images inlined. Read every warning: a stripped stylesheet names the font family that now falls back; a `{{hole}}` or a missing file means the artboard is not what you meant to publish.
2. `publish_canvas` with `title`, the file's `canvas` and `artboards`, optional `collection` and `workspace` — always through the HTTP route with `jq --slurpfile`, never inline in a tool call: a bundle is a few hundred KiB and an inline call gets truncated and publishes a broken page. It returns `{ url, page_id, revision }` — `url` is the service's own address, which is not the endpoint you posted to when that endpoint is a local or self-hosted stack.
3. Record `page_id` in `crado-migration.json` in the folder, in `crado-migrate`'s shape with the key `"."` and `"kind": "canvas"`, so a later `crado-migrate` run or your own next publish updates the page instead of duplicating it.
4. To change anything: edit the working files, re-run the helper, call `publish_canvas` again with `page_id`. The URL stays; the revision increments. `update_page` changes only the title and collection of a canvas page.
5. Hand the user the URL. Mention that artboards are static in crado and that the PDF prints one page per fixed artboard.

## Pre-publish checklist

1. Every artboard's root has a fixed `width`/`height` equal to its frame's `w`/`h`, an explicit background, and no `<script>`.
2. No frame overlaps another; rows ≥ 120 px apart, frames ≥ 80 px apart; notes beside frames, not over them.
3. Every `page` and `launch` reference names a listed page or artboard; `Main.dc.html` is listed.
4. No external URL anywhere except `<a href>`; fonts end in a face that renders without the network; images are files next to the artboard or `data:` URIs.
5. Each artboard looked right from disk at its own size; a phone artboard is 390 wide.
6. The helper printed no warning you have not acted on; the bundle is under 10 MiB.
7. Published through `publish_canvas` over the HTTP route, `page_id` recorded, the URL opened once — or handed over with a line saying you could not sign in to see the board.
