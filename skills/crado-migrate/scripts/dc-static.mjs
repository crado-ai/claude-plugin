import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve, sep } from "node:path";

const USAGE = `usage: node dc-static.mjs <export-dir> --out <fragments.json> [--render] [--port <n>]

Turns a Claude Design export (canvas.json + one .dc.html per artboard) into the
bundle publish_canvas takes: {"canvas": <canvas.json>, "artboards": [{file, html}]}.
Add the title yourself when you call the tool.

  --render   render artboards that carry logic ({{holes}}, <sc-for>, <sc-if>,
             <dc-import>, data-dc-script) in the local headless browser through
             the agent-browser CLI, and snapshot the mounted DOM. Without it
             those artboards are stripped statically and their logic stays raw.
  --port     port for the temporary static server used by --render, bound to
             127.0.0.1 (default 8731, any whole number 1024-65535).

Warnings go to stderr, one line per artboard.`;

const IMAGE_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const LOGIC_PATTERNS = [
  [/data-dc-script/, "data-dc-script"],
  [/<sc-for[\s>]/i, "<sc-for>"],
  [/<sc-if[\s>]/i, "<sc-if>"],
  [/<dc-import[\s>]/i, "<dc-import>"],
  [/\{\{/, "{{ holes }}"],
];

function parseArgs(argv) {
  const out = { dir: null, out: null, render: false, port: 8731, raw: { port: "8731" } };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out") {
      out.out = argv[++i];
    } else if (arg === "--render") {
      out.render = true;
    } else if (arg === "--port") {
      out.raw.port = argv[++i];
      out.port = Number(out.raw.port);
    } else if (arg === "-h" || arg === "--help") {
      out.help = true;
    } else if (!out.dir) {
      out.dir = arg;
    } else {
      throw new Error(`unexpected argument: ${arg}`);
    }
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractXdc(src) {
  const open = /<x-dc(?:\s[^>]*)?>/i.exec(src);
  if (!open) return null;
  const close = src.lastIndexOf("</x-dc>");
  if (close === -1 || close < open.index) return null;
  return src.slice(open.index + open[0].length, close);
}

function stripScripts(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "");
}

function fontFamilies(url) {
  const names = [];
  for (const m of url.matchAll(/[?&]family=([^&]+)/g)) {
    const family = decodeURIComponent(m[1].replace(/\+/g, " ")).split(":")[0].trim();
    if (family) names.push(family);
  }
  return names;
}

function describeStylesheet(url) {
  const families = fontFamilies(url);
  return families.length ? `${url} (${families.join(", ")})` : url;
}

function droppedStylesheet(url, warn) {
  warn(
    `stylesheet dropped, crado's CSP blocks it: ${describeStylesheet(url)} — inline the font faces as data: URIs in a <style> block, or accept the fallback stack`,
  );
}

function helmetStyles(inner, warn = () => {}) {
  const match = /<helmet(?:\s[^>]*)?>([\s\S]*?)<\/helmet\s*>/i.exec(inner);
  if (!match) return { styles: "", body: inner };
  for (const link of match[1].matchAll(/<link\b[^>]*>/gi)) {
    if (!/\brel\s*=\s*(["']?)[^"'>]*stylesheet/i.test(link[0])) continue;
    const href =
      /\bhref\s*=\s*(["'])([^"']*)\1/i.exec(link[0]) ?? /\bhref\s*=\s*([^\s>"']+)/i.exec(link[0]);
    droppedStylesheet(href ? (href[2] ?? href[1]) : "(link with no href)", warn);
  }
  const styles = [...match[1].matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)]
    .map((m) =>
      m[1]
        .replace(/@import[^;]*;/gi, (decl) => {
          const url =
            /url\(\s*['"]?([^'")]+)/i.exec(decl) ?? /@import\s+['"]([^'"]+)['"]/i.exec(decl);
          droppedStylesheet(url ? url[1] : decl.trim(), warn);
          return "";
        })
        .trim(),
    )
    .filter(Boolean)
    .map((css) => `<style>${css}</style>`)
    .join("\n");
  return { styles, body: inner.slice(0, match.index) + inner.slice(match.index + match[0].length) };
}

function dataUri(dir, ref, warn) {
  const clean = ref.split("?")[0].split("#")[0];
  const type = IMAGE_TYPES[extname(clean).toLowerCase()];
  if (!type) return null;
  const base = resolve(dir);
  const file = resolve(base, clean.replace(/^\.\//, ""));
  if (file !== base && !file.startsWith(base.endsWith(sep) ? base : `${base}${sep}`)) return null;
  if (!existsSync(file)) {
    warn(`image not found, left as-is: ${ref}`);
    return null;
  }
  const bytes = readFileSync(file);
  if (bytes.length > 512 * 1024) {
    warn(`image over 512 KiB after inlining (${Math.round(bytes.length / 1024)} KiB): ${clean} — resize it to about 1200px on the long edge first`);
  }
  return `data:${type};base64,${bytes.toString("base64")}`;
}

function isLocalRef(ref) {
  return !/^(https?:|data:|blob:|#|\/\/)/i.test(ref);
}

function inlineImages(html, dir, warn) {
  const cache = new Map();
  const remote = new Set();
  const encode = (ref) => {
    if (/^https?:\/\//i.test(ref) && !remote.has(ref)) {
      remote.add(ref);
      warn(`remote reference crado's CSP blocks: ${ref} — download the file into the export folder and point the artboard at it`);
    }
    if (!isLocalRef(ref)) return null;
    if (!cache.has(ref)) cache.set(ref, dataUri(dir, ref, warn));
    return cache.get(ref);
  };
  let out = html.replace(/(<img\b[^>]*?\bsrc=)(["'])([^"']+)\2/gi, (whole, head, quote, ref) => {
    const uri = encode(ref);
    return uri ? `${head}${quote}${uri}${quote}` : whole;
  });
  out = out.replace(/(<[^>]*?\bsrcset=)(["'])([^"']+)\2/gi, (whole, head, quote, value) => {
    if (/data:/i.test(value)) return whole;
    const candidates = value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [ref, ...descriptors] = part.split(/\s+/);
        const uri = encode(ref);
        return [uri ?? ref, ...descriptors].join(" ");
      });
    if (!candidates.length) return whole;
    return `${head}${quote}${candidates.join(", ")}${quote}`;
  });
  out = out.replace(/(<(?:image|use)\b[^>]*?\bhref=)(["'])([^"']+)\2/gi, (whole, head, quote, ref) => {
    const uri = encode(ref);
    return uri ? `${head}${quote}${uri}${quote}` : whole;
  });
  out = out.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (whole, quote, ref) => {
    const uri = encode(ref.trim());
    return uri ? `url(${quote}${uri}${quote})` : whole;
  });
  return out;
}

function logicMarkers(src) {
  return LOGIC_PATTERNS.filter(([pattern]) => pattern.test(src)).map(([, name]) => name);
}

function staticFragment(src, dir, warn) {
  const inner = extractXdc(src);
  if (inner === null) {
    warn("no <x-dc> block — not a Claude Design artboard");
    return null;
  }
  const { styles, body } = helmetStyles(inner, warn);
  const fragment = [styles, stripScripts(body).trim()].filter(Boolean).join("\n");
  return inlineImages(fragment, dir, warn);
}

function hasAgentBrowser() {
  const probe = spawnSync("agent-browser", ["--help"], { encoding: "utf8" });
  return probe.status === 0;
}

function browser(args) {
  return spawnSync("agent-browser", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

async function serve(dir, port) {
  const proc = spawn(
    "python3",
    ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", dir],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok || res.status === 404) return proc;
    } catch {}
    await sleep(250);
  }
  proc.kill();
  throw new Error(`static server did not come up on port ${port}`);
}

async function renderFragment(file, port, src, dir, warn) {
  const url = `http://127.0.0.1:${port}/${encodeURIComponent(file)}`;
  const opened = browser(["open", url]);
  if (opened.status !== 0) {
    warn(`agent-browser could not open ${url}: ${(opened.stderr || "").trim()}`);
    return null;
  }
  let markup = "";
  for (let i = 0; i < 24; i += 1) {
    const got = browser(["get", "html", "#dc-root"]);
    markup = got.status === 0 ? (got.stdout || "").trim() : "";
    if (markup) break;
    await sleep(500);
  }
  if (!markup) {
    warn("artboard never mounted in the headless browser — falling back to the static strip");
    return null;
  }
  const { styles } = helmetStyles(extractXdc(src) ?? "", warn);
  const stripped = stripScripts(markup).replace(/\sdata-dc-tpl="[^"]*"/g, "");
  return inlineImages([styles, stripped].filter(Boolean).join("\n"), dir, warn);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.dir || !args.out) {
    process.stdout.write(`${USAGE}\n`);
    process.exit(args.help ? 0 : 1);
  }
  if (!Number.isInteger(args.port) || args.port < 1024 || args.port > 65535) {
    process.stderr.write(`--port must be a whole number between 1024 and 65535, got: ${args.raw.port}\n`);
    process.exit(1);
  }
  const dir = resolve(args.dir);
  const canvasPath = join(dir, "canvas.json");
  if (!existsSync(canvasPath)) throw new Error(`no canvas.json in ${dir}`);
  const canvas = JSON.parse(readFileSync(canvasPath, "utf8"));
  const entries = Array.isArray(canvas.artboards) ? canvas.artboards : [];

  const files = [];
  for (const entry of entries) {
    if (entry && typeof entry.file === "string" && !files.includes(entry.file)) files.push(entry.file);
  }

  const warnings = [];
  const needRender = new Set();
  const sources = new Map();
  for (const file of files) {
    const path = join(dir, file);
    if (!existsSync(path)) {
      warnings.push(`${file}: file missing from the export — canvas.json keeps it, crado renders a missing slot`);
      continue;
    }
    const src = readFileSync(path, "utf8");
    sources.set(file, src);
    const markers = logicMarkers(src);
    if (markers.length) {
      if (args.render) needRender.add(file);
      else
        warnings.push(
          `${file}: carries logic (${markers.join(", ")}) the static strip cannot resolve — re-run with --render`,
        );
    }
  }

  let proc = null;
  let renderable = false;
  if (args.render && needRender.size) {
    renderable = hasAgentBrowser();
    if (!renderable) {
      warnings.push(
        "agent-browser is not installed on this machine — every artboard with logic falls back to the static strip",
      );
    } else {
      proc = await serve(dir, args.port);
    }
  }

  const artboards = [];
  for (const file of files) {
    const src = sources.get(file);
    if (src === undefined) continue;
    const warn = (message) => warnings.push(`${file}: ${message}`);
    let html = null;
    if (renderable && needRender.has(file)) {
      html = await renderFragment(file, args.port, src, dir, warn);
    }
    if (html === null) html = staticFragment(src, dir, warn);
    if (html === null) continue;
    if (/\{\{/.test(html)) warn("a {{hole}} is still in the output — the fragment will publish that text literally");
    artboards.push({ file, html });
  }

  if (renderable) browser(["close"]);
  if (proc) proc.kill();

  writeFileSync(resolve(args.out), JSON.stringify({ canvas, artboards }));

  for (const line of warnings) process.stderr.write(`warning: ${line}\n`);
  const bytes = readFileSync(resolve(args.out)).length;
  process.stdout.write(
    `${basename(args.out)}: ${artboards.length} of ${files.length} artboards, ${Math.round(bytes / 1024)} KiB\n`,
  );
  if (artboards.length === 0) {
    process.stderr.write(`error: no artboards came out of ${dir} — nothing to publish\n`);
    process.exit(1);
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
