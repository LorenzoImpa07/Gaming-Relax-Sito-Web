import { db, auth, isVerifiedUser } from "./firebase-init.js?v=20260920n";
import { collection, addDoc, doc, getDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { validateRealEmailAsync } from "./email-check.js";

const DEFAULTS = {
  packages: [
    { name: "Essential", fromPrice: 89, time: "7–10 giorni", hot: false, features: "Lube switch\nStabilizzatori tuned\nTest base", imageUrl: "" },
    { name: "Pro", fromPrice: 149, time: "10–14 giorni", hot: true, features: "Tutto Essential\nFoam case + tape mod\nTest audio\nRegolazione plate", imageUrl: "" },
    { name: "Signature", fromPrice: 249, time: "2–4 settimane", hot: false, features: "Full custom\nArt / keycaps\nLayout su misura\nVideo unboxing", imageUrl: "" }
  ],
  wizard: {
    services: "Tastiera custom\nArt / keycaps\nAssemblaggio PC\nSito web\nConsulenza",
    layouts: "60%\n65%\n75%\nTKL\nFull size\nNon applicabile",
    switches: "Lineare\nTattile\nClicky\nDa consigliare",
    extras: "Lube switch\nStabilizzatori\nFoam\nTape mod\nRGB\nKeycaps custom"
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
let wizard = { ...DEFAULTS.wizard };
let currentUser = null;
const state = { step: 1, service: "", layout: "", sw: "", extras: [], pack: "", note: "" };

onAuthStateChanged(auth, (u) => {
  currentUser = isVerifiedUser(u) ? u : null;
  const em = document.getElementById("cfg-email");
  if (em && currentUser?.email) { em.value = currentUser.email; em.readOnly = true; }
});

function renderPackages() {
  const el = document.getElementById("custom-packs");
  if (!el) return;
  const list = packages.length ? packages : DEFAULTS.packages;
  el.innerHTML = list.map((p, i) => `
    <article class="cpack ${p.hot ? "is-hot" : ""}">
      ${p.hot ? '<span class="cpack-badge">Consigliato</span>' : ""}
      ${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="">` : ""}
      <h3>${esc(p.name)}</h3>
      <p class="cpack-price">da ${euro(p.fromPrice)}</p>
      <p class="cpack-time">${esc(p.time || "")}</p>
      <ul>${lines(p.features).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <button type="button" class="btn btn--lime" data-pack="${esc(p.name)}" data-i="${i}">Configura questo</button>
    </article>`).join("");
  el.querySelectorAll("[data-pack]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.pack = btn.dataset.pack;
      state.step = 1;
      renderWizard();
      document.getElementById("custom-cfg")?.scrollIntoView({ behavior: "smooth" });
    });
  });
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

function chips(id, items, multi) {
  const box = document.getElementById(id);
  if (!box) return;
  box.innerHTML = items.map((v) => {
    const on = multi ? state.extras.includes(v) : (id.includes("service") ? state.service === v : id.includes("layout") ? state.layout === v : state.sw === v);
    return `<button type="button" class="cfg-chip ${on ? "is-on" : ""}" data-v="${esc(v)}">${esc(v)}</button>`;
  }).join("");
  box.querySelectorAll(".cfg-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.v;
      if (multi) {
        state.extras = state.extras.includes(v) ? state.extras.filter((x) => x !== v) : state.extras.concat(v);
      } else if (id.includes("service")) state.service = v;
      else if (id.includes("layout")) state.layout = v;
      else state.sw = v;
      renderWizard();
    });
  });
}

function estimate() {
  const list = packages.length ? packages : DEFAULTS.packages;
  const p = list.find((x) => x.name === state.pack);
  let n = p ? Number(p.fromPrice) || 0 : 89;
  n += state.extras.length * 15;
  return n;
}

function renderWizard() {
  const total = 5;
  const bar = document.getElementById("cfg-progress");
  if (bar) bar.style.width = `${(state.step / total) * 100}%`;
  document.getElementById("cfg-step-label") && (document.getElementById("cfg-step-label").textContent = `Passo ${state.step} di ${total}`);
  document.querySelectorAll(".cfg-pane").forEach((p) => {
    p.hidden = Number(p.dataset.step) !== state.step;
  });
  chips("cfg-services", lines(wizard.services), false);
  chips("cfg-layouts", lines(wizard.layouts), false);
  chips("cfg-switches", lines(wizard.switches), false);
  chips("cfg-extras", lines(wizard.extras), true);
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

function canNext() {
  if (state.step === 1) return !!state.service;
  if (state.step === 2) return !!state.layout;
  if (state.step === 3) return !!state.sw;
  return true;
}

async function submitCfg() {
  const status = document.getElementById("cfg-status");
  const alias = (document.getElementById("cfg-alias")?.value || "").trim();
  const email = (document.getElementById("cfg-email")?.value || "").trim();
  const discord = (document.getElementById("cfg-discord")?.value || "").trim();
  const note = (document.getElementById("cfg-note")?.value || "").trim();
  if (!alias) { status.textContent = "Inserisci un nome."; status.className = "form-status visible"; return; }
  const emailErr = await validateRealEmailAsync(email);
  if (emailErr) { status.textContent = emailErr; status.className = "form-status visible"; return; }
  if (!currentUser) {
    status.innerHTML = 'Per inviare accedi con un\'email confermata. <a href="login.html">Accedi</a>';
    status.className = "form-status visible";
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
    status.textContent = "Richiesta inviata. Ti ricontattiamo noi.";
    status.className = "form-status visible";
    state.step = 1; state.service = ""; state.layout = ""; state.sw = ""; state.extras = []; state.pack = "";
    renderWizard();
  } catch (_) {
    status.textContent = "Invio non riuscito. Riprova o scrivici su Discord.";
    status.className = "form-status visible";
  }
}

function bootNav() {
  document.getElementById("cfg-next")?.addEventListener("click", () => {
    if (state.step < 5) {
      if (!canNext()) {
        const s = document.getElementById("cfg-status");
        if (s) { s.textContent = "Scegli un'opzione per continuare."; s.className = "form-status visible"; }
        return;
      }
      const s = document.getElementById("cfg-status");
      if (s) s.className = "form-status";
      state.step += 1;
      renderWizard();
    } else submitCfg();
  });
  document.getElementById("cfg-back")?.addEventListener("click", () => {
    if (state.step > 1) { state.step -= 1; renderWizard(); }
  });
}

onSnapshot(collection(db, "customPackages"), (snap) => {
  packages = snap.docs.map((d) => d.data()).sort((a, b) => (a.order || 99) - (b.order || 99));
  renderPackages();
}, () => { packages = []; renderPackages(); });

onSnapshot(query(collection(db, "customBuilds"), orderBy("createdAt", "desc")), (snap) => {
  builds = snap.docs.map((d) => d.data()).filter((b) => b.imageUrl);
  renderBuilds();
}, () => { builds = []; renderBuilds(); });

getDoc(doc(db, "siteContent", "customWizard")).then((s) => {
  if (s.exists()) wizard = { ...DEFAULTS.wizard, ...s.data() };
  renderWizard();
}).catch(() => renderWizard());

renderPackages();
renderWizard();
bootNav();
