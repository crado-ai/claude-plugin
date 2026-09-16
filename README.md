# crado

[crado](https://crado.ai) publishes self-contained HTML documents to stable, shareable URLs — you write a page, crado gives you a link that keeps working. This plugin connects Claude Code to crado's hosted MCP server (`https://crado.ai/mcp`) and adds two skills: `crado-page-design`, the design and authoring rules that keep a page working inside crado's sandbox, looking considered and readable on a phone, and `crado-migrate`, for bulk-migrating documents you already have, including a Claude Design export.

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

- **`publish_page`** — publish a complete, self-contained HTML document and get back `url`, `page_id`, `revision`, `visibility` and `visibility_source`. Arguments: `title`, `html`, optional `collection`, `workspace`, `source`, `visibility` (`public`, `workspace` or `only_you`; omit it to take the workspace default).
- **`publish_canvas`** — publish a Claude Design export (`canvas.json` plus one rendered artboard fragment per `.dc.html`) as one page whose artboards sit on a pan/zoom board, and whose PDF gives each artboard its own page: an artboard with `print: fixed` (the default) prints as one page at the artboard's own size, one with `print: flow` paginates on A4. Arguments: `title`, `canvas`, `artboards`, optional `page_id` to update in place, `collection`, `workspace`, `source`. The `crado-migrate` skill builds the arguments for you.
- **`update_page`** — replace the content, title, collection or visibility of a page already published, keeping its URL. Arguments: `page_id`, optional `title`, `html`, `collection`, `visibility` (`public`, `workspace`, `only_you`, or `default` to follow the workspace default again). It cannot replace a canvas page's content — `html` is refused on one — but `title`, `collection` and `visibility` still go through it; new content for a canvas page comes from `publish_canvas` with that `page_id`.
- **`list_pages`** — list published pages, newest first, with titles, URLs and page_ids. Arguments: optional `workspace`, `collection`, `limit`, `offset`.
- **`list_workspaces`** — list the workspaces the key's owner belongs to; use a returned name or `workspace_id` as the `workspace` argument elsewhere. No arguments.

## Skills

**`crado-page-design`** — the design and authoring rules for a crado page: everything inline, no network requests, and a layout that reads well on a phone. Claude loads it on its own before writing a page; invoke it directly with `/crado:crado-page-design`.

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

## Not using the plugin?

The MCP server can be added on its own:

```bash
claude mcp add --transport http crado https://crado.ai/mcp \
  --header "Authorization: Bearer <your key>" --scope user
```

You then do not get the two skills.

## Updating

```bash
claude plugin update crado@crado          # restart Claude Code to apply
claude plugin marketplace update crado    # refresh the marketplace listing
```

`claude plugin list` shows what is installed; `claude plugin uninstall crado@crado` removes it.
