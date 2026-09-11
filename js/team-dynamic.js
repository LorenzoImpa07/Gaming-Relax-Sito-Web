// ==========================================================================
// Team dinamico — legge i membri da Firestore (aggiunti dalla Dashboard)
// ==========================================================================
import { db } from "./firebase-init.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function renderTeam(members) {
  const grid = document.getElementById("team-grid");
  if (!grid) return;

  if (members.length === 0) {
    grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-dim);">Il team verrà pubblicato a breve.</p>';
    return;
  }

  const activeFilter = document.querySelector(".filter-pill.active")?.dataset.teamFilter || members[0].category;

  grid.innerHTML = members.map((m) => `
    <div class="team-card" data-team-category="${m.category}" style="${m.category !== activeFilter ? "display:none;" : ""}">
      <div class="team-card__photo" style="background:${m.photoUrl ? `url('${escapeHtml(m.photoUrl)}') center/cover` : "linear-gradient(160deg,#222,#000)"};"></div>
      <div class="team-card__body">
        <h3>${escapeHtml(m.name)}</h3>
        <span>${escapeHtml(m.role)}</span>
      </div>
    </div>
  `).join("");
}

let currentMembers = [];

onSnapshot(collection(db, "team"), (snap) => {
  currentMembers = snap.docs.map((d) => d.data());
  renderTeam(currentMembers);
}, () => {
  const grid = document.getElementById("team-grid");
  if (grid) grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-dim);">Impossibile caricare il team al momento.</p>';
});

document.querySelectorAll("[data-team-filter]").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("[data-team-filter]").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    const filter = pill.dataset.teamFilter;
    document.querySelectorAll("[data-team-category]").forEach((card) => {
      card.style.display = (card.dataset.teamCategory === filter) ? "" : "none";
    });
  });
});
