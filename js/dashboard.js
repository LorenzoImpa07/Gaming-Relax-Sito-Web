// ==========================================================================
// Dashboard admin — gestione Prodotti, Team, Contenuti Home
// Protetta: solo l'account con email === ADMIN_EMAIL può vederla e scrivere
// (la protezione vera è nelle regole di Firestore, questa è solo l'interfaccia)
// ==========================================================================
import { auth, db, ADMIN_EMAIL, authReady } from "./firebase-init.js?v=20260920n";
import { bindUploader, bindMultiUploader, setPreview } from "./upload.js?v=20260920n";
import { bindEmailFields } from "./email-check.js";
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

  if (!user || String(user.email || "").trim().toLowerCase() !== String(ADMIN_EMAIL).toLowerCase()) {
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
  const openSite = document.getElementById("dash-open-site");
  if (openSite) {
    openSite.textContent = "Apri il sito ↗";
    openSite.addEventListener("click", async (e) => {
      e.preventDefault();
      try { await authReady; } catch (_) {}
      window.open("index.html", "_blank", "noopener");
    });
  }
  initTabs();
  initProducts();
  initStoreNav();
  initTeam();
  initPartners();
  initGallery();
  initCustomStudio();
  initRichieste();
  initOrders();
  initCheckoutCfg();
  initFaq();
  initPageContent();
  initBackgrounds();
  initDesign();
  initGeneral();
  initVouchers();
  initCreators();
  initNews();
  initReviews();
  initRestock();
  initNewsletter();
  initBanner();
  initStaffTags();
  initForumCategories();
  initForumBoards();
  initUsers();
  initForumRoles();
  initPex();
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
function withEuro(str) {
  const t = String(str || "").trim();
  if (!t) return t;
  if (/preventivo|richiesta|n\/a|gratis|free/i.test(t)) return t;
  if (!/\d/.test(t)) return t;
  const cleaned = t.replace(/\s*€\s*/gi, " ").replace(/\s*eur(o)?s?\s*/gi, " ").replace(/\s+/g, " ").trim();
  return cleaned + " €";
}

function initProducts() {
  const form = document.getElementById("product-form");
  const list = document.getElementById("admin-products-list");
  const colRef = collection(db, "products");
  const cancelBtn = document.getElementById("product-cancel-edit");
  bindUploader({ fileId: "p-image-file", hiddenId: "p-image", previewId: "p-image-preview", statusId: "p-image-status", folder: "products" });
  bindMultiUploader({ fileId: "p-gallery-file", hiddenId: "p-gallery", statusId: "p-gallery-status", folder: "products" });

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
          <strong>${escapeHtml(p.name)} ${p.inStock === false ? '<span style="color:#ff8080;">(Esaurito)</span>' : ""}${p.onSale ? ' <span style="color:#ff7a1a;">(In offerta)</span>' : ""}</strong>
          <span>${escapeHtml(p.category)} — ${escapeHtml(p.price)}${p.onSale && (p.salePercent || p.salePrice) ? " → " + escapeHtml(p.salePrice || ("-" + p.salePercent + "%")) : ""}</span>
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
        fillProductSubs(p.subcategory || "");
        form.querySelector("#p-price").value = p.price || "";
        const os = form.querySelector("#p-onsale"); if (os) os.checked = !!p.onSale;
        const sp = form.querySelector("#p-sale-percent"); if (sp) sp.value = p.salePercent || "";
        const spr = form.querySelector("#p-sale-price"); if (spr) spr.value = p.salePrice || "";
        form.querySelector("#p-payment-link").value = p.paymentLink || "";
        form.querySelector("#p-desc").value = p.description || "";
        form.querySelector("#p-image").value = p.imageUrl || "";
        setPreview(document.getElementById("p-image-preview"), p.imageUrl || "");
        const g = form.querySelector("#p-gallery"); if (g) g.value = p.galleryUrls || "";
        const b = form.querySelector("#p-brand"); if (b) b.value = p.brand || "";
        const vl = form.querySelector("#p-variant-label"); if (vl) vl.value = p.variantLabel || "";
        const vo = form.querySelector("#p-variants"); if (vo) vo.value = p.variantOptions || "";
        const sh = form.querySelector("#p-shipping"); if (sh) sh.value = p.shippingNote || "";
        const lt = form.querySelector("#p-leadtime"); if (lt) lt.value = p.leadTime || "";
        const hm = form.querySelector("#p-handmade"); if (hm) hm.checked = !!p.handmade;
        const qt = form.querySelector("#p-quote"); if (qt) qt.checked = !!p.onQuote;
        const dt = form.querySelector("#p-details"); if (dt) dt.value = p.details || "";
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
      subcategory: form.querySelector("#p-subcategory")?.value || "",
      price: withEuro(form.querySelector("#p-price").value.trim()),
      onSale: !!form.querySelector("#p-onsale")?.checked,
      salePercent: Number(form.querySelector("#p-sale-percent")?.value) || 0,
      salePrice: withEuro(form.querySelector("#p-sale-price")?.value.trim() || ""),
      paymentLink: form.querySelector("#p-payment-link").value.trim(),
      description: form.querySelector("#p-desc").value.trim(),
      imageUrl: form.querySelector("#p-image").value.trim(),
      galleryUrls: form.querySelector("#p-gallery")?.value.trim() || "",
      brand: form.querySelector("#p-brand")?.value.trim() || "",
      variantLabel: form.querySelector("#p-variant-label")?.value.trim() || "",
      variantOptions: form.querySelector("#p-variants")?.value.trim() || "",
      shippingNote: form.querySelector("#p-shipping")?.value.trim() || "",
      leadTime: form.querySelector("#p-leadtime")?.value.trim() || "",
      handmade: !!form.querySelector("#p-handmade")?.checked,
      onQuote: !!form.querySelector("#p-quote")?.checked,
      details: form.querySelector("#p-details")?.value.trim() || "",
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

  ["#p-price", "#p-sale-price"].forEach((sel) => {
    form.querySelector(sel)?.addEventListener("blur", (e) => {
      e.target.value = withEuro(e.target.value);
    });
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
    fillProductSubs();
  }
}

function slugify(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "item";
}

const STORE_NAV_VERSION = 2;
const STORE_NAV_DEFAULTS = [
  { id: "tastiere", label: "Tastiere Custom", items: [], order: 1 },
  { id: "tastiere_preassemblate", label: "Tastiere Preassemblate", items: [], order: 2 },
  { id: "keycaps", label: "Keycaps", order: 3, items: [
    { id: "tattile", label: "Tattile" },
    { id: "lineare", label: "Lineare" },
    { id: "interruttori_a_scatto", label: "Interruttori a scatto" }
  ]},
  { id: "accessori", label: "Accessori", order: 4, items: [
    { id: "lubrificante", label: "Lubrificante" },
    { id: "pinza_togli_keycaps", label: "Pinza togli keycaps" },
    { id: "pennello", label: "Pennello" }
  ]},
  { id: "servizi", label: "Servizi tech", order: 5, items: [
    { id: "riparazioni_elettroniche", label: "Riparazioni elettroniche" },
    { id: "consulenze_pc", label: "Consulenze per componenti di PC" },
    { id: "assemblaggio_pc", label: "Assemblaggio di PC" },
    { id: "creazione_siti_web", label: "Creazione siti web" }
  ]}
];

function migrateStoreNav(groups) {
  if (!Array.isArray(groups) || !groups.length) return STORE_NAV_DEFAULTS.slice();
  const next = groups.map((g) => ({ ...g, items: Array.isArray(g.items) ? g.items.slice() : [] }));
  const keycaps = next.find((g) => g.id === "keycaps");
  const servizi = next.find((g) => g.id === "servizi");
  const oldServizi = new Set(["tattile", "lineare", "interruttori_a_scatto"]);
  const serviziIsOld = servizi && (servizi.items || []).some((i) => oldServizi.has(i.id));
  if (keycaps && servizi && serviziIsOld) {
    keycaps.items = (servizi.items || []).slice();
    servizi.items = STORE_NAV_DEFAULTS.find((g) => g.id === "servizi").items.slice();
  }
  return next;
}

let storeNavGroups = STORE_NAV_DEFAULTS.slice();

function fillProductCats(selectedCat, selectedSub) {
  const cat = document.getElementById("p-category");
  if (!cat) return;
  const keep = selectedCat || cat.value;
  cat.innerHTML = storeNavGroups.map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.label)}</option>`).join("");
  if ([...cat.options].some((o) => o.value === keep)) cat.value = keep;
  fillProductSubs(selectedSub);
}

function fillProductSubs(selectedSub) {
  const cat = document.getElementById("p-category");
  const wrap = document.getElementById("p-subcategory-wrap");
  const sub = document.getElementById("p-subcategory");
  if (!wrap || !sub || !cat) return;
  const g = storeNavGroups.find((x) => x.id === cat.value);
  const items = Array.isArray(g?.items) ? g.items : [];
  if (!items.length) {
    wrap.style.display = "none";
    sub.innerHTML = '<option value="">—</option>';
    return;
  }
  wrap.style.display = "";
  sub.innerHTML = '<option value="">Tutti / nessuna sottocategoria</option>' +
    items.map((i) => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.label)}</option>`).join("");
  if (selectedSub && [...sub.options].some((o) => o.value === selectedSub)) sub.value = selectedSub;
}

