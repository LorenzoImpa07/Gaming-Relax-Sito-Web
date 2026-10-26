// Checkout + Cart visual PRO — hero logo + CSS Gaming Relax
(function () {
  var path = (location.pathname.split("/").pop() || "").toLowerCase();
  var isCart = path === "carrello.html" || path === "carrello";
  var isCo = path === "checkout.html" || path === "checkout";
  if (!isCart && !isCo) return;

  document.body.classList.add(isCart ? "page-cart" : "page-checkout");

  if (!document.querySelector('link[href*="cart-checkout-pro.css"]')) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/cart-checkout-pro.css?v=20261026a";
    document.head.appendChild(link);
  }

  function injectHero(title, sub, eyebrow) {
    if (document.querySelector(".gr-shop-hero")) return;
    var hero = document.createElement("div");
    hero.className = "gr-shop-hero";
    hero.innerHTML =
      '<div class="gr-shop-hero__logo"><img src="images/logo.png" alt="Gaming Relax"></div>' +
      '<div class="gr-shop-hero__text">' +
        '<p class="gr-shop-hero__eyebrow"><i></i> ' + eyebrow + "</p>" +
        "<h1>" + title + "</h1>" +
        '<p class="gr-shop-hero__sub">' + sub + "</p>" +
      "</div>";
    return hero;
  }

  function run() {
    if (isCo) {
      var wrap = document.querySelector(".co-wrap");
      var grid = document.querySelector(".co-grid");
      if (wrap && grid && !document.querySelector(".gr-shop-hero")) {
        var box = document.createElement("div");
        box.className = "container";
        box.style.marginBottom = "8px";
        box.appendChild(
          injectHero("Completa l'ordine", "Dati di spedizione e pagamento · Gaming Relax", "Checkout sicuro")
        );
        wrap.insertBefore(box, grid);
      }
    }
    if (isCart) {
      var page = document.getElementById("cart-page");
      if (page && !document.querySelector(".gr-shop-hero")) {
        var hero = injectHero(
          "Il tuo carrello",
          "Rivedi i prodotti e procedi al checkout sicuro",
          "Store"
        );
        page.parentNode.insertBefore(hero, page);
        var prev = hero.previousElementSibling;
        while (prev && (prev.matches("h1") || prev.classList.contains("eyebrow"))) {
          var rm = prev;
          prev = prev.previousElementSibling;
          rm.remove();
        }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
