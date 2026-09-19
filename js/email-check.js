const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const DISPOSABLE = new Set([
  "mailinator.com", "mailinator.net", "guerrillamail.com", "guerrillamail.net",
  "sharklasers.com", "grr.la", "guerrillamailblock.com", "pokemail.net",
  "yopmail.com", "yopmail.fr", "cool.fr.nf", "jetable.fr.nf",
  "10minutemail.com", "10minutemail.net", "minutemail.com",
  "tempmail.com", "temp-mail.org", "temp-mail.io", "tempail.com",
  "trashmail.com", "trashmail.de", "throwawaymail.com", "fakeinbox.com",
  "getnada.com", "nada.ltd", "emailondeck.com", "maildrop.cc",
  "discard.email", "dispostable.com", "mailnesia.com", "moakt.com",
  "inboxbear.com", "getairmail.com", "mohmal.com", "tempinbox.com",
  "mailcatch.com", "spamgourmet.com", "mailnull.com", "spam4.me",
  "mytrashmail.com", "mt2015.com", "thankyou2010.com", "trashymail.com",
  "kasmail.com", "spambog.com", "spambog.de", "wegwerfmail.de",
  "einrot.com", "superrito.com", "teleworm.us", "dayrep.com",
  "guerrillamail.org", "guerrillamail.biz", "spam.la", "binkmail.com",
  "bobmail.info", "sogetthis.com", "suremail.info", "mailinater.com",
  "trbvm.com", "tmpmail.org", "tmpmail.net", "dropmail.me",
  "mini-mail.com", "emailtemporanea.it", "emailtemporanea.net",
  "fastinbox.net", "hidemail.de", "koszmail.pl", "mailtemp.net"
]);

const mxCache = new Map();

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function validateRealEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return "Inserisci un indirizzo email.";
  if (!EMAIL_RE.test(e) || e.includes("..") || e.startsWith(".") || e.includes("@-")) {
    return "Inserisci un'email reale (es. mario@gmail.com).";
  }
  const domain = e.split("@")[1];
  if (!domain || DISPOSABLE.has(domain)) {
    return "Questa casella temporanea non è accettata. Usa un'email vera (Gmail, Outlook, Libero…).";
  }
  return "";
}

async function dnsHas(domain, type) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3500);
  try {
    const r = await fetch("https://dns.google/resolve?name=" + encodeURIComponent(domain) + "&type=" + type, { signal: ctrl.signal });
    const j = await r.json();
    return j.Status === 0 && Array.isArray(j.Answer) && j.Answer.length > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export async function domainCanReceiveMail(domain) {
  const d = String(domain || "").toLowerCase();
  if (mxCache.has(d)) return mxCache.get(d);
  const ok = (await dnsHas(d, "MX")) || (await dnsHas(d, "A"));
  mxCache.set(d, ok);
  return ok;
}

export async function validateRealEmailAsync(email) {
  const sync = validateRealEmail(email);
  if (sync) return sync;
  const domain = normalizeEmail(email).split("@")[1];
  const ok = await domainCanReceiveMail(domain);
  if (!ok) return "Questa email non esiste: il dominio non riceve posta. Controlla e riprova.";
  return "";
}

function hintFor(input) {
  let h = input.nextElementSibling;
  if (h && h.classList && h.classList.contains("email-verify-hint")) return h;
  h = document.createElement("p");
  h.className = "email-verify-hint";
  h.hidden = true;
  input.insertAdjacentElement("afterend", h);
  return h;
}

export function bindEmailFields(root = document) {
  root.querySelectorAll('input[type="email"]').forEach((el) => {
    if (el.dataset.emailBound === "1") return;
    el.dataset.emailBound = "1";
    const hint = hintFor(el);
    async function run() {
      const val = el.value.trim();
      if (!val) {
        el.setCustomValidity("");
        hint.hidden = true;
        return "";
      }
      hint.hidden = false;
      hint.style.color = "var(--text-dim)";
      hint.textContent = "Verifica email…";
      const err = await validateRealEmailAsync(val);
      if (el.value.trim() !== val) return err;
      el.setCustomValidity(err || "");
      if (err) {
        hint.textContent = err;
        hint.style.color = "#fca5a5";
        hint.hidden = false;
      } else {
        hint.textContent = "Email verificata.";
        hint.style.color = "var(--lime)";
        hint.hidden = false;
      }
      return err;
    }
    el.addEventListener("blur", run);
    el.addEventListener("change", run);
    el.form?.addEventListener("submit", (e) => {
      if (el.validationMessage) {
        e.preventDefault();
        hint.hidden = false;
        hint.textContent = el.validationMessage;
        hint.style.color = "#fca5a5";
      }
    });
  });
}

function boot() {
  bindEmailFields();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
window.addEventListener("gr:navigated", boot);