function initStoreNav() {
  const form = document.getElementById("store-nav-form");
  const list = document.getElementById("store-nav-list");
  const cancelBtn = document.getElementById("store-nav-cancel");
  const statusMsg = document.getElementById("store-nav-status");
  const ref = doc(db, "siteContent", "storeNav");
  if (!form || !list) return;

  function renderList() {
    if (!storeNavGroups.length) {
      list.innerHTML = '<p class="empty-hint">Nessuna categoria. Aggiungine una dal form.</p>';
      return;
    }
    const sorted = storeNavGroups.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    list.innerHTML = "";
    sorted.forEach((g) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      const subs = (g.items || []).map((i) => i.label).join(" · ") || "filtro semplice (niente tendina)";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(g.label)}</strong>
          <span>${escapeHtml(subs)}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${escapeHtml(g.id)}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${escapeHtml(g.id)}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });
    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const g = storeNavGroups.find((x) => x.id === btn.dataset.id);
        if (!g) return;
        form.querySelector("#sn-label").value = g.label;
        form.querySelector("#sn-items").value = (g.items || []).map((i) => i.label).join("\n");
        form.querySelector("#sn-order").value = g.order || 1;
        form.dataset.editId = g.id;
        form.querySelector("button[type=submit]").textContent = "Salva modifiche";
        cancelBtn.style.display = "inline-flex";
      });
    });
    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Eliminare questa categoria dal menu Store?")) return;
        storeNavGroups = storeNavGroups.filter((x) => x.id !== btn.dataset.id);
        await setDoc(ref, { groups: storeNavGroups, version: STORE_NAV_VERSION }, { merge: true });
      });
    });
  }

  onSnapshot(ref, (snap) => {
    const data = snap.exists() ? snap.data() : {};
    const groups = Array.isArray(data.groups) && data.groups.length ? data.groups : STORE_NAV_DEFAULTS.slice();
    if ((data.version || 0) < STORE_NAV_VERSION) {
      storeNavGroups = migrateStoreNav(groups);
      setDoc(ref, { groups: storeNavGroups, version: STORE_NAV_VERSION }, { merge: true }).catch(() => {});
    } else {
      storeNavGroups = groups;
    }
    fillProductCats();
    renderList();
  });

  document.getElementById("p-category")?.addEventListener("change", () => fillProductSubs());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const label = form.querySelector("#sn-label").value.trim();
    if (!label) return;
    const editId = form.dataset.editId;
    const id = editId || slugify(label);
    const seen = {};
    const items = form.querySelector("#sn-items").value.split("\n").map((l) => l.trim()).filter(Boolean).map((lab) => {
      let sid = slugify(lab);
      if (seen[sid]) { seen[sid] += 1; sid = sid + "_" + seen[sid]; }
      else seen[sid] = 1;
      return { id: sid, label: lab };
    });
    const group = { id, label, items, order: Number(form.querySelector("#sn-order").value) || 1 };
    const idx = storeNavGroups.findIndex((x) => x.id === id);
    if (idx >= 0) storeNavGroups[idx] = group;
    else storeNavGroups.push(group);
    await setDoc(ref, { groups: storeNavGroups, version: STORE_NAV_VERSION }, { merge: true });
    form.reset();
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Salva categoria";
    cancelBtn.style.display = "none";
    if (statusMsg) {
      statusMsg.textContent = "Categoria salvata. Si vede nello Store.";
      statusMsg.classList.add("visible");
      setTimeout(() => statusMsg.classList.remove("visible"), 3000);
    }
  });

  cancelBtn?.addEventListener("click", () => {
    form.reset();
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Salva categoria";
    cancelBtn.style.display = "none";
  });
}

