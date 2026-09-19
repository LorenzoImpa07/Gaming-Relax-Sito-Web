// ==========================================================================
// Inizializzazione Firebase (Auth + Firestore)
// ==========================================================================
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
auth.languageCode = "it";
// Stesso account su tutte le schede dello stesso browser (Dashboard → sito già loggato).
export const authReady = setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app);
export { ADMIN_EMAIL };

export function isAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === String(ADMIN_EMAIL).toLowerCase();
}

export function isVerifiedUser(user) {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  return user.emailVerified === true;
}

export function verifiedOrNull(user) {
  return isVerifiedUser(user) ? user : null;
}
