// Navigazione fluida: lo sfondo resta fisso, cambia solo il contenuto.
(function () {
  const GLOBAL = [
    "js/script.js",
    "js/firebase-init.js",
    "js/firebase-config.js",
    "js/cart.js",
    "js/auth.js",
    "js/banner.js",
    "js/bg-scene.js",
    "js/email-check.js",
    "js/smooth-nav.js",
    "js/live.js",
    "js/user-card.js"
  ];
  const HARD = ["dashboard.html", "checkout.html", "carrello.html"];
  const KEEP_SEL = ["#page-bg", ".cookie-banner", ".floating-discord", ".promo-banner"];
  let busy = false;
  const cache = new Map();

  function sameOrigin(href) {
    try {
      const u = new URL(href, location.href);
      return u.origin === location.origin;
    } catch (_) {
      return false;
    }
  }

  function isHard(href) {
    try {
      const u = new URL(href, location.href);
      return HARD.some((f) => u.pathname.endsWith("/" + f) || u.pathname.endsWith(f));
    } catch (_) {
      return true;
    }
  }

  function isGlobalSrc(src) {
    if (!src) return true;
    return GLOBAL.some((g) => src.indexOf(g) !== -1);
  }

  function shouldIntercept(a, e) {
    if (!a || (e && e.defaultPrevented)) return false;
    if (e && e.button !== 0) return false;
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return false;
    if (a.target && a.target !== "" && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    if (!sameOrigin(href)) return false;
    if (isHard(href)) return false;
    const u = new URL(href, location.href);
    if (e && u.pathname === location.pathname && u.search === location.search && u.hash) return false;
    return true;
  }

  function pinBackground() {
    const bg = document.getElementById("page-bg");
    if (bg && bg.parentElement !== document.documentElement) {
      document.documentElement.prepend(bg);
    }
  }

  function takeKeepers() {
    pinBackground();
    const list = [];
    KEEP_SEL.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => list.push(el));
    });
    return list;
  }

  async function loadHtml(url) {
    if (cache.has(url)) return cache.get(url);
    const p = fetch(url, { credentials: "same-origin", headers: { "X-GR-Nav": "1" } })
      .then((res) => {
        if (!res.ok) throw new Error("nav");
        return res.text();
      })
      .catch((err) => {
        cache.delete(url);
        throw err;
      });
    cache.set(url, p);
    return p;
  }

  function prefetch(url) {
    if (cache.has(url)) return;
    loadHtml(url).catch(() => {});
  }

  async function swapTo(url, push) {
    if (busy) return;
    busy = true;
    document.documentElement.classList.add("gr-nav");
    try {
      const html = await loadHtml(url);
      const next = new DOMParser().parseFromString(html, "text/html");
      const pageScripts = [...next.querySelectorAll("script")].map((s) => ({
        src: s.getAttribute("src"),
        type: s.getAttribute("type") || "",
        text: s.textContent || ""
      }));

      if (window.__grCleanups) {
        window.__grCleanups.splice(0).forEach((fn) => { try { fn(); } catch (_) {} });
      }

      const keepers = takeKeepers();
      next.querySelectorAll("#page-bg, .cookie-banner, .floating-discord").forEach((el) => el.remove());

      document.title = next.title || document.title;
      const page = next.body.getAttribute("data-page");
      if (page) document.body.setAttribute("data-page", page);
      else document.body.removeAttribute("data-page");
      document.body.className = next.body.className;
      document.body.classList.add("has-page-bg");
      document.documentElement.classList.add("has-page-bg");

      document.body.innerHTML = next.body.innerHTML;
      document.body.querySelectorAll("script").forEach((s) => s.remove());

      keepers.forEach((el) => {
        if (el.id === "page-bg") document.documentElement.prepend(el);
        else if (!el.isConnected) document.body.appendChild(el);
      });
      pinBackground();
      window.scrollTo(0, 0);

      if (push) history.pushState({ gr: 1 }, "", url);

      const gen = String(Date.now());
      for (const spec of pageScripts) {
        if (spec.src && isGlobalSrc(spec.src)) continue;
        if (!spec.src) continue;
        try {
          const abs = new URL(spec.src, location.href);
          if (spec.type === "module" || spec.src.includes(".js")) {
            abs.searchParams.set("nav", gen);
            await import(abs.href);
          }
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent("gr:navigated", { detail: { url } }));
    } catch (_) {
      location.href = url;
    } finally {
      busy = false;
      document.documentElement.classList.remove("gr-nav");
    }
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!shouldIntercept(a, e)) return;
    e.preventDefault();
    const next = new URL(a.getAttribute("href"), location.href);
    if (next.href === location.href) return;
    swapTo(next.href, true);
  }, true);

  document.addEventListener("pointerover", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
    if (!sameOrigin(href) || isHard(href)) return;
    prefetch(new URL(href, location.href).href);
  }, true);

  window.addEventListener("popstate", () => {
    swapTo(location.href, false);
  });

  if (!history.state || !history.state.gr) {
    history.replaceState({ gr: 1 }, "", location.href);
  }

  pinBackground();
})();