// ==========================================================================
// TEAM — sincronizzato in automatico con team.html
// ==========================================================================
function initTeam() {
  const form = document.getElementById("team-form");
  const list = document.getElementById("admin-team-list");
  const colRef = collection(db, "team");
  const cancelBtn = document.getElementById("team-cancel-edit");
  bindUploader({ fileId: "t-photo-file", hiddenId: "t-photo", previewId: "t-photo-preview", statusId: "t-photo-status", folder: "team" });

  onSnapshot(colRef, (snap) => {
    const statEl = document.getElementById("stat-team");
    if (statEl) statEl.textContent = snap.size;

    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessun membro del team ancora. Aggiungine uno dal form.</p>';
      return;
    }
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999) || String(a.name || "").localeCompare(String(b.name || ""), "it"));
    list.innerHTML = "";
    rows.forEach((m) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.dataset.searchName = (m.name || "").toLowerCase();
      row.innerHTML = `
        <img class="admin-row__thumb" src="${escapeHtml(m.photoUrl || "")}" alt="" onerror="this.style.visibility='hidden'">
        <div class="admin-row__info">
          <strong>${escapeHtml(m.name)} <span style="color:var(--text-dim);font-weight:500;font-size:12px;">#${Number(m.order) || "—"}</span></strong>
          <span>${escapeHtml(m.role)} — ${escapeHtml(m.category)}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${m.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${m.id}">Elimina</button>
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
        setPreview(document.getElementById("t-photo-preview"), m.photoUrl || "");
        form.querySelector("#t-order").value = m.order || 1;
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
      photoUrl: form.querySelector("#t-photo").value.trim(),
      order: Number(form.querySelector("#t-order")?.value) || 1
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

function initPartners() {
  const form = document.getElementById("partner-form");
  const list = document.getElementById("admin-partners-list");
  const colRef = collection(db, "partners");
  const cancelBtn = document.getElementById("partner-cancel-edit");
  if (!form || !list) return;
  bindUploader({ fileId: "pt-logo-file", hiddenId: "pt-logo", previewId: "pt-logo-preview", statusId: "pt-logo-status", folder: "logo" });

  function resetPartnerForm() {
    form.reset();
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Salva partner";
    cancelBtn.style.display = "none";
    setPreview(document.getElementById("pt-logo-preview"), "");
  }

  onSnapshot(colRef, (snap) => {
    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessun partner. Aggiungine uno dal form.</p>';
      return;
    }
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999) || String(a.name || "").localeCompare(String(b.name || ""), "it"));
    list.innerHTML = "";
    rows.forEach((p) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <img class="admin-row__thumb" src="${escapeHtml(p.logoUrl || "")}" alt="" onerror="this.style.visibility='hidden'">
        <div class="admin-row__info">
          <strong>${escapeHtml(p.name)} <span style="color:var(--text-dim);font-weight:500;font-size:12px;">#${Number(p.order) || "—"}</span></strong>
          <span>${escapeHtml(p.url || "")}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${p.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${p.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });
    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questo partner?")) await deleteDoc(doc(db, "partners", btn.dataset.id));
      });
    });
    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "partners", btn.dataset.id));
        const p = snap2.data() || {};
        form.querySelector("#pt-name").value = p.name || "";
        form.querySelector("#pt-url").value = p.url || "";
        form.querySelector("#pt-logo").value = p.logoUrl || "";
        form.querySelector("#pt-order").value = p.order || 1;
        setPreview(document.getElementById("pt-logo-preview"), p.logoUrl || "");
        form.dataset.editId = btn.dataset.id;
        form.querySelector("button[type=submit]").textContent = "Salva modifiche";
        cancelBtn.style.display = "inline-flex";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let url = form.querySelector("#pt-url").value.trim();
    if (url && !/^https?:\/\//i.test(url) && !url.startsWith("mailto:")) url = "https://" + url;
    const data = {
      name: form.querySelector("#pt-name").value.trim(),
      url,
      logoUrl: form.querySelector("#pt-logo").value.trim(),
      order: Number(form.querySelector("#pt-order")?.value) || 1
    };
    const editId = form.dataset.editId;
    if (editId) await updateDoc(doc(db, "partners", editId), data);
    else await addDoc(colRef, data);
    resetPartnerForm();
  });

  cancelBtn?.addEventListener("click", resetPartnerForm);
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
    { key: "heroKicker", label: "Riga piccola sopra il titolo (es. Custom keyboards · Italia)", type: "input", placeholder: "Custom keyboards · Italia" },
    { key: "heroTitleLine1", label: "Titolo hero — riga 1", type: "input", placeholder: "La tua tastiera." },
    { key: "heroTitleLine2", label: "Titolo hero — riga 2", type: "input", placeholder: "Il tuo pezzo" },
    { key: "heroAccent", label: "Titolo hero — parola evidenziata", type: "input", placeholder: "unico." },
    { key: "heroSubtitle", label: "Sottotitolo hero", type: "textarea", placeholder: "Grafiche custom per tastiere e arte su misura..." },
    { key: "heroCta", label: "Testo pulsante hero", type: "input", placeholder: "Esplora il nostro mondo →" },
    { key: "heroCtaAbout", label: "Testo pulsante hero Chi siamo", type: "input", placeholder: "Chi siamo →" },
    { key: "heroSideImage", label: "Immagine a destra — Hero (Home)", type: "image" },
    { key: "newsSubtitle", label: "Sottotitolo sezione Novità in Home (testo grigio)", type: "textarea", placeholder: "Annunci, nuovi prodotti..." },
    { key: "storeTitle", label: "Titolo vetrina Store in Home", type: "input", placeholder: "Dal nostro Store" },
    { key: "storeSubtitle", label: "Sottotitolo vetrina Store in Home", type: "textarea", placeholder: "Una selezione di prodotti..." },
    { key: "storeSideImage", label: "Immagine a destra — sezione Store (Home)", type: "image" },
    { key: "studioTitle", label: "Titolo sezione \"Un team. Uno studio.\"", type: "textarea", placeholder: "Un team.\nUno studio." },
    { key: "studioText", label: "Testo sezione \"Un team. Uno studio.\"", type: "textarea" },
    { key: "studioSideImage", label: "Immagine a destra — sezione Team (Home)", type: "image" },
    { key: "ctaTitle", label: "Titolo banner finale (\"Hai un'idea?\")", type: "textarea", placeholder: "Hai un'idea?\nTrasformiamola in qualcosa di unico." },
    { key: "partnersTitle", label: "Titolo sezione Partner", type: "input", placeholder: "Partner" },
    { key: "partnersSubtitle", label: "Sottotitolo sezione Partner", type: "textarea", placeholder: "I brand e gli studi con cui collaboriamo." }
  ],
  store: [
    { key: "eyebrow", label: "Etichetta sopra il titolo", type: "input", placeholder: "Esplora lo Store" },
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Hardware & Accessori" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" },
    { key: "footNote", label: "Nota in basso (testo grigio piccolo)", type: "textarea", placeholder: "I prodotti sono gestiti dallo staff..." }
  ],
  custom: [
    { key: "eyebrow", label: "Etichetta sopra il titolo", type: "input", placeholder: "Il processo" },
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Tu la immagini,\nnoi la costruiamo" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" }
  ],
  art: [
    { key: "title", label: "Titolo", type: "textarea", placeholder: "L'arte non ha limiti" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" }
  ],
  team: [
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Il nostro team" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" },
    { key: "footNote", label: "Nota in basso (testo grigio piccolo)", type: "textarea", placeholder: "Il team è gestito dallo staff..." }
  ],
  contatti: [
    { key: "eyebrow", label: "Etichetta sopra il titolo", type: "input", placeholder: "Progetti" },
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Iniziamo a\ncostruire" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" }
  ],
  novita: [
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Novità & Aggiornamenti" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" }
  ],
  forum: [
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Forum della Community" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" }
  ],
  recensioni: [
    { key: "title", label: "Titolo", type: "textarea", placeholder: "Cosa dicono di noi" },
    { key: "subtitle", label: "Sottotitolo", type: "textarea" }
  ]
};

function initPageContent() {
  const pageSelect = document.getElementById("page-select");
  const fieldsContainer = document.getElementById("page-content-fields");
  const form = document.getElementById("page-content-form");
  const statusMsg = document.getElementById("page-content-status");

  function renderFieldsFor(pageKey) {
    const fields = PAGE_FIELDS[pageKey] || [];
    fieldsContainer.innerHTML = fields.map((f) => {
      if (f.type === "image") {
        return `<div class="field">
          <label>${f.label}</label>
          <input type="file" id="pf-${f.key}-file" accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif">
          <input type="hidden" id="pf-${f.key}">
          <img id="pf-${f.key}-preview" class="file-preview" alt="">
          <p class="file-status" id="pf-${f.key}-status"></p>
        </div>`;
      }
      return `<div class="field">
        <label for="pf-${f.key}">${f.label}</label>
        ${f.type === "textarea"
          ? `<textarea id="pf-${f.key}" placeholder="${f.placeholder || ""}"></textarea>`
          : f.type === "url"
          ? `<input type="url" id="pf-${f.key}" placeholder="${f.placeholder || ""}">`
          : `<input type="text" id="pf-${f.key}" placeholder="${f.placeholder || ""}">`
        }
      </div>`;
    }).join("");

    fields.filter((f) => f.type === "image").forEach((f) => {
      bindUploader({
        fileId: "pf-" + f.key + "-file",
        hiddenId: "pf-" + f.key,
        previewId: "pf-" + f.key + "-preview",
        statusId: "pf-" + f.key + "-status",
        folder: "pages"
      });
    });

    getDoc(doc(db, "siteContent", pageKey)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      fields.forEach((f) => {
        const el = document.getElementById(`pf-${f.key}`);
        if (el && d[f.key]) {
          el.value = d[f.key];
          if (f.type === "image") setPreview(document.getElementById("pf-" + f.key + "-preview"), d[f.key]);
        }
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

const BG_DEFAULTS = {
  home: { bgStyle: "aurora", bgOverlay: 55, bgMotion: true },
  store: { bgStyle: "grid", bgOverlay: 62, bgMotion: true },
  custom: { bgStyle: "cinematic", bgOverlay: 58, bgMotion: true },
  art: { bgStyle: "particles", bgOverlay: 60, bgMotion: true },
  novita: { bgStyle: "aurora", bgOverlay: 62, bgMotion: true },
  forum: { bgStyle: "grid", bgOverlay: 68, bgMotion: true },
  team: { bgStyle: "cinematic", bgOverlay: 60, bgMotion: true },
  recensioni: { bgStyle: "aurora", bgOverlay: 62, bgMotion: true },
  contatti: { bgStyle: "cinematic", bgOverlay: 60, bgMotion: true },
  faq: { bgStyle: "grid", bgOverlay: 70, bgMotion: true },
  login: { bgStyle: "aurora", bgOverlay: 70, bgMotion: true },
  register: { bgStyle: "aurora", bgOverlay: 70, bgMotion: true }
};

function initBackgrounds() {
  const form = document.getElementById("bg-form");
  const pageSel = document.getElementById("bg-page");
  const overlay = document.getElementById("bg-overlay");
  const overlayVal = document.getElementById("bg-overlay-val");
  const statusMsg = document.getElementById("bg-status");
  if (!form || !pageSel) return;
  bindUploader({ fileId: "bg-image-file", hiddenId: "bg-image", previewId: "bg-preview", statusId: "bg-preview-hint", folder: "backgrounds" });

  overlay?.addEventListener("input", () => {
    if (overlayVal) overlayVal.textContent = overlay.value + "%";
  });

  async function loadPage(key) {
    const fallback = BG_DEFAULTS[key] || BG_DEFAULTS.home;
    let d = {};
    try {
      const snap = await getDoc(doc(db, "siteContent", key));
      if (snap.exists()) d = snap.data();
    } catch (_) {}
    form.querySelector("#bg-image").value = d.bgImageUrl || "";
    form.querySelector("#bg-video").value = d.bgVideoUrl || "";
    form.querySelector("#bg-style").value = d.bgStyle || fallback.bgStyle;
    overlay.value = d.bgOverlay != null && d.bgOverlay !== "" ? d.bgOverlay : fallback.bgOverlay;
    if (overlayVal) overlayVal.textContent = overlay.value + "%";
    form.querySelector("#bg-motion").checked = d.bgMotion !== false && d.bgMotion !== "false";
    setPreview(document.getElementById("bg-preview"), d.bgImageUrl || "");
  }

  pageSel.addEventListener("change", () => loadPage(pageSel.value));
  loadPage(pageSel.value);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = pageSel.value;
    const payload = {
      bgImageUrl: form.querySelector("#bg-image").value.trim(),
      bgVideoUrl: form.querySelector("#bg-video").value.trim(),
      bgStyle: form.querySelector("#bg-style").value,
      bgOverlay: Number(overlay.value),
      bgMotion: form.querySelector("#bg-motion").checked
    };
    await setDoc(doc(db, "siteContent", key), payload, { merge: true });
    try {
      const all = JSON.parse(localStorage.getItem("gr_bgs") || "{}");
      all[key] = { image: payload.bgImageUrl, video: payload.bgVideoUrl, style: payload.bgStyle, overlay: payload.bgOverlay, motion: payload.bgMotion };
      localStorage.setItem("gr_bgs", JSON.stringify(all));
    } catch (_) {}
    statusMsg.textContent = "Sfondo salvato. Apri quella pagina e fai Ctrl+Shift+R.";
    statusMsg.classList.add("visible");
    setTimeout(() => statusMsg.classList.remove("visible"), 4000);
  });
}

// ==========================================================================
// ASPETTO GRAFICO — colori globali del sito
// ==========================================================================
const DEFAULT_COLORS = {
  limeColor: "#ff4dad",
  purpleColor: "#8b3dff",
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
  bindUploader({ fileId: "d-logo-file", hiddenId: "d-logo", previewId: "d-logo-preview", statusId: "d-logo-status", folder: "logo" });

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
    if (/^#ff4dad$/i.test(colorInputs.limeColor.value) || /^#d4ff00$/i.test(colorInputs.limeColor.value)) {
      colorInputs.limeColor.value = "#ff4dad";
      setDoc(ref, { limeColor: "#ff4dad", purpleColor: colorInputs.purpleColor.value || "#8b3dff" }, { merge: true });
    }
    if (d.logoUrl) { logoInput.value = d.logoUrl; setPreview(document.getElementById("d-logo-preview"), d.logoUrl); }
    renderPreview();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {};
    Object.entries(colorInputs).forEach(([key, el]) => { data[key] = el.value; });
    data.logoUrl = logoInput.value.trim();
    try { localStorage.setItem("gr_design", JSON.stringify(data)); } catch (_) {}
    Object.entries(colorInputs).forEach(([key, el]) => {
      const map = { limeColor: "--lime", purpleColor: "--purple", bgColor: "--bg", bgAltColor: "--bg-alt", cardColor: "--card-solid" };
      if (map[key]) document.documentElement.style.setProperty(map[key], el.value);
    });
    document.documentElement.style.setProperty("--lime-dim", data.limeColor + "33");
    document.documentElement.style.setProperty("--purple-dim", data.purpleColor + "33");
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
    tiktokUrl: document.getElementById("g-tiktok"),
    paypalMeUrl: document.getElementById("g-paypal"),
    telegramUrl: document.getElementById("g-telegram"),
    replyTime: document.getElementById("g-reply"),
    studioLocation: document.getElementById("g-location"),
    footerCopy: document.getElementById("g-footer-copy"),
    aboutTitle: document.getElementById("g-about-title"),
    aboutFooter: document.getElementById("g-about-footer"),
    aboutBody: document.getElementById("g-about-body")
  };

  getDoc(ref).then((snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    Object.entries(fields).forEach(([key, el]) => { if (el && d[key]) el.value = d[key]; });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {};
    Object.entries(fields).forEach(([key, el]) => { data[key] = el.value.trim(); });
    await setDoc(ref, data, { merge: true });
    try {
      localStorage.setItem("gr_socials", JSON.stringify({
        discord: data.discordUrl || "https://discord.gg/5MxfYT7C5f",
        youtube: data.youtubeUrl || "https://www.youtube.com/@gamingrelaxofficials",
        instagram: data.instagramUrl || "https://www.instagram.com/gamingrelaxofficials/",
        tiktok: data.tiktokUrl || "https://www.tiktok.com/@gamingrelaxofficials",
        email: data.supportEmail ? ("mailto:" + data.supportEmail) : "mailto:gamingrelaxofficials@gmail.com"
      }));
    } catch (_) {}

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
  bindUploader({ fileId: "gal-image-file", hiddenId: "gal-image", previewId: "gal-image-preview", statusId: "gal-image-status", folder: "gallery" });

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
          <strong>${escapeHtml(g.title || g.caption || "(senza titolo)")}</strong>
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
        setPreview(document.getElementById("gal-image-preview"), g.imageUrl || "");
        form.querySelector("#gal-category").value = g.category || "tastiere";
        form.querySelector("#gal-caption").value = g.caption || "";
        form.querySelector("#gal-title").value = g.title || "";
        form.querySelector("#gal-description").value = g.description || "";
        form.querySelector("#gal-technique").value = g.technique || "";
        form.querySelector("#gal-year").value = g.year || "";
        form.querySelector("#gal-link").value = g.link || "";
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
      caption: form.querySelector("#gal-caption").value.trim(),
      title: form.querySelector("#gal-title").value.trim(),
      description: form.querySelector("#gal-description").value.trim(),
      technique: form.querySelector("#gal-technique").value.trim(),
      year: form.querySelector("#gal-year").value.trim(),
      link: form.querySelector("#gal-link").value.trim()
    };
    if (!data.imageUrl) {
      alert("Carica un'immagine con Sfoglia.");
      return;
    }
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
    syncPublicVouchers(snap);
    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessun voucher ancora. Creane uno dal form.</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const v = docSnap.data();
      const discountLabel = v.discountType === "fisso" ? `${v.discountValue} €` : `${v.discountValue}%`;
      const on = v.active !== false;
      const row = document.createElement("div");
      row.className = "admin-row";
      row.dataset.searchName = `${(v.code || "").toLowerCase()} ${(v.assignedTo || "").toLowerCase()}`;
      row.innerHTML = `
        <div class="admin-row__info">
          <strong>${escapeHtml(v.code)} — ${discountLabel}${on ? "" : " (disattivo)"}</strong>
          <span>${v.assignedTo ? "Assegnato a: " + escapeHtml(v.assignedTo) : "Valido in cassa"}${v.notes ? " · " + escapeHtml(v.notes) : ""}</span>
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
        const act = form.querySelector("#v-active"); if (act) act.checked = v.active !== false;
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
      notes: form.querySelector("#v-notes").value.trim(),
      active: form.querySelector("#v-active") ? form.querySelector("#v-active").checked : true
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
    const act = form.querySelector("#v-active"); if (act) act.checked = true;
  }
}

