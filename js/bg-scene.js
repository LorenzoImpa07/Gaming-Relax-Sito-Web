// ==========================================================================
// Sfondo pagina — fallback locali + configurazione Firestore.
// Dashboard → Sfondi salva in: siteContent/{pagina}.
// ==========================================================================

import { db } from "./firebase-init.js";
import {
  doc,
  onSnapshot,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const DEFAULTS = {
  home: {
    bgStyle: "aurora",
    bgOverlay: 48,
    bgMotion: true,
    bgImageUrl: "images/home-bg.jpg"
  },
  store: {
    bgStyle: "grid",
    bgOverlay: 56,
    bgMotion: true,
    bgImageUrl: "images/bg-store.jpg"
  },
  custom: {
    bgStyle: "cinematic",
    bgOverlay: 52,
    bgMotion: true,
    bgImageUrl: "images/bg-studio.jpg"
  },
  art: {
    bgStyle: "particles",
    bgOverlay: 50,
    bgMotion: true,
    bgImageUrl: "images/bg-art.jpg"
  },
  novita: {
    bgStyle: "aurora",
    bgOverlay: 58,
    bgMotion: true,
    bgImageUrl: "images/bg-store.jpg"
  },
  forum: {
    bgStyle: "grid",
    bgOverlay: 64,
    bgMotion: true,
    bgImageUrl: "images/bg-art.jpg"
  },
  team: {
    bgStyle: "cinematic",
    bgOverlay: 56,
    bgMotion: true,
    bgImageUrl: "images/bg-studio.jpg"
  },
  recensioni: {
    bgStyle: "aurora",
    bgOverlay: 58,
    bgMotion: true,
    bgImageUrl: "images/bg-store.jpg"
  },
  contatti: {
    bgStyle: "cinematic",
    bgOverlay: 58,
    bgMotion: true,
    bgImageUrl: "images/bg-studio.jpg"
  },
  faq: {
    bgStyle: "grid",
    bgOverlay: 68,
    bgMotion: true,
    bgImageUrl: "images/bg-quiet.jpg"
  },
  login: {
    bgStyle: "aurora",
    bgOverlay: 70,
    bgMotion: false,
    bgImageUrl: "images/bg-quiet.jpg"
  },
  register: {
    bgStyle: "aurora",
    bgOverlay: 70,
    bgMotion: false,
    bgImageUrl: "images/bg-quiet.jpg"
  },
  dashboard: {
    bgStyle: "none",
    bgOverlay: 74,
    bgMotion: false,
    bgImageUrl: "images/bg-quiet.jpg"
  },
  privacy: {
    bgStyle: "none",
    bgOverlay: 72,
    bgMotion: false,
    bgImageUrl: "images/bg-quiet.jpg"
  },
  termini: {
    bgStyle: "none",
    bgOverlay: 72,
    bgMotion: false,
    bgImageUrl: "images/bg-quiet.jpg"
  },
  grazie: {
    bgStyle: "aurora",
    bgOverlay: 58,
    bgMotion: true,
    bgImageUrl: "images/bg-store.jpg"
  },
  "chi-siamo": {
    bgStyle: "cinematic",
    bgOverlay: 58,
    bgMotion: true,
    bgImageUrl: "images/bg-studio.jpg"
  }
};

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

let pageKey = document.body.dataset.page || "home";
let unsubscribe = () => {};
let stopMotion = () => {};

function cleanUrl(value = "") {
  let valueClean = String(value || "").trim();

  if (valueClean.startsWith("//")) {
    valueClean = `https:${valueClean}`;
  }

  if (valueClean.startsWith("http://")) {
    valueClean = `https://${valueClean.slice(7)}`;
  }

  if (!valueClean) return "";

  if (!/^https?:\/\//i.test(valueClean) && !valueClean.startsWith("data:")) {
    try {
      return new URL(valueClean, window.location.href).href;
    } catch (_) {
      return valueClean;
    }
  }

  return valueClean;
}

function injectStyles() {
  if (document.getElementById("gr-page-bg-styles")) return;

  const style = document.createElement("style");
  style.id = "gr-page-bg-styles";

  style.textContent = `
    html.has-page-bg,
    body.has-page-bg {
      background: #070912 !important;
    }

    #page-bg {
      position: fixed;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
      background: #070912;
    }

    body.has-page-bg > *:not(#page-bg) {
      position: relative;
      z-index: 1;
    }

    .page-bg__media,
    .page-bg__fx,
    .page-bg__overlay,
    .page-bg__vignette {
      position: absolute;
      inset: -4%;
    }

    .page-bg__media {
      z-index: 0;
      background: #070912 center / cover no-repeat;
      transition: transform 0.2s ease-out;
    }

    .page-bg__media video,
    .page-bg__photo {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      background-position: center;
      background-size: cover;
    }

    .page-bg__fx {
      z-index: 1;
      transition: transform 0.2s ease-out;
    }

    .page-bg__overlay {
      z-index: 2;
    }

    .page-bg__vignette {
      z-index: 3;
      background: radial-gradient(
        ellipse at center,
        transparent 25%,
        rgba(0, 0, 0, 0.38) 100%
      );
    }

    .page-bg__fx--aurora,
    .page-bg__fx--cinematic {
      background:
        radial-gradient(circle at 18% 18%, rgba(139, 61, 255, 0.48), transparent 36%),
        radial-gradient(circle at 82% 72%, rgba(27, 207, 255, 0.25), transparent 42%);
      filter: blur(18px);
    }

    .page-bg__fx--grid,
    .page-bg__fx--cinematic {
      background-image:
        linear-gradient(rgba(139, 61, 255, 0.13) 1px, transparent 1px),
        linear-gradient(90deg, rgba(139, 61, 255, 0.13) 1px, transparent 1px);
      background-size: 44px 44px;
    }

    .page-bg__fx--particles::before,
    .page-bg__fx--particles::after {
      content: "";
      position: absolute;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #d6fbff;
      box-shadow:
        12vw 18vh 0 rgba(255, 77, 173, 0.75),
        38vw 62vh 0 rgba(151, 78, 255, 0.75),
        70vw 24vh 0 rgba(84, 220, 255, 0.7),
        84vw 76vh 0 rgba(255, 77, 173, 0.6);
    }

    @media (prefers-reduced-motion: reduce) {
      .page-bg__media,
      .page-bg__fx {
        transition: none !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function mountBackground() {
  let root = document.getElementById("page-bg");

  if (!root) {
    root = document.createElement("div");
    root.id = "page-bg";
    root.setAttribute("aria-hidden", "true");

    root.innerHTML = `
      <div class="page-bg__media"></div>
      <div class="page-bg__fx"></div>
      <div class="page-bg__overlay"></div>
      <div class="page-bg__vignette"></div>
    `;

    document.body.prepend(root);
  }

  document.documentElement.classList.add("has-page-bg");
  document.body.classList.add("has-page-bg");

  return root;
}

function startParallax(root, enabled) {
  if (!enabled || reduceMotion) return () => {};

  const media = root.querySelector(".page-bg__media");
  const fx = root.querySelector(".page-bg__fx");

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let animationFrame = 0;

  const onPointerMove = (event) => {
    targetX = (event.clientX / window.innerWidth - 0.5) * 2;
    targetY = (event.clientY / window.innerHeight - 0.5) * 2;
  };

  const tick = () => {
    currentX += (targetX - currentX) * 0.05;
    currentY += (targetY - currentY) * 0.05;

    if (media) {
      media.style.transform =
        `translate3d(${currentX * -14}px, ${currentY * -10}px, 0) scale(1.04)`;
    }

    if (fx) {
      fx.style.transform =
        `translate3d(${currentX * -8}px, ${currentY * -7}px, 0)`;
    }

    animationFrame = requestAnimationFrame(tick);
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  tick();

  return () => {
    cancelAnimationFrame(animationFrame);
    window.removeEventListener("pointermove", onPointerMove);
  };
}

function applyBackground(config) {
  const root = mountBackground();

  const imageUrl = cleanUrl(config.bgImageUrl);
  const videoUrl = cleanUrl(config.bgVideoUrl);

  const media = root.querySelector(".page-bg__media");
  const fx = root.querySelector(".page-bg__fx");
  const overlay = root.querySelector(".page-bg__overlay");

  media.innerHTML = "";

  if (videoUrl) {
    const video = document.createElement("video");

    video.src = videoUrl;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");

    media.appendChild(video);
    video.play().catch(() => {});
  } else if (imageUrl) {
    const image = document.createElement("div");
    image.className = "page-bg__photo";
    image.style.backgroundImage = `url("${imageUrl.replace(/"/g, "%22")}")`;
    media.appendChild(image);
  }

  const styleName = config.bgStyle || "none";

  fx.className = "page-bg__fx";

  if (styleName === "aurora") {
    fx.classList.add("page-bg__fx--aurora");
  }

  if (styleName === "grid") {
    fx.classList.add("page-bg__fx--grid");
  }

  if (styleName === "cinematic") {
    fx.classList.add("page-bg__fx--cinematic");
  }

  if (styleName === "particles") {
    fx.classList.add("page-bg__fx--particles");
  }

  let overlayValue = Number(config.bgOverlay);

  if (!Number.isFinite(overlayValue)) {
    overlayValue = 55;
  }

  overlayValue = Math.max(0, Math.min(85, overlayValue));

  const overlayOpacity = overlayValue / 100;

  overlay.style.background = `
    linear-gradient(
      135deg,
      rgba(4, 6, 13, ${Math.min(0.92, overlayOpacity + 0.18)}),
      rgba(5, 7, 14, ${overlayOpacity})
    )
  `;

  stopMotion();
  stopMotion = startParallax(root, config.bgMotion !== false);
}

