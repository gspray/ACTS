#!/usr/bin/env node
/**
 * Harden the static mirror for WordPress takedown.
 *
 * Removes scripts/links that call or discover the live WP runtime
 * (CF7 REST, xmlrpc, wp-json discovery, WP.com analytics).
 * Keeps actskids.org URLs in og:url / share buttons (expected after DNS cutover).
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

function depthPrefix(htmlFile) {
  const rel = path.relative(SITE_DIR, htmlFile);
  const depth = rel.split(path.sep).length - 1;
  if (depth <= 0) return './';
  return '../'.repeat(depth);
}

function harden(html, htmlFile) {
  let next = html;
  const prefix = depthPrefix(htmlFile);

  // WP.com WooCommerce analytics bootstrap
  next = next.replace(/\s*<script>window\._wca = window\._wca \|\| \[\];<\/script>\s*/g, '\n');
  next = next.replace(
    /\s*<link rel='dns-prefetch' href='\/\/stats\.wp\.com' \/>\s*/g,
    '\n'
  );
  next = next.replace(/\s*_wca\.push\(\{[\s\S]*?\}\);\s*/g, '\n');

  // oEmbed discovery (points at non-functional local wp-json)
  next = next.replace(
    /\s*<link rel="alternate" title="oEmbed \(JSON\)"[^>]*>\s*/g,
    '\n'
  );
  next = next.replace(
    /\s*<link rel="alternate" title="oEmbed \(XML\)"[^>]*>\s*/g,
    '\n'
  );

  // REST / xmlrpc discovery line (may be one or more tags on one line)
  next = next.replace(
    /\s*<link rel="https:\/\/api\.w\.org\/"[^>]*>\s*/g,
    '\n'
  );
  next = next.replace(
    /\s*<link rel="alternate" title="JSON" type="application\/json" href="[^"]*wp-json[^"]*"\s*\/?>\s*/g,
    '\n'
  );
  next = next.replace(
    /\s*<link rel="EditURI"[^>]*href="[^"]*xmlrpc\.php"[^>]*>\s*/g,
    '\n'
  );

  // Generator meta
  next = next.replace(
    /\s*<meta name="generator" content="WordPress[^"]*"\s*\/?>\s*/g,
    '\n'
  );
  next = next.replace(
    /\s*<meta name="generator" content="WooCommerce[^"]*"\s*\/?>\s*/g,
    '\n'
  );

  // Contact Form 7 (no forms; JS targets live wp-json)
  next = next.replace(
    /\s*<link rel='stylesheet' id='contact-form-7-css'[^>]*>\s*/g,
    '\n'
  );
  next = next.replace(
    /\s*<script[^>]*id="swv-js"[^>]*><\/script>\s*/g,
    ''
  );
  next = next.replace(
    /\s*<script id="contact-form-7-js-before">[\s\S]*?<\/script>\s*<script[^>]*id="contact-form-7-js"[^>]*><\/script>\s*/g,
    '\n'
  );

  // Contact page self-link to live www → local home
  next = next.replace(
    /<a href="https?:\/\/(?:www\.)?actskids\.org\/?">www\.actskids\.org<\/a>/g,
    `<a href="${prefix}index.html">actskids.org</a>`
  );

  return next;
}

let changed = 0;
for (const file of walk(SITE_DIR)) {
  if (file.includes(`${path.sep}feed${path.sep}`)) continue;
  const original = fs.readFileSync(file, 'utf8');
  const updated = harden(original, file);
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed += 1;
    console.log('Updated:', path.relative(SITE_DIR, file));
  }
}

const leftovers = [];
for (const file of walk(SITE_DIR)) {
  if (file.includes(`${path.sep}feed${path.sep}`)) continue;
  const html = fs.readFileSync(file, 'utf8');
  if (
    /contact-form-7-js|wpcf7\s*=|xmlrpc\.php|api\.w\.org|_wca\.push|stats\.wp\.com|content="WordPress|content="WooCommerce/.test(
      html
    )
  ) {
    leftovers.push(path.relative(SITE_DIR, file));
  }
}

console.log(`\nDone. Updated ${changed} file(s).`);
if (leftovers.length) {
  console.log(`Warning: ${leftovers.length} file(s) still have WP runtime leftovers:`);
  leftovers.slice(0, 20).forEach((f) => console.log(' -', f));
  process.exit(1);
}
console.log('No CF7 / xmlrpc / WP analytics leftovers in pages.');
