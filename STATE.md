# STATE — Kumo Sushi & Ramen site

Last updated: 2026-07-14. Handoff doc: architecture pointer, open threads, ownership rules, traps.

## Architecture in one paragraph

Eleventy renders `src/_data/*.json` through Nunjucks templates into flat HTML in `_site/`. Hand-written CSS with design tokens (`src/css/main.css` top block). Three small deferred scripts: `main.js` (nav, delegated analytics, lazy social feed), `tray.js` (build-a-meal cart in localStorage + share), `checkout-stripe.js` (dormant). Deploy via GitHub Actions to Pages, path-prefix aware (`PATH_PREFIX` env). CMS is an editing layer only — the site builds fine without it.

## Design concept

"Dinner at a samurai's table" — light washi-paper base (`--paper`), sumi charcoal panels/borders (`--charcoal`), ember-orange accent (`--ember`) as the fire in the charcoal, gold (`--gold`) for borders/decoration only (fails AA as text on paper — do not use it for text). Display face: Zen Old Mincho; body: Inter. The 雲 (kumo = cloud) kanji is the brand mark.

## Open threads / TECH DEBT

1. **Menu accuracy (user-flagged).** Menu data was transcribed from the DoorDash listing (July 2026), which "may be wrong or have upcharges." The in-store sushi-roll board photo shows different prices AND rolls not in the data (Crunch Roll $13.99, Philadelphia $14.99, Salmon $11.99, Tuna Avocado/Cucumber $10.99, Mexican/Tiger/Rainbow $16.99, Alaska $14.99, Deep Fried California $15.99, etc.). **Reconcile with the owners before promoting the site.** In-store board also offers "fresh or aburi, no extra charge" — captured as the Rolls section note.
2. **Ramen has no prices.** The DoorDash export weirdly contains no ramen section, yet ramen is the headline product. Two bowls (tonkotsu, shoyu) are listed with "Call for today's price." Get the real ramen menu + prices from the owners. (Note: reviews say "Tonkatsu ramen" — assumed to mean tonkotsu, the pork-bone broth; katsu is the cutlet. Verify the house spelling.)
3. **Hours are unverified.** Web sources conflated this Kumo with an unrelated "kumo sushi and ramen" in Cumming, GA (kumosushiandramen.com — NOT this restaurant). Hours currently render "Call to confirm" for every day. Phone (360) 602-0222 IS verified (Kitsap Eats). Get real hours, set `hours.verified: true`.
4. **DoorDash link is a search deep-link**, not the store page (`ordering.doordashUrl` in site.json). Find the exact Port Orchard store URL and replace.
5. **Social links empty** (`site.json → social`). Footer hides them until filled.
6. **Review quotes are paraphrased** from the research summary of Google reviews, not verbatim pulls. Replace with exact quotes (with permission/attribution) before launch.
7. **Social feed posts are placeholder fiction** (`social.json`) written to demo the lazy-load card. MUST be replaced with real, permissioned posts before launch. The feed loads from `/data/social-feed.json` only when a visitor clicks the card — swap in a real aggregation later without touching the page.
8. **Photos.** No real photography yet; signature cards use kanji-on-charcoal art tiles. Owner wants high-res user-generated photos from social (get permission per post). Data schema already has `image` fields on social posts; add an `image` field to menu items when photos arrive (remember: model the field in `admin/config.yml` at the same time, or the CMS will delete it on save).
9. **Stripe checkout is scaffolding only.** `checkout-stripe.js` documents the full go-live path: needs a Cloudflare Worker that creates Checkout Sessions server-side and re-prices the tray from menu.json (never trust client prices). Flag: `site.json → ordering.stripeEnabled`.
10. **CMS not yet connected.** `admin/config.yml` has `repo: OWNER/REPO` placeholder; needs the GitHub repo name + an OAuth worker. Until then /admin/ won't authenticate — the site itself is unaffected.
11. **No GitHub remote yet.** Repo is local-only. To go live: create GitHub repo → push → enable Pages (Actions source) → workflow deploys. `PATH_PREFIX` handles the `/repo-name/` sub-path automatically; when a custom domain lands, set it to `/`.

## Ownership rules

- Every `src/_data/*.json` file is **human-owned** (CMS/hand edits). No sync scripts exist yet; if one is added later (e.g. review sync), it gets its own file — never let two writers touch one file.
- `admin/config.yml` must mirror the JSON shape exactly — model every key. After changing it, deploy and **reload /admin/** before saving content.

## Traps (project-specific)

- Gold (`--gold`) as text on paper fails contrast — borders/decorative only.
- `menu-nav` sticky offset assumes header height (~57px); if the header grows, adjust `.menu-nav { top }` and `.menu-section { scroll-margin-top }`.
- Menu item `id`s are cart keys (localStorage `kumo-tray-v1`) — renaming an id orphans it from saved trays (harmless: stored name/price still render; totals still work).
- The social feed fetch respects `PATH_PREFIX` via `window.KUMO.pathPrefix` — don't hardcode `/data/social-feed.json` anywhere else.

## Verification done (2026-07-14)

- Clean build, all pages render from data.
- Contrast checked for every text/background token pair used (script in scratch, results in build log): all ≥ 4.5:1 body / 3:1 large.
- Narrow-width (320px) no horizontal scroll; nav collapses at 900px.
- Tray: add/increment/remove/clear/persist verified in browser; share panel and copy fallback verified; Stripe button confirmed disabled.
- Lazy feed: no network request until card clicked; renders posts after.
