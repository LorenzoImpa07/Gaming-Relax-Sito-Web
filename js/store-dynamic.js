// ==========================================================================
// Store dinamico — legge i prodotti da Firestore (aggiunti dalla Dashboard)
// e gestisce i Preferiti (salvati nel browser, sincronizzati online se loggati)
// ==========================================================================
import { db, auth, isVerifiedUser } from "./firebase-init.js?v=20260919ae";
import { collection, query, orderBy, doc, getDoc, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { validateRealEmailAsync } from "./email-check.js";

const CATEGORY_LABELS = {
  tastiere: "Tastiere Custom",
  tastiere_preassemblate: "Tastiere Preassemblate",
  keycaps: "Keycaps",
  accessori: "Accessori",
  servizi: "Servizi Tech"
};

const STORE_NAV_VERSION = 2;
const STORE_NAV_DEFAULTS = [
  { id: "tastiere", label: "Tastiere Custom", items: [], order: 1 },
  { id: "tastiere_preassemblate", label: "Tastiere Preassemblate", items: [], order: 2 },
  { id: "keycaps", label: "Keycaps", order: 3, items: [
    { id: "tattile", label: "Tattile" },
    { id: "lineare", label: "Lineare" },
    { id: "interruttori_a_scatto", label: "Interruttori a scatto" }
  ]},
  { id: "accessori", label: "Accessori", order: 4, items: [
    { id: "lubrificante", label: "Lubrificante" },
    { id: "pinza_togli_keycaps", label: "Pinza togli keycaps" },
    { id: "pennello", label: "Pennello" }
  ]},
  { id: "servizi", label: "Servizi tech", order: 5, items: [
    { id: "riparazioni_elettroniche", label: "Riparazioni elettroniche" },
    { id: "consulenze_pc", label: "Consulenze per componenti di PC" },
    { id: "assemblaggio_pc", label: "Assemblaggio di PC" },
    { id: "creazione_siti_web", label: "Creazione siti web" }
  ]}
];

function migrateStoreNav(groups) {
  if (!Array.isArray(groups) || !groups.length) return STORE_NAV_DEFAULTS.slice();
  const next = groups.map((g) => ({ ...g, items: Array.isArray(g.items) ? g.items.slice() : [] }));
  const keycaps = next.find((g) => g.id === "keycaps");
  const servizi = next.find((g) => g.id === "servizi");
  const oldServizi = new Set(["tattile", "lineare", "interruttori_a_scatto"]);
  const serviziIsOld = servizi && (servizi.items || []).some((i) => oldServizi.has(i.id));
  if (keycaps && servizi && serviziIsOld) {
    keycaps.items = (servizi.items || []).slice();
    servizi.items = STORE_NAV_DEFAULTS.find((g) => g.id === "servizi").items.slice();
  }
  return next;
}

let storeNavGroups = STORE_NAV_DEFAULTS.slice();
let activeFilter = { type: "tutti", cat: "", sub: "" };

const WISHLIST_KEY = "gr_wishlist";

function productFlags(p) {
  const quote = !!p.onQuote || /preventivo|su richiesta/i.test(String(p.price || ""));
  const handmade = !!p.handmade || p.category === "tastiere";
  const custom = handmade || quote || p.category === "tastiere" || p.category === "servizi";
  const lead = String(p.leadTime || "").trim() || (custom ? "Su misura 2–4 settimane" : "3–5 giorni lavorativi");
  return { quote, handmade, lead };
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// ==========================================================================
// Preferiti — Set in memoria, salvato su localStorage e (se loggati) Firestore
// ==========================================================================
let wishlist = new Set(readLocalWishlist());
let currentUser = null;

function readLocalWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalWishlist() {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify([...wishlist]));
}

async function saveRemoteWishlist() {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, "wishlists", currentUser.uid), { productIds: [...wishlist] });
  } catch {
    // se le regole non sono pronte o c'è un errore di rete, i preferiti restano comunque salvati in locale
  }
}

async function mergeRemoteWishlistOnLogin(user) {
  try {
    const snap = await getDoc(doc(db, "wishlists", user.uid));
    const remoteIds = snap.exists() ? (snap.data().productIds || []) : [];
    remoteIds.forEach((id) => wishlist.add(id));
    saveLocalWishlist();
    await saveRemoteWishlist();
    renderProducts(currentProducts);
  } catch {
    // nessun problema: si continua a lavorare con i preferiti salvati in locale
  }
}

onAuthStateChanged(auth, (user) => {
  currentUser = isVerifiedUser(user) ? user : null;
  if (user) mergeRemoteWishlistOnLogin(user);
});

function toggleWishlist(productId) {
  if (wishlist.has(productId)) {
    wishlist.delete(productId);
  } else {
    wishlist.add(productId);
  }
  saveLocalWishlist();
  saveRemoteWishlist();
}

