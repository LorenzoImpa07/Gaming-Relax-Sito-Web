// ==========================================================================
// Banner promozionale — mostrato in cima a ogni pagina se attivo,
// gestito dalla Dashboard (tab "Banner")
// ==========================================================================
import { db } from "./firebase-init.js?v=20260919ae";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

let cachedBanner = null;
function paintBanner(d) {
  if (!d || !d.enabled || !d.text) return;
  if (sessionStorage.getItem("gr_banner_closed") === d.text) return;
  if (document.querySelector(".promo-banner")) return;
  const text = escapeHtml(d.text);
  const item = `<span class="promo-banner__text">${text}</span>`;
  const bar = document.createElement("div");
  bar.className = "promo-banner";
  bar.innerHTML = `
    <div class="promo-banner__viewport">
      <div class="promo-banner__track">
        <div class="promo-banner__group">${item}</div>
      </div>
    </div>
    <button type="button" class="promo-banner__close" aria-label="Chiudi banner">✕</button>`;
  const header = document.querySelector(".site-header");
  document.body.insertBefore(bar, header || document.body.firstChild);

  const viewport = bar.querySelector(".promo-banner__viewport");
  const track = bar.querySelector(".promo-banner__track");
  const group = bar.querySelector(".promo-banner__group");
  while (group.offsetWidth < Math.max(viewport.offsetWidth, 800) * 1.4 && group.children.length < 40) {
    group.insertAdjacentHTML("beforeend", item);
  }
  track.appendChild(group.cloneNode(true));
  const seconds = Math.max(14, Math.round(group.offsetWidth / 70));
  track.style.setProperty("--promo-speed", seconds + "s");
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
}

getDoc(doc(db, "siteContent", "banner")).then((snap) => {
  if (!snap.exists()) return;
  cachedBanner = snap.data();
  paintBanner(cachedBanner);
}).catch(() => {});
window.addEventListener("gr:navigated", () => paintBanner(cachedBanner));
