// Store PRO — hero brand chip + page class
(function () {
  var path = (location.pathname.split("/").pop() || "").toLowerCase();
  if (path !== "store.html" && path !== "store") return;

  document.body.classList.add("page-store");

  if (!document.querySelector('link[href*="store-pro.css"]')) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/store-pro.css?v=20261026a";
    document.head.appendChild(link);
  }

  function run() {
    var hero = document.querySelector(".store-hero .container");
    if (!hero || hero.querySelector(".store-hero__brand")) return;
    var chip = document.createElement("div");
    chip.className = "store-hero__brand";
    chip.innerHTML =
      '<img src="images/logo.png" alt="Gaming Relax">' +
      "<i></i><span>Gaming Relax Store</span>";
    var h1 = hero.querySelector("h1");
    if (h1) hero.insertBefore(chip, h1);
    else hero.insertBefore(chip, hero.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
