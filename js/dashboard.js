// ==========================================================================
// Dashboard admin — gestione Prodotti, Team, Contenuti Home
// Protetta: solo l'account con email === ADMIN_EMAIL può vederla e scrivere
// (la protezione vera è nelle regole di Firestore, questa è solo l'interfaccia)
// ==========================================================================
import { auth, db, ADMIN_EMAIL } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot,
  setDoc, getDoc, serverTimestamp, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// --- Guardia di accesso ---
onAuthStateChanged(auth, (user) => {
  const guard = document.getElementById("dashboard-guard");
  const root = document.getElementById("dashboard-root");

  if (!user || user.email !== ADMIN_EMAIL) {
    guard.innerHTML = user
      ? "<p>Questo account non ha accesso alla Dashboard.<br><a href='index.html' class='btn btn--outline' style='margin-top:16px;'>Torna al sito</a></p>"
      : "<p>Devi accedere con l'account amministratore.<br><a href='login.html' class='btn btn--lime' style='margin-top:16px;'>Vai al login</a></p>";
    guard.style.display = "flex";
    root.style.display = "none";
    return;
  }

  guard.style.display = "none";
  root.style.display = "block";
  document.getElementById("admin-email").textContent = user.email;
  initTabs();
  initProducts();
  initTeam();
  initGallery();
  initRichieste();
  initFaq();
  initPageContent();
  initDesign();
  initGeneral();
  initVouchers();
  initNews();
  initReviews();
  initRestock();
});

document.getElementById("logout-dash")?.addEventListener("click", () => {
  signOut(auth).then(() => { window.location.href = "index.html"; });
});

// --- Tabs ---
function initTabs() {
  const tabs = document.querySelectorAll(".dash-tab");
  const panels = document.querySelectorAll(".dash-panel");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.panel).classList.add("active");
    });
  });
}

