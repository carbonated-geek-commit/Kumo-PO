/* Kumo — DORMANT Stripe checkout scaffolding. NOT LIVE.
   ---------------------------------------------------------------------------
   Purpose: when the restaurant is ready to take payment on-site, this file is
   where checkout lands. Until then window.KUMO.stripeEnabled is false (set
   from src/_data/site.json → ordering.stripeEnabled) and the checkout button
   in the tray stays disabled. Nothing here executes a payment today.

   GOING LIVE — what it will take (see STATE.md for the full plan):
   1. A static site cannot keep a Stripe secret key. Checkout requires a tiny
      backend endpoint (Cloudflare Worker, same pattern as the CMS OAuth
      worker) that creates a Stripe Checkout Session server-side and returns
      its URL. Only the PUBLISHABLE key ever ships in this file.
   2. Model menu items as Stripe Products/Prices (or pass ad-hoc line_items
      from the tray — simpler, but price integrity then depends on the worker
      re-validating against menu.json).
   3. The worker must re-price the tray server-side from a copy of menu.json.
      NEVER trust client-submitted prices.
   4. Set ordering.stripeEnabled = true in site.json, deploy, done — the
      button below wires itself up.
   ------------------------------------------------------------------------ */
(function () {
  "use strict";

  const config = window.KUMO || {};
  const checkoutBtn = document.querySelector("[data-stripe-checkout]");
  if (!checkoutBtn) return;

  if (!config.stripeEnabled) {
    /* Dormant: leave the button disabled as rendered. */
    return;
  }

  /* ----- Everything below is future wiring, exercised only when enabled ----- */

  // Placeholder endpoint — the Cloudflare Worker that creates the Checkout
  // Session. Replace when the worker exists.
  const CHECKOUT_ENDPOINT = "https://checkout.example.workers.dev/create-session";

  checkoutBtn.disabled = false;
  checkoutBtn.removeAttribute("title");
  checkoutBtn.textContent = "Checkout";

  checkoutBtn.addEventListener("click", async function () {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Preparing checkout…";
    try {
      const raw = localStorage.getItem("kumo-tray-v1");
      const tray = raw ? JSON.parse(raw) : [];
      if (!tray.length) throw new Error("empty tray");

      // The worker re-validates ids/prices against the canonical menu —
      // the client only sends ids and quantities.
      const res = await fetch(CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: tray.map((item) => ({ id: item.id, qty: item.qty })),
        }),
      });
      if (!res.ok) throw new Error("session failed");
      const session = await res.json();
      window.location.href = session.url; // Stripe-hosted checkout page
    } catch {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Checkout";
      alert("Checkout isn't available right now — order via DoorDash or call us!");
    }
  });
})();
