#!/usr/bin/env node
/**
 * Remove Shoes for Students page, nav links, homepage column, and donation section.
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

function stripShoes(html) {
  let next = html;

  // Donation submenu: collapse to single Donation/Support link
  next = next.replace(
    /<li id="menu-item-52" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-has-children menu-item-52"><a href="([^"]*donation\/index\.html)">Donation\/Support<\/a>\s*<ul class="sub-menu">\s*<li id="menu-item-241"[^>]*><a href="[^"]*shoes-for-students[^"]*">Shoes for Students<\/a><\/li>\s*<\/ul>\s*<\/li>/g,
    '<li id="menu-item-52" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-52"><a href="$1">Donation/Support</a></li>'
  );

  // Any remaining shoes-for-students menu items
  next = next.replace(
    /\s*<li id="menu-item-241" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-241"><a href="[^"]*shoes-for-students[^"]*">Shoes for Students<\/a><\/li>/g,
    ''
  );

  // Homepage third widget column (Shoes for Students)
  next = next.replace(
    /\s*<!-- Third Widget Area -->\s*<div class="grid_4 third-home-widget-area">\s*<aside id="text-9" class="widget widget_text">[\s\S]*?<\/aside>\s*<\/div>/g,
    '\n'
  );

  // Donation page shoes section (handles both >> and &gt;&gt;)
  next = next.replace(
    /<h3>Shoes for Students<\/h3>\s*<p>Please join ACTS effort to put new shoes on each of the 402 kids enrolled in our two Ethiopian schools\. Just \$15 buys a pair of shoes that adjusts to grow as the child does!<\/p>\s*<p><a href="[^"]*shoes-for-students[^"]*">Learn more (?:&gt;&gt;|>>)<\/a><\/p>\s*/g,
    ''
  );

  // Historical blog paragraphs devoted to shoe drives
  next = next.replace(
    /<p>Shoes we had previously collected and sent were a big hit as many children are without footwear\. Any monies that are collected for the Christmas meal beyond what is needed for the feeding will be used to purchase additional shoes\.<\/p>\s*/g,
    ''
  );
  next = next.replace(
    /<p>We currently have eight boxes of shoes in our garage\. Each weighs about fifty pounds and contains fifty pairs of shoes\. Somehow or another, we plan to take those with us when we go and to distribute a pair to each of the current students\. Our heartfelt thanks goes to each of you who contributed either monetarily or through prayer to make this possible\. We can’t wait to see the excitement on the children’s faces when they receive this gift\.<\/p>\s*/g,
    ''
  );
  next = next.replace(
    /<p>From time to time some of you ask about sending a gift to your child or children\. We sometimes try to discourage this as giving one or two children something that the others don’t get can cause unhappiness and\/or jealousy\. Karen has recently been working with an organization called Because International\. They manufacture a product that is called, the shoe that grows\. The shoes are durable and adjustable so can be continually worn as the child’s foot grows\. While our budget does not allow us to purchase shoes for each child, we thought that a new pair of shoes would be a wonderful Christmas gift if enough sponsors were interested in donating towards this gift idea\. If shoes are purchased in bulk \(100 pair or more\) the cost is \$15 per pair\.<\/p>\s*/g,
    ''
  );
  next = next.replace(
    /<p><a href="[^"]*acts-photo2\.jpg"><img[^>]*\/><\/a>A few years ago, ACTS was able to provide a new pair of shoes for each child in the program\.[\s\S]*?making a donation instead\?<\/p>\s*/g,
    ''
  );

  // Winter newsletter: remove CROCS shoes sentence within a larger paragraph
  next = next.replace(
    /CROCS has sent us one hundred pairs of shoes to take to the kids\. A little girl told/g,
    'A little girl told'
  );

  // Children page rewrite: remove shoe distributions mention
  next = next.replace(
    /Visits from guests, shoe distributions, and “new uniform” days/g,
    'Visits from guests and “new uniform” days'
  );

  // Any remaining links to shoes-for-students page
  next = next.replace(
    /<p><a href="[^"]*shoes-for-students[^"]*">Learn more &gt;&gt;<\/a><\/p>\s*/g,
    ''
  );

  return next;
}

let changed = 0;
for (const file of walk(SITE_DIR)) {
  if (file.includes(`${path.sep}shoes-for-students${path.sep}`)) continue;

  const original = fs.readFileSync(file, 'utf8');
  if (!/shoes-for-students|Shoes for Students|shoe distributions|\bshoes?\b/i.test(original)) continue;

  const updated = stripShoes(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed += 1;
    console.log('Updated:', path.relative(SITE_DIR, file));
  }
}

// Delete shoes-for-students page directory
const shoesDir = path.join(SITE_DIR, 'donation', 'shoes-for-students');
if (fs.existsSync(shoesDir)) {
  fs.rmSync(shoesDir, { recursive: true, force: true });
  console.log('Deleted:', path.relative(SITE_DIR, shoesDir));
}

const remaining = walk(SITE_DIR).filter((f) => {
  if (f.includes(`${path.sep}shoes-for-students${path.sep}`)) return true;
  const content = fs.readFileSync(f, 'utf8');
  return /shoes-for-students|Shoes for Students/i.test(content);
});

console.log(`\nDone. Updated ${changed} file(s).`);
if (remaining.length) {
  console.log(`Note: ${remaining.length} file(s) still mention shoes (likely historical blog/archive content):`);
  remaining.slice(0, 15).forEach((f) => console.log(' -', path.relative(SITE_DIR, f)));
  if (remaining.length > 15) console.log(` ... and ${remaining.length - 15} more`);
}
