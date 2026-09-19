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

const SOCIAL_DEFAULTS = {
  discord: "https://discord.gg/5MxfYT7C5f",
  youtube: "https://www.youtube.com/@gamingrelaxofficials",
  instagram: "https://www.instagram.com/gamingrelaxofficials/",
  tiktok: "https://www.tiktok.com/@gamingrelaxofficials",
  email: "mailto:gamingrelaxofficials@gmail.com"
};

function applySocials(d = {}) {
  const socials = {
    discord: d.discordUrl || SOCIAL_DEFAULTS.discord,
    youtube: d.youtubeUrl || SOCIAL_DEFAULTS.youtube,
    instagram: d.instagramUrl || SOCIAL_DEFAULTS.instagram,
    tiktok: d.tiktokUrl || SOCIAL_DEFAULTS.tiktok,
    email: d.supportEmail ? `mailto:${d.supportEmail}` : SOCIAL_DEFAULTS.email
  };
  Object.entries(socials).forEach(([key, url]) => {
    if (!url) return;
    document.querySelectorAll(`[data-social="${key}"]`).forEach((el) => {
      el.href = url;
      if (key !== "email") {
        el.target = "_blank";
        el.rel = "noopener";
      }
    });
  });
  const fab = document.querySelector(".floating-discord");
  if (fab && socials.discord) fab.href = socials.discord;
  try { localStorage.setItem("gr_socials", JSON.stringify(socials)); } catch (_) {}
}

try {
  const cached = JSON.parse(localStorage.getItem("gr_socials") || "null");
  applySocials(cached ? {
    discordUrl: cached.discord,
    youtubeUrl: cached.youtube,
    instagramUrl: cached.instagram,
    tiktokUrl: cached.tiktok,
    supportEmail: String(cached.email || "").replace(/^mailto:/, "")
  } : {});
} catch (_) {
  applySocials({});
}

// --- 2) Contatti, orari e link social, applicati su ogni pagina ---
getDoc(doc(db, "siteContent", "general")).then((snap) => {
  const d = snap.exists() ? snap.data() : {};
  applySocials(d);

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
  if (d.replyTime) {
    document.querySelectorAll('[data-general="replyTime"]').forEach((el) => { el.textContent = d.replyTime; });
  }
  if (d.studioLocation) {
    document.querySelectorAll('[data-general="studioLocation"]').forEach((el) => { el.textContent = d.studioLocation; });
  }
  const tg = document.getElementById("contact-telegram");
  if (tg && d.telegramUrl) { tg.href = d.telegramUrl; tg.hidden = false; }
}).catch(() => { applySocials({}); });

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
    document.querySelectorAll("[data-side-img]").forEach((img) => {
      const key = img.dataset.sideImg;
      const url = d[key];
      const wrap = document.querySelector('[data-side-wrap="' + key + '"]');
      if (url) {
        img.src = url;
        if (wrap) wrap.hidden = false;
        img.closest("section")?.classList.add("has-side");
      } else if (wrap) {
        wrap.hidden = true;
      }
    });
  }).catch(() => { /* restano i testi/sfondo predefiniti */ });
}
