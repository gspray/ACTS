#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'site');
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function isInsideAnchor(html, index) {
  const before = html.slice(0, index);
  const lastOpen = before.lastIndexOf('<a ');
  const lastClose = before.lastIndexOf('</a>');
  return lastOpen > lastClose;
}

function isInsideMailto(html, index, email) {
  const before = html.slice(Math.max(0, index - 30), index + email.length);
  return before.includes(`mailto:${email}`);
}

function linkifyEmails(html) {
  let next = html;

  // Footer / widget contact pattern
  next = next.replace(
    /(<span class="email">\s*)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\s*<\/span>)/g,
    '$1<a href="mailto:$2">$2</a>$3'
  );

  // Any remaining bare email addresses in HTML
  let result = '';
  let lastIndex = 0;
  let match;
  EMAIL_RE.lastIndex = 0;
  while ((match = EMAIL_RE.exec(next)) !== null) {
    const email = match[0];
    const index = match.index;
    result += next.slice(lastIndex, index);

    if (isInsideAnchor(next, index) || isInsideMailto(next, index, email)) {
      result += email;
    } else {
      result += `<a href="mailto:${email}">${email}</a>`;
    }

    lastIndex = index + email.length;
  }
  result += next.slice(lastIndex);
  return result;
}

let changed = 0;
for (const file of walk(SITE_DIR)) {
  const original = fs.readFileSync(file, 'utf8');
  if (!EMAIL_RE.test(original)) continue;
  EMAIL_RE.lastIndex = 0;
  const updated = linkifyEmails(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed++;
  }
}

console.log(`Updated ${changed} file(s).`);

const remaining = [];
for (const file of walk(SITE_DIR)) {
  const html = fs.readFileSync(file, 'utf8');
  let match;
  EMAIL_RE.lastIndex = 0;
  while ((match = EMAIL_RE.exec(html)) !== null) {
    if (!isInsideAnchor(html, match.index) && !isInsideMailto(html, match.index, match[0])) {
      remaining.push(`${path.relative(SITE_DIR, file)}:${match[0]}`);
      break;
    }
  }
}
if (remaining.length) {
  console.log('Plain emails still found:');
  remaining.forEach((line) => console.log(' -', line));
}
