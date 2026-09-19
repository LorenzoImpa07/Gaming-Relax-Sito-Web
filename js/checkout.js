import { db, auth, isVerifiedUser } from "./firebase-init.js?v=20260919y";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { COUNTRIES, ITALY_PROVINCES } from "./geo.js";
import { validateRealEmail } from "./email-check.js";

const KEY = "gr_cart";
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => {
    if (m === "&") return "&" + "amp;";
    if (m === "<") return "&" + "lt;";
    if (m === ">") return "&" + "gt;";
    if (m === '"') return "&" + "quot;";
    return "&#39;";
  });
}
function parsePrice(str) {
  if (!str) return null;
  if (/preventivo|su richiesta|n\/a/i.test(str)) return null;
  const n = parseFloat(String(str).replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function euro(n) {
  return (n || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
function readCart() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

let cfg = { shippingFlat: 0, freeOver: 0, taxPercent: 22, methods: [], stripePk: "" };
let tipPct = 2;
let discount = 0;
let discountCode = "";
let currentUser = null;
let stripe = null;
let cardNumberEl = null;
let cardExpiryEl = null;
let cardCvcEl = null;

onAuthStateChanged(auth, (u) => {
  currentUser = isVerifiedUser(u) ? u : null;
  if (currentUser?.email) {
    const el = document.getElementById("co-email");
    if (el) { el.value = currentUser.email; el.readOnly = true; }
  }
});
});

function subtotal() {
  return readCart().reduce((s, i) => s + (parsePrice(i.price) || 0) * i.qty, 0);
}
function shippingOf(sub) {
  const flat = Number(cfg.shippingFlat) || 0;
  const free = Number(cfg.freeOver) || 0;
  if (flat <= 0) return 0;
  if (free > 0 && sub >= free) return 0;
  return flat;
}
function totals() {
  const sub = subtotal();
  const ship = shippingOf(sub);
  const afterDisc = Math.max(0, sub - discount);
  const tax = afterDisc * ((Number(cfg.taxPercent) || 0) / 100);
  const tip = afterDisc * (tipPct / 100);
  const total = afterDisc + ship + tax + tip;
  return { sub, ship, tax, tip, total, afterDisc };
}

function renderSum() {
  const items = readCart();
  const box = document.getElementById("co-items");
  if (box) {
    box.innerHTML = items.map((i) => `
      <div class="co-line">
        <div class="co-thumb" style="background:${i.imageUrl ? `url('${escapeHtml(i.imageUrl)}') center/cover` : "#111"}"><span>${i.qty}</span></div>
        <div><strong>${escapeHtml(i.name)}</strong><br><small>${escapeHtml(i.price || "")}</small></div>
      </div>`).join("") || "<p>Carrello vuoto.</p>";
  }
  const t = totals();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("co-sub", euro(t.sub));
  set("co-ship", t.ship === 0 ? (Number(cfg.shippingFlat) > 0 ? "Gratis" : "Da confermare") : euro(t.ship));
  set("co-tax", euro(t.tax));
  set("co-tip", euro(t.tip));
  set("co-total", euro(t.total));
}

function fillCountries() {
  const sel = document.getElementById("co-country");
  if (!sel) return;
  sel.innerHTML = COUNTRIES.map((c) => `<option value="${escapeHtml(c)}"${c === "Italy" ? " selected" : ""}>${escapeHtml(c)}</option>`).join("");
}

function fillProvinces(list, keep) {
  const sel = document.getElementById("co-province");
  if (!sel) return;
  const cur = keep || "";
  sel.innerHTML = `<option value="">Provincia / Stato</option>` + list.map((s) =>
    `<option value="${escapeHtml(s)}"${s === cur ? " selected" : ""}>${escapeHtml(s)}</option>`
  ).join("");
}

async function loadStates(country) {
  if (country === "Italy") {
    fillProvinces(ITALY_PROVINCES);
    return;
  }
  fillProvinces(["Caricamento..."]);
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country })
    });
    const data = await res.json();
    const states = (data?.data?.states || []).map((s) => s.name).filter(Boolean);
    fillProvinces(states.length ? states : [country]);
  } catch (_) {
    fillProvinces([country]);
  }
}

function selectedMethod() {
  const idx = Number(document.querySelector('input[name="pay"]:checked')?.value || 0);
  return cfg.methods[idx] || cfg.methods[0] || null;
}

function syncCardBox() {
  const m = selectedMethod();
  const box = document.getElementById("co-card-box");
  if (!box) return;
  const isCard = !!(m && (m.type === "stripe" || /carta|card|stripe|credit/i.test(m.name || "")));
  box.hidden = !isCard;
  if (isCard) {
    const n = document.getElementById("card-number");
    setTimeout(() => n?.focus(), 50);
  }
}

