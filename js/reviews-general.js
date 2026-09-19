// ==========================================================================
// Pagina Recensioni generale — mostra tutte le recensioni approvate
// (di qualsiasi prodotto) e permette di lasciarne una nuova
// ==========================================================================
import { db, auth, isVerifiedUser } from "./firebase-init.js?v=20260919y";
import { uploadFile } from "./upload.js";
import { collection, query, where, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

const STAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2l2.7 6.1 6.6.7-5 4.6 1.4 6.5L12 16.8 6.3 20.1 7.7 13.6l-5-4.6 6.6-.7L12 2.2z"/></svg>`;
const STAR_ROW = STAR_SVG.repeat(5);

function starsHtml(rating) {
  const pct = Math.max(0, Math.min(100, (Number(rating) || 0) / 5 * 100));
  return `<span class="gr-stars" style="--pct:${pct}%" aria-label="${(Number(rating) || 0).toFixed(1)} su 5">
    <span class="gr-stars__track">${STAR_ROW}</span>
    <span class="gr-stars__fill">${STAR_ROW}</span>
  </span>`;
}

const RATING_LABELS = {
  1: "— Scarso",
  2: "— Sufficiente",
  3: "— Buono",
  4: "— Molto buono",
  5: "— Eccellente"
};

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
    <div class="reviews-avg">
      <span class="reviews-avg__score">${avg.toFixed(1)}</span>
      ${starsHtml(avg)}
      <p style="color:var(--text-dim);font-size:14px;margin:0;">Basato su ${reviews.length} recensioni</p>
    </div>`;

  listEl.innerHTML = reviews.map((r) => `
    <div class="richiesta-card">
      <div class="richiesta-card__head">
        <strong>${escapeHtml(r.name)}${r.productName ? ` — ${escapeHtml(r.productName)}` : ""}</strong>
        ${starsHtml(r.rating)}
      </div>
      <div class="richiesta-card__body">${escapeHtml(r.comment || "")}</div>
      ${r.photoUrl ? `<img src="${escapeHtml(r.photoUrl)}" alt="Foto del setup di ${escapeHtml(r.name)}" style="width:100%;max-width:320px;border-radius:10px;border:1px solid var(--border);">` : ""}
    </div>
  `).join("");
}, () => {
  summaryEl.innerHTML = '<p style="color:var(--text-dim);">Impossibile caricare le recensioni al momento.</p>';
});

function initStarPicker() {
  const picker = document.getElementById("star-picker");
  const input = document.getElementById("rg-rating");
  const caption = document.getElementById("star-picker-caption");
  if (!picker || !input) return;

  const buttons = [...picker.querySelectorAll(".star-picker__btn")];
  buttons.forEach((btn) => { btn.innerHTML = STAR_SVG; });

  function paint(n, hover) {
    buttons.forEach((btn) => {
      const v = Number(btn.dataset.star);
      btn.classList.toggle("is-on", !hover && v <= n);
      btn.classList.toggle("is-hover", hover && v <= n);
    });
    if (caption) caption.textContent = RATING_LABELS[n] || "";
  }

  function setValue(n) {
    input.value = String(n);
    paint(n, false);
  }

  picker.addEventListener("mouseleave", () => paint(Number(input.value) || 5, false));
  buttons.forEach((btn) => {
    const n = Number(btn.dataset.star);
    btn.addEventListener("mouseenter", () => paint(n, true));
    btn.addEventListener("click", () => setValue(n));
  });

  setValue(Number(input.value) || 5);
  picker.reset = () => setValue(5);
}

initStarPicker();

(function prefillProduct() {
  const name = new URLSearchParams(location.search).get("nome");
  const hint = document.getElementById("review-product-hint");
  if (name && hint) {
    hint.hidden = false;
    hint.textContent = "Stai recensendo: " + name;
  }
})();

const form = document.getElementById("review-form-general");
let reviewUser = null;
onAuthStateChanged(auth, (user) => {
  reviewUser = isVerifiedUser(user) ? user : null;
});
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById("review-general-status");
    const submitBtn = form.querySelector('button[type="submit"]');
    const rating = parseInt(form.querySelector("#rg-rating").value, 10);

    if (!reviewUser) {
      statusEl.innerHTML = 'Per lasciare una recensione accedi con un\'email confermata. <a href="login.html">Accedi</a>';
      statusEl.classList.add("visible");
      return;
    }

    submitBtn.disabled = true;
    try {
      const photoFile = form.querySelector("#rg-photo").files?.[0];
      const photoUrl = photoFile ? await uploadFile(photoFile, "reviews") : "";
      const data = {
        name: form.querySelector("#rg-name").value.trim() || reviewUser.displayName || "Cliente",
        rating,
        comment: form.querySelector("#rg-comment").value.trim(),
        photoUrl,
        productId: new URLSearchParams(location.search).get("prodotto") || "",
        productName: new URLSearchParams(location.search).get("nome") || "",
        uid: reviewUser.uid,
        email: reviewUser.email,
        status: "pending",
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, "reviews"), data);
      statusEl.textContent = "Grazie! La tua recensione è in attesa di verifica e sarà pubblicata a breve.";
      statusEl.classList.add("visible");
      form.reset();
      document.getElementById("star-picker")?.reset?.();
    } catch {
      statusEl.textContent = "Si è verificato un errore. Riprova più tardi.";
      statusEl.classList.add("visible");
    } finally {
      submitBtn.disabled = false;
    }
  });
}
