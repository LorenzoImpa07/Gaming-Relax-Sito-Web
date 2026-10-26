// Fix Dashboard bloccata su "Verifica accesso in corso…"
import { auth, ADMIN_EMAIL, authReady } from "./firebase-init.js?v=20260920n";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function isAdmin(user) {
  if (!user) return false;
  return String(user.email || "").trim().toLowerCase() === String(ADMIN_EMAIL || "").trim().toLowerCase();
}

function setGuard(html) {
  const guard = document.getElementById("dashboard-guard");
  const root = document.getElementById("dashboard-root");
  if (!guard) return;
  guard.innerHTML = html;
  guard.style.display = "flex";
  if (root) root.style.display = "none";
}

function stillVerifying() {
  const guard = document.getElementById("dashboard-guard");
  if (!guard) return false;
  if (guard.style.display === "none") return false;
  return /verifica accesso/i.test(guard.textContent || "");
}

(async function () {
  try { await authReady; } catch (_) {}

  setTimeout(() => {
    if (!stillVerifying()) return;
    const u = auth.currentUser;
    if (isAdmin(u)) {
      setGuard(
        "<p>Accesso admin rilevato, ma la Dashboard non è partita.<br>" +
        "Prova a ricaricare la pagina.<br>" +
        "<a href='dashboard.html' class='btn btn--lime' style='margin-top:16px;'>Ricarica Dashboard</a></p>"
      );
    } else if (u) {
      setGuard(
        "<p>Questo account non ha accesso alla Dashboard.<br>" +
        "<a href='index.html' class='btn btn--outline' style='margin-top:16px;'>Torna al sito</a></p>"
      );
    } else {
      setGuard(
        "<p>Devi accedere con l'account amministratore.<br>" +
        "<a href='login.html' class='btn btn--lime' style='margin-top:16px;'>Vai al login</a></p>"
      );
    }
  }, 8000);

  onAuthStateChanged(auth, (user) => {
    setTimeout(() => {
      if (!stillVerifying()) return;
      if (isAdmin(user)) {
        const guard = document.getElementById("dashboard-guard");
        const root = document.getElementById("dashboard-root");
        if (guard) guard.style.display = "none";
        if (root) root.style.display = "block";
        const emailEl = document.getElementById("admin-email");
        if (emailEl && user.email) emailEl.textContent = user.email;
      } else if (!user) {
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
    }, 2500);
  });
})();
