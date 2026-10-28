// Assembla la Dashboard da parti sullo stesso dominio (niente CORS / document.write instabile)
(async function () {
  var msg = document.getElementById("boot-msg");
  var sub = document.getElementById("boot-sub");
  function set(t, s) {
    if (msg) msg.textContent = t;
    if (sub) {
      if (s) { sub.style.display = "block"; sub.innerHTML = s; }
      else sub.style.display = "none";
    }
  }
  try {
    var parts = [];
    for (var i = 0; i < 5; i++) {
      set("Caricamento Dashboard…", "Parte " + (i + 1) + " di 5");
      var r = await fetch("dash-part-" + i + ".txt?v=20261028a", { cache: "no-store" });
      if (!r.ok) throw new Error("Parte " + i + " non trovata (HTTP " + r.status + ")");
      parts.push(await r.text());
    }
    var html = parts.join("");
    if (html.indexOf("dashboard-root") === -1 || html.indexOf("product-form") === -1) {
      throw new Error("HTML Dashboard incompleto");
    }
    document.open();
    document.write(html);
    document.close();
  } catch (err) {
    set(
      "Impossibile caricare la Dashboard",
      (err && err.message ? err.message : String(err)) +
        '<br><a class="btn" href="login.html">Vai al login</a> <a class="btn" href="dashboard.html" style="background:transparent;color:#ff4dad;border:1px solid #ff4dad">Riprova</a>'
    );
  }
})();