// ==========================================================================
// PRODOTTI — sincronizzati in automatico con store.html
// ==========================================================================
function initProducts() {
  const form = document.getElementById("product-form");
  const list = document.getElementById("admin-products-list");
  const colRef = collection(db, "products");
  const cancelBtn = document.getElementById("product-cancel-edit");

  onSnapshot(query(colRef, orderBy("createdAt", "desc")), (snap) => {
    const statEl = document.getElementById("stat-products");
    if (statEl) statEl.textContent = snap.size;

    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessun prodotto ancora. Aggiungine uno dal form.</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const p = docSnap.data();
      const row = document.createElement("div");
      row.className = "admin-row";
      row.dataset.searchName = (p.name || "").toLowerCase();
      row.innerHTML = `
        <img class="admin-row__thumb" src="${escapeHtml(p.imageUrl || "")}" alt="" onerror="this.style.visibility='hidden'">
        <div class="admin-row__info">
          <strong>${escapeHtml(p.name)} ${p.inStock === false ? '<span style="color:#ff8080;">(Esaurito)</span>' : ""}</strong>
          <span>${escapeHtml(p.category)} — ${escapeHtml(p.price)}</span>
        </div>
        <div class="admin-row__actions">
          <a href="prodotto.html?id=${docSnap.id}" target="_blank" class="btn btn--outline" style="padding:8px 14px;font-size:13px;">Vedi pagina</a>
          <button type="button" class="btn btn--outline btn-edit" data-id="${docSnap.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${docSnap.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare definitivamente questo prodotto? Sparirà anche dallo Store.")) {
          await deleteDoc(doc(db, "products", btn.dataset.id));
        }
      });
    });

    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "products", btn.dataset.id));
        const p = snap2.data();
        form.querySelector("#p-name").value = p.name || "";
        form.querySelector("#p-category").value = p.category || "tastiere";
        form.querySelector("#p-price").value = p.price || "";
        form.querySelector("#p-payment-link").value = p.paymentLink || "";
        form.querySelector("#p-desc").value = p.description || "";
        form.querySelector("#p-image").value = p.imageUrl || "";
        form.querySelector("#p-instock").checked = p.inStock !== false;
        form.dataset.editId = btn.dataset.id;
        form.querySelector("button[type=submit]").textContent = "Salva modifiche";
        cancelBtn.style.display = "inline-flex";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: form.querySelector("#p-name").value.trim(),
      category: form.querySelector("#p-category").value,
      price: form.querySelector("#p-price").value.trim(),
      paymentLink: form.querySelector("#p-payment-link").value.trim(),
      description: form.querySelector("#p-desc").value.trim(),
      imageUrl: form.querySelector("#p-image").value.trim(),
      inStock: form.querySelector("#p-instock").checked
    };
    const editId = form.dataset.editId;
    if (editId) {
      await updateDoc(doc(db, "products", editId), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(colRef, data);
    }
    resetProductForm();
  });

  cancelBtn.addEventListener("click", resetProductForm);

  document.getElementById("product-search")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    list.querySelectorAll(".admin-row").forEach((row) => {
      row.style.display = row.dataset.searchName.includes(q) ? "" : "none";
    });
  });

  function resetProductForm() {
    form.reset();
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Aggiungi prodotto";
    cancelBtn.style.display = "none";
  }
}

// ==========================================================================
// TEAM — sincronizzato in automatico con team.html
// ==========================================================================
function initTeam() {
  const form = document.getElementById("team-form");
  const list = document.getElementById("admin-team-list");
  const colRef = collection(db, "team");
  const cancelBtn = document.getElementById("team-cancel-edit");

  onSnapshot(colRef, (snap) => {
    const statEl = document.getElementById("stat-team");
    if (statEl) statEl.textContent = snap.size;

    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessun membro del team ancora. Aggiungine uno dal form.</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const m = docSnap.data();
      const row = document.createElement("div");
      row.className = "admin-row";
      row.dataset.searchName = (m.name || "").toLowerCase();
      row.innerHTML = `
        <img class="admin-row__thumb" src="${escapeHtml(m.photoUrl || "")}" alt="" onerror="this.style.visibility='hidden'">
        <div class="admin-row__info">
          <strong>${escapeHtml(m.name)}</strong>
          <span>${escapeHtml(m.role)} — ${escapeHtml(m.category)}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${docSnap.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${docSnap.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questo membro del team?")) {
          await deleteDoc(doc(db, "team", btn.dataset.id));
        }
      });
    });

    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "team", btn.dataset.id));
        const m = snap2.data();
        form.querySelector("#t-name").value = m.name || "";
        form.querySelector("#t-role").value = m.role || "";
        form.querySelector("#t-category").value = m.category || "tastiere";
        form.querySelector("#t-photo").value = m.photoUrl || "";
        form.dataset.editId = btn.dataset.id;
        form.querySelector("button[type=submit]").textContent = "Salva modifiche";
        cancelBtn.style.display = "inline-flex";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: form.querySelector("#t-name").value.trim(),
      role: form.querySelector("#t-role").value.trim(),
      category: form.querySelector("#t-category").value,
      photoUrl: form.querySelector("#t-photo").value.trim()
    };
    const editId = form.dataset.editId;
    if (editId) {
      await updateDoc(doc(db, "team", editId), data);
    } else {
      await addDoc(colRef, data);
    }
    resetTeamForm();
  });

  cancelBtn.addEventListener("click", resetTeamForm);

  document.getElementById("team-search")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    list.querySelectorAll(".admin-row").forEach((row) => {
      row.style.display = row.dataset.searchName.includes(q) ? "" : "none";
    });
  });

  function resetTeamForm() {
    form.reset();
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Aggiungi membro";
    cancelBtn.style.display = "none";
  }
}

// ==========================================================================
// FAQ — sincronizzate in automatico con faq.html
// ==========================================================================
function initFaq() {
  const form = document.getElementById("faq-form");
  const list = document.getElementById("admin-faq-list");
  const colRef = collection(db, "faq");
  const cancelBtn = document.getElementById("faq-cancel-edit");

  onSnapshot(query(colRef, orderBy("order", "asc")), (snap) => {
    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessuna FAQ ancora. Aggiungine una dal form.</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const f = docSnap.data();
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <div class="admin-row__info">
          <strong>${escapeHtml(f.question)}</strong>
          <span>Ordine: ${escapeHtml(String(f.order ?? "—"))}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${docSnap.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${docSnap.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questa domanda dalle FAQ pubblicate?")) {
          await deleteDoc(doc(db, "faq", btn.dataset.id));
        }
      });
    });

    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "faq", btn.dataset.id));
        const f = snap2.data();
        form.querySelector("#f-question").value = f.question || "";
        form.querySelector("#f-answer").value = f.answer || "";
        form.querySelector("#f-order").value = f.order || 1;
        form.dataset.editId = btn.dataset.id;
        form.querySelector("button[type=submit]").textContent = "Salva modifiche";
        cancelBtn.style.display = "inline-flex";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      question: form.querySelector("#f-question").value.trim(),
      answer: form.querySelector("#f-answer").value.trim(),
      order: parseInt(form.querySelector("#f-order").value, 10) || 1
    };
    const editId = form.dataset.editId;
    if (editId) {
      await updateDoc(doc(db, "faq", editId), data);
    } else {
      await addDoc(colRef, data);
    }
    resetFaqForm();
  });

  cancelBtn.addEventListener("click", resetFaqForm);

  function resetFaqForm() {
    form.reset();
    form.querySelector("#f-order").value = 1;
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Aggiungi domanda";
    cancelBtn.style.display = "none";
  }
}

