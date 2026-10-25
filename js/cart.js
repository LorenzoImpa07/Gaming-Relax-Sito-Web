// ==========================================================================
// Carrello — toast, badge, pagina carrello (senza overlay bloccante)
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

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
    if (c === "&") return "&" + "amp;";
    if (c === "<") return "&" + "lt;";
    if (c === ">") return "&" + "gt;";
    if (c === '"') return "&" + "quot;";
    return "&#39;";
  });
}

export function parsePrice(str) {
  if (!str) return null;
  if (/preventivo|su richiesta|n\/a/i.test(str)) return null;
  var n = parseFloat(String(str).replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatEuro(n) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function readCart() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; }
}
function writeCart(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  render();
}
function cartKey(i) {
  return String(i.id) + "::" + String(i.variant || "");
}

function ensureToastHost() {
  var host = document.getElementById("gr-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "gr-toast-host";
    host.className = "gr-toast-host";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  return host;
}

function showToast(message, opts) {
  opts = opts || {};
  var host = ensureToastHost();
  var el = document.createElement("div");
  el.className = "gr-toast" + (opts.error ? " gr-toast--err" : " gr-toast--ok");
  el.innerHTML =
    '<span class="gr-toast__ico">' + (opts.error ? "!" : "OK") + "</span>" +
    '<span class="gr-toast__msg">' + escapeHtml(message) + "</span>" +
    (opts.action
      ? '<button type="button" class="gr-toast__action">' + escapeHtml(opts.action) + "</button>"
      : "");
  host.appendChild(el);
  requestAnimationFrame(function () { el.classList.add("is-in"); });
  var actionBtn = el.querySelector(".gr-toast__action");
  function dismiss() {
    el.classList.remove("is-in");
    el.classList.add("is-out");
    setTimeout(function () { el.remove(); }, 280);
  }
  if (actionBtn && opts.onAction) {
    actionBtn.addEventListener("click", function () {
      opts.onAction();
      dismiss();
    });
  }
  setTimeout(dismiss, opts.duration || 3200);
}

function closeCart() {
  document.querySelectorAll("#cart-backdrop, .cart-backdrop, #cart-drawer, .cart-drawer").forEach(function (el) {
    el.classList.remove("open");
    try { el.remove(); } catch (e) {}
  });
  drawerOpen = false;
  document.body.classList.remove("cart-drawer-open");
  document.body.style.overflow = "";
}

export function openCart() {
  if (document.getElementById("cart-page")) {
    var body = document.getElementById("cart-body");
    if (body) body.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.location.href = "carrello.html";
}

export function addToCart(product) {
  if (!product || !product.id) return;
  var variant = (product.variant || "").trim();
  var addQty = Math.max(1, Number(product.qty) || 1);
  var items = readCart();
  var found = items.find(function (i) {
    return cartKey(i) === cartKey({ id: product.id, variant: variant });
  });
  var display = variant
    ? product.name + " (" + variant + ")"
    : product.name || "Prodotto";
  if (found) found.qty += addQty;
  else {
    items.push({
      id: product.id,
      name: display,
      variant: variant,
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
    onAction: function () { window.location.href = "carrello.html"; }
  });
}

function pulseBadge() {
  var badge = document.querySelector(".cart-btn__count");
  var btn = document.getElementById("cart-open");
  if (badge) {
    badge.classList.remove("is-bounce");
    void badge.offsetWidth;
    badge.classList.add("is-bounce");
  }
  if (btn) {
    btn.classList.remove("is-pulse");
    void btn.offsetWidth;
    btn.classList.add("is-pulse");
  }
}

function qty(key, delta) {
  var items = readCart()
    .map(function (i) {
      return cartKey(i) === key ? Object.assign({}, i, { qty: i.qty + delta }) : i;
    })
    .filter(function (i) { return i.qty > 0; });
  writeCart(items);
}

function removeItem(key, el) {
  if (el) {
    el.classList.add("is-removing");
    setTimeout(function () {
      writeCart(readCart().filter(function (i) { return cartKey(i) !== key; }));
    }, 220);
  } else {
    writeCart(readCart().filter(function (i) { return cartKey(i) !== key; }));
  }
}

function subtotal(items) {
  return items.reduce(function (sum, i) {
    var n = parsePrice(i.price);
    return n == null ? sum : sum + n * i.qty;
  }, 0);
}

function bindCartClick(a) {
  if (!a || a.dataset.drawerBound === "1") return;
  a.dataset.drawerBound = "1";
  a.setAttribute("href", "carrello.html");
}

function mountHeaderBtn(attempt) {
  var actions = document.querySelector(".header-actions");
  if (!actions) {
    if ((attempt || 0) < 25) setTimeout(function () { mountHeaderBtn((attempt || 0) + 1); }, 80);
    return;
  }
  var a = document.getElementById("cart-open");
  if (!a) {
    a = document.createElement("a");
    a.href = "carrello.html";
    a.id = "cart-open";
    a.className = "icon-btn cart-btn";
    a.setAttribute("aria-label", "Carrello");
    a.innerHTML =
      '<span class="cart-btn__ico" aria-hidden="true">&#128722;</span>' +
      '<span class="cart-btn__count" hidden>0</span>';
    var toggle = actions.querySelector(".nav-toggle");
    var authEl = document.getElementById("auth-area");
    if (toggle) actions.insertBefore(a, toggle);
    else if (authEl) actions.insertBefore(a, authEl);
    else actions.appendChild(a);
  } else {
    a.setAttribute("href", "carrello.html");
  }
  bindCartClick(a);
}

function itemLineHtml(i, compact) {
  var n = parsePrice(i.price);
  var lineTotal = n == null ? "" : formatEuro(n * i.qty);
  var k = escapeHtml(cartKey(i));
  var img = i.imageUrl
    ? '<img src="' + escapeHtml(i.imageUrl) + '" alt="" loading="lazy">'
    : '<span class="cart-item__ph">&#127918;</span>';
  return (
    '<article class="cart-item" data-key="' + k + '">' +
      '<a class="cart-item__img" href="prodotto.html?id=' + encodeURIComponent(i.id) + '">' + img + "</a>" +
      '<div class="cart-item__info">' +
        '<a class="cart-item__name" href="prodotto.html?id=' + encodeURIComponent(i.id) + '">' +
          escapeHtml(i.name) +
        "</a>" +
        '<span class="cart-item__price">' +
          escapeHtml(i.price || "") +
          (lineTotal && i.qty > 1 ? " · <em>" + lineTotal + "</em>" : "") +
        "</span>" +
        '<div class="cart-item__row">' +
          '<div class="cart-qty">' +
            '<button type="button" data-qty="-1" data-key="' + k + '" aria-label="Diminuisci">-</button>' +
            '<span class="cart-qty__val">' + i.qty + "</span>" +
            '<button type="button" data-qty="1" data-key="' + k + '" aria-label="Aumenta">+</button>' +
          "</div>" +
          (compact
            ? ""
            : '<a class="cart-item__open" href="prodotto.html?id=' +
              encodeURIComponent(i.id) +
              '">Vedi</a>') +
        "</div>" +
      "</div>" +
      '<button type="button" class="cart-item__del" data-del="' + k + '" aria-label="Rimuovi">X</button>' +
    "</article>"
  );
}

function bindItemActions(root) {
  if (!root) return;
  root.querySelectorAll("[data-qty]").forEach(function (b) {
    b.addEventListener("click", function () {
      qty(b.dataset.key, Number(b.dataset.qty));
    });
  });
  root.querySelectorAll("[data-del]").forEach(function (b) {
    b.addEventListener("click", function () {
      removeItem(b.dataset.del, b.closest(".cart-item"));
    });
  });
}

function emptyHtml() {
  return (
    '<div class="cart-empty">' +
      '<div class="cart-empty__ico">&#128722;</div>' +
      '<p class="cart-empty__title">Il carrello e vuoto</p>' +
      '<p class="cart-empty__hint">Aggiungi qualcosa dallo Store.</p>' +
      '<a href="store.html" class="btn btn--lime">Vai allo Store</a>' +
    "</div>"
  );
}

function footHtml(items, compact) {
  var total = subtotal(items);
  var quoteOnly = items.every(function (i) { return parsePrice(i.price) == null; });
  var count = items.reduce(function (n, i) { return n + i.qty; }, 0);
  var head =
    '<div class="cart-sub">' +
      "<span>" + count + " articol" + (count === 1 ? "o" : "i") + "</span>" +
      "<strong>" + (quoteOnly ? "Su preventivo" : formatEuro(total)) + "</strong>" +
    "</div>" +
    '<p class="cart-hint">Spedizione e sconti alla cassa.</p>';
  if (compact) {
    return (
      head +
      '<a href="carrello.html" class="btn btn--outline cart-checkout" style="margin-bottom:8px;">Vedi carrello</a>' +
      '<a href="checkout.html" class="btn btn--lime cart-checkout">Vai al check-out</a>'
    );
  }
  return (
    head +
    '<label class="cart-note-label">Nota sull ordine</label>' +
    '<textarea id="cart-note" placeholder="Richieste, switch, colore"></textarea>' +
    '<input type="email" id="cart-email" placeholder="Email per l ordine" value="' +
      escapeHtml(currentUser && currentUser.email ? currentUser.email : "") +
    '">' +
    '<button type="button" class="btn btn--lime cart-checkout" id="cart-checkout">Check-out</button>' +
    '<button type="button" class="btn cart-paypal" id="cart-paypal" ' +
      (paypalMeUrl ? "" : "hidden") +
    ">PayPal</button>" +
    '<div id="cart-pay-extra"></div>' +
    '<p class="cart-status" id="cart-status"></p>'
  );
}

function renderPage() {
  var body = document.getElementById("cart-body");
  var foot = document.getElementById("cart-foot");
  if (!body || !foot) return;
  var items = readCart();
  if (!items.length) {
    body.innerHTML = emptyHtml();
    foot.innerHTML = "";
    return;
  }
  body.innerHTML = items.map(function (i) { return itemLineHtml(i, false); }).join("");
  bindItemActions(body);
  foot.innerHTML = footHtml(items, false);
  var checkout = document.getElementById("cart-checkout");
  if (checkout) {
    checkout.addEventListener("click", function () {
      window.location.href = "checkout.html";
    });
  }
  var paypal = document.getElementById("cart-paypal");
  if (paypal) {
    paypal.addEventListener("click", function () {
      if (!paypalMeUrl) return;
      var total = subtotal(items);
      var amt = total > 0 ? total.toFixed(2) : "";
      var url = paypalMeUrl.replace(/\/$/, "") + (amt ? "/" + amt : "");
      window.open(url, "_blank", "noopener");
    });
  }
}

function render() {
  mountHeaderBtn();
  var items = readCart();
  var count = items.reduce(function (n, i) { return n + i.qty; }, 0);
  document.querySelectorAll(".cart-btn__count").forEach(function (badge) {
    badge.hidden = count === 0;
    badge.textContent = count > 99 ? "99+" : String(count);
  });
  if (document.getElementById("cart-page")) renderPage();
}

window.GRCart = { add: addToCart, open: openCart, close: closeCart };

try {
  document.querySelectorAll("#cart-backdrop, .cart-backdrop, #cart-drawer, .cart-drawer").forEach(function (el) {
    el.classList.remove("open");
    el.remove();
  });
  document.body.classList.remove("cart-drawer-open");
  document.body.style.overflow = "";
} catch (e) {}

mountHeaderBtn();
render();
setTimeout(function () { try { mountHeaderBtn(); render(); } catch (e) {} }, 200);
setTimeout(function () { try { mountHeaderBtn(); render(); } catch (e) {} }, 800);
window.addEventListener("gr:navigated", function () {
  try { render(); } catch (e) {}
});
