// Carica Dashboard completa + sblocca il guard di accesso
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
        var timer = setTimeout(function () { ctrl.abort(); }, 15000);
        var res = await fetch(urls[i], { cache: "no-store", mode: "cors", signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) { lastErr = "HTTP " + res.status; continue; }
        var text = await res.text();
        if (text && text.indexOf("dashboard-root") !== -1 && text.indexOf("product-form") !== -1) {
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

    // Base path sul dominio del sito
    if (html.indexOf("<base ") === -1) {
      html = html.replace(/<head[^>]*>/i, function (m) {
        return m + '<base href="' + location.origin + '/">';
      });
    }

    // Cache-bust
    html = html.replace(/js\/auth\.js\?v=[^"]+/g, "js/auth.js?v=20261027b");
    html = html.replace(/js\/dashboard\.js\?v=[^"]+/g, "js/dashboard.js?v=20261027b");
    html = html.replace(/js\/firebase-init\.js\?v=[^"]+/g, "js/firebase-init.js?v=20261027b");
    html = html.replace(/js\/banner\.js\?v=[^"]+/g, "js/banner.js?v=20261027b");
    html = html.replace(/js\/cart\.js\?v=[^"]+/g, "js/cart.js?v=20261027b");

    // Script anti-blocco (modulo + fallback non-modulo)
    var inject =
      '<script type="module" src="js/dash-fix.js?v=20261027b"></script>' +
      '<script src="js/dash-guard-boot.js?v=20261027b"></script>' +
      "<script>(function(){" +
      "function paint(msg){var g=document.getElementById('dashboard-guard');var r=document.getElementById('dashboard-root');" +
      "if(!g)return;g.style.display='flex';g.innerHTML=msg;if(r)r.style.display='none';}" +
      "setTimeout(function(){var g=document.getElementById('dashboard-guard');" +
      "if(!g||g.style.display==='none')return;" +
      "var t=(g.textContent||'').toLowerCase();" +
      "if(t.indexOf('verifica accesso')===-1)return;" +
      "paint('<p>Accesso non completato.<br>Se sei admin, accedi di nuovo.<br>'+" +
      "'<a href=\"login.html\" class=\"btn btn--lime\" style=\"margin-top:16px\">Vai al login</a> '+" +
      "'<a href=\"dashboard.html\" class=\"btn btn--outline\" style=\"margin-top:16px;margin-left:8px\">Ricarica</a></p>');" +
      "},4500);" +
      "})();</script>";

    if (html.indexOf("dash-fix.js") === -1) {
      html = html.replace("</body>", inject + "</body>");
    } else {
      html = html.replace("</body>", inject + "</body>");
    }

    document.open();
    document.write(html);
    document.close();
  } catch (err) {
    fail("Errore: " + (err && err.message ? err.message : err));
  }
})();
