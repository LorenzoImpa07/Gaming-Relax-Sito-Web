// Site pages PRO loader (Home resta invariata — skip in site-ui-pro.js)
(function () {
  if (typeof document === "undefined") return;
  var p = (location.pathname.split("/").pop() || "").toLowerCase();
  if (!p || p === "index.html" || p === "index") return;
  if (p === "dashboard.html" || p === "store.html" || p === "carrello.html" || p === "checkout.html") return;
  if (document.querySelector('script[src*="site-ui-pro.js"]')) return;
  var s = document.createElement("script");
  s.src = "js/site-ui-pro.js?v=20261026a";
  s.defer = true;
  (document.body || document.documentElement).appendChild(s);
})();

// ==========================================================================
// Gaming Relax — interazioni base
// ==========================================================================

(function prefetchPages() {
  const seen = new Set();
  function prefetch(href) {
    try {
      const u = new URL(href, location.href);
      if (u.origin !== location.origin) return;
      if (u.pathname === location.pathname && u.search === location.search) return;
      const key = u.pathname + u.search;
      if (seen.has(key)) return;
      seen.add(key);
      const l = document.createElement("link");
      l.rel = "prefetch";
      l.href = u.href;
      document.head.appendChild(l);
    } catch (_) {}
  }
  document.addEventListener("pointerover", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (a) prefetch(a.getAttribute("href"));
  }, true);
})();

function bindPageChrome() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
    if (!window.__grNavDocBound) {
      window.__grNavDocBound = true;
      document.addEventListener('click', (e) => {
        const n = document.querySelector('.main-nav');
        const t = document.querySelector('.nav-toggle');
        if (n && t && !n.contains(e.target) && !t.contains(e.target)) n.classList.remove('open');
      });
    }
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  document.querySelectorAll('[data-footer="copy"]').forEach((el) => {
    if (!el.dataset.grYear) {
      el.dataset.grYear = '1';
      const y = new Date().getFullYear();
      el.textContent = el.textContent.replace(/20\d{2}/, String(y));
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindPageChrome);
} else {
  bindPageChrome();
}

window.addEventListener('gr:navigated', bindPageChrome);