// ==========================================================================
// TESTI DELLE PAGINE — un form dinamico per pagina, generato da PAGE_FIELDS
// ==========================================================================
const PAGE_FIELDS = {
  home: [
    { key: "heroTitleLine1", label: "Titolo hero — riga 1", type: "input", placeholder: "La tua tastiera." },
    { key: "heroTitleLine2", label: "Titolo hero — riga 2", type: "input", placeholder: "Il tuo pezzo" },
    { key: "heroAccent", label: "Titolo hero — parola evidenziata", type: "input", placeholder: "unico." },
    { key: "heroSubtitle", label: "Sottotitolo hero", type: "textarea", placeholder: "Grafiche custom per tastiere e arte su misura..." },
    { key: "heroCta", label: "Testo pulsante hero", type: "input", placeholder: "Esplora il nostro mondo →" },
    { key: "studioTitle", label: "Titolo sezione \"Un team. Uno studio.\"", type: "textarea", placeholder: "Un team.\nUno studio." },
    { key: "studioText", label: "Testo sezione \"Un team. Uno studio.\"", type: "textarea" },
    { key: "ctaTitle", label: "Titolo banner finale (\"Hai un'idea?\")", type: "textarea", placeholder: "Hai un'idea?\nTrasformiamola in qualcosa di unico." },
    { key: "bgImageUrl", label: "Immagine di sfondo della pagina (opzionale)", type: "url", placeholder: "https://..." }
  ],
  store: [
    { key: "eyebrow", label: "Etichetta sopra il titolo", type: "input", placeholder: "Esplora lo Store" },
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Hardware & Accessori" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" },
    { key: "bgImageUrl", label: "Immagine di sfondo della pagina (opzionale)", type: "url", placeholder: "https://..." }
  ],
  custom: [
    { key: "eyebrow", label: "Etichetta sopra il titolo", type: "input", placeholder: "Il processo" },
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Tu la immagini,\nnoi la costruiamo" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" },
    { key: "bgImageUrl", label: "Immagine di sfondo della pagina (opzionale)", type: "url", placeholder: "https://..." }
  ],
  art: [
    { key: "title", label: "Titolo", type: "textarea", placeholder: "L'arte non ha limiti" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" },
    { key: "bgImageUrl", label: "Immagine di sfondo della pagina (opzionale)", type: "url", placeholder: "https://..." }
  ],
  team: [
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Il nostro team" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" },
    { key: "bgImageUrl", label: "Immagine di sfondo della pagina (opzionale)", type: "url", placeholder: "https://..." }
  ],
  contatti: [
    { key: "eyebrow", label: "Etichetta sopra il titolo", type: "input", placeholder: "Progetti" },
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Iniziamo a\ncostruire" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" },
    { key: "bgImageUrl", label: "Immagine di sfondo della pagina (opzionale)", type: "url", placeholder: "https://..." }
  ],
  novita: [
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Novità & Aggiornamenti" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" },
    { key: "bgImageUrl", label: "Immagine di sfondo della pagina (opzionale)", type: "url", placeholder: "https://..." }
  ],
  recensioni: [
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Cosa dicono di noi" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" },
    { key: "bgImageUrl", label: "Immagine di sfondo della pagina (opzionale)", type: "url", placeholder: "https://..." }
  ]
};

