// ==========================================================================
// Banner promozionale — mostrato in cima a ogni pagina se attivo,
// gestito dalla Dashboard (tab "Banner")
// ==========================================================================
import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

getDoc(doc(db, "siteContent", "banner")).then((snap) => {
  if (!snap.exists()) return;
  const d = snap.data();
  if (!d.enabled || !d.text) return;
  if (sessionStorage.getItem("gr_banner_closed") === d.text) return;

  const bar = document.createElement("div");
  bar.className = "promo-banner";
  bar.innerHTML = `
    <div class="promo-banner__track">
      <span class="promo-banner__text">${escapeHtml(d.text)}</span>
      <span class="promo-banner__text" aria-hidden="true">${escapeHtml(d.text)}</span>
      <span class="promo-banner__text" aria-hidden="true">${escapeHtml(d.text)}</span>
    </div>
    <button type="button" class="promo-banner__close" aria-label="Chiudi banner">✕</button>`;

  if (d.link) {
    bar.style.cursor = "pointer";
    bar.addEventListener("click", (e) => {
      if (!e.target.closest(".promo-banner__close")) window.location.href = d.link;
    });
  }

  bar.querySelector(".promo-banner__close").addEventListener("click", (e) => {
    e.stopPropagation();
    sessionStorage.setItem("gr_banner_closed", d.text);
    bar.remove();
  });

  document.body.insertBefore(bar, document.body.firstChild);
}).catch(() => { /* nessun banner in caso di errore, il sito funziona comunque */ });
