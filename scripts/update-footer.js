#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'site');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function updateFooter(html) {
  let next = html;

  next = next.replace(
    /(\t\t\t\t\t<!-- CopyRight -->\s*<div class=")grid_8(">\s*<p class="copy">\s*)Copyright © (?:2016|2026 ACTS)\.[^<]*(<\/p>\s*<\/div>\s*)\s*<!-- Design By -->\s*<div class="grid_8">\s*<p class="designby">Designed by <a href="https:\/\/wplook\.com[^"]*"[^>]*>WPlook Studio<\/a><\/p>\s*<\/div>/g,
    '$1grid_16$2Copyright © 2026. All Rights reserved.$3'
  );

  next = next.replace(/Copyright © 2016\. All Rights reserved\./g, 'Copyright © 2026. All Rights reserved.');
  next = next.replace(/Copyright © 2026 ACTS\. All rights reserved\./g, 'Copyright © 2026. All Rights reserved.');

  next = next.replace(
    /\s*<!-- Design By -->\s*<div class="grid_8">\s*<p class="designby">Designed by <a href="https:\/\/wplook\.com[^"]*"[^>]*>WPlook Studio<\/a><\/p>\s*<\/div>/g,
    ''
  );

  return next;
}

let changed = 0;
for (const file of walk(SITE_DIR)) {
  const original = fs.readFileSync(file, 'utf8');
  if (!/WPlook|Copyright © 2016/i.test(original)) continue;
  const updated = updateFooter(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed++;
  }
}

const remaining = walk(SITE_DIR).filter((f) => /WPlook|Copyright © 2016/i.test(fs.readFileSync(f, 'utf8')));
console.log(`Updated ${changed} file(s).`);
if (remaining.length) console.log('Remaining:', remaining.map((f) => path.relative(SITE_DIR, f)));
