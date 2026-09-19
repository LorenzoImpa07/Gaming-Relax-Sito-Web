// ==========================================================================
// Carrello — locale, drawer, ordine su Firestore, pagamento Stripe/PayPal
// ==========================================================================
import { db, auth, isVerifiedUser } from "./firebase-init.js?v=20260919y";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { validateRealEmail } from "./email-check.js";

const KEY = "gr_cart";
let currentUser = null;
let paypalMeUrl = "";

onAuthStateChanged(auth, (u) => { currentUser = isVerifiedUser(u) ? u : null; });
getDoc(doc(db, "siteContent", "general")).then((s) => {
  if (s.exists()) paypalMeUrl = s.data().paypalMeUrl || "";
}).catch(() => {});

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => {
    if (m === "&") return "&" + "amp;";
    if (m === "<") return "&" + "lt;";
    if (m === ">") return "&" + "gt;";
    if (m === '"') return "&" + "quot;";
    return "&#39;";
  });
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

export function addToCart(product) {
  if (!product?.id) return;
  const variant = (product.variant || "").trim();
  const addQty = Math.max(1, Number(product.qty) || 1);
  const items = readCart();
  const found = items.find((i) => cartKey(i) === cartKey({ id: product.id, variant }));
  const display = variant ? (product.name + " (" + variant + ")") : (product.name || "Prodotto");
  if (found) found.qty += addQty;
  else items.push({
    id: product.id,
    name: display,
    variant,
    price: product.price || "",
    imageUrl: product.imageUrl || "",
    paymentLink: product.paymentLink || "",
    qty: addQty
  });
  writeCart(items);
}

function qty(key, delta) {
  const items = readCart().map((i) => cartKey(i) === key ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0);
  writeCart(items);
}

function removeItem(key) {
  writeCart(readCart().filter((i) => cartKey(i) !== key));
}

export function openCart() {
  if (!document.getElementById("cart-page")) {
    window.location.href = "carrello.html";
  }
}
function closeCart() {}

function subtotal(items) {
  return items.reduce((sum, i) => {
    const n = parsePrice(i.price);
    return n == null ? sum : sum + n * i.qty;
  }, 0);
}

function mount() {
  const actions = document.querySelector(".header-actions");
  if (actions && !document.getElementById("cart-open")) {
    const a = document.createElement("a");
    a.href = "carrello.html";
    a.id = "cart-open";
    a.className = "icon-btn cart-btn";
    a.setAttribute("aria-label", "Carrello");
    a.innerHTML = `🛒<span class="cart-btn__count" hidden>0</span>`;
    const auth = document.getElementById("auth-area");
    if (auth) actions.insertBefore(a, auth);
    else actions.prepend(a);
  }
}

