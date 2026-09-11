// ==========================================================================
// Form Contatti — salva davvero la richiesta su Firestore, visibile
// dalla Dashboard nella sezione "Richieste"
// ==========================================================================
import { db } from "./firebase-init.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("contact-form");

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
