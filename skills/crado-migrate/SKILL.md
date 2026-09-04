---
name: crado-migrate
description: Migrate existing documents (Markdown, HTML, Word/docx, Notion exports, Google Docs, Claude Artifacts, ChatGPT Canvas and other AI canvas exports) into crado as published pages. Use when the user wants to import, move, bulk-publish, or migrate docs, notes, or a folder of files into crado.
---

# Migrate documents to crado

crado publishes self-contained HTML documents to stable, shareable URLs. Publishing goes through the crado MCP server, which exposes four tools: `publish_page`, `update_page`, `list_pages`, and `list_workspaces`. This skill turns a set of existing documents into crado pages, idempotently — re-running a migration updates pages instead of duplicating them.

## Step 0 — Preflight

Call `list_pages` with `limit: 1` to confirm the crado MCP server is connected and the key works.

- Tools not available → the server isn't connected. The crado plugin provides the server; the user needs `CRADO_API_KEY` set in the shell that launches Claude Code, then a restart. API keys are created in the crado web app under Settings → Agents & keys. See the plugin README for the full setup.

  If they are not using the plugin, the server can be added by hand:

  ```
  claude mcp add --transport http crado https://crado.ai/mcp --header "Authorization: Bearer <api key>"
  ```
- 401 "Invalid or revoked API key" → ask the user for a fresh key; do not retry with the same one.

Then decide the target workspace. Pages are published into a workspace the key's owner belongs to; omitting `workspace` publishes into their personal workspace.

- If the migration manifest (Step 3) or the user already names a workspace, use it.
- Otherwise call `list_workspaces`. One workspace → nothing to ask. Several → ask which one, and pass its name or `workspace_id` as the `workspace` argument on every `publish_page` call. Record the choice in the manifest so re-runs don't ask again.

`workspace` is accepted by `publish_page` and `list_pages` only. `update_page` targets a page by `page_id`, which already carries its workspace.

## Step 1 — Discover and plan

1. Identify the source. If the user didn't say what to migrate, ask for the folder or files. For source-specific conversion notes (Notion exports, Google Docs, docx, AI canvas products), read `references/sources.md`.
2. Enumerate the documents. Include document formats (`.md`, `.html`, `.docx`, `.txt`); skip assets (images, CSS) — they get embedded into their documents, not published on their own.
3. Look for an existing `crado-migration.json` manifest in the source root (see Step 3). If present, this run is a re-run: compare content hashes to decide per file whether to publish, update, or skip.
4. Present a migration plan as a table — source file, title, collection, action (`publish` / `update` / `skip unchanged`) — and **wait for the user to confirm before publishing anything**. Published pages are live URLs.

Planning rules:

- **Title**: first `H1` of the document, else document metadata, else the filename without extension. Max 200 characters.
- **Collections are flat** — no nesting. Default to one collection named after the source folder (or a name the user picks). If the source has subfolders, map top-level subfolders to collections and flatten anything deeper. Collection names max 120 characters; collections are created automatically on first publish.
- URLs are assigned by crado (random slug, stable forever). They cannot be chosen or derived from the title.

## Step 2 — Convert to self-contained HTML

Pages are served inside a sandbox with a strict CSP: **the page cannot load anything from the network**. External stylesheets, scripts, fonts, images, and fetch/XHR are all blocked — they fail silently and the page looks broken.

Conversion rules for every document:

- Produce a complete HTML document (`<!doctype html>` through `</html>`). Start from the template in `references/html-template.md`; put the converted content inside `<main>`.
- All CSS inline in a `<style>` block. Inline `<script>` is allowed but rarely needed for documents.
- Images must be `data:` URIs. Read each referenced image, base64-encode it, and embed it. No `http(s)://` sources for any resource.
- No web fonts — use the system font stack (the template already does).
- Regular hyperlinks (`<a href="https://...">`) are fine; navigation is allowed, resource loading is not.
- Preserve document structure faithfully: headings, lists, tables, code blocks, blockquotes, links, images.
- **Size limit: 10 MiB per page** (UTF-8 bytes, embedded images included). If a document exceeds it: re-encode images smaller first (resize to ≤1600px wide, JPEG quality ~80 usually cuts most of the weight); if still over, split the document into parts (`Title (1/2)`, `Title (2/2)`) and tell the user.