function initPageContent() {
  const pageSelect = document.getElementById("page-select");
  const fieldsContainer = document.getElementById("page-content-fields");
  const form = document.getElementById("page-content-form");
  const statusMsg = document.getElementById("page-content-status");

  function renderFieldsFor(pageKey) {
    const fields = PAGE_FIELDS[pageKey] || [];
    fieldsContainer.innerHTML = fields.map((f) => `
      <div class="field">
        <label for="pf-${f.key}">${f.label}</label>
        ${f.type === "textarea"
          ? `<textarea id="pf-${f.key}" placeholder="${f.placeholder || ""}"></textarea>`
          : f.type === "url"
          ? `<input type="url" id="pf-${f.key}" placeholder="${f.placeholder || ""}">`
          : `<input type="text" id="pf-${f.key}" placeholder="${f.placeholder || ""}">`
        }
      </div>
    `).join("");

    getDoc(doc(db, "siteContent", pageKey)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      fields.forEach((f) => {
        const el = document.getElementById(`pf-${f.key}`);
        if (el && d[f.key]) el.value = d[f.key];
      });
    });
  }

  pageSelect.addEventListener("change", () => renderFieldsFor(pageSelect.value));
  renderFieldsFor(pageSelect.value);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pageKey = pageSelect.value;
    const fields = PAGE_FIELDS[pageKey] || [];
    const data = {};
    fields.forEach((f) => {
      data[f.key] = document.getElementById(`pf-${f.key}`).value.trim();
    });
    await setDoc(doc(db, "siteContent", pageKey), data, { merge: true });

    statusMsg.textContent = "Salvato. Ricarica quella pagina del sito per vedere le modifiche.";
    statusMsg.classList.add("visible");
    setTimeout(() => statusMsg.classList.remove("visible"), 4000);
  });
}

// ==========================================================================
// ASPETTO GRAFICO — colori globali del sito
// ==========================================================================
const DEFAULT_COLORS = {
  limeColor: "#c6ff1a",
  purpleColor: "#9b3dff",
  bgColor: "#0a0d16",
  bgAltColor: "#10141f",
  cardColor: "#14182a",
  logoUrl: ""
};

function initDesign() {
  const form = document.getElementById("design-form");
  const statusMsg = document.getElementById("design-status");
  const resetBtn = document.getElementById("design-reset");
  const preview = document.getElementById("color-preview");
  const ref = doc(db, "siteContent", "design");

  const colorInputs = {
    limeColor: document.getElementById("d-lime"),
    purpleColor: document.getElementById("d-purple"),
    bgColor: document.getElementById("d-bg"),
    bgAltColor: document.getElementById("d-bg-alt"),
    cardColor: document.getElementById("d-card")
  };
  const logoInput = document.getElementById("d-logo");

  function renderPreview() {
    preview.innerHTML = Object.values(colorInputs).map((el) =>
      `<span class="color-swatch" style="background:${el.value}" title="${el.value}"></span>`
    ).join("");
  }
  Object.values(colorInputs).forEach((el) => el.addEventListener("input", renderPreview));
  renderPreview();

  getDoc(ref).then((snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    Object.entries(colorInputs).forEach(([key, el]) => { if (d[key]) el.value = d[key]; });
    if (d.logoUrl) logoInput.value = d.logoUrl;
    renderPreview();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {};
    Object.entries(colorInputs).forEach(([key, el]) => { data[key] = el.value; });
    data.logoUrl = logoInput.value.trim();
    await setDoc(ref, data, { merge: true });

    statusMsg.textContent = "Salvato. Ricarica una pagina qualsiasi del sito per vedere i nuovi colori/logo.";
    statusMsg.classList.add("visible");
    setTimeout(() => statusMsg.classList.remove("visible"), 4000);
  });

  resetBtn.addEventListener("click", async () => {
    if (!confirm("Ripristinare i colori predefiniti del sito e il logo originale?")) return;
    Object.entries(colorInputs).forEach(([key, el]) => { el.value = DEFAULT_COLORS[key]; });
    logoInput.value = "";
    renderPreview();
    await setDoc(ref, DEFAULT_COLORS, { merge: true });
    statusMsg.textContent = "Colori e logo predefiniti ripristinati.";
    statusMsg.classList.add("visible");
    setTimeout(() => statusMsg.classList.remove("visible"), 4000);
  });
}