async function loadStripe() {
  const pk = cfg.stripePk || "";
  const hint = document.getElementById("co-stripe-hint");
  if (!pk.startsWith("pk_")) {
    if (hint) hint.textContent = "Puoi inserire i dati. Per l'addebito reale metti anche la chiave Stripe in Dashboard → Cassa.";
    return;
  }
  if (hint) hint.textContent = "I dati carta sono letti da Stripe. Non vengono salvati sul sito.";
  if (!window.Stripe) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://js.stripe.com/v3/";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  stripe = window.Stripe(pk);
}

function renderMethods() {
  const wrap = document.getElementById("co-methods");
  const express = document.getElementById("co-express");
  const methods = cfg.methods.length ? cfg.methods : [
    { name: "PayPal", type: "paypal", url: "" },
    { name: "Carta / Stripe", type: "stripe", url: "" }
  ];
  cfg.methods = methods;
  wrap.innerHTML = methods.map((m, i) => `
    <label class="co-method">
      <input type="radio" name="pay" value="${i}" ${i === 0 ? "checked" : ""}>
      <span>${escapeHtml(m.name)}</span>
    </label>`).join("");
  wrap.querySelectorAll('input[name="pay"]').forEach((r) => r.addEventListener("change", syncCardBox));
  express.innerHTML = methods.slice(0, 3).map((m, i) =>
    `<button type="button" class="co-exp-btn" data-i="${i}">${escapeHtml(m.name)}</button>`
  ).join("");
  express.querySelectorAll(".co-exp-btn").forEach((b) => {
    b.addEventListener("click", () => {
      const r = wrap.querySelector(`input[value="${b.dataset.i}"]`);
      if (r) r.checked = true;
      syncCardBox();
      if (selectedMethod()?.type === "stripe") document.getElementById("co-card-box")?.scrollIntoView({ behavior: "smooth", block: "center" });
      else document.getElementById("co-pay")?.scrollIntoView({ behavior: "smooth" });
    });
  });
  syncCardBox();
}

async function loadCfg() {
  try {
    const snap = await getDoc(doc(db, "siteContent", "checkout"));
    if (snap.exists()) {
      const d = snap.data();
      cfg.shippingFlat = Number(d.shippingFlat) || 0;
      cfg.freeOver = Number(d.freeOver) || 0;
      cfg.taxPercent = d.taxPercent == null || d.taxPercent === "" ? 22 : Number(d.taxPercent);
      cfg.methods = Array.isArray(d.methods) ? d.methods : [];
      cfg.stripePk = d.stripePk || "";
    }
    const g = await getDoc(doc(db, "siteContent", "general"));
    if (g.exists() && g.data().paypalMeUrl) {
      const has = cfg.methods.some((m) => m.type === "paypal");
      if (!has) cfg.methods.unshift({ name: "PayPal", type: "paypal", url: g.data().paypalMeUrl });
      else cfg.methods = cfg.methods.map((m) => m.type === "paypal" && !m.url ? { ...m, url: g.data().paypalMeUrl } : m);
    }
  } catch (_) {}
  renderMethods();
  renderSum();
  loadStripe().catch(() => {});
}

document.getElementById("co-tips")?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tip]");
  if (!b) return;
  tipPct = Number(b.dataset.tip) || 0;
  document.querySelectorAll("#co-tips [data-tip]").forEach((x) => x.classList.toggle("is-on", x === b));
  renderSum();
});

document.getElementById("co-country")?.addEventListener("change", (e) => loadStates(e.target.value));

document.getElementById("co-apply")?.addEventListener("click", async () => {
  const code = (document.getElementById("co-code")?.value || "").trim().toUpperCase();
  const msg = document.getElementById("co-disc-msg");
  discount = 0;
  discountCode = "";
  if (!code) { msg.textContent = ""; renderSum(); return; }
  try {
    const snap = await getDoc(doc(db, "siteContent", "publicVouchers"));
    const codes = snap.exists() ? (snap.data().codes || {}) : {};
    const found = codes[code];
    if (!found) {
      msg.textContent = "Codice non valido.";
      renderSum();
      return;
    }
    const sub = subtotal();
    const val = Number(found.discountValue) || 0;
    discount = found.discountType === "fisso" ? val : sub * (val / 100);
    if (discount > sub) discount = sub;
    discountCode = code;
    msg.textContent = found.discountType === "fisso"
      ? ("Sconto di " + val.toLocaleString("it-IT", { style: "currency", currency: "EUR" }) + " applicato.")
      : ("Sconto " + val + "% applicato.");
  } catch (_) {
    msg.textContent = "Impossibile verificare il codice.";
  }
  renderSum();
});

