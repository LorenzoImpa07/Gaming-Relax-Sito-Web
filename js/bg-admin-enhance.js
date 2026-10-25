// ==========================================================================
// Dashboard — interfaccia sfondi migliorata (zone + colore + UX upload)
// Si attiva da solo se trova #bg-form. Non richiede modifiche all'HTML.
// ==========================================================================
import { db } from "./firebase-init.js?v=20260920n";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("bg-form");
if (form) bootBgAdmin();

function bootBgAdmin() {
  const pageSel = document.getElementById("bg-page");
  const statusMsg = document.getElementById("bg-status");
  const overlay = document.getElementById("bg-overlay");

  const intro = form.closest(".dash-form-card")?.querySelector("p");
  if (intro && !intro.dataset.enhanced) {
    intro.dataset.enhanced = "1";
    intro.innerHTML =
      "Carica un’immagine <strong>dal tuo dispositivo</strong> (Sfoglia) oppure lascia vuoto e usa un <strong>colore solido</strong>. " +
      "Scegli la <strong>zona</strong> della pagina, regola la copertura scura e salva. Poi apri la pagina e fai <kbd>Ctrl+Shift+R</kbd>.";
  }

  if (!document.getElementById("bg-zone") && !document.querySelector(".bg-zone-grid")) {
    const overlayField = overlay?.closest(".field");
    const block = document.createElement("div");
    block.innerHTML = `
      <div class="field" id="bg-zone-field">
        <label>Zona della pagina</label>
        <div class="bg-zone-grid">
          <label class="bg-zone-option is-active">
            <input type="radio" name="bg-zone" value="full" checked>
            <strong>Tutta la pagina</strong>
            <span>Sfondo fisso dietro tutto</span>
          </label>
          <label class="bg-zone-option">
            <input type="radio" name="bg-zone" value="hero">
            <strong>Solo hero</strong>
            <span>Solo la fascia in alto</span>
          </label>
          <label class="bg-zone-option">
            <input type="radio" name="bg-zone" value="content">
            <strong>Solo contenuto</strong>
            <span>Sotto l’header, area centrale</span>
          </label>
        </div>
        <input type="hidden" id="bg-zone" value="full">
      </div>
      <div class="field" id="bg-color-field">
        <label for="bg-color">Colore solido (opzionale)</label>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <input type="color" id="bg-color" value="#0a0d16" style="width:52px;height:36px;border:0;background:none;cursor:pointer;padding:0;">
          <input type="text" id="bg-color-hex" value="" placeholder="#0a0d16" style="max-width:120px;">
          <button type="button" class="btn btn--outline" id="bg-color-clear" style="padding:8px 14px;font-size:13px;">Rimuovi colore</button>
        </div>
        <p class="file-status" style="margin-top:8px;">Se non carichi un’immagine, questo colore diventa lo sfondo della zona scelta.</p>
      </div>`;
    if (overlayField) overlayField.parentNode.insertBefore(block, overlayField);
    else form.insertBefore(block, form.querySelector('button[type="submit"]'));

    form.querySelectorAll('input[name="bg-zone"]').forEach((r) => {
      r.addEventListener("change", () => {
        const h = document.getElementById("bg-zone");
        if (h) h.value = r.value;
        form.querySelectorAll(".bg-zone-option").forEach((el) => {
          el.classList.toggle("is-active", el.contains(r) && r.checked);
        });
      });
    });

    const colorEl = document.getElementById("bg-color");
    const hexEl = document.getElementById("bg-color-hex");
    colorEl?.addEventListener("input", () => { if (hexEl) { hexEl.value = colorEl.value; delete hexEl.dataset.cleared; } });
    hexEl?.addEventListener("change", () => {
      const v = hexEl.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v) && colorEl) colorEl.value = v;
      delete hexEl.dataset.cleared;
    });
    document.getElementById("bg-color-clear")?.addEventListener("click", () => {
      if (colorEl) colorEl.value = "#0a0d16";
      if (hexEl) { hexEl.value = ""; hexEl.dataset.cleared = "1"; }
    });
  }

  function setZone(zone) {
    const z = ["full", "hero", "content"].includes(zone) ? zone : "full";
    const h = document.getElementById("bg-zone");
    if (h) h.value = z;
    form.querySelectorAll('input[name="bg-zone"]').forEach((r) => {
      r.checked = r.value === z;
      r.closest(".bg-zone-option")?.classList.toggle("is-active", r.value === z);
    });
  }

  function setColor(color) {
    const colorEl = document.getElementById("bg-color");
    const hexEl = document.getElementById("bg-color-hex");
    if (!color) {
      if (hexEl) { hexEl.value = ""; hexEl.dataset.cleared = "1"; }
      return;
    }
    if (colorEl && /^#[0-9a-fA-F]{6}$/.test(color)) colorEl.value = color;
    if (hexEl) { hexEl.value = color; delete hexEl.dataset.cleared; }
  }

  async function loadExtra(key) {
    try {
      const snap = await getDoc(doc(db, "siteContent", key));
      const d = snap.exists() ? snap.data() : {};
      setZone(d.bgZone || "full");
      setColor(d.bgColor || "");
    } catch (_) {
      setZone("full");
      setColor("");
    }
  }

  form.addEventListener("submit", () => {
    const key = pageSel?.value || "home";
    const zone =
      document.getElementById("bg-zone")?.value ||
      form.querySelector('input[name="bg-zone"]:checked')?.value ||
      "full";
    const hexEl = document.getElementById("bg-color-hex");
    const colorEl = document.getElementById("bg-color");
    let bgColor = "";
    if (hexEl && hexEl.dataset.cleared !== "1") {
      const raw = (hexEl.value || colorEl?.value || "").trim();
      if (/^#[0-9a-fA-F]{6}$/.test(raw)) bgColor = raw;
    }
    setTimeout(async () => {
      try {
        await setDoc(doc(db, "siteContent", key), { bgZone: zone, bgColor }, { merge: true });
        try {
          const all = JSON.parse(localStorage.getItem("gr_bgs") || "{}");
          all[key] = { ...(all[key] || {}), zone, color: bgColor };
          localStorage.setItem("gr_bgs", JSON.stringify(all));
        } catch (_) {}
        if (statusMsg) {
          const label = zone === "hero" ? "solo hero" : zone === "content" ? "solo contenuto" : "tutta la pagina";
          statusMsg.textContent = "Sfondo salvato (zona: " + label + "). Apri la pagina e fai Ctrl+Shift+R.";
          statusMsg.classList.add("visible");
        }
      } catch (_) {}
    }, 450);
  }, true);

  pageSel?.addEventListener("change", () => loadExtra(pageSel.value));
  if (pageSel) loadExtra(pageSel.value);
}
