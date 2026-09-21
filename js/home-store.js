import { db } from "./firebase-init.js";
import { collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";

function escapeHtml(str = "") {
  const map = {
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
    "'": "&#39;"
  };
  return String(str).replace(/[&<>"']/g, (m) => map[m]);
}

function withEuro(str) {
  const t = String(str || "").trim();
  if (!t) return "";
  if (/preventivo|su richiesta|n\/a/i.test(t)) return t;
  if (/€/.test(t)) return t;
  return t + " €";
}

function saleInfo(p) {
  const listStr = String(p.price || "").trim();
  const saleStr = String(p.salePrice || "").trim();
  const onSale = !!p.onSale && !!saleStr;
  const num = (s) => {
    const n = parseFloat(String(s).replace(/[^\d,.-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  return { onSale, listStr, saleStr, saleNum: num(onSale ? saleStr : listStr) };
}

function createdMs(p) {
  return p.createdAt && typeof p.createdAt.toMillis === "function" ? p.createdAt.toMillis() : 0;
}

function renderHomeStore(products) {
  const grid = document.getElementById("home-store-grid");
  const section = document.getElementById("home-store");
  if (!grid) return;
  const inStock = products.filter((p) => p.inStock !== false && p.name);
  const pool = inStock.length ? inStock : products.filter((p) => p.name);
  const featured = pool.filter((p) => p.featured);
  const rest = pool.filter((p) => !p.featured);
  const pick = (featured.length ? featured.concat(rest) : rest).slice(0, 4);
  if (!pick.length) {
    if (section) section.style.display = "none";
    return;
  }
  if (section) section.style.display = "";
  grid.innerHTML = pick.map((p) => {
    const sale = saleInfo(p);
    const img = p.imageUrl || (String(p.galleryUrls || "").split(/\s+/).filter(Boolean)[0] || "");
    const price = sale.onSale
      ? `<span class="product-card__price is-sale"><s class="price-old">${escapeHtml(withEuro(sale.listStr))}</s><strong class="price-now">${escapeHtml(withEuro(sale.saleStr))}</strong></span>`
      : `<span class="product-card__price">${escapeHtml(withEuro(p.price))}</span>`;
    return `
    <a class="home-store-card is-photo" href="prodotto.html?id=${encodeURIComponent(p.id)}">
      <div class="home-store-card__img">${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.name || "")}" loading="lazy" decoding="async">` : ""}
        ${sale.onSale ? '<span class="badge-sale">In offerta</span>' : ""}
        <div class="home-store-card__body">
          <h3>${escapeHtml(p.name)}</h3>
          ${price}
          <span class="home-store-card__cta">Vedi prodotto →</span>
        </div>
      </div>
    </a>`;
  }).join("");
}

onSnapshot(collection(db, "products"), (snap) => {
  const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => createdMs(b) - createdMs(a));
  renderHomeStore(products);
}, () => {
  const section = document.getElementById("home-store");
  if (section) section.style.display = "none";
});
