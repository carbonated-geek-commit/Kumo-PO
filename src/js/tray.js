/* Kumo — "Your Tray": a lightweight build-your-meal cart.
   - Persists to localStorage (kumo-tray-v1)
   - Shares the composed meal via Web Share API / Facebook / clipboard
   - Hands off to DoorDash for actual ordering (no payment handled here;
     see checkout-stripe.js for the dormant online-checkout path). */
(function () {
  "use strict";

  const STORAGE_KEY = "kumo-tray-v1";

  const drawer = document.querySelector("[data-tray]");
  const overlay = document.querySelector("[data-tray-overlay]");
  if (!drawer || !overlay) return;

  const listEl = drawer.querySelector("[data-tray-list]");
  const emptyEl = drawer.querySelector("[data-tray-empty]");
  const footEl = drawer.querySelector("[data-tray-foot]");
  const totalEl = drawer.querySelector("[data-tray-total]");
  const closeBtn = drawer.querySelector("[data-tray-close]");
  const clearBtn = drawer.querySelector("[data-tray-clear]");
  const shareBtn = drawer.querySelector("[data-tray-share]");
  const sharePanel = drawer.querySelector("[data-share-panel]");
  const shareFacebook = drawer.querySelector("[data-share-facebook]");
  const shareCopy = drawer.querySelector("[data-share-copy]");
  const shareStatus = drawer.querySelector("[data-share-status]");

  let lastFocused = null;

  /* ----- State ----- */

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  function save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* private mode: tray still works for the session, just doesn't persist */
    }
  }

  let tray = load();

  function total() {
    return tray.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function money(n) {
    return "$" + n.toFixed(2);
  }

  /* ----- Rendering ----- */

  function render() {
    const counts = document.querySelectorAll("[data-tray-count]");
    const qtyTotal = tray.reduce((sum, item) => sum + item.qty, 0);
    counts.forEach((el) => {
      el.textContent = String(qtyTotal);
      el.hidden = qtyTotal === 0;
    });

    emptyEl.hidden = tray.length > 0;
    footEl.hidden = tray.length === 0;

    listEl.replaceChildren(
      ...tray.map((item) => {
        const li = document.createElement("li");
        li.className = "tray__item";

        const text = document.createElement("div");
        const name = document.createElement("p");
        name.className = "tray__item-name";
        name.textContent = item.name;
        name.style.margin = "0";
        const price = document.createElement("p");
        price.className = "tray__item-price";
        price.textContent = money(item.price) + " each";
        price.style.margin = "0";
        text.append(name, price);

        const controls = document.createElement("div");
        controls.className = "tray__item-controls";
        const minus = qtyButton("−", "Remove one " + item.name, () => changeQty(item.id, -1));
        const qty = document.createElement("span");
        qty.className = "tray__qty";
        qty.textContent = String(item.qty);
        qty.setAttribute("aria-label", item.qty + " in tray");
        const plus = qtyButton("+", "Add one more " + item.name, () => changeQty(item.id, 1));
        controls.append(minus, qty, plus);

        li.append(text, controls);
        return li;
      })
    );

    totalEl.textContent = money(total());
  }

  function qtyButton(label, aria, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tray__qty-btn";
    btn.textContent = label;
    btn.setAttribute("aria-label", aria);
    btn.addEventListener("click", onClick);
    return btn;
  }

  /* ----- Mutations ----- */

  function addItem(id, name, price) {
    const existing = tray.find((item) => item.id === id);
    if (existing) existing.qty += 1;
    else tray.push({ id, name, price, qty: 1 });
    save(tray);
    render();
    toast(name + " added to your tray");
  }

  function changeQty(id, delta) {
    const item = tray.find((entry) => entry.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) tray = tray.filter((entry) => entry.id !== id);
    save(tray);
    render();
  }

  function clear() {
    tray = [];
    save(tray);
    render();
  }

  let toastTimer = null;
  function toast(message) {
    let el = document.querySelector(".tray-toast");
    if (!el) {
      el = document.createElement("p");
      el.className = "tray-toast";
      el.setAttribute("role", "status");
      document.body.append(el);
    }
    el.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 2200);
  }

  /* ----- Drawer open/close: overlay everywhere, except the menu page on
     desktop where the tray DOCKS — open by default under the header, menu
     content shifted left. Closing it hands the space back to the menu. ----- */

  const DOCK_PREF_KEY = "kumo-tray-dock"; // 'open' | 'closed', menu-page desktop only
  const isMenuPage = document.body.dataset.page === "menu";
  const desktopQuery = window.matchMedia("(min-width: 1100px)");

  function canDock() {
    return isMenuPage && desktopQuery.matches;
  }

  function setHeaderHeightVar() {
    const header = document.querySelector(".site-header");
    if (header) {
      document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
    }
  }

  function openDocked() {
    setHeaderHeightVar();
    drawer.hidden = false;
    overlay.hidden = true;
    drawer.classList.add("tray--docked");
    drawer.setAttribute("aria-modal", "false");
    document.body.classList.add("tray-docked");
    try { localStorage.setItem(DOCK_PREF_KEY, "open"); } catch { /* non-fatal */ }
  }

  function openOverlay() {
    lastFocused = document.activeElement;
    drawer.hidden = false;
    overlay.hidden = false;
    closeBtn.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function openDrawer() {
    if (canDock()) openDocked();
    else openOverlay();
  }

  function closeDrawer() {
    const wasDocked = drawer.classList.contains("tray--docked");
    drawer.hidden = true;
    overlay.hidden = true;
    sharePanel.hidden = true;
    drawer.classList.remove("tray--docked");
    drawer.setAttribute("aria-modal", "true");
    document.body.classList.remove("tray-docked");
    document.removeEventListener("keydown", onKeydown);
    if (wasDocked) {
      try { localStorage.setItem(DOCK_PREF_KEY, "closed"); } catch { /* non-fatal */ }
    } else if (lastFocused) {
      lastFocused.focus();
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape" && !drawer.classList.contains("tray--docked")) closeDrawer();
  }

  document.addEventListener("click", function (e) {
    const opener = e.target.closest(".tray-open");
    if (opener) openDrawer();
  });
  closeBtn.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  clearBtn.addEventListener("click", clear);

  /* Keep dock state consistent with the viewport. Runs at load and on every
     resize (matchMedia 'change' alone is not reliable in embedded browsers):
     - grew into desktop on the menu page → dock unless the visitor closed it
     - shrank below the breakpoint with a docked tray → close it (the overlay
       mode is one tap away on the Your Tray button) */
  function dockPref() {
    try { return localStorage.getItem(DOCK_PREF_KEY); } catch { return null; }
  }

  function reconcileDock() {
    setHeaderHeightVar();
    const dockedNow = drawer.classList.contains("tray--docked");
    if (dockedNow && !canDock()) {
      drawer.hidden = true;
      drawer.classList.remove("tray--docked");
      drawer.setAttribute("aria-modal", "true");
      document.body.classList.remove("tray-docked");
      return;
    }
    if (!dockedNow && drawer.hidden && canDock() && dockPref() !== "closed") {
      openDocked();
    }
  }

  reconcileDock();

  let resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(reconcileDock, 120);
  });
  desktopQuery.addEventListener("change", reconcileDock);

  /* ----- Add-to-tray buttons (menu page) ----- */

  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-add-to-tray]");
    if (!btn) return;
    addItem(btn.dataset.itemId, btn.dataset.itemName, parseFloat(btn.dataset.itemPrice));
    btn.classList.add("is-added");
    setTimeout(() => btn.classList.remove("is-added"), 900);
  });

  /* ----- Social sharing ----- */

  function shareText() {
    const lines = tray.map((item) => item.qty + "× " + item.name);
    const name = (window.KUMO && window.KUMO.siteName) || "Kumo Sushi & Ramen";
    return (
      "My tray at " + name + " (Port Orchard):\n" +
      lines.join("\n") +
      "\nEstimated " + money(total()) + " — come hungry. 🍜"
    );
  }

  shareBtn.addEventListener("click", async function () {
    const text = shareText();
    /* Native share sheet first (mobile: shares straight to Instagram/FB apps) */
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Kumo tray", text: text, url: location.origin });
        return;
      } catch {
        /* user dismissed the sheet — fall through to manual options */
      }
    }
    sharePanel.hidden = !sharePanel.hidden;
    if (!sharePanel.hidden) {
      const fbUrl =
        "https://www.facebook.com/sharer/sharer.php?u=" +
        encodeURIComponent(location.origin) +
        "&quote=" +
        encodeURIComponent(text);
      shareFacebook.href = fbUrl;
    }
  });

  shareCopy.addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(shareText());
      shareStatus.textContent = "Copied! Paste it into your Instagram post or story.";
    } catch {
      shareStatus.textContent = "Couldn't copy automatically — long-press to copy instead.";
    }
  });

  render();
})();
