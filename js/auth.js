// Carica stile gaming (icone, contrasti, Dashboard neon)
(function () {
  if (typeof document === "undefined" || document.querySelector("link[data-gr-enhance]")) return;
  var l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "css/gaming-enhance.css?v=20261025d";
  l.setAttribute("data-gr-enhance", "1");
  (document.head || document.documentElement).appendChild(l);
})();

// Polish estetica (contrasto, bottoni, focus, tab/toast)
(function () {
  if (typeof document === "undefined" || document.querySelector("link[data-gr-polish]")) return;
  var l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "css/gaming-polish.css?v=20261025a";
  l.setAttribute("data-gr-polish", "1");
  (document.head || document.documentElement).appendChild(l);
})();

// Store PRO visual
(function () {
  if (typeof document === "undefined") return;
  var p = (location.pathname.split("/").pop() || "").toLowerCase();
  if (p !== "store.html" && p !== "store") return;
  var s = document.createElement("script");
  s.src = "js/store-ui-pro.js?v=20261026a";
  s.defer = true;
  (document.body || document.documentElement).appendChild(s);
})();

// Cart / Checkout visual PRO
(function () {
  if (typeof document === "undefined") return;
  var p = (location.pathname.split("/").pop() || "").toLowerCase();
  if (p !== "carrello.html" && p !== "carrello" && p !== "checkout.html" && p !== "checkout") return;
  var s = document.createElement("script");
  s.src = "js/checkout-ui-pro.js?v=20261026a";
  s.defer = true;
  (document.body || document.documentElement).appendChild(s);
})();

// Dashboard PRO — command center visual
(function () {
  if (typeof document === "undefined") return;
  var page = document.body && document.body.getAttribute("data-page");
  if (page !== "dashboard") return;
  var s = document.createElement("script");
  s.src = "js/dashboard-ui-pro.js?v=20261025d";
  s.defer = true;
  (document.body || document.documentElement).appendChild(s);
})();

// Dashboard auth fix (sblocca "Verifica accesso in corso…")
(function () {
  if (typeof document === "undefined") return;
  var page = document.body && document.body.getAttribute("data-page");
  var p = (location.pathname.split("/").pop() || "").toLowerCase();
  if (page !== "dashboard" && p !== "dashboard.html" && p !== "dashboard") return;
  if (document.querySelector('script[src*="dash-fix.js"]')) return;
  var s = document.createElement("script");
  s.type = "module";
  s.src = "js/dash-fix.js?v=20261026e";
  (document.body || document.documentElement).appendChild(s);
})();

// Sfondi admin (zone + colore) — solo in Dashboard
if (typeof document !== "undefined" && document.getElementById("bg-form")) {
  import("./bg-admin-enhance.js?v=20261025a").catch(function () {});
}

// ==========================================================================
// Autenticazione: login, registrazione, menu account
// ==========================================================================
import {
  auth,
  db,
  ADMIN_EMAIL,
  authReady,
  isAdminEmail,
  isVerifiedUser
} from "./firebase-init.js?v=20260920n";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import "./partners-dynamic.js";
import { validateRealEmailAsync } from "./email-check.js";

const MIN_AGE = 14;

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "Questa email e gia registrata. Prova ad accedere.",
  "auth/invalid-email": "L'indirizzo email non e valido.",
  "auth/weak-password": "La password deve avere almeno 6 caratteri.",
  "auth/invalid-credential": "Email o password errati.",
  "auth/user-not-found": "Nessun account trovato con questa email.",
  "auth/wrong-password": "Password errata.",
  "auth/too-many-requests": "Troppi tentativi. Riprova tra qualche minuto.",
  "auth/missing-password": "Inserisci una password.",
  "auth/missing-email": "Inserisci un indirizzo email.",
  "auth/popup-closed-by-user": "La finestra di accesso con Google e stata chiusa prima di completare l'operazione."
};

function messageFromError(err) {
  return ERROR_MESSAGES[err.code] || "Si e verificato un errore. Riprova.";
}

function getDisplayName(user) {
  const cached = user?.uid ? localStorage.getItem("gr_nick_" + user.uid) : "";
  if (cached) return cached;
  return user?.displayName || (user?.email ? user.email.split("@")[0] : "Utente");
}

