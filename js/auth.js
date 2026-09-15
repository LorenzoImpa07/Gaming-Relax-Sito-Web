// ==========================================================================
// Autenticazione: login, registrazione, logout, reset password, anagrafica utenti
// ==========================================================================
import { auth, db, ADMIN_EMAIL, authReady } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "Questa email è già registrata. Prova ad accedere.",
  "auth/invalid-email": "L'indirizzo email non è valido.",
  "auth/weak-password": "La password deve avere almeno 6 caratteri.",
  "auth/invalid-credential": "Email o password errati.",
  "auth/user-not-found": "Nessun account trovato con questa email.",
  "auth/wrong-password": "Password errata.",
  "auth/too-many-requests": "Troppi tentativi. Riprova tra qualche minuto.",
  "auth/missing-password": "Inserisci una password.",
  "auth/missing-email": "Inserisci un indirizzo email."
};

function messageFromError(err) {
  return ERROR_MESSAGES[err.code] || "Si è verificato un errore. Riprova.";
}

function getDisplayName(user) {
  const cached = user?.uid ? localStorage.getItem("gr_nick_" + user.uid) : "";
  return (cached || user.displayName || user.email?.split("@")[0] || "Utente").trim();
}

function getAvatar(user) {
  if (!user) return "";
  return user.photoURL || localStorage.getItem("gr_avatar_" + user.uid) || "";
}

async function saveUserRecord(user, extra) {
  if (!user) return;
  const payload = {
    uid: user.uid,
    email: user.email || "",
    nickname: getDisplayName(user),
    lastLoginAt: serverTimestamp(),
    ...(extra || {})
  };
  try {
    await setDoc(doc(db, "users", user.uid), payload, { merge: true });
  } catch (_) {
    // non bloccare login/registrazione
  }
}

function isAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === String(ADMIN_EMAIL).toLowerCase();
}

function renderAuthArea(user) {
  const area = document.getElementById("auth-area");
  if (!area) return;

  if (user) {
    const isAdmin = isAdminEmail(user.email);
    const nickname = getDisplayName(user);
    const initial = nickname.charAt(0).toUpperCase();
    const avatar = getAvatar(user);
    area.innerHTML = `
      <div class="auth-menu">
        <button type="button" class="icon-btn auth-menu__trigger" aria-label="Account" aria-haspopup="true">${avatar ? `<img src="${avatar}" alt="">` : initial}</button>
        <div class="auth-menu__dropdown">
          <span class="auth-menu__email">${nickname}</span>
          <span class="auth-menu__sub">${user.email}</span>
          <a href="profilo.html">Il mio profilo</a>
          ${isAdmin ? '<a class="auth-menu__dash" href="dashboard.html">Vai alla Dashboard</a>' : ""}
          <button type="button" data-action="logout">Esci</button>
        </div>
      </div>`;

    const trigger = area.querySelector(".auth-menu__trigger");
    const menu = area.querySelector(".auth-menu");
    const dropdown = area.querySelector(".auth-menu__dropdown");
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    dropdown.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", () => menu.classList.remove("open"));

    area.querySelector('[data-action="logout"]').addEventListener("click", () => {
      signOut(auth).then(() => { window.location.href = "index.html"; });
    });
  } else {
    area.innerHTML = `<a href="login.html" class="btn btn--ghost-lime" style="padding:10px 18px;font-size:13px;">Accedi</a>`;
  }
}

onAuthStateChanged(auth, (user) => {
  renderAuthArea(user);
  if (!user) return;
  getDoc(doc(db, "users", user.uid)).then((snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    if (d.photoURL) localStorage.setItem("gr_avatar_" + user.uid, d.photoURL);
    if (d.nickname) localStorage.setItem("gr_nick_" + user.uid, d.nickname);
    renderAuthArea(user);
  }).catch(() => {});
});

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector("#login-email").value.trim();
    const password = loginForm.querySelector("#login-password").value;
    const errorEl = document.getElementById("login-error");
    errorEl.classList.remove("visible");

    try {
      await authReady;
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await saveUserRecord(cred.user);
      window.location.href = isAdminEmail(cred.user.email) ? "dashboard.html" : "index.html";
    } catch (err) {
      errorEl.textContent = messageFromError(err);
      errorEl.classList.add("visible");
    }
  });
}

const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nickname = registerForm.querySelector("#register-nickname").value.trim();
    const email = registerForm.querySelector("#register-email").value.trim();
    const password = registerForm.querySelector("#register-password").value;
    const errorEl = document.getElementById("register-error");
    errorEl.classList.remove("visible");

    if (nickname.length < 2) {
      errorEl.textContent = "Il nickname deve avere almeno 2 caratteri.";
      errorEl.classList.add("visible");
      return;
    }

    try {
      await authReady;
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: nickname });
      await saveUserRecord(cred.user, { nickname, email, createdAt: serverTimestamp(), roleIds: [] });
      window.location.href = "index.html";
    } catch (err) {
      errorEl.textContent = messageFromError(err);
      errorEl.classList.add("visible");
    }
  });
}

const forgotToggle = document.getElementById("forgot-toggle");
const forgotWrap = document.getElementById("forgot-wrap");
const forgotForm = document.getElementById("forgot-form");
if (forgotToggle && forgotWrap) {
  forgotToggle.addEventListener("click", () => {
    const open = forgotWrap.style.display === "block";
    forgotWrap.style.display = open ? "none" : "block";
  });
}
if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (document.getElementById("forgot-email").value || "").trim();
    const msgEl = document.getElementById("forgot-msg");
    const btn = forgotForm.querySelector('button[type="submit"]');
    msgEl.className = "auth-ok";
    msgEl.textContent = "";
    if (!email) {
      msgEl.className = "auth-error visible";
      msgEl.textContent = "Inserisci l'email del tuo account.";
      return;
    }
    btn.disabled = true;
    try {
      await sendPasswordResetEmail(auth, email);
      msgEl.className = "auth-ok visible";
      msgEl.textContent = "Se l'email è registrata, riceverai un messaggio con il link per reimpostare la password. Controlla anche lo spam.";
      forgotForm.reset();
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-email") {
        msgEl.className = "auth-ok visible";
        msgEl.textContent = "Se l'email è registrata, riceverai un messaggio con il link per reimpostare la password. Controlla anche lo spam.";
      } else {
        msgEl.className = "auth-error visible";
        msgEl.textContent = messageFromError(err);
      }
    } finally {
      btn.disabled = false;
    }
  });
}
