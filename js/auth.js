// ==========================================================================
// Autenticazione: login, registrazione, logout, menu account nell'header
// ==========================================================================
import { auth, ADMIN_EMAIL } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ERROR_MESSAGES = {
  "auth/email-already-in-use": "Questa email è già registrata. Prova ad accedere.",
  "auth/invalid-email": "L'indirizzo email non è valido.",
  "auth/weak-password": "La password deve avere almeno 6 caratteri.",
  "auth/invalid-credential": "Email o password errati.",
  "auth/user-not-found": "Nessun account trovato con questa email.",
  "auth/wrong-password": "Password errata.",
  "auth/too-many-requests": "Troppi tentativi. Riprova tra qualche minuto.",
  "auth/missing-password": "Inserisci una password."
};

function messageFromError(err) {
  return ERROR_MESSAGES[err.code] || "Si è verificato un errore. Riprova.";
}

// --- Menu account nell'header, presente su ogni pagina ---
function renderAuthArea(user) {
  const area = document.getElementById("auth-area");
  if (!area) return;

  if (user) {
    const isAdmin = user.email === ADMIN_EMAIL;
    const initial = (user.displayName || user.email || "U").charAt(0).toUpperCase();
    area.innerHTML = `
      <div class="auth-menu">
        <button class="icon-btn auth-menu__trigger" aria-label="Account" aria-haspopup="true">${initial}</button>
        <div class="auth-menu__dropdown">
          <span class="auth-menu__email">${user.email}</span>
          ${isAdmin ? '<a href="dashboard.html">Vai alla Dashboard</a>' : ""}
          <button type="button" data-action="logout">Esci</button>
        </div>
      </div>`;

    const trigger = area.querySelector(".auth-menu__trigger");
    const menu = area.querySelector(".auth-menu");
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("open");
    });
    document.addEventListener("click", () => menu.classList.remove("open"));

    area.querySelector('[data-action="logout"]').addEventListener("click", () => {
      signOut(auth).then(() => { window.location.href = "index.html"; });
    });
  } else {
    area.innerHTML = `<a href="login.html" class="btn btn--ghost-lime" style="padding:10px 18px;font-size:13px;">Accedi</a>`;
  }
}

onAuthStateChanged(auth, renderAuthArea);

// --- Form di login (presente solo in login.html) ---
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector("#login-email").value.trim();
    const password = loginForm.querySelector("#login-password").value;
    const errorEl = document.getElementById("login-error");
    errorEl.classList.remove("visible");

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      window.location.href = cred.user.email === ADMIN_EMAIL ? "dashboard.html" : "index.html";
    } catch (err) {
      errorEl.textContent = messageFromError(err);
      errorEl.classList.add("visible");
    }
  });
}

// --- Form di registrazione (presente solo in register.html) ---
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = registerForm.querySelector("#register-name").value.trim();
    const email = registerForm.querySelector("#register-email").value.trim();
    const password = registerForm.querySelector("#register-password").value;
    const errorEl = document.getElementById("register-error");
    errorEl.classList.remove("visible");

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (nome) await updateProfile(cred.user, { displayName: nome });
      window.location.href = "index.html";
    } catch (err) {
      errorEl.textContent = messageFromError(err);
      errorEl.classList.add("visible");
    }
  });
}
