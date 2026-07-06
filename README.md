# ACTS

Local mirror of [actskids.org](https://actskids.org/).

## Structure

```
ACTS/
├── site/               # Mirrored website (generated)
├── scripts/
│   ├── crawl.js        # Deep crawl + asset download
│   └── fetch-homepage.js
├── server.js           # Local static file server
└── package.json
```

## Getting started

Serve the mirrored site:

```bash
cd ~/Projects/ACTS
npm start
```

Then visit http://localhost:3000

## Re-crawl the live site

```bash
npm run crawl
node scripts/fetch-homepage.js   # refresh homepage with local links
```
