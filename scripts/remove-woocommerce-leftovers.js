#!/usr/bin/env node
/**
 * Remove non-functional WooCommerce leftovers from the static mirror.
 *
 * Book purchases go to Amazon; cart/checkout/AJAX cannot work without WordPress.
 * Keeps product/shop browse pages and Amazon.com links.
 */
const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'site');
const AMAZON_URL = 'https://www.amazon.com/dp/163357069X';

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function stripCartIcon(html) {
  return html.replace(
    /\s*<!-- Display the shopping cart if WooCommerce is active -->\s*<li class="shopping-cart">\s*<a class="cart-contents"[^>]*>[\s\S]*?<\/a>\s*<\/li>\s*/g,
    '\n'
  );
}

function stripCartScripts(html) {
  let next = html;

  // Head: blockUI, add-to-cart (+ extra), cookies, woocommerce core (+ extra), analytics
  next = next.replace(
    /\s*<script[^>]*id="wc-jquery-blockui-js"[^>]*><\/script>/g,
    ''
  );
  next = next.replace(
    /\s*<script id="wc-add-to-cart-js-extra">[\s\S]*?<\/script>\s*<script[^>]*id="wc-add-to-cart-js"[^>]*><\/script>/g,
    ''
  );
  next = next.replace(
    /\s*<script[^>]*id="wc-js-cookie-js"[^>]*><\/script>/g,
    ''
  );
  next = next.replace(
    /\s*<script id="woocommerce-js-extra">[\s\S]*?<\/script>\s*<script[^>]*id="woocommerce-js"[^>]*><\/script>/g,
    ''
  );
  next = next.replace(
    /\s*<script[^>]*id="woocommerce-analytics-js"[^>]*><\/script>/g,
    ''
  );

  // Product-only single-product scripts (gallery JS); opacity fixed separately
  next = next.replace(
    /\s*<script id="wc-single-product-js-extra">[\s\S]*?<\/script>\s*<script[^>]*id="wc-single-product-js"[^>]*><\/script>/g,
    ''
  );

  // Footer: sourcebuster + order attribution (hits live admin-ajax)
  next = next.replace(
    /\s*<script[^>]*id="sourcebuster-js-js"[^>]*><\/script>\s*<script id="wc-order-attribution-js-extra">[\s\S]*?<\/script>\s*<script[^>]*id="wc-order-attribution-js"[^>]*><\/script>/g,
    ''
  );

  return next;
}

function stripAddToCartForm(html) {
  // Single-product quantity + Add to cart form
  return html.replace(
    /\s*<form class="cart"[^>]*>[\s\S]*?<\/form>\s*/g,
    '\n'
  );
}

function stripLoopAddToCart(html) {
  // Shop / category loop "Add to cart" AJAX buttons + screen-reader span
  return html.replace(
    /<a [^>]*class="[^"]*add_to_cart_button[^"]*"[^>]*>Add to cart<\/a>\s*<span id="woocommerce_loop_add_to_cart_link_describedby_\d+"[^>]*>\s*<\/span>/g,
    ''
  );
}

function stripShopOrdering(html) {
  // Non-functional sort form (includes hidden add-to-cart)
  return html.replace(
    /\s*<form class="woocommerce-ordering"[^>]*>[\s\S]*?<\/form>\s*/g,
    '\n'
  );
}

function fixProductGalleryVisibility(html) {
  // Gallery starts hidden; single-product.js normally reveals it.
  return html.replace(
    /style="opacity:\s*0;\s*transition:\s*opacity\s*\.25s\s*ease-in-out;"/g,
    'style="opacity: 1;"'
  );
}

