import { auth, db, isVerifiedUser } from "./firebase-init.js?v=20260920n";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function euro(n) {
  return (Number(n) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function render(d) {
  const box = document.getElementById("creator-box");
  if (!box) return;
  if (!d) {
    box.innerHTML = '<p class="empty-hint">Questa area è riservata ai creator attivati dalla Dashboard.</p>';
    return;
  }
  const disc = Number(d.discount) || 0;
  const comm = Number(d.commission) || 0;
  box.innerHTML = `
    <p class="creator-k">Il tuo codice</p>
    <div class="creator-code">${d.code || "—"}</div>
    <button type="button" class="btn btn--outline" id="cr-copy" style="width:100%;justify-content:center;margin:8px 0 18px;">Copia codice</button>
    <div class="creator-stats">
      <div><span>Sconto per il cliente</span><strong>${disc}%</strong></div>
      <div><span>La tua commissione</span><strong>${comm}%</strong></div>
      <div><span>Utilizzi</span><strong>${Number(d.uses) || 0}</strong></div>
      <div><span>Guadagno</span><strong>${euro(d.earned)}</strong></div>
    </div>
    <p class="lede" style="margin-top:18px;">I clienti lo inseriscono in cassa nel campo codice sconto / creatore.</p>
  `;
  box.querySelector("#cr-copy")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(d.code || "");
      const b = box.querySelector("#cr-copy");
      if (b) b.textContent = "Copiato";
    } catch (_) {}
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
    render(d && d.active !== false ? d : null);
  } catch (_) {
    render(null);
  }
});