// ==========================================================================
// Rendering prodotti
// ==========================================================================
function parseStorePrice(str) {
  if (!str) return null;
  if (/preventivo|su richiesta|n\/a/i.test(str)) return null;
  const n = parseFloat(String(str).replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatEuro(n) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function withEuro(str) {
  const t = String(str || "").trim();
  if (!t) return t;
  if (/preventivo|richiesta|n\/a|gratis|free/i.test(t)) return t;
  if (!/\d/.test(t)) return t;
  if (/€/.test(t)) return t;
  return t + " €";
}

function saleInfo(p) {
  const listNum = parseStorePrice(p.price);
  if (!p.onSale) return { onSale: false, listStr: p.price || "", saleStr: p.price || "", saleNum: listNum };
  let saleNum = parseStorePrice(p.salePrice);
  const pct = Number(p.salePercent) || 0;
  if (saleNum == null && listNum != null && pct > 0 && pct < 100) {
    saleNum = Math.round(listNum * (1 - pct / 100) * 100) / 100;
  }
  if (saleNum == null) return { onSale: false, listStr: p.price || "", saleStr: p.price || "", saleNum: listNum };
  return {
    onSale: true,
    listStr: p.price || (listNum != null ? formatEuro(listNum) : ""),
    saleStr: p.salePrice || formatEuro(saleNum),
    saleNum,
    percent: pct
  };
}

function isRecent(createdAt) {
  if (!createdAt || typeof createdAt.toDate !== "function") return false;
  const days = (Date.now() - createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24);
  return days <= 14;
}

function renderProducts(products) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-dim);">Nessun prodotto disponibile al momento. Torna presto!</p>';
    return;
  }

  const type = activeFilter.type;
  const cat = activeFilter.cat;
  const sub = activeFilter.sub;
  const wantIn = document.getElementById("flt-in")?.checked !== false;
  const wantOut = document.getElementById("flt-out")?.checked !== false;
  const maxPrice = Number(document.getElementById("flt-price")?.value || 99999);
  const priceLab = document.getElementById("price-max-lab");
  if (priceLab && document.getElementById("flt-price")) priceLab.textContent = "€ " + document.getElementById("flt-price").value;
  const cntIn = document.getElementById("cnt-in");
  const cntOut = document.getElementById("cnt-out");
  if (cntIn) cntIn.textContent = String(products.filter((p) => p.inStock !== false).length);
  if (cntOut) cntOut.textContent = String(products.filter((p) => p.inStock === false).length);

  grid.innerHTML = products.map((p) => {
    const isFav = wishlist.has(p.id);
    const hiddenByCategory = type === "cat" ? p.category !== cat
      : type === "sub" ? (p.category !== cat || (p.subcategory || "") !== sub)
      : false;
    const hiddenByWishlist = type === "preferiti" && !isFav;
    const hiddenBySale = type === "offerte" && !p.onSale;
    const hiddenByStock = p.inStock === false ? !wantOut : !wantIn;
    const sale = saleInfo(p);
    const flags = productFlags(p);
    const priceN = sale.saleNum;
    const hiddenByPrice = priceN != null && priceN > maxPrice;
    return `
    <div class="product-card" data-product-id="${p.id}" data-product-category="${p.category}" style="${hiddenByCategory || hiddenByWishlist || hiddenBySale || hiddenByStock || hiddenByPrice ? "display:none;" : ""}">
      ${sale.onSale ? '<span class="badge-sale">In offerta</span>' : ""}
      ${isRecent(p.createdAt) ? '<span class="badge-new">Novità</span>' : ""}
      ${p.inStock === false ? '<span class="badge-oos">Esaurito</span>' : ""}
      <a href="prodotto.html?id=${p.id}" class="product-card__hit">
        <div class="product-card__brand">
          <img src="images/logo.png" alt="Gaming Relax">
          <div class="product-card__brand-text">
            <strong>GAMING RELAX</strong>
            <span>Custom Keyboards & Digital Craftsmanship</span>
          </div>
          <span class="product-card__accent" aria-hidden="true"></span>
        </div>
        <div class="product-card__body">
          <span class="product-card__cat">${escapeHtml((storeNavGroups.find((x) => x.id === p.category)?.label) || CATEGORY_LABELS[p.category] || p.category || "")}</span>
          <h3>${escapeHtml(p.name)}</h3>
          ${p.description ? `<p class="product-card__desc">${escapeHtml(p.description)}</p>` : ""}
          <div class="product-flags">
            ${flags.handmade ? '<span class="flag-chip">Fatto a mano</span>' : ""}
            ${flags.quote ? '<span class="flag-chip flag-chip--quote">Su preventivo</span>' : ""}
            <span class="flag-chip flag-chip--ship">${escapeHtml(flags.lead)}</span>
          </div>
        </div>
      </a>
      <div class="product-card__footer">
        <button class="wish-btn ${isFav ? "active" : ""}" data-product-id="${p.id}" aria-label="${isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}">${isFav ? "♥" : "♡"}</button>
        ${sale.onSale
          ? `<span class="product-card__price is-sale"><s class="price-old">${escapeHtml(withEuro(sale.listStr))}</s><strong class="price-now">${escapeHtml(withEuro(sale.saleStr))}</strong></span>`
          : `<span class="product-card__price">${escapeHtml(withEuro(p.price))}</span>`
        }
        ${p.inStock === false
          ? `<button type="button" class="btn btn--outline btn-notify" data-id="${p.id}" data-name="${escapeHtml(p.name)}">Avvisami</button>`
          : `<a href="prodotto.html?id=${p.id}" class="btn btn--lime product-card__cta">Vedi prodotto</a>`
        }
      </div>
      <div class="notify-form" id="notify-form-${p.id}" style="display:none;"></div>
    </div>`;
  }).join("");

  grid.querySelectorAll(".wish-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleWishlist(btn.dataset.productId);
      renderProducts(currentProducts);
    });
  });

  grid.querySelectorAll(".btn-add-cart").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = currentProducts.find((x) => x.id === btn.dataset.id);
      if (p && window.GRCart) {
        const s = saleInfo(p);
        window.GRCart.add({ id: p.id, name: p.name, price: s.saleStr, imageUrl: p.imageUrl, paymentLink: p.paymentLink });
      }
    });
  });

  grid.querySelectorAll(".btn-notify").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wrap = document.getElementById(`notify-form-${btn.dataset.id}`);
      if (!wrap || wrap.dataset.sent === "true") return;
      wrap.style.display = "block";
      btn.style.display = "none";
      wrap.innerHTML = `
        <div style="display:flex;gap:8px;margin-top:10px;">
          <input type="email" placeholder="La tua email" class="notify-email" style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:8px 12px;font-size:13px;">
          <button type="button" class="btn btn--lime notify-send" style="padding:8px 16px;font-size:13px;">Invia</button>
        </div>
        <p class="notify-status" style="font-size:12px;margin-top:6px;display:none;"></p>`;

      wrap.querySelector(".notify-send").addEventListener("click", async () => {
        const emailInput = wrap.querySelector(".notify-email");
        const statusEl = wrap.querySelector(".notify-status");
        const email = emailInput.value.trim();
        const emailErr = await validateRealEmailAsync(email);
        if (emailErr) {
          statusEl.textContent = emailErr;
          statusEl.style.color = "#ff8080";
          statusEl.style.display = "block";
          return;
        }
        if (!currentUser) {
          statusEl.innerHTML = 'Accedi con un\'email confermata per essere avvisato. <a href="login.html">Accedi</a>';
          statusEl.style.color = "#ff8080";
          statusEl.style.display = "block";
          return;
        }
        try {
          await addDoc(collection(db, "restockRequests"), {
            productId: btn.dataset.id,
            productName: btn.dataset.name,
            email,
            notified: false,
            createdAt: serverTimestamp()
          });
          wrap.dataset.sent = "true";
          wrap.innerHTML = '<p style="font-size:13px;color:var(--lime);margin-top:10px;">✓ Fatto! Ti avviseremo appena torna disponibile.</p>';
        } catch {
          statusEl.textContent = "Errore nell'invio. Riprova più tardi.";
          statusEl.style.color = "#ff8080";
          statusEl.style.display = "block";
        }
      });
    });
  });

  updateWishlistCount();
}

