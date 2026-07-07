#!/usr/bin/env node
/**
 * Remove broken Guidestar transparency seal images from mirrored HTML pages.
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

function stripGuidestar(html) {
  let next = html;

  // Footer widget column (Second Widget Area) containing Guidestar badge
  next = next.replace(
    /\s*<!-- Second Widget Area -->\s*<div class="grid_4">\s*<aside id="block-2" class="widget widget_block widget_media_image">\s*<figure class="wp-block-image"><a href="https:\/\/www\.guidestar\.org[^"]*"[^>]*><img[^>]*\/><\/a><\/figure>\s*<\/aside>\s*<\/div>\s*/g,
    '\n'
  );

  // Inline Guidestar image in page body (e.g. About ACTS)
  next = next.replace(
    /<p><a href="https:\/\/www\.guidestar\.org[^"]*"[^>]*><img[^>]*\/><\/a><\/p>\s*/g,
    ''
  );

  // Any remaining Guidestar figure blocks
  next = next.replace(
    /<figure class="wp-block-image"><a href="https:\/\/www\.guidestar\.org[^"]*"[^>]*><img[^>]*\/><\/a><\/figure>\s*/g,
    ''
  );

  return next;
}

let changed = 0;
for (const file of walk(SITE_DIR)) {
  const original = fs.readFileSync(file, 'utf8');
  if (!/guidestar|TransparencySeal/i.test(original)) continue;

  const updated = stripGuidestar(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed += 1;
    console.log('Updated:', path.relative(SITE_DIR, file));
  }
}

const remaining = walk(SITE_DIR).filter((f) =>
  /guidestar|TransparencySeal/i.test(fs.readFileSync(f, 'utf8'))
);

console.log(`\nDone. Updated ${changed} file(s).`);
if (remaining.length) {
  console.log(`Warning: ${remaining.length} file(s) still contain Guidestar references:`);
  remaining.forEach((f) => console.log(' -', path.relative(SITE_DIR, f)));
}
