#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const START_URL = "https://actskids.org/";
const ORIGIN = "https://actskids.org";
const OUTPUT_DIR = path.join(__dirname, "..", "site");
const MAX_PAGES = 1000;
const CONCURRENCY = 8;

const visitedPages = new Set();
const visitedAssets = new Set();
const queue = [START_URL];
const assetQueue = new Set();

const ASSET_EXT =
  /\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|mp4|webm|pdf|xml)(\?|$)/i;

function isValidUrl(raw) {
  if (!raw || raw.startsWith("data:") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
    return false;
  }
  if (raw.startsWith("javascript:") || raw === "#" || raw.startsWith("#")) return false;
  if (/\s/.test(raw)) return false;
  return true;
}

function normalizePageUrl(raw, base) {
  if (!isValidUrl(raw)) return null;
  try {
    const url = new URL(raw, base);
    if (url.origin !== ORIGIN) return null;
    url.hash = "";
    if (url.pathname.includes("wp-json") || url.pathname.includes("xmlrpc.php")) return null;
    let pathname = url.pathname;
    if (!pathname.endsWith("/") && !path.extname(pathname)) pathname += "/";
    url.pathname = pathname;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeAssetUrl(raw, base) {
  if (!isValidUrl(raw)) return null;
  try {
    const url = new URL(raw, base);
    if (url.origin !== ORIGIN) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function urlToLocalFile(urlString, isPage = false) {
  const url = new URL(urlString);
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  if (isPage && !rel.endsWith(".html") && !path.extname(rel)) rel += "/index.html";
  if (rel.startsWith("/")) rel = rel.slice(1);
  return path.join(OUTPUT_DIR, rel);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function extractFromHtml(html, baseUrl) {
  const pages = new Set();
  const assets = new Set();

  const tagRe = /<(a|link|script|img|source|video|audio|iframe)\b[^>]*>/gi;
  const attrRes = {
    a: /\bhref\s*=\s*["']([^"']+)["']/i,
    link: /\bhref\s*=\s*["']([^"']+)["']/i,
    script: /\bsrc\s*=\s*["']([^"']+)["']/i,
    img: /\b(?:src|data-src|data-lazy-src)\s*=\s*["']([^"']+)["']/i,
    source: /\bsrc\s*=\s*["']([^"']+)["']/i,
    video: /\b(?:src|poster)\s*=\s*["']([^"']+)["']/i,
    audio: /\bsrc\s*=\s*["']([^"']+)["']/i,
    iframe: /\bsrc\s*=\s*["']([^"']+)["']/i,
  };

  let tagMatch;
  while ((tagMatch = tagRe.exec(html))) {
    const tag = tagMatch[1].toLowerCase();
    const attrMatch = tagMatch[0].match(attrRes[tag]);
    if (!attrMatch) continue;
    classifyUrl(attrMatch[1], baseUrl, pages, assets);
  }

  const srcsetRe = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
  let srcsetMatch;
  while ((srcsetMatch = srcsetRe.exec(html))) {
    for (const part of srcsetMatch[1].split(",")) {
      classifyUrl(part.trim().split(/\s+/)[0], baseUrl, pages, assets);
    }
  }

  return { pages: [...pages], assets: [...assets] };
}

function extractFromCss(css, baseUrl) {
  const assets = new Set();
  const cssUrlRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  let match;
  while ((match = cssUrlRe.exec(css))) {
    const asset = normalizeAssetUrl(match[1].trim(), baseUrl);
    if (asset) assets.add(asset);
  }
  return [...assets];
}

function classifyUrl(raw, baseUrl, pages, assets) {
  const trimmed = raw.trim();
  if (!isValidUrl(trimmed)) return;
  const absolute = normalizeAssetUrl(trimmed, baseUrl);
  if (!absolute) return;
  if (ASSET_EXT.test(absolute)) {
    assets.add(absolute);
    return;
  }
  const page = normalizePageUrl(absolute, baseUrl);
  if (page) pages.add(page);
}

function rewriteHtml(html, pageUrl) {
  return html.replace(/<(a|link|script|img|source|video|audio|iframe)\b([^>]*)>/gi, (full, tag, attrs) => {
    const tagLower = tag.toLowerCase();
    const attrNames =
      tagLower === "a" || tagLower === "link"
        ? ["href"]
        : tagLower === "img"
          ? ["src", "data-src", "data-lazy-src"]
          : tagLower === "video"
            ? ["src", "poster"]
            : ["src"];

    let updated = attrs;
    for (const name of attrNames) {
      const re = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i");
      updated = updated.replace(re, (match, raw) => {
        if (!isValidUrl(raw)) return match;
        const absolute = normalizeAssetUrl(raw, pageUrl) || normalizePageUrl(raw, pageUrl);
        if (!absolute) return match;
        const isPage = absolute.endsWith("/") || !ASSET_EXT.test(absolute);
        const localFrom = urlToLocalFile(pageUrl, true);
        const localTo = urlToLocalFile(absolute, isPage);
        let relative = path.relative(path.dirname(localFrom), localTo).split(path.sep).join("/");
        if (!relative.startsWith(".") && !relative.startsWith("/")) relative = "./" + relative;
        return `${name}="${relative}"`;
      });
    }

    updated = updated.replace(/\bsrcset\s*=\s*["']([^"']+)["']/i, (match, value) => {
      const rewritten = value
        .split(",")
        .map((part) => {
          const bits = part.trim().split(/\s+/);
          const raw = bits[0];
          if (!isValidUrl(raw)) return part.trim();
          const absolute = normalizeAssetUrl(raw, pageUrl);
          if (!absolute) return part.trim();
          const localFrom = urlToLocalFile(pageUrl, true);
          const localTo = urlToLocalFile(absolute, false);
          let relative = path.relative(path.dirname(localFrom), localTo).split(path.sep).join("/");
          if (!relative.startsWith(".") && !relative.startsWith("/")) relative = "./" + relative;
          bits[0] = relative;
          return bits.join(" ");
        })
        .join(", ");
      return `srcset="${rewritten}"`;
    });

    return `<${tag}${updated}>`;
  });
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "ACTS-Mirror/1.0 (+local dev)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const type = res.headers.get("content-type") || "";
  return { buf, type, finalUrl: res.url };
}

async function downloadAsset(url) {
  if (visitedAssets.has(url)) return;
  visitedAssets.add(url);
  const filePath = urlToLocalFile(url, false);
  ensureDir(filePath);
  try {
    const { buf, type } = await fetchBuffer(url);
    fs.writeFileSync(filePath, buf);
    if (type.includes("css") || filePath.endsWith(".css")) {
      const css = buf.toString("utf8");
      for (const nested of extractFromCss(css, url)) {
        if (!visitedAssets.has(nested)) assetQueue.add(nested);
      }
    }
    process.stdout.write(".");
  } catch {
    process.stderr.write(`\nAsset failed: ${url}\n`);
  }
}

async function downloadPage(url, force = false) {
  if (!force && visitedPages.has(url)) return;
  if (!force && visitedPages.size >= MAX_PAGES) return;
  visitedPages.add(url);
  const filePath = urlToLocalFile(url, true);
  ensureDir(filePath);
  try {
    const { buf, type, finalUrl } = await fetchBuffer(url);
    let body = buf.toString("utf8");
    const resolvedBase = finalUrl || url;
    if (type.includes("html") || body.includes("<html")) {
      const { pages, assets } = extractFromHtml(body, resolvedBase);
      body = rewriteHtml(body, resolvedBase);
      for (const p of pages) if (!visitedPages.has(p)) queue.push(p);
      for (const a of assets) assetQueue.add(a);
    }
    fs.writeFileSync(filePath, body);
    console.log(`Page: ${url}`);
  } catch (err) {
    process.stderr.write(`Page failed: ${url} (${err.message})\n`);
  }
}

async function runPool(items, worker, limit) {
  const q = [...items];
  const workers = Array.from({ length: limit }, async () => {
    while (q.length) {
      const item = q.shift();
      if (item) await worker(item);
    }
  });
  await Promise.all(workers);
}

async function main() {
  console.log(`Crawling ${START_URL} -> ${OUTPUT_DIR}`);
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  while (queue.length && visitedPages.size < MAX_PAGES) {
    const batch = [];
    while (queue.length && batch.length < CONCURRENCY) batch.push(queue.shift());
    await Promise.all(batch.map((url) => downloadPage(url)));
  }

  let pending = [...assetQueue];
  while (pending.length) {
    console.log(`\nDownloading ${pending.length} assets...`);
    await runPool(pending, downloadAsset, CONCURRENCY);
    pending = [...assetQueue].filter((url) => !visitedAssets.has(url));
  }

  // Always save the real homepage last so nothing overwrites root index.html
  console.log("\nRefreshing homepage...");
  visitedPages.delete(START_URL);
  await downloadPage(START_URL, true);

  console.log(`\nDone: ${visitedPages.size} pages, ${visitedAssets.size} assets`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
