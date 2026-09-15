// ==========================================================================
// Gaming Relax — interazioni base
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // --- Menu di navigazione (hamburger) ---
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('open');
      }
    });
  }

  // --- FAQ accordion ---
  document.querySelectorAll('.faq-item__q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((el) => el.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  // --- Filtri Store e Team: gestiti dinamicamente da store-dynamic.js e team-dynamic.js ---
  // --- Wishlist: gestita da store-dynamic.js (persistenza reale, non solo UI) ---

  // --- Form contatti (demo: nessun invio reale, da collegare a un backend) ---
  // --- Form contatti: gestito da js/contact-form.js (salvataggio reale su Firestore) ---

  // --- Animazione "fade-in" delle sezioni allo scroll (esclude gli hero, già visibili al caricamento) ---
  const revealTargets = Array.from(document.querySelectorAll('section')).filter(
    (el) => !el.className.includes('hero')
  );
  if (revealTargets.length && 'IntersectionObserver' in window) {
    revealTargets.forEach((el) => el.classList.add('reveal'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach((el) => observer.observe(el));
  }

  // --- Pulsante "Torna su" ---
  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Torna in cima alla pagina');
  backToTop.innerHTML = '↑';
  document.body.appendChild(backToTop);

  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 500);
  });
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // --- Pulsante Discord flottante (contatto rapido) ---
  if (!document.body.dataset.page || document.body.dataset.page !== 'dashboard') {
    const discordBtn = document.createElement('a');
    discordBtn.className = 'floating-discord';
    discordBtn.href = 'https://discord.gg/5MxfYT7C5f';
    discordBtn.target = '_blank';
    discordBtn.rel = 'noopener';
    discordBtn.setAttribute('aria-label', 'Contattaci su Discord');
    discordBtn.innerHTML = '◈';
    document.body.appendChild(discordBtn);
  }

  // --- Banner informativo sui cookie (solo cookie tecnici, mostrato una volta) ---
  if (!localStorage.getItem('gr_cookie_notice_seen')) {
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

});
