#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const SITE = path.join(__dirname, "..", "site");

const HDR_MAP = {
  "slider_about2.jpg": "hdr_about2.jpg",
  "slider_children.jpg": "hdr_children.jpg",
  "slider_community.jpg": "hdr_community.jpg",
  "slider_book.jpg": "hdr_book.jpg",
};

const THUMB_MAP = {
  "slider_about2.jpg": "thumb_about2.jpg",
  "slider_children.jpg": "thumb_children.jpg",
  "slider_community.jpg": "thumb_community.jpg",
  "slider_book.jpg": "thumb_book.jpg",
};

const BROKEN_SOCIAL = `\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<li class="share-item-icon- mt"><a target="_blank" title="" href=""><i class="icon-"></i></a></li>`;

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

function removeActsCss(html) {
  return html.replace(/\t<link rel="stylesheet" href="[^"]*css\/acts\.css" media="all" \/>\n/g, "");
}

function restoreCopyright(html) {
  return html.replace(
    /Copyright © 2026 ACTS\. All rights reserved\./g,
    "Copyright © 2016. All Rights reserved."
  );
}

function restoreCta(html) {
  return html
    .replace(/Learn more →/g, "Learn more >>")
    .replace(/>Read more</g, ">read more<");
}

function restoreBrokenSocial(html) {
  if (html.includes('class="share-item-icon- mt"')) return html;
  return html.replace(
    /(<li class="share-item-icon-facebook mt">)/,
    BROKEN_SOCIAL + "\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t$1"
  );
}

function restoreHdrAndThumbs(html, prefix) {
  let out = html;
  for (const [local, hdr] of Object.entries(HDR_MAP)) {
    const localPath = `${prefix}wp-content/uploads/2016/12/${local}`.replace(/\./g, "\\.");
    out = out.replace(
      new RegExp(`background-image: url\\('${localPath}'\\)`, "g"),
      `background-image: url('https://actskids.org/wp-content/uploads/2016/12/${hdr}')`
    );
  }
  for (const [local, thumb] of Object.entries(THUMB_MAP)) {
    const localPath = `${prefix}wp-content/uploads/2016/12/${local}`.replace(/\./g, "\\.");
    out = out.replace(
      new RegExp(`data-thumb="${localPath}"`, "g"),
      `data-thumb="https://actskids.org/wp-content/uploads/2016/12/${thumb}"`
    );
  }
  return out;
}

function restoreCommunityLinks(html, prefix) {
  const ct = `${prefix}community-transformation/index.html`;
  const comm = `${prefix}community/index.html`;
  return html
    .replace(
      new RegExp(`href="${ct.replace(/\./g, "\\.")}"`, "g"),
      (match, offset, str) => {
        const slice = str.slice(Math.max(0, offset - 200), offset + 200);
        if (slice.includes("Community Transformation") || slice.includes("home_community") || slice.includes("slider_community")) {
          return `href="${comm}"`;
        }
        return match;
      }
    );
}

function removeShopSidebar(html) {
  if (!html.includes("woocommerce-shop") && !html.includes("post-type-archive-product") && !html.includes("single-product")) {
    return html;
  }
  return html.replace(
    /\t\t<div id="secondary" class="grid_4 widget-area" role="complementary">[\s\S]*?<\/aside><\/div>\n(?=\t\t<div class="clear"><\/div>\s*\n\t<\/div><!-- #primary -->)/,
    ""
  );
}

function getTeaserBlock(prefix) {
  const indexHtml = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
  const match = indexHtml.match(/<div id="teaser">[\s\S]*?<\/div>\s*\n/);
  if (!match) throw new Error("Could not extract teaser from index.html");

  let teaser = match[0];
  if (prefix === "./") return teaser;

  teaser = teaser.replace(/\.\/wp-content\//g, `${prefix}wp-content/`);
  teaser = teaser.replace(/href="\.\//g, `href="${prefix}`);
  return teaser;
}

function restoreBlogHero(html, prefix) {
  const isBlog =
    html.includes('class="blog ') ||
    html.includes("blog/page/2") ||
    html.includes("blog/page/3");
  if (!isBlog || !html.includes("acts-blog-hero")) return html;

  const teaser = getTeaserBlock(prefix);
  return html.replace(
    /\t<div class="item teaser-page-list acts-blog-hero">[\s\S]*?<\/div>\n<div id="main"/,
    teaser + '<div id="main"'
  );
}

function restoreCommunityPage() {
  const src = path.join(SITE, "community-transformation/index.html");
  const dest = path.join(SITE, "community/index.html");
  let html = fs.readFileSync(src, "utf8");
  html = html.replace(/\.\.\/community-transformation\//g, "../community/");
  html = html.replace(/community-transformation\//g, "community/");
  html = html.replace(
    /current-menu-item page_item page-item-16 current_page_item/g,
    "menu-item-50"
  );
  fs.writeFileSync(dest, html);
}

function processFile(filePath) {
  const rel = path.relative(SITE, filePath).replace(/\\/g, "/");
  if (rel.includes("/feed/") || rel === "feed/index.html") return "skip";
  if (rel === "community/index.html") return "skip-community";

  let html = fs.readFileSync(filePath, "utf8");
  const prefix = relPrefix(filePath);

  html = removeActsCss(html);
  html = restoreCopyright(html);
  html = restoreCta(html);
  html = restoreBrokenSocial(html);
  html = restoreHdrAndThumbs(html, prefix);
  html = restoreCommunityLinks(html, prefix);
  html = removeShopSidebar(html);
  html = restoreBlogHero(html, prefix);

  fs.writeFileSync(filePath, html);
  return "ok";
}

restoreCommunityPage();

const files = walk(SITE);
let ok = 0;
for (const f of files) {
  if (processFile(f) === "ok") ok++;
}

console.log(`Redesign undone on ${ok} pages; community page restored`);
