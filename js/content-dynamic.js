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

function applyDesign(d) {
  if (!d) return;
  Object.entries(DESIGN_VARS).forEach(([key, cssVar]) => {
    if (d[key]) document.documentElement.style.setProperty(cssVar, d[key]);
  });
  if (d.limeColor) document.documentElement.style.setProperty("--lime-dim", d.limeColor + "33");
  if (d.purpleColor) document.documentElement.style.setProperty("--purple-dim", d.purpleColor + "33");
  if (d.logoUrl) {
    document.querySelectorAll(".brand__logo img").forEach((img) => { img.src = d.logoUrl; });
  }
  try { localStorage.setItem("gr_design", JSON.stringify({
    limeColor: d.limeColor || "",
    purpleColor: d.purpleColor || "",
    bgColor: d.bgColor || "",
    bgAltColor: d.bgAltColor || "",
    cardColor: d.cardColor || "",
    logoUrl: d.logoUrl || ""
  })); } catch (_) {}
}

getDoc(doc(db, "siteContent", "design")).then((snap) => {
  if (!snap.exists()) return;
  applyDesign(snap.data());
}).catch(() => {});

function applyLineBreaks(value) {
  return String(value).replace(/\n/g, "<br>");
}

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
  if (d.aboutTitle) {
    document.querySelectorAll('[data-about="title"]').forEach((el) => { el.textContent = d.aboutTitle; });
  }
  if (d.aboutFooter) {
    document.querySelectorAll('[data-about="footer"]').forEach((el) => { el.textContent = d.aboutFooter; });
  }
  if (d.aboutBody) {
    document.querySelectorAll('[data-about="body"]').forEach((el) => {
      el.innerHTML = String(d.aboutBody).replace(/\n/g, "<br>");
    });
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
  }).catch(() => { /* restano i testi/sfondo predefiniti */ });
}
