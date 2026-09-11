// ==========================================================================
// Configurazione Firebase
// ==========================================================================
// Sostituisci i valori qui sotto con quelli del TUO progetto Firebase.
// Li trovi in: Console Firebase → Project settings → Your apps → (l'app web)
// Questi valori sono pubblici per natura (non sono segreti): la sicurezza
// vera è garantita dalle regole di Firestore (vedi firestore.rules.txt),
// non dal nasconderli.
// ==========================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyCi6hm4mkab-GYlw6gUXp8FrcpMC8zcaVM",
  authDomain: "gaming-relax.firebaseapp.com",
  projectId: "gaming-relax",
  storageBucket: "gaming-relax.firebasestorage.app",
  messagingSenderId: "1037074308546",
  appId: "1:1037074308546:web:ec89ac6de61a6fface0a5b"
};

// Email dell'unico account che può accedere alla Dashboard admin.
export const ADMIN_EMAIL = "gamingrelaxadmin@gmail.com";