function syncPublicVouchers(snap) {
  const codes = {};
  snap.forEach((d) => {
    const v = d.data();
    if (!v.code || v.active === false) return;
    codes[String(v.code).toUpperCase()] = {
      discountType: v.discountType || "percentuale",
      discountValue: Number(v.discountValue) || 0
    };
  });
  setDoc(doc(db, "siteContent", "publicVouchers"), { codes }, { merge: false }).catch(() => {});
}

// ==========================================================================
// CODICI CREATORE — commissione % + sconto cliente opzionale
// ==========================================================================
function initCreators() {
  const form = document.getElementById("creator-form");
  const list = document.getElementById("admin-creator-list");
  const cancelBtn = document.getElementById("creator-cancel-edit");
  if (!form || !list) return;
  const colRef = collection(db, "creators");
  let creators = [];
  let orders = [];

  document.getElementById("cr-generate")?.addEventListener("click", () => {
    form.querySelector("#cr-code").value = "CR-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  });

  function euro(n) {
    return (Number(n) || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
  }

  function statsFor(code) {
    const rows = orders.filter((o) => String(o.creatorCode || "").toUpperCase() === String(code || "").toUpperCase());
    const earned = rows.reduce((s, o) => s + (Number(o.creatorCommission) || 0), 0);
    return { uses: rows.length, earned };
  }

  function render() {
    const q = (document.getElementById("creator-search")?.value || "").trim().toLowerCase();
    const vis = creators.filter((c) => {
      if (!q) return true;
      return `${c.code} ${c.name} ${c.email}`.toLowerCase().includes(q);
    });
    if (!vis.length) {
      list.innerHTML = '<p class="empty-hint">Nessun codice creatore. Creane uno dal form.</p>';
      return;
    }
    list.innerHTML = "";
    vis.forEach((c) => {
      const st = statsFor(c.code);
      const on = c.active !== false;
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <div class="admin-row__info">
          <strong>${escapeHtml(c.code)} — ${escapeHtml(c.name || "")}${on ? "" : " (disattivo)"}</strong>
          <span>Creator ${Number(c.commission) || 0}% · sconto cliente ${Number(c.discount) || 0}% · ${st.uses} usi · guadagno ${euro(st.earned)}${c.email ? " · " + escapeHtml(c.email) : ""}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${c.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${c.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });
    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questo codice creatore?")) await deleteDoc(doc(db, "creators", btn.dataset.id));
      });
    });
    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", () => {
        const c = creators.find((x) => x.id === btn.dataset.id);
        if (!c) return;
        form.querySelector("#cr-code").value = c.code || "";
        form.querySelector("#cr-name").value = c.name || "";
        form.querySelector("#cr-email").value = c.email || "";
        form.querySelector("#cr-commission").value = c.commission ?? 10;
        form.querySelector("#cr-discount").value = c.discount ?? 0;
        form.querySelector("#cr-notes").value = c.notes || "";
        form.querySelector("#cr-active").checked = c.active !== false;
        form.dataset.editId = c.id;
        form.querySelector("button[type=submit]").textContent = "Salva modifiche";
        cancelBtn.style.display = "inline-flex";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function syncPublic(listDocs) {
    const codes = {};
    listDocs.forEach((c) => {
      const mail = String(c.email || "").trim().toLowerCase();
      const payload = {
        code: String(c.code || "").toUpperCase(),
        name: c.name || "",
        commission: Number(c.commission) || 0,
        discount: Number(c.discount) || 0,
        active: !!(c.code && c.active !== false),
        uses: statsFor(c.code).uses,
        earned: statsFor(c.code).earned
      };
      if (c.code && c.active !== false) {
        codes[payload.code] = {
          name: payload.name,
          commission: payload.commission,
          discount: payload.discount
        };
      }
      if (mail) setDoc(doc(db, "creatorPortals", mail), payload, { merge: true }).catch(() => {});
    });
    setDoc(doc(db, "siteContent", "publicCreators"), { codes }, { merge: false }).catch(() => {});
  }

  onSnapshot(query(colRef, orderBy("createdAt", "desc")), (snap) => {
    creators = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    syncPublic(creators);
    render();
  });
  onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snap) => {
    orders = snap.docs.map((d) => d.data());
    render();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      code: form.querySelector("#cr-code").value.trim().toUpperCase(),
      name: form.querySelector("#cr-name").value.trim(),
      email: form.querySelector("#cr-email").value.trim(),
      commission: parseFloat(form.querySelector("#cr-commission").value) || 0,
      discount: parseFloat(form.querySelector("#cr-discount").value) || 0,
      notes: form.querySelector("#cr-notes").value.trim(),
      active: form.querySelector("#cr-active").checked
    };
    if (!data.code) return;
    if (form.dataset.editId) {
      await updateDoc(doc(db, "creators", form.dataset.editId), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(colRef, data);
    }
    form.reset();
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Salva codice";
    cancelBtn.style.display = "none";
    form.querySelector("#cr-active").checked = true;
    form.querySelector("#cr-commission").value = 10;
    form.querySelector("#cr-discount").value = 0;
  });
  cancelBtn.addEventListener("click", () => {
    form.reset();
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Salva codice";
    cancelBtn.style.display = "none";
    form.querySelector("#cr-active").checked = true;
  });
  onSnapshot(query(collection(db, "users")), (snap) => {
    const dl = document.getElementById("cr-user-list");
    if (!dl) return;
    dl.innerHTML = snap.docs.map((d) => {
      const u = d.data();
      const em = u.email || "";
      if (!em) return "";
      return `<option value="${escapeHtml(em)}">${escapeHtml(u.nickname || em)}</option>`;
    }).join("");
  });
}

