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
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((el) => el.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  const defaults = {
    discord: "https://discord.gg/5MxfYT7C5f",
    youtube: "https://www.youtube.com/@gamingrelaxofficials",
    instagram: "https://www.instagram.com/gamingrelaxofficials/",
    tiktok: "https://www.tiktok.com/@gamingrelaxofficials",
    email: "mailto:gamingrelaxofficials@gmail.com"
  };
  let socials = defaults;
  try { socials = Object.assign({}, defaults, JSON.parse(localStorage.getItem("gr_socials") || "{}")); } catch (_) {}
  Object.keys(defaults).forEach((key) => {
    const url = socials[key] || defaults[key];
    document.querySelectorAll('[data-social="' + key + '"]').forEach((el) => {
      if (!url) return;
      el.href = url;
      if (key !== "email") { el.target = "_blank"; el.rel = "noopener"; }
    });
  });
  window.__grSocials = socials;

  if (!document.querySelector('.floating-discord') && document.body.dataset.page !== 'dashboard') {
    const discordBtn = document.createElement('a');
    discordBtn.className = 'floating-discord';
    discordBtn.href = socials.discord || 'https://discord.gg/5MxfYT7C5f';
    discordBtn.target = '_blank';
    discordBtn.rel = 'noopener';
    discordBtn.setAttribute('aria-label', 'Contattaci su Discord');
    discordBtn.innerHTML = '◈';
    document.body.appendChild(discordBtn);
  }

  if (!localStorage.getItem('gr_cookie_notice_seen') && !document.querySelector('.cookie-banner')) {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.innerHTML = `
      <p>Questo sito usa solo cookie tecnici necessari al suo funzionamento (es. mantenere la sessione di accesso). Nessun cookie di profilazione pubblicitaria. <a href="privacy.html">Privacy Policy</a></p>
      <button type="button" class="btn btn--lime" id="cookie-ok">Ho capito</button>
    `;
    document.body.appendChild(banner);
    document.getElementById('cookie-ok').addEventListener('click', () => {
      localStorage.setItem('gr_cookie_notice_seen', '1');
      banner.remove();
    });
  }
}

document.addEventListener('DOMContentLoaded', bindPageChrome);
window.addEventListener('gr:navigated', bindPageChrome);

(function galaxyHover() {
  const SEL = 'a, button, .btn, section, article, .feature-card, .product-card, .team-card, .home-news-card, .home-store-card, .partner-card, .gallery-post, .cta-banner, .studio-contact__info, .filter-pill, .dash-tab, .faq-item, .cart-item';
  const SKIP = '.gx-layer, input, textarea, select, .promo-banner, .cookie-banner, .art-lightbox';
  const layer = document.createElement('div');
  layer.className = 'gx-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<div class="gx-nebula"></div><div class="gx-stars"></div><div class="gx-dust"></div>';
  let current = null;
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

