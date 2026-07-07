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

function renameBlogToNews(html) {
  return html
    .replace(/\/blog\//g, '/news/')
    .replace(/<title>Blog/g, '<title>News')
    .replace(/content='Blog'/g, "content='News'")
    .replace(/>Blog<\/a>/g, '>News</a>');
}

let changed = 0;
for (const file of walk(SITE_DIR)) {
  const original = fs.readFileSync(file, 'utf8');
  if (!/\/blog\/|<title>Blog|content='Blog'|>Blog<\/a>/.test(original)) continue;
  const updated = renameBlogToNews(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed++;
  }
}

console.log(`Updated ${changed} file(s).`);
const remaining = walk(SITE_DIR).filter((f) => /\/blog\/|>Blog<\/a>|<title>Blog|content='Blog'/.test(fs.readFileSync(f, 'utf8')));
if (remaining.length) {
  console.log('Remaining references:');
  remaining.forEach((f) => console.log(' -', path.relative(SITE_DIR, f)));
}