document.getElementById("co-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("co-status");
  const items = readCart();
  if (!items.length) {
    status.textContent = "Il carrello e vuoto.";
    status.className = "cart-status err";
    return;
  }
  const email = document.getElementById("co-email").value.trim();
  const emailErr = validateRealEmail(email);
  if (emailErr) {
    status.textContent = emailErr;
    status.className = "cart-status err";
    return;
  }
  if (!currentUser) {
    status.innerHTML = 'Per completare l\'ordine accedi con un\'email confermata. <a href="login.html">Accedi</a>';
    status.className = "cart-status err";
    return;
  }
  const t = totals();
  const idx = Number(document.querySelector('input[name="pay"]:checked')?.value || 0);
  const method = (cfg.methods[idx] || cfg.methods[0] || { name: "Da concordare", type: "note" });
  const btn = document.getElementById("co-pay");
  btn.disabled = true;
  let cardMeta = {};
  try {
    if (method.type === "stripe" || /carta|card|stripe|credit/i.test(method.name || "")) {
      const number = (document.getElementById("card-number")?.value || "").replace(/\s+/g, "");
      const exp = (document.getElementById("card-expiry")?.value || "").replace(/\s+/g, "");
      const cvc = (document.getElementById("card-cvc")?.value || "").trim();
      const cardName = document.getElementById("co-cardname")?.value.trim() || "";
      if (number.length < 13 || !cvc) {
        status.textContent = "Inserisci numero carta, scadenza e CVC.";
        status.className = "cart-status err";
        btn.disabled = false;
        return;
      }
      const em = exp.split(/[\/\-]/);
      const exp_month = em[0] || "";
      const exp_year = (em[1] || "").length === 2 ? "20" + em[1] : (em[1] || "");
      if (stripe) {
        const { token, error } = await stripe.createToken("card", {
          number, exp_month, exp_year, cvc, name: cardName
        });
        if (error) {
          status.textContent = error.message || "Controlla i dati della carta.";
          status.className = "cart-status err";
          btn.disabled = false;
          return;
        }
        cardMeta = {
          cardBrand: token.card?.brand || "",
          cardLast4: token.card?.last4 || number.slice(-4),
          stripeToken: token.id,
          cardName
        };
      } else {
        cardMeta = { cardLast4: number.slice(-4), cardName };
      }
    }
    await addDoc(collection(db, "orders"), {
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, imageUrl: i.imageUrl || "" })),
      email,
      uid: currentUser?.uid || "",
      nickname: currentUser?.displayName || "",
      firstName: document.getElementById("co-fn").value.trim(),
      lastName: document.getElementById("co-ln").value.trim(),
      buyerName: `${document.getElementById("co-fn").value.trim()} ${document.getElementById("co-ln").value.trim()}`.trim(),
      company: document.getElementById("co-company").value.trim(),
      address: document.getElementById("co-address").value.trim(),
      address2: document.getElementById("co-address2").value.trim(),
      city: document.getElementById("co-city").value.trim(),
      province: document.getElementById("co-province").value,
      zip: document.getElementById("co-zip").value.trim(),
      country: document.getElementById("co-country").value,
      phone: document.getElementById("co-phone").value.trim(),
      newsletter: document.getElementById("co-news").checked,
      paymentMethod: method.name,
      discountCode,
      discount,
      shipping: t.ship,
      tax: t.tax,
      tip: t.tip,
      subtotal: t.sub,
      total: t.total,
      status: "nuova",
      createdAt: serverTimestamp(),
      ...cardMeta
    });
    localStorage.setItem(KEY, "[]");
    const amount = t.total.toFixed(2);
    if (method.type === "paypal" && (method.url || "").includes("http")) {
      const base = method.url.replace(/\/$/, "");
      window.location.href = /paypal\.me/i.test(base) ? `${base}/${amount}` : base;
      return;
    }
    if (method.type === "stripe") {
      const link = method.url || items.find((i) => i.paymentLink)?.paymentLink;
      if (link) { window.location.href = link; return; }
    }
    if (method.type === "link" && method.url) {
      window.location.href = method.url;
      return;
    }
    window.location.href = "grazie.html";
  } catch (_) {
    status.textContent = "Impossibile inviare l'ordine. Riprova.";
    status.className = "cart-status err";
    btn.disabled = false;
  }
});

if (!readCart().length) {
  const f = document.getElementById("co-form");
  if (f) f.insertAdjacentHTML("afterbegin", '<p class="cart-status err">Il carrello e vuoto. <a href="store.html">Vai allo Store</a></p>');
}
fillCountries();
loadStates("Italy");
loadCfg();
renderSum();