function stripCartPageScripts(html) {
  let next = html;
  next = next.replace(
    /\s*<script id="wc-country-select-js-extra">[\s\S]*?<\/script>\s*<script[^>]*id="wc-country-select-js"[^>]*><\/script>/g,
    ''
  );
  next = next.replace(
    /\s*<script id="wc-address-i18n-js-extra">[\s\S]*?<\/script>\s*<script[^>]*id="wc-address-i18n-js"[^>]*><\/script>/g,
    ''
  );
  next = next.replace(
    /\s*<script id="wc-cart-js-extra">[\s\S]*?<\/script>\s*<script[^>]*id="wc-cart-js"[^>]*><\/script>/g,
    ''
  );
  next = next.replace(
    /\s*<script id="wc-password-strength-meter-js-extra">[\s\S]*?<\/script>\s*<script[^>]*id="wc-password-strength-meter-js"[^>]*><\/script>/g,
    ''
  );
  next = next.replace(
    /\s*<script id="zxcvbn-async-js-extra">[\s\S]*?<\/script>\s*<script[^>]*id="zxcvbn-async-js"[^>]*><\/script>/g,
    ''
  );
  next = next.replace(
    /\s*<script id="password-strength-meter-js-extra">[\s\S]*?<\/script>\s*<script[^>]*id="password-strength-meter-js"[^>]*><\/script>/g,
    ''
  );
  return next;
}

function rewriteCartPage(html, file) {
  if (!file.endsWith(`${path.sep}cart${path.sep}index.html`)) return html;

  const amazonBlock = `<div class="woocommerce"><div class="cart-empty woocommerce-info" role="status">
		This site no longer uses an on-site shopping cart. You can order <em>Tell the Whole World That I Am Real</em> on <a href="${AMAZON_URL}" target="_blank" rel="noopener noreferrer">Amazon.com</a>.
	</div>
	<p class="return-to-shop">
		<a class="button wc-backward" href="../product/tell-the-whole-world-that-i-am-real/index.html">View book details</a>
	</p>
</div>`;

  return html.replace(
    /<div class="woocommerce"><div class="wc-empty-cart-message">[\s\S]*?<\/div>\s*<p class="return-to-shop">[\s\S]*?<\/p>\s*<\/div>/,
    amazonBlock
  );
}

let changed = 0;
const summary = {
  cartIcon: 0,
  scripts: 0,
  addToCartForm: 0,
  loopAddToCart: 0,
  ordering: 0,
  gallery: 0,
  cartPage: 0,
};

for (const file of walk(SITE_DIR)) {
  const original = fs.readFileSync(file, 'utf8');
  let updated = original;

  const beforeIcon = updated;
  updated = stripCartIcon(updated);
  if (updated !== beforeIcon) summary.cartIcon += 1;

  const beforeScripts = updated;
  updated = stripCartScripts(updated);
  if (updated !== beforeScripts) summary.scripts += 1;

  const beforeForm = updated;
  updated = stripAddToCartForm(updated);
  if (updated !== beforeForm) summary.addToCartForm += 1;

  const beforeLoop = updated;
  updated = stripLoopAddToCart(updated);
  if (updated !== beforeLoop) summary.loopAddToCart += 1;

  const beforeOrder = updated;
  updated = stripShopOrdering(updated);
  if (updated !== beforeOrder) summary.ordering += 1;

  const beforeGallery = updated;
  updated = fixProductGalleryVisibility(updated);
  if (updated !== beforeGallery) summary.gallery += 1;

  const beforeCart = updated;
  updated = rewriteCartPage(updated, file);
  if (updated !== beforeCart) summary.cartPage += 1;

  if (file.endsWith(`${path.sep}cart${path.sep}index.html`)) {
    const beforeCartScripts = updated;
    updated = stripCartPageScripts(updated);
    if (updated !== beforeCartScripts) summary.scripts += 1;
  }

  if (updated !== original) {
    fs.writeFileSync(file, updated);
    changed += 1;
    console.log('Updated:', path.relative(SITE_DIR, file));
  }
}

const leftovers = [];
for (const file of walk(SITE_DIR)) {
  const html = fs.readFileSync(file, 'utf8');
  if (/class="shopping-cart"|single_add_to_cart_button|ajax_add_to_cart|wc-add-to-cart-js|wc-order-attribution-js/.test(html)) {
    leftovers.push(path.relative(SITE_DIR, file));
  }
}

console.log(`\nDone. Updated ${changed} file(s).`);
console.log('Summary:', summary);
if (leftovers.length) {
  console.log(`Warning: ${leftovers.length} file(s) still have WC leftovers:`);
  leftovers.forEach((f) => console.log(' -', f));
  process.exit(1);
}
