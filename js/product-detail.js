// Pagina prodotto — galleria, varianti, quantita, descrizione, carrello
import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CATEGORY_LABELS = {
  tastiere: "Tastiere Custom",
  tastiere_preassemblate: "Tastiere Preassemblate",
  keycaps: "Keycaps",
  accessori: "Accessori",
  servizi: "Servizi Tech"
};
const WISH_KEY = "gr_wishlist";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => {
    if (m === "&") return "&" + "amp;";
    if (m === "<") return "&" + "lt;";
    if (m === ">") return "&" + "gt;";
    if (m === '"') return "&" + "quot;";
    return "&#39;";
  });
}

function formatDetails(text = "") {
  const raw = String(text).trim();
  if (!raw) return "";
  return raw.split(/\n\n+/).map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => l.startsWith("- ") || l.startsWith("* "))) {
      return "<ul>" + lines.map((l) => "<li>" + escapeHtml(l.replace(/^[-*] /, "")) + "</li>").join("") + "</ul>";
    }
    return "<p>" + escapeHtml(lines.join("\n")).replace(/\n/g, "<br>") + "</p>";
  }).join("");
}

function galleryList(p) {
  const extra = String(p.galleryUrls || "").split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  const all = [p.imageUrl, ...extra].filter(Boolean);
  return [...new Set(all)];
}