// ==========================================================================
// RICHIESTE — messaggi inviati dal form Contatti del sito pubblico
// ==========================================================================
function initOrders() {
  const list = document.getElementById("admin-orders-list");
  if (!list) return;
  let all = [];
  let filter = "tutte";

  function euro(n) {
    return typeof n === "number" ? n.toLocaleString("it-IT", { style: "currency", currency: "EUR" }) : "—";
  }
  function buyerName(o) {
    const n = [o.firstName, o.lastName].filter(Boolean).join(" ");
    return n || o.buyerName || o.nickname || o.email || "Cliente";
  }
  function render() {
    const q = (document.getElementById("orders-search")?.value || "").trim().toLowerCase();
    const vis = all.filter((o) => {
      if (filter !== "tutte" && o.status !== filter) return false;
      if (q) {
        const hay = `${buyerName(o)} ${o.email || ""} ${o.phone || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const stat = document.getElementById("stat-orders");
    if (stat) stat.textContent = all.filter((o) => o.status === "nuova").length;
    if (!vis.length) {
      list.innerHTML = '<p class="empty-hint">Nessun ordine in questa vista.</p>';
      return;
    }
    const badge = (s) => {
      if (s === "pagato") return "Pagato";
      if (s === "spedito") return "Spedito";
      if (s === "gestita") return "Gestito";
      return "Nuovo";
    };
    list.innerHTML = vis.map((o) => {
      const items = (o.items || []).map((i) => `${escapeHtml(String(i.qty || 1))}× ${escapeHtml(i.name || "")} — ${escapeHtml(i.price || "")}`).join("<br>");
      const when = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("it-IT") : "—";
      const addr = [o.address, o.address2, o.zip, o.city, o.province, o.country].filter(Boolean).join(", ");
      return `<div class="richiesta-card ${o.status === "nuova" ? "is-nuova" : ""}">
        <div class="richiesta-card__head">
          <strong>${escapeHtml(buyerName(o))}</strong>
          <span class="richiesta-badge ${o.status === "nuova" ? "is-nuova" : "is-gestita"}">${badge(o.status)}</span>
        </div>
        <div class="richiesta-card__meta">
          <span>✉️ ${escapeHtml(o.email || "—")}</span>
          ${o.phone ? `<span>📞 ${escapeHtml(o.phone)}</span>` : ""}
          <span>💶 ${euro(typeof o.total === "number" ? o.total : o.subtotal)}</span>
          <span>🕒 ${when}</span>
        </div>
        <div class="richiesta-card__body">
          <strong>Ordine</strong><br>${items || "—"}
          ${addr ? `<br><br><strong>Spedizione</strong><br>${escapeHtml(addr)}` : ""}
          ${o.paymentMethod ? `<br><br><strong>Pagamento</strong> ${escapeHtml(o.paymentMethod)}${o.cardLast4 ? " · **** " + escapeHtml(o.cardLast4) : ""}` : ""}
          ${o.creatorCode ? `<br><br><strong>Creator</strong> ${escapeHtml(o.creatorCode)}${o.creatorName ? " · " + escapeHtml(o.creatorName) : ""} · commissione ${euro(o.creatorCommission)} (${Number(o.creatorPercent) || 0}%)` : ""}
          ${o.discountCode && o.discountCode !== o.creatorCode ? `<br><strong>Voucher</strong> ${escapeHtml(o.discountCode)}` : ""}
        </div>
        <div class="richiesta-card__actions">
          <button type="button" class="btn btn--outline btn-ord-set" data-id="${o.id}" data-st="pagato">Pagato</button>
          <button type="button" class="btn btn--outline btn-ord-set" data-id="${o.id}" data-st="spedito">Spedito</button>
          <button type="button" class="btn btn--outline btn-ord-set" data-id="${o.id}" data-st="gestita">Gestito</button>
          <button type="button" class="btn btn--outline btn-ord-del" data-id="${o.id}">Elimina</button>
        </div>
      </div>`;
    }).join("");
    list.querySelectorAll(".btn-ord-set").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await updateDoc(doc(db, "orders", btn.dataset.id), { status: btn.dataset.st });
      });
    });
    list.querySelectorAll(".btn-ord-del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questo ordine?")) await deleteDoc(doc(db, "orders", btn.dataset.id));
      });
    });
  }

  document.querySelectorAll("[data-ord-filter]").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll("[data-ord-filter]").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      filter = pill.dataset.ordFilter;
      render();
    });
  });
  document.getElementById("orders-search")?.addEventListener("input", render);

  onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snap) => {
    all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  }, () => {
    list.innerHTML = '<p class="empty-hint">Impossibile caricare gli ordini. Ripubblica le regole Firestore.</p>';
  });
}

function initCheckoutCfg() {
  const form = document.getElementById("checkout-cfg-form");
  const list = document.getElementById("ck-methods");
  const statusMsg = document.getElementById("ck-status");
  if (!form || !list) return;
  const ref = doc(db, "siteContent", "checkout");
  let methods = [];

  function rowHtml(m, i) {
    return `<div class="ck-row" data-i="${i}" style="display:grid;grid-template-columns:1fr 140px 1fr auto;gap:8px;margin-bottom:8px;align-items:center;">
      <input type="text" class="ck-name" placeholder="Nome (PayPal, Satispay...)" value="">
      <select class="ck-type">
        <option value="paypal">PayPal</option>
        <option value="stripe">Stripe / carta</option>
        <option value="link">Link esterno</option>
        <option value="note">Istruzioni</option>
      </select>
      <input type="text" class="ck-url" placeholder="URL o istruzioni">
      <button type="button" class="btn btn--outline ck-del">✕</button>
    </div>`;
  }
  function paint() {
    list.innerHTML = methods.map((m, i) => rowHtml(m, i)).join("") || "<p class='empty-hint'>Nessun metodo. Aggiungine uno.</p>";
    list.querySelectorAll(".ck-row").forEach((row) => {
      const i = Number(row.dataset.i);
      row.querySelector(".ck-name").value = methods[i].name || "";
      row.querySelector(".ck-type").value = methods[i].type || "link";
      row.querySelector(".ck-url").value = methods[i].url || methods[i].note || "";
      row.querySelector(".ck-del").addEventListener("click", () => {
        methods.splice(i, 1);
        paint();
      });
    });
  }
  function harvest() {
    methods = [...list.querySelectorAll(".ck-row")].map((row) => ({
      name: row.querySelector(".ck-name").value.trim(),
      type: row.querySelector(".ck-type").value,
      url: row.querySelector(".ck-url").value.trim()
    })).filter((m) => m.name);
  }

  getDoc(ref).then((snap) => {
    const d = snap.exists() ? snap.data() : {};
    form.querySelector("#ck-ship").value = d.shippingFlat ?? 0;
    form.querySelector("#ck-free").value = d.freeOver ?? 0;
    form.querySelector("#ck-tax").value = d.taxPercent ?? 22;
    const sp = form.querySelector("#ck-stripe"); if (sp) sp.value = d.stripePk || "";
    methods = Array.isArray(d.methods) && d.methods.length ? d.methods : [
      { name: "PayPal", type: "paypal", url: "" },
      { name: "Carta / Stripe", type: "stripe", url: "" }
    ];
    paint();
  });

  document.getElementById("ck-add-method")?.addEventListener("click", () => {
    harvest();
    methods.push({ name: "", type: "link", url: "" });
    paint();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    harvest();
    await setDoc(ref, {
      shippingFlat: Number(form.querySelector("#ck-ship").value) || 0,
      freeOver: Number(form.querySelector("#ck-free").value) || 0,
      taxPercent: Number(form.querySelector("#ck-tax").value) || 0,
      stripePk: form.querySelector("#ck-stripe")?.value.trim() || "",
      methods
    }, { merge: true });
    statusMsg.textContent = "Cassa salvata.";
    statusMsg.classList.add("visible");
    setTimeout(() => statusMsg.classList.remove("visible"), 4000);
  });
}

function initCustomStudio() {
  const packForm = document.getElementById("cpack-form");
  const buildForm = document.getElementById("cbuild-form");
  const wizForm = document.getElementById("cwiz-form");
  if (!packForm) return;
  bindUploader({ fileId: "cp-image-file", hiddenId: "cp-image", previewId: "cp-image-preview", statusId: "cp-image-status", folder: "custom" });
  bindUploader({ fileId: "cb-image-file", hiddenId: "cb-image", previewId: "cb-image-preview", statusId: "cb-image-status", folder: "custom" });

  function bindCrud(form, listId, colName, cancelId, fill, toData) {
    const list = document.getElementById(listId);
    const cancel = document.getElementById(cancelId);
    const colRef = collection(db, colName);
    onSnapshot(query(colRef, orderBy("createdAt", "desc")), (snap) => {
      if (!list) return;
      if (snap.empty) {
        list.innerHTML = '<p class="empty-hint">Nessun elemento.</p>';
        return;
      }
      list.innerHTML = "";
      snap.forEach((d) => {
        const x = d.data();
        const row = document.createElement("div");
        row.className = "admin-row";
        row.innerHTML = `
          ${x.imageUrl ? `<img class="admin-row__thumb" src="${escapeHtml(x.imageUrl)}" alt="">` : ""}
          <div class="admin-row__info">
            <strong>${escapeHtml(x.name || x.title || "—")}</strong>
            <span>${escapeHtml(x.caption || x.time || (x.fromPrice != null ? "da " + x.fromPrice + " €" : ""))}</span>
          </div>
          <div class="admin-row__actions">
            <button type="button" class="btn btn--outline btn-edit" data-id="${d.id}">Modifica</button>
            <button type="button" class="btn btn--outline btn-delete" data-id="${d.id}">Elimina</button>
          </div>`;
        list.appendChild(row);
      });
      list.querySelectorAll(".btn-delete").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (confirm("Eliminare?")) await deleteDoc(doc(db, colName, btn.dataset.id));
        });
      });
      list.querySelectorAll(".btn-edit").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const s = await getDoc(doc(db, colName, btn.dataset.id));
          fill(s.data() || {});
          form.dataset.editId = btn.dataset.id;
          form.querySelector("button[type=submit]").textContent = "Salva modifiche";
          if (cancel) cancel.style.display = "inline-flex";
        });
      });
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = toData();
      if (form.dataset.editId) await updateDoc(doc(db, colName, form.dataset.editId), data);
      else { data.createdAt = serverTimestamp(); await addDoc(colRef, data); }
      form.reset();
      delete form.dataset.editId;
      form.querySelector("button[type=submit]").textContent = colName === "customPackages" ? "Salva pacchetto" : "Salva lavoro";
      if (cancel) cancel.style.display = "none";
      ["cp-image", "cb-image"].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ""; });
      ["cp-image-preview", "cb-image-preview"].forEach((id) => { const el = document.getElementById(id); if (el) { el.removeAttribute("src"); el.style.display = "none"; } });
    });
    cancel?.addEventListener("click", () => {
      form.reset();
      delete form.dataset.editId;
      cancel.style.display = "none";
    });
  }

  bindCrud(packForm, "admin-cpack-list", "customPackages", "cpack-cancel", (x) => {
    packForm.querySelector("#cp-name").value = x.name || "";
    packForm.querySelector("#cp-price").value = x.fromPrice ?? "";
    packForm.querySelector("#cp-time").value = x.time || "";
    packForm.querySelector("#cp-features").value = x.features || "";
    packForm.querySelector("#cp-image").value = x.imageUrl || "";
    packForm.querySelector("#cp-order").value = x.order || 1;
    packForm.querySelector("#cp-hot").checked = !!x.hot;
    setPreview(document.getElementById("cp-image-preview"), x.imageUrl || "");
  }, () => ({
    name: packForm.querySelector("#cp-name").value.trim(),
    fromPrice: parseFloat(packForm.querySelector("#cp-price").value) || 0,
    time: packForm.querySelector("#cp-time").value.trim(),
    features: packForm.querySelector("#cp-features").value.trim(),
    imageUrl: packForm.querySelector("#cp-image").value.trim(),
    order: parseInt(packForm.querySelector("#cp-order").value, 10) || 1,
    hot: packForm.querySelector("#cp-hot").checked
  }));

  bindCrud(buildForm, "admin-cbuild-list", "customBuilds", "cbuild-cancel", (x) => {
    buildForm.querySelector("#cb-title").value = x.title || "";
    buildForm.querySelector("#cb-caption").value = x.caption || "";
    buildForm.querySelector("#cb-image").value = x.imageUrl || "";
    setPreview(document.getElementById("cb-image-preview"), x.imageUrl || "");
  }, () => ({
    title: buildForm.querySelector("#cb-title").value.trim(),
    caption: buildForm.querySelector("#cb-caption").value.trim(),
    imageUrl: buildForm.querySelector("#cb-image").value.trim()
  }));

  const wizRef = doc(db, "siteContent", "customWizard");
  getDoc(wizRef).then((s) => {
    if (!s.exists()) return;
    const d = s.data();
    if (d.services) wizForm.querySelector("#cw-services").value = d.services;
    if (d.layouts) wizForm.querySelector("#cw-layouts").value = d.layouts;
    if (d.switches) wizForm.querySelector("#cw-switches").value = d.switches;
    if (d.extras) wizForm.querySelector("#cw-extras").value = d.extras;
  });
  wizForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await setDoc(wizRef, {
      services: wizForm.querySelector("#cw-services").value,
      layouts: wizForm.querySelector("#cw-layouts").value,
      switches: wizForm.querySelector("#cw-switches").value,
      extras: wizForm.querySelector("#cw-extras").value
    }, { merge: true });
    const msg = document.getElementById("cwiz-status");
    if (msg) { msg.textContent = "Salvato."; msg.classList.add("visible"); setTimeout(() => msg.classList.remove("visible"), 2500); }
  });
}

function initRichieste() {
  const list = document.getElementById("admin-richieste-list");
  const colRef = collection(db, "richieste");
  let allRichieste = [];
  let activeFilter = "tutte";

  const SERVIZIO_LABELS = {
    "tastiera-custom": "Tastiera Custom",
    "keycaps": "Keycaps / Art",
    "riparazioni": "Riparazioni elettroniche",
    "consulenza-pc": "Consulenze per componenti di PC",
    "assemblaggio-pc": "Assemblaggio di PC",
    "siti-web": "Creazione siti web",
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
          ${r.source === "configuratore" ? "<span>🛠️ Configuratore</span>" : ""}
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
  bindUploader({ fileId: "n-image-file", hiddenId: "n-image", previewId: "n-image-preview", statusId: "n-image-status", folder: "news" });

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
        setPreview(document.getElementById("n-image-preview"), n.imageUrl || "");
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
    return `<span class="gr-stars" style="--pct:${(r / 5) * 100}%" aria-label="${r} su 5">
      <span class="gr-stars__track">${'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2l2.7 6.1 6.6.7-5 4.6 1.4 6.5L12 16.8 6.3 20.1 7.7 13.6l-5-4.6 6.6-.7L12 2.2z"/></svg>'.repeat(5)}</span>
      <span class="gr-stars__fill">${'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2l2.7 6.1 6.6.7-5 4.6 1.4 6.5L12 16.8 6.3 20.1 7.7 13.6l-5-4.6 6.6-.7L12 2.2z"/></svg>'.repeat(5)}</span>
    </span>`;
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
        <div class="richiesta-card__meta">${stars(r.rating)}</div>
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

function initNewsletter() {
  const list = document.getElementById("admin-newsletter-list");
  if (!list) return;
  const colRef = collection(db, "newsletter");

  function formatDate(ts) {
    if (!ts || typeof ts.toDate !== "function") return "—";
    return ts.toDate().toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
      row.dataset.searchName = String(r.email || "").toLowerCase();
      row.innerHTML = `
        <div class="admin-row__info">
          <strong>${escapeHtml(r.email || "")}</strong>
          <span>${escapeHtml(r.source || "store")} · ${formatDate(r.createdAt)}</span>
        </div>
        <div class="admin-row__actions">
          <a class="btn btn--outline" href="mailto:${encodeURIComponent(r.email || "")}">Scrivi</a>
          <button type="button" class="btn btn--outline btn-delete-nl" data-id="${docSnap.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });
    list.querySelectorAll(".btn-delete-nl").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questa iscrizione?")) {
          await deleteDoc(doc(db, "newsletter", btn.dataset.id));
        }
      });
    });
  }, () => {
    list.innerHTML = '<p class="empty-hint">Impossibile caricare le iscrizioni. Pubblica le regole Firestore aggiornate.</p>';
  });

  document.getElementById("nl-search")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    list.querySelectorAll(".admin-row").forEach((row) => {
      row.style.display = row.dataset.searchName?.includes(q) ? "" : "none";
    });
  });
}

