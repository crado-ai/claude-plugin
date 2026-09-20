# Diagram skeletons

Three figures that follow the rules in SKILL.md → Diagrams; those bullets are the rules, this file is the code. Copy the figure you need, keep the geometry, change the words. All three share this stylesheet; put it in the page's `<style>` and point the classes at the page's own tokens.

```css
figure{margin:0}
figure svg{display:block;width:100%;height:auto;font-family:inherit}
figcaption{font-size:.85rem;color:var(--muted);margin-top:12px}
svg text{fill:var(--ink)}
svg .muted{fill:var(--muted)}
svg .line{stroke:var(--line);fill:none}
svg .box{fill:var(--card);stroke:var(--line)}
svg .box-accent{fill:var(--accent-soft);stroke:var(--accent)}
svg .arrow{stroke:var(--ink);fill:none;stroke-width:1.4}
svg .arrow-dashed{stroke-dasharray:5 4}
svg .head{fill:var(--ink)}
svg .group{fill:none;stroke:var(--line);stroke-dasharray:4 4}
svg .mono{font-family:'SF Mono','Cascadia Code',Consolas,monospace;font-size:12px}
```

Tokens assumed: `--ink`, `--muted`, `--line`, `--card`, `--accent`, `--accent-soft` and `--ground` for the page ground. Name them whatever the page already uses; do not add a second palette for the figure.

## 1 · Flow (HTML + CSS)

Steps in one row that never wraps; a column below 720px.

```css
.flow{display:flex;align-items:stretch;gap:10px}
.step{flex:1 1 0;min-width:0;position:relative;display:grid;gap:2px;align-content:start;
  padding:12px 14px;border:1px solid var(--line);border-radius:6px;background:var(--card)}
.step b{font-size:.95rem;font-weight:600}
.step span{font-size:.8rem;color:var(--muted)}
.step.accent{border-color:var(--accent);background:var(--accent-soft)}
.step.accent b{color:var(--accent)}
.step .n{position:absolute;top:-10px;left:12px;padding:0 4px;background:var(--ground);
  font-size:.7rem;letter-spacing:.08em;color:var(--muted);font-variant-numeric:tabular-nums}
.next{flex:0 0 auto;align-self:center;color:var(--muted)}
.next svg{width:22px;height:22px}
@media (max-width:720px){.flow{flex-direction:column;gap:14px}.next svg{transform:rotate(90deg)}}
```

```html
<figure>
  <div class="flow">
    <div class="step"><span class="n">01</span><b>Agent writes HTML</b><span>Self-contained, inline everything</span></div>
    <div class="next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="step"><span class="n">02</span><b>publish_page</b><span>MCP call with title and body</span></div>
    <div class="next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div class="step accent"><span class="n">03</span><b>Served at /p/slug</b><span>Sandboxed iframe, stable URL</span></div>
  </div>
  <figcaption>Fig. 1 — From an MCP client to a live URL.</figcaption>
</figure>
```

Add a step by adding a `.step` and a `.next` before it; up to five fit a 920px column, and a longer flow is stacked as a column from the start.

## 2 · Sequence (inline SVG)

Four participants 225 apart (x = 20, 245, 470, 695), boxes 150×40, lifelines at x = 95, 320, 545, 770 from y = 60. The activation is a 16-wide rect centred on the lifeline (x = 312 for a lifeline at 320); an edge leaves the activation at its near edge (312 going left, 328 going right) and arrives 2 units short of it (310 from the left, 330 from the right).

Work from the message list, one row per message, before touching any markup:

| i | from → to | kind | y = 60 + 40·i | path | label at ((x₁ + x₂) / 2, y − 8) |
|---|---|---|---|---|---|
| 1 | Agent → Server | request | 100 | `M95 100H310` | 203, 92 |
| 2 | Server → Renderer | request | 140 | `M328 140H543` | 436, 132 |
| 3 | Renderer ⇢ Server | reply | 180 | `M545 180H330` | 436, 172 |
| 4 | Server → Storage | request | 220 | `M328 220H768` | 548, 212 |
| 5 | Server ⇢ Agent | reply | 260 | `M312 260H97` | 203, 252 |

A reply's label reuses its request's x so the pair lines up (rows 3 and 5). Then write exactly one `<path>` and one `<text>` per row, in row order; lifelines end at 60 + 40·n + 20 and the `viewBox` is 60 + 40·n + 40 tall. A reply runs right to left and is dashed; a request runs left to right and is solid. Ten messages are ten rows and ten paths, never a copy of a five-row figure with new words.

