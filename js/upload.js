function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });
}

export async function compressImage(file, maxSide = 1200, maxChars = 720000) {
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
  let q = 0.74;
  let data = canvas.toDataURL("image/jpeg", q);
  while (data.length > maxChars && q > 0.38) {
    q -= 0.08;
    data = canvas.toDataURL("image/jpeg", q);
  }
  if (data.length > maxChars && maxSide > 640) {
    return compressImage(file, Math.round(maxSide * 0.75), maxChars);
  }
  if (data.length > 900000) throw new Error("too-big");
  return data;
}

const SIZE = {
  avatars: 256,
  products: 1100,
  team: 800,
  gallery: 1000,
  news: 1100,
  backgrounds: 1600,
  logo: 400,
  forum: 900,
  reviews: 900,
  uploads: 1100
};

export async function uploadFile(file, folder = "uploads") {
  if (!file) return "";
  if (file.type && file.type.startsWith("video/")) {
    throw new Error("video");
  }
  const side = SIZE[folder] || 1100;
  const maxChars = folder === "avatars" ? 180000 : folder === "backgrounds" ? 820000 : 720000;
  return compressImage(file, side, maxChars);
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
    if (file.type && file.type.startsWith("video/")) {
      if (status) {
        status.textContent = "I video non stanno nel piano gratis. Caricali su GitHub in videos/ e scrivi es. videos/sfondo.mp4";
        status.style.color = "#fca5a5";
      }
      return;
    }
    if (status) { status.textContent = "Ottimizzazione foto…"; status.style.color = "var(--text-dim)"; }
    try {
      const url = await uploadFile(file, opts.folder || "uploads");
      hidden.value = url;
      setPreview(preview, url);
      if (status) { status.textContent = "Foto pronta. Salva per pubblicarla."; status.style.color = "var(--lime)"; }
    } catch (_) {
      if (status) {
        status.textContent = "Foto troppo pesante. Usa un jpg più piccolo.";
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
    const files = [...(fileEl.files || [])].slice(0, 4);
    if (!files.length) return;
    if (status) { status.textContent = "Ottimizzazione foto…"; status.style.color = "var(--text-dim)"; }
    try {
      const urls = [];
      for (const f of files) urls.push(await uploadFile(f, opts.folder || "uploads"));
      const prev = hidden.value.split("\n").map((s) => s.trim()).filter(Boolean);
      const all = [...prev, ...urls];
      let out = [];
      let total = 0;
      for (const u of all) {
        if (total + u.length > 800000) break;
        out.push(u);
        total += u.length;
      }
      hidden.value = out.join("\n");
      if (status) {
        status.textContent = out.length + " foto pronte. Salva per pubblicarle.";
        status.style.color = "var(--lime)";
      }
    } catch (_) {
      if (status) {
        status.textContent = "Una foto è troppo pesante. Usa jpg più piccoli.";
        status.style.color = "#fca5a5";
      }
    }
  });
}
