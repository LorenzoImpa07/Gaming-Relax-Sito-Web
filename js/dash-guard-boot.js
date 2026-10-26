// Emergency dashboard guard — se dashboard.js non risponde
(function () {
  function fix() {
    var g = document.getElementById("dashboard-guard");
    if (!g) return;
    var t = (g.textContent || "").toLowerCase();
    if (t.indexOf("verifica accesso") === -1) return;
    g.innerHTML = "<p>La verifica sta impiegando troppo tempo.<br>Prova ad accedere di nuovo oppure ricarica.<br>"
      + "<a href='login.html' class='btn btn--lime' style='margin-top:16px;'>Vai al login</a> "
      + "<a href='dashboard.html' class='btn btn--outline' style='margin-top:16px;margin-left:8px;'>Ricarica</a></p>";
    g.style.display = "flex";
  }
  setTimeout(fix, 8000);
})();
