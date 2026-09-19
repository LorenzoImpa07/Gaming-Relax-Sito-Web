import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { uploadFile } from "./upload.js";

const form = document.getElementById("profile-form");
const preview = document.getElementById("profile-preview");
const statusEl = document.getElementById("profile-status");
const nickEl = document.getElementById("pf-nick");
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
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      nick = d.nickname || nick;
      photo = d.photoURL || photo;
      bio = d.bio || "";
    }
  } catch (_) {}
  photoData = photo;
  if (nickEl) nickEl.value = nick;
  if (bioEl) bioEl.value = bio;
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
  const bio = (bioEl?.value || "").trim();
  try {
    showStatus("Salvataggio…", true);
    let photoURL = photoData || "";
    if (pendingFile) photoURL = await uploadFile(pendingFile, "avatars");
    const authPatch = { displayName: nickname };
    if (photoURL && photoURL.startsWith("http") && photoURL.length < 2000) authPatch.photoURL = photoURL;
    await updateProfile(currentUser, authPatch);
    await setDoc(doc(db, "users", currentUser.uid), { nickname, photoURL, bio }, { merge: true });
    if (photoURL) localStorage.setItem("gr_avatar_" + currentUser.uid, photoURL);
    localStorage.setItem("gr_nick_" + currentUser.uid, nickname);
    showStatus("Profilo salvato.", true);
    setTimeout(() => window.location.reload(), 600);
  } catch (err) {
    showStatus("Salvataggio non riuscito. In Firebase avvia Storage e pubblica storage.rules.txt", false);
  }
});