function categoryLabel(p) {
  const g = storeNavGroups.find((x) => x.id === p.category);
  const parent = g?.label || CATEGORY_LABELS[p.category] || p.category || "";
  const sub = (g?.items || []).find((i) => i.id === p.subcategory);
  return sub ? `${parent} · ${sub.label}` : parent;
}

function setActiveFilter(next) {
  activeFilter = next;
  renderStoreFilters();
  renderProducts(currentProducts);
}

function renderStoreFilters() {
  const row = document.getElementById("store-filters");
  if (!row) return;
  const groups = storeNavGroups.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const parts = [];
  const sysActive = (t) => activeFilter.type === t ? " active" : "";
  parts.push(`<button type="button" class="filter-pill${sysActive("tutti")}" data-store-filter="tutti">Tutti</button>`);
  groups.forEach((g) => {
    const items = Array.isArray(g.items) ? g.items : [];
    if (!items.length) {
      const on = activeFilter.type === "cat" && activeFilter.cat === g.id;
      parts.push(`<button type="button" class="filter-pill${on ? " active" : ""}" data-store-cat="${escapeHtml(g.id)}">${escapeHtml(g.label)}</button>`);
      return;
    }
    const openCat = activeFilter.cat === g.id && (activeFilter.type === "cat" || activeFilter.type === "sub");
    const menu = [`<button type="button" class="filter-dd__item${activeFilter.type === "cat" && activeFilter.cat === g.id ? " active" : ""}" data-store-cat="${escapeHtml(g.id)}">Tutti — ${escapeHtml(g.label)}</button>`]
      .concat(items.map((i) => `<button type="button" class="filter-dd__item${activeFilter.type === "sub" && activeFilter.sub === i.id && activeFilter.cat === g.id ? " active" : ""}" data-store-cat="${escapeHtml(g.id)}" data-store-sub="${escapeHtml(i.id)}">${escapeHtml(i.label)}</button>`))
      .join("");
    parts.push(`<div class="filter-dd${openCat ? " is-on" : ""}" data-dd="${escapeHtml(g.id)}">
      <button type="button" class="filter-pill${openCat ? " active" : ""}" data-dd-toggle="${escapeHtml(g.id)}">${escapeHtml(g.label)} <span class="filter-chevron">▾</span></button>
      <div class="filter-dd__menu">${menu}</div>
    </div>`);
  });
  parts.push(`<button type="button" class="filter-pill${sysActive("offerte")}" data-store-filter="offerte">In offerta</button>`);
  parts.push(`<button type="button" class="filter-pill${sysActive("preferiti")}" data-store-filter="preferiti">♥ Preferiti<span class="count"></span></button>`);
  row.innerHTML = parts.join("");
  updateWishlistCount();

  row.querySelectorAll("[data-store-filter]").forEach((btn) => {
    btn.addEventListener("click", () => setActiveFilter({ type: btn.dataset.storeFilter, cat: "", sub: "" }));
  });
  row.querySelectorAll("[data-dd-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const wrap = btn.closest(".filter-dd");
      const open = wrap.classList.contains("open");
      row.querySelectorAll(".filter-dd").forEach((d) => d.classList.remove("open"));
      if (!open) wrap.classList.add("open");
    });
  });
  row.querySelectorAll(".filter-dd__item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const cat = btn.dataset.storeCat || "";
      const sub = btn.dataset.storeSub || "";
      setActiveFilter({ type: sub ? "sub" : "cat", cat, sub });
    });
  });
  row.querySelectorAll("[data-store-cat]:not(.filter-dd__item)").forEach((btn) => {
    btn.addEventListener("click", () => setActiveFilter({ type: "cat", cat: btn.dataset.storeCat, sub: "" }));
  });
}

