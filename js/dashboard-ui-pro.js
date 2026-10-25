// Dashboard UI PRO — logo header, sidebar brand, load CSS
(function () {
  if (!document.body || document.body.getAttribute("data-page") !== "dashboard") return;

  if (!document.querySelector('link[href*="dashboard-pro.css"]')) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/dashboard-pro.css?v=20261025a";
    document.head.appendChild(link);
  }

  function upgradeHeader() {
    var header = document.querySelector(".dash-header");
    if (!header || header.querySelector(".dash-header__brand")) return;
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

  function run() {
    upgradeHeader();
    upgradeSidebar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  var root = document.getElementById("dashboard-root");
  if (root) {
    var obs = new MutationObserver(function () { run(); });
    obs.observe(root, { childList: true, subtree: true, attributes: true });
    setTimeout(function () { obs.disconnect(); }, 15000);
  }
  setTimeout(run, 400);
  setTimeout(run, 1200);
})();
