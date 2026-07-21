#!/usr/bin/env node
/**
 * Download missing live-site assets into site/ and rewrite HTML to local URLs.
 *
 * Does NOT run a full page crawl (that would overwrite local customizations).
 * Targets assets still loaded from https://actskids.org so WordPress can be retired.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SITE_DIR = path.join(__dirname, '..', 'site');
const ORIGIN = 'https://actskids.org';

const ASSETS = [
  '/wp-content/uploads/2016/12/hdr_about2.jpg',
  '/wp-content/uploads/2016/12/hdr_book.jpg',
  '/wp-content/uploads/2016/12/hdr_children.jpg',
  '/wp-content/uploads/2016/12/hdr_community.jpg',
  '/wp-content/uploads/2016/12/thumb_about2.jpg',
  '/wp-content/uploads/2016/12/thumb_book.jpg',
  '/wp-content/uploads/2016/12/thumb_children.jpg',
  '/wp-content/uploads/2016/12/thumb_community.jpg',
  '/wp-includes/blocks/gallery/style.min.css',
  '/wp-includes/blocks/group/style.min.css',
  '/wp-includes/blocks/image/style.min.css',
  '/wp-includes/blocks/media-text/style.min.css',
  '/wp-includes/blocks/paragraph/style.min.css',
  '/wp-includes/js/wp-emoji-release.min.js',
  '/wp-includes/js/wp-emoji-loader.min.js',
  '/wp-includes/js/dist/hooks.min.js',
  '/wp-includes/js/dist/i18n.min.js',
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent': 'ACTS-static-mirror-asset-fetch/1.0',
          Accept: '*/*',
        },
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const next = new URL(res.headers.location, url).toString();
          res.resume();
          fetchBuffer(next).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on('error', reject);
  });
}

async function downloadAsset(assetPath) {
  const localFile = path.join(SITE_DIR, assetPath.replace(/^\//, ''));
  if (fs.existsSync(localFile) && fs.statSync(localFile).size > 0) {
    console.log('Exists:', assetPath);
    return { assetPath, skipped: true };
  }
  const url = ORIGIN + assetPath;
  console.log('Fetching:', url);
  const buf = await fetchBuffer(url);
  fs.mkdirSync(path.dirname(localFile), { recursive: true });
  fs.writeFileSync(localFile, buf);
  console.log(`  Saved ${buf.length} bytes → ${path.relative(SITE_DIR, localFile)}`);
  return { assetPath, skipped: false, bytes: buf.length };
}

function depthPrefix(htmlFile) {
  const rel = path.relative(SITE_DIR, htmlFile);
  const depth = rel.split(path.sep).length - 1;
  if (depth <= 0) return './';
  return '../'.repeat(depth);
}

function rewriteHtml(html, htmlFile) {
  const prefix = depthPrefix(htmlFile);
  let next = html;

  // Absolute + protocol-relative asset URLs → local relative
  next = next.replace(
    /(?:https?:)?\/\/(?:www\.)?actskids\.org(\/wp-(?:content|includes)\/[^"'?\s)>]+)/g,
    (_m, assetPath) => {
      const clean = assetPath.split('?')[0];
      return prefix + clean.replace(/^\//, '');
    }
  );

  // Emoji settings JSON may still reference live concatemoji with query string
  next = next.replace(
    /"concatemoji":\s*"[^"]*wp-emoji-release\.min\.js[^"]*"/g,
    (m) => {
      if (m.includes('s.w.org')) return m;
      return `"concatemoji":"${prefix}wp-includes/js/wp-emoji-release.min.js"`;
    }
  );

  return next;
}

async function main() {
  const results = [];
  for (const asset of ASSETS) {
    try {
      results.push(await downloadAsset(asset));
    } catch (err) {
      console.error('FAILED:', asset, err.message);
      process.exitCode = 1;
    }
  }

  let changed = 0;
  for (const file of walk(SITE_DIR)) {
    const original = fs.readFileSync(file, 'utf8');
    if (!/actskids\.org\/wp-(content|includes)\//.test(original)) continue;
    const updated = rewriteHtml(original, file);
    if (updated !== original) {
      fs.writeFileSync(file, updated);
      changed += 1;
      console.log('Rewrote:', path.relative(SITE_DIR, file));
    }
  }

  // Remaining live asset refs (uploads/includes only)
  const leftovers = [];
  for (const file of walk(SITE_DIR)) {
    const html = fs.readFileSync(file, 'utf8');
    const matches = html.match(
      /(?:https?:)?\/\/(?:www\.)?actskids\.org\/wp-(?:content|includes)\/[^"'?\s)>]+/g
    );
    if (matches) {
      leftovers.push({
        file: path.relative(SITE_DIR, file),
        matches: [...new Set(matches)],
      });
    }
  }

  console.log('\nDownload summary:', {
    fetched: results.filter((r) => !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
  });
  console.log(`Rewrote ${changed} HTML file(s).`);

  if (leftovers.length) {
    console.log('Remaining live wp-content/wp-includes refs:');
    leftovers.forEach((l) => {
      console.log(' -', l.file);
      l.matches.forEach((m) => console.log('    ', m));
    });
    process.exitCode = 1;
  } else {
    console.log('No remaining live wp-content/wp-includes asset URLs.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
