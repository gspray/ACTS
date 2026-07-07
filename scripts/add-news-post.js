#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POST_DIR = path.join(ROOT, 'site/2026/04/21/acts-ethiopia-update-from-woja-school');
const POST_FILE = path.join(POST_DIR, 'index.html');
const NEWS_FILE = path.join(ROOT, 'site/news/index.html');

const TITLE = 'ACTS Ethiopia Update from Woja School';
const SLUG = 'acts-ethiopia-update-from-woja-school';
const POST_ID = '360';
const DATE_ISO = '2026-04-21T08:57:00-04:00';
const DATE_DISPLAY = 'April 21, 2026 at 8:57 am';
const IMG = '../../../../wp-content/uploads/2026/04';

const CONTENT = `
<p class="wp-block-paragraph">We were so encouraged to receive this letter from the Woja Community.</p>

<p class="wp-block-paragraph"><strong>Dear ACTS Family and Generous Donors,</strong></p>

<p class="wp-block-paragraph">Warm greetings to you all, and heartfelt thanks from the Woja community. We are deeply grateful for your sacrificial giving toward the solar project at our school. What you have made possible is far greater than infrastructure—it is transformation, hope, and light in a place that has known darkness for a very long time.</p>

<h3>A Green and Growing Environment</h3>
<p class="wp-block-paragraph">From the beginning, we have been committed not only to education but also to stewardship. We have planted many trees across the compound, created a green, shaded environment for children, and used hand pumps to water and sustain plant life. Now, the school stands as a living example of harmony between education and environmental care.</p>

<p class="wp-block-paragraph"><img class="aligncenter size-full" src="${IMG}/woja-green-campus.jpeg" alt="Green campus at Woja School" style="max-width:100%;height:auto;" /></p>

<h3>Recognition and Impact</h3>
<p class="wp-block-paragraph">Because of these efforts, the project has been officially recognized by local authorities. We were awarded a certificate honoring the significant contribution made toward community development, environmental responsibility, and educational advancement. Local administrators now point to this project as a model for others to follow.</p>

<p class="wp-block-paragraph"><img class="aligncenter size-full" src="${IMG}/woja-certificate.jpeg" alt="Certificate of recognition for the Woja solar project" style="max-width:100%;height:auto;" /></p>

<h3>A Light in the Darkness</h3>
<p class="wp-block-paragraph">On the very day the solar system was installed, something unforgettable happened. That evening, for the first time in memory, light filled the darkness of Woja. This village, long affected by ethnic conflict, is used to associating unusual events with danger. When the bright light suddenly appeared, many feared the worst—that conflict had broken out again.</p>

<p class="wp-block-paragraph">A local official, four kilometers away, urgently called Tesfaye to ask what had happened. When he learned that it was not conflict, but light from a new solar installation, there was great relief. That night marked a turning point: light replaced fear, and peace replaced suspicion.</p>

<p class="wp-block-paragraph"><img class="aligncenter size-full" src="${IMG}/woja-solar-installation.jpeg" alt="Solar installation at Woja School" style="max-width:100%;height:auto;" /></p>

<h3>Serving the Community Beyond the Classroom</h3>
<p class="wp-block-paragraph">The impact of the solar project has gone far beyond lighting. Our school has become a place of daily blessing for the community. Villagers now come to charge their mobile phones, children receive warm meals prepared efficiently, and the school serves as a center of life and connection. For many, even charging a phone is not a small thing—it is access to communication, opportunity, and connection to the wider world.</p>

<p class="wp-block-paragraph"><img class="aligncenter size-full" src="${IMG}/woja-phone-charging.jpeg" alt="Community members charging phones at the school" style="max-width:100%;height:auto;" /></p>

<h3>Clean Energy Replacing Firewood</h3>
<p class="wp-block-paragraph">Previously, cooking for over 250 children required large amounts of firewood, contributing to deforestation and environmental strain. Because of your generosity, solar energy is now being used for cooking, fewer trees are being cut down, and the environment is being protected. This was a long-awaited vision—especially encouraged by Bill, whose heart for creation care has shaped our direction. Today, that vision is reality.</p>

<p class="wp-block-paragraph"><img class="aligncenter size-full" src="${IMG}/woja-solar-cooking.jpeg" alt="Solar-powered cooking at Woja School" style="max-width:100%;height:auto;" /></p>

<h3>Looking Ahead with Hope</h3>
<p class="wp-block-paragraph">In a country often described as having “13 months of sunshine,” solar energy offers a consistent and sustainable future. Looking ahead, we hope to expand evening classes for adults, computer literacy programs for youth, and greater access to education and technology. These dreams are now possible because the foundation has been laid—through your generosity.</p>

<h3>Final Words of Gratitude</h3>
<p class="wp-block-paragraph">Dear ACTS family, thank you for believing in this vision and standing with us. Your support has brought light where there was darkness, peace where there was fear, sustainability where there was strain, and opportunity where there was limitation.</p>

<p class="wp-block-paragraph">We extend special thanks to Bill and Karen for their encouragement, vision, and faithful leadership in the ministry of ACTS. Your guidance has not only shaped this project but has inspired a whole community toward a better future.</p>

<p class="wp-block-paragraph"><em>May God richly bless you all.<br />With deep gratitude,<br />The Woja School Community</em></p>

<p class="wp-block-paragraph">Please prayerfully consider <a href="../../../../donation/index.html">sponsoring a child for just $30 per month</a> or making a one-time donation to ACTS work bringing the name of Jesus to those who have yet to hear.</p>

<p class="wp-block-paragraph"><em>Romans 10:15a — Thank you for being a sender!</em></p>
`.trim();

