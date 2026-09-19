import { db } from "./firebase-init.js";
import { collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => {
    if (m === "&") return "&" + "amp;";
    if (m === "<") return "&" + "lt;";
    if (m === ">") return "&" + "gt;";
    if (m === '"') return "&" + "quot;";
    return "&#39;";
  });
}

function hrefOf(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u) || u.startsWith("mailto:")) return u;
  return "https://" + u;
}

const section = document.getElementById("partners");
const grid = document.getElementById("partners-grid");
if (grid) {
  onSnapshot(collection(db, "partners"), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999) || String(a.name || "").localeCompare(String(b.name || ""), "it"));
    if (!list.length) {
      if (section) section.style.display = "none";
      grid.innerHTML = "";
      return;
    }
    if (section) section.style.display = "";
    grid.innerHTML = list.map((p) => {
      const href = hrefOf(p.url);
      const img = p.logoUrl
        ? `<img src="${escapeHtml(p.logoUrl)}" alt="${escapeHtml(p.name || "Partner")}">`
        : `<span class="partner-fallback">${escapeHtml((p.name || "P").charAt(0))}</span>`;
      if (!href) return `<div class="partner-card" title="${escapeHtml(p.name || "")}">${img}</div>`;
      return `<a class="partner-card" href="${escapeHtml(href)}" target="_blank" rel="noopener" title="${escapeHtml(p.name || "")}">${img}</a>`;
    }).join("");
  }, () => {
    if (section) section.style.display = "none";
  });
}