// ==========================================================================
// CONTATTI & SOCIAL — email, orari, link social, applicati su ogni pagina
// ==========================================================================
function initGeneral() {
  const form = document.getElementById("general-form");
  const statusMsg = document.getElementById("general-status");
  const ref = doc(db, "siteContent", "general");

  const fields = {
    supportEmail: document.getElementById("g-email"),
    hoursWeekday: document.getElementById("g-hours-weekday"),
    hoursWeekend: document.getElementById("g-hours-weekend"),
    discordUrl: document.getElementById("g-discord"),
    youtubeUrl: document.getElementById("g-youtube"),
    instagramUrl: document.getElementById("g-instagram"),
    tiktokUrl: document.getElementById("g-tiktok")
  };

  getDoc(ref).then((snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    Object.entries(fields).forEach(([key, el]) => { if (d[key]) el.value = d[key]; });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {};
    Object.entries(fields).forEach(([key, el]) => { data[key] = el.value.trim(); });
    await setDoc(ref, data, { merge: true });

    statusMsg.textContent = "Salvato. Ricarica una pagina qualsiasi del sito per vedere i nuovi contatti/social.";
    statusMsg.classList.add("visible");
    setTimeout(() => statusMsg.classList.remove("visible"), 4000);
  });
}

// ==========================================================================
// GALLERIA ART — sincronizzata in automatico con art.html
// ==========================================================================
function initGallery() {
  const form = document.getElementById("gallery-form");
  const list = document.getElementById("admin-gallery-list");
  const colRef = collection(db, "gallery");
  const cancelBtn = document.getElementById("gallery-cancel-edit");

  const GALLERY_CATEGORY_LABELS = {
    tastiere: "Tastiere Custom",
    keycaps: "Keycaps",
    setup: "Setup & RGB",
    grafica: "Grafica / Identità visiva"
  };

  onSnapshot(query(colRef, orderBy("createdAt", "desc")), (snap) => {
    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessuna foto ancora. Aggiungine una dal form.</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const g = docSnap.data();
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <img class="admin-row__thumb" src="${escapeHtml(g.imageUrl || "")}" alt="" onerror="this.style.visibility='hidden'">
        <div class="admin-row__info">
          <strong>${escapeHtml(g.caption || "(senza didascalia)")}</strong>
          <span>${escapeHtml(GALLERY_CATEGORY_LABELS[g.category] || g.category || "—")}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${docSnap.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${docSnap.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questa foto dalla galleria pubblicata?")) {
          await deleteDoc(doc(db, "gallery", btn.dataset.id));
        }
      });
    });

    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "gallery", btn.dataset.id));
        const g = snap2.data();
        form.querySelector("#gal-image").value = g.imageUrl || "";
        form.querySelector("#gal-category").value = g.category || "tastiere";
        form.querySelector("#gal-caption").value = g.caption || "";
        form.dataset.editId = btn.dataset.id;
        form.querySelector("button[type=submit]").textContent = "Salva modifiche";
        cancelBtn.style.display = "inline-flex";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      imageUrl: form.querySelector("#gal-image").value.trim(),
      category: form.querySelector("#gal-category").value,
      caption: form.querySelector("#gal-caption").value.trim()
    };
    const editId = form.dataset.editId;
    if (editId) {
      await updateDoc(doc(db, "gallery", editId), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(colRef, data);
    }
    resetGalleryForm();
  });

  cancelBtn.addEventListener("click", resetGalleryForm);

  function resetGalleryForm() {
    form.reset();
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Aggiungi foto";
    cancelBtn.style.display = "none";
  }
}

