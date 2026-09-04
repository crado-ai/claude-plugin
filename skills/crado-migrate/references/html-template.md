# Reading template

Base template for migrated documents. Replace `{{TITLE}}` and put the converted content inside `<main>`. Everything is inline and self-contained; it adapts to the reader's light/dark preference via `prefers-color-scheme`. Extend the `<style>` block if a document needs more (e.g. footnotes, task lists) — never by linking external resources.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TITLE}}</title>
<style>
  :root {
    --bg: #ffffff;
    --fg: #1f2328;
    --muted: #59636e;
    --border: #d1d9e0;
    --code-bg: #f6f8fa;
    --link: #0969da;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #16191d;
      --fg: #e6e9ec;
      --muted: #9aa4af;
      --border: #3d444d;
      --code-bg: #22272e;
      --link: #539bf5;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.65;
    font-size: 1rem;
    -webkit-text-size-adjust: 100%;
  }
  main {
    max-width: 46rem;
    margin: 0 auto;
    padding: 3rem 1.25rem 5rem;
  }
  h1, h2, h3, h4 { line-height: 1.25; margin: 2em 0 0.6em; }
  h1 { font-size: 2rem; margin-top: 0; }
  h2 { font-size: 1.5rem; padding-bottom: 0.3em; border-bottom: 1px solid var(--border); }
  h3 { font-size: 1.2rem; }
  p, ul, ol { margin: 0 0 1em; }
  ul, ol { padding-left: 1.6em; }
  li + li { margin-top: 0.25em; }
  a { color: var(--link); }
  img { max-width: 100%; height: auto; border-radius: 6px; }
  hr { border: 0; border-top: 1px solid var(--border); margin: 2.5rem 0; }
  blockquote {
    margin: 0 0 1em;
    padding: 0.25em 1em;
    border-left: 4px solid var(--border);
    color: var(--muted);
  }
  code {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.9em;
    background: var(--code-bg);
    padding: 0.15em 0.35em;
    border-radius: 4px;
  }
  pre {
    background: var(--code-bg);
    padding: 1em;
    border-radius: 8px;
    overflow-x: auto;
    margin: 0 0 1em;
  }
  pre code { background: none; padding: 0; font-size: 0.875em; }
  table {
    border-collapse: collapse;
    display: block;
    overflow-x: auto;
    margin: 0 0 1em;
  }
  th, td { border: 1px solid var(--border); padding: 0.4em 0.8em; text-align: left; }
  th { background: var(--code-bg); }
</style>
</head>
<body>
<main>
  <h1>{{TITLE}}</h1>
</main>
</body>
</html>
```
