// Site pages PRO — tutte tranne Home
(function () {
  var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (!path || path === "index.html" || path === "index" || path === "") return;
  if (path === "dashboard.html" || path === "dashboard") return;
  if (path === "store.html" || path === "store") return;
  if (path === "carrello.html" || path === "carrello") return;
  if (path === "checkout.html" || path === "checkout") return;

  document.body.classList.add("page-site");

  if (!document.querySelector('link[href*="site-pages-pro.css"]')) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/site-pages-pro.css?v=20261026a";
    document.head.appendChild(link);
  }

  var LABELS = {
    "chi-siamo.html": "Chi siamo",
    "art.html": "Art",
    "custom.html": "Custom Studio",
    "contatti.html": "Contatti",
    "faq.html": "FAQ",
    "forum.html": "Forum",
    "forum-board.html": "Forum",
    "forum-topic.html": "Forum",
    "team.html": "Team",
    "novita.html": "Novità",
    "recensioni.html": "Recensioni",
    "login.html": "Accesso",
    "register.html": "Registrazione",
    "profilo.html": "Profilo",
    "prodotto.html": "Prodotto",
    "creator.html": "Creator",
    "grazie.html": "Ordine",
    "privacy.html": "Privacy",
    "termini.html": "Termini",
    "cookies.html": "Cookie"
  };

  function run() {
    var hero = document.querySelector(
      ".page-hero .container, .art-hero .container, .process-hero .container, " +
      ".contact-hero .container, .faq-hero .container, .thanks-hero .container"
    );
    if (!hero || hero.querySelector(".gr-page-chip")) return;
    if (hero.closest(".store-hero")) return;

    var label = LABELS[path] || "Gaming Relax";
    var chip = document.createElement("div");
    chip.className = "gr-page-chip";
    chip.innerHTML =
      '<img src="images/logo.png" alt="Gaming Relax">' +
      "<i></i><span>" + label + "</span>";

    var h1 = hero.querySelector("h1");
    var eyebrow = hero.querySelector(".eyebrow");
    if (eyebrow) hero.insertBefore(chip, eyebrow);
    else if (h1) hero.insertBefore(chip, h1);
    else hero.insertBefore(chip, hero.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