// ==========================================================================
// BANNER PROMOZIONALE — attivo/disattivo, testo e link, in tempo reale
// ==========================================================================
function initBanner() {
  const form = document.getElementById("banner-form");
  const statusMsg = document.getElementById("banner-status");
  const ref = doc(db, "siteContent", "banner");

  const enabledInput = document.getElementById("b-enabled");
  const textInput = document.getElementById("b-text");
  const linkInput = document.getElementById("b-link");

  getDoc(ref).then((snap) => {
    if (!snap.exists()) return;
    const d = snap.data();
    enabledInput.checked = !!d.enabled;
    textInput.value = d.text || "";
    linkInput.value = d.link || "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await setDoc(ref, {
      enabled: enabledInput.checked,
      text: textInput.value.trim(),
      link: linkInput.value.trim()
    }, { merge: true });

    statusMsg.textContent = "Salvato. Ricarica una pagina qualsiasi del sito per vedere il banner aggiornato.";
    statusMsg.classList.add("visible");
    setTimeout(() => statusMsg.classList.remove("visible"), 4000);
  });
}

// ==========================================================================
// FORUM — tag dello staff (email → etichetta + colore)
// ==========================================================================
function initStaffTags() {
  const form = document.getElementById("staff-tag-form");
  const list = document.getElementById("admin-staff-tags-list");
  const colRef = collection(db, "staffTags");
  const cancelBtn = document.getElementById("staff-tag-cancel-edit");
  const emailInput = document.getElementById("st-email");

  onSnapshot(colRef, (snap) => {
    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessun tag assegnato ancora.</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const t = docSnap.data();
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <span class="staff-badge" style="background:${escapeHtml(t.color || "#ff4dad")};color:#0a0d16;">${escapeHtml(t.label)}</span>
        <div class="admin-row__info">
          <strong>${escapeHtml(docSnap.id)}</strong>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${docSnap.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${docSnap.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm(`Rimuovere il tag da ${btn.dataset.id}?`)) {
          await deleteDoc(doc(db, "staffTags", btn.dataset.id));
        }
      });
    });

    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "staffTags", btn.dataset.id));
        const t = snap2.data();
        emailInput.value = btn.dataset.id;
        emailInput.readOnly = true;
        form.querySelector("#st-label").value = t.label || "";
        form.querySelector("#st-color").value = t.color || "#ff4dad";
        form.dataset.editId = btn.dataset.id;
        form.querySelector("button[type=submit]").textContent = "Salva modifiche";
        cancelBtn.style.display = "inline-flex";
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    await setDoc(doc(db, "staffTags", email), {
      label: form.querySelector("#st-label").value.trim(),
      color: form.querySelector("#st-color").value
    });
    resetStaffTagForm();
  });

  cancelBtn.addEventListener("click", resetStaffTagForm);

  function resetStaffTagForm() {
    form.reset();
    emailInput.readOnly = false;
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Salva tag";
    cancelBtn.style.display = "none";
  }
}