function getAvatar(user) {
  if (!user?.uid) return "";
  return localStorage.getItem("gr_avatar_" + user.uid) || user.photoURL || "";
}

async function upsertUserDoc(user, extra) {
  if (!user?.uid) return;
  const banned = await isBanned(user);
  if (banned) return;
  const payload = {
    uid: user.uid,
    email: user.email || "",
    nickname: getDisplayName(user),
    lastLoginAt: serverTimestamp(),
    ...(extra || {})
  };
  try {
    await setDoc(doc(db, "users", user.uid), payload, { merge: true });
  } catch (_) {}
}

async function isBanned(user) {
  if (!user?.email) return false;
  try {
    const snap = await Promise.race([
      getDoc(doc(db, "bannedUsers", String(user.email).trim().toLowerCase())),
      new Promise((_, reject) => setTimeout(() => reject(new Error("ban-check-timeout")), 4000))
    ]);
    return snap.exists();
  } catch (_) {
    return false;
  }
}

function renderAuthArea(user, extra = {}) {
  const area = document.getElementById("auth-area");
  if (!area) return;
  if (user) {
    const isAdmin = isAdminEmail(user.email);
    const nickname = getDisplayName(user);
    const initial = nickname.charAt(0).toUpperCase();
    const avatar = getAvatar(user);
    area.innerHTML = `
      <div class="auth-menu">
        <button type="button" class="icon-btn auth-menu__trigger" aria-label="Account" aria-haspopup="true" aria-expanded="false">${avatar ? `<img src="${avatar}" alt="">` : initial}</button>
        <div class="auth-menu__dropdown">
          <div class="auth-menu__email">${nickname}</div>
          <span class="auth-menu__sub">${user.email || ""}</span>
          <a href="profilo.html">Il mio profilo</a>
          ${isAdmin ? '<a class="auth-menu__dash" href="dashboard.html">Vai alla Dashboard</a>' : ""}
          <button type="button" id="auth-logout">Esci</button>
        </div>
      </div>`;
    const menu = area.querySelector(".auth-menu");
    const trigger = area.querySelector(".auth-menu__trigger");
    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle("open");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    if (!window.__grAuthMenuDocClose) {
      window.__grAuthMenuDocClose = true;
      document.addEventListener("click", (e) => {
        document.querySelectorAll(".auth-menu.open").forEach((m) => {
          if (!m.contains(e.target)) {
            m.classList.remove("open");
            const t = m.querySelector(".auth-menu__trigger");
            if (t) t.setAttribute("aria-expanded", "false");
          }
        });
      });
    }
    document.getElementById("auth-logout")?.addEventListener("click", () => {
      signOut(auth).then(() => { window.location.href = "index.html"; });
    });
  } else {
    area.innerHTML = `<a class="btn btn--outline" href="login.html">Accedi</a>`;
  }
}

async function refreshAuthMenu(user) {
  renderAuthArea(user);
}

const VERIFY_URL = { url: "https://gamingrelaxofficials.it/login.html", handleCodeInApp: false };

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    try { sessionStorage.removeItem("gr_creator"); } catch (_) {}
    renderAuthArea(null);
    return;
  }
  if (await isBanned(user)) {
    await signOut(auth);
    renderAuthArea(null);
    return;
  }
  try { await user.reload(); } catch (_) {}
  if (!isVerifiedUser(user)) {
    const onDash = (location.pathname || "").toLowerCase().includes("dashboard");
    if (!(onDash && isAdminEmail(user.email))) {
      await signOut(auth);
      renderAuthArea(null);
      return;
    }
  }
  await refreshAuthMenu(user);
  getDoc(doc(db, "users", user.uid)).then((snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    if (d.photoURL) localStorage.setItem("gr_avatar_" + user.uid, d.photoURL);
    if (d.nickname) localStorage.setItem("gr_nick_" + user.uid, d.nickname);
    refreshAuthMenu(user);
  }).catch(() => {});
});

