import { storage, auth, authReady } from "./firebase-init.js?v=20260919ae";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function safeName(file) {
  const raw = String(file?.name || "file").replace(/[^\w.\-]+/g, "_");
  return (raw || "file").slice(0, 80);
}

function waitUser(ms = 8000) {
  return new Promise((resolve) => {
    if (auth.currentUser) return resolve(auth.currentUser);
    const t = setTimeout(() => {
      try { unsub(); } catch (_) {}
      resolve(auth.currentUser);
    }, ms);
    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(t);
      try { unsub(); } catch (_) {}
      resolve(u);
    });
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });
}

async function compressToBlob(file, maxSide = 1800, quality = 0.86) {
  if (!file.type || !file.type.startsWith("image/") || /svg/i.test(file.type)) return file;
  try {
    const img = await loadImage(file);
    let w = img.width;
    let h = img.height;
    if (w > maxSide || h > maxSide) {
      if (w > h) { h = Math.round(h * maxSide / w); w = maxSide; }
      else { w = Math.round(w * maxSide / h); h = maxSide; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob || file;
  } catch {
    return file;
  }
}

async function compressToDataUrl(file, maxSide = 1200, maxChars = 700000) {
  const img = await loadImage(file);
  let w = img.width;
  let h = img.height;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (w > maxSide || h > maxSide) {
    if (w > h) { h = Math.round(h * maxSide / w); w = maxSide; }
    else { w = Math.round(w * maxSide / h); h = maxSide; }
  }
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  let q = 0.8;
  let data = canvas.toDataURL("image/jpeg", q);
  while (data.length > maxChars && q > 0.4) {
    q -= 0.1;
    data = canvas.toDataURL("image/jpeg", q);
  }
  if (data.length > maxChars && maxSide > 700) {
    return compressToDataUrl(file, Math.round(maxSide * 0.75), maxChars);
  }
  return data;
}

function uploadToStorage(blob, folder, name, onProgress) {
  const path = (folder || "uploads") + "/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "_" + name;
  const fileRef = ref(storage, path);
  const task = uploadBytesResumable(fileRef, blob, { contentType: blob.type || "image/jpeg" });
  return new Promise((resolve, reject) => {
    const killer = setTimeout(() => {
      try { task.cancel(); } catch (_) {}
      reject(new Error("timeout"));
    }, 20000);
    task.on("state_changed", (snap) => {
      if (onProgress && snap.totalBytes) {
        onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      }
    }, (err) => {
      clearTimeout(killer);
      reject(err);
    }, async () => {
      clearTimeout(killer);
      try { resolve(await getDownloadURL(task.snapshot.ref)); }
      catch (e) { reject(e); }
    });
  });
}

export async function uploadFile(file, folder = "uploads", onProgress) {
  if (!file) return "";
  await authReady.catch(() => {});
  await waitUser();
  const ready = file.type && file.type.startsWith("image/") ? await compressToBlob(file) : file;
  try {
    return await uploadToStorage(ready, folder, safeName(file), onProgress);
  } catch (_) {
    if (file.type && file.type.startsWith("image/")) {
      return compressToDataUrl(file);
    }
    throw _;
  }
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
  if (/not-auth|unauthenticated/i.test(code)) return "Devi essere connesso in Dashboard per caricare file.";
  if (/storage\/unauthorized|permission/i.test(code)) {
    return "Accesso negato a Storage. Console Firebase → Storage → Regole → pubblica storage.rules.txt.";
  }
  if (/timeout|storage\/retry-limit|storage\/unknown|404|not found|bucket/i.test(code)) {
    return "Storage non risponde. Attiva Firebase Storage (Console → Storage → Inizia). Intanto riprova: useremo una copia ottimizzata.";
  }
  return "Caricamento non riuscito. Riprova.";
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
      status.textContent = "Preparazione foto…";
      status.style.color = "var(--text-dim)";
    }
    try {
      const url = await uploadFile(file, opts.folder || "uploads", (pct) => {
        if (status) status.textContent = "Caricamento " + pct + "%…";
      });
      hidden.value = url;
      if (url.startsWith("data:") || (file.type && file.type.startsWith("image/"))) setPreview(preview, url);
      if (status) {
        status.textContent = "Foto pronta. Premi Salva per pubblicarla.";
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
      status.textContent = "Preparazione foto…";
      status.style.color = "var(--text-dim)";
    }
    try {
      const urls = [];
      for (const f of files) urls.push(await uploadFile(f, opts.folder || "uploads"));
      const prev = hidden.value.split("\n").map((s) => s.trim()).filter(Boolean);
      hidden.value = [...prev, ...urls].join("\n");
      if (status) {
        status.textContent = (prev.length + urls.length) + " foto pronte. Premi Salva per pubblicarle.";
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
