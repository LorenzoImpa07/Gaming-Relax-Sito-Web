// ==========================================================================
// Novità / Aggiornamenti — feed dinamico letto da Firestore
// (gestito dalla Dashboard, tab "Novità"), con filtro per categoria
// ==========================================================================
import { db } from "./firebase-init.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CATEGORY_LABELS = {
  aggiornamenti: "Aggiornamento",
  "nuovi-prodotti": "Nuovo prodotto",
  annunci: "Annuncio"
};

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function applyLineBreaks(str = "") {
  return escapeHtml(str).replace(/\n/g, "<br>");
}

function formatDate(ts) {
  if (!ts || typeof ts.toDate !== "function") return "";
  return ts.toDate().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

const feed = document.getElementById("news-feed");
let currentPosts = [];

function snippet(str = "", n = 140) {
  const t = String(str).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function renderHome(posts) {
  const el = document.getElementById("home-news-list");
  if (!el) return;
  const latest = posts.slice(0, 3);
  if (latest.length === 0) {
    el.innerHTML = '<p style="color:var(--text-dim);margin:0;">Nessuna novità ancora. Le trovi qui quando lo staff pubblica un aggiornamento.</p>';
    return;
  }
  el.innerHTML = latest.map((p) => `
    <a class="home-news-card" href="novita.html">
      ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="">` : `<img src="images/og-image.jpg" alt="">`}
      <div>
        <div class="news-post__meta" style="margin-bottom:8px;">
          ${p.category ? `<span class="news-post__tag">${escapeHtml(CATEGORY_LABELS[p.category] || p.category)}</span>` : ""}
          <span class="news-post__date">${formatDate(p.createdAt)}</span>
        </div>
        <h3>${escapeHtml(p.title || "Novità")}</h3>
        <p>${escapeHtml(snippet(p.body || ""))}</p>
      </div>
    </a>`).join("");
}

function render(posts) {
  if (!feed) return;

  if (posts.length === 0) {
    feed.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Nessun annuncio ancora — torna a trovarci presto!</p>';
    return;
  }

  const activeFilter = document.querySelector(".filter-pill.active")?.dataset.newsFilter || "tutti";
  const visible = activeFilter === "tutti" ? posts : posts.filter((p) => p.category === activeFilter);

  if (visible.length === 0) {
    feed.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Nessun annuncio in questa categoria, per ora.</p>';
    return;
  }

  feed.innerHTML = visible.map((p) => `
    <article class="news-post">
      ${p.imageUrl ? `<img class="news-post__img" src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title)}" loading="lazy">` : ""}
      <div class="news-post__body">
        <div class="news-post__meta">
          ${p.category ? `<span class="news-post__tag">${escapeHtml(CATEGORY_LABELS[p.category] || p.category)}</span>` : ""}
          <span class="news-post__date">${formatDate(p.createdAt)}</span>
        </div>
        <h2>${escapeHtml(p.title)}</h2>
        <p>${applyLineBreaks(p.body || "")}</p>
      </div>
    </article>
  `).join("");
}

onSnapshot(query(collection(db, "news"), orderBy("createdAt", "desc")), (snap) => {
  currentPosts = snap.docs.map((d) => d.data());
  render(currentPosts);
  renderHome(currentPosts);
}, () => {
  if (feed) feed.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Impossibile caricare le novità al momento.</p>';
  const home = document.getElementById("home-news-list");
  if (home) home.innerHTML = '<p style="color:var(--text-dim);margin:0;">Impossibile caricare le novità al momento.</p>';
});

document.querySelectorAll("[data-news-filter]").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("[data-news-filter]").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    render(currentPosts);
  });
});