function parseStorePrice(str) {
  if (!str) return null;
  if (/preventivo|su richiesta|n\/a/i.test(str)) return null;
  const n = parseFloat(String(str).replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function formatEuro(n) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
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
  return { onSale: true, listStr: p.price || formatEuro(listNum), saleStr: p.salePrice || formatEuro(saleNum), saleNum, percent: pct };
}

function variantsOf(p) {
  return String(p.variantOptions || "").split(/,|\n/).map((s) => s.trim()).filter(Boolean);
}

function readWish() {
  try { return new Set(JSON.parse(localStorage.getItem(WISH_KEY) || "[]")); } catch { return new Set(); }
}
function writeWish(set) {
  localStorage.setItem(WISH_KEY, JSON.stringify([...set]));
}

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
const detailEl = document.getElementById("product-detail");

if (!productId) {
  detailEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Prodotto non specificato. <a href="store.html">Torna allo Store</a>.</p>';
} else {
  loadProduct();
}

async function loadProduct() {
  try {
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) {
      detailEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Prodotto non trovato. <a href="store.html">Torna allo Store</a>.</p>';
      return;
    }
    const p = snap.data();
    document.title = (p.name || "Prodotto") + " — Gaming Relax";
    const images = galleryList(p);
    const variants = variantsOf(p);
    const variantLabel = p.variantLabel || "Opzione";
    const cat = CATEGORY_LABELS[p.category] || p.category || "Store";
    const wish = readWish();
    const isFav = wish.has(snap.id);
    let paypal = "";
    try {
      const g = await getDoc(doc(db, "siteContent", "general"));
      if (g.exists()) paypal = g.data().paypalMeUrl || "";
    } catch (_) {}

    const thumbs = images.map((url, i) =>
      `<button type="button" class="pdp-thumb${i === 0 ? " is-on" : ""}" data-src="${escapeHtml(url)}" style="background-image:url('${escapeHtml(url)}')"></button>`
    ).join("");
    const mainBg = images[0] ? `url('${escapeHtml(images[0])}')` : "linear-gradient(135deg,#101522,#050608)";
    const variantBtns = variants.map((v, i) =>
      `<button type="button" class="pdp-opt${i === 0 ? " is-on" : ""}" data-variant="${escapeHtml(v)}">${escapeHtml(v)}</button>`
    ).join("");

    const sale = saleInfo(p);
    detailEl.innerHTML = `
      <nav class="pdp-crumb">
        <a href="index.html">Inizio</a> / <a href="store.html">Store</a> / <a href="store.html">${escapeHtml(cat)}</a>
      </nav>
      <div class="pdp">
        <div class="pdp-gallery">
          ${images.length > 1 ? `<div class="pdp-thumbs">${thumbs}</div>` : ""}
          <div class="pdp-main" id="pdp-main" style="background-image:${mainBg}">${sale.onSale ? '<span class="badge-sale">In offerta</span>' : ""}</div>
        </div>
        <div class="pdp-buy">
          ${p.brand ? `<p class="pdp-brand">${escapeHtml(p.brand)}</p>` : ""}
          <h1>${escapeHtml(p.name || "")}</h1>
          ${sale.onSale ? `<span class="pdp-sale-tag">In offerta${sale.percent ? " −" + sale.percent + "%" : ""}</span>` : ""}
          ${p.inStock === false ? '<p class="pdp-oos">Esaurito</p>' : ""}
          ${sale.onSale
            ? `<p class="pdp-price is-sale"><s class="price-old">${escapeHtml(sale.listStr)}</s><span class="price-now">${escapeHtml(sale.saleStr)}</span></p>`
            : `<p class="pdp-price">${escapeHtml(p.price || "")}</p>`
          }
          ${p.description ? `<p class="pdp-short">${escapeHtml(p.description)}</p>` : ""}
          ${variants.length ? `<div class="pdp-field"><span>${escapeHtml(variantLabel)}</span><div class="pdp-opts" id="pdp-opts">${variantBtns}</div></div>` : ""}
          <p class="pdp-ship">${escapeHtml(p.shippingNote || "Spedizione in Italia e UE")}</p>
          ${p.inStock === false ? "" : `
          <div class="pdp-field"><span>Quantita</span>
            <div class="cart-qty pdp-qty">
              <button type="button" id="pdp-minus">-</button>
              <span id="pdp-qty">1</span>
              <button type="button" id="pdp-plus">+</button>
            </div>
          </div>
          <button type="button" class="btn btn--lime pdp-btn" id="pd-add-cart">Aggiungi al carrello</button>
          <button type="button" class="btn btn--outline pdp-btn" id="pd-wish">${isFav ? "Rimuovi dai preferiti" : "Aggiungi alla lista dei desideri"}</button>
          ${paypal ? `<a class="btn cart-paypal pdp-btn" id="pd-paypal" href="${escapeHtml(paypal)}" target="_blank" rel="noopener">Paga con PayPal</a>` : ""}
          `}
        </div>
      </div>
      ${p.details ? `<article class="pdp-details"><h2>${escapeHtml(p.name || "Dettagli")}</h2>${formatDetails(p.details)}</article>` : (p.description ? `<article class="pdp-details"><h2>${escapeHtml(p.name || "Dettagli")}</h2><p>${escapeHtml(p.description)}</p></article>` : "")}
    `;

    let qty = 1;
    const qtyEl = document.getElementById("pdp-qty");
    document.getElementById("pdp-minus")?.addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      if (qtyEl) qtyEl.textContent = String(qty);
    });
    document.getElementById("pdp-plus")?.addEventListener("click", () => {
      qty += 1;
      if (qtyEl) qtyEl.textContent = String(qty);
    });

    document.querySelectorAll(".pdp-thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".pdp-thumb").forEach((b) => b.classList.remove("is-on"));
        btn.classList.add("is-on");
        const main = document.getElementById("pdp-main");
        if (main) main.style.backgroundImage = "url('" + btn.dataset.src + "')";
      });
    });
    document.querySelectorAll(".pdp-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".pdp-opt").forEach((b) => b.classList.remove("is-on"));
        btn.classList.add("is-on");
      });
    });

    document.getElementById("pd-add-cart")?.addEventListener("click", () => {
      const selected = document.querySelector(".pdp-opt.is-on")?.dataset.variant || "";
      window.GRCart?.add({
        id: snap.id,
        name: p.name,
        price: sale.saleStr,
        imageUrl: images[0] || p.imageUrl,
        paymentLink: p.paymentLink,
        variant: selected,
        qty
      });
    });

    document.getElementById("pd-wish")?.addEventListener("click", () => {
      const set = readWish();
      if (set.has(snap.id)) set.delete(snap.id); else set.add(snap.id);
      writeWish(set);
      const b = document.getElementById("pd-wish");
      if (b) b.textContent = set.has(snap.id) ? "Rimuovi dai preferiti" : "Aggiungi alla lista dei desideri";
    });
  } catch (err) {
    detailEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Impossibile caricare il prodotto al momento.</p>';
  }
}
