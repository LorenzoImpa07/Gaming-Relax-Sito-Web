// ==========================================================================
// Pagina dettaglio prodotto — mostra i dati del prodotto.
// Le recensioni si leggono/lasciano solo dalla pagina Recensioni generale
// (recensioni.html), non più da qui.
// ==========================================================================
import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CATEGORY_LABELS = {
  tastiere: "Tastiere Custom",
  tastiere_preassemblate: "Tastiere Preassemblate",
  keycaps: "Keycaps",
  accessori: "Accessori",
  servizi: "Servizi Tech"
};

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
const detailEl = document.getElementById("product-detail");

if (!productId) {
  detailEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Prodotto non specificato. <a href="store.html">Torna allo Store</a>.</p>';
} else {
  loadProduct();
}

async function loadProduct() {
  try {
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) {
      detailEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Prodotto non trovato. <a href="store.html">Torna allo Store</a>.</p>';
      return;
    }
    const p = snap.data();
    document.title = `${p.name} — Gaming Relax`;

    detailEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start;">
        <div style="border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);aspect-ratio:1;background:${p.imageUrl ? `url('${escapeHtml(p.imageUrl)}') center/cover` : "linear-gradient(135deg,#101522,#050608)"};"></div>
        <div>
          <span class="product-card__cat">${escapeHtml(CATEGORY_LABELS[p.category] || p.category)}</span>
          <h1 style="font-size:32px;margin:8px 0 16px;">${escapeHtml(p.name)}</h1>
          ${p.inStock === false ? '<p style="color:#ff8080;font-weight:700;margin-bottom:14px;">Esaurito</p>' : ""}
          <p style="font-size:15px;color:var(--text-dim);margin-bottom:20px;">${escapeHtml(p.description || "")}</p>
          <p style="font-family:var(--font-display);font-size:26px;font-weight:700;margin-bottom:22px;">${escapeHtml(p.price)}</p>
          ${p.inStock === false
            ? '<p style="font-size:13px;color:var(--text-dim);">Torna allo Store per iscriverti agli avvisi di ritorno in disponibilità.</p>'
            : p.paymentLink
            ? `<a href="${escapeHtml(p.paymentLink)}" target="_blank" rel="noopener" class="btn btn--lime">Acquista →</a>`
            : `<a href="contatti.html" class="btn btn--lime">Richiedi →</a>`
          }
        </div>
      </div>`;
  } catch {
    detailEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Impossibile caricare il prodotto al momento.</p>';
  }
}
