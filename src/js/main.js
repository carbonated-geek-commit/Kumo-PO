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
      });
    });
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
