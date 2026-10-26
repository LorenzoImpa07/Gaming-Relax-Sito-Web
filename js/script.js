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

  document.querySelectorAll('.faq-item__q').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const was = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((el) => el.classList.remove('open'));
      if (!was) item.classList.add('open');
    });
  });

  document.querySelectorAll('[data-footer="copy"]').forEach((el) => {
    if (!el.dataset.grYear) {
      el.dataset.grYear = '1';
      const y = new Date().getFullYear();
      el.textContent = el.textContent.replace(/20\d{2}/, String(y));
    }
  });

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindPageChrome);
} else {
  bindPageChrome();
}

window.addEventListener('gr:navigated', bindPageChrome);

function bindHeaderScroll() {
  const h = document.querySelector('.site-header');
  if (!h) return;
  const onHome = document.body && document.body.dataset.page === 'home';
  function sync() {
    if (!onHome || window.scrollY > 20) h.classList.add('is-scrolled');
    else h.classList.remove('is-scrolled');
  }
  sync();
  if (!window.__grHeaderScroll) {
    window.__grHeaderScroll = true;
    window.addEventListener('scroll', () => {
      const head = document.querySelector('.site-header');
      if (!head) return;
      if (document.body.dataset.page !== 'home' || window.scrollY > 20) head.classList.add('is-scrolled');
      else head.classList.remove('is-scrolled');
    }, { passive: true });
  }
}
bindHeaderScroll();
window.addEventListener('gr:navigated', bindHeaderScroll);

function bindReveal() {
  const nodes = document.querySelectorAll('.reveal');
  if (!nodes.length) return;
  if (!('IntersectionObserver' in window)) {
    nodes.forEach((n) => n.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  nodes.forEach((n) => io.observe(n));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindReveal);
else bindReveal();
window.addEventListener('gr:navigated', bindReveal);

(function galaxyHover() {
  const SEL = '.team-card, .product-card, .card, .feature-card, .service-card, .news-card, .review-card, .auth-card';
  const SKIP = 'a,button,input,textarea,select,label,.gx-layer';
  let current = null;
  const layer = document.createElement('div');
  layer.className = 'gx-layer';
  layer.setAttribute('aria-hidden', 'true');
  function clear() {
    if (!current) return;
    current.classList.remove('gx-hot');
    current = null;
    layer.remove();
  }
  function attach(el) {
    if (current === el) return;
    if (current) current.classList.remove('gx-hot');
    current = el;
    const pos = getComputedStyle(el).position;
    if (pos === 'static') el.style.position = 'relative';
    el.classList.add('gx-hot');
    el.appendChild(layer);
  }
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const skip = e.target.closest && e.target.closest(SKIP);
    if (skip && skip.classList && skip.classList.contains('gx-layer')) return;
    const el = e.target.closest && e.target.closest(SEL);
    if (!el || (e.target.closest && e.target.closest(SKIP) && !el.contains(layer))) {
      clear();
      return;
    }
    attach(el);
    const r = el.getBoundingClientRect();
    el.style.setProperty('--gx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--gy', (e.clientY - r.top) + 'px');
  }, { passive: true });
  document.addEventListener('pointerleave', clear);
})();
