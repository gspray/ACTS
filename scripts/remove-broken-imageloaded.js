#!/usr/bin/env node
/**
 * Remove the theme's broken imageloaded.js script tags.
 *
 * WordPress already loads imagesloaded.min.js (v5, packaged with EventEmitter).
 * The Charitas theme also enqueues an old imagesLoaded v3.1.4 copy that expects
 * window.EventEmitter / window.eventie globals that are never provided, causing:
 *   Uncaught TypeError: EventEmitter is not a constructor
 *
 * base.js only needs jQuery.fn.imagesLoaded, which the WP script provides.
 */
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

const SCRIPT_RE =
  /\s*<script id="imageloaded-js" src="[^"]*wp-content\/themes\/charitas-wpl\/js\/imageloaded\.js"><\/script>/g;

let changed = 0;
for (const file of walk(SITE_DIR)) {
  const original = fs.readFileSync(file, 'utf8');
  if (!original.includes('id="imageloaded-js"')) continue;

  const updated = original.replace(SCRIPT_RE, '');
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed += 1;
    console.log('Updated:', path.relative(SITE_DIR, file));
  }
}

const remaining = walk(SITE_DIR).filter((f) =>
  fs.readFileSync(f, 'utf8').includes('id="imageloaded-js"')
);

console.log(`\nDone. Updated ${changed} file(s).`);
if (remaining.length) {
  console.log(`Warning: ${remaining.length} file(s) still reference imageloaded-js:`);
  remaining.forEach((f) => console.log(' -', path.relative(SITE_DIR, f)));
  process.exit(1);
}
