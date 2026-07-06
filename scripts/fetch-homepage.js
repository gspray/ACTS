#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const START_URL = "https://actskids.org/";
const ORIGIN = "https://actskids.org";
const OUT = path.join(__dirname, "..", "site", "index.html");

const ASSET_EXT =
  /\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|mp4|webm|pdf|xml)(\?|$)/i;

function urlToLocal(urlString, isPage = false) {
  const url = new URL(urlString);
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  if (isPage && !rel.endsWith(".html") && !path.extname(rel)) rel += "/index.html";
  return rel.startsWith("/") ? rel.slice(1) : rel;
}

function rewriteHtml(html, pageUrl) {
  const pageLocal = urlToLocal(pageUrl, true);

  return html.replace(
    /(<(?:a|link|script|img|source|video|audio|iframe)\b[^>]*\b(?:href|src|data-src|data-lazy-src|poster)\s*=\s*["'])(https:\/\/actskids\.org[^"']*)(["'])/gi,
    (full, prefix, raw, suffix) => {
      try {
        const isPage = !ASSET_EXT.test(raw);
        const localTo = urlToLocal(raw, isPage);
        let relative = path.relative(path.dirname(pageLocal), localTo).split(path.sep).join("/");
        if (!relative.startsWith(".") && !relative.startsWith("/")) relative = "./" + relative;
        return prefix + relative + suffix;
      } catch {
        return full;
      }
    }
  );
}

async function main() {
  const res = await fetch(START_URL, {
    headers: { "User-Agent": "ACTS-Mirror/1.0" },
    redirect: "follow",
  });
  let html = await res.text();
  html = rewriteHtml(html, res.url || START_URL);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
  const title = html.match(/<title>([^<]+)/i)?.[1] || "(no title)";
  console.log(`Saved homepage -> ${OUT}`);
  console.log(`Title: ${title}`);
}

main().catch(console.error);
