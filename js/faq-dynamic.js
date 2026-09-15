// ==========================================================================
// FAQ dinamiche — lette da Firestore (gestite dalla Dashboard)
// ==========================================================================
import { db } from "./firebase-init.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

const list = document.getElementById("faq-list");

function render(items) {
  if (!list) return;

  if (items.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Le domande frequenti saranno pubblicate a breve.</p>';
    return;
  }

  list.innerHTML = items.map((f, i) => `
    <div class="faq-item ${i === 0 ? "open" : ""}">
      <button class="faq-item__q">${escapeHtml(f.question)}<span class="sign">${i === 0 ? "−" : "+"}</span></button>
      <div class="faq-item__a"><p>${escapeHtml(f.answer)}</p></div>
    </div>
  `).join("");

  // Ricollega l'accordion (gli elementi sono stati appena ricreati)
  list.querySelectorAll(".faq-item__q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const wasOpen = item.classList.contains("open");
      list.querySelectorAll(".faq-item.open").forEach((el) => {
        el.classList.remove("open");
        el.querySelector(".sign").textContent = "+";
      });
      if (!wasOpen) {
        item.classList.add("open");
        btn.querySelector(".sign").textContent = "−";
      }
    });
  });
}

onSnapshot(query(collection(db, "faq"), orderBy("order", "asc")), (snap) => {
  render(snap.docs.map((d) => d.data()));
}, () => {
  if (list) list.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Impossibile caricare le domande frequenti al momento.</p>';
});
