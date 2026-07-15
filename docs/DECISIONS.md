# Kumo Sushi & Ramen — State & Design Decisions Export

Exported 2026-07-15. Companion docs: `STATE.md` (live handoff/open threads),
`docs/ANALYTICS.md` (tagging), `README.md` (dev quickstart).

---

## 1. Snapshot

| | |
|---|---|
| Live site | https://carbonated-geek-commit.github.io/Kumo-PO/ |
| Repo | https://github.com/carbonated-geek-commit/Kumo-PO (public — required for free Pages) |
| Stack | Eleventy 3 + Nunjucks, hand-written CSS, vanilla JS, JSON data files |
| Hosting | GitHub Pages via Actions; deploy on push to `main`; weekly Mon rebuild cron |
| Pages | Home `/`, Menu `/menu/`, Contact `/contact/`, CMS shell `/admin/` (auth pending) |
| Analytics | GA4 `G-95MLFBNWRX`, privacy-hardened, full event map in ANALYTICS.md |
| CMS | Sveltia config complete & pointed at repo; **OAuth worker not yet deployed** — /admin/ can't log in yet |
| Restaurant facts | 1734 Village Ln SE A, Port Orchard WA 98366 · (360) 602-0222 (verified) · text line (425) 524-7779 · closed Mon, Tue–Sun 12–2:30 & 4–9:30 (owner Google listing) |

## 2. Architecture decisions

- **Static-first, per the owner's playbook.** Flat HTML/CSS/JS at build time; no
  server, no database, no runtime API calls. Every "dynamic" feature below is
  designed around that constraint rather than pretending it away.
- **Content as data.** All copy/menu/reviews live in `src/_data/*.json`;
  templates are dumb. This is what makes the CMS an editing layer, not a
  dependency — delete the CMS and the site still builds.
- **Path-prefix aware.** `PATH_PREFIX` env + explicit `| url` filters. We use
  the built-in `url` filter and deliberately NOT HtmlBasePlugin — combining
  both double-prefixes every asset URL (found the hard way; documented trap).
- **Cache-busted assets.** Build-time content hash on CSS/JS URLs
  (`main.css?v=<hash>`) so Pages' ~10-min CDN cache can't serve stale CSS
  against new HTML.
- **Computed data at build.** Favorites ranking (`_data/favorites.js`) and the
  social-feed JSON endpoint are built, never hand-maintained. Footer year via
  filter + weekly rebuild cron.
- **JS injection of data uses `dump | safe`,** never raw interpolation —
  Nunjucks auto-escaping once shipped `&amp;` into a share string.

## 3. Brand & design system

- **Concept: "dinner at a samurai's table."** Light Japanese-minimal — warm
  washi paper base — with charcoal (sumi) panels/borders and an ember-orange
  accent as "the fire in the charcoal." Chosen by the owner over dark
  menu-board and hybrid directions. The restaurant's own hand-painted samurai
  mural (now the story-section photo) retroactively proved the concept right.
- **Tokens** (`main.css :root`): paper tiers `#f6f1e7/#ede5d4/#fbf8f1`; ink
  `#26231d/#454036/#655d4f`; charcoal `#2a2620/#38322a`; ember `#b4441e`
  (buttons) with darker `#9a3512` for text-safe use; gold `#a9812f` for
  **borders/decoration only** — it fails AA as text on paper; a brighter
  `--gold-on-dark #cda753` (6.62:1) exists for text on charcoal after the
  original failed at 4.20:1.
- **Type:** Zen Old Mincho (display) + Inter (body), Google Fonts with
  `display=swap`. Two families max.
- **Brand mark:** 雲 (kumo = cloud) kanji — favicon, header tile, giant hero
  watermark. Section headers carry small kanji chips (名物, 炭火, 声, 道, 献立,
  連絡). Decorative kanji are `aria-hidden`.
- **Badges:** 辛 spicy (ember) and 生 raw (ink-soft outline) as small bordered
  chips beside dish names; legend on the menu hero. Raw flags mirror the
  in-store boards' asterisks (17 dishes).
- **Iconography:** typed characters and inline SVG only (thumbs-up is a
  stroked Feather-style SVG). No icon fonts.
