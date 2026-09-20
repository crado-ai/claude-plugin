# crado

[crado](https://crado.ai) publishes self-contained HTML documents to stable, shareable URLs — you write a page, crado gives you a link that keeps working. This plugin connects Claude Code to crado's hosted MCP server (`https://crado.ai/mcp`) and adds three skills: `crado-page-design`, the design and authoring rules that keep a page working inside crado's sandbox, looking considered and readable on a phone; `crado-canvas-design`, for drawing a set of screens or print pieces as artboards on one board and publishing it as a canvas page; and `crado-migrate`, for bulk-migrating documents you already have, including a Claude Design export.

With the plugin installed, a crado page is the destination for anything shareable — reports, memos, plans, dashboards, one-pagers, a Claude Design canvas. It takes over that job from Claude Code's built-in Artifact tool.

## Install

```bash
claude plugin marketplace add crado-ai/claude-plugin
claude plugin install crado@crado
```

Or inside Claude Code: `/plugin marketplace add crado-ai/claude-plugin` then `/plugin install crado@crado`.

## API key

Create a key in crado under **Settings → Agents & keys**, then export it in your shell profile **before** launching Claude Code:

```bash
# ~/.zshrc or ~/.bashrc
export CRADO_API_KEY="your-api-key"
```

```fish
# fish
set -Ux CRADO_API_KEY your-api-key
```

Restart Claude Code so it picks the variable up.

If the variable is not set, the MCP configuration still loads — nothing errors at startup. The header is sent with the literal text `${CRADO_API_KEY}` in it, so `claude mcp list` (or `/mcp` inside Claude Code) shows `crado` as failed to connect with a 401 "Invalid or revoked API key" from the server, and every tool call fails the same way. So if tools return 401, the variable was not visible to the process that launched Claude Code — check that you exported it in the profile that shell actually reads, and that you restarted afterwards.

To verify: `claude mcp list` should show `crado` as connected, and asking Claude to run `list_pages` should return your library (empty is a valid answer).

## Available tools

The server exposes ten tools.

- **`publish_page`** — publish a complete, self-contained HTML document and get back `url`, `page_id`, `revision`, `visibility` and `visibility_source`. Arguments: `title`, `html`, optional `collection`, `workspace`, `source`, `visibility` (`public`, `workspace` or `only_you`; omit it to take the workspace default), `template` (the key of a frame template whose `{{ body }}` wraps your HTML).
- **`update_page`** — replace the content, title, collection or visibility of a page already published, keeping its URL. Arguments: `page_id`, optional `title`, `html`, `collection`, `template`, `visibility` (`public`, `workspace`, `only_you`, or `default` to follow the workspace default again). It cannot replace a canvas page's content — `html` is refused on one — but `title`, `collection` and `visibility` still go through it; new content for a canvas page comes from `publish_canvas` with that `page_id`. It refuses `html` on a generated document too: a generation is immutable, so call `generate_document` again instead.
- **`publish_canvas`** — publish a Claude Design export (`canvas.json` plus one rendered artboard fragment per `.dc.html`) as one page whose artboards sit on a pan/zoom board, and whose PDF gives each artboard its own page: an artboard with `print: fixed` (the default) prints as one page at the artboard's own size, one with `print: flow` paginates on A4. Arguments: `title`, `canvas`, `artboards`, optional `page_id` to update in place, `collection`, `workspace`, `source`. The `crado-migrate` skill builds the arguments for you.
- **`generate_document`** — render one of the workspace's templates with the data you supply, publish the result as an immutable generated document and build its PDF in one call. Arguments: `template` (key or id), `data` (shaped like the template's sample data), optional `title`, `visibility`, `workspace`, `series` — a key you own, such as `titan:schedule:134676`, that groups runs for one subject into a time-ordered line. Returns `generation_id`, `url`, `pdf_url`, `page_count`, `missing_fields`, `template_version`, `visibility`, `visibility_source` and `series` (`null` for a standalone run, else `{ key, url, pdf_url }` where `series.url` always opens the newest run and `series.pdf_url` its PDF). There is no `page_id`: a generation is never updated or restored, never appears in `list_pages` or the library, and lives under its template — generate again for a new one. Each `missing_fields` entry prints as `[missing: field]` in the page and the PDF. The free plan allows 100 generations per UTC month, counted separately from the 500 API publishes, and a generation's PDF does not spend the PDF quota.
- **`list_templates`** — list the workspace's templates: each one's `key`, `name`, current `version`, `paper`, `landscape`, the top-level `fields` its sample data carries, whether it `is_default`, and a `url` to it in the app. Arguments: optional `workspace`.
- **`save_template`** — install a Liquid template you wrote, or write a new version of one. Arguments: optional `template` (omit it to create; pass a key to ship a new version, rename it or replace its sample data), `html`, `sample_data` (must carry every field the template reads, `null` for optional ones, or nothing is saved and the error names the missing fields), `name`, `paper` and `landscape` (creating only), `workspace`. Returns the template's key, current version, a url to it in the app and `unused_fields`. Documents generated earlier stay on the version they were made with.
- **`list_pages`** — list published pages, newest first, with titles, URLs and page_ids. Generated documents are not listed here — `list_generations` is for those. Arguments: optional `workspace`, `collection`, `limit`, `offset`.
- **`list_workspaces`** — list the workspaces the key's owner belongs to; use a returned name or `workspace_id` as the `workspace` argument elsewhere. No arguments.
- **`upload_asset`** — store a photo, logo or font in the workspace once and get back a `url` to reference it by. Arguments: `content_type` (`image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml`, `font/woff`, `font/woff2`, `font/ttf`, `font/otf`; it must match the bytes), `data` (base64), optional `workspace`. Returns `asset_id`, `url` (`/a/…`), `content_type`, `size_bytes` and `deduplicated`. Put the `url` in the `data` passed to `generate_document` wherever the template expects an image source or a font file — the template uses it in `src` or `@font-face` — and crado inlines it into the PDF itself. Identical bytes return the existing asset with `deduplicated: true`, so upload each file once and reuse its url. Limits: 10 MB per file and 1 GB of storage on the free plan; because the request body is capped at 12 MB and base64 adds a third, about 9 MB of raw bytes fit in one call. This replaces resizing photos and inlining them as data URIs in `data` for templates; a page authored with `publish_page` still inlines data URIs as before.
- **`list_generations`** — list generated documents, newest first, with each run's `generation_id`, `url`, `pdf_url`, `title`, `series`, `template`, `template_version`, `page_count`, `source` and `created_at`. Arguments: optional `template` (one template's runs), `series` (one series), `workspace`, `limit`.

