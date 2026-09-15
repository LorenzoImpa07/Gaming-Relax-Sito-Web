// ==========================================================================
// Inizializzazione Firebase (Auth + Firestore)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
auth.languageCode = "it";
// Stesso account su tutte le schede dello stesso browser (Dashboard → sito già loggato).
export const authReady = setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app);
export { ADMIN_EMAIL };
