// Controllo email: formato valido + niente caselle temporanee
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
