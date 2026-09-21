import { auth, db, isVerifiedUser } from "./firebase-init.js?v=20260921a";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function euro(n) {
  return (Number(n) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (m) => ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[m]));
}

function render(d) {
  const box = document.getElementById("creator-box");
  if (!box) return;
  const list = Array.isArray(d?.codes) && d.codes.length
    ? d.codes
    : (d && d.code ? [{ code: d.code, name: d.name, commission: d.commission, discount: d.discount }] : []);
  if (!d || d.active === false || !list.length) {
    box.innerHTML = '<p class="empty-hint">Questa area è riservata ai creator attivati dalla Dashboard.</p>';
    return;
  }
  box.innerHTML = list.map((c, i) => {
    const disc = Number(c.discount != null ? c.discount : d.discount) || 0;
    const comm = Number(c.commission != null ? c.commission : d.commission) || 0;
    return `
    <div class="creator-code-card${i === 0 ? " is-main" : ""}">
      ${i === 0 ? '<p class="creator-k">Il tuo codice</p>' : '<p class="creator-k">Altro codice</p>'}
      <div class="creator-code">${esc(c.code)}</div>
      <button type="button" class="btn btn--outline cr-copy" data-code="${esc(c.code)}" style="width:100%;justify-content:center;margin:8px 0 14px;">Copia codice</button>
      <div class="creator-stats">
        <div><span>Sconto cliente</span><strong>${disc}%</strong></div>
        <div><span>Commissione</span><strong>${comm}%</strong></div>
        ${i === 0 ? `<div><span>Utilizzi</span><strong>${Number(d.uses) || 0}</strong></div>
        <div><span>Guadagno</span><strong>${euro(d.earned)}</strong></div>` : ""}
      </div>
    </div>`;
  }).join("") + `<p class="lede" style="margin-top:18px;">I clienti lo inseriscono in cassa nel campo codice sconto / creatore.</p>`;
  box.querySelectorAll(".cr-copy").forEach((b) => {
    b.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.code || "");
        b.textContent = "Copiato";
      } catch (_) {}
    });
  });
}

onAuthStateChanged(auth, async (user) => {
  const box = document.getElementById("creator-box");
  if (!box) return;
  if (!isVerifiedUser(user) || !user.email) {
    box.innerHTML = '<p class="empty-hint">Accedi con l\'account creator per vedere il codice.</p>';
    return;
  }
  try {
    const snap = await getDoc(doc(db, "creatorPortals", String(user.email).trim().toLowerCase()));
    const d = snap.exists() ? snap.data() : null;
    render(d);
  } catch (_) {
    render(null);
  }
});
