// Sblocca Dashboard bloccata su "Verifica accesso in corso…"
import { auth, ADMIN_EMAIL, authReady } from "./firebase-init.js?v=20261027b";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function isAdmin(user) {
  if (!user) return false;
  return (
    String(user.email || "")
      .trim()
      .toLowerCase() ===
    String(ADMIN_EMAIL || "")
      .trim()
      .toLowerCase()
  );
}

function setGuard(html) {
  var guard = document.getElementById("dashboard-guard");
  var root = document.getElementById("dashboard-root");
  if (!guard) return;
  guard.innerHTML = html;
  guard.style.display = "flex";
  if (root) root.style.display = "none";
}

function unlockAdmin(user) {
  var guard = document.getElementById("dashboard-guard");
  var root = document.getElementById("dashboard-root");
  if (guard) guard.style.display = "none";
  if (root) root.style.display = "block";
  var emailEl = document.getElementById("admin-email");
  if (emailEl && user && user.email) emailEl.textContent = user.email;
}

function stillVerifying() {
  var guard = document.getElementById("dashboard-guard");
  if (!guard) return false;
  if (guard.style.display === "none") return false;
  return /verifica accesso/i.test(guard.textContent || "");
}

(async function () {
  try {
    await authReady;
  } catch (_) {}

  // Subito: se già loggato come admin
  if (isAdmin(auth.currentUser) && stillVerifying()) {
    unlockAdmin(auth.currentUser);
  }

  onAuthStateChanged(auth, function (user) {
    if (isAdmin(user)) {
      // Se dashboard.js non ha sbloccato entro 1.2s, sblocchiamo noi
      setTimeout(function () {
        if (stillVerifying()) unlockAdmin(user);
      }, 1200);
      return;
    }
    setTimeout(function () {
      if (!stillVerifying()) return;
      if (!user) {
        setGuard(
          "<p>Devi accedere con l'account amministratore.<br>" +
            "<a href='login.html' class='btn btn--lime' style='margin-top:16px;'>Vai al login</a></p>"
        );
      } else {
        setGuard(
          "<p>Questo account non ha accesso alla Dashboard.<br>" +
            "<a href='index.html' class='btn btn--outline' style='margin-top:16px;'>Torna al sito</a></p>"
        );
      }
    }, 1500);
  });

  // Ultima rete di sicurezza
  setTimeout(function () {
    if (!stillVerifying()) return;
    var u = auth.currentUser;
    if (isAdmin(u)) {
      unlockAdmin(u);
      return;
    }
    setGuard(
      "<p>Accesso non completato.<br>" +
        "<a href='login.html' class='btn btn--lime' style='margin-top:16px;'>Vai al login</a> " +
        "<a href='dashboard.html' class='btn btn--outline' style='margin-top:16px;margin-left:8px;'>Ricarica</a></p>"
    );
  }, 5000);
})();
