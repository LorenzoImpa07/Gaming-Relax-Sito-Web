// ==========================================================================
// Profilo al passaggio del mouse sul nickname (forum)
// Ruolo Membro di default + ruoli extra da Dashboard
// ==========================================================================
import { db } from "./firebase-init.js";
import {
  collection, doc, onSnapshot, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHtml(str = "") {
  const map = {
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
    "'": "&#39;"
  };
  return String(str).replace(/[&<>"']/g, (m) => map[m]);
}

function textColorFor(hex) {
  if (!hex) return "#0a0d16";
  const c = String(hex).replace("#", "");
  if (c.length < 6) return "#0a0d16";
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0a0d16" : "#ffffff";
}

function formatLong(ts) {
  if (!ts || typeof ts.toDate !== "function") return "—";
  return ts.toDate().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

const MEMBRO = { id: "membro", label: "Membro", color: "#f2f3f5", isDefault: true };

let usersByEmail = {};
let usersByUid = {};
let rolesOrdered = [];
let staffTags = {};
let hideTimer = null;
let usersReady = false;
const userListeners = [];

onSnapshot(collection(db, "users"), (snap) => {
  usersByEmail = {};
  usersByUid = {};
  snap.forEach((d) => {
    const u = { id: d.id, ...d.data() };
    usersByUid[d.id] = u;
    if (u.email) usersByEmail[String(u.email).toLowerCase()] = u;
  });
  usersReady = true;
  userListeners.forEach((fn) => { try { fn(); } catch (_) {} });
});

onSnapshot(collection(db, "forumRoles"), (snap) => {
  rolesOrdered = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
});

onSnapshot(collection(db, "staffTags"), (snap) => {
  staffTags = {};
  snap.forEach((d) => { staffTags[d.id] = d.data(); });
});

function userByEmail(email) {
  if (!email) return null;
  return usersByEmail[String(email).toLowerCase()] || null;
}

export function onUsersChange(fn) {
  userListeners.push(fn);
  if (usersReady) fn();
}

export function isStaffByUid(uid) {
  if (!uid) return false;
  const ids = usersByUid[uid]?.roleIds;
  return Array.isArray(ids) && ids.length > 0;
}

function badgesFor(email) {
  const list = [];
  const defaultRole = rolesOrdered.find((r) => r.isDefault) || MEMBRO;
  list.push(defaultRole);
  const u = userByEmail(email);
  const extra = Array.isArray(u?.roleIds) ? u.roleIds : [];
  extra.forEach((id) => {
    const role = rolesOrdered.find((r) => r.id === id && !r.isDefault);
    if (role) list.push(role);
  });
  const tag = staffTags[email];
  if (tag && !list.some((r) => r.label.toLowerCase() === String(tag.label || "").toLowerCase())) {
    list.push({ id: "tag", label: tag.label, color: tag.color || "#ff4dad" });
  }
  return list;
}

export function userBadgesHtml(email) {
  return badgesFor(email).map((r) => {
    const bg = r.color || "#f2f3f5";
    return `<span class="staff-badge" style="background:${escapeHtml(bg)};color:${textColorFor(bg)};">${escapeHtml(r.label)}</span>`;
  }).join("");
}

export function userNickHtml(email, name) {
  const n = name || "Utente";
  return `<span class="user-nick" data-email="${escapeHtml(email || "")}" data-name="${escapeHtml(n)}">${escapeHtml(n)}</span>`;
}

export async function bumpMessageCount(uid) {
  if (!uid) return;
  try {
    await updateDoc(doc(db, "users", uid), { messageCount: increment(1) });
  } catch (_) {}
}

function cardEl() {
  let el = document.getElementById("user-hover-card");
  if (el) return el;
  el = document.createElement("div");
  el.id = "user-hover-card";
  el.className = "user-hover";
  document.body.appendChild(el);
  el.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  el.addEventListener("mouseleave", hideCardSoon);
  return el;
}

function hideCardSoon() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    const el = document.getElementById("user-hover-card");
    if (el) el.classList.remove("is-on");
  }, 180);
}

function showCard(anchor) {
  const email = anchor.getAttribute("data-email") || "";
  const name = anchor.getAttribute("data-name") || "Utente";
  const u = userByEmail(email);
  const initial = name.charAt(0).toUpperCase();
  const badges = userBadgesHtml(email);
  const messages = u?.messageCount || 0;
  const joined = formatLong(u?.createdAt);
  const seen = formatLong(u?.lastLoginAt);
  const photo = u?.photoURL || "";
  const el = cardEl();
  el.innerHTML = `
    <div class="user-hover__top">
      <div class="user-hover__avatar">${photo ? `<img src="${escapeHtml(photo)}" alt="">` : escapeHtml(initial)}</div>
      <div>
        <div class="user-hover__name">${escapeHtml(name)}</div>
        <div class="user-hover__badges">${badges}</div>
      </div>
    </div>
    <div class="user-hover__meta">
      <span>Iscritto dal: <strong>${joined}</strong></span>
      <span>Ultimo accesso: <strong>${seen}</strong></span>
    </div>
    <div class="user-hover__stats">
      <div><strong>${messages}</strong><span>Messaggi</span></div>
    </div>
  `;
  const r = anchor.getBoundingClientRect();
  const w = 320;
  let left = r.left + window.scrollX;
  if (left + w > window.scrollX + window.innerWidth - 12) left = window.scrollX + window.innerWidth - w - 12;
  let top = r.bottom + window.scrollY + 8;
  el.style.left = left + "px";
  el.style.top = top + "px";
  el.classList.add("is-on");
  requestAnimationFrame(() => {
    const cr = el.getBoundingClientRect();
    if (cr.bottom > window.innerHeight - 8) {
      el.style.top = (r.top + window.scrollY - cr.height - 8) + "px";
    }
  });
}

let bound = false;
export function initUserCards() {
  if (bound) return;
  bound = true;
  document.addEventListener("mouseover", (e) => {
    const nick = e.target.closest(".user-nick");
    if (!nick) return;
    clearTimeout(hideTimer);
    showCard(nick);
  });
  document.addEventListener("mouseout", (e) => {
    const nick = e.target.closest(".user-nick");
    if (!nick) return;
    const to = e.relatedTarget;
    if (to && (nick.contains(to) || document.getElementById("user-hover-card")?.contains(to))) return;
    hideCardSoon();
  });
}

initUserCards();
