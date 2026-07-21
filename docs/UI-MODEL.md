# ACTS Website — UI Model

Document version: 1.0  
Source: Local mirror of [actskids.org](https://actskids.org/) (`site/`)  
Stack: WordPress + WooCommerce, **Charitas WPL** theme (WPlook)

---

## 1. Purpose

This document describes the current ACTS site UI: information architecture, page templates, reusable components, visual system, and interaction patterns. Use it as the reference for redesigns, content updates, or rebuilding the site outside WordPress.

---

## 2. Global layout shell

Every page shares the same outer structure:

```
#page
├── #toolbar                    (top utility bar, black)
├── header#branding             (logo + primary nav, sticky)
├── [page-specific hero]        (optional)
├── #main.site-main             (primary content)
├── #footer-widget-area
│   └── footer#colophon
│       ├── #tertiary           (widget columns)
│       └── .site-info          (copyright / credits bar)
```

### 2.1 Grid system

- **Framework:** 16-column fluid grid (`grid.css`)
- **Container:** `.container_16` — 92% width, max **1184px**, centered
- **Common column splits:**
  - Header: logo `grid_5` + nav `grid_11`
  - Interior pages: content `grid_11 suffix_1` + sidebar `grid_4`
  - Homepage widgets: four `grid_4` columns
  - Footer widgets: three `grid_4` columns

### 2.2 Responsive behavior

- **Desktop:** full horizontal nav, multi-column layouts
- **Mobile:** MeanMenu collapses `.nav-menu` into `.mob-nav` hamburger menu
- **Breakpoint driver:** theme CSS + `meanmenu.css` (primary collapse ~768px)
- **Viewport meta:** `width=device-width, initial-scale=1, maximum-scale=1`

---

## 3. Information architecture

### 3.1 Primary navigation

| Label | Route | Notes |
|-------|-------|-------|
| Home | `/` | Hero slider + mission + 4 promo cards |
| About ACTS | `/about-acts/` | Static content page |
| Children | `/children/` | Static content page |
| Community Transformation | `/community-transformation/` | Static content page |
| Donation/Support | `/donation/` | Static content page |
| News | `/news/` | Post archive listing |

### 3.2 Secondary / utility navigation (`#toolbar`)

| Item | Type | Target |
|------|------|--------|
| Phone | `tel:` link | 559-287-1168 |
| Contact | Icon link | `/contact-us/` |
| Facebook | External | facebook.com/AfricaCommunityTransformationServicesKIDS |
| Donate | Text CTA | `/donation/` |

### 3.3 Additional routes (not in main nav)

| Route | Purpose |
|-------|---------|
| `/community/` | Alternate community landing (linked from homepage widget) |
| `/contact-us/` | Address, phone, email |
| `/tell-the-whole-world-that-i-am-real/` | Book landing page |
| `/product/tell-the-whole-world-that-i-am-real/` | Book product page (Amazon purchase link) |
| `/shop/` | Book listing (browse only; buy via Amazon) |
| `/cart/` | Redirect message → Amazon / product page |
| `/2012/…` – `/2025/…` | Dated blog posts |
| `/category/uncategorized/` | News category archive |
| `/author/*/` | Author archives |

---

## 4. Page templates

### 4.1 Homepage (`template-home-page`)

**Body class:** `page-template-template-home-page`

```
#toolbar
header (logo + nav)
#teaser
  └── .flexslider (4 slides)
#main
  ├── article: Mission Statement (h3 + paragraph)
  └── 4 × widget cards (grid_4 each)
#footer
```

**Hero slider slides:**

| Slide | Image | CTA |
|-------|-------|-----|
| About ACTS | `slider_about2.jpg` | `/about-acts/` |
| Children | `slider_children.jpg` | `/children/` |
| Community Transformation | `slider_community.jpg` | `/community/` |
| Tell the Whole World… | `slider_book.jpg` | `/tell-the-whole-world-that-i-am-real/` |

Each slide: full-bleed image, white `h1` + `h2`, bordered “Learn more” button.

**Homepage widget row (3 cards):**

| Widget title | Image | Link |
|--------------|-------|------|
| Children | `home_children.jpg` | `/children/` |
| Community Transformation | `home_community.jpg` | `/community/` |
| Available Now! | `home_book.jpg` | `/product/tell-the-whole-world-that-i-am-real/` |

### 4.2 Interior static page

Used by: About, Children, Community Transformation, Donation, Contact, etc.

```
#toolbar
header
.teaser-page              (optional image header with page title)
  └── h1.page-title
#main
  #primary.grid_11
    article.single
      .entry-content
        .long-description  (body copy)
  #secondary.grid_4       (sidebar)
    widget: "Available Now!" book promo
#footer
```

**Teaser header variants:**

| Class | Background | Used on |
|-------|------------|---------|
| `.teaser-page` | Full-width image (`hdr_*.jpg`) | Donation, Community Transformation, etc. |
| `.teaser-page-list` | Solid brand color (`#e53b51`) | Contact, blog posts |

### 4.3 News archive (`/news/`)

Same shell as interior page, but `#primary` contains:

```
.widget-title > h3 "Latest posts"
article.list (repeated)
  .short-content
    h1.entry-header > a (post title)
    .short-description (excerpt)
    .entry-meta
      .buttons.time (date)
      .buttons.author
      .buttons.fright "read more"
```

Includes pagination (`.nav-previous` / `.nav-next`).

### 4.4 News single post

```
.teaser-page-list
  h1.page-title (post title)
#main
  #primary.grid_11
    article.single
      .entry-content
        .long-description
      .entry-meta-press
        .share-buttons (Facebook, Twitter, Pinterest)
        time.entry-date
        .category-i
        .author-i
  #secondary.grid_4
    widget: "Available Now!" book promo
```

### 4.5 Donation page (special content)

Sections within `.long-description`:

1. **Child Sponsorship** — $30/month CTA copy
2. **General Donations** — mission-aligned copy + PayPal donate form

PayPal: hosted button (`hosted_button_id=KDP5FDVAHXF82`), image submit button.

### 4.6 WooCommerce pages

Shop and product pages keep WooCommerce markup for layout/price styling only. Purchases go to Amazon (`amazon.com/dp/163357069X`); cart/checkout UI has been removed. Primary button color inherits brand accent (`#e53b51`). Product price color: `#77a464`.

---

## 5. Component catalog

### 5.1 Toolbar (`#toolbar`)

| Property | Value |
|----------|-------|
| Background | `#000000` |
| Layout | Right-aligned `.tb-list` horizontal list |
| Items | Phone, contact icon, social icons, cart icon, donate CTA |
| Donate CTA | White text on brand background, heart icon |

### 5.2 Site header (`#branding`)

| Property | Value |
|----------|-------|
| Logo | `ACTSlogo.png` (~grid_5 width) |
| Nav | `.nav-menu` horizontal links |
| Active state | Brand color text (`#e53b51`) |
| Sticky | `#sticky_navigation` fixed on scroll |
| Submenu | `.sub-menu` dropdown under Donation/Support |

### 5.3 Hero slider (`.flexslider`)

| Property | Value |
|----------|-------|
| Library | FlexSlider (jQuery) |
| Slides | 4 images with thumbnail nav (`data-thumb`) |
| Caption | `.flex-caption` overlay, bottom-left |
| Title | `h1` white, ~30px |
| Subtitle | `h2` white, ~24px |
| CTA | `.flex-button > a.radius` — white text, 1px white border |
| CTA hover | Fills with `#e53b51` |

### 5.4 Widget card (homepage + sidebar)

```
aside.widget.widget_text
  .widget-title
    h3 (section heading, brand color)
  .textwidget
    a > img.aligncenter (225×149 promo image)
    p (description)
    a "Learn more >>"
```

Sidebar variant appears on most interior pages and blog posts.

### 5.5 Content article

| Element | Class | Notes |
|---------|-------|-------|
| Wrapper | `article.single` or `article.list` | Page vs archive item |
| Body | `.entry-content` > `.long-description` | Main prose |
| Images | `.alignleft`, `.alignright`, `.aligncenter` | Float-based |
| Block quotes | `blockquote` | 3px left border, brand color |
| Lists | `ul` / `ol` | Standard indented |

### 5.6 Blog meta buttons (`.buttons`)

Pill-style links with icons:

- `.buttons.time` — calendar icon + date
- `.buttons.author` — user icon + author name
- `.buttons.fright` — “read more” aligned right
- Background: `#e53b51`, white text

### 5.7 Share buttons (`.share-buttons`)

Dropdown on single posts: Facebook, Twitter, Pinterest. Brand background bar.

### 5.8 Footer (`#colophon`)

**Tertiary widgets (2 columns):**

| Column | Widget | Content |
|--------|--------|---------|
| 1 | Contact Us | Address, phone, email (`widget_wplook_address_widget`) |
| 2 | Follow Us | Facebook icon link (`widget_wplooksocial`) |

**Site info bar (`.site-info`):**

| Column | Content |
|--------|---------|
| Left (`grid_16`) | “Copyright © 2026. All Rights reserved.” |

---

## 6. Visual design system

### 6.1 Color palette

| Token | Hex | Usage |
|-------|-----|-------|
| Brand primary | `#e53b51` | Links, headings, buttons, accents, teaser bars |
| Brand primary hover | `#c9253a` | Link hover, tag hover |
| Toolbar / footer bar | `#000000` | Top bar, site-info, mobile menu bar |
| Body background | `#ffffff` | Page canvas |
| Body text | Inherited dark gray | Paragraphs |
| WooCommerce price | `#77a464` | Product prices, sale badge |
| Slider caption text | `#FFFFFF` | Hero overlay text |

### 6.2 Typography

| Role | Family | Size |
|------|--------|------|
| Headings (h1–h6) | Archivo Narrow | h1: 30px, h2: 24px, h3: 22px, h4: 20px, h5: 18px, h6: 16px |
| Body | Arimo | 15px, line-height ~1.5 |
| Lists | Arimo | Square bullets (ul), decimal (ol) |

**Google Fonts import:** Arimo (400, 700) + Archivo Narrow (400, 700)

### 6.3 Iconography

- **Set:** Custom icon font (`customicons/style.css`)
- **Used icons:** `icon-envelope`, `icon-facebook`, `icon-cart3`, `icon-heart`, `icon-angle-right`, `icon-calendar`, `icon-user`, `icon-share`, `icon-folder`, `icon-pinterest`, `icon-twitter`

### 6.4 Imagery conventions

| Asset type | Dimensions | Location |
|------------|------------|----------|
| Homepage card thumbs | 225 × 149 | `uploads/2016/12/home_*.jpg` |
| Hero slides | Full width | `uploads/2016/12/slider_*.jpg` |
| Hero thumbs | Small | `uploads/2016/12/thumb_*.jpg` |
| Page headers | Full width | `uploads/2016/12/hdr_*.jpg` |
| Logo | Auto | `uploads/2017/01/ACTSlogo.png` |
| Favicon | — | `uploads/2016/12/favicon.ico` |
| Blog inline images | Variable | `uploads/YYYY/MM/` |

### 6.5 Spacing & rhythm

- Paragraph bottom margin: `1.5em`
- Widget title separated by `.clear` div (float-clear pattern)
- Content/sidebar gap: `suffix_1` padding on primary column
- Footer columns: equal `grid_4` thirds

---

## 7. Interaction & scripts

| Feature | Library | Trigger |
|---------|---------|---------|
| Hero slider | FlexSlider | Page load, `#teaser` |
| Sticky header | Theme JS | Scroll |
| Mobile menu | MeanMenu | Viewport < ~768px |
| Parallax teaser | Stellar.js | `data-stellar-background-ratio` on `.teaser-page` |
| Share popups | Inline `onclick` | Facebook/Twitter/Pinterest window.open |
| Contact Form 7 | CF7 | Contact forms (if present) |
| PayPal donate | External form POST | Donation page |

---

## 8. Content model (UI-facing)

### 8.1 Recurring content blocks

| Block | Appears on |
|-------|------------|
| Mission Statement | Homepage only |
| “Available Now!” book promo | Sidebar on ~all interior pages |
| Contact address block | Footer + Contact page |
| Facebook follow | Toolbar + footer |

### 8.2 CTA patterns

| Pattern | Example |
|---------|---------|
| `Learn more` + chevron | Hero slider buttons |
| `Learn more >>` | Widget cards, inline links |
| `read more` | Blog archive items |
| `Donate` + heart icon | Toolbar |
| PayPal image button | Donation page |

---

## 9. Page inventory (top-level)

| Page | Template | Sidebar | Hero |
|------|----------|---------|------|
| Home | Home | No | Slider |
| About ACTS | Interior | Yes | Image header |
| Children | Interior | Yes | Image header |
| Community Transformation | Interior | Yes | Image header |
| Community | Interior | Yes | Image header |
| Donation/Support | Interior | Yes | Image header |
| News | Archive | Yes | Slider (same as home) |
| News post | Single | Yes | Color bar + title |
| Contact Us | Interior | Yes | Color bar |
| Book / Product | Interior + WC layout | Yes | Varies |
| Shop | Browse listing | Yes | Varies |
| Cart | Amazon redirect message | No | Color bar |

---

## 10. Known UI quirks (current mirror)

- News page reuses the **homepage slider** instead of a news-specific hero.
- Empty social icon slot in toolbar (placeholder `icon-` with no link).
- Book purchase is via Amazon only; on-site WooCommerce cart/checkout leftovers were removed.
- Comment and product review forms were removed (they posted to live WordPress).
- `community/` and `community-transformation/` are separate routes with overlapping content.
- `og:url` and social share buttons still use `https://actskids.org/...` page URLs (correct after DNS cutover to the static site).
- Contact Form 7 / xmlrpc / WP REST discovery / WP.com analytics scripts were removed for WordPress takedown readiness.
- Local `server.js` returns real 404s for missing assets; directory routes serve each folder’s `index.html`.

---

## 11. File reference map

```
site/
├── index.html                          # Homepage
├── about-acts/index.html
├── children/index.html
├── community-transformation/index.html
├── community/index.html
├── donation/index.html
├── news/index.html
├── contact-us/index.html
├── cart/index.html
├── shop/index.html
├── tell-the-whole-world-that-i-am-real/index.html
├── YYYY/MM/DD/{slug}/index.html        # Blog posts
└── wp-content/
    ├── themes/charitas-wpl/
    │   ├── style.css                   # Main theme styles
    │   └── css/                        # Grid, flexslider, meanmenu, icons
    ├── plugins/woocommerce/            # Shop styles/scripts
    └── uploads/                        # Images and media
```

---

## 12. Suggested usage

- **Content edits:** Modify HTML in `site/` or edit source in WordPress and re-crawl.
- **Design refresh:** Replace tokens in §6; preserve template structure in §4.
- **Rebuild:** Use §3 IA + §5 components as the component spec; grid proportions from §2.1.
