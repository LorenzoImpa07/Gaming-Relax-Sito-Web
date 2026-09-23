import { db, auth, isVerifiedUser } from "./firebase-init.js";
import { collection, addDoc, doc, getDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { validateRealEmailAsync } from "./email-check.js";

const DEFAULTS = {
  basePrice: 89,
  layouts: [
    { name: "60%", extra: 0 },
    { name: "65%", extra: 15 },
    { name: "75%", extra: 25 },
    { name: "TKL", extra: 40 }
  ],
  cases: [
    { name: "Void", hex: "#14121c", extra: 0 },
    { name: "Viola", hex: "#5b2b9a", extra: 12 },
    { name: "Rosa", hex: "#ff4dad", extra: 12 },
    { name: "Ice", hex: "#d9d4e8", extra: 18 },
    { name: "Carbon", hex: "#2a3038", extra: 10 }
  ],
  caps: [
    { name: "Ghost", hex: "#e4dcf2", accent: "#c9bddc", extra: 0 },
    { name: "Neon Pink", hex: "#ff4dad", accent: "#8b3dff", extra: 18 },
    { name: "Galaxy", hex: "#6b4dff", accent: "#ff7ad9", extra: 22 },
    { name: "Matcha", hex: "#8ee0a8", accent: "#1e3d2a", extra: 16 },
    { name: "Midnight", hex: "#2a2d3a", accent: "#ff4dad", extra: 14 }
  ],
  switches: [
    { name: "Lineare", extra: 0 },
    { name: "Tattile", extra: 10 },
    { name: "Clicky", extra: 10 }
  ],
  extras: [
    { name: "RGB underglow", extra: 20 },
    { name: "Lube switch", extra: 25 },
    { name: "Stabilizzatori tuned", extra: 15 },
    { name: "Foam + tape mod", extra: 18 },
    { name: "Keycaps artisan", extra: 35 }
  ]
};

const U = 28;
const G = 3;

function lines(s) {
  return String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
}
function euro(n) {
  return (Number(n) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (m) => ({
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
    "'": "&#39;"
  }[m]));
}
function shade(hex, amt) {
  const h = String(hex || "#888").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function parseNamed(raw, fallback, kind) {
  const rows = lines(raw);
  if (!rows.length) return fallback.slice();
  return rows.map((line) => {
    const p = line.split("|").map((x) => x.trim()).filter(Boolean);
    if (kind === "case") return { name: p[0], hex: p[1] || "#1b1428", extra: Number(p[2]) || 0 };
    if (kind === "caps") return { name: p[0], hex: p[1] || "#e4dcf2", accent: p[2] || "#ff4dad", extra: Number(p[3]) || 0 };
    return { name: p[0], extra: Number(p[1]) || 0 };
  }).filter((x) => x.name);
}

let catalog = {
  basePrice: DEFAULTS.basePrice,
  layouts: DEFAULTS.layouts.slice(),
  cases: DEFAULTS.cases.slice(),
  caps: DEFAULTS.caps.slice(),
  switches: DEFAULTS.switches.slice(),
  extras: DEFAULTS.extras.slice()
};
let builds = [];
let currentUser = null;
const state = {
  layout: "60%",
  caseName: "Void",
  caseHex: "#14121c",
  capsName: "Ghost",
  capsHex: "#e4dcf2",
  accentHex: "#c9bddc",
  sw: "Lineare",
  extras: ["RGB underglow"]
};

function row(items) {
  let x = 0;
  return items.map((it) => {
    const u = it.w || 1;
    const w = u * U + (u - 1) * G;
    const k = { x, w, h: U, l: it.l || "", m: !!it.m };
    x += w + G;
    return k;
  });
}

function layoutKeys(name) {
  const n = String(name || "").toLowerCase();
  const r0 = row([{ l: "Esc", m: 1 }, { l: "1" }, { l: "2" }, { l: "3" }, { l: "4" }, { l: "5" }, { l: "6" }, { l: "7" }, { l: "8" }, { l: "9" }, { l: "0" }, { l: "-" }, { l: "=" }, { l: "⌫", w: 2, m: 1 }]);
  const r1 = row([{ l: "Tab", w: 1.5, m: 1 }, { l: "Q" }, { l: "W" }, { l: "E" }, { l: "R" }, { l: "T" }, { l: "Y" }, { l: "U" }, { l: "I" }, { l: "O" }, { l: "P" }, { l: "[" }, { l: "]" }, { l: "\\", w: 1.5, m: 1 }]);
  const r2 = row([{ l: "Caps", w: 1.75, m: 1 }, { l: "A" }, { l: "S" }, { l: "D" }, { l: "F" }, { l: "G" }, { l: "H" }, { l: "J" }, { l: "K" }, { l: "L" }, { l: ";" }, { l: "'" }, { l: "↵", w: 2.25, m: 1 }]);
  const r3 = row([{ l: "⇧", w: 2.25, m: 1 }, { l: "Z" }, { l: "X" }, { l: "C" }, { l: "V" }, { l: "B" }, { l: "N" }, { l: "M" }, { l: "," }, { l: "." }, { l: "/" }, { l: "⇧", w: 2.75, m: 1 }]);
  const r4 = row([{ l: "Ctrl", w: 1.25, m: 1 }, { l: "⌘", w: 1.25, m: 1 }, { l: "Alt", w: 1.25, m: 1 }, { l: "", w: 6.25 }, { l: "Alt", w: 1.25, m: 1 }, { l: "Fn", w: 1.25, m: 1 }, { l: "☰", w: 1.25, m: 1 }, { l: "Ctrl", w: 1.25, m: 1 }]);
  const rows = [r0, r1, r2, r3, r4];
  if (n.includes("65") || n.includes("75") || n.includes("tkl")) {
    rows.forEach((r, i) => {
      r.push({ x: r[r.length - 1].x + r[r.length - 1].w + G, w: U, h: U, l: ["Del", "PgUp", "PgDn", "End", "←"][i] || "·", m: true });
    });
  }
  if (n.includes("75") || n.includes("tkl")) {
    const f = row([{ l: "Esc", m: 1 }, { l: "F1" }, { l: "F2" }, { l: "F3" }, { l: "F4" }, { l: "F5" }, { l: "F6" }, { l: "F7" }, { l: "F8" }, { l: "F9" }, { l: "F10" }, { l: "F11" }, { l: "F12" }, { l: "Del", m: 1 }]);
    rows.unshift(f);
  }
  if (n.includes("tkl")) {
    const navY = [1, 2, 3];
    rows.forEach((r, i) => {
      if (i >= 1 && i <= 3) {
        const start = r[r.length - 1].x + r[r.length - 1].w + G + 10;
        ["Ins", "Home", "PgU"].forEach((lab, k) => {
          r.push({ x: start + k * (U + G), w: U, h: U, l: lab, m: true });
        });
      }
    });
  }
  return rows;
}

function renderPreview() {
  const el = document.getElementById("kb-preview");
  if (!el) return;
  const rows = layoutKeys(state.layout);
  let maxW = 0, y = 0;
  const rgb = state.extras.some((x) => /rgb/i.test(x));
  const parts = [];
  rows.forEach((keys) => {
    keys.forEach((k) => {
      maxW = Math.max(maxW, k.x + k.w);
      const fill = k.m ? state.accentHex : state.capsHex;
      const top = shade(fill, 28);
      const side = shade(fill, -40);
      parts.push(`<g class="kb-key" transform="translate(${k.x},${y})">
        <rect width="${k.w}" height="${k.h}" rx="5" fill="${side}"/>
        <rect x="1.6" y="1.2" width="${k.w - 3.2}" height="${k.h - 5}" rx="4" fill="${top}"/>
        <text x="${k.w / 2}" y="${k.h / 2 + 1.4}" text-anchor="middle" font-size="${k.w < 22 ? 6.5 : 8}" fill="rgba(8,6,14,.72)" font-family="Inter,sans-serif" font-weight="600">${esc(k.l)}</text>
      </g>`);
    });
    y += U + G;
  });
  const pad = 16;
  const W = maxW + pad * 2;
  const H = y + pad * 2 + 10;
  const caseTop = shade(state.caseHex, 22);
  const caseBot = shade(state.caseHex, -28);
  const glow = rgb ? `filter:drop-shadow(0 0 18px ${state.accentHex}) drop-shadow(0 12px 28px ${state.accentHex}88);` : "";
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H + 28}" class="kb-svg" style="${glow}">
    <defs>
      <linearGradient id="kc" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${caseTop}"/>
        <stop offset="1" stop-color="${caseBot}"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${H}" rx="18" fill="url(#kc)"/>
    <rect x="7" y="7" width="${W - 14}" height="${H - 18}" rx="12" fill="${shade(state.caseHex, -50)}" opacity=".35"/>
    <g transform="translate(${pad},${pad})">${parts.join("")}</g>
    <path d="M${W / 2} ${H} C ${W / 2} ${H + 16}, ${W / 2 + 40} ${H + 22}, ${W / 2 + 70} ${H + 26}" stroke="${shade(state.accentHex, -10)}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function find(list, name) {
  return list.find((x) => x.name === name) || list[0];
}

function estimate() {
  const layout = find(catalog.layouts, state.layout);
  const cse = catalog.cases.find((x) => x.name === state.caseName);
  const caps = catalog.caps.find((x) => x.name === state.capsName);
  const sw = find(catalog.switches, state.sw);
  const extras = catalog.extras.filter((x) => state.extras.includes(x.name));
  return (Number(catalog.basePrice) || 0)
    + (layout?.extra || 0)
    + (cse?.extra || 0)
    + (caps?.extra || 0)
    + (sw?.extra || 0)
    + extras.reduce((n, x) => n + (x.extra || 0), 0);
}

function paintChips(id, items, selected, multi) {
  const box = document.getElementById(id);
  if (!box) return;
  box.innerHTML = items.map((it) => {
    const name = it.name || it;
    const on = multi ? selected.includes(name) : selected === name;
    const extra = it.extra ? ` <small>+${it.extra}€</small>` : "";
    return `<button type="button" class="cfg-chip ${on ? "is-on" : ""}" data-chip="${esc(name)}">${esc(name)}${extra}</button>`;
  }).join("");
}

function paintSwatches(id, items, current, kind) {
  const box = document.getElementById(id);
  if (!box) return;
  box.innerHTML = items.map((it) => {
    const on = current === it.name;
    const bg = kind === "caps"
      ? `linear-gradient(135deg, ${it.hex}, ${it.accent || it.hex})`
      : it.hex;
    return `<button type="button" class="kb-swatch ${on ? "is-on" : ""}" data-chip="${esc(it.name)}" title="${esc(it.name)}">
      <i style="background:${bg}"></i><span>${esc(it.name)}${it.extra ? ` +${it.extra}€` : ""}</span>
    </button>`;
  }).join("");
}

function renderUI() {
  paintChips("kb-layouts", catalog.layouts, state.layout, false);
  paintSwatches("kb-cases", catalog.cases, state.caseName, "case");
  paintSwatches("kb-caps", catalog.caps, state.capsName, "caps");
  paintChips("kb-switches", catalog.switches, state.sw, false);
  paintChips("kb-extras", catalog.extras, state.extras, true);
  const cse = document.getElementById("kb-case-free");
  const cap = document.getElementById("kb-caps-free");
  const acc = document.getElementById("kb-accent-free");
  if (cse && cse.value.toLowerCase() !== state.caseHex.toLowerCase()) cse.value = state.caseHex;
  if (cap && cap.value.toLowerCase() !== state.capsHex.toLowerCase()) cap.value = state.capsHex;
  if (acc && acc.value.toLowerCase() !== state.accentHex.toLowerCase()) acc.value = state.accentHex;
  const sum = document.getElementById("kb-summary");
  if (sum) {
    sum.innerHTML = `
      <li><span>Layout</span><strong>${esc(state.layout)}</strong></li>
      <li><span>Case</span><strong>${esc(state.caseName)}</strong></li>
      <li><span>Keycaps</span><strong>${esc(state.capsName)}</strong></li>
      <li><span>Switch</span><strong>${esc(state.sw)}</strong></li>
      <li><span>Extra</span><strong>${esc(state.extras.join(", ") || "—")}</strong></li>`;
  }
  const price = document.getElementById("kb-price");
  if (price) price.textContent = euro(estimate());
  renderPreview();
}

function setStatus(msg, html) {
  const s = document.getElementById("kb-status");
  if (!s) return;
  s.className = msg ? "form-status visible" : "form-status";
  if (html) s.innerHTML = msg;
  else s.textContent = msg || "";
}

function renderBuilds() {
  const wrap = document.getElementById("custom-builds");
  const sec = document.getElementById("custom-builds-sec");
  if (!wrap || !sec) return;
  if (!builds.length) { sec.hidden = true; return; }
  sec.hidden = false;
  wrap.innerHTML = builds.map((b) => `
    <figure class="cbuild">
      <img src="${esc(b.imageUrl)}" alt="${esc(b.title)}">
      <figcaption><strong>${esc(b.title)}</strong>${b.caption ? `<span>${esc(b.caption)}</span>` : ""}</figcaption>
    </figure>`).join("");
}

function onClick(e) {
  const chip = e.target.closest("[data-chip]");
  if (!chip) return;
  const v = chip.dataset.chip;
  const box = chip.parentElement?.id || "";
  if (box === "kb-layouts") state.layout = v;
  else if (box === "kb-switches") state.sw = v;
  else if (box === "kb-extras") {
    state.extras = state.extras.includes(v) ? state.extras.filter((x) => x !== v) : state.extras.concat(v);
  } else if (box === "kb-cases") {
    const it = catalog.cases.find((x) => x.name === v);
    state.caseName = v;
    if (it) state.caseHex = it.hex;
  } else if (box === "kb-caps") {
    const it = catalog.caps.find((x) => x.name === v);
    state.capsName = v;
    if (it) { state.capsHex = it.hex; state.accentHex = it.accent || it.hex; }
  }
  renderUI();
}

async function submitCfg(e) {
  e.preventDefault();
  const alias = (document.getElementById("kb-alias")?.value || "").trim();
  const email = (document.getElementById("kb-email")?.value || "").trim();
  const discord = (document.getElementById("kb-discord")?.value || "").trim();
  const note = (document.getElementById("kb-note")?.value || "").trim();
  if (!alias) { setStatus("Inserisci un nome."); return; }
  const emailErr = await validateRealEmailAsync(email);
  if (emailErr) { setStatus(emailErr); return; }
  if (!currentUser) {
    setStatus('Per inviare accedi con un\'email confermata. <a href="login.html">Accedi</a>', true);
    return;
  }
  const progetto = [
    "[Configuratore visivo]",
    "Layout: " + state.layout,
    "Case: " + state.caseName + " (" + state.caseHex + ")",
    "Keycaps: " + state.capsName + " (" + state.capsHex + " / " + state.accentHex + ")",
    "Switch: " + state.sw,
    "Extra: " + (state.extras.join(", ") || "—"),
    "Stima: " + euro(estimate()),
    note ? "Note: " + note : ""
  ].filter(Boolean).join("\n");
  try {
    await addDoc(collection(db, "richieste"), {
      alias,
      email: currentUser.email,
      uid: currentUser.uid,
      discord,
      servizio: "tastiera-custom",
      progetto,
      source: "configuratore",
      customConfig: {
        layout: state.layout,
        caseName: state.caseName,
        caseHex: state.caseHex,
        capsName: state.capsName,
        capsHex: state.capsHex,
        accentHex: state.accentHex,
        sw: state.sw,
        extras: state.extras.slice(),
        estimate: estimate()
      },
      status: "nuova",
      createdAt: serverTimestamp()
    });
    setStatus("Richiesta inviata. Ti ricontattiamo noi.");
  } catch (_) {
    setStatus("Invio non riuscito. Riprova o scrivici su Discord.");
  }
}

function applyWizard(d) {
  if (!d) return;
  if (d.basePrice != null && d.basePrice !== "") catalog.basePrice = Number(d.basePrice) || catalog.basePrice;
  catalog.layouts = parseNamed(d.layouts, DEFAULTS.layouts);
  catalog.cases = parseNamed(d.cases, DEFAULTS.cases, "case");
  catalog.caps = parseNamed(d.keycaps || d.caps, DEFAULTS.caps, "caps");
  catalog.switches = parseNamed(d.switches, DEFAULTS.switches);
  catalog.extras = parseNamed(d.extras, DEFAULTS.extras);
  if (!catalog.layouts.some((x) => x.name === state.layout)) state.layout = catalog.layouts[0]?.name || "60%";
  if (!catalog.cases.some((x) => x.name === state.caseName)) {
    state.caseName = catalog.cases[0]?.name || "Case";
    state.caseHex = catalog.cases[0]?.hex || state.caseHex;
  }
  if (!catalog.caps.some((x) => x.name === state.capsName)) {
    state.capsName = catalog.caps[0]?.name || "Keycaps";
    state.capsHex = catalog.caps[0]?.hex || state.capsHex;
    state.accentHex = catalog.caps[0]?.accent || state.accentHex;
  }
  if (!catalog.switches.some((x) => x.name === state.sw)) state.sw = catalog.switches[0]?.name || "Lineare";
}

function boot() {
  const preview = document.getElementById("kb-preview");
  if (!preview) return;
  try {
    if (preview.dataset.bound === "1") {
      renderUI();
      return;
    }
    preview.dataset.bound = "1";
    document.addEventListener("click", onClick);
    document.getElementById("kb-form")?.addEventListener("submit", submitCfg);
    document.getElementById("kb-case-free")?.addEventListener("input", (e) => {
      state.caseHex = e.target.value;
      state.caseName = "Personalizzato";
      renderUI();
    });
    document.getElementById("kb-caps-free")?.addEventListener("input", (e) => {
      state.capsHex = e.target.value;
      state.capsName = "Personalizzato";
      renderUI();
    });
    document.getElementById("kb-accent-free")?.addEventListener("input", (e) => {
      state.accentHex = e.target.value;
      renderUI();
    });
    window.__grCleanups = window.__grCleanups || [];
    window.__grCleanups.push(() => document.removeEventListener("click", onClick));
    try {
      onAuthStateChanged(auth, (u) => {
        currentUser = isVerifiedUser(u) ? u : null;
        const em = document.getElementById("kb-email");
        const al = document.getElementById("kb-alias");
        if (em && currentUser?.email) { em.value = currentUser.email; em.readOnly = true; }
        if (al && currentUser?.displayName && !al.value) al.value = currentUser.displayName;
      });
    } catch (_) {}

    renderUI();

    try {
      onSnapshot(collection(db, "customBuilds"), (snap) => {
        builds = snap.docs.map((d) => d.data()).filter((b) => b.imageUrl);
        renderBuilds();
      }, () => { builds = []; renderBuilds(); });
    } catch (_) {}

    getDoc(doc(db, "siteContent", "customWizard")).then((s) => {
      if (s.exists()) applyWizard(s.data() || {});
      renderUI();
    }).catch(() => { renderUI(); });
  } catch (err) {
    console.error("custom-studio", err);
    preview.innerHTML = '<p style="color:#fff;text-align:center;padding:24px;">Anteprima non disponibile. Ricarica la pagina.</p>';
  }
}

window.addEventListener("gr:navigated", boot);
boot();
