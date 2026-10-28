// Controllo accesso Dashboard — leggero, senza dashboard.js
import { auth, ADMIN_EMAIL, authReady } from "./firebase-init.js?v=20261028c";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const status = document.getElementById("status");
const actions = document.getElementById("actions");
if (!status || !actions) {
  /* pagina non è la emergency dashboard */
} else {
  function paint(msg, html, ok) {
    status.innerHTML = msg;
    status.className = ok ? "ok" : "err";
    if (html) {
      actions.style.display = "block";
      actions.innerHTML = html;
    }
  }

  try {
    await authReady;
  } catch (_) {}

  onAuthStateChanged(auth, (user) => {
    const admin = String(ADMIN_EMAIL || "").trim().toLowerCase();
    const email = user && user.email ? String(user.email).trim().toLowerCase() : "";

    if (!user) {
      paint(
        "Devi accedere con l'account amministratore.",
        '<a class="btn btn-pink" href="login.html">Vai al login</a>'
      );
      return;
    }

    if (email !== admin) {
      paint(
        "Questo account non è amministratore: " + (user.email || ""),
        '<a class="btn btn-out" href="index.html">Torna al sito</a>'
      );
      return;
    }

    paint(
      'Accesso admin OK: <strong style="color:#ff4dad">' + user.email + "</strong>",
      '<a class="btn btn-pink" href="index.html">Apri il sito</a>' +
        '<button class="btn btn-out" id="dash-out" type="button">Esci</button>' +
        '<p style="margin-top:18px;font-size:13px;color:#a0a8b8">Per i pannelli completi (prodotti, ordini, banner…): su GitHub apri la History di dashboard.html, commit <b>df2fc28d</b>, ⋯ → Restore this file.</p>' +
        '<p><a href="https://github.com/LorenzoImpa07/Gaming-Relax-Sito-Web/commits/main/dashboard.html" style="color:#ff4dad">Apri History GitHub</a></p>',
      true
    );

    document.getElementById("dash-out")?.addEventListener("click", () => {
      signOut(auth).then(() => {
        location.href = "index.html";
      });
    });
  });
}
