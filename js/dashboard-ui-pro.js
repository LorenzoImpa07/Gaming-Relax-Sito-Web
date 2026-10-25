// Dashboard UI PRO
(function () {
  if (!document.body || document.body.getAttribute("data-page") !== "dashboard") return;
  if (!document.getElementById("gr-dash-pro-inline")) {
    var st = document.createElement("style");
    st.id = "gr-dash-pro-inline";
    st.textContent = "body[data-page=dashboard]{background:#05070e!important;background-image:radial-gradient(1200px 600px at 10% -10%,rgba(139,61,255,.18),transparent 55%),radial-gradient(900px 500px at 95% 0,rgba(255,77,173,.12),transparent 50%)!important;background-attachment:fixed!important}.dash-header{position:relative;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:28px;margin-bottom:28px;border-radius:22px;border:1px solid rgba(139,61,255,.28);background:linear-gradient(135deg,rgba(255,77,173,.08),transparent 42%),rgba(18,16,36,.88);backdrop-filter:blur(18px)}.dash-header__brand{display:flex;align-items:center;gap:18px;z-index:1}.dash-header__logo{width:64px;height:64px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,77,173,.22)}.dash-header__logo img{width:100%;height:100%;object-fit:cover}.dash-header h1{font-size:clamp(26px,4vw,36px);margin:0;background:linear-gradient(105deg,#fff 20%,#ff4dad 55%,#8b3dff);-webkit-background-clip:text;background-clip:text;color:transparent}.dash-header__eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ff4dad}.dash-header__eyebrow i{width:8px;height:8px;border-radius:50%;background:#ff4dad;box-shadow:0 0 10px #ff4dad;animation:dp 1.8s ease-in-out infinite}@keyframes dp{50%{opacity:.45}}.dash-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;margin-bottom:28px}@media(max-width:1100px){.dash-stats{grid-template-columns:repeat(3,1fr)}}@media(max-width:640px){.dash-stats{grid-template-columns:repeat(2,1fr)}}.dash-stat{padding:18px 16px;border-radius:16px;border:1px solid rgba(139,61,255,.22);background:linear-gradient(160deg,rgba(139,61,255,.1),rgba(10,12,22,.9))}.dash-stat strong{display:block;font-size:28px;font-weight:800;color:#fff}.dash-stat span{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.45)}.dash-shell{display:grid;grid-template-columns:268px minmax(0,1fr);gap:22px}@media(max-width:900px){.dash-shell{grid-template-columns:1fr}}.dash-sidebar{position:sticky;top:96px;max-height:calc(100vh - 120px);overflow:auto;padding:16px 12px 20px;border-radius:20px;border:1px solid rgba(139,61,255,.28);background:rgba(18,16,36,.88)}.dash-sidebar__brand{display:flex;align-items:center;gap:12px;padding:10px 12px 16px;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,.06)}.dash-sidebar__brand img{width:40px;height:40px;border-radius:12px;object-fit:cover}.dash-sidebar__brand strong{display:block;color:#fff;font-size:14px}.dash-sidebar__brand small{color:rgba(255,255,255,.4);font-size:11px}.dash-tab{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:11px 12px;border-radius:12px;border:1px solid transparent;background:transparent;color:#b4bcc8;font-weight:600;font-size:13.5px;cursor:pointer;position:relative}.dash-tab span{width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;background:rgba(255,255,255,.04)}.dash-tab.active{background:linear-gradient(105deg,rgba(255,77,173,.28),rgba(139,61,255,.22))!important;color:#fff!important;border-color:rgba(255,77,173,.55)!important}.dash-panel{display:none}.dash-panel.active{display:block}";
    document.head.appendChild(st);
  }
  if (!document.querySelector('link[href*="gaming-polish.css"]')) {
    var pl = document.createElement("link");
    pl.rel = "stylesheet";
    pl.href = "css/gaming-polish.css?v=20261025a";
    document.head.appendChild(pl);
  }
  function upgradeHeader() {
    var header = document.querySelector(".dash-header");
    if (!header) return;
    if (!header.querySelector(".dash-header__brand")) {
      var email = document.getElementById("admin-email");
      var logout = document.getElementById("logout-dash");
      var emailHtml = email ? email.outerHTML : '<strong id="admin-email"></strong>';
      var left = document.createElement("div");
      left.className = "dash-header__brand";
      left.innerHTML = '<div class="dash-header__logo"><img src="images/logo.png" alt="Gaming Relax"></div><div class="dash-header__text"><span class="dash-header__eyebrow"><i></i> Command Center</span><h1>Dashboard</h1><span>Connesso come ' + emailHtml + '</span></div>';
      Array.from(header.children).forEach(function (ch) { if (ch !== logout) ch.remove(); });
      header.insertBefore(left, logout || null);
    }
    if (!header.querySelector(".dash-header__site")) {
      var logoutBtn = document.getElementById("logout-dash");
      var actions = header.querySelector(".dash-header__actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "dash-header__actions";
        if (logoutBtn) { header.appendChild(actions); actions.appendChild(logoutBtn); }
        else header.appendChild(actions);
      }
      var site = document.createElement("a");
      site.className = "dash-header__site";
      site.href = "index.html";
      site.target = "_blank";
      site.rel = "noopener";
      site.textContent = "Vedi sito ↗";
      actions.insertBefore(site, actions.firstChild);
    }
  }
  function upgradeSidebar() {
    var nav = document.querySelector(".dash-sidebar");
    if (!nav || nav.querySelector(".dash-sidebar__brand")) return;
    var brand = document.createElement("div");
    brand.className = "dash-sidebar__brand";
    brand.innerHTML = '<img src="images/logo.png" alt=""><div><strong>Gaming Relax</strong><small>Staff panel</small></div>';
    nav.insertBefore(brand, nav.firstChild);
  }
  function upgradeStats() {
    if (document.getElementById("stat-richieste")) return;
    var openSite = document.getElementById("dash-open-site");
    if (!openSite) return;
    var card = document.createElement("div");
    card.className = "dash-stat";
    card.innerHTML = '<strong id="stat-richieste">–</strong><span>Richieste aperte</span>';
    openSite.replaceWith(card);
  }
  function ensureContextBar() {
    var main = document.querySelector(".dash-main") || document.querySelector("#dashboard-root .container");
    if (!main) return null;
    var bar = document.getElementById("dash-context-bar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "dash-context-bar";
    bar.className = "dash-context";
    bar.innerHTML = '<div><span class="dash-context__label">Stai modificando</span><span class="dash-context__name">Pannello: <em id="dash-context-name">—</em></span></div>';
    var stats = main.querySelector(".dash-stats");
    if (stats && stats.nextSibling) main.insertBefore(bar, stats.nextSibling);
    else if (stats) stats.after(bar);
    else main.insertBefore(bar, main.firstChild);
    return bar;
  }
  function updateContextFromTab() {
    ensureContextBar();
    var nameEl = document.getElementById("dash-context-name");
    if (!nameEl) return;
    var active = document.querySelector(".dash-tab.active");
    var label = "Overview";
    if (active) {
      var clone = active.cloneNode(true);
      clone.querySelectorAll("span, i, svg").forEach(function (n) { n.remove(); });
      label = (clone.textContent || "").replace(/\s+/g, " ").trim() || "Overview";
    }
    nameEl.textContent = label;
  }
  function ensureToastHost() {
    var host = document.getElementById("gr-dash-toast-host");
    if (host) return host;
    host = document.createElement("div");
    host.id = "gr-dash-toast-host";
    host.className = "gr-dash-toast-host";
    document.body.appendChild(host);
    return host;
  }
  function showToast(msg) {
    var host = ensureToastHost();
    var t = document.createElement("div");
    t.className = "gr-dash-toast";
    t.innerHTML = '<span class="gr-dash-toast__ico">✓</span><span>' + (msg || "Salvato") + "</span>";
    host.appendChild(t);
    setTimeout(function () { t.classList.add("is-out"); setTimeout(function () { t.remove(); }, 220); }, 2600);
  }
  function bindSaveFeedback() {
    if (document.documentElement.dataset.grDashToastBound === "1") return;
    document.documentElement.dataset.grDashToastBound = "1";
    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (!form || !form.closest || !form.closest("#dashboard-root")) return;
      var btn = form.querySelector('button[type="submit"]');
      var txt = ((btn && btn.textContent) || "Salvato").trim();
      if (/elimina|delete|rimuovi/i.test(txt)) return;
      setTimeout(function () { showToast(/salva|crea|aggiorna|pubblica|invia/i.test(txt) ? "Salvato ✓" : "Operazione completata ✓"); }, 700);
    }, true);
  }
  function bindTabWatch() {
    if (document.documentElement.dataset.grDashTabBound === "1") return;
    document.documentElement.dataset.grDashTabBound = "1";
    document.addEventListener("click", function (e) {
      var tab = e.target && e.target.closest && e.target.closest(".dash-tab");
      if (!tab) return;
      setTimeout(updateContextFromTab, 30);
    });
  }
  function run() {
    upgradeHeader(); upgradeSidebar(); upgradeStats();
    ensureContextBar(); updateContextFromTab();
    bindSaveFeedback(); bindTabWatch();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  var root = document.getElementById("dashboard-root");
  if (root) {
    var obs = new MutationObserver(function () { run(); });
    obs.observe(root, { childList: true, subtree: true, attributes: true });
    setTimeout(function () { obs.disconnect(); }, 15000);
  }
  setTimeout(run, 400);
  setTimeout(run, 1200);
})();