// ==========================================================================
// VOUCHER — registro interno (codice, staffer/creator, sconto, note)
// ==========================================================================
function initVouchers() {
  const form = document.getElementById("voucher-form");
  const list = document.getElementById("admin-voucher-list");
  const colRef = collection(db, "vouchers");
  const cancelBtn = document.getElementById("voucher-cancel-edit");
  const generateBtn = document.getElementById("v-generate");
  const codeInput = document.getElementById("v-code");

  generateBtn.addEventListener("click", () => {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    codeInput.value = `GR-${random}`;
  });

  onSnapshot(query(colRef, orderBy("createdAt", "desc")), (snap) => {
    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessun voucher ancora. Creane uno dal form.</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const v = docSnap.data();
      const discountLabel = v.discountType === "fisso" ? `${v.discountValue} €` : `${v.discountValue}%`;
      const row = document.createElement("div");
      row.className = "admin-row";
      row.dataset.searchName = `${(v.code || "").toLowerCase()} ${(v.assignedTo || "").toLowerCase()}`;
      row.innerHTML = `
        <div class="admin-row__info">
          <strong>${escapeHtml(v.code)} — ${discountLabel}</strong>
          <span>Assegnato a: ${escapeHtml(v.assignedTo)}${v.notes ? " · " + escapeHtml(v.notes) : ""}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${docSnap.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${docSnap.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questo voucher dal registro? Ricorda di rimuoverlo anche da Stripe, se lo avevi creato lì.")) {
          await deleteDoc(doc(db, "vouchers", btn.dataset.id));
        }
      });
    });

    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "vouchers", btn.dataset.id));
        const v = snap2.data();
        form.querySelector("#v-code").value = v.code || "";
        form.querySelector("#v-assigned").value = v.assignedTo || "";
        form.querySelector("#v-type").value = v.discountType || "percentuale";
        form.querySelector("#v-value").value = v.discountValue || "";
        form.querySelector("#v-notes").value = v.notes || "";
        form.dataset.editId = btn.dataset.id;
        form.querySelector("button[type=submit]").textContent = "Salva modifiche";
        cancelBtn.style.display = "inline-flex";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      code: form.querySelector("#v-code").value.trim().toUpperCase(),
      assignedTo: form.querySelector("#v-assigned").value.trim(),
      discountType: form.querySelector("#v-type").value,
      discountValue: parseFloat(form.querySelector("#v-value").value) || 0,
      notes: form.querySelector("#v-notes").value.trim()
    };
    const editId = form.dataset.editId;
    if (editId) {
      await updateDoc(doc(db, "vouchers", editId), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(colRef, data);
    }
    resetVoucherForm();
  });

  cancelBtn.addEventListener("click", resetVoucherForm);

  document.getElementById("voucher-search")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    list.querySelectorAll(".admin-row").forEach((row) => {
      row.style.display = row.dataset.searchName?.includes(q) ? "" : "none";
    });
  });

  function resetVoucherForm() {
    form.reset();
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Salva voucher";
    cancelBtn.style.display = "none";
  }
}

// ==========================================================================
// RICHIESTE — messaggi inviati dal form Contatti del sito pubblico
// ==========================================================================
function initRichieste() {
  const list = document.getElementById("admin-richieste-list");
  const colRef = collection(db, "richieste");
  let allRichieste = [];
  let activeFilter = "tutte";

  const SERVIZIO_LABELS = {
    "tastiera-custom": "Tastiera Custom",
    "keycaps": "Keycaps / Art",
    "bot": "Sviluppo Bot",
    "consulenza": "Consulenza",
    "grafica": "Grafica / Identità visiva",
    "altro": "Altro"
  };

  function formatDate(ts) {
    if (!ts || typeof ts.toDate !== "function") return "—";
    return ts.toDate().toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function render() {
    const statEl = document.getElementById("stat-richieste");
    if (statEl) statEl.textContent = allRichieste.filter((r) => r.status !== "gestita").length;

    const searchQuery = (document.getElementById("richieste-search")?.value || "").trim().toLowerCase();

    const visible = allRichieste.filter((r) => {
      if (activeFilter !== "tutte" && r.status !== activeFilter) return false;
      if (searchQuery) {
        const haystack = `${r.alias || ""} ${r.email || ""}`.toLowerCase();
        if (!haystack.includes(searchQuery)) return false;
      }
      return true;
    });

    if (visible.length === 0) {
      list.innerHTML = '<p class="empty-hint">Nessuna richiesta trovata.</p>';
      return;
    }

    list.innerHTML = visible.map((r) => `
      <div class="richiesta-card ${r.status === "nuova" ? "is-nuova" : ""}" data-id="${r.id}">
        <div class="richiesta-card__head">
          <strong>${escapeHtml(r.alias || "Anonimo")}</strong>
          <span class="richiesta-badge ${r.status === "nuova" ? "is-nuova" : "is-gestita"}">${r.status === "nuova" ? "Nuova" : "Gestita"}</span>
        </div>
        <div class="richiesta-card__meta">
          <span>✉️ <strong>${escapeHtml(r.email || "—")}</strong></span>
          ${r.discord ? `<span>💬 <strong>${escapeHtml(r.discord)}</strong></span>` : ""}
          <span>🏷️ <strong>${escapeHtml(SERVIZIO_LABELS[r.servizio] || r.servizio || "—")}</strong></span>
          <span>🕒 ${formatDate(r.createdAt)}</span>
        </div>
        <div class="richiesta-card__body">${escapeHtml(r.progetto || "")}</div>
        <div class="richiesta-card__actions">
          <button type="button" class="btn btn--outline btn-toggle-status" data-id="${r.id}" data-current="${r.status}">
            ${r.status === "nuova" ? "Segna come gestita" : "Segna come nuova"}
          </button>
          <button type="button" class="btn btn--outline btn-delete-richiesta" data-id="${r.id}">Elimina</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll(".btn-toggle-status").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const newStatus = btn.dataset.current === "nuova" ? "gestita" : "nuova";
        await updateDoc(doc(db, "richieste", btn.dataset.id), { status: newStatus });
      });
    });
    list.querySelectorAll(".btn-delete-richiesta").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare definitivamente questa richiesta?")) {
          await deleteDoc(doc(db, "richieste", btn.dataset.id));
        }
      });
    });
  }

  onSnapshot(query(colRef, orderBy("createdAt", "desc")), (snap) => {
    allRichieste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  }, () => {
    list.innerHTML = '<p class="empty-hint">Impossibile caricare le richieste al momento.</p>';
  });

  document.querySelectorAll("[data-richieste-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll("[data-richieste-filter]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      activeFilter = pill.dataset.richiesteFilter;
      render();
    });
  });

  document.getElementById("richieste-search")?.addEventListener("input", render);
}