function bindAuthForms() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const resetForm = document.getElementById("reset-form");
  const googleBtn = document.getElementById("google-login");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('[name="email"], #login-email')?.value?.trim();
      const password = loginForm.querySelector('[name="password"], #login-password')?.value;
      const errEl = document.getElementById("login-error") || loginForm.querySelector(".form-error");
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (await isBanned(cred.user)) {
          await signOut(auth);
          if (errEl) errEl.textContent = "Questo account e stato sospeso.";
          return;
        }
        try { await cred.user.reload(); } catch (_) {}
        if (!isVerifiedUser(cred.user)) {
          if (errEl) errEl.textContent = "Verifica la email prima di accedere.";
          await signOut(auth);
          return;
        }
        await upsertUserDoc(cred.user);
        window.location.href = isAdminEmail(cred.user.email) ? "dashboard.html" : "index.html";
      } catch (err) {
        if (errEl) errEl.textContent = messageFromError(err);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errEl = document.getElementById("register-error") || registerForm.querySelector(".form-error");
      const email = registerForm.querySelector('[name="email"], #reg-email')?.value?.trim();
      const password = registerForm.querySelector('[name="password"], #reg-password')?.value;
      const password2 = registerForm.querySelector('[name="password2"], #reg-password2')?.value;
      const firstName = registerForm.querySelector('[name="firstName"], #reg-firstname')?.value?.trim() || "";
      const lastName = registerForm.querySelector('[name="lastName"], #reg-lastname')?.value?.trim() || "";
      const birth = registerForm.querySelector('[name="birth"], #reg-birth')?.value;
      const terms = registerForm.querySelector('[name="terms"], #reg-terms');
      if (password !== password2) {
        if (errEl) errEl.textContent = "Le password non coincidono.";
        return;
      }
      if (terms && !terms.checked) {
        if (errEl) errEl.textContent = "Devi accettare i termini.";
        return;
      }
      if (birth) {
        const b = new Date(birth);
        const now = new Date();
        let age = now.getFullYear() - b.getFullYear();
        const m = now.getMonth() - b.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
        if (age < MIN_AGE) {
          if (errEl) errEl.textContent = "Devi avere almeno " + MIN_AGE + " anni.";
          return;
        }
      }
      try {
        const check = await validateRealEmailAsync(email);
        if (check && check.ok === false) {
          if (errEl) errEl.textContent = check.message || "Email non valida.";
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];
        try { await updateProfile(cred.user, { displayName }); } catch (_) {}
        try { await sendEmailVerification(cred.user, VERIFY_URL); } catch (_) {}
        await upsertUserDoc(cred.user, {
          firstName,
          lastName,
          birthDate: birth || "",
          displayName,
          createdAt: serverTimestamp()
        });
        await signOut(auth);
        if (errEl) {
          errEl.style.color = "var(--lime)";
          errEl.textContent = "Account creato. Controlla la email per verificare l'account, poi accedi.";
        }
      } catch (err) {
        if (errEl) errEl.textContent = messageFromError(err);
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = resetForm.querySelector('[name="email"], #reset-email')?.value?.trim();
      const errEl = document.getElementById("reset-error") || resetForm.querySelector(".form-error");
      try {
        await sendPasswordResetEmail(auth, email, VERIFY_URL);
        if (errEl) {
          errEl.style.color = "var(--lime)";
          errEl.textContent = "Email di reset inviata. Controlla la casella di posta.";
        }
      } catch (err) {
        if (errEl) errEl.textContent = messageFromError(err);
      }
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      const errEl = document.getElementById("login-error");
      try {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        if (await isBanned(cred.user)) {
          await signOut(auth);
          if (errEl) errEl.textContent = "Questo account e stato sospeso.";
          return;
        }
        await upsertUserDoc(cred.user);
        window.location.href = isAdminEmail(cred.user.email) ? "dashboard.html" : "index.html";
      } catch (err) {
        if (errEl) errEl.textContent = messageFromError(err);
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindAuthForms);
} else {
  bindAuthForms();
}

export async function requireAuth() {
  await authReady.catch(() => {});
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u && isVerifiedUser(u) ? u : null);
    });
  });
}

export { auth, isAdminEmail, isVerifiedUser, getDisplayName, refreshAuthMenu };