```html
<figure>
  <svg viewBox="0 0 860 300" role="img" aria-label="Sequence: the agent calls the server, the server asks the renderer for a PDF, stores it and replies">
    <defs>
      <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" class="head"/>
      </marker>
    </defs>
    <g font-size="13" font-weight="600" text-anchor="middle">
      <rect x="20" y="20" width="150" height="40" rx="6" class="box"/><text x="95" y="45">Agent</text>
      <rect x="245" y="20" width="150" height="40" rx="6" class="box-accent"/><text x="320" y="45">Server</text>
      <rect x="470" y="20" width="150" height="40" rx="6" class="box"/><text x="545" y="45">Renderer</text>
      <rect x="695" y="20" width="150" height="40" rx="6" class="box"/><text x="770" y="45">Storage</text>
    </g>
    <g class="line" stroke-dasharray="4 4">
      <path d="M95 60V280"/><path d="M320 60V280"/><path d="M545 60V280"/><path d="M770 60V280"/>
    </g>
    <rect x="312" y="112" width="16" height="156" rx="3" class="box-accent"/>
    <g class="arrow" marker-end="url(#ah)">
      <path d="M95 100H310"/>
      <path d="M328 140H543"/>
      <path d="M328 220H768"/>
    </g>
    <g class="arrow arrow-dashed" marker-end="url(#ah)">
      <path d="M545 180H330"/>
      <path d="M312 260H97"/>
    </g>
    <g class="mono">
      <text x="203" y="92" text-anchor="middle">generate_document(template, data)</text>
      <text x="436" y="132" text-anchor="middle">render(html)</text>
      <text x="436" y="172" text-anchor="middle" class="muted">pdf bytes</text>
      <text x="548" y="212" text-anchor="middle">put(exports/{id}.pdf)</text>
      <text x="203" y="252" text-anchor="middle" class="muted">{ url, pdf_url }</text>
    </g>
  </svg>
  <figcaption>Fig. 2 — One call, four participants. The tinted bar is the server's activation.</figcaption>
</figure>
```

A note beside the activation bar ("merge data into template") takes a row of its own in the table: 11px muted text starting 10 units right of the bar at that row's y, with no path.

## 3 · Boxes and edges (inline SVG)

Columns 225 apart (x = 20, 245, 470), rows 90 apart (y = 70, 160), boxes 150×60. A dashed rounded rect groups columns and its label sits inside the top-left corner. The `pdf` label sits 8 below its edge because the curved `sql` edge runs above it; the `binding` label sits 8 right of the vertical edge at its midpoint.

```html
<figure>
  <svg viewBox="0 0 640 260" role="img" aria-label="Architecture: browser and MCP client reach the web and server workers, which read the database and the renderer">
    <defs>
      <marker id="ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M0 0L10 5L0 10z" class="head"/>
      </marker>
    </defs>
    <rect x="230" y="40" width="405" height="200" rx="10" class="group"/>
    <text x="250" y="60" font-size="11" letter-spacing="1.5" class="muted">CLOUDFLARE</text>
    <g font-size="13" font-weight="600" text-anchor="middle">
      <rect x="20" y="70" width="150" height="60" rx="6" class="box"/>
      <text x="95" y="96">Browser</text><text x="95" y="114" font-size="11" font-weight="400" class="muted">reader, library</text>
      <rect x="245" y="70" width="150" height="60" rx="6" class="box"/>
      <text x="320" y="96">Web worker</text><text x="320" y="114" font-size="11" font-weight="400" class="muted">TanStack Start</text>
      <rect x="470" y="70" width="150" height="60" rx="6" class="box"/>
      <text x="545" y="96">D1</text><text x="545" y="114" font-size="11" font-weight="400" class="muted">pages, revisions</text>
      <rect x="20" y="160" width="150" height="60" rx="6" class="box"/>
      <text x="95" y="186">MCP client</text><text x="95" y="204" font-size="11" font-weight="400" class="muted">Claude, Cursor</text>
      <rect x="245" y="160" width="150" height="60" rx="6" class="box-accent"/>
      <text x="320" y="186">Server worker</text><text x="320" y="204" font-size="11" font-weight="400" class="muted">RPC, MCP, REST</text>
      <rect x="470" y="160" width="150" height="60" rx="6" class="box"/>
      <text x="545" y="186">Renderer</text><text x="545" y="204" font-size="11" font-weight="400" class="muted">headless Chromium</text>
    </g>
    <g class="arrow" marker-end="url(#ah2)">
      <path d="M170 100H243"/>
      <path d="M170 190H243"/>
      <path d="M320 130V158"/>
      <path d="M395 190H468"/>
      <path d="M395 175Q430 175 430 100H468"/>
    </g>
    <g class="mono">
      <text x="207" y="92" text-anchor="middle">https</text>
      <text x="207" y="182" text-anchor="middle">/mcp</text>
      <text x="328" y="144">binding</text>
      <text x="432" y="212" text-anchor="middle" class="muted">pdf</text>
      <text x="449" y="92" text-anchor="middle" class="muted">sql</text>
    </g>
  </svg>
  <figcaption>Fig. 3 — Two workers, one boundary.</figcaption>
</figure>
```

A third row goes at y = 250 with the `viewBox` height and the group rect grown by 90. A second curved edge gets its own control x so the two curves do not share a lane.