// ==========================================================================
// NOVITÀ / AGGIORNAMENTI — sincronizzati in automatico con novita.html
// ==========================================================================
function initNews() {
  const form = document.getElementById("news-form");
  const list = document.getElementById("admin-news-list");
  const colRef = collection(db, "news");
  const cancelBtn = document.getElementById("news-cancel-edit");

  const NEWS_CATEGORY_LABELS = {
    aggiornamenti: "Aggiornamenti",
    "nuovi-prodotti": "Nuovi Prodotti",
    annunci: "Annunci"
  };

  onSnapshot(query(colRef, orderBy("createdAt", "desc")), (snap) => {
    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessun annuncio ancora. Pubblicane uno dal form.</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const n = docSnap.data();
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <img class="admin-row__thumb" src="${escapeHtml(n.imageUrl || "")}" alt="" onerror="this.style.visibility='hidden'">
        <div class="admin-row__info">
          <strong>${escapeHtml(n.title)}</strong>
          <span>${escapeHtml(NEWS_CATEGORY_LABELS[n.category] || n.category || "—")} · ${escapeHtml((n.body || "").slice(0, 60))}${(n.body || "").length > 60 ? "…" : ""}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${docSnap.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${docSnap.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare definitivamente questo annuncio?")) {
          await deleteDoc(doc(db, "news", btn.dataset.id));
        }
      });
    });

    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "news", btn.dataset.id));
        const n = snap2.data();
        form.querySelector("#n-title").value = n.title || "";
        form.querySelector("#n-category").value = n.category || "aggiornamenti";
        form.querySelector("#n-image").value = n.imageUrl || "";
        form.querySelector("#n-body").value = n.body || "";
        form.dataset.editId = btn.dataset.id;
        form.querySelector("button[type=submit]").textContent = "Salva modifiche";
        cancelBtn.style.display = "inline-flex";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      title: form.querySelector("#n-title").value.trim(),
      category: form.querySelector("#n-category").value,
      imageUrl: form.querySelector("#n-image").value.trim(),
      body: form.querySelector("#n-body").value.trim()
    };
    const editId = form.dataset.editId;
    if (editId) {
      await updateDoc(doc(db, "news", editId), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(colRef, data);
    }
    resetNewsForm();
  });

  cancelBtn.addEventListener("click", resetNewsForm);

  function resetNewsForm() {
    form.reset();
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Pubblica";
    cancelBtn.style.display = "none";
  }
}

