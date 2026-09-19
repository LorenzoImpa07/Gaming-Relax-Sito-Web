// ==========================================================================
// Form Contatti — salva davvero la richiesta su Firestore, visibile
// dalla Dashboard nella sezione "Richieste"
// ==========================================================================
import { db, auth, isVerifiedUser } from "./firebase-init.js?v=20260919ad";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { validateRealEmail } from "./email-check.js";

const form = document.getElementById("contact-form");
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = isVerifiedUser(user) ? user : null;
  const emailEl = document.getElementById("email");
  if (emailEl && currentUser?.email) {
    emailEl.value = currentUser.email;
    emailEl.readOnly = true;
  }
});

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = form.querySelector(".form-status");
    const submitBtn = form.querySelector('button[type="submit"]');

    const data = {
      alias: form.querySelector("#alias").value.trim(),
      discord: form.querySelector("#discord").value.trim(),
      email: form.querySelector("#email").value.trim(),
      servizio: form.querySelector("#servizio").value,
      progetto: form.querySelector("#progetto").value.trim(),
      status: "nuova",
      createdAt: serverTimestamp()
    };

    const emailErr = validateRealEmail(data.email);
    if (emailErr) {
      status.textContent = emailErr;
      status.classList.add("visible");
      return;
    }
    if (!currentUser) {
      status.innerHTML = 'Per inviare una richiesta devi <a href="login.html">accedere</a> con un\'email confermata. Così nessuno può scrivere con una casella a caso.';
      status.classList.add("visible");
      return;
    }
    data.email = currentUser.email;
    data.uid = currentUser.uid;

    submitBtn.disabled = true;
    submitBtn.textContent = "Invio in corso...";

    try {
      await addDoc(collection(db, "richieste"), data);
      status.textContent = "Grazie! La tua richiesta è stata inviata. Ti ricontatteremo il prima possibile.";
      status.classList.add("visible");
      form.reset();
    } catch (err) {
      status.textContent = "Si è verificato un errore nell'invio. Riprova, oppure scrivici direttamente su Discord.";
      status.classList.add("visible");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Invia";
    }
  });
}
