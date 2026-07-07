#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'site');
const HOME = path.join(SITE_DIR, 'index.html');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function stripBookSidebar(html) {
  let next = html;

  // Remove sidebar column with Available Now! book widget
  next = next.replace(
    /\s*<div id="secondary" class="grid_4 widget-area" role="complementary">\s*<aside id="text-(?:4|12)" class="widget widget_text">[\s\S]*?<h3>Available Now!<\/h3>[\s\S]*?<\/aside>\s*<\/div>/g,
    '\n'
  );

  // Expand main content to full width when sidebar is removed
  next = next.replace(
    /<div id="primary" class="grid_11 suffix_1">/g,
    '<div id="primary" class="grid_16">'
  );

  return next;
}

let changed = 0;
for (const file of walk(SITE_DIR)) {
  if (file === HOME) continue;
  const original = fs.readFileSync(file, 'utf8');
  if (!original.includes('Available Now!') || !original.includes('id="secondary"')) continue;
  const updated = stripBookSidebar(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed++;
  }
}

const remaining = walk(SITE_DIR).filter((f) => {
  if (f === HOME) return false;
  const html = fs.readFileSync(f, 'utf8');
  return html.includes('id="secondary"') && html.includes('Available Now!');
});

console.log(`Updated ${changed} page(s).`);
if (remaining.length) {
  console.log(`Remaining (${remaining.length}):`);
  remaining.forEach((f) => console.log(' -', path.relative(SITE_DIR, f)));
}

const homeOk = fs.readFileSync(HOME, 'utf8').includes('Available Now!');
console.log(homeOk ? 'Homepage book column preserved.' : 'WARNING: homepage book column missing.');
