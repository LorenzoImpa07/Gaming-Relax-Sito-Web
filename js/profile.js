import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { uploadFile } from "./upload.js?v=20260921a";

const MIN_AGE = 14;

const form = document.getElementById("profile-form");
const preview = document.getElementById("profile-preview");
const statusEl = document.getElementById("profile-status");
const nickEl = document.getElementById("pf-nick");
const firstEl = document.getElementById("pf-firstname");
const lastEl = document.getElementById("pf-lastname");
const birthEl = document.getElementById("pf-birthdate");
const ageHint = document.getElementById("pf-age-hint");
const fileEl = document.getElementById("pf-photo-file");
const bioEl = document.getElementById("pf-bio");

function showStatus(text, ok) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.style.color = ok ? "var(--lime)" : "#fca5a5";
}

function setPreview(src, letter) {
  if (!preview) return;
  if (src) preview.innerHTML = `<img src="${src}" alt="">`;
  else preview.textContent = letter || "G";
}

function calcAge(birthdateStr) {
  if (!birthdateStr) return null;
  const d = new Date(birthdateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function updateAgeHint() {
  if (!ageHint || !birthEl) return;
  const age = calcAge(birthEl.value);
  if (age === null) {
    ageHint.textContent = "Età minima richiesta: 14 anni.";
    ageHint.style.color = "var(--text-dim)";
    return;
  }
  ageHint.textContent = "Età: " + age + " anni" + (age < MIN_AGE ? " — troppo giovane (minimo 14)" : "");
  ageHint.style.color = age < MIN_AGE ? "#fca5a5" : "var(--text-dim)";
}

birthEl?.addEventListener("change", updateAgeHint);

let currentUser = null;
let photoData = "";
let pendingFile = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  let photo = user.photoURL || localStorage.getItem("gr_avatar_" + user.uid) || "";
  let nick = user.displayName || "";
  let bio = "";
  let firstName = "";
  let lastName = "";
  let birthdate = "";
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      nick = d.nickname || nick;
      photo = d.photoURL || photo;
      bio = d.bio || "";
      firstName = d.firstName || "";
      lastName = d.lastName || "";
      birthdate = d.birthdate || "";
    }
  } catch (_) {}
  photoData = photo;
  if (nickEl) nickEl.value = nick;
  if (firstEl) firstEl.value = firstName;
  if (lastEl) lastEl.value = lastName;
  if (birthEl) birthEl.value = birthdate;
  if (bioEl) bioEl.value = bio;
  updateAgeHint();
  setPreview(photo, (nick || user.email || "G").charAt(0).toUpperCase());
});

fileEl?.addEventListener("change", () => {
  pendingFile = fileEl.files?.[0] || null;
  if (!pendingFile) return;
  const url = URL.createObjectURL(pendingFile);
  setPreview(url, "G");
  showStatus("Foto pronta. Clicca Salva profilo.", true);
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const nickname = (nickEl?.value || "").trim();
  if (nickname.length < 2) {
    showStatus("Il nickname deve avere almeno 2 caratteri.", false);
    return;
  }
  const firstName = (firstEl?.value || "").trim();
  const lastName = (lastEl?.value || "").trim();
  const birthdate = (birthEl?.value || "").trim();
  const bio = (bioEl?.value || "").trim();

  let age = null;
  if (birthdate) {
    age = calcAge(birthdate);
    if (age === null) {
      showStatus("Data di nascita non valida.", false);
      return;
    }
    if (age < MIN_AGE) {
      showStatus("Devi avere almeno " + MIN_AGE + " anni.", false);
      return;
    }
  }

  try {
    showStatus("Salvataggio…", true);
    let photoURL = photoData || "";
    if (pendingFile) photoURL = await uploadFile(pendingFile, "avatars");
    const authPatch = { displayName: nickname };
    if (photoURL && photoURL.startsWith("http") && photoURL.length < 2000) authPatch.photoURL = photoURL;
    await updateProfile(currentUser, authPatch);
    const payload = { nickname, photoURL, bio, firstName, lastName };
    if (birthdate) {
      payload.birthdate = birthdate;
      payload.age = age;
    }
    await setDoc(doc(db, "users", currentUser.uid), payload, { merge: true });
    if (photoURL) localStorage.setItem("gr_avatar_" + currentUser.uid, photoURL);
    localStorage.setItem("gr_nick_" + currentUser.uid, nickname);
    showStatus("Profilo salvato.", true);
    setTimeout(() => window.location.reload(), 600);
  } catch (err) {
    showStatus("Salvataggio non riuscito. In Firebase avvia Storage e pubblica storage.rules.txt", false);
  }
});
