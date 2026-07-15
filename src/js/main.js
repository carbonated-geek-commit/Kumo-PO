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
