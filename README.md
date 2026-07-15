# Kumo Sushi & Ramen — Port Orchard

Static marketing + menu site for [Kumo Sushi & Ramen](https://kitsapeats.com/directory/kumo-sushi-ramen-port-orchard/), 1734 Village Ln SE A, Port Orchard, WA.

Built with Eleventy, hand-written CSS, and vanilla JS — no framework, no database, no runtime. Content lives in `src/_data/*.json` and is editable through Sveltia CMS at `/admin/` once hosting is wired up.

## Develop

```bash
npm install
npm run serve     # dev server at http://localhost:8080
npm run build     # output to _site/
```

## Where things live

| Path | What |
|---|---|
| `src/_data/site.json` | Name, address, phone, hours, ordering links, social, analytics ID |
| `src/_data/menu.json` | The full menu (sections → dishes) |
| `src/_data/reviews.json` | Curated review cards |
| `src/_data/social.json` | Curated posts for the lazy-loaded social feed |
| `src/css/main.css` | All styling; design tokens at the top |
| `src/js/tray.js` | "Your Tray" build-a-meal cart + social sharing |
| `src/js/checkout-stripe.js` | **Dormant** Stripe scaffolding — not live |
| `src/admin/` | Sveltia CMS (needs repo + OAuth worker, see STATE.md) |
| `docs/ANALYTICS.md` | GA4 tagging handoff — event map, key events, GA setup |

See **STATE.md** for open threads, unverified data, and the go-live checklist.