## Step 3 — Publish and record

For each document in the confirmed plan:

1. New document → `publish_page` with `title`, `html`, `collection`, `source: "migration"`, and `workspace` if Step 0 picked one. Returns `{url, page_id, revision}`.
2. Previously migrated and source changed → `update_page` with the manifest's `page_id` and the new `html` (plus `title` if it changed). The URL never changes; the revision increments.
3. Unchanged (hash matches manifest) → skip.

After each successful publish or update, write the manifest `crado-migration.json` in the source root:

```json
{
  "version": 1,
  "workspace": "Acme",
  "pages": {
    "guides/setup.md": {
      "page_id": "…",
      "url": "https://….crado.page/",
      "sha256": "<hash of the source file>",
      "migrated_at": "2026-08-27T10:00:00Z"
    }
  }
}
```

The manifest is what makes re-runs idempotent — crado has no MCP tool to read page content back, so this file is the only reliable link between source files and pages. Never delete it, and tell the user to keep it with the source docs. Update it after every page, not at the end, so an interrupted run resumes cleanly.

Publish sequentially and report progress every few pages for large batches.

## Step 4 — Verify and report

- Fetch a sample of the returned URLs (e.g. `curl -s -o /dev/null -w "%{http_code}"`) and confirm they return 200.
- If browser tooling is available, open one migrated page and check it renders: images visible, styling applied, no broken layout.
- Final report: a table of source file → title → URL → action taken, plus any failures with their reasons.

## Error handling

| Error | Meaning | What to do |
| --- | --- | --- |
| 401 Missing/Invalid API key | Key absent, wrong, or revoked | Reconnect with a fresh key (Step 0) |
| `PAYLOAD_TOO_LARGE` | Page over 10 MiB | Compress images, then split the document |
| "This key can only publish to its bound collection" | Key is scoped to one collection | Omit the `collection` argument, or have the user create an unscoped workspace key |
| "Page was updated concurrently" | Racing update on the same page | Retry the `update_page` once |
| "Nothing to update" | `update_page` called with only `page_id` | Include at least one of `title`, `html`, `collection` |
| Tool call truncated or rejected before it reaches crado | The HTML is several MB and cannot be passed as an MCP tool argument — a large document blown up by embedded images hits the per-message output cap, and a subagent cannot emit it at all | Publish over HTTP instead — see below |

### Publishing a very large page without the MCP tool

The `html` argument has to travel through the message as text, so a page of several MB is not publishable by calling the tool, especially from a subagent. Post the JSON-RPC call to the MCP endpoint directly instead; the HTML then goes from file to request body and never passes through a message.

The endpoint is stateless: no `initialize` handshake and no `mcp-session-id` header. It does require `Accept` to name both `application/json` and `text/event-stream`, and `Content-Type: application/json`.

Build the request body with `jq` so the HTML is escaped correctly:

```bash
jq -n --arg title "Quarterly report" --rawfile html page.html '{
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "publish_page",
    arguments: { title: $title, html: $html, collection: "Reports", source: "migration" }
  }
}' > request.json

curl -sS https://crado.ai/mcp \
  -H "Authorization: Bearer $CRADO_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  --data-binary @request.json \
  | sed -n 's/^data: //p'
```

The reply comes back as a server-sent-event stream, which is why the `sed` line is there — it strips the `data: ` prefix and leaves the JSON-RPC response. The `{url, page_id, revision}` payload is inside `result.content[0].text` as a JSON string. `update_page` works the same way: change `name` and pass `page_id` plus the new `html`.

Notes:

- `$CRADO_API_KEY` must be set in the shell running curl. If it is not, the call returns 401 with `{"error":"Missing API key…"}`.
- Delete `request.json` when done — it contains the whole document, not the key.
- Same 10 MiB page limit applies; this fallback only works around the message size limit, not the server's.

## Limits worth telling the user about

- Collections are flat; deep folder trees get flattened.
- A page lands in one workspace and stays there — there is no MCP tool to move it between workspaces, so get the `workspace` choice right before publishing a batch.
- Page URLs are random and permanent — no custom slugs.
- There is no MCP tool to delete or archive a page; that's done in the crado web app.
- Pages are `noindex` — shareable by URL, not search-indexed.