function render() {
  mount();
  const items = readCart();
  const count = items.reduce((n, i) => n + i.qty, 0);
  const badge = document.querySelector(".cart-btn__count");
  if (badge) {
    badge.hidden = count === 0;
    badge.textContent = count;
  }
  const body = document.getElementById("cart-body");
  const foot = document.getElementById("cart-foot");
  if (!body || !foot) return;

  if (!items.length) {
    body.innerHTML = '<p class="cart-empty">Il carrello è vuoto.<br><a href="store.html">Vai allo Store →</a></p>';
    foot.innerHTML = "";
    return;
  }

  body.innerHTML = items.map((i) => `
    <article class="cart-item">
      <a class="cart-item__img" href="prodotto.html?id=${encodeURIComponent(i.id)}" style="background:${i.imageUrl ? `url('${escapeHtml(i.imageUrl)}') center/cover` : "linear-gradient(135deg,#1a2030,#0a0d16)"};"></a>
      <div class="cart-item__info">
        <a class="cart-item__name" href="prodotto.html?id=${encodeURIComponent(i.id)}">${escapeHtml(i.name)}</a>
        <span class="cart-item__price">${escapeHtml(i.price || "")}</span>
        <div class="cart-qty">
          <button type="button" data-qty="-1" data-key="${cartKey(i)}">−</button>
          <span>${i.qty}</span>
          <button type="button" data-qty="1" data-key="${cartKey(i)}">+</button>
        </div>
        <a class="cart-item__open" href="prodotto.html?id=${encodeURIComponent(i.id)}">Vedi prodotto →</a>
      </div>
      <button type="button" class="cart-item__del" data-del="${cartKey(i)}" aria-label="Rimuovi">✕</button>
    </article>`).join("");

  body.querySelectorAll("[data-qty]").forEach((b) => {
    b.addEventListener("click", () => qty(b.dataset.key, Number(b.dataset.qty)));
  });
  body.querySelectorAll("[data-del]").forEach((b) => {
    b.addEventListener("click", () => removeItem(b.dataset.del));
  });

  const total = subtotal(items);
  const quoteOnly = items.every((i) => parsePrice(i.price) == null);
  foot.innerHTML = `
    <label class="cart-note-label">Nota sull'ordine</label>
    <textarea id="cart-note" placeholder="Richieste, switch, colore…"></textarea>
    <div class="cart-sub">
      <span>Subtotale</span>
      <strong>${quoteOnly ? "Su preventivo" : formatEuro(total)}</strong>
    </div>
    <p class="cart-hint">Spedizione, tasse e codici sconto calcolati alla cassa.</p>
    <input type="email" id="cart-email" placeholder="Email per l'ordine" value="${escapeHtml(currentUser?.email || "")}">
    <button type="button" class="btn btn--lime cart-checkout" id="cart-checkout">Check-out</button>
    <button type="button" class="btn cart-paypal" id="cart-paypal" ${paypalMeUrl ? "" : "hidden"}>PayPal</button>
    <div id="cart-pay-extra"></div>
    <p class="cart-status" id="cart-status"></p>`;

  document.getElementById("cart-checkout")?.addEventListener("click", () => {
    window.location.href = "checkout.html";
  });
  document.getElementById("cart-paypal")?.addEventListener("click", () => {
    if (!paypalMeUrl) return;
    const amt = total > 0 ? total.toFixed(2) : "";
    const url = paypalMeUrl.replace(/\/$/, "") + (amt ? "/" + amt : "");
    window.open(url, "_blank", "noopener");
  });
}

async function checkout(items, total) {
  const status = document.getElementById("cart-status");
  const email = (document.getElementById("cart-email")?.value || currentUser?.email || "").trim();
  const note = (document.getElementById("cart-note")?.value || "").trim();
  const emailErr = validateRealEmail(email);
  if (emailErr) {
    status.textContent = emailErr;
    status.className = "cart-status err";
    return;
  }
  if (!currentUser) {
    status.innerHTML = 'Per ordinare accedi con un\'email confermata. <a href="login.html">Accedi</a>';
    status.className = "cart-status err";
    return;
  }
  const btn = document.getElementById("cart-checkout");
  btn.disabled = true;
  try {
    await addDoc(collection(db, "orders"), {
      items: items.map((i) => ({
        id: i.id, name: i.name, price: i.price, qty: i.qty, imageUrl: i.imageUrl || ""
      })),
      email,
      uid: currentUser?.uid || "",
      nickname: currentUser?.displayName || "",
      note,
      subtotal: total,
      status: "nuova",
      createdAt: serverTimestamp()
    });
    const links = items.filter((i) => i.paymentLink);
    const extra = document.getElementById("cart-pay-extra");
    if (links.length === 1 && links[0].qty === 1) {
      status.textContent = "Ordine inviato. Ti porto al pagamento…";
      status.className = "cart-status ok";
      writeCart([]);
      setTimeout(() => { window.location.href = links[0].paymentLink; }, 600);
      return;
    }
    if (links.length) {
      extra.innerHTML = `<p class="cart-hint">Ordine salvato. Paga i prodotti con Stripe:</p>` +
        links.map((i) => `<a class="btn btn--outline" style="width:100%;justify-content:center;margin-top:8px;" href="${escapeHtml(i.paymentLink)}" target="_blank" rel="noopener">Paga ${escapeHtml(i.name)} →</a>`).join("");
    }
    status.textContent = "Ordine inviato. Lo staff lo vede in Dashboard. Se hai i Payment Link Stripe, usa i pulsanti sopra.";
    status.className = "cart-status ok";
    writeCart([]);
  } catch (err) {
    status.textContent = "Impossibile inviare l'ordine. Riprova.";
    status.className = "cart-status err";
    btn.disabled = false;
  }
}

mount();
render();
window.GRCart = { add: addToCart, open: openCart };
window.addEventListener("gr:navigated", () => { try { render(); } catch (_) {} });
