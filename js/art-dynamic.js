// ==========================================================================
// Galleria Art dinamica — immagini cliccabili con scheda info (Dashboard)
// ==========================================================================
import { db } from "./firebase-init.js";
import { collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";

function escapeHtml(str = "") {
  const map = {
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
    "'": "&#39;"
  };
  return String(str).replace(/[&<>"']/g, (m) => map[m]);
}

const CATEGORY_LABELS = {
  tastiere: "Tastiere Custom",
  keycaps: "Keycaps",
  setup: "Setup & RGB",
  grafica: "Grafica / Identità visiva"
};

let currentItems = [];
let visibleItems = [];
let activeIndex = 0;

function ensureLightbox() {
  let box = document.getElementById("art-lightbox");
  if (box) return box;
  box = document.createElement("div");
  box.id = "art-lightbox";
  box.className = "art-lightbox";
  box.setAttribute("hidden", "");
  box.innerHTML = `
    <div class="art-lightbox__backdrop" data-art-close></div>
    <div class="art-lightbox__panel" role="dialog" aria-modal="true" aria-labelledby="art-lb-title">
      <button type="button" class="art-lightbox__close" data-art-close aria-label="Chiudi">✕</button>
      <button type="button" class="art-lightbox__nav art-lightbox__nav--prev" data-art-prev aria-label="Precedente">‹</button>
      <button type="button" class="art-lightbox__nav art-lightbox__nav--next" data-art-next aria-label="Successiva">›</button>
      <div class="art-lightbox__media"><img id="art-lb-img" alt=""></div>
      <div class="art-lightbox__info">
        <span class="art-lightbox__cat" id="art-lb-cat"></span>
        <h2 id="art-lb-title"></h2>
        <p class="art-lightbox__desc" id="art-lb-desc"></p>
        <dl class="art-lightbox__meta" id="art-lb-meta"></dl>
      </div>
    </div>`;
  document.body.appendChild(box);
  box.addEventListener("click", (e) => {
    if (e.target.closest("[data-art-close]")) closeLightbox();
    if (e.target.closest("[data-art-prev]")) stepLightbox(-1);
    if (e.target.closest("[data-art-next]")) stepLightbox(1);
  });
  return box;
}

function openLightbox(index) {
  if (!visibleItems.length) return;
  activeIndex = (index + visibleItems.length) % visibleItems.length;
  const item = visibleItems[activeIndex];
  const box = ensureLightbox();
  const title = item.title || item.caption || "Opera";
  document.getElementById("art-lb-img").src = item.imageUrl || "";
  document.getElementById("art-lb-img").alt = title;
  document.getElementById("art-lb-cat").textContent = CATEGORY_LABELS[item.category] || item.category || "";
  document.getElementById("art-lb-title").textContent = title;
  const desc = item.description || item.caption || "";
  const descEl = document.getElementById("art-lb-desc");
  descEl.textContent = desc;
  descEl.hidden = !desc;
  const meta = [];
  if (item.technique) meta.push(["Tecnica", item.technique]);
  if (item.year) meta.push(["Anno", item.year]);
  if (item.caption && item.title && item.caption !== item.title) meta.push(["Nota", item.caption]);
  document.getElementById("art-lb-meta").innerHTML = meta.map(([k, v]) =>
    `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`
  ).join("");
  box.removeAttribute("hidden");
  document.body.classList.add("art-lb-open");
}

function closeLightbox() {
  const box = document.getElementById("art-lightbox");
  if (box) box.setAttribute("hidden", "");
  document.body.classList.remove("art-lb-open");
}

function stepLightbox(dir) {
  openLightbox(activeIndex + dir);
}

document.addEventListener("keydown", (e) => {
  const box = document.getElementById("art-lightbox");
  if (!box || box.hasAttribute("hidden")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") stepLightbox(-1);
  if (e.key === "ArrowRight") stepLightbox(1);
});

function render(items) {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-dim);">La galleria sarà pubblicata a breve.</p>';
    return;
  }

  const activeFilter = document.querySelector(".filter-pill.active")?.dataset.galleryFilter || "tutti";
  visibleItems = activeFilter === "tutti" ? items : items.filter((i) => i.category === activeFilter);

  if (visibleItems.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Nessuna foto in questa categoria, per ora.</p>';
    return;
  }

  grid.innerHTML = visibleItems.map((item, i) => `
    <figure class="gallery-post" data-art-index="${i}">
      <button type="button" class="gallery-post__hit" aria-label="Apri ${escapeHtml(item.title || item.caption || "immagine")}">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title || item.caption || "Foto della galleria Gaming Relax")}" loading="lazy">
      </button>
      ${item.caption || item.title ? `<figcaption class="gallery-post__caption">${escapeHtml(item.title || item.caption)}</figcaption>` : ""}
    </figure>
  `).join("");

  grid.querySelectorAll("[data-art-index]").forEach((el) => {
    el.addEventListener("click", () => openLightbox(Number(el.dataset.artIndex)));
  });
}

onSnapshot(collection(db, "gallery"), (snap) => {
  currentItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
  render(currentItems);
}, () => {
  const g = document.getElementById("gallery-grid");
  if (g) g.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Impossibile caricare la galleria al momento.</p>';
});

document.querySelectorAll("[data-gallery-filter]").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("[data-gallery-filter]").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    render(currentItems);
  });
});
