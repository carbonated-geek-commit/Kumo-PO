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
| `order_doordash` | Any "Order Now / Order Delivery / Order this on DoorDash" link | `location` (header, hero, visit, footer) | Which placements actually drive order intent; whether the DoorDash handoff earns its screen space |
| `tray_to_doordash` | The tray's "Order this on DoorDash →" button | — | Whether the build-a-tray flow converts to ordering (the tray's whole reason to exist) |
| `call` / `call_takeout` | Any phone-number link | `location` (footer, visit, story) | Whether phone/takeout is the real conversion channel (small restaurant — it may beat delivery) |
| `browse_menu` | Hero "Take a look around →" | `location` | Homepage → menu funnel health |
| `tray_add` | "+ Tray" on a menu item | `item` (dish id) | Which dishes people actually want — useful to the owners for menu decisions |
| `tray_open` | "Your Tray" button | — | Engagement with the tray feature |
| `tray_share` | "Share my meal" | — | Demand for social sharing |
| `share_facebook` / `share_copy` | Facebook share link / copy-for-Instagram button | — | Which share channel to invest in |
| `map_open` | Directions/address links | `location` | Foot-traffic intent |
| `social_feed_load` | "See more from the neighborhood" card | — | Whether visitors want social content (informs building a real feed integration) |
| `social_instagram` / `social_facebook` | Footer social links (once URLs exist) | — | Social follow-through |

## 4. Key events — mark these in the GA4 UI

In **Admin → Events**, toggle "Mark as key event" for:

1. `order_doordash`
2. `tray_to_doordash`
3. `call` and `call_takeout`

These are the site's real conversions. Do **not** mark `tray_add` or
`tray_share` — they're engagement, not conversion, and marking them inflates
the numbers the owners will read.

## 5. Enhanced measurement — what's on and how it interacts

All enhanced-measurement toggles are ON at the property level. What that means
here:

| EM feature | Status on this site |
|---|---|
| Page views | Baseline — the main traffic metric |
| Scrolls (90%) | Useful proxy for menu-page depth; free, keep it |
| **Outbound clicks** | **Overlaps our custom events.** A DoorDash click fires both auto `click` (outbound) AND `order_doordash`. **Use the custom events for decisions** — they carry `location` and clean names; treat EM outbound as a redundancy check only |
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