// ==========================================================================
// RECENSIONI — moderazione: approva, rifiuta (elimina), consulta
// ==========================================================================
function initReviews() {
  const list = document.getElementById("admin-reviews-list");
  const colRef = collection(db, "reviews");
  let allReviews = [];
  let activeFilter = "pending";

  function stars(rating) {
    const r = Math.round(rating) || 0;
    return "★".repeat(r) + "☆".repeat(5 - r);
  }

  function render() {
    const statEl = document.getElementById("stat-reviews");
    if (statEl) statEl.textContent = allReviews.filter((r) => r.status === "pending").length;

    const visible = activeFilter === "tutte" ? allReviews : allReviews.filter((r) => r.status === activeFilter);

    if (visible.length === 0) {
      list.innerHTML = '<p class="empty-hint">Nessuna recensione qui.</p>';
      return;
    }

    list.innerHTML = visible.map((r) => `
      <div class="richiesta-card ${r.status === "pending" ? "is-nuova" : ""}">
        <div class="richiesta-card__head">
          <strong>${escapeHtml(r.name)}${r.productName ? " — " + escapeHtml(r.productName) : " — Recensione generale"}</strong>
          <span class="richiesta-badge ${r.status === "pending" ? "is-nuova" : "is-gestita"}" style="${r.status === "pending" ? "" : "background:var(--lime);color:#0a0d16;"}">
            ${r.status === "pending" ? "Da approvare" : "Approvata"}
          </span>
        </div>
        <div class="richiesta-card__meta"><span style="color:var(--lime);">${stars(r.rating)}</span></div>
        <div class="richiesta-card__body">${escapeHtml(r.comment || "")}</div>
        ${r.photoUrl ? `<img src="${escapeHtml(r.photoUrl)}" alt="" style="width:100%;max-width:220px;border-radius:10px;border:1px solid var(--border);margin-bottom:14px;display:block;">` : ""}
        <div class="richiesta-card__actions">
          ${r.status !== "approved" ? `<button type="button" class="btn btn--lime btn-approve" data-id="${r.id}">Approva e pubblica</button>` : `<button type="button" class="btn btn--outline btn-unapprove" data-id="${r.id}">Rimuovi pubblicazione</button>`}
          <button type="button" class="btn btn--outline btn-delete-review" data-id="${r.id}">Elimina</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll(".btn-approve").forEach((btn) => {
      btn.addEventListener("click", () => updateDoc(doc(db, "reviews", btn.dataset.id), { status: "approved" }));
    });
    list.querySelectorAll(".btn-unapprove").forEach((btn) => {
      btn.addEventListener("click", () => updateDoc(doc(db, "reviews", btn.dataset.id), { status: "pending" }));
    });
    list.querySelectorAll(".btn-delete-review").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare definitivamente questa recensione?")) {
          await deleteDoc(doc(db, "reviews", btn.dataset.id));
        }
      });
    });
  }

  onSnapshot(query(colRef, orderBy("createdAt", "desc")), (snap) => {
    allReviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  }, () => {
    list.innerHTML = '<p class="empty-hint">Impossibile caricare le recensioni al momento.</p>';
  });

  document.querySelectorAll("[data-review-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll("[data-review-filter]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      activeFilter = pill.dataset.reviewFilter;
      render();
    });
  });
}

// ==========================================================================
// AVVISI RESTOCK — elenco iscritti "avvisami quando torna disponibile"
// ==========================================================================
function initRestock() {
  const list = document.getElementById("admin-restock-list");
  const colRef = collection(db, "restockRequests");

  function formatDate(ts) {
    if (!ts || typeof ts.toDate !== "function") return "—";
    return ts.toDate().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  onSnapshot(query(colRef, orderBy("createdAt", "desc")), (snap) => {
    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessuna iscrizione ancora.</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const r = docSnap.data();
      const row = document.createElement("div");
      row.className = "admin-row";
      row.dataset.searchName = `${(r.productName || "").toLowerCase()} ${(r.email || "").toLowerCase()}`;
      row.innerHTML = `
        <div class="admin-row__info">
          <strong>${escapeHtml(r.productName)} ${r.notified ? '<span style="color:var(--lime);">✓ Contattato</span>' : ""}</strong>
          <span>${escapeHtml(r.email)} · ${formatDate(r.createdAt)}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-toggle-notified" data-id="${docSnap.id}" data-current="${r.notified}">
            ${r.notified ? "Segna come da contattare" : "Segna come contattato"}
          </button>
          <button type="button" class="btn btn--outline btn-delete-restock" data-id="${docSnap.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll(".btn-toggle-notified").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await updateDoc(doc(db, "restockRequests", btn.dataset.id), { notified: btn.dataset.current !== "true" });
      });
    });
    list.querySelectorAll(".btn-delete-restock").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questa iscrizione?")) {
          await deleteDoc(doc(db, "restockRequests", btn.dataset.id));
        }
      });
    });
  }, () => {
    list.innerHTML = '<p class="empty-hint">Impossibile caricare gli avvisi al momento.</p>';
  });

  document.getElementById("restock-search")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    list.querySelectorAll(".admin-row").forEach((row) => {
      row.style.display = row.dataset.searchName?.includes(q) ? "" : "none";
    });
  });
}
