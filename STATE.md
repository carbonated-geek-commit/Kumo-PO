# STATE — Kumo Sushi & Ramen site

Last updated: 2026-07-14. Handoff doc: architecture pointer, open threads, ownership rules, traps.

## Architecture in one paragraph

Eleventy renders `src/_data/*.json` through Nunjucks templates into flat HTML in `_site/`. Hand-written CSS with design tokens (`src/css/main.css` top block). Three small deferred scripts: `main.js` (nav, delegated analytics, lazy social feed), `tray.js` (build-a-meal cart in localStorage + share), `checkout-stripe.js` (dormant). Deploy via GitHub Actions to Pages, path-prefix aware (`PATH_PREFIX` env). CMS is an editing layer only — the site builds fine without it.

## Design concept

"Dinner at a samurai's table" — light washi-paper base (`--paper`), sumi charcoal panels/borders (`--charcoal`), ember-orange accent (`--ember`) as the fire in the charcoal, gold (`--gold`) for borders/decoration only (fails AA as text on paper — do not use it for text). Display face: Zen Old Mincho; body: Inter. The 雲 (kumo = cloud) kanji is the brand mark.

## Open threads / TECH DEBT

1. **RESOLVED (2026-07-14): the original DoorDash menu was the WRONG restaurant.** The first menu draft came from a DoorDash listing that almost certainly belonged to a different Kumo (it contained a "Herndon Roll" — Herndon, VA — plus hibachi/teriyaki/curry sections this kitchen doesn't have). menu.json is now transcribed from photos of the REAL in-store menus: printed menus (photo dates Apr–May 2026) + overhead TV boards (newer, ~Jul 2026). Sections now: Ramen, Bowls, Appetizers & Tempura, Nigiri, Nigiri Sets, Sushi Rolls, Soup, Sake Samplers.
2. **Price drift between menu generations — confirm with owners.** TV boards (newest) raised ramen to $16.99/$17.99 and bowls to $15.99 (used on the site). Printed menus + slate signage (May era) show $14.99/$15.99 ramen, $13.99 bowls, Edamame $4.99 vs TV $6.99. Roll prices come from the slate roll board (the only complete roll source); the TV sushi screen hints rolls also rose ~$1 (e.g. Shrimp Tempura Roll $16.99 vs $14.99 shown). Gyoza/wonton/rangoon piece counts: TV says 6 pc (used), printed said 8 pc. **A 10-minute price check with the owners fixes all of this.**
3. **RESOLVED (2026-07-15): hours are set from the owner-provided Google listing.** Closed Mondays; Tue–Sun split service. Note: Google's primary hours say 12–9:30 straight through while Takeout/Access hours show a 2:30–4 PM pause — the site displays the split (safer: nobody drives over at 3 PM to locked doors) with a "kitchen break" note. Worth a one-line confirmation with the owners. Machine-format copy in `hours.schemaHours` feeds the JSON-LD; keep both in sync when hours change.
4. **RESOLVED (2026-07-15): the restaurant is NOT on DoorDash** (user-confirmed). All DoorDash CTAs are gated behind `ordering.doordashEnabled: false` in site.json — the markup remains in the templates, so if they ever join DoorDash: set the flag true, paste the real store URL into `ordering.doordashUrl`, and mark the two dormant events as key events in GA (see docs/ANALYTICS.md). Until then every Order button is a `tel:` link firing `call_order`. "Delivery" was also removed from the services chips.
5. **Social links empty** (`site.json → social`). Footer hides them until filled.
6. **Reviews are verbatim quotes** from public Google reviews (June 2026), attributed by name (Justin Countryman, Angelo Carosio, Tacey Whittemore, Mikayla Liles, Laura Gibeau, Christian Ko). The hero tagline "Broth worth every drop" is adapted from Justin's review. Quoting public reviews with attribution is standard practice, but if any reviewer objects, swap the quote in `reviews.json`.
7. **Social feed posts** (`social.json`) are now real Google-review snippets shown in the lazy-loaded card. Replace with Instagram/Facebook posts (with poster permission) once the owners connect accounts. The feed loads from `/data/social-feed.json` only when clicked.
8. **Photos are Google Maps guest/owner uploads** (contributors: Angelo Carosio — tonkotsu; Cynthia Lynn — beef bowl; Justin Countryman — gyoza; Mark Fernald — karaage; plus owner interior/storefront shots). Credited on-site as "Dish photos by Kumo guests on Google Maps." **Get owner + contributor permission before public launch**; originals and full metadata in `C:\Users\corba\Documents\Codex\2026-07-14\can\outputs\KUMO-Sushi-Ramen-Photos\`. Optimized copies live in `src/assets/photos/`.
9. **Stripe checkout is scaffolding only.** `checkout-stripe.js` documents the full go-live path: needs a Cloudflare Worker that creates Checkout Sessions server-side and re-prices the tray from menu.json (never trust client prices). Flag: `site.json → ordering.stripeEnabled`.
10. **CMS not yet connected.** `admin/config.yml` has `repo: OWNER/REPO` placeholder; needs the GitHub repo name + an OAuth worker. Until then /admin/ won't authenticate — the site itself is unaffected.
11. **RESOLVED (2026-07-15): LIVE at https://carbonated-geek-commit.github.io/Kumo-PO/** — public repo `carbonated-geek-commit/Kumo-PO`, Pages via Actions source, deploy-on-push verified end to end (homepage/menu/contact/CSS/photos/feed JSON all 200, GA tag present). When a custom domain lands: set it in Pages settings and change `PATH_PREFIX` to `/` in the workflow. Minor: Actions warns the checkout/setup-node/upload-artifact actions target deprecated Node 20 — bump `node-version` and action majors when convenient. CMS backend now points at the real repo; the OAuth worker is still the missing piece for /admin/ logins.

## Ownership rules

- Every `src/_data/*.json` file is **human-owned** (CMS/hand edits). No sync scripts exist yet; if one is added later (e.g. review sync), it gets its own file — never let two writers touch one file.
- `admin/config.yml` must mirror the JSON shape exactly — model every key. After changing it, deploy and **reload /admin/** before saving content.

## Contact page & the text line (2026-07-15)

`/contact/` offers call (primary), text, and directions cards plus hours; an email card renders automatically once `site.json → contact.email` is filled (**get the owners' email — open item**). The text line is (425) 524-7779; replies are human and can lag hours during service, and the card says so honestly.

**Future design option (user-requested, deliberately NOT built): an AI text concierge.** The idea: an agent answers the text line instantly (hours, menu, wait times, "can I order ahead?"), takes structured takeout orders, and hands off to the humans for anything else — solving the hours-long reply gap without adding staff. When/if pursued: needs the owners' buy-in, an SMS platform (e.g. Twilio) fronting the number, and clear "you're texting a bot, say HUMAN anytime" disclosure. The `contact_sms` analytics event measures demand for the channel in the meantime.

## Likes & the popularity pipeline (2026-07-15)

Thumbs-up chips (outline style, beside the dish name after the 辛/生 badges) store per-visitor state in localStorage and fire GA4 `item_like` events; a static site has no backend, so **cross-user counts are not live** — displayed count = `popularity.json` count (machine-owned, GA export recipe in docs/ANALYTICS.md §9) **plus the per-item `likesAdjust` field in menu.json** (human/CMS-owned, may be negative — the owners' knob to add/remove thumbs). Two owners, two fields, one writer each — never collapse them into one file. The blended count also ranks the "Neighborhood Favorites" section. Don't hand-edit popularity.json counts; don't add that file to the CMS.

## Fan-quote reviews (2026-07-15, revised same day)

After a thumbs-up, an optional review box opens; **Send** saves the review without any site backend via two layers (docs/ANALYTICS.md §10): (1) always, a GA4 `item_review` event carrying the text — GA caps params at 100 chars, so the box enforces 100 while GA is the only layer; (2) when `site.json → reviewsInbox` is configured with a hosted form endpoint (Web3Forms-style — **needs the owners' email to provision, open item**), the full text (280 cap) also lands in that provider's dashboard. The owner reads reviews there (or in a GA exploration), pastes keepers into the CMS (menu item → *Fan quotes*), and flips `published` on at most one; **the template renders only the FIRST published quote per dish** (fixture-tested), so "one published at a time" holds even if two get flipped on. GA-side one-time step: register the `review` custom dimension (§10). The earlier text-it-to-us SMS transport was replaced by this at the user's request.

## Analytics (2026-07-15)

GA4 `G-95MLFBNWRX` is live via `site.json → analytics.gaMeasurementId`. Full tagging handoff — event map, key-event list, enhanced-measurement interplay, GA UI setup steps — lives in **docs/ANALYTICS.md**. Remaining human steps (GA web UI, can't be done from the repo): mark the 4 key events, define internal-traffic filter, set 14-month retention.

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
