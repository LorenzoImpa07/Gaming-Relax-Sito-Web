import { db } from "./firebase-init.js";
import { bindUploader, setPreview } from "./upload.js";
import {
  collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => {
    if (m === "&") return "&" + "amp;";
    if (m === "<") return "&" + "lt;";
    if (m === ">") return "&" + "gt;";
    if (m === '"') return "&" + "quot;";
    return "&#39;";
  });
}

function hrefOf(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u) || u.startsWith("mailto:")) return u;
  return "https://" + u;
}

const section = document.getElementById("partners");
const grid = document.getElementById("partners-grid");
if (grid) {
  onSnapshot(collection(db, "partners"), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999) || String(a.name || "").localeCompare(String(b.name || ""), "it"));
    if (!list.length) {
      if (section) section.style.display = "none";
      grid.innerHTML = "";
      return;
    }
    if (section) section.style.display = "";
    grid.innerHTML = list.map((p) => {
      const href = hrefOf(p.url);
      const img = p.logoUrl
        ? `<img src="${escapeHtml(p.logoUrl)}" alt="${escapeHtml(p.name || "Partner")}">`
        : `<span class="partner-fallback">${escapeHtml((p.name || "P").charAt(0))}</span>`;
      if (!href) return `<div class="partner-card" title="${escapeHtml(p.name || "")}">${img}</div>`;
      return `<a class="partner-card" href="${escapeHtml(href)}" target="_blank" rel="noopener" title="${escapeHtml(p.name || "")}">${img}</a>`;
    }).join("");
  }, () => {
    if (section) section.style.display = "none";
  });
}

function injectDashboardUI() {
  if (document.getElementById("partner-form")) return;
  const galleryBtn = document.querySelector('.dash-tab[data-panel="panel-gallery"]');
  if (galleryBtn && !document.querySelector('.dash-tab[data-panel="panel-partners"]')) {
    const btn = document.createElement("button");
    btn.className = "dash-tab";
    btn.dataset.panel = "panel-partners";
    btn.innerHTML = "<span>🤝</span> Partner";
    galleryBtn.after(btn);
    btn.addEventListener("click", () => {
      document.querySelectorAll(".dash-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".dash-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-partners")?.classList.add("active");
    });
  }
  const teamPanel = document.getElementById("panel-team");
  if (!teamPanel || document.getElementById("panel-partners")) return;
  const wrap = document.createElement("div");
  wrap.className = "dash-panel";
  wrap.id = "panel-partners";
  wrap.innerHTML = `
      <div class="dash-layout">
        <div class="dash-form-card">
          <h3>Aggiungi / modifica partner</h3>
          <p style="color:var(--text-dim);font-size:14px;margin-bottom:16px;">Il logo compare in fondo alla Home. Cliccandolo si apre il sito del partner.</p>
          <form id="partner-form">
            <div class="field">
              <label for="pt-name">Nome</label>
              <input type="text" id="pt-name" required placeholder="es. Keychron">
            </div>
            <div class="field">
              <label for="pt-url">Link del sito</label>
              <input type="text" id="pt-url" required placeholder="https://esempio.com">
            </div>
            <div class="field">
              <label for="pt-logo-file">Logo</label>
              <input type="file" id="pt-logo-file" accept="image/*">
              <input type="hidden" id="pt-logo">
              <img id="pt-logo-preview" class="file-preview" alt="">
              <p class="file-status" id="pt-logo-status"></p>
            </div>
            <div class="field">
              <label for="pt-order">Ordine (1 = primo)</label>
              <input type="number" id="pt-order" min="1" step="1" value="1">
            </div>
            <div style="display:flex;gap:12px;">
              <button type="submit" class="btn btn--lime">Salva partner</button>
              <button type="button" id="partner-cancel-edit" class="btn btn--outline" style="display:none;">Annulla</button>
            </div>
          </form>
        </div>
        <div>
          <h3 style="margin-bottom:20px;">Partner pubblicati</h3>
          <div class="admin-list" id="admin-partners-list">
            <p class="empty-hint">Caricamento…</p>
          </div>
        </div>
      </div>`;
  teamPanel.before(wrap);
}

function initPartnersAdmin() {
  injectDashboardUI();
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
    if (cancelBtn) cancelBtn.style.display = "none";
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
        if (cancelBtn) cancelBtn.style.display = "inline-flex";
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

if (document.getElementById("dashboard-root")) {
  const boot = () => initPartnersAdmin();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}