// ==========================================================================
// FORUM — categorie (nome, descrizione, colore, ordine)
// ==========================================================================
function initForumCategories() {
  const form = document.getElementById("forum-cat-form");
  const list = document.getElementById("admin-forum-cats-list");
  const cancelBtn = document.getElementById("forum-cat-cancel-edit");
  if (!form || !list) return;

  const colRef = collection(db, "forumCategories");

  function categoryIcon(c) {
    const custom = (c.icon || "").trim();
    if (custom) return custom;
    const n = (c.name || "").toLowerCase();
    if (n.includes("regol")) return "📜";
    if (n.includes("community") || n.includes("comunit")) return "🎮";
    return "";
  }

  onSnapshot(query(colRef, orderBy("order", "asc")), (snap) => {
    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessuna categoria ancora. Creane almeno una (es. Supporto, Setup, Proposte).</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const c = docSnap.data();
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <span class="status-badge" style="color:${escapeHtml(c.color || "#ff4dad")};background:${escapeHtml(c.color || "#ff4dad")}22;border:1px solid ${escapeHtml(c.color || "#ff4dad")}44;">${escapeHtml(c.name)}</span>
        <div class="admin-row__info">
          <strong>${escapeHtml(categoryIcon(c) ? categoryIcon(c) + " " : "")}${escapeHtml(c.name)}</strong>
          <span style="display:block;font-size:12px;color:var(--text-dim);margin-top:2px;">${escapeHtml(c.description || "")} · ordine ${c.order ?? 0}${c.private ? " · 🔒 privata" : ""}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${docSnap.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${docSnap.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questa categoria? Gli argomenti già creati manterranno il riferimento.")) {
          await deleteDoc(doc(db, "forumCategories", btn.dataset.id));
        }
      });
    });

    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "forumCategories", btn.dataset.id));
        const c = snap2.data();
        form.querySelector("#fc-name").value = c.name || "";
        form.querySelector("#fc-icon").value = c.icon || "";
        form.querySelector("#fc-desc").value = c.description || "";
        form.querySelector("#fc-color").value = c.color || "#ff4dad";
        form.querySelector("#fc-order").value = c.order ?? 10;
        form.querySelector("#fc-private").checked = !!c.private;
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
      name: form.querySelector("#fc-name").value.trim(),
      icon: form.querySelector("#fc-icon").value.trim(),
      description: form.querySelector("#fc-desc").value.trim(),
      color: form.querySelector("#fc-color").value,
      order: Number(form.querySelector("#fc-order").value) || 0,
      private: !!form.querySelector("#fc-private")?.checked
    };
    if (form.dataset.editId) {
      await updateDoc(doc(db, "forumCategories", form.dataset.editId), data);
    } else {
      await addDoc(colRef, data);
    }
    resetForumCatForm();
  });

  cancelBtn.addEventListener("click", resetForumCatForm);

  function resetForumCatForm() {
    form.reset();
    form.querySelector("#fc-order").value = 10;
    form.querySelector("#fc-color").value = "#ff4dad";
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Salva categoria";
    cancelBtn.style.display = "none";
  }
}