The same operations are on the REST API: `POST /api/v1/generations` (`POST /api/v1/pages/generate` before), `GET /api/v1/generations`, `GET /api/v1/generations/:id` and `/:id/data`, `POST /api/v1/assets`, `GET|HEAD /api/v1/assets/:sha256`.

## Skills

**`crado-page-design`** — the design and authoring rules for a crado page: everything inline, no network requests, and a layout that reads well on a phone. Claude loads it on its own before writing a page; invoke it directly with `/crado:crado-page-design`.

**`crado-canvas-design`** — authors a design canvas from scratch: a folder of static artboards (`canvas.json` + one `.dc.html` per frame, the same shape as a Claude Design export, so it opens there too) for screens, flows, posters and print pieces, matched to the app's own design system, published through `publish_canvas` and updated in place with `page_id`. Invoke with `/crado:crado-canvas-design`.

**`crado-migrate`** — turns a folder of existing documents (Markdown, HTML, docx, Notion or Google Docs exports, Claude Artifacts, ChatGPT Canvas) into published crado pages, and keeps a manifest so re-running updates pages instead of duplicating them. A Claude Design export (`canvas.json` + one `.dc.html` per artboard) is one of its sources: the whole export becomes a single canvas page. Invoke with `/crado:crado-migrate` and point it at a folder.

## Turn off the built-in Artifact tool (recommended)

Claude Code ships an Artifact tool that publishes pages to claude.ai. With crado installed it is redundant for shareable pages, and its tool schema — roughly 20k tokens — is loaded into every session whether you use it or not.

A plugin cannot change your settings, so apply this yourself. In `~/.claude/settings.json`:

```json
{ "permissions": { "deny": ["Artifact"] } }
```

This removes the tool from the session's tool list. It is reversible — delete the line and the tool comes back.

There is also an `"enableArtifact": false` setting (Claude Code v2.1.242 and later). It works, but once it is set in any settings file no other settings file can turn the tool back on, so prefer the deny rule.

To verify: start a fresh session; Artifact is no longer in the tool list.

## Other clients

The three skills follow the Agent Skills format, so any client that reads `SKILL.md` folders can install them from this repo with the [`skills`](https://github.com/vercel-labs/skills) CLI:

```bash
npx skills add crado-ai/claude-plugin -a cursor -g       # or codex, gemini-cli, github-copilot, kimi-code-cli, windsurf …
```

`-g` installs them for every project; drop it to install into the current project only. The MCP server is added separately with the client's own command — [crado.ai/docs](https://crado.ai/docs) has the line for each client.

## Not using the plugin?

The MCP server can be added on its own:

```bash
claude mcp add --transport http crado https://crado.ai/mcp \
  --header "Authorization: Bearer <your key>" --scope user
```

You then do not get the three skills.

## Updating

```bash
claude plugin update crado@crado          # restart Claude Code to apply
claude plugin marketplace update crado    # refresh the marketplace listing
```

`claude plugin list` shows what is installed; `claude plugin uninstall crado@crado` removes it.
