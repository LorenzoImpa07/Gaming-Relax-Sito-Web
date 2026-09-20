import { db, auth, isVerifiedUser } from "./firebase-init.js";
import { collection, addDoc, doc, getDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { validateRealEmailAsync } from "./email-check.js";

const DEFAULTS = {
  packages: [
    { name: "Essential", fromPrice: 89, time: "7–10 giorni", hot: false, features: "Lube switch\nStabilizzatori tuned\nTest base" },
    { name: "Pro", fromPrice: 149, time: "10–14 giorni", hot: true, features: "Tutto Essential\nFoam case + tape mod\nTest audio\nRegolazione plate" },
    { name: "Signature", fromPrice: 249, time: "2–4 settimane", hot: false, features: "Full custom\nArt / keycaps\nLayout su misura\nVideo unboxing" }
  ],
  wizard: {
    services: ["Tastiera custom", "Art / keycaps", "Assemblaggio PC", "Sito web", "Consulenza"],
    layouts: ["60%", "65%", "75%", "TKL", "Full size", "Non applicabile"],
    switches: ["Lineare", "Tattile", "Clicky", "Da consigliare"],
    extras: ["Lube switch", "Stabilizzatori", "Foam", "Tape mod", "RGB", "Keycaps custom"]
  }
};

function lines(s) {
  return String(s || "").split("\n").map((x) => x.trim()).filter(Boolean);
}
function euro(n) {
  return (Number(n) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (m) => ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" }[m]));
}

let packages = [];
let builds = [];
let wizard = {
  services: DEFAULTS.wizard.services.slice(),
  layouts: DEFAULTS.wizard.layouts.slice(),
  switches: DEFAULTS.wizard.switches.slice(),
  extras: DEFAULTS.wizard.extras.slice()
};
let currentUser = null;
const state = { step: 1, service: "", layout: "", sw: "", extras: [], pack: "" };

function parseList(raw, fallback) {
  const arr = lines(raw);
  return arr.length ? arr : fallback.slice();
}

function renderPackages() {
  const el = document.getElementById("custom-packs");
  if (!el) return;
  const list = packages.length ? packages : DEFAULTS.packages;
  el.innerHTML = list.map((p) => `
    <article class="cpack ${p.hot ? "is-hot" : ""}">
      ${p.hot ? '<span class="cpack-badge">Consigliato</span>' : ""}
      ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="">` : ""}
      <h3>${esc(p.name)}</h3>
      <p class="cpack-price">da ${euro(p.fromPrice)}</p>
      <p class="cpack-time">${esc(p.time || "")}</p>
      <ul>${lines(p.features).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <button type="button" class="btn btn--lime js-cfg-pack" data-pack="${esc(p.name)}">Configura questo</button>
    </article>`).join("");
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

function paintChips(boxId, items, selected, multi) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.innerHTML = (items || []).map((v) => {
    const on = multi ? selected.includes(v) : selected === v;
    return `<button type="button" class="cfg-chip ${on ? "is-on" : ""}" data-chip="${esc(v)}">${esc(v)}</button>`;
  }).join("");
}

function estimate() {
  const list = packages.length ? packages : DEFAULTS.packages;
  const p = list.find((x) => x.name === state.pack);
  return (p ? Number(p.fromPrice) || 0 : 89) + state.extras.length * 15;
}

function renderWizard() {
  const total = 5;
  const bar = document.getElementById("cfg-progress");
  if (bar) bar.style.width = `${(state.step / total) * 100}%`;
  const lab = document.getElementById("cfg-step-label");
  if (lab) lab.textContent = `Passo ${state.step} di ${total}`;
  document.querySelectorAll(".cfg-pane").forEach((p) => {
    p.hidden = Number(p.dataset.step) !== state.step;
  });
  paintChips("cfg-services", wizard.services, state.service, false);
  paintChips("cfg-layouts", wizard.layouts, state.layout, false);
  paintChips("cfg-switches", wizard.switches, state.sw, false);
  paintChips("cfg-extras", wizard.extras, state.extras, true);
  const packEl = document.getElementById("cfg-pack-hint");
  if (packEl) packEl.textContent = state.pack ? ("Pacchetto: " + state.pack) : "";
  const sum = document.getElementById("cfg-summary");
  if (sum) {
    sum.innerHTML = `
      <li><span>Pacchetto</span><strong>${esc(state.pack || "—")}</strong></li>
      <li><span>Servizio</span><strong>${esc(state.service || "—")}</strong></li>
      <li><span>Layout</span><strong>${esc(state.layout || "—")}</strong></li>
      <li><span>Switch</span><strong>${esc(state.sw || "—")}</strong></li>
      <li><span>Extra</span><strong>${esc(state.extras.join(", ") || "—")}</strong></li>
      <li><span>Stima</span><strong>${euro(estimate())}</strong></li>`;
  }
  const back = document.getElementById("cfg-back");
  if (back) back.hidden = state.step === 1;
  const next = document.getElementById("cfg-next");
  if (next) next.textContent = state.step === 5 ? "Invia richiesta" : "Avanti";
}

function setStatus(msg, html) {
  const s = document.getElementById("cfg-status");
  if (!s) return;
  s.className = msg ? "form-status visible" : "form-status";
  if (html) s.innerHTML = msg;
  else s.textContent = msg || "";
}

function canNext() {
  if (state.step === 1) return !!state.service;
  if (state.step === 2) return !!state.layout;
  if (state.step === 3) return !!state.sw;
  return true;
}

async function submitCfg() {
  const alias = (document.getElementById("cfg-alias")?.value || "").trim();
  const email = (document.getElementById("cfg-email")?.value || "").trim();
  const discord = (document.getElementById("cfg-discord")?.value || "").trim();
  const note = (document.getElementById("cfg-note")?.value || "").trim();
  if (!alias) { setStatus("Inserisci un nome."); return; }
  const emailErr = await validateRealEmailAsync(email);
  if (emailErr) { setStatus(emailErr); return; }
  if (!currentUser) {
    setStatus('Per inviare accedi con un\'email confermata. <a href="login.html">Accedi</a>', true);
    return;
  }
  const progetto = [
    "[Configuratore Custom]",
    state.pack ? "Pacchetto: " + state.pack : "",
    "Servizio: " + (state.service || "—"),
    "Layout: " + (state.layout || "—"),
    "Switch: " + (state.sw || "—"),
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
      status: "nuova",
      createdAt: serverTimestamp()
    });
    setStatus("Richiesta inviata. Ti ricontattiamo noi.");
    state.step = 1; state.service = ""; state.layout = ""; state.sw = ""; state.extras = []; state.pack = "";
    renderWizard();
  } catch (_) {
    setStatus("Invio non riuscito. Riprova o scrivici su Discord.");
  }
}

function onClick(e) {
  const packBtn = e.target.closest(".js-cfg-pack");
  if (packBtn) {
    state.pack = packBtn.dataset.pack || "";
    state.step = 1;
    renderWizard();
    document.getElementById("custom-cfg")?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  const chip = e.target.closest(".cfg-chip");
  if (chip) {
    const v = chip.dataset.chip || chip.textContent.trim();
    const box = chip.parentElement?.id || "";
    if (box === "cfg-services") state.service = v;
    else if (box === "cfg-layouts") state.layout = v;
    else if (box === "cfg-switches") state.sw = v;
    else if (box === "cfg-extras") {
      state.extras = state.extras.includes(v) ? state.extras.filter((x) => x !== v) : state.extras.concat(v);
    }
    renderWizard();
    return;
  }
  if (e.target.closest("#cfg-next")) {
    if (state.step < 5) {
      if (!canNext()) { setStatus("Scegli un'opzione per continuare."); return; }
      setStatus("");
      state.step += 1;
      renderWizard();
    } else submitCfg();
    return;
  }
  if (e.target.closest("#cfg-back")) {
    if (state.step > 1) { state.step -= 1; renderWizard(); }
  }
}

function boot() {
  if (!document.getElementById("custom-packs")) return;
  if (document.documentElement.dataset.cfgBound === "1") {
    renderPackages();
    renderWizard();
    return;
  }
  document.documentElement.dataset.cfgBound = "1";
  document.addEventListener("click", onClick);
  try {
    onAuthStateChanged(auth, (u) => {
      currentUser = isVerifiedUser(u) ? u : null;
      const em = document.getElementById("cfg-email");
      if (em && currentUser?.email) { em.value = currentUser.email; em.readOnly = true; }
    });
  } catch (_) {}

  renderPackages();
  renderWizard();

  try {
    onSnapshot(collection(db, "customPackages"), (snap) => {
      packages = snap.docs.map((d) => d.data()).sort((a, b) => (a.order || 99) - (b.order || 99));
      renderPackages();
    }, () => { packages = []; renderPackages(); });
  } catch (_) { renderPackages(); }

  try {
    onSnapshot(collection(db, "customBuilds"), (snap) => {
      builds = snap.docs.map((d) => d.data()).filter((b) => b.imageUrl);
      renderBuilds();
    }, () => { builds = []; renderBuilds(); });
  } catch (_) {}

  getDoc(doc(db, "siteContent", "customWizard")).then((s) => {
    if (!s.exists()) return;
    const d = s.data() || {};
    wizard.services = parseList(d.services, DEFAULTS.wizard.services);
    wizard.layouts = parseList(d.layouts, DEFAULTS.wizard.layouts);
    wizard.switches = parseList(d.switches, DEFAULTS.wizard.switches);
    wizard.extras = parseList(d.extras, DEFAULTS.wizard.extras);
    renderWizard();
  }).catch(() => {});
}

boot();