function saveCache(config) {
  try {
    const backgrounds = JSON.parse(
      localStorage.getItem("gr_bgs") || "{}"
    );

    backgrounds[pageKey] = {
      image: config.bgImageUrl || "",
      video: config.bgVideoUrl || "",
      style: config.bgStyle || "none",
      overlay: config.bgOverlay,
      motion: config.bgMotion !== false
    };

    localStorage.setItem("gr_bgs", JSON.stringify(backgrounds));
  } catch (_) {}
}

function getCachedBackground() {
  try {
    const backgrounds = JSON.parse(
      localStorage.getItem("gr_bgs") || "{}"
    );

    const cached = backgrounds[pageKey];

    if (!cached) return null;

    return {
      bgImageUrl: cached.image || "",
      bgVideoUrl: cached.video || "",
      bgStyle: cached.style || "",
      bgOverlay: cached.overlay,
      bgMotion: cached.motion !== false
    };
  } catch (_) {
    return null;
  }
}

function getConfig(data = {}) {
  const fallback = DEFAULTS[pageKey] || DEFAULTS.home;

  const savedImage = cleanUrl(
    data.bgImageUrl || data.imageUrl || data.backgroundUrl || ""
  );

  const savedVideo = cleanUrl(data.bgVideoUrl || "");

  return {
    bgImageUrl: savedImage || fallback.bgImageUrl,
    bgVideoUrl: savedVideo || "",
    bgStyle: data.bgStyle || fallback.bgStyle,
    bgOverlay:
      data.bgOverlay !== undefined &&
      data.bgOverlay !== null &&
      data.bgOverlay !== ""
        ? Number(data.bgOverlay)
        : fallback.bgOverlay,
    bgMotion:
      data.bgMotion !== false &&
      data.bgMotion !== "false" &&
      fallback.bgMotion !== false
  };
}

