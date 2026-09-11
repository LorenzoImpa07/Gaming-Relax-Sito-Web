// ==========================================================================
// Contenuti dinamici — applica su ogni pagina:
// 1) i colori globali del sito (se lo staff li ha personalizzati)
// 2) i testi della pagina corrente (titolo, sottotitolo, ecc.)
// Se non c'è nulla di salvato, restano i testi/colori di default già
// presenti in HTML/CSS — nessun flash vuoto in attesa del caricamento.
// ==========================================================================
import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Mappa: chiave salvata su Firestore → variabile CSS da aggiornare
const DESIGN_VARS = {
  limeColor: "--lime",
  purpleColor: "--purple",
  bgColor: "--bg",
  bgAltColor: "--bg-alt",
  cardColor: "--card-solid"
};

function applyLineBreaks(value) {
  return String(value).replace(/\n/g, "<br>");
}

// --- 1) Colori globali + logo personalizzato, applicati su ogni pagina ---
getDoc(doc(db, "siteContent", "design")).then((snap) => {
  if (!snap.exists()) return;
  const d = snap.data();
  Object.entries(DESIGN_VARS).forEach(([key, cssVar]) => {
    if (d[key]) document.documentElement.style.setProperty(cssVar, d[key]);
  });
  if (d.logoUrl) {
    document.querySelectorAll(".brand__logo img").forEach((img) => { img.src = d.logoUrl; });
  }
}).catch(() => { /* restano i colori e il logo predefiniti */ });

// --- 2) Contatti, orari e link social, applicati su ogni pagina ---
getDoc(doc(db, "siteContent", "general")).then((snap) => {
  if (!snap.exists()) return;
  const d = snap.data();

  if (d.supportEmail) {
    document.querySelectorAll('[data-social="email"]').forEach((el) => { el.href = `mailto:${d.supportEmail}`; });
  }
  ["discord", "youtube", "instagram", "tiktok"].forEach((platform) => {
    const url = d[`${platform}Url`];
    if (url) {
      document.querySelectorAll(`[data-social="${platform}"]`).forEach((el) => { el.href = url; });
    }
  });
  if (d.hoursWeekday) {
    document.querySelectorAll('[data-general="hoursWeekday"]').forEach((el) => { el.textContent = d.hoursWeekday; });
  }
  if (d.hoursWeekend) {
    document.querySelectorAll('[data-general="hoursWeekend"]').forEach((el) => { el.textContent = d.hoursWeekend; });
  }
}).catch(() => { /* restano i contatti/social predefiniti */ });

// --- 3) Testi della pagina corrente + eventuale sfondo personalizzato ---
const pageKey = document.body.dataset.page;
if (pageKey) {
  getDoc(doc(db, "siteContent", pageKey)).then((snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    document.querySelectorAll("[data-edit]").forEach((el) => {
      const key = el.dataset.edit;
      if (d[key]) el.innerHTML = applyLineBreaks(d[key]);
    });

    if (d.bgImageUrl) {
      const heroEl = document.querySelector('[class*="hero"]');
      if (heroEl) {
        heroEl.style.backgroundImage = `linear-gradient(180deg, rgba(10,13,22,.75), rgba(10,13,22,.92)), url('${d.bgImageUrl}')`;
        heroEl.style.backgroundSize = "cover";
        heroEl.style.backgroundPosition = "center";
      }
    }
  }).catch(() => { /* restano i testi/sfondo predefiniti */ });
}
