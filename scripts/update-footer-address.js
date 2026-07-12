#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'site');

const newBlock = `\t\t\t\t\t<p class="adr">
\t\t\t\t\t\t<span class="footer-address-col">
\t\t\t\t\t\t\t<span class="footer-line"><span class="street-address"> 1547 E Higgins Lake Dr</span></span>
\t\t\t\t\t\t\t<span class="footer-line"><span class="footer-city"><span class="region"> Roscommon, MI</span> <span class="postal-code"> 48653</span> <span class="country-name"> United States</span></span></span>
\t\t\t\t\t\t</span>
\t\t\t\t\t\t<span class="footer-contact-col">
\t\t\t\t\t\t\t<span class="footer-phone"><b>Phone:</b><span class="tel"> 559-287-1168</span></span>
\t\t\t\t\t\t\t<span class="footer-email"><b>E-mail:</b><span class="email"> <a href="mailto:karen@actskids.org">karen@actskids.org</a></span></span>
\t\t\t\t\t\t</span>
\t\t\t\t\t</p>`;

const patterns = [
	/<p class="adr">[\s\S]*?<span class="footer-line">[\s\S]*?<span class="street-address"> 1547 E Higgins Lake Dr<\/span>[\s\S]*?<span class="footer-phone">[\s\S]*?<span class="footer-email">[\s\S]*?<\/p>/g,
	/<p class="adr">[\s\S]*?<span class="street-address"> 1547 E Higgins Lake Dr<\/span>[\s\S]*?<span class="country-name"> United States<\/span>[\s\S]*?<\/p>\s*<b>Phone:<\/b><span class="tel"> 559-287-1168<\/span><br \/>\s*<b>E-mail:<\/b><span class="email"> <a href="mailto:karen@actskids.org">karen@actskids.org<\/a><\/span><br \/>/g,
];

function walk(dir, files = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, files);
		else if (entry.name.endsWith('.html')) files.push(full);
	}
	return files;
}

let changed = 0;
for (const file of walk(SITE_DIR)) {
	const original = fs.readFileSync(file, 'utf8');
	let updated = original;
	for (const re of patterns) {
		re.lastIndex = 0;
		updated = updated.replace(re, newBlock);
	}
	if (updated !== original) {
		fs.writeFileSync(file, updated);
		changed++;
	}
}

console.log(`Updated footer address in ${changed} file(s).`);
