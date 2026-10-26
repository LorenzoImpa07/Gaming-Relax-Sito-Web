// ==========================================================================
// Banner promozionale — sempre visibile in cima (non chiudibile)
// gestito dalla Dashboard (tab "Banner")
// ==========================================================================
import { db } from "./firebase-init.js?v=20260920n";
import { doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[m]));
}

let cachedBanner = null;

function ensureBannerStyles() {
  if (document.getElementById("gr-promo-fixed-style")) return;
  const st = document.createElement("style");
  st.id = "gr-promo-fixed-style";
  st.textContent = [
    ".promo-banner{position:sticky;top:0;z-index:1200;padding-right:0!important;}",
    ".promo-banner__close{display:none!important;}",
    "body.has-promo-banner .site-header{top:40px;}",
  ].join("");
  document.head.appendChild(st);
}

function paintBanner(d) {
  ensureBannerStyles();
  const existing = document.querySelector(".promo-banner");
  if (!d || !d.enabled || !d.text) {
    existing?.remove();
    document.body.classList.remove("has-promo-banner");
    return;
  }
  // Nessuna chiusura: il banner resta sempre se attivo in Dashboard
  try { sessionStorage.removeItem("gr_banner_closed"); } catch (_) {}

  if (existing && existing.dataset.text === d.text && existing.dataset.link === (d.link || "")) {
    document.body.classList.add("has-promo-banner");
    return;
  }
  existing?.remove();

  const text = escapeHtml(d.text);
  const item = `<span class="promo-banner__text">${text}</span>`;
  const bar = document.createElement("div");
  bar.className = "promo-banner";
  bar.dataset.text = d.text;
  bar.dataset.link = d.link || "";
  bar.innerHTML = `
    <div class="promo-banner__viewport">
      <div class="promo-banner__track">
        <div class="promo-banner__group">${item}</div>
      </div>
    </div>`;

  const header = document.querySelector(".site-header");
  document.body.insertBefore(bar, header || document.body.firstChild);
  document.body.classList.add("has-promo-banner");

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
    bar.addEventListener("click", () => {
      window.location.href = d.link;
    });
  }
}

onSnapshot(doc(db, "siteContent", "banner"), (snap) => {
  cachedBanner = snap.exists() ? snap.data() : null;
  paintBanner(cachedBanner);
});
window.addEventListener("gr:navigated", () => paintBanner(cachedBanner));
