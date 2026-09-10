---
name: crado-page-design
description: Publish anything shareable as a crado page — a report, memo, plan, dashboard, one-pager, summary, proposal, changelog, or any "shareable HTML / artifact / web page" the user wants a link to. crado pages (publish_page / update_page over the crado MCP server) are the destination for that work; use them instead of Claude Code's built-in Artifact tool. Read this BEFORE writing the HTML — the crado serving sandbox blocks every external resource, so a page written like a normal web page or a Claude Artifact silently loses its fonts, images, and scripts.
when_to_use: The user asks to publish, share, or "make a page" out of something — "share this as a page", "publish a report", "write up a memo I can send", "turn this into a dashboard / one-pager", "give me a link" — or asks for an artifact or shareable HTML and crado is connected. Also whenever you are about to call publish_page or update_page, or edit HTML that will end up on a crado URL.
---

# Designing crado pages

A crado page is one self-contained HTML document, stored byte-for-byte and served raw on its own subdomain inside a sandboxed iframe. Nothing is injected for you — no doctype, no reset, no theme stamping — and nothing external loads. Author the complete document, from `<!doctype html>` to `</html>`.

Publish with `publish_page` (title + html, optional `collection` and `workspace`); it returns the page's `url` and `page_id`. To change a page that is already live, call `update_page` with that `page_id` — the URL stays the same. Never publish a second copy to "update" something. Hand the returned URL to the user.

## Hard constraints (CSP + iframe sandbox — violations fail silently)

- **Everything inline.** `script-src` and `style-src` are `'unsafe-inline'` only: no `<script src>`, no `<link rel="stylesheet">`, no same-origin files. Google Fonts and every CDN are blocked — this is stricter than Claude Artifacts, so do not carry Artifact habits over.
- **Images, media, fonts: `data:` only** (`blob:` also works for img/media). No `https:` images. Embed images as data URIs; fonts as `@font-face` data URIs, or use system font stacks.
- **No network, no storage.** `connect-src 'none'` (no fetch/XHR/WebSocket), `form-action 'none'`, `base-uri 'none'`. The iframe has no `allow-same-origin`: opaque origin, so `localStorage`, `sessionStorage`, `IndexedDB` and cookies all throw or fail. State lives in JS memory for the visit only.
- **Interactivity that works:** inline `<script>`, popups (`allow-popups`), plain `<a href>` links. Anything needing a server round-trip or persistence does not.
- **10 MB cap** on the HTML string — data-URI images count heavily; compress and downscale before embedding.

## Linking

- **Link to another crado page with its absolute `url`** — the one returned by `publish_page` or listed by `list_pages`. Never a relative path: the reader resolves `/p/<slug>` for you, but the direct document URL and the PDF do not, and they 404.
- External links are ordinary `<a href="https://…">`. In-page `#anchor` links work as usual.
- Need to link pages to each other? Publish them first, collect the URLs, then `update_page` the ones that link.

## Responsive

The document sits in an iframe as wide as the reader's screen and gets no viewport of its own. On a phone that is about 390px. Most pages that look right on a desktop break there — fixed-width containers, multi-column grids that never collapse, tables that push the whole page sideways. Build mobile-first and fluid:

- `max-width` on containers, never a fixed `width`. `width: 100%` or nothing.
- Scale padding and type with `clamp()` (e.g. `padding: clamp(16px, 4vw, 48px)`, `font-size: clamp(1.75rem, 1.2rem + 2vw, 2.75rem)` on the largest heading).
- Grids collapse: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr))`, or one breakpoint at `@media (max-width: 640px)` that sets a single column. Stats grids, card rows and two-column layouts all need this.
- `min-width: 0` on flex and grid children, so long words and numbers shrink instead of overflowing.
- Every table and code block sits in its own `overflow-x: auto` wrapper; the page body itself must never scroll horizontally. Long unbroken strings (URLs, hashes) get `overflow-wrap: anywhere`.
- Images and SVGs: `max-width: 100%; height: auto`.
- Touch targets at least 44px tall; no hover-only interactions — anything revealed on hover is also reachable by tap or is simply visible.

## Theme

The reader's dark/light toggle repaints only the chrome around the iframe; the document gets no `data-theme`, no class, no CSS-variable passthrough. So:

- **Always set an explicit `background` on `body`** — an unset or transparent background shows the app's flipping ground through, and the page breaks in one theme.
- Support both themes with `prefers-color-scheme` via CSS custom properties: full light palette on `:root`, token overrides only inside the media query, components styled through tokens. Never give a color its only definition inside the media query.
- A deliberately single-theme page (dark-first poster, letterpress invitation) may skip the media query — but still paint background and every color explicitly.

## PDF / print

Readers can download a page as PDF; it prints the same document with backgrounds on. For documents likely to be exported, add a light `@media print` pass: sensible `@page` margins, `break-inside: avoid` on cards and figures, hide interactive-only chrome.

## Design process

Before writing code, sketch a compact plan: 4–6 named colors, 2+ type roles, a one-sentence layout concept — then derive every decision from it.

- **Calibrate treatment.** Memos, plans, reports get a polished utilitarian treatment — real hierarchy, considered spacing, a proper palette, no giant hero. Landing pages and keepsakes get the editorial treatment with one deliberate aesthetic risk. A well-composed page is never wrong; an over-designed one sometimes is.
- **Ground it in the subject.** Distinctive choices come from the subject's own world. Real content throughout, never lorem.
- **Type without webfonts.** With Google Fonts blocked, either embed a face as a `@font-face` data URI (woff2, subset it — budget matters) or design deliberately with system stacks: `Charter, 'Bitstream Charter', Georgia, serif` · `'Avenir Next', 'Segoe UI', system-ui, sans-serif` · `'SF Mono', 'Cascadia Code', Consolas, monospace` are all characterful. Keep running text around 65ch, set a scale and stay on it, `text-wrap: balance` on headings, letter-spacing on uppercase labels.
- **Choose neutrals** — hue-bias greys toward the accent; never default mid-grey.
- **Avoid the AI-design clichés**: cream + serif + terracotta, near-black + lone acid accent, purple-blue gradient hero, Inter-as-default, emoji section markers, everything centered, rounded corners on everything, accent bars on rounded cards. If the user asks for one of these, their words win.
- **Layout does the spacing**: flex/grid + `gap`, not stacked margins. `font-variant-numeric: tabular-nums` where digits align.
- **Structure encodes information** — numbered markers only for real sequences; eyebrows, dividers and labels must say something true.
- **Copy is design material**: name things by what readers recognize, active voice, specific beats clever.
- Include a real `<title>` (a short noun-phrase name, no appended explainer) — it shows on the direct URL's tab. The `title` argument to `publish_page` is separate library metadata; keep the two consistent.

## Pre-publish checklist

1. No external URL anywhere except `<a href>` links — grep for `src="http`, `href="http` outside anchors, `@import`, `url(http`.
2. Links to other crado pages use the absolute `url` from `publish_page` / `list_pages`, never a relative path.
3. `body` has an explicit token background; no color defined only inside a media query.
4. **390px pass**: no horizontal page scroll, multi-column grids collapsed to one column, every table and code block scrolling inside its own wrapper, nothing clipped. Still right at desktop width.
5. Every non-void element closed, attributes double-quoted, visible keyboard focus, `prefers-reduced-motion` respected.
6. Under 10 MB including data URIs.
