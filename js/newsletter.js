import { db } from "./firebase-init.js?v=20260920n";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { validateRealEmailAsync } from "./email-check.js";

function bindNewsletter() {
  const form = document.getElementById("nl-form");
  if (!form || form.dataset.bound === "1") return;
  form.dataset.bound = "1";
  const emailEl = document.getElementById("nl-email");
  const btn = document.getElementById("nl-submit");
  const status = document.getElementById("nl-status");

  const show = (msg, ok) => {
    if (!status) return;
    status.hidden = false;
    status.textContent = msg;
    status.classList.toggle("is-ok", !!ok);
    status.classList.toggle("is-err", !ok);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = String(emailEl?.value || "").trim().toLowerCase();
    const err = await validateRealEmailAsync(email);
    if (err) {
      show(err, false);
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Invio…";
    }
    try {
      await addDoc(collection(db, "newsletter"), {
        email,
        source: "store",
        createdAt: serverTimestamp()
      });
      show("Iscritto. Grazie! Ti avviseremo per drop e offerte.", true);
      form.reset();
    } catch (_) {
      show("Invio non riuscito. Riprova tra un attimo.", false);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Iscriviti";
      }
    }
  });
}

bindNewsletter();
window.addEventListener("gr:navigated", bindNewsletter);
