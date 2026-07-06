#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const SITE = path.join(__dirname, "..", "site");

const HDR_MAP = {
  "hdr_about2.jpg": "slider_about2.jpg",
  "hdr_children.jpg": "slider_children.jpg",
  "hdr_community.jpg": "slider_community.jpg",
  "hdr_book.jpg": "slider_book.jpg",
  "hdr_support.jpg": "slider_about2.jpg",
};

const THUMB_MAP = {
  "thumb_about2.jpg": "slider_about2.jpg",
  "thumb_children.jpg": "slider_children.jpg",
  "thumb_community.jpg": "slider_community.jpg",
  "thumb_book.jpg": "slider_book.jpg",
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function relPrefix(filePath) {
  const rel = path.relative(SITE, path.dirname(filePath));
  if (!rel || rel === ".") return "./";
  return rel.split(path.sep).map(() => "..").join("/") + "/";
}

function sidebarBlock(prefix) {
  return `
\t\t<div id="secondary" class="grid_4 widget-area" role="complementary">
\t\t<aside class="widget widget_text"><div class="widget-title"><h3>Available Now!</h3><div class="clear"></div></div>
\t\t\t<div class="textwidget"><a href="${prefix}product/tell-the-whole-world-that-i-am-real/index.html"><img class="aligncenter size-full wp-image-67" src="${prefix}wp-content/uploads/2016/12/home_book.jpg" alt="Tell the Whole World That I Am Real" width="225" height="149" /></a>
Miracles occur in Africa every day, and none is more amazing than Little Elsa's encounter with Jesus Christ and his message for her and all people.
<a href="${prefix}product/tell-the-whole-world-that-i-am-real/index.html">Learn more →</a></div>
\t\t</aside></div>`;
}

function injectCss(html, prefix) {
  const link = `<link rel="stylesheet" href="${prefix}css/acts.css" media="all" />\n`;
  if (html.includes("css/acts.css")) return html;
  return html.replace(/<\/head>/i, link + "</head>");
}

function removeBrokenSocial(html) {
  return html.replace(
    /\s*<li class="share-item-icon- mt"><a target="_blank" title="" href=""><i class="icon-"><\/i><\/a><\/li>/g,
    ""
  );
}

function fixCommunityLinks(html, prefix) {
  const ct = `${prefix}community-transformation/index.html`;
  return html
    .replace(/href="(\.\.\/)*community\/index\.html"/g, `href="${ct}"`)
    .replace(/href="\.\/community\/index\.html"/g, `href="${ct}"`);
}

function fixCopyright(html) {
  return html.replace(
    /Copyright © 2016\. All Rights reserved\./g,
    "Copyright © 2026 ACTS. All rights reserved."
  );
}

function standardizeCta(html) {
  return html
    .replace(/Learn more &gt;&gt;/g, "Learn more →")
    .replace(/Learn more >>/g, "Learn more →")
    .replace(/>read more</g, ">Read more<");
}

function fixAbsoluteAssets(html, prefix) {
  let out = html;
  for (const [hdr, local] of Object.entries(HDR_MAP)) {
    const localPath = `${prefix}wp-content/uploads/2016/12/${local}`;
    out = out.replace(
      new RegExp(`https://actskids\\.org/wp-content/uploads/2016/12/${hdr}`, "g"),
      localPath
    );
  }
  for (const [thumb, local] of Object.entries(THUMB_MAP)) {
    const localPath = `${prefix}wp-content/uploads/2016/12/${local}`;
    out = out.replace(
      new RegExp(`https://actskids\\.org/wp-content/uploads/2016/12/${thumb}`, "g"),
      localPath
    );
  }
  out = out.replace(/https:\/\/actskids\.org\/wp-content\//g, `${prefix}wp-content/`);
  return out;
}

function blogHero(html) {
  const isBlog =
    html.includes('class="blog ') ||
    html.includes("blog/page/2") ||
    html.includes("blog/page/3");
  if (!isBlog || !html.includes('id="teaser"')) return html;

  const hero = `\t<div class="item teaser-page-list acts-blog-hero">
\t\t<div class="container_16">
\t\t\t<aside class="grid_10">
\t\t\t\t<h1 class="page-title">Blog</h1>
\t\t\t\t<p class="acts-hero-sub" style="color:rgba(255,255,255,0.9);font-size:1.1rem;margin-top:0.5rem;">News and updates from ACTS in Ethiopia</p>
\t\t\t</aside>
\t\t\t<div class="clear"></div>
\t\t</div>
\t</div>`;

  return html.replace(/<div id="teaser">[\s\S]*?<\/div>\s*\n<div id="main"/, hero + '\n<div id="main"');
}

function addSidebarIfMissing(html, prefix) {
  if (html.includes('id="secondary"')) return html;
  const isShop = html.includes("woocommerce-shop") || html.includes("post-type-archive-product");
  const isProduct = html.includes("single-product");
  if (!isShop && !isProduct) return html;

  return html.replace(
    /(\t\t<\/div><!-- #content -->)\s*\n\s*\n(\t\t<div class="clear"><\/div>\s*\n\t<\/div><!-- #primary -->)/,
    `$1${sidebarBlock(prefix)}\n$2`
  );
}

function removeStaleWooNotice(html) {
  return html.replace(
    /<div class="woocommerce-notices-wrapper">[\s\S]*?<\/div>\s*/g,
    ""
  );
}

function communityRedirect(prefix) {
  const target = `${prefix}community-transformation/index.html`;
  return `<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=${target}" />
  <link rel="canonical" href="${target}" />
  <title>Redirecting…</title>
  <script>location.replace("${target}");</script>
</head>
<body>
  <p>Redirecting to <a href="${target}">Community Transformation</a>…</p>
</body>
</html>`;
}

function processFile(filePath) {
  const rel = path.relative(SITE, filePath).replace(/\\/g, "/");

  if (rel.includes("/feed/") || rel === "feed/index.html") return "skip-feed";

  if (rel === "community/index.html") {
    fs.writeFileSync(filePath, communityRedirect("../"));
    return "redirect";
  }

  let html = fs.readFileSync(filePath, "utf8");
  const prefix = relPrefix(filePath);

  html = injectCss(html, prefix);
  html = removeBrokenSocial(html);
  html = fixCommunityLinks(html, prefix);
  html = fixCopyright(html);
  html = standardizeCta(html);
  html = fixAbsoluteAssets(html, prefix);
  html = blogHero(html);
  html = removeStaleWooNotice(html);
  html = addSidebarIfMissing(html, prefix);

  fs.writeFileSync(filePath, html);
  return "ok";
}

const files = walk(SITE);
const stats = { ok: 0, redirect: 0, skip: 0 };

for (const f of files) {
  const r = processFile(f);
  if (r === "redirect") stats.redirect++;
  else if (r === "skip-feed") stats.skip++;
  else stats.ok++;
}

console.log(`Redesign applied: ${stats.ok} pages, ${stats.redirect} redirect, ${stats.skip} feeds skipped`);
