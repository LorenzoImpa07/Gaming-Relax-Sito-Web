// ==========================================================================
// Carrello — drawer, toast, badge animato, pagina carrello
// ==========================================================================
import { db, auth, isVerifiedUser } from "./firebase-init.js?v=20260920n";
import { doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const KEY = "gr_cart";
let currentUser = null;
let paypalMeUrl = "";
let drawerOpen = false;

onAuthStateChanged(auth, (u) => { currentUser = isVerifiedUser(u) ? u : null; });
onSnapshot(doc(db, "siteContent", "general"), (s) => {
  if (s.exists()) paypalMeUrl = s.data().paypalMeUrl || "";
});

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """)
    .replace(/'/g, "&#39;");
}

export function parsePrice(str) {
  if (!str) return null;
  if (/preventivo|su richiesta|n\/a/i.test(str)) return null;
  const n = parseFloat(String(str).replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatEuro(n) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function readCart() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function writeCart(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  render();
}

function cartKey(i) {
  return String(i.id) + "::" + String(i.variant || "");
}

function ensureToastHost() {
  let host = document.getElementById("gr-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "gr-toast-host";
    host.className = "gr-toast-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  return host;
}

function showToast(message, opts = {}) {
  const host = ensureToastHost();
  const el = document.createElement("div");
  el.className = "gr-toast" + (opts.error ? " gr-toast--err" : " gr-toast--ok");
  el.innerHTML =
    '<span class="gr-toast__ico">' + (opts.error ? "!" : "\u2713") + '</span>' +
    '<span class="gr-toast__msg">' + escapeHtml(message) + '</span>' +
    (opts.action ? '<button type="button" class="gr-toast__action">' + escapeHtml(opts.action) + '</button>' : '');
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-in"));
  const actionBtn = el.querySelector(".gr-toast__action");
  if (actionBtn && opts.onAction) {
    actionBtn.addEventListener("click", () => { opts.onAction(); dismiss(); });
  }
  function dismiss() {
    el.classList.remove("is-in");
    el.classList.add("is-out");
    setTimeout(() => el.remove(), 280);
  }
  setTimeout(dismiss, opts.duration || 3200);
}

function ensureDrawer() {
  if (document.getElementById("cart-drawer")) return;
  if (document.getElementById("cart-page")) return;

  const backdrop = document.createElement("div");
  backdrop.id = "cart-backdrop";
  backdrop.className = "cart-backdrop";
  backdrop.addEventListener("click", closeCart);

  const drawer = document.createElement("aside");
  drawer.id = "cart-drawer";
  drawer.className = "cart-drawer";
  drawer.setAttribute("aria-hidden", "true");
  drawer.innerHTML =
    '<div class="cart-drawer__head">' +
      '<h2>Carrello</h2>' +
      '<button type="button" class="cart-drawer__close" id="cart-drawer-close" aria-label="Chiudi">\u2715</button>' +
    '</div>' +
    '<div class="cart-drawer__body" id="cart-drawer-body"></div>' +
    '<div class="cart-drawer__foot" id="cart-drawer-foot"></div>';

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);
  document.getElementById("cart-drawer-close")?.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawerOpen) closeCart();
  });
}

export function openCart() {
  if (document.getElementById("cart-page")) {
    document.getElementById("cart-body")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  ensureDrawer();
  renderDrawer();
  document.getElementById("cart-backdrop")?.classList.add("open");
  const drawer = document.getElementById("cart-drawer");
  drawer?.classList.add("open");
  if (drawer) drawer.setAttribute("aria-hidden", "false");
  drawerOpen = true;
  document.body.classList.add("cart-drawer-open");
}

function closeCart() {
  document.getElementById("cart-backdrop")?.classList.remove("open");
  const drawer = document.getElementById("cart-drawer");
  drawer?.classList.remove("open");
  if (drawer) drawer.setAttribute("aria-hidden", "true");
  drawerOpen = false;
  document.body.classList.remove("cart-drawer-open");
}

export function addToCart(product) {
  if (!product?.id) return;
  const variant = (product.variant || "").trim();
  const addQty = Math.max(1, Number(product.qty) || 1);
  const items = readCart();
  const found = items.find((i) => cartKey(i) === cartKey({ id: product.id, variant }));
  const display = variant ? (product.name + " (" + variant + ")") : (product.name || "Prodotto");
  if (found) found.qty += addQty;
  else {
    items.push({
      id: product.id,
      name: display,
      variant,
      price: product.price || "",
      imageUrl: product.imageUrl || "",
      paymentLink: product.paymentLink || "",
      qty: addQty
    });
  }
  writeCart(items);
  pulseBadge();
  showToast(display + " aggiunto al carrello", {
    action: "Vedi",
    onAction: () => openCart()
  });
  if (!document.getElementById("cart-page")) openCart();
}

function pulseBadge() {
  const badge = document.querySelector(".cart-btn__count");
  const btn = document.getElementById("cart-open");
  badge?.classList.remove("is-bounce");
  btn?.classList.remove("is-pulse");
  void badge?.offsetWidth;
  void btn?.offsetWidth;
  badge?.classList.add("is-bounce");
  btn?.classList.add("is-pulse");
}

function qty(key, delta) {
  const items = readCart().map((i) => cartKey(i) === key ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0);
  writeCart(items);
}

function removeItem(key, el) {
  if (el) {
    el.classList.add("is-removing");
    setTimeout(() => writeCart(readCart().filter((i) => cartKey(i) !== key)), 220);
  } else {
    writeCart(readCart().filter((i) => cartKey(i) !== key));
  }
}

function subtotal(items) {
  return items.reduce((sum, i) => {
    const n = parsePrice(i.price);
    return n == null ? sum : sum + n * i.qty;
  }, 0);
}

function mountHeaderBtn(attempt) {
  const actions = document.querySelector(".header-actions");
  if (!actions) {
    if ((attempt || 0) < 20) setTimeout(() => mountHeaderBtn((attempt || 0) + 1), 80);
    return;
  }
  let a = document.getElementById("cart-open");
  if (!a) {
    a = document.createElement("a");
    a.href = "carrello.html";
    a.id = "cart-open";
    a.className = "icon-btn cart-btn";
    a.setAttribute("aria-label", "Carrello");
    a.innerHTML = '<span class="cart-btn__ico" aria-hidden="true">\uD83D\uDED2</span><span class="cart-btn__count" hidden>0</span>';
    const toggle = actions.querySelector(".nav-toggle");
    const authEl = document.getElementById("auth-area");
    if (toggle) actions.insertBefore(a, toggle);
    else if (authEl) actions.insertBefore(a, authEl);
    else actions.appendChild(a);
  }
  if (!a.dataset.drawerBound) {
    a.dataset.drawerBound = "1";
    a.addEventListener("click", (e) => {
      if (!document.getElementById("cart-page")) {
        e.preventDefault();
        openCart();
      }
    });
  }
}

function itemLineHtml(i, compact) {
  const lineTotal = (() => {
    const n = parsePrice(i.price);
    return n == null ? "" : formatEuro(n * i.qty);
  })();
  const k = escapeHtml(cartKey(i));
  return (
    '<article class="cart-item" data-key="' + k + '">' +
      '<a class="cart-item__img" href="prodotto.html?id=' + encodeURIComponent(i.id) + '">' +
        (i.imageUrl ? '<img src="' + escapeHtml(i.imageUrl) + '" alt="" loading="lazy">' : '<span class="cart-item__ph">\uD83C\uDFAE</span>') +
      '</a>' +
      '<div class="cart-item__info">' +
        '<a class="cart-item__name" href="prodotto.html?id=' + encodeURIComponent(i.id) + '">' + escapeHtml(i.name) + '</a>' +
        '<span class="cart-item__price">' + escapeHtml(i.price || "") +
          (lineTotal && i.qty > 1 ? ' \u00B7 <em>' + lineTotal + '</em>' : '') +
        '</span>' +
        '<div class="cart-item__row">' +
          '<div class="cart-qty">' +
            '<button type="button" data-qty="-1" data-key="' + k + '" aria-label="Diminuisci">\u2212</button>' +
            '<span class="cart-qty__val">' + i.qty + '</span>' +
            '<button type="button" data-qty="1" data-key="' + k + '" aria-label="Aumenta">+</button>' +
          '</div>' +
          (compact ? '' : '<a class="cart-item__open" href="prodotto.html?id=' + encodeURIComponent(i.id) + '">Vedi \u2192</a>') +
        '</div>' +
      '</div>' +
      '<button type="button" class="cart-item__del" data-del="' + k + '" aria-label="Rimuovi">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>' +
      '</button>' +
    '</article>'
  );
}

function bindItemActions(root) {
  if (!root) return;
  root.querySelectorAll("[data-qty]").forEach((b) => {
    b.addEventListener("click", () => {
      qty(b.dataset.key, Number(b.dataset.qty));
      b.closest(".cart-qty")?.classList.add("is-tick");
      setTimeout(() => b.closest(".cart-qty")?.classList.remove("is-tick"), 200);
    });
  });
  root.querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", () => removeItem(b.dataset.del, b.closest(".cart-item")));
  });
}

function emptyHtml() {
  return (
    '<div class="cart-empty">' +
      '<div class="cart-empty__ico">\uD83D\uDED2</div>' +
      '<p class="cart-empty__title">Il carrello \u00E8 vuoto</p>' +
      '<p class="cart-empty__hint">Aggiungi qualcosa dallo Store e torna qui.</p>' +
      '<a href="store.html" class="btn btn--lime">Vai allo Store</a>' +
    '</div>'
  );
}

function footHtml(items, compact) {
  const total = subtotal(items);
  const quoteOnly = items.every((i) => parsePrice(i.price) == null);
  const count = items.reduce((n, i) => n + i.qty, 0);
  return (
    '<div class="cart-sub">' +
      '<span>' + count + ' articol' + (count === 1 ? 'o' : 'i') + '</span>' +
      '<strong>' + (quoteOnly ? 'Su preventivo' : formatEuro(total)) + '</strong>' +
    '</div>' +
    '<p class="cart-hint">Spedizione e sconti alla cassa.</p>' +
    (compact
      ? '<a href="carrello.html" class="btn btn--outline cart-checkout" style="margin-bottom:8px;">Vedi carrello</a>' +
        '<a href="checkout.html" class="btn btn--lime cart-checkout">Vai al check-out</a>'
      : '<label class="cart-note-label">Nota sull\'ordine</label>' +
        '<textarea id="cart-note" placeholder="Richieste, switch, colore\u2026"></textarea>' +
        '<input type="email" id="cart-email" placeholder="Email per l\'ordine" value="' + escapeHtml(currentUser?.email || '') + '">' +
        '<button type="button" class="btn btn--lime cart-checkout" id="cart-checkout">Check-out</button>' +
        '<button type="button" class="btn cart-paypal" id="cart-paypal" ' + (paypalMeUrl ? '' : 'hidden') + '>PayPal</button>' +
        '<div id="cart-pay-extra"></div>' +
        '<p class="cart-status" id="cart-status"></p>')
  );
}

function renderDrawer() {
  ensureDrawer();
  const body = document.getElementById("cart-drawer-body");
  const foot = document.getElementById("cart-drawer-foot");
  if (!body || !foot) return;
  const items = readCart();
  if (!items.length) {
    body.innerHTML = emptyHtml();
    foot.innerHTML = "";
    return;
  }
  body.innerHTML = items.map((i) => itemLineHtml(i, true)).join("");
  bindItemActions(body);
  foot.innerHTML = footHtml(items, true);
}

function renderPage() {
  const body = document.getElementById("cart-body");
  const foot = document.getElementById("cart-foot");
  if (!body || !foot) return;
  const items = readCart();
  if (!items.length) {
    body.innerHTML = emptyHtml();
    foot.innerHTML = "";
    return;
  }
  body.innerHTML = items.map((i) => itemLineHtml(i, false)).join("");
  bindItemActions(body);
  foot.innerHTML = footHtml(items, false);
  document.getElementById("cart-checkout")?.addEventListener("click", () => {
    window.location.href = "checkout.html";
  });
  document.getElementById("cart-paypal")?.addEventListener("click", () => {
    if (!paypalMeUrl) return;
    const total = subtotal(items);
    const amt = total > 0 ? total.toFixed(2) : "";
    const url = paypalMeUrl.replace(/\/$/, "") + (amt ? "/" + amt : "");
    window.open(url, "_blank", "noopener");
  });
}

function render() {
  mountHeaderBtn();
  const items = readCart();
  const count = items.reduce((n, i) => n + i.qty, 0);
  const badge = document.querySelector(".cart-btn__count");
  if (badge) {
    badge.hidden = count === 0;
    badge.textContent = count > 99 ? "99+" : String(count);
  }
  if (document.getElementById("cart-page")) renderPage();
  if (document.getElementById("cart-drawer") || drawerOpen) renderDrawer();
}

window.GRCart = { add: addToCart, open: openCart, close: closeCart };
mountHeaderBtn();
render();
setTimeout(() => { try { mountHeaderBtn(); render(); } catch (_) {} }, 300);
setTimeout(() => { try { mountHeaderBtn(); render(); } catch (_) {} }, 1000);
window.addEventListener("gr:navigated", () => {
  try { render(); } catch (_) {}
});