let html = fs.readFileSync(POST_FILE, 'utf8');

html = html
  .replace(/Blessings Dear Friends of ACTS/g, TITLE)
  .replace(/blessings-dear-friends-of-acts/g, SLUG)
  .replace(/post-352/g, `post-${POST_ID}`)
  .replace(/postid-352/g, `postid-${POST_ID}`)
  .replace(/posts\/352/g, `posts/${POST_ID}`)
  .replace(/2025-11-04T19:32:20-05:00/g, DATE_ISO)
  .replace(/November 4, 2025 at 7:32 pm/g, DATE_DISPLAY)
  .replace(/2025\/11\/04\/blessings-dear-friends-of-acts/g, '2026/04/21/acts-ethiopia-update-from-woja-school')
  .replace(/value='352'/g, `value='${POST_ID}'`)
  .replace(/<div class="long-description">[\s\S]*?<\/div>\s*\n\s*\n\s*<div class="clear"><\/div>\s*\n\s*<div class="entry-meta-press">/, `<div class="long-description">\n\t\t\t\t\n${CONTENT}\n\t\t\t\t\t\t\t</div>\n\n\t\t\t\n\t\t\t<div class="clear"><\/div>\n\t\t\t\n\t\t\t<div class="entry-meta-press">`);

fs.writeFileSync(POST_FILE, html);

const excerpt = 'We were so encouraged to receive this letter from the Woja Community. Warm greetings and heartfelt thanks for your sacrificial giving toward the solar project at our school. What you have made possible is transformation, hope, and light in a place that has known darkness for a very long time...';

const listing = `\t\t\t\t\t\t\t<article id="post-${POST_ID}" class="list post-${POST_ID} post type-post status-publish format-standard hentry category-uncategorized">
\t\t<div class="short-content">
\t\t\t
\t\t\t\t\t\t
\t\t\t<h1 class="entry-header">
\t\t\t\t<a title="${TITLE}" href="../2026/04/21/acts-ethiopia-update-from-woja-school/index.html">${TITLE}</a>
\t\t\t</h1>
\t\t\t<div class="short-description">
\t\t\t\t<p>${excerpt}</p>
\t\t\t\t\t\t\t</div>

\t\t\t<div class="entry-meta">
\t\t\t\t<!-- Date -->
\t\t\t\t\t\t\t\t\t<time datetime="${DATE_ISO}">
\t\t\t\t\t\t<a class="buttons time fleft" href="../2026/04/21/acts-ethiopia-update-from-woja-school/index.html"><i class="icon-calendar"></i> ${DATE_DISPLAY}</a>
\t\t\t\t\t</time>
\t\t\t\t
\t\t\t\t<!-- Author -->
\t\t\t\t\t\t\t\t\t<a class="buttons author fleft" href="../author/tatecornell-karengmail-com/index.html"><i class="icon-user"></i> Karen Cornell</a> 
\t\t\t\t\t\t\t\t
\t\t\t\t<a class="buttons fright" href="../2026/04/21/acts-ethiopia-update-from-woja-school/index.html" title="read more">read more</a>
\t\t\t</div>
\t\t\t<div class="clear"></div>

\t\t</div>
\t\t<div class="clear"></div>
\t</article>
\t
\t\t\t\t\t\t\t\t\t\t`;

let news = fs.readFileSync(NEWS_FILE, 'utf8');
const marker = '<article id="post-352"';
if (!news.includes(marker)) throw new Error('News index marker not found');
if (news.includes('acts-ethiopia-update-from-woja-school')) {
  console.log('News listing already present.');
} else {
  news = news.replace(marker, listing + marker);
  fs.writeFileSync(NEWS_FILE, news);
}

console.log('Created post:', POST_FILE);
console.log('Updated news index');
