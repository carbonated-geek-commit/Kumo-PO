# STATE — Kumo Sushi & Ramen site

Last updated: 2026-07-14. Handoff doc: architecture pointer, open threads, ownership rules, traps.

## Architecture in one paragraph

Eleventy renders `src/_data/*.json` through Nunjucks templates into flat HTML in `_site/`. Hand-written CSS with design tokens (`src/css/main.css` top block). Three small deferred scripts: `main.js` (nav, delegated analytics, lazy social feed), `tray.js` (build-a-meal cart in localStorage + share), `checkout-stripe.js` (dormant). Deploy via GitHub Actions to Pages, path-prefix aware (`PATH_PREFIX` env). CMS is an editing layer only — the site builds fine without it.

## Design concept

"Dinner at a samurai's table" — light washi-paper base (`--paper`), sumi charcoal panels/borders (`--charcoal`), ember-orange accent (`--ember`) as the fire in the charcoal, gold (`--gold`) for borders/decoration only (fails AA as text on paper — do not use it for text). Display face: Zen Old Mincho; body: Inter. The 雲 (kumo = cloud) kanji is the brand mark.

## Open threads / TECH DEBT

1. **RESOLVED (2026-07-14): the original DoorDash menu was the WRONG restaurant.** The first menu draft came from a DoorDash listing that almost certainly belonged to a different Kumo (it contained a "Herndon Roll" — Herndon, VA — plus hibachi/teriyaki/curry sections this kitchen doesn't have). menu.json is now transcribed from photos of the REAL in-store menus: printed menus (photo dates Apr–May 2026) + overhead TV boards (newer, ~Jul 2026). Sections now: Ramen, Bowls, Appetizers & Tempura, Nigiri, Nigiri Sets, Sushi Rolls, Soup, Sake Samplers.
2. **Price drift between menu generations — confirm with owners.** TV boards (newest) raised ramen to $16.99/$17.99 and bowls to $15.99 (used on the site). Printed menus + slate signage (May era) show $14.99/$15.99 ramen, $13.99 bowls, Edamame $4.99 vs TV $6.99. Roll prices come from the slate roll board (the only complete roll source); the TV sushi screen hints rolls also rose ~$1 (e.g. Shrimp Tempura Roll $16.99 vs $14.99 shown). Gyoza/wonton/rangoon piece counts: TV says 6 pc (used), printed said 8 pc. **A 10-minute price check with the owners fixes all of this.**
3. **Hours are unverified.** Web sources conflate this Kumo with an unrelated "kumo sushi and ramen" in Cumming, GA (kumosushiandramen.com — NOT this restaurant). Hours render "Call to confirm" for every day. Phone (360) 602-0222 IS verified (Kitsap Eats). Get real hours, set `hours.verified: true`.
4. **DoorDash link is a search deep-link**, not the store page (`ordering.doordashUrl` in site.json). The store only appears after entering a Port Orchard-area delivery address; grab the exact store URL and replace.
5. **Social links empty** (`site.json → social`). Footer hides them until filled.
6. **Reviews are verbatim quotes** from public Google reviews (June 2026), attributed by name (Justin Countryman, Angelo Carosio, Tacey Whittemore, Mikayla Liles, Laura Gibeau, Christian Ko). The hero tagline "Broth worth every drop" is adapted from Justin's review. Quoting public reviews with attribution is standard practice, but if any reviewer objects, swap the quote in `reviews.json`.
7. **Social feed posts** (`social.json`) are now real Google-review snippets shown in the lazy-loaded card. Replace with Instagram/Facebook posts (with poster permission) once the owners connect accounts. The feed loads from `/data/social-feed.json` only when clicked.
8. **Photos are Google Maps guest/owner uploads** (contributors: Angelo Carosio — tonkotsu; Cynthia Lynn — beef bowl; Justin Countryman — gyoza; Mark Fernald — karaage; plus owner interior/storefront shots). Credited on-site as "Dish photos by Kumo guests on Google Maps." **Get owner + contributor permission before public launch**; originals and full metadata in `C:\Users\corba\Documents\Codex\2026-07-14\can\outputs\KUMO-Sushi-Ramen-Photos\`. Optimized copies live in `src/assets/photos/`.
9. **Stripe checkout is scaffolding only.** `checkout-stripe.js` documents the full go-live path: needs a Cloudflare Worker that creates Checkout Sessions server-side and re-prices the tray from menu.json (never trust client prices). Flag: `site.json → ordering.stripeEnabled`.
10. **CMS not yet connected.** `admin/config.yml` has `repo: OWNER/REPO` placeholder; needs the GitHub repo name + an OAuth worker. Until then /admin/ won't authenticate — the site itself is unaffected.
11. **No GitHub remote yet.** Repo is local-only. To go live: create GitHub repo → push → enable Pages (Actions source) → workflow deploys. `PATH_PREFIX` handles the `/repo-name/` sub-path automatically; when a custom domain lands, set it to `/`.

## Ownership rules

- Every `src/_data/*.json` file is **human-owned** (CMS/hand edits). No sync scripts exist yet; if one is added later (e.g. review sync), it gets its own file — never let two writers touch one file.
- `admin/config.yml` must mirror the JSON shape exactly — model every key. After changing it, deploy and **reload /admin/** before saving content.

## Desktop docked tray (2026-07-14)

On the menu page at ≥1100px the tray opens DOCKED by default: fixed under the header (`--header-h`, set by JS from the real header height), `--tray-w` wide, with `body.tray-docked main { padding-right }` shifting the menu left. Closing it stores `kumo-tray-dock: closed` in localStorage and gives the space back; the header "Your Tray" button re-docks. The homepage and all mobile widths keep the overlay drawer (docking never applies there). Escape closes only the overlay mode, not the docked panel.

## Traps (project-specific)

- Gold (`--gold`) as text on paper fails contrast — borders/decorative only.
- `menu-nav` sticky offset assumes header height (~57px); if the header grows, adjust `.menu-nav { top }` and `.menu-section { scroll-margin-top }`.
- Menu item `id`s are cart keys (localStorage `kumo-tray-v1`) — renaming an id orphans it from saved trays (harmless: stored name/price still render; totals still work).
- The social feed fetch respects `PATH_PREFIX` via `window.KUMO.pathPrefix` — don't hardcode `/data/social-feed.json` anywhere else.

## Verification done (2026-07-14, two rounds)

- Clean build, all pages render from data; PATH_PREFIX sub-path build has zero double-prefixed or unprefixed internal URLs.
- Contrast checked for every text/background token pair used: all ≥ 4.5:1 (gold-on-charcoal initially failed 4.20 → new `--gold-on-dark` token, 6.62).
- Narrow-width (320px) no horizontal scroll; nav collapses at 900px.
- Tray: add/increment/remove/clear/persist verified in browser; share panel + copy fallback verified; Stripe button confirmed disabled; `&amp;` escaping bug in share text fixed (dump|safe).
- Docked tray lifecycle verified at 1440px: docks on load (menu page), close returns space + saves pref, reopen re-docks, shrink to 900px closes cleanly, grow back re-docks. Homepage never docks. Note: verified via dispatched resize events — the embedded preview pane doesn't fire real resize/matchMedia events; real browsers do.
- Lazy feed: no network request until card clicked; renders posts after.
- All photos load (hero, signature cards, menu thumbs, mural, storefront); menu thumbs 64px with flex-shrink guard.
