import { db } from "./firebase-init.js";
import { doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";
import { bindEmailFields } from "./email-check.js";

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
  try {
    localStorage.setItem("gr_design", JSON.stringify({
      limeColor: d.limeColor || "",
      purpleColor: d.purpleColor || "",
      bgColor: d.bgColor || "",
      bgAltColor: d.bgAltColor || "",
      cardColor: d.cardColor || "",
      logoUrl: d.logoUrl || ""
    }));
  } catch (_) {}
}

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

function applyGeneral(d = {}) {
  applySocials(d);
  const setText = (sel, val) => {
    if (!val) return;
    document.querySelectorAll(sel).forEach((el) => { el.textContent = val; });
  };
  setText('[data-general="hoursWeekday"]', d.hoursWeekday);
  setText('[data-general="hoursWeekend"]', d.hoursWeekend);
  setText('[data-about="title"]', d.aboutTitle);
  setText('[data-about="footer"]', d.aboutFooter);
  setText('[data-general="replyTime"]', d.replyTime);
  setText('[data-general="studioLocation"]', d.studioLocation);
  if (d.aboutBody) {
    document.querySelectorAll('[data-about="body"]').forEach((el) => {
      el.innerHTML = String(d.aboutBody).replace(/\n/g, "<br>");
    });
  }
  const tg = document.getElementById("contact-telegram");
  if (tg) {
    if (d.telegramUrl) { tg.href = d.telegramUrl; tg.hidden = false; }
    else tg.hidden = true;
  }
}

function applyPageContent(d = {}) {
  document.querySelectorAll("[data-edit]").forEach((el) => {
    if (el.dataset.orig == null) el.dataset.orig = el.innerHTML;
    const key = el.dataset.edit;
    el.innerHTML = d[key] ? applyLineBreaks(d[key]) : el.dataset.orig;
  });
  document.querySelectorAll("[data-side-img]").forEach((img) => {
    const key = img.dataset.sideImg;
    const url = d[key];
    const wrap = document.querySelector('[data-side-wrap="' + key + '"]');
    if (url) {
      img.src = url;
      if (wrap) wrap.hidden = false;
      img.closest("section")?.classList.add("has-side");
    } else {
      if (wrap) wrap.hidden = true;
      img.closest("section")?.classList.remove("has-side");
    }
  });
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

onSnapshot(doc(db, "siteContent", "design"), (snap) => {
  if (snap.exists()) applyDesign(snap.data());
});

onSnapshot(doc(db, "siteContent", "general"), (snap) => {
  applyGeneral(snap.exists() ? snap.data() : {});
}, () => applySocials({}));

const pageKey = document.body.dataset.page;
if (pageKey) {
  onSnapshot(doc(db, "siteContent", pageKey), (snap) => {
    if (snap.exists()) applyPageContent(snap.data());
  });
}
