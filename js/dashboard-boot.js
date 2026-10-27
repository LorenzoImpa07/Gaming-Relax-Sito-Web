// Carica la Dashboard completa e la scrive nel documento
(async function () {
  var boot = document.getElementById("boot");
  function fail(msg) {
    if (boot) {
      boot.innerHTML =
        "<p>" +
        msg +
        '</p><p style="margin-top:16px"><a href="dashboard.html">Riprova</a> · <a href="login.html">Login</a></p>';
    }
  }
  try {
    var urls = [
      "https://cdn.jsdelivr.net/gh/LorenzoImpa07/Gaming-Relax-Sito-Web@df2fc28d/dashboard.html",
      "https://raw.githack.com/LorenzoImpa07/Gaming-Relax-Sito-Web/df2fc28d/dashboard.html"
    ];
    var html = null;
    var lastErr = "";
    for (var i = 0; i < urls.length; i++) {
      try {
        var ctrl = new AbortController();
        var timer = setTimeout(function () {
          ctrl.abort();
        }, 15000);
        var res = await fetch(urls[i], {
          cache: "no-store",
          mode: "cors",
          signal: ctrl.signal
        });
        clearTimeout(timer);
        if (!res.ok) {
          lastErr = "HTTP " + res.status;
          continue;
        }
        var text = await res.text();
        if (
          text &&
          text.indexOf("dashboard-root") !== -1 &&
          text.indexOf("product-form") !== -1
        ) {
          html = text;
          break;
        }
        lastErr = "HTML incompleto";
      } catch (e) {
        lastErr = e && e.message ? e.message : String(e);
      }
    }
    if (!html) {
      fail("Download fallito: " + lastErr);
      return;
    }

    // Forza i path relativi sul dominio del sito
    if (html.indexOf("<base ") === -1) {
      html = html.replace(
        /<head[^>]*>/i,
        function (m) {
          return m + '<base href="' + location.origin + '/">';
        }
      );
    }

    // Cache-bust script
    html = html.replace(/js\/auth\.js\?v=[^"]+/g, "js/auth.js?v=20261027a");
    html = html.replace(/js\/dashboard\.js\?v=[^"]+/g, "js/dashboard.js?v=20261027a");
    html = html.replace(/js\/firebase-init\.js\?v=[^"]+/g, "js/firebase-init.js?v=20261027a");
    html = html.replace(/js\/banner\.js\?v=[^"]+/g, "js/banner.js?v=20261027a");
    html = html.replace(/js\/cart\.js\?v=[^"]+/g, "js/cart.js?v=20261027a");

    // Fix accesso
    if (html.indexOf("dash-fix.js") === -1) {
      html = html.replace(
        "</body>",
        '<script type="module" src="js/dash-fix.js?v=20261027a"></script></body>'
      );
    }
    if (html.indexOf("dash-guard-boot.js") === -1) {
      html = html.replace(
        "</body>",
        '<script src="js/dash-guard-boot.js?v=20261027a"></script></body>'
      );
    }

    document.open();
    document.write(html);
    document.close();
  } catch (err) {
    fail("Errore: " + (err && err.message ? err.message : err));
  }
})();
