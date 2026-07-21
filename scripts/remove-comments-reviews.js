#!/usr/bin/env node
/**
 * Remove comment / review UI from the static mirror.
 *
 * Forms post to live WordPress (wp-comments-post.php) and cannot work locally
 * or on staging. Keeps post content; strips leave-a-comment and product reviews.
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

function stripPostComments(html) {
  // News/single posts: anchor + .comments block through end marker
  return html.replace(
    /\s*<a name="comments"><\/a>\s*<div class="comments">[\s\S]*?<!-- end #comments -->\s*/g,
    '\n'
  );
}

function stripProductReviews(html) {
  let next = html;
  // Reviews tab in product tab list
  next = next.replace(
    /\s*<li role="presentation" class="reviews_tab"[^>]*>[\s\S]*?<\/li>\s*/g,
    '\n'
  );
  // Reviews panel
  next = next.replace(
    /\s*<div class="woocommerce-Tabs-panel woocommerce-Tabs-panel--reviews[\s\S]*?<\/div>\s*<div class="clear"><\/div>\s*<\/div>\s*<\/div>\s*/g,
    '\n'
  );
  return next;
}

function stripCommentReplyScript(html) {
  return html.replace(
    /\s*<script[^>]*id="comment-reply-js"[^>]*><\/script>/g,
    ''
  );
}

function stripCommentsFeedLink(html) {
  return html.replace(
    /\s*<link rel="alternate" type="application\/rss\+xml" title="[^"]*Comments Feed"[^>]*>\s*/g,
    '\n'
  );
}

let changed = 0;
const summary = { posts: 0, product: 0, scripts: 0, feeds: 0 };

for (const file of walk(SITE_DIR)) {
  const original = fs.readFileSync(file, 'utf8');
  let updated = original;

  const beforePosts = updated;
  updated = stripPostComments(updated);
  if (updated !== beforePosts) summary.posts += 1;

  const beforeProduct = updated;
  updated = stripProductReviews(updated);
  if (updated !== beforeProduct) summary.product += 1;

  const beforeScripts = updated;
  updated = stripCommentReplyScript(updated);
  if (updated !== beforeScripts) summary.scripts += 1;

  const beforeFeeds = updated;
  updated = stripCommentsFeedLink(updated);
  if (updated !== beforeFeeds) summary.feeds += 1;

  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed += 1;
    console.log('Updated:', path.relative(SITE_DIR, file));
  }
}

const leftovers = [];
for (const file of walk(SITE_DIR)) {
  const html = fs.readFileSync(file, 'utf8');
  if (
    /wp-comments-post\.php|id="commentform"|Leave a Comment|Be the first to review|reviews_tab|comment-reply-js/.test(
      html
    )
  ) {
    leftovers.push(path.relative(SITE_DIR, file));
  }
}

console.log(`\nDone. Updated ${changed} file(s).`);
console.log('Summary:', summary);
if (leftovers.length) {
  console.log(`Warning: ${leftovers.length} file(s) still have comment/review UI:`);
  leftovers.forEach((f) => console.log(' -', f));
  process.exit(1);
}
