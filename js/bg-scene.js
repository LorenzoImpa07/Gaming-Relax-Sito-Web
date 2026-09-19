// ==========================================================================
// Sfondo interattivo — immagine / video / aurora, movimento col mouse.
// Impostazioni: Dashboard → Sfondi.
// ==========================================================================
import { db } from "./firebase-init.js";
import { doc, onSnapshot, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const DEFAULTS = {
  home: { bgStyle: "aurora", bgOverlay: 28, bgMotion: true },
  store: { bgStyle: "grid", bgOverlay: 32, bgMotion: true },
  custom: { bgStyle: "cinematic", bgOverlay: 30, bgMotion: true },
  art: { bgStyle: "particles", bgOverlay: 30, bgMotion: true },
  novita: { bgStyle: "aurora", bgOverlay: 32, bgMotion: true },
  forum: { bgStyle: "grid", bgOverlay: 36, bgMotion: true },
  team: { bgStyle: "cinematic", bgOverlay: 32, bgMotion: true },
  recensioni: { bgStyle: "aurora", bgOverlay: 32, bgMotion: true },
  contatti: { bgStyle: "cinematic", bgOverlay: 32, bgMotion: true },
  faq: { bgStyle: "grid", bgOverlay: 36, bgMotion: true },
  login: { bgStyle: "aurora", bgOverlay: 36, bgMotion: true },
  register: { bgStyle: "aurora", bgOverlay: 36, bgMotion: true },
  dashboard: { bgStyle: "grid", bgOverlay: 55, bgMotion: false },
  privacy: { bgStyle: "cinematic", bgOverlay: 36, bgMotion: true },
  termini: { bgStyle: "cinematic", bgOverlay: 36, bgMotion: true },
  grazie: { bgStyle: "aurora", bgOverlay: 30, bgMotion: true },
  "chi-siamo": { bgStyle: "aurora", bgOverlay: 30, bgMotion: true }
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let pageKey = document.body.dataset.page || "home";

function youtubeId(url = "") {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function isVideoFile(url = "") {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);
}

function directUrl(raw = "") {
  let url = String(raw || "").trim().replace(/^<|>$/g, "").replace(/^['"]|['"]$/g, "");
  if (!url) return "";
  if (url.startsWith("//")) url = "https:" + url;
  if (url.startsWith("http://")) url = "https://" + url.slice(7);
  let m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m) return "https://lh3.googleusercontent.com/d/" + m[1] + "=s0";
  m = url.match(/drive\.google\.com\/(?:open|uc)\?[^#]*id=([^&]+)/);
  if (m) return "https://lh3.googleusercontent.com/d/" + m[1] + "=s0";
  if (/dropbox\.com\//.test(url)) {
    return url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace(/[?&]dl=0/, "");
  }
  m = url.match(/^https?:\/\/(?:www\.)?imgur\.com\/(?:gallery\/|a\/)?([A-Za-z0-9]+)(?:\.[a-z]+)?$/i);
  if (m) return "https://i.imgur.com/" + m[1] + ".jpg";
  if (!/^https?:\/\//i.test(url) && !url.startsWith("data:")) {
    try { url = new URL(url, location.href).href; } catch (_) {}
  }
  return url;
}

function mountShell() {
  if (document.getElementById("page-bg")) return document.getElementById("page-bg");
  const el = document.createElement("div");
  el.id = "page-bg";
  el.className = "page-bg";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <div class="page-bg__layer" data-depth="media"></div>
    <div class="page-bg__layer page-bg__fx" data-depth="fx"></div>
    <canvas class="page-bg__particles" hidden></canvas>
    <div class="page-bg__overlay"></div>
    <div class="page-bg__vignette"></div>
  `;
  document.body.prepend(el);
  document.body.classList.add("has-page-bg");
  return el;
}

function renderMedia(layer, cfg) {
  layer.innerHTML = "";
  const videoUrl = directUrl(cfg.bgVideoUrl);
  const imageUrl = directUrl(cfg.bgImageUrl);

  if (videoUrl) {
    const yt = youtubeId(videoUrl);
    if (yt) {
      const wrap = document.createElement("div");
      wrap.className = "page-bg__yt";
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`;
      iframe.allow = "autoplay; encrypted-media";
      iframe.setAttribute("allowfullscreen", "");
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      wrap.appendChild(iframe);
      layer.appendChild(wrap);
      return true;
    }
    if (isVideoFile(videoUrl) || /^https?:\/\//i.test(videoUrl)) {
      const v = document.createElement("video");
      v.src = videoUrl;
      v.autoplay = true;
      v.muted = true;
      v.defaultMuted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute("muted", "");
      v.setAttribute("playsinline", "");
      v.setAttribute("autoplay", "");
      layer.appendChild(v);
      const tryPlay = () => v.play().catch(() => {});
      v.addEventListener("canplay", tryPlay, { once: true });
      tryPlay();
      if (!isVideoFile(videoUrl) && imageUrl) {
        /* keep going to also show image if video url is not a file */
      } else {
        return true;
      }
    }
  }

  if (imageUrl) {
    const img = document.createElement("div");
    img.className = "page-bg__photo";
    img.style.backgroundImage = "url(\"" + imageUrl.replace(/\\/g, "/").replace(/"/g, "%22") + "\")";
    const pic = document.createElement("img");
    pic.className = "page-bg__photo-img";
    pic.alt = "";
    pic.src = imageUrl;
    pic.decoding = "async";
    pic.referrerPolicy = "no-referrer";
    pic.addEventListener("error", () => { pic.style.display = "none"; });
    img.appendChild(pic);
    layer.appendChild(img);
    return true;
  }
  return false;
}


function renderFx(fx, style, hasMedia) {
  fx.innerHTML = "";
  fx.className = "page-bg__layer page-bg__fx";
  if (hasMedia) return;
  if (style === "none" || !style) return;
  if (style === "grid" || style === "cinematic") fx.classList.add("page-bg__fx--grid");
  if (style === "aurora" || style === "cinematic") {
    const a = document.createElement("div");
    a.className = "page-bg__aurora";
    fx.appendChild(a);
  }
}

function startParticles(canvas, enabled) {
  if (!enabled) {
    canvas.hidden = true;
    return () => {};
  }
  canvas.hidden = false;
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, raf = 0;
  const dots = Array.from({ length: 42 }, () => ({
    x: Math.random(), y: Math.random(),
    r: 0.6 + Math.random() * 1.6,
    s: 0.15 + Math.random() * 0.35,
    a: 0.18 + Math.random() * 0.4
  }));
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);
  function tick() {
    ctx.clearRect(0, 0, w, h);
    dots.forEach((d) => {
      d.y -= d.s * 0.00035;
      if (d.y < -0.02) d.y = 1.02;
      ctx.beginPath();
      ctx.fillStyle = `rgba(198,255,26,${d.a})`;
      ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2);
      ctx.fill();
    });
    raf = requestAnimationFrame(tick);
  }
  if (!reduceMotion) raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
  };
}

function startMotion(root, enabled) {
  const media = root.querySelector("[data-depth=media]");
  const fx = root.querySelector("[data-depth=fx]");
  if (!enabled || reduceMotion) return () => {};
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const onMove = (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  function tick() {
    cx += (tx - cx) * 0.045;
    cy += (ty - cy) * 0.045;
    if (media) media.style.transform = `translate3d(${cx * -18}px, ${cy * -12}px, 0)`;
    if (fx) fx.style.transform = `translate3d(${cx * -12}px, ${cy * -10}px, 0)`;
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
  };
}

let stopMotion = () => {};
let stopParticles = () => {};

function apply(cfg) {
  const root = mountShell();
  const imageUrl = directUrl(cfg.bgImageUrl);
  const videoUrl = directUrl(cfg.bgVideoUrl);
  const hasMedia = !!(imageUrl || videoUrl);
  root.classList.toggle("page-bg--has-media", hasMedia);
  let overlay = Number(cfg.bgOverlay);
  if (!Number.isFinite(overlay)) overlay = 28;
  overlay = Math.max(0, Math.min(80, overlay));
  const o = overlay / 100;
  const ov = root.querySelector(".page-bg__overlay");
  const vig = root.querySelector(".page-bg__vignette");
  if (hasMedia) {
    if (ov) ov.style.display = "none";
    if (vig) vig.style.display = "none";
  } else {
    const center = Math.min(0.75, o * 0.85);
    const edge = Math.min(0.9, o + 0.15);
    if (ov) ov.style.background = `radial-gradient(ellipse 90% 70% at 50% 38%, rgba(10,13,22,${center}) 0%, rgba(8,10,18,${edge}) 100%)`;
    if (vig) vig.style.opacity = "1";
  }
  renderMedia(root.querySelector("[data-depth=media]"), { bgImageUrl: imageUrl, bgVideoUrl: videoUrl });
  renderFx(root.querySelector("[data-depth=fx]"), cfg.bgStyle || "aurora", hasMedia);
  stopMotion();
  stopParticles();
  stopMotion = startMotion(root, !hasMedia && cfg.bgMotion !== false);
  stopParticles = startParticles(
    root.querySelector(".page-bg__particles"),
    cfg.bgStyle === "particles"
  );
}

function saveCache(cfg) {
  try {
    const all = JSON.parse(localStorage.getItem("gr_bgs") || "{}");
    all[pageKey] = {
      image: directUrl(cfg.bgImageUrl) || "",
      video: directUrl(cfg.bgVideoUrl) || "",
      style: cfg.bgStyle || "",
      overlay: cfg.bgOverlay,
      motion: cfg.bgMotion
    };
    localStorage.setItem("gr_bgs", JSON.stringify(all));
  } catch (_) {}
}

function loadCache() {
  try {
    const all = JSON.parse(localStorage.getItem("gr_bgs") || "{}");
    const c = all[pageKey];
    if (!c) return null;
    return {
      bgImageUrl: c.image || "",
      bgVideoUrl: c.video || "",
      bgStyle: c.style || "",
      bgOverlay: c.overlay,
      bgMotion: c.motion
    };
  } catch (_) {
    return null;
  }
}

let fallback = DEFAULTS[pageKey] || DEFAULTS.home;
function bootPageBg() {
  pageKey = document.body.dataset.page || "home";
  fallback = DEFAULTS[pageKey] || DEFAULTS.home;
  const cached = loadCache();
  if (cached && (cached.bgImageUrl || cached.bgVideoUrl)) {
    apply({
      bgImageUrl: cached.bgImageUrl,
      bgVideoUrl: cached.bgVideoUrl,
      bgStyle: cached.bgStyle || fallback.bgStyle,
      bgOverlay: cached.bgOverlay != null && cached.bgOverlay !== "" ? Number(cached.bgOverlay) : 0,
      bgMotion: cached.bgMotion !== false
    });
  } else {
    apply(fallback);
  }
}
bootPageBg();

let unsubPageBg = () => {};
function listenPageBg() {
  unsubPageBg();
  unsubPageBg = onSnapshot(doc(db, "siteContent", pageKey), (snap) => {
  const d = snap.exists() ? snap.data() : {};
  const image = (d.bgImageUrl || d.imageUrl || d.backgroundUrl || "").trim();
  const video = (d.bgVideoUrl || "").trim();
  if (!snap.exists() && !image && !video) return;
  const cfg = {
    bgImageUrl: image,
    bgVideoUrl: video,
    bgStyle: d.bgStyle || fallback.bgStyle,
    bgOverlay: d.bgOverlay != null && d.bgOverlay !== "" ? Number(d.bgOverlay) : (image || video ? 0 : fallback.bgOverlay),
    bgMotion: d.bgMotion !== false && d.bgMotion !== "false"
  };
  saveCache(cfg);
  apply(cfg);
}, () => {});
}
listenPageBg();
window.addEventListener("gr:navigated", () => {
  bootPageBg();
  listenPageBg();
});

getDocs(collection(db, "siteContent")).then((snap) => {
  try {
    const all = JSON.parse(localStorage.getItem("gr_bgs") || "{}");
    snap.forEach((docSnap) => {
      const d = docSnap.data() || {};
      const image = (d.bgImageUrl || d.imageUrl || d.backgroundUrl || "").trim();
      const video = (d.bgVideoUrl || "").trim();
      if (!image && !video) return;
      all[docSnap.id] = {
        image,
        video,
        style: d.bgStyle || "",
        overlay: d.bgOverlay,
        motion: d.bgMotion
      };
    });
    localStorage.setItem("gr_bgs", JSON.stringify(all));
  } catch (_) {}
}).catch(() => {});
