// Fallback non-modulo: se dopo 5s siamo ancora su Verifica, mostra login
(function () {
  function fix() {
    var g = document.getElementById("dashboard-guard");
    if (!g) return;
    if (g.style.display === "none") return;
    var t = (g.textContent || "").toLowerCase();
    if (t.indexOf("verifica accesso") === -1) return;
    g.innerHTML =
      "<p>Accesso non completato.<br>" +
      "<a href='login.html' class='btn btn--lime' style='margin-top:16px;'>Vai al login</a> " +
      "<a href='dashboard.html' class='btn btn--outline' style='margin-top:16px;margin-left:8px;'>Ricarica</a></p>";
    g.style.display = "flex";
  }
  setTimeout(fix, 5000);
})();
