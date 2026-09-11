// ==========================================================================
// Galleria Art dinamica — legge le immagini da Firestore (gestite dalla Dashboard)
// con filtro per categoria (Tastiere Custom, Keycaps, Setup & RGB, Grafica)
// ==========================================================================
import { db } from "./firebase-init.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

const grid = document.getElementById("gallery-grid");
let currentItems = [];

function render(items) {
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-dim);">La galleria sarà pubblicata a breve.</p>';
    return;
  }

  const activeFilter = document.querySelector(".filter-pill.active")?.dataset.galleryFilter || "tutti";
  const visible = activeFilter === "tutti" ? items : items.filter((i) => i.category === activeFilter);

  if (visible.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Nessuna foto in questa categoria, per ora.</p>';
    return;
  }

  grid.innerHTML = visible.map((item) => `
    <figure class="gallery-post">
      <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.caption || "Foto della galleria Gaming Relax")}" loading="lazy">
      ${item.caption ? `<figcaption class="gallery-post__caption">${escapeHtml(item.caption)}</figcaption>` : ""}
    </figure>
  `).join("");
}

onSnapshot(query(collection(db, "gallery"), orderBy("createdAt", "desc")), (snap) => {
  currentItems = snap.docs.map((d) => d.data());
  render(currentItems);
}, () => {
  if (grid) grid.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Impossibile caricare la galleria al momento.</p>';
});

document.querySelectorAll("[data-gallery-filter]").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("[data-gallery-filter]").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    render(currentItems);
  });
});
