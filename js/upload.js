import { storage, authReady } from "./firebase-init.js?v=20260919ae";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

function safeName(file) {
  const raw = String(file?.name || "file").replace(/[^\w.\-]+/g, "_");
  return (raw || "file").slice(0, 80);
}

export async function uploadFile(file, folder = "uploads") {
  if (!file) return "";
  await authReady.catch(() => {});
  const path = (folder || "uploads") + "/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "_" + safeName(file);
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
  return getDownloadURL(fileRef);
}

export function setPreview(el, url) {
  if (!el) return;
  if (!url) {
    el.removeAttribute("src");
    el.style.display = "none";
    return;
  }
  el.src = url;
  el.style.display = "block";
}

function failMessage(err) {
  const code = String(err && (err.code || err.message) || "");
  if (/storage\/unauthorized|permission/i.test(code)) {
    return "Accesso negato a Storage. Pubblica le regole in Console Firebase → Storage → Regole (file storage.rules.txt).";
  }
  if (/storage\/retry-limit|storage\/unknown|404|not found|bucket/i.test(code)) {
    return "Attiva Firebase Storage: Console → Storage → Inizia. Il piano gratuito Spark va bene, non c'è limite di peso file lato sito.";
  }
  return "Caricamento non riuscito. Riprova. Se è la prima volta, attiva Storage in Firebase.";
}

export function bindUploader(opts) {
  const fileEl = document.getElementById(opts.fileId);
  const hidden = document.getElementById(opts.hiddenId);
  const preview = opts.previewId ? document.getElementById(opts.previewId) : null;
  const status = opts.statusId ? document.getElementById(opts.statusId) : null;
  if (!fileEl || !hidden) return;
  if (hidden.value) setPreview(preview, hidden.value);
  fileEl.addEventListener("change", async () => {
    const file = fileEl.files?.[0];
    if (!file) return;
    if (status) {
      status.textContent = "Caricamento in corso…";
      status.style.color = "var(--text-dim)";
    }
    try {
      const url = await uploadFile(file, opts.folder || "uploads");
      hidden.value = url;
      if (file.type && file.type.startsWith("image/")) setPreview(preview, url);
      if (status) {
        status.textContent = "File pronto. Salva per pubblicarlo.";
        status.style.color = "var(--lime)";
      }
    } catch (err) {
      if (status) {
        status.textContent = failMessage(err);
        status.style.color = "#fca5a5";
      }
    }
  });
}

export function bindMultiUploader(opts) {
  const fileEl = document.getElementById(opts.fileId);
  const hidden = document.getElementById(opts.hiddenId);
  const status = opts.statusId ? document.getElementById(opts.statusId) : null;
  if (!fileEl || !hidden) return;
  fileEl.addEventListener("change", async () => {
    const files = [...(fileEl.files || [])];
    if (!files.length) return;
    if (status) {
      status.textContent = "Caricamento in corso…";
      status.style.color = "var(--text-dim)";
    }
    try {
      const urls = [];
      for (const f of files) urls.push(await uploadFile(f, opts.folder || "uploads"));
      const prev = hidden.value.split("\n").map((s) => s.trim()).filter(Boolean);
      const all = [...prev, ...urls];
      hidden.value = all.join("\n");
      if (status) {
        status.textContent = all.length + " file pronti. Salva per pubblicarli.";
        status.style.color = "var(--lime)";
      }
    } catch (err) {
      if (status) {
        status.textContent = failMessage(err);
        status.style.color = "#fca5a5";
      }
    }
  });
}
