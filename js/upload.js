import { storage, storageAlt, auth, authReady } from "./firebase-init.js?v=20260920n";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function safeName(file) {
  const raw = String(file?.name || "foto.jpg").replace(/[^\w.\-]+/g, "_");
  return (raw || "foto.jpg").slice(0, 80);
}

function looksLikeImage(file) {
  const t = String(file?.type || "").toLowerCase();
  const n = String(file?.name || "").toLowerCase();
  if (t.startsWith("image/")) return true;
  if (/\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(n)) return true;
  return !t;
}

function isHeic(file) {
  const t = String(file?.type || "").toLowerCase();
  const n = String(file?.name || "").toLowerCase();
  return t.includes("heic") || t.includes("heif") || /\.hei[cf]$/i.test(n);
}

function waitUser(ms = 5000) {
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

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img"));
    img.src = src;
  });
}

function canvasToJpeg(img, maxSide, quality) {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error("size");
  if (w > maxSide || h > maxSide) {
    if (w > h) { h = Math.round(h * maxSide / w); w = maxSide; }
    else { w = Math.round(w * maxSide / h); h = maxSide; }
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", quality);
  });
}

async function heicToJpeg(file) {
  const mod = await import("https://esm.sh/heic2any@0.0.4");
  const fn = mod.default || mod;
  const out = await fn({ blob: file, toType: "image/jpeg", quality: 0.86 });
  return Array.isArray(out) ? out[0] : out;
}

async function toJpegBlob(file) {
  let src = file;
  if (isHeic(file)) {
    try { src = await heicToJpeg(file); }
    catch (_) { src = file; }
  }
  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(src);
      const blob = await canvasToJpeg(bmp, 1800, 0.86);
      try { bmp.close(); } catch (_) {}
      return blob;
    }
  } catch (_) {}
  const data = await readAsDataURL(src);
  const img = await loadImg(data);
  return canvasToJpeg(img, 1800, 0.86);
}

async function blobToDataUrl(blob, maxChars = 700000) {
  let q = 0.82;
  let side = 1400;
  let img;
  try {
    const data = await readAsDataURL(blob);
    img = await loadImg(data);
  } catch {
    return readAsDataURL(blob);
  }
  let out = await new Promise((resolve) => {
    const c = document.createElement("canvas");
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > side || h > side) {
      if (w > h) { h = Math.round(h * side / w); w = side; }
      else { w = Math.round(w * side / h); h = side; }
    }
    c.width = w;
    c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    resolve(c.toDataURL("image/jpeg", q));
  });
  while (out.length > maxChars && q > 0.4) {
    q -= 0.12;
    const c = document.createElement("canvas");
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    const m = Math.round(side * q / 0.82);
    if (w > m || h > m) {
      if (w > h) { h = Math.round(h * m / w); w = m; }
      else { w = Math.round(w * m / h); h = m; }
    }
    c.width = w;
    c.height = h;
    c.getContext("2d").drawImage(img, 0, 0, w, h);
    out = c.toDataURL("image/jpeg", q);
  }
  return out;
}

async function putStorage(store, blob, path) {
  const fileRef = ref(store, path);
  const work = uploadBytes(fileRef, blob, { contentType: blob.type || "image/jpeg" }).then(() => getDownloadURL(fileRef));
  const boom = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 16000));
  return Promise.race([work, boom]);
}

export async function uploadFile(file, folder = "uploads", onProgress) {
  if (!file) return "";
  await authReady.catch(() => {});
  await waitUser();
  const image = looksLikeImage(file);
  let jpeg = null;
  if (image) {
    if (onProgress) onProgress(8);
    try { jpeg = await toJpegBlob(file); } catch (_) { jpeg = null; }
  }
  const payload = jpeg || file;
  const name = safeName(file).replace(/\.(heic|heif)$/i, ".jpg");
  const path = (folder || "uploads") + "/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) + "_" + name;
  if (onProgress) onProgress(20);
  try {
    const url = await putStorage(storage, payload, path);
    if (onProgress) onProgress(100);
    return url;
  } catch (_) {
    try {
      const url = await putStorage(storageAlt, payload, path);
      if (onProgress) onProgress(100);
      return url;
    } catch (e2) {
      if (image) {
        if (onProgress) onProgress(70);
        if (jpeg) return blobToDataUrl(jpeg);
        try { return await blobToDataUrl(payload); } catch (_) {}
        try { return await readAsDataURL(file); } catch (_) {}
      }
      throw e2;
    }
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
  if (/heic|img|read/i.test(code)) {
    return "Questa foto della galleria non è supportata così com'è. Su iPhone: Impostazioni → Fotocamera → Formati → più compatibile, oppure invia la foto in JPEG.";
  }
  if (/not-auth|unauthenticated/i.test(code)) return "Devi essere connesso per caricare file.";
  if (/storage\/unauthorized|permission/i.test(code)) {
    return "Accesso negato a Storage. Console Firebase → Storage → Regole → pubblica storage.rules.txt.";
  }
  if (/timeout|storage\/retry-limit|storage\/unknown|404|not found|bucket/i.test(code)) {
    return "Storage non attivo. Console Firebase → Storage → Inizia. Poi riprova.";
  }
  return "Caricamento non riuscito. Riprova con un JPEG o PNG.";
}

export function bindUploader(opts) {
  const fileEl = document.getElementById(opts.fileId);
  const hidden = document.getElementById(opts.hiddenId);
  const preview = opts.previewId ? document.getElementById(opts.previewId) : null;
  const status = opts.statusId ? document.getElementById(opts.statusId) : null;
  if (!fileEl || !hidden) return;
  fileEl.setAttribute("accept", "image/*,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif");
  if (hidden.value) setPreview(preview, hidden.value);
  if (fileEl.dataset.uploadBound === "1") return;
  fileEl.dataset.uploadBound = "1";
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
      if (!url) throw new Error("empty");
      hidden.value = url;
      setPreview(preview, url);
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
  fileEl.setAttribute("accept", "image/*,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif");
  if (fileEl.dataset.uploadBound === "1") return;
  fileEl.dataset.uploadBound = "1";
  fileEl.addEventListener("change", async () => {
    const files = [...(fileEl.files || [])];
    if (!files.length) return;
    if (status) {
      status.textContent = "Preparazione foto…";
      status.style.color = "var(--text-dim)";
    }
    try {
      const urls = [];
      for (const f of files) {
        const u = await uploadFile(f, opts.folder || "uploads");
        if (u) urls.push(u);
      }
      if (!urls.length) throw new Error("empty");
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
