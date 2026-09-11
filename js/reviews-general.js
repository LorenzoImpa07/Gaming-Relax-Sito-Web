// ==========================================================================
// Pagina Recensioni generale — mostra tutte le recensioni approvate
// (di qualsiasi prodotto) e permette di lasciarne una nuova
// ==========================================================================
import { db } from "./firebase-init.js";
import {
  collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function stars(rating) {
  const r = Math.round(rating) || 0;
  return "★".repeat(r) + "☆".repeat(5 - r);
}

const summaryEl = document.getElementById("reviews-summary-general");
const listEl = document.getElementById("reviews-list-general");

const q = query(collection(db, "reviews"), where("status", "==", "approved"), orderBy("createdAt", "desc"));

onSnapshot(q, (snap) => {
  const reviews = snap.docs.map((d) => d.data());

  if (reviews.length === 0) {
    summaryEl.innerHTML = '<p style="color:var(--text-dim);">Ancora nessuna recensione pubblicata — sii il primo a lasciarne una!</p>';
    listEl.innerHTML = "";
    return;
  }

  const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
  summaryEl.innerHTML = `
    <span style="font-family:var(--font-display);font-size:40px;font-weight:700;color:var(--lime);">${avg.toFixed(1)}</span>
    <span style="color:var(--lime);font-size:24px;margin-left:8px;">${stars(avg)}</span>
    <p style="color:var(--text-dim);font-size:14px;margin-top:6px;">Basato su ${reviews.length} recensioni</p>`;

  listEl.innerHTML = reviews.map((r) => `
    <div class="richiesta-card">
      <div class="richiesta-card__head">
        <strong>${escapeHtml(r.name)}${r.productName ? ` — ${escapeHtml(r.productName)}` : ""}</strong>
        <span style="color:var(--lime);">${stars(r.rating)}</span>
      </div>
      <div class="richiesta-card__body">${escapeHtml(r.comment || "")}</div>
      ${r.photoUrl ? `<img src="${escapeHtml(r.photoUrl)}" alt="Foto del setup di ${escapeHtml(r.name)}" style="width:100%;max-width:320px;border-radius:10px;border:1px solid var(--border);">` : ""}
    </div>
  `).join("");
}, () => {
  summaryEl.innerHTML = '<p style="color:var(--text-dim);">Impossibile caricare le recensioni al momento.</p>';
});

const form = document.getElementById("review-form-general");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("review-general-status");
    const submitBtn = form.querySelector('button[type="submit"]');

    const data = {
      name: form.querySelector("#rg-name").value.trim(),
      rating: parseInt(form.querySelector("#rg-rating").value, 10),
      comment: form.querySelector("#rg-comment").value.trim(),
      photoUrl: form.querySelector("#rg-photo").value.trim(),
      status: "pending",
      createdAt: serverTimestamp()
    };

    submitBtn.disabled = true;
    try {
      await addDoc(collection(db, "reviews"), data);
      statusEl.textContent = "Grazie! La tua recensione è in attesa di verifica e sarà pubblicata a breve.";
      statusEl.classList.add("visible");
      form.reset();
    } catch {
      statusEl.textContent = "Si è verificato un errore. Riprova più tardi.";
      statusEl.classList.add("visible");
    } finally {
      submitBtn.disabled = false;
    }
  });
}