document.addEventListener("click", () => {
  document.querySelectorAll(".filter-dd.open").forEach((d) => d.classList.remove("open"));
});

function updateWishlistCount() {
  const pill = document.querySelector('[data-store-filter="preferiti"] .count');
  if (pill) pill.textContent = wishlist.size ? ` (${wishlist.size})` : "";
}

let currentProducts = [];

const colRef = collection(db, "products");
onSnapshot(doc(db, "siteContent", "storeNav"), (snap) => {
  const data = snap.exists() ? snap.data() : {};
  const groups = Array.isArray(data.groups) && data.groups.length ? data.groups : STORE_NAV_DEFAULTS;
  storeNavGroups = (data.version || 0) >= STORE_NAV_VERSION ? groups : migrateStoreNav(groups);
  renderStoreFilters();
  renderProducts(currentProducts);
});
onSnapshot(query(colRef, orderBy("createdAt", "desc")), (snap) => {
  currentProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const prices = currentProducts.map((p) => parseStorePrice(p.price)).filter((n) => n != null);
  const slider = document.getElementById("flt-price");
  if (slider && prices.length) {
    const max = Math.ceil(Math.max(...prices));
    const prev = Number(slider.dataset.ready ? slider.value : max);
    slider.min = 0;
    slider.max = max;
    if (!slider.dataset.ready) { slider.value = max; slider.dataset.ready = "1"; }
    else slider.value = Math.min(prev, max);
    const lab = document.getElementById("price-max-lab");
    if (lab) lab.textContent = "€ " + slider.value;
    const minl = document.getElementById("price-min-lab");
    if (minl) minl.textContent = "€ 0";
  }
  renderProducts(currentProducts);
}, () => {
  // Se le regole non sono ancora pronte o c'è un errore, mostra un messaggio invece di una pagina vuota
  const grid = document.getElementById("product-grid");
  if (grid) grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-dim);">Impossibile caricare i prodotti al momento.</p>';
});

renderStoreFilters();
["flt-in","flt-out","flt-price"].forEach((id) => {
  document.getElementById(id)?.addEventListener("input", () => renderProducts(currentProducts));
  document.getElementById(id)?.addEventListener("change", () => renderProducts(currentProducts));
});
