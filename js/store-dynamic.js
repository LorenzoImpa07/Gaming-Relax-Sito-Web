// ==========================================================================
// Store dinamico — legge i prodotti da Firestore (aggiunti dalla Dashboard)
// e gestisce i Preferiti (salvati nel browser, sincronizzati online se loggati)
// ==========================================================================
import { db, auth } from "./firebase-init.js";
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const CATEGORY_LABELS = {
  tastiere: "Tastiere Custom",
  tastiere_preassemblate: "Tastiere Preassemblate",
  keycaps: "Keycaps",
  accessori: "Accessori",
  servizi: "Servizi Tech"
};

const WISHLIST_KEY = "gr_wishlist";

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
  currentUser = user;
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

  const activeFilter = document.querySelector(".filter-pill.active")?.dataset.storeFilter || "tutti";
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
    const hiddenByCategory = activeFilter !== "tutti" && activeFilter !== "preferiti" && activeFilter !== "offerte" && activeFilter !== p.category;
    const hiddenByWishlist = activeFilter === "preferiti" && !isFav;
    const hiddenBySale = activeFilter === "offerte" && !p.onSale;
    const hiddenByStock = p.inStock === false ? !wantOut : !wantIn;
    const sale = saleInfo(p);
    const priceN = sale.saleNum;
    const hiddenByPrice = priceN != null && priceN > maxPrice;
    return `
    <div class="product-card" data-product-id="${p.id}" data-product-category="${p.category}" style="${hiddenByCategory || hiddenByWishlist || hiddenBySale || hiddenByStock || hiddenByPrice ? "display:none;" : ""}">
      <a href="prodotto.html?id=${p.id}" class="product-card__img" style="background:${p.imageUrl ? `url('${escapeHtml(p.imageUrl)}') center/cover` : "linear-gradient(135deg,#101522,#050608)"};display:block;">
        ${isRecent(p.createdAt) ? '<span class="badge-new">Novità</span>' : ""}
        ${sale.onSale ? '<span class="badge-sale">In offerta</span>' : ""}
        ${p.inStock === false ? '<span class="badge-oos">Esaurito</span>' : ""}
      </a>
      <div class="product-card__body">
        <div class="product-card__top">
          <div>
            <span class="product-card__cat">${escapeHtml(CATEGORY_LABELS[p.category] || p.category)}</span>
            <h3><a href="prodotto.html?id=${p.id}" style="color:inherit;">${escapeHtml(p.name)}</a></h3>
          </div>
          <button class="wish-btn ${isFav ? "active" : ""}" data-product-id="${p.id}" aria-label="${isFav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}">${isFav ? "♥" : "♡"}</button>
        </div>
        ${p.description ? `<p style="font-size:14px;">${escapeHtml(p.description)}</p>` : ""}
        <div class="product-card__footer">
          ${sale.onSale
            ? `<span class="product-card__price is-sale"><s class="price-old">${escapeHtml(withEuro(sale.listStr))}</s><strong class="price-now">${escapeHtml(withEuro(sale.saleStr))}</strong></span>`
            : `<span class="product-card__price">${escapeHtml(withEuro(p.price))}</span>`
          }
          ${p.inStock === false
            ? `<button type="button" class="btn btn--outline btn-notify" data-id="${p.id}" data-name="${escapeHtml(p.name)}" style="padding:10px 18px;font-size:13px;">Avvisami 🔔</button>`
            : `<a href="prodotto.html?id=${p.id}" class="btn btn--lime" style="padding:10px 18px;font-size:13px;">Vedi prodotto</a>`
          }
        </div>
        <div class="notify-form" id="notify-form-${p.id}" style="display:none;"></div>
      </div>
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
        if (!email || !email.includes("@")) {
          statusEl.textContent = "Inserisci un'email valida.";
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

function updateWishlistCount() {
  const pill = document.querySelector('[data-store-filter="preferiti"] .count');
  if (pill) pill.textContent = wishlist.size ? ` (${wishlist.size})` : "";
}

let currentProducts = [];

const colRef = collection(db, "products");
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

// Filtri categoria + Preferiti — ricollegati ad ogni click, ricalcolano la visibilità sui prodotti già caricati
document.querySelectorAll("[data-store-filter]").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll("[data-store-filter]").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    renderProducts(currentProducts);
  });
});
["flt-in","flt-out","flt-price"].forEach((id) => {
  document.getElementById(id)?.addEventListener("input", () => renderProducts(currentProducts));
  document.getElementById(id)?.addEventListener("change", () => renderProducts(currentProducts));
});
