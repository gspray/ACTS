#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'site');
const LINK_ID = 'acts-site-css';

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function cssHref(file) {
  const rel = path.relative(path.dirname(file), path.join(SITE_DIR, 'css', 'site.css'));
  return rel.split(path.sep).join('/');
}

let changed = 0;
for (const file of walk(SITE_DIR)) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes(`id='${LINK_ID}'`) || html.includes(`id="${LINK_ID}"`)) continue;
  const href = cssHref(file);
  const link = `<link rel='stylesheet' id='${LINK_ID}' href='${href}' media='all' />\n`;
  const marker = "<link rel='stylesheet' id='charitas-style-css'";
  if (!html.includes(marker)) continue;
  html = html.replace(marker, link + marker);
  fs.writeFileSync(file, html);
  changed++;
}
console.log(`Added site.css to ${changed} page(s).`);