// ==========================================================================
// FORUM — pagine / sezioni dentro le categorie
// ==========================================================================
function initForumBoards() {
  const form = document.getElementById("forum-board-form");
  const list = document.getElementById("admin-forum-boards-list");
  const cancelBtn = document.getElementById("forum-board-cancel-edit");
  const catSelect = document.getElementById("fb-cat");
  const typeSelect = document.getElementById("fb-type");
  const contentWrap = document.getElementById("fb-content-wrap");
  if (!form || !list) return;

  let cats = {};

  function toggleContent() {
    const ro = typeSelect.value === "readonly";
    contentWrap.style.display = ro ? "block" : "none";
    const staffWrap = document.getElementById("fb-staff-wrap");
    if (staffWrap) staffWrap.style.display = ro ? "none" : "flex";
  }
  typeSelect.addEventListener("change", toggleContent);
  toggleContent();

  onSnapshot(query(collection(db, "forumCategories"), orderBy("order", "asc")), (snap) => {
    cats = {};
    const keep = form.dataset.editId ? catSelect.value : catSelect.value;
    catSelect.innerHTML = '<option value="">Seleziona categoria</option>';
    snap.forEach((d) => {
      cats[d.id] = d.data();
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.data().name;
      catSelect.appendChild(opt);
    });
    if (keep) catSelect.value = keep;
  });

  onSnapshot(query(collection(db, "forumBoards"), orderBy("order", "asc")), (snap) => {
    if (snap.empty) {
      list.innerHTML = '<p class="empty-hint">Nessuna pagina. Creane una (es. Regolamenti, Guide, Presentazioni).</p>';
      return;
    }
    list.innerHTML = "";
    snap.forEach((docSnap) => {
      const b = docSnap.data();
      const catName = cats[b.categoryId]?.name || "—";
      const typeLabel = b.type === "readonly" ? "Solo lettura" : (b.staffOnly ? "Solo staff apre" : "Conversazioni");
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <span style="font-size:22px;">${escapeHtml(b.icon || "💬")}</span>
        <div class="admin-row__info">
          <strong>${escapeHtml(b.name)}</strong>
          <span>${escapeHtml(catName)} · ${typeLabel} · ordine ${b.order ?? 0}${b.private ? " · 🔒 privata" : ""}${b.link ? " · ↗ link" : ""}</span>
        </div>
        <div class="admin-row__actions">
          <button type="button" class="btn btn--outline btn-edit" data-id="${docSnap.id}">Modifica</button>
          <button type="button" class="btn btn--outline btn-delete" data-id="${docSnap.id}">Elimina</button>
        </div>`;
      list.appendChild(row);
    });

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questa pagina?")) {
          await deleteDoc(doc(db, "forumBoards", btn.dataset.id));
        }
      });
    });

    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "forumBoards", btn.dataset.id));
        const b = snap2.data();
        catSelect.value = b.categoryId || "";
        form.querySelector("#fb-name").value = b.name || "";
        form.querySelector("#fb-icon").value = b.icon || "";
        form.querySelector("#fb-desc").value = b.description || "";
        const linkEl = form.querySelector("#fb-link");
        if (linkEl) linkEl.value = b.link || "";
        typeSelect.value = b.type || "discussion";
        form.querySelector("#fb-content").value = b.content || "";
        form.querySelector("#fb-order").value = b.order ?? 10;
        form.querySelector("#fb-private").checked = !!b.private;
        const staffEl = form.querySelector("#fb-staff-only");
        if (staffEl) staffEl.checked = !!b.staffOnly;
        form.dataset.editId = btn.dataset.id;
        form.querySelector("button[type=submit]").textContent = "Salva modifiche";
        cancelBtn.style.display = "inline-flex";
        toggleContent();
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      categoryId: catSelect.value,
      name: form.querySelector("#fb-name").value.trim(),
      icon: form.querySelector("#fb-icon").value.trim(),
      description: form.querySelector("#fb-desc").value.trim(),
      link: (form.querySelector("#fb-link")?.value || "").trim(),
      type: typeSelect.value,
      content: form.querySelector("#fb-content").value,
      order: Number(form.querySelector("#fb-order").value) || 0,
      private: !!form.querySelector("#fb-private")?.checked,
      staffOnly: typeSelect.value !== "readonly" && !!form.querySelector("#fb-staff-only")?.checked
    };
    if (!data.categoryId) {
      alert("Seleziona una categoria.");
      return;
    }
    if (form.dataset.editId) {
      await updateDoc(doc(db, "forumBoards", form.dataset.editId), data);
    } else {
      await addDoc(collection(db, "forumBoards"), data);
    }
    resetForm();
  });

  cancelBtn.addEventListener("click", resetForm);

  function resetForm() {
    form.reset();
    form.querySelector("#fb-order").value = 10;
    delete form.dataset.editId;
    form.querySelector("button[type=submit]").textContent = "Salva pagina";
    cancelBtn.style.display = "none";
    toggleContent();
  }
}


// ==========================================================================
// RUOLI FORUM — Membro default + ruoli extra
// ==========================================================================
function initForumRoles() {
  const form = document.getElementById("forum-role-form");
  const list = document.getElementById("admin-forum-roles-list");
  if (!form || !list) return;

  async function ensureMembro() {
    const ref = doc(db, "forumRoles", "membro");
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { label: "Membro", color: "#f2f3f5", isDefault: true, order: 0 });
    }
  }
  ensureMembro().catch(() => {});

  onSnapshot(collection(db, "forumRoles"), (snap) => {
    const roles = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (roles.length === 0) {
      list.innerHTML = '<p class="empty-hint">Nessun ruolo ancora.</p>';
      return;
    }
    list.innerHTML = roles.map((r) => `
      <div class="admin-row">
        <span class="staff-badge" style="background:${escapeHtml(r.color || "#f2f3f5")};color:#0a0d16;">${escapeHtml(r.label)}</span>
        <div class="admin-row__info">
          <strong>${escapeHtml(r.label)}</strong>
          <span>${r.isDefault ? "Assegnato in automatico a ogni registrazione" : "Ruolo extra, assegnabile da Utenti"}</span>
        </div>
        <div class="admin-row__actions">
          ${r.isDefault ? "" : `<button type="button" class="btn btn--outline btn-delete-role" data-id="${r.id}">Elimina</button>`}
        </div>
      </div>`).join("");
    list.querySelectorAll(".btn-delete-role").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questo ruolo?")) await deleteDoc(doc(db, "forumRoles", btn.dataset.id));
      });
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "forumRoles"), {
      label: form.querySelector("#fr-label").value.trim(),
      color: form.querySelector("#fr-color").value,
      isDefault: false,
      order: parseInt(form.querySelector("#fr-order").value, 10) || 10
    });
    form.reset();
    form.querySelector("#fr-color").value = "#3b82f6";
    form.querySelector("#fr-order").value = 10;
  });
}

// ==========================================================================
// UTENTI — anagrafica + assegnazione ruoli extra
// ==========================================================================
function initUsers() {
  const list = document.getElementById("admin-users-list");
  if (!list) return;
  let all = [];
  let roles = [];

  function formatDate(ts) {
    if (!ts || typeof ts.toDate !== "function") return "—";
    return ts.toDate().toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function extraRoles() {
    return roles.filter((r) => !r.isDefault);
  }

  function render() {
    const stat = document.getElementById("stat-users");
    if (stat) stat.textContent = all.length;
    const q = (document.getElementById("users-search")?.value || "").trim().toLowerCase();
    const visible = q
      ? all.filter((u) => `${u.nickname || ""} ${u.email || ""}`.toLowerCase().includes(q))
      : all;
    if (visible.length === 0) {
      list.innerHTML = '<p class="empty-hint">Nessun utente in elenco.</p>';
      return;
    }
    list.innerHTML = visible.map((u) => {
      const isAdmin = String(u.email || "").toLowerCase() === String(ADMIN_EMAIL).toLowerCase();
      return `
      <div class="admin-row">
        <div class="admin-row__info">
          <strong>${escapeHtml(u.nickname || "Utente")}</strong>
          <span>${escapeHtml(u.email || "—")} · registrato ${formatDate(u.createdAt)} · ultimo accesso ${formatDate(u.lastLoginAt)}</span>
        </div>
        <div class="admin-row__actions">
          ${isAdmin
            ? '<span style="font-size:12px;color:var(--text-dim);">Account admin</span>'
            : `<button type="button" class="btn btn--outline btn-del-user" data-id="${u.id}" data-email="${escapeHtml(u.email || "")}" data-nick="${escapeHtml(u.nickname || "")}">Elimina account</button>`}
        </div>
      </div>`;
    }).join("");
    list.querySelectorAll(".btn-del-user").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const nick = btn.dataset.nick || btn.dataset.email || "questo utente";
        if (!confirm("Eliminare l'account di " + nick + " dal sito?\nNon potrà più accedere. L'azione non si può annullare.")) return;
        btn.disabled = true;
        try {
          const email = String(btn.dataset.email || "").trim().toLowerCase();
          if (email) {
            await setDoc(doc(db, "bannedUsers", email), {
              uid: btn.dataset.id,
              email,
              nickname: btn.dataset.nick || "",
              deletedAt: serverTimestamp()
            });
          }
          await deleteDoc(doc(db, "users", btn.dataset.id));
          try { await deleteDoc(doc(db, "wishlists", btn.dataset.id)); } catch (_) {}
        } catch (err) {
          alert("Eliminazione non riuscita. Pubblica le regole Firestore aggiornate (firestore.rules.txt).");
          btn.disabled = false;
        }
      });
    });
  }

  onSnapshot(collection(db, "users"), (snap) => {
    all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    all.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || a.lastLoginAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || b.lastLoginAt?.toMillis?.() || 0;
      return tb - ta;
    });
    render();
  }, () => {
    list.innerHTML = '<p class="empty-hint">Impossibile caricare gli utenti. Pubblica le regole Firestore aggiornate.</p>';
  });

  onSnapshot(collection(db, "forumRoles"), (snap) => {
    roles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  });

  document.getElementById("users-search")?.addEventListener("input", render);
}

// ==========================================================================
// PEX / DEPEX — lista membri + aggiungi/togli ruoli
// ==========================================================================
async function syncAutoStaffTag(user, extraRoleIds) {
  const email = String(user?.email || "").trim();
  if (!email) return;
  const ref = doc(db, "staffTags", email);
  const snap = await getDoc(ref);
  const hasMod = Array.isArray(extraRoleIds) && extraRoleIds.length > 0;
  if (hasMod) {
    if (!snap.exists() || snap.data().auto) {
      await setDoc(ref, { label: "Staff", color: "#ffffff", auto: true });
    }
  } else if (snap.exists() && snap.data().auto) {
    await deleteDoc(ref);
  }
}

function initPex() {
  const listEl = document.getElementById("pex-member-list");
  const detailEl = document.getElementById("pex-detail");
  const form = document.getElementById("pex-role-form");
  const mini = document.getElementById("pex-roles-mini");
  if (!listEl || !detailEl) return;

  let all = [];
  let roles = [];
  let selectedId = null;
  let didBackfill = false;

  function ink(hex) {
    const c = String(hex || "f2f3f5").replace("#", "");
    if (c.length < 6) return "#0a0d16";
    const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0a0d16" : "#ffffff";
  }
  function extras() { return roles.filter((r) => !r.isDefault); }
  function badge(r) {
    const bg = r.color || "#f2f3f5";
    return `<span class="staff-badge" style="background:${escapeHtml(bg)};color:${ink(bg)};">${escapeHtml(r.label)}</span>`;
  }

  function renderList() {
    const q = (document.getElementById("pex-search")?.value || "").trim().toLowerCase();
    const visible = [...all].sort((a, b) => String(a.nickname || a.email || "").localeCompare(String(b.nickname || b.email || ""), "it", { sensitivity: "base" }))
      .filter((u) => !q || `${u.nickname || ""} ${u.email || ""}`.toLowerCase().includes(q));
    if (visible.length === 0) {
      listEl.innerHTML = '<p class="empty-hint" style="padding:16px;">Nessun membro.</p>';
      return;
    }
    listEl.innerHTML = visible.map((u) => {
      const nick = u.nickname || "Utente";
      const initial = nick.charAt(0).toUpperCase();
      const ids = Array.isArray(u.roleIds) ? u.roleIds : [];
      const extra = extras().filter((r) => ids.includes(r.id));
      return `<button type="button" class="pex-item ${u.id === selectedId ? "is-on" : ""}" data-id="${u.id}">
        <span class="pex-item__ava">${escapeHtml(initial)}</span>
        <span>
          <strong>${escapeHtml(nick)}</strong>
          <span>${escapeHtml(u.email || "")}${extra.length ? " · " + extra.map((r) => r.label).join(", ") : ""}</span>
        </span>
      </button>`;
    }).join("");
    listEl.querySelectorAll(".pex-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedId = btn.dataset.id;
        renderList();
        renderDetail();
      });
    });
  }

  function renderDetail() {
    const u = all.find((x) => x.id === selectedId);
    if (!u) {
      detailEl.innerHTML = '<p class="empty-hint">Seleziona un membro dalla lista.</p>';
      return;
    }
    const ids = Array.isArray(u.roleIds) ? u.roleIds : [];
    const has = extras().filter((r) => ids.includes(r.id));
    const missing = extras().filter((r) => !ids.includes(r.id));
    const nick = u.nickname || "Utente";
    detailEl.innerHTML = `
      <p class="pex-detail__name">${escapeHtml(nick)}</p>
      <p class="pex-detail__mail">${escapeHtml(u.email || "")}</p>
      <div class="pex-badges">${badge({ label: "Membro", color: "#f2f3f5" })}${has.map(badge).join("")}</div>
      <div class="pex-block">
        <h4>Pex — aggiungi ruolo</h4>
        <div class="pex-btns">
          ${missing.length ? missing.map((r) => `<button type="button" class="btn btn--lime btn-pex" data-role="${r.id}">+ ${escapeHtml(r.label)}</button>`).join("") : '<span style="font-size:13px;color:var(--text-dim);">Nessun ruolo da aggiungere. Creane uno sotto.</span>'}
        </div>
      </div>
      <div class="pex-block">
        <h4>Depex — togli ruolo</h4>
        <div class="pex-btns">
          ${has.length ? has.map((r) => `<button type="button" class="btn btn--outline btn-depex" data-role="${r.id}">− ${escapeHtml(r.label)}</button>`).join("") : '<span style="font-size:13px;color:var(--text-dim);">Nessun ruolo extra da togliere. Membro resta sempre.</span>'}
        </div>
      </div>`;
    detailEl.querySelectorAll(".btn-pex").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = new Set(ids);
        next.add(btn.dataset.role);
        const roleIds = [...next];
        await updateDoc(doc(db, "users", u.id), { roleIds });
        await syncAutoStaffTag(u, roleIds);
      });
    });
    detailEl.querySelectorAll(".btn-depex").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const next = ids.filter((id) => id !== btn.dataset.role);
        await updateDoc(doc(db, "users", u.id), { roleIds: next });
        await syncAutoStaffTag(u, next);
      });
    });
  }

  function renderMiniRoles() {
    if (!mini) return;
    const extra = extras();
    mini.innerHTML = extra.length
      ? extra.map((r) => `<div class="admin-row">
          ${badge(r)}
          <div class="admin-row__info"><strong>${escapeHtml(r.label)}</strong></div>
          <button type="button" class="btn btn--outline btn-del-pex-role" data-id="${r.id}">Elimina ruolo</button>
        </div>`).join("")
      : '<p class="empty-hint">Nessun ruolo extra. Creane uno sopra.</p>';
    mini.querySelectorAll(".btn-del-pex-role").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questo ruolo per tutti?")) await deleteDoc(doc(db, "forumRoles", btn.dataset.id));
      });
    });
  }

  onSnapshot(collection(db, "users"), (snap) => {
    all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderList();
    renderDetail();
  });
  onSnapshot(collection(db, "forumRoles"), (snap) => {
    roles = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
    renderList();
    renderDetail();
    renderMiniRoles();
    if (!didBackfill && all.length && extras().length) {
      didBackfill = true;
      all.forEach((u) => {
        const ids = extras().filter((r) => (u.roleIds || []).includes(r.id)).map((r) => r.id);
        if (ids.length) syncAutoStaffTag(u, ids);
      });
    }
  });
  document.getElementById("pex-search")?.addEventListener("input", renderList);

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "forumRoles"), {
      label: form.querySelector("#pex-role-label").value.trim(),
      color: form.querySelector("#pex-role-color").value,
      isDefault: false,
      order: 10
    });
    form.reset();
    form.querySelector("#pex-role-color").value = "#3b82f6";
  });
}

bindEmailFields();
