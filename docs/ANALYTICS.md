# Analytics & Tagging Handoff — Kumo Sushi & Ramen

GA4 property `G-95MLFBNWRX`. This doc is the single source of truth for how the
site is tagged, what every event means, and how to change tracking without
touching JavaScript. Written for a maintainer who is not an engineer.

---

## 1. How the tag is wired

- The measurement ID lives in **`src/_data/site.json` → `analytics.gaMeasurementId`**
  (editable in the CMS under *Restaurant Info → Analytics*).
- The gtag snippet is injected in `<head>` by `src/_includes/layouts/base.njk`
  **only when the ID is non-empty**. Blank the field → the tag disappears from
  the whole site on the next build. It is never loaded twice.
- **Privacy hardening (deliberate deviation from Google's vanilla snippet):**
  the config call sets `anonymize_ip: true`, `allow_google_signals: false`,
  `allow_ad_personalization_signals: false`. We measure the site; we don't
  feed ads profiles. Don't remove these.
- **The CMS (`/admin/`) is untagged** and carries `noindex`. Keep it that way.

## 2. How events work (no-JS event system)

One delegated click listener in `src/js/main.js` reads a
`data-analytics="event_name"` attribute from any clicked element and sends it
to GA4. Any additional `data-*` attributes on the same element become event
parameters (camelCase → snake_case, e.g. `data-location="hero"` →
`location: "hero"`).

**To track a new element:** add `data-analytics="my_event"` (plus optional
`data-*` params) to the HTML. No JavaScript changes, ever.

**Naming rule:** events are named for the question they answer, snake_case,
verb-ish. Renaming an event breaks historical continuity in GA — do it
deliberately and note the date here.

## 3. Event map (event → trigger → params → decision it informs)

| Event | Fires when | Params | Decision it informs |
|---|---|---|---|
| `call_order` | Any "Order Now / Call to Order / Call it in" button (header, hero, visit, footer, tray) | `location` | THE primary conversion — the restaurant takes orders by phone. Which placements drive it |
| `call` / `call_takeout` | Other phone-number links (visit, story, footer) | `location` | General phone intent vs. explicit order intent (`call_order`) |
| `order_doordash` | **Dormant** — only rendered when `ordering.doordashEnabled` is true (the restaurant is NOT on DoorDash today) | `location` | If DoorDash ever goes live, flip the flag and this event resumes with history intact |
| `tray_to_doordash` | **Dormant** — same flag as above | — | Tray → DoorDash conversion, when/if enabled |
| `browse_menu` | Hero "Take a look around →" | `location` | Homepage → menu funnel health |
| `tray_add` | "+ Tray" on a menu item | `item` (dish id) | Which dishes people actually want — useful to the owners for menu decisions |
| `tray_open` | "Your Tray" button | — | Engagement with the tray feature |
| `tray_share` | "Share my meal" | — | Demand for social sharing |
| `share_facebook` / `share_copy` | Facebook share link / copy-for-Instagram button | — | Which share channel to invest in |
| `map_open` | Directions/address links | `location` (visit, footer, contact) | Foot-traffic intent |
| `item_like` | Thumbs-up on a menu item (fires on like only, never on unlike) | `item` (dish id) | Which dishes people endorse — second input to the popularity/favorites pipeline (§9). Displayed count = GA count + the CMS `likesAdjust` field on the item |
| `item_review_sent` | Visitor sends/copies an optional mini-review after a thumbs-up (the review TEXT goes to the restaurant's SMS line, never to GA) | `item`, `method` (sms, copy) | Whether the review-capture flow is worth keeping; which channel people use |
| `contact_call` / `contact_sms` / `contact_email` | Contact-page cards | — | Which contact channel people actually reach for (informs the future AI text-concierge decision — see STATE.md) |
| `social_feed_load` | "See more from the neighborhood" card | — | Whether visitors want social content (informs building a real feed integration) |
| `social_instagram` / `social_facebook` | Footer social links (once URLs exist) | — | Social follow-through |

## 4. Key events — mark these in the GA4 UI

In **Admin → Events**, toggle "Mark as key event" for:

1. `call_order` — the primary conversion (phone orders)
2. `call` and `call_takeout` — secondary phone conversions

If DoorDash is ever enabled (`ordering.doordashEnabled` in site.json), also
mark `order_doordash` and `tray_to_doordash` at that time.

Do **not** mark `tray_add` or `tray_share` — they're engagement, not
conversion, and marking them inflates the numbers the owners will read.

## 5. Enhanced measurement — what's on and how it interacts

All enhanced-measurement toggles are ON at the property level. What that means
here:

| EM feature | Status on this site |
|---|---|
| Page views | Baseline — the main traffic metric |
| Scrolls (90%) | Useful proxy for menu-page depth; free, keep it |
| **Outbound clicks** | **Overlaps our custom events** on external links (Maps, social, DoorDash-when-enabled). **Use the custom events for decisions** — they carry `location` and clean names; treat EM outbound as a redundancy check only. Note: `tel:` links do NOT fire outbound clicks, so `call_order` is the only signal for phone orders |
| Site search | Inert — the site has no search box or query params. Harmless |
| Form interactions | Inert today; will auto-fire when a newsletter/contact form is added. When that happens, still fire a custom success-only event for conversions (EM counts *interactions*, not successes) |
| Video engagement | Inert — no embedded video |
| File downloads | Inert — no downloadable files. If a PDF menu is ever added, this covers it automatically |

## 6. Recommended one-time GA4 setup (10 minutes, in the GA UI)

1. Mark the four key events (§4).
2. **Admin → Data streams → Configure tag settings → Define internal traffic**:
   add the owners' home/shop IP so their own visits don't pollute the numbers,
   then activate the `internal` filter under *Data settings → Data filters*.
3. **Data settings → Data retention**: set to 14 months (default is 2).
4. Unwanted referrals: add `doordash.com` to the referral exclusion list only
   if return-from-DoorDash traffic ever shows up as "referral" sessions.

## 7. Verifying tracking works

- **Realtime:** open the site, click an Order button, watch *Realtime → Event
  count* for `order_doordash`.
- **DebugView:** append `?debug_mode=1` to any page URL and watch
  *Admin → DebugView*.
- **Tag present?** View page source — the gtag script should appear exactly
  once in `<head>`, and never on `/admin/`.
- Events no-op silently when the tag is absent (the listener checks
  `window.gtag` first), so local/dev clicks with a blank ID send nothing.

## 8. Rules going forward

- Conversion events fire on **real success only** (e.g. a form's success
  callback), never on click/attempt.
- One property, one tag. No second pixel/tag without updating this doc.
- New events get a row in §3 **in the same commit** that adds the attribute.
- Never put personal data (names, emails, phone numbers) in event params.

## 9. Popularity pipeline (the "Neighborhood Favorites" section)

The menu's Favorites section and like counts are driven by
**`src/_data/popularity.json`** — a machine-owned file mapping dish id →
"times added to a tray." The top 6 render first on the menu page at build
time (`src/_data/favorites.js`).

**Today** the counts are seeded estimates from June 2026 review mentions
(marked `"source": "seed-from-reviews"` in the file).

**Refresh recipe (monthly, ~5 minutes):**
1. GA4 → *Reports → Engagement → Events* → click `tray_add` → set the date
   range (last 90 days) → view event count by the `item` parameter.
2. Copy the counts into `popularity.json → counts` (dish ids match the
   `item` param exactly), update `"updated"` and set `"source": "ga4-export"`.
3. Commit — the next build re-ranks Favorites automatically.

`item_like` counts can be blended in the same way if the owners want likes to
influence ranking (suggested weight: 1 add = 1, 1 like = 0.5).

**Rules:** one writer — this file is updated only by this recipe (never the
CMS, never by hand mid-cycle). If the export ever automates (GA Data API +
scheduled workflow), that script becomes the sole writer and this section
documents it.
