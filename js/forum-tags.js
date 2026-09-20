export const FORUM_PREFIXES = [
  { id: "", label: "Nessun tag", color: "", text: "" },
  { id: "guida", label: "Guida", color: "#eab308", text: "#1c1403" },
  { id: "regolamento", label: "Regolamento", color: "#3b82f6", text: "#fff" },
  { id: "risolto", label: "Risolto", color: "#22c55e", text: "#052e16" },
  { id: "inattesa", label: "In attesa", color: "#f59e0b", text: "#1c1403" },
  { id: "chiuso", label: "Chiuso", color: "#64748b", text: "#fff" },
  { id: "respinto", label: "Respinto", color: "#ef4444", text: "#fff" }
];

export function resolvePrefix(t = {}) {
  if (t.prefix) return t.prefix;
  const s = t.status;
  if (s === "approved") return "risolto";
  if (s === "rejected") return "respinto";
  if (s === "onhold") return "inattesa";
  if (s === "closed") return "chiuso";
  return "";
}

export function prefixChip(t) {
  const id = resolvePrefix(t);
  const p = FORUM_PREFIXES.find((x) => x.id === id);
  if (!p || !p.id) return "";
  return `<span class="forum-tag" style="background:${p.color};color:${p.text}">${p.label}</span>`;
}

export function prefixSelectHtml(current, selectId = "nt-prefix") {
  const cur = current || "";
  const opts = FORUM_PREFIXES.map((p) =>
    `<option value="${p.id}" ${p.id === cur ? "selected" : ""}>${p.label}</option>`
  ).join("");
  return `<select id="${selectId}" class="mod-select">${opts}</select>`;
}

export function prefixPatch(prefix) {
  const p = prefix || "";
  const patch = { prefix: p };
  if (p === "risolto") patch.status = "approved";
  else if (p === "respinto") { patch.status = "rejected"; patch.locked = true; }
  else if (p === "inattesa") patch.status = "onhold";
  else if (p === "chiuso") { patch.status = "closed"; patch.locked = true; }
  return patch;
}