- **Tagline: "Broth worth every drop."** Adapted from Justin Countryman's
  review ("Worth every drop") — replaced the invented "Ramen worth the wait"
  after real reviews arrived. Hero lede is built from verified facts only:
  two-person kitchen, scratch broth from early morning, sushi rice seasoned
  3×/day (owner's own words in review replies).

## 4. Data sourcing & truth decisions

- **The original DoorDash menu was the wrong restaurant.** It contained a
  "Herndon Roll" (Herndon, VA) and hibachi/teriyaki/curry sections this
  kitchen doesn't have — almost certainly the Virginia/Georgia "Kumo." The
  entire menu was rebuilt from photos of the real in-store menus.
- **Source hierarchy for prices:** in-store TV boards (newest, Jul 2026) >
  slate digital boards > printed menus (May 2026). Site uses TV prices where
  legible (ramen $16.99/$17.99, bowls $15.99, unagi $17.99); roll prices come
  from the slate board (the only complete roll source) and may be ~$1 stale —
  flagged for a 10-minute owner price check.
- **Hours:** the web conflates this Kumo with kumosushiandramen.com (Cumming,
  GA — different restaurant). Hours came from the owner's Google listing;
  where its "open 12–9:30 straight" contradicted its own Takeout/Access split
  (2:30–4 pause), the site shows the **split** — a visitor arriving at 3 PM to
  locked doors is the worse failure. Machine-format copy feeds JSON-LD
  `openingHours`.
- **Reviews are verbatim and attributed** (Justin Countryman, Angelo Carosio,
  Tacey Whittemore, Mikayla Liles, Laura Gibeau, Christian Ko — June 2026
  Google). No paraphrasing, no invention. Negative-review themes (peak-hour
  waits, two-person crew) are addressed honestly in site copy ("small crew in
  a small room… call ahead") rather than quoted.
- **Photos are Google Maps guest/owner uploads,** credited on-site ("Dish
  photos by Kumo guests on Google Maps"), optimized to ≤1600px JPEG q80–85.
  Contributor permissions are a pre-launch item (named in STATE.md).

## 5. Feature decisions

### Ordering
- **Not on DoorDash (owner-confirmed).** Every Order CTA is a `tel:` link.
  The DoorDash markup remains in templates behind `ordering.doordashEnabled:
  false` — a CMS toggle restores it (plus its analytics events) if they ever
  join. "Delivery" removed from services.
- **Stripe checkout is dormant scaffolding** (`checkout-stripe.js`), disabled
  by flag. Documented go-live plan requires a worker that re-prices the tray
  server-side from menu.json — client prices are never trusted.

### The Tray (build-your-meal cart)
- localStorage (`kumo-tray-v1`), vanilla JS, works on every page.
- **Desktop menu page: docked sidebar** — open by default under the header,
  menu shifts left; closing returns the space and persists the preference;
  breakpoint crossings reconcile via direct resize events.
- **Mobile: summary bar** (count + running total + View) — evolved from a
  floating pill at the owner's request. On the menu page it lives in the
  sticky stack under the section nav, always visible; on other pages a
  `--global` copy sticks under the header, appears only when the tray has
  items, and adds a **Menu** shortcut. One shared partial renders both.
- **Graceful menu return:** drawer contains "← Keep browsing the menu" —
  navigates from other pages, merely closes the drawer on the menu page.
- **Deleting the last of an item asks first:** "Do you want to delete X from
  your tray?" (native confirm).
- **Sharing:** Web Share API on mobile (reaches FB/IG apps), Facebook sharer +
  copy-for-Instagram fallback on desktop.

### Menu page
- **Section order: Neighborhood Favorites → Appetizers & Tempura → Ramen →
  Bowls → Nigiri → Nigiri Sets → Rolls → Soup → Sake** (owner-specified:
  favorites first, appetizers next).
- **Favorites are earned, not curated:** top 6 dishes by times-added-to-tray
  (see pipeline below).
- **Scrollspy nav:** desktop chips highlight the current section; mobile
  condenses to `[★ Favorites] [current section] [next section →]` — next hides
  at the last section, current hides inside Favorites. Spy runs directly on
  scroll/resize, deliberately NOT rAF-deferred (rAF doesn't fire in
  background tabs → stale nav).
- Dish photos render as 64px thumbnails; homepage signature cards carry
  + Tray buttons and photos.

### Likes & popularity (no-backend social proof)
- Thumbs-up = outline SVG chip beside the dish name. Per-visitor state in
  localStorage; GA4 `item_like` fires on like only (never unlike).
- **Displayed count = machine count + human adjustment:**
  `popularity.json` (machine-owned, refreshed from a GA export of `tray_add`
  counts; currently seeded estimates from review mentions) **plus** the
  per-item `likesAdjust` field in menu.json (CMS-owned, may be negative — the
  owners' moderation knob). Two owners → two fields → one writer each.
- The blended count also ranks the Favorites section.

### Review capture → fan quotes (no-backend UGC)
- A thumbs-up opens an optional review box. **Send stores it two ways:**
  always as a GA4 `item_review` event (text in the `review` param, GA's
  100-char cap enforced in the UI), and — once `reviewsInbox`
  endpoint/accessKey are configured (Web3Forms-style, needs owners' email) —
  a full-length POST to that inbox (280 cap, honeypot included).
- Evolution: v1 prefilled an SMS to the text line; replaced at the owner's
  request with direct capture.
- **Publish flow:** owner pastes keepers into the CMS (menu item → Fan
  quotes) and flips `published` on at most one. **The template renders only
  the first published quote per dish** (fixture-tested with two flipped on),
  so the one-at-a-time rule holds at render, not by editor discipline.
  Example live: Angelo C.'s chashu quote on the Tonkotsu.

### Social proof & feed
- Curated review cards (verbatim quotes) + a **lazy-loaded** "From the
  neighborhood" card: zero network cost until clicked, then fetches a
  build-time JSON of curated posts. A real IG/FB feed integration can replace
  the JSON without touching the page. Account-bound embeds were rejected
  (slow, third-party JS, against playbook §6).

### Contact
- `/contact/` cards: Call (primary), Text (425) 524-7779 with an honest
  "replies can take hours during service" note, Come by + hours; an Email
  card auto-appears when `contact.email` is filled (address still needed).
- **AI text concierge: deliberately designed-not-built.** STATE.md holds the
  sketch (SMS platform fronts the line, bot answers hours/menu/wait/order-
  ahead instantly, hands off to humans, explicit bot disclosure).
  `contact_sms` analytics measures channel demand in the meantime.

## 6. Analytics decisions (details in docs/ANALYTICS.md)

- One GA4 property, tag injected only when the ID is set; **privacy-hardened**
  (anonymize_ip, Google signals off, ad personalization off) — deliberate
  deviation from the vanilla snippet. `/admin/` untagged + noindex.
- **Declarative events:** one delegated listener reads `data-analytics`
  attributes; extra `data-*` become params. Adding tracking = adding an HTML
  attribute.
- **Key events:** `call_order` (primary — phone is the conversion),
  `call`/`call_takeout`. `order_doordash`/`tray_to_doordash` documented as
  dormant. `tel:` links don't fire GA's outbound-click enhanced measurement,
  so the custom events are the only phone signal.
- Event names answer questions; renames are breaking changes; new events get
  a doc row in the same commit; conversions fire on success only; no personal
  data in params (review box warns users accordingly).
- **Pipelines:** monthly `tray_add`-by-item export → popularity.json;
  `review` custom dimension → fan-quote harvesting.

## 7. Ownership boundaries (one writer per file)

| File | Owner | Writer |
|---|---|---|
| `menu.json`, `site.json`, `reviews.json`, `social.json` | Human | CMS / hand edits |
| `popularity.json` | Machine | GA export recipe only (never CMS, never mid-cycle hand edits) |
| `favorites.js` output | Build | Computed, never edited |
| `likesAdjust`, `fanQuotes` (fields in menu.json) | Human | CMS — this is WHY they live in menu.json, not popularity.json |

CMS rules: config mirrors the JSON shape with **every key modeled** (unmodeled
keys are silently deleted on save); after config changes, editors must reload
/admin/ before saving.

## 8. Quality posture & notable catches

- **A11y:** WCAG 2.1 AA target; landmarks, one h1, no heading skips, keyboard
  drawer with focus management, `[hidden] !important` guard, visible focus,
  44px+ targets, 320px no-overflow. All text token pairs measured ≥4.5:1.
- **Perf:** zero client JS where unneeded, three small deferred scripts,
  photos ≤~340KB (hero) / ≤160KB (cards), lazy loading, hashed asset URLs.
- Bugs caught by verifying behavior (not builds): gold-on-charcoal contrast
  (4.20→6.62), HtmlBasePlugin double-prefix, `&amp;` in share text, rAF-based
  scrollspy stale in background tabs, stranded docked tray on breakpoint
  cross, 0-width-viewport red herring (pane artifact, not site).

## 9. Open items (the full list lives in STATE.md)

1. Owner price check (TV vs slate drift, gyoza 6pc vs 8pc) + hours split
   confirmation + ramen board recheck.
2. Owners' email → contact card + review form inbox provisioning.
3. Photo/quote permissions from named contributors before promoting.
4. CMS OAuth worker (last step to owner self-service editing).
5. GA UI: mark key events, register `review`/`item` custom dimensions,
   internal-traffic filter, 14-month retention.
6. Social links (IG/FB URLs) when available.
7. First real GA export into popularity.json (retire seeded counts).
8. Custom domain when ready (Pages setting + `PATH_PREFIX=/`).
9. Workflow node/actions version bump (deprecation warning, non-urgent).
10. Deferred by design: Stripe checkout, AI text concierge, live social feed.