function boot() {
  pageKey = document.body.dataset.page || "home";

  injectStyles();

  const fallback = DEFAULTS[pageKey] || DEFAULTS.home;
  const cached = getCachedBackground();

  applyBackground({
    ...fallback,
    ...(cached || {})
  });
}

function listenToFirestore() {
  unsubscribe();

  unsubscribe = onSnapshot(
    doc(db, "siteContent", pageKey),
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      const config = getConfig(data);

      saveCache(config);
      applyBackground(config);
    },
    () => {
      applyBackground(DEFAULTS[pageKey] || DEFAULTS.home);
    }
  );
}

boot();
listenToFirestore();

window.addEventListener("gr:navigated", () => {
  boot();
  listenToFirestore();
});

getDocs(collection(db, "siteContent"))
  .then((snapshot) => {
    try {
      const backgrounds = JSON.parse(
        localStorage.getItem("gr_bgs") || "{}"
      );

      snapshot.forEach((documentSnapshot) => {
        const page = documentSnapshot.id;
        const data = documentSnapshot.data() || {};
        const fallback = DEFAULTS[page] || DEFAULTS.home;

        backgrounds[page] = {
          image:
            cleanUrl(
              data.bgImageUrl ||
              data.imageUrl ||
              data.backgroundUrl ||
              ""
            ) || fallback.bgImageUrl,
          video: cleanUrl(data.bgVideoUrl || ""),
          style: data.bgStyle || fallback.bgStyle,
          overlay:
            data.bgOverlay !== undefined &&
            data.bgOverlay !== null &&
            data.bgOverlay !== ""
              ? Number(data.bgOverlay)
              : fallback.bgOverlay,
          motion:
            data.bgMotion !== false &&
            data.bgMotion !== "false" &&
            fallback.bgMotion !== false
        };
      });

      localStorage.setItem("gr_bgs", JSON.stringify(backgrounds));
    } catch (_) {}
  })
  .catch(() => {});
fix: restore visible page backgrounds
