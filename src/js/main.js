/* Kumo — global behaviors: nav toggle, delegated analytics, lazy social feed.
   Progressive enhancement only; every link works without this file. */
(function () {
  "use strict";

  /* ----- Mobile nav ----- */
  const toggle = document.querySelector(".site-nav__toggle");
  const navList = document.getElementById("nav-menu");
  if (toggle && navList) {
    toggle.addEventListener("click", function () {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      navList.classList.toggle("is-open", !open);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navList.classList.contains("is-open")) {
        toggle.setAttribute("aria-expanded", "false");
        navList.classList.remove("is-open");
        toggle.focus();
      }
    });
  }

  /* ----- Declarative analytics: one delegated listener.
     Elements opt in with data-analytics="event_name"; other data-* become params. ----- */
  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-analytics]");
    if (!el || typeof window.gtag !== "function") return;
    const params = {};
    for (const [key, value] of Object.entries(el.dataset)) {
      if (key !== "analytics") params[key.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase())] = value;
    }
    window.gtag("event", el.dataset.analytics, params);
  });

  /* ----- Open-now status — America/Los_Angeles, fails silent (stays hidden)
     on any error. HOURS ARE HARDCODED HERE *AND* in
     src/_includes/partials/hours.njk — change them together.
     (Tue–Sun 12–2:30 & 4–9:30 PM, closed Mondays.) ----- */
  try {
    const statusEl = document.getElementById("open-status");
    if (statusEl) {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
      const day = now.getDay(); // 0 Sun … 6 Sat
      if (day === 1) {
        statusEl.textContent = "Closed today (Mondays)";
        statusEl.dataset.open = "false";
        statusEl.hidden = false;
      } else {
        const mins = now.getHours() * 60 + now.getMinutes();
        const windows = [[12 * 60, 14 * 60 + 30], [16 * 60, 21 * 60 + 30]];
        let open = null;
        for (const [start, end] of windows) {
          if (mins >= start && mins < end) { open = end; break; }
        }
        if (open !== null) {
          statusEl.textContent = "Open now · closes " + (open === 870 ? "2:30 PM" : "9:30 PM");
          statusEl.dataset.open = "true";
        } else {
          let opensAt;
          if (mins < 720) opensAt = "noon";
          else if (mins < 960) opensAt = "4 PM";
          else opensAt = day === 0 ? "Tuesday at noon" : "noon tomorrow";
          statusEl.textContent = "Closed now · opens " + opensAt;
          statusEl.dataset.open = "false";
        }
        statusEl.hidden = false;
      }
    }
  } catch { /* leave hidden — a wrong "Open now" is worse than none */ }

  /* ----- Menu scrollspy.
     Desktop: highlights the current section's chip in the full nav.
     Mobile: the condensed nav keeps ★ Favorites as home, second chip = the
     section you're in, third chip = the section you're headed to next. ----- */
  const menuNav = document.querySelector(".menu-nav");
  if (menuNav) {
    const sections = [...document.querySelectorAll(".menu-section")];
    const chips = [...menuNav.querySelectorAll(".menu-nav__list .menu-nav__link")];
    const labelFor = {};
    chips.forEach((chip) => {
      labelFor[chip.getAttribute("href").slice(1)] = chip.textContent.trim();
    });
    const currentChip = menuNav.querySelector("[data-spy-current]");
    const nextChip = menuNav.querySelector("[data-spy-next]");
    const stack = document.querySelector(".menu-stack");
    const header = document.querySelector(".site-header");

    function spy() {
      const offset = (header ? header.offsetHeight : 0) + (stack ? stack.offsetHeight : 0) + 24;
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= offset) current = section;
        else break;
      }
      const next = sections[sections.indexOf(current) + 1];

      chips.forEach((chip) => {
        chip.classList.toggle("is-active", chip.getAttribute("href") === "#" + current.id);
      });
      if (currentChip) {
        currentChip.textContent = labelFor[current.id] || current.id;
        currentChip.setAttribute("href", "#" + current.id);
        // the ★ Favorites home chip already covers it — don't show it twice
        currentChip.hidden = current.id === "favorites";
      }
      if (nextChip) {
        nextChip.hidden = !next;
        if (next) {
          nextChip.textContent = (labelFor[next.id] || next.id) + " →";
          nextChip.setAttribute("href", "#" + next.id);
        }
      }
    }
    /* Direct calls, not rAF — rAF never fires in backgrounded tabs, which
       would leave the nav stale until the next user scroll. The spy is nine
       rect reads; running it per scroll event is cheap. */
    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", spy);
    spy();
  }

  /* ----- Thumbs-up on menu items.
     Local state in localStorage (one like per visitor per dish, toggleable);
     the like itself is recorded as a GA4 'item_like' event — fired only on
     like, never on unlike, so the analytics count only ever grows. Displayed
     counts come from build-time popularity data plus this visitor's own +1. ----- */
  const LIKES_KEY = "kumo-likes-v1";
  const likeButtons = document.querySelectorAll("[data-like]");
  if (likeButtons.length) {
    let liked;
    try {
      liked = new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || "[]"));
    } catch {
      liked = new Set();
    }

    function paint(btn, isLiked, delta) {
      btn.classList.toggle("is-liked", isLiked);
      btn.setAttribute("aria-pressed", String(isLiked));
      if (delta) {
        const countEl = btn.querySelector("[data-like-count]");
        const current = parseInt(countEl.textContent, 10) || 0;
        const next = current + delta;
        countEl.textContent = next > 0 ? String(next) : "";
      }
    }

    likeButtons.forEach((btn) => {
      const id = btn.dataset.itemId;
      if (liked.has(id)) paint(btn, true, 1);
      btn.addEventListener("click", function () {
        const isLiked = !liked.has(id);
        if (isLiked) liked.add(id);
        else liked.delete(id);
        try {
          localStorage.setItem(LIKES_KEY, JSON.stringify([...liked]));
        } catch { /* private mode: session-only */ }
        paint(btn, isLiked, isLiked ? 1 : -1);
        if (isLiked && typeof window.gtag === "function") {
          window.gtag("event", "item_like", { item: id });
        }
        if (isLiked) openReviewPrompt(btn);
        else closeReviewPrompt();
      });
    });
  }

  /* ----- Optional mini-review after a thumbs-up.
     No server of our own, so "Send" saves the review two ways:
     1. Always: a GA4 'item_review' event carrying the text (GA caps param
        values at 100 chars) — readable in Explorations/DebugView.
     2. When configured: POST to the hosted form inbox
        (site.json → reviewsInbox), which stores the full text in its own
        dashboard. See docs/ANALYTICS.md §10.
     The owner then pastes keepers into the CMS (menu item → Fan quotes)
     and publishes exactly one. ----- */
  const INBOX = (window.KUMO && window.KUMO.reviewsInbox) || {};
  const REVIEW_MAX = INBOX.endpoint ? 280 : 100; // GA-only capture truncates at 100
  let reviewPanel = null;

  function closeReviewPrompt() {
    if (reviewPanel) { reviewPanel.remove(); reviewPanel = null; }
  }

  function openReviewPrompt(likeBtn) {
    closeReviewPrompt();
    const host = likeBtn.closest(".menu-item__text");
    if (!host) return; // homepage cards have no review slot
    const itemName = likeBtn.dataset.itemName || "this dish";
    const itemId = likeBtn.dataset.itemId;

    reviewPanel = document.createElement("div");
    reviewPanel.className = "review-panel";

    const label = document.createElement("label");
    label.className = "review-panel__label";
    label.textContent = "Glad you liked it! Tell us why? (optional)";
    const ta = document.createElement("textarea");
    ta.className = "review-panel__input";
    ta.rows = 2;
    ta.maxLength = REVIEW_MAX;
    ta.placeholder = "A sentence or two — the kitchen reads these, and the best ones make the menu.";
    const taId = "review-" + itemId;
    ta.id = taId;
    label.htmlFor = taId;

    const row = document.createElement("div");
    row.className = "review-panel__row";
    const send = document.createElement("button");
    send.type = "button";
    send.className = "btn btn--ember btn--sm";
    send.textContent = "Send";
    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "review-panel__skip";
    skip.textContent = "Skip";
    const status = document.createElement("p");
    status.className = "review-panel__status";
    status.setAttribute("role", "status");
    const fineprint = document.createElement("p");
    fineprint.className = "review-panel__fineprint";
    fineprint.textContent = "Goes straight to the kitchen. Please don't include personal info.";

    function thank() {
      reviewPanel.replaceChildren();
      const done = document.createElement("p");
      done.className = "review-panel__label";
      done.textContent = "Thank you! If it makes the menu, you'll see it right here.";
      reviewPanel.append(done);
      setTimeout(closeReviewPrompt, 2500);
    }

    send.addEventListener("click", function () {
      const text = ta.value.trim();
      if (!text) { status.textContent = "Write a line first — or hit Skip."; return; }
      send.disabled = true;

      // Layer 1 — always: capture in analytics (100-char param cap).
      if (typeof window.gtag === "function") {
        window.gtag("event", "item_review", {
          item: itemId,
          review: text.slice(0, 100),
          method: INBOX.endpoint ? "form" : "analytics",
        });
      }

      // Layer 2 — when a form inbox is configured: store the full text there.
      if (INBOX.endpoint) {
        fetch(INBOX.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: INBOX.accessKey,
            subject: "Menu review: " + itemName,
            item: itemId,
            review: text,
            botcheck: "", // honeypot
          }),
        }).then(thank, thank); // analytics already has it — thank either way
      } else {
        thank();
      }
    });
    skip.addEventListener("click", closeReviewPrompt);

    row.append(send, skip);
    reviewPanel.append(label, ta, row, fineprint, status);
    host.append(reviewPanel);
    ta.focus();
  }

  /* ----- Lazy social feed: nothing loads until the visitor asks for it. ----- */
  const feedSlot = document.querySelector("[data-social-feed-slot]");
  const feedBtn = document.querySelector("[data-social-feed-load]");
  if (feedSlot && feedBtn) {
    feedBtn.addEventListener("click", async function () {
      feedBtn.disabled = true;
      feedBtn.querySelector("span:nth-child(2)").textContent = "Loading…";
      try {
        const base = (window.KUMO && window.KUMO.pathPrefix) || "/";
        const res = await fetch(base.replace(/\/$/, "") + "/data/social-feed.json");
        if (!res.ok) throw new Error("feed unavailable");
        const feed = await res.json();
        renderFeed(feedSlot, feed);
      } catch {
        feedBtn.disabled = false;
        feedBtn.querySelector("span:nth-child(2)").textContent = "Couldn't load — try again";
      }
    });
  }

  function renderFeed(slot, feed) {
    const wrap = document.createElement("div");
    wrap.className = "social-feed";
    for (const post of feed.posts || []) {
      const card = document.createElement("article");
      card.className = "social-post";
      const head = document.createElement("p");
      head.className = "social-post__head";
      const author = document.createElement("span");
      author.className = "social-post__author";
      author.textContent = post.author;
      const network = document.createElement("span");
      network.className = "social-post__network";
      network.textContent = post.network;
      head.append(author, network);
      const text = document.createElement("p");
      text.className = "social-post__text";
      text.textContent = post.text;
      card.append(head, text);
      wrap.append(card);
    }
    const status = document.createElement("p");
    status.className = "social-feed__status";
    status.textContent = feed.posts && feed.posts.length
      ? "Hand-picked posts — tag us and yours could be here."
      : "No posts yet — tag us on Instagram or Facebook!";
    slot.replaceChildren(wrap, status);
  }
})();
