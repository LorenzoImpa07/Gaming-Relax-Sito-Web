// Dashboard UI PRO — logo, sidebar, stats, contesto tab, toast, link sito
(function () {
  if (!document.body || document.body.getAttribute("data-page") !== "dashboard") return;

  if (!document.querySelector('link[href*="dashboard-pro.css"]')) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/dashboard-pro.css?v=20261025c";
    document.head.appendChild(link);
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
      left.innerHTML =
        '<div class="dash-header__logo"><img src="images/logo.png" alt="Gaming Relax"></div>' +
        '<div class="dash-header__text">' +
          '<span class="dash-header__eyebrow"><i></i> Command Center</span>' +
          "<h1>Dashboard</h1>" +
          "<span>Connesso come " + emailHtml + "</span>" +
        "</div>";
      Array.from(header.children).forEach(function (ch) {
        if (ch !== logout) ch.remove();
      });
      header.insertBefore(left, logout || null);
    }

    // 8 — Link "Vedi sito" in header
    if (!header.querySelector(".dash-header__site")) {
      var logoutBtn = document.getElementById("logout-dash");
      var actions = header.querySelector(".dash-header__actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "dash-header__actions";
        if (logoutBtn) {
          header.appendChild(actions);
          actions.appendChild(logoutBtn);
        } else {
          header.appendChild(actions);
        }
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
    brand.innerHTML =
      '<img src="images/logo.png" alt="">' +
      "<div><strong>Gaming Relax</strong><small>Staff panel</small></div>";
    nav.insertBefore(brand, nav.firstChild);
  }

  function upgradeStats() {
    if (document.getElementById("stat-richieste")) return;
    var openSite = document.getElementById("dash-open-site");
    if (!openSite) return;
    var card = document.createElement("div");
    card.className = "dash-stat";
    card.innerHTML =
      '<strong id="stat-richieste">–</strong>' +
      "<span>Richieste aperte</span>";
    openSite.replaceWith(card);
  }

  // 6 — Etichetta "Stai modificando: …"
  function ensureContextBar() {
    var main = document.querySelector(".dash-main") || document.querySelector("#dashboard-root .container");
    if (!main) return null;
    var bar = document.getElementById("dash-context-bar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "dash-context-bar";
    bar.className = "dash-context";
    bar.innerHTML =
      '<div><span class="dash-context__label">Stai modificando</span>' +
      '<span class="dash-context__name">Pannello: <em id="dash-context-name">—</em></span></div>';
    var stats = main.querySelector(".dash-stats");
    if (stats && stats.nextSibling) {
      main.insertBefore(bar, stats.nextSibling);
    } else if (stats) {
      stats.after(bar);
    } else {
      main.insertBefore(bar, main.firstChild);
    }
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

  // 7 — Toast "Salvato"
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
    setTimeout(function () {
      t.classList.add("is-out");
      setTimeout(function () { t.remove(); }, 220);
    }, 2600);
  }

  function bindSaveFeedback() {
    if (document.documentElement.dataset.grDashToastBound === "1") return;
    document.documentElement.dataset.grDashToastBound = "1";
    document.addEventListener(
      "submit",
      function (e) {
        var form = e.target;
        if (!form || !form.closest || !form.closest("#dashboard-root")) return;
        var btn = form.querySelector('button[type="submit"]');
        var txt = ((btn && btn.textContent) || form.getAttribute("data-toast") || "Salvato").trim();
        if (/elimina|delete|rimuovi/i.test(txt)) return;
        setTimeout(function () {
          showToast(/salva|crea|aggiorna|pubblica|invia/i.test(txt) ? "Salvato ✓" : "Operazione completata ✓");
        }, 700);
      },
      true
    );
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
    upgradeHeader();
    upgradeSidebar();
    upgradeStats();
    ensureContextBar();
    updateContextFromTab();
    bindSaveFeedback();
    bindTabWatch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  var root = document.getElementById("dashboard-root");
  if (root) {
    var obs = new MutationObserver(function () {
      run();
    });
    obs.observe(root, { childList: true, subtree: true, attributes: true });
    setTimeout(function () {
      obs.disconnect();
    }, 15000);
  }
  setTimeout(run, 400);
  setTimeout(run, 1200);
})();
