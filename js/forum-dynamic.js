// ==========================================================================
// Forum — indice: categorie + sezioni (stile forum classico)
// ==========================================================================
import { db, auth, verifiedOrNull } from "./firebase-init.js?v=20260919ad";
import { collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { userNickHtml, userBadgesHtml, onUsersChange, userStats } from "./user-card.js";
import { listenVisibleTopics, viewerIsStaff, areaIsPrivate } from "./forum-privacy.js";
import { prefixChip } from "./forum-tags.js";

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

function formatDate(ts) {
  if (!ts || typeof ts.toDate !== "function") return "";
  return ts.toDate().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function textColorFor(hex) {
  if (!hex) return "#0a0d16";
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0a0d16" : "#ffffff";
}

let staffTags = {};
let categoriesOrdered = [];
let boardsOrdered = [];
let allTopics = [];
let currentUser = null;
let boardsReady = false;

function listenCol(colName, apply, onFail) {
  onSnapshot(collection(db, colName), (snap) => {
    apply(snap);
    render();
  }, (err) => {
    console.error(colName, err);
    if (onFail) onFail(err);
    render();
  });
}

listenCol("staffTags", (snap) => {
  staffTags = {};
  snap.forEach((d) => { staffTags[d.id] = d.data(); });
});

listenCol("forumCategories", (snap) => {
  categoriesOrdered = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
});

listenCol("forumBoards", (snap) => {
  boardsReady = true;
  boardsOrdered = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}, () => { boardsReady = true; });

listenVisibleTopics((topics) => {
  allTopics = topics.slice().sort((a, b) => {
    const ta = a.lastActivityAt?.toMillis?.() || 0;
    const tb = b.lastActivityAt?.toMillis?.() || 0;
    return tb - ta;
  });
  render();
});

onAuthStateChanged(auth, (user) => {
  currentUser = verifiedOrNull(user);
  render();
});

onUsersChange(() => render());

function badgeFor(email) {
  return userBadgesHtml(email);
}

function categoryIcon(cat) {
  const custom = (cat.icon || "").trim();
  if (custom) return custom;
  const n = (cat.name || "").toLowerCase();
  if (n.includes("regol")) return "📜";
  if (n.includes("community") || n.includes("comunit")) return "🎮";
  return "";
}

function statsForBoard(boardId) {
  const topics = allTopics.filter((t) => t.boardId === boardId);
  const discussions = topics.length;
  const messages = topics.reduce((n, t) => n + 1 + (t.replyCount || 0), 0);
  const last = topics[0] || null;
  return { discussions, messages, last };
}

function render() {
  renderIndex();
  renderSide();
}

function renderIndex() {
  const el = document.getElementById("forum-index");
  if (!el) return;

  const unassigned = allTopics.filter((t) => !t.boardId);
  const topicRows = (list) => list.map((t) => `
    <a href="forum-topic.html?id=${t.id}" class="topic-row">
      <div class="topic-row__top">
        <div class="topic-row__title">${escapeHtml(t.title)}</div>
      </div>
      <div class="topic-row__meta">
        <span>di ${userNickHtml(t.authorEmail, t.authorName || "Utente")}${badgeFor(t.authorEmail)}</span>
        <span>💬 ${t.replyCount || 0} risposte</span>
        <span>${formatDate(t.lastActivityAt)}</span>
      </div>
    </a>`).join("");

  if (categoriesOrdered.length === 0 && boardsOrdered.length === 0) {
    el.innerHTML = `
      <div class="forum-empty">
        <strong style="color:var(--text);display:block;margin-bottom:8px;">Il Forum è online, ma è ancora vuoto.</strong>
        Da Dashboard → Forum crea prima una <em>categoria</em> (es. Community) e poi le <em>pagine</em> (Regolamenti, Guide, Discussioni…).
        ${currentUser ? '<br><a href="dashboard.html" style="color:var(--lime);font-weight:700;">Apri la Dashboard</a>' : ""}
      </div>
      ${unassigned.length ? `<h3 style="margin:28px 0 12px;">Argomenti già aperti</h3>${topicRows(unassigned)}` : ""}`;
    return;
  }

  const staff = viewerIsStaff();
  const groups = categoriesOrdered.map((cat) => {
    if (cat.private && !currentUser && !staff) return "";
    const boards = boardsOrdered.filter((b) => b.categoryId === cat.id);
    if (!boards.length) return "";
    const rows = boards.map((b) => boardRow(b, cat)).join("");

    return `
      <section class="forum-group">
        <header class="forum-group__head">
          <span class="forum-group__mark" style="background:${escapeHtml(cat.color || "#ff4dad")}"></span>
          <h2>${escapeHtml(categoryIcon(cat))} ${escapeHtml(cat.name)}</h2>
        </header>
        <div class="forum-group__body">${rows}</div>
      </section>`;
  }).join("");

  const extra = unassigned.length
    ? `<section class="forum-group">
        <header class="forum-group__head"><h2>Altri argomenti</h2></header>
        <div class="forum-group__body" style="padding:8px 12px;">${topicRows(unassigned)}</div>
      </section>`
    : "";

  el.innerHTML = groups + extra;
}

function pageLink(raw) {
  const s = String(raw || "").trim();
  if (!s || /^javascript:/i.test(s)) return "";
  if (/^https?:\/\//i.test(s) || s.startsWith("/") || s.startsWith("mailto:")) return s;
  if (/^[a-z0-9._-]+\.html(\?.*)?$/i.test(s)) return s;
  return "https://" + s;
}

function boardRow(b, cat) {
  const { discussions, messages, last } = statsForBoard(b.id);
  const isRead = b.type === "readonly";
  const priv = areaIsPrivate(cat, b);
  const lastHtml = last
    ? `<a class="forum-board-row__last" href="forum-topic.html?id=${last.id}">
        <span class="forum-board-row__last-meta">${prefixChip(last)}${formatDate(last.createdAt || last.lastActivityAt)}</span>
      </a>`
    : "";

  const href = pageLink(b.link) || `forum-board.html?id=${b.id}`;
  const ext = /^https?:\/\//i.test(href);
  const extra = ext ? ` target="_blank" rel="noopener"` : "";

  return `
    <div class="forum-board-row${last ? " has-last" : ""}">
      <a class="forum-board-row__hit" href="${escapeHtml(href)}"${extra}>
        <div class="forum-board-row__icon" style="color:${escapeHtml(cat.color || "#ff4dad")}">${escapeHtml(b.icon || (isRead ? "📄" : (priv ? "🔒" : "💬")))}</div>
        <div class="forum-board-row__main">
          <div class="forum-board-row__title">${escapeHtml(b.name)}${b.link ? " ↗" : ""}</div>
          <p>${escapeHtml(b.description || (priv ? "Solo tu e lo staff vedete le vostre conversazioni." : ""))}</p>
        </div>
        <div class="forum-board-row__stats">
          ${isRead
            ? `<span class="forum-type-pill">Lettura</span>`
            : `<span><strong>${discussions}</strong> Discussioni</span><span><strong>${messages}</strong> Messaggi</span>`}
        </div>
      </a>
      ${lastHtml}
    </div>`;
}

function renderSide() {
  const el = document.getElementById("forum-side");
  if (!el) return;

  const authBox = currentUser
    ? `<div class="forum-side-card">
        <p class="forum-side-card__kicker">Sei connesso</p>
        <strong>${escapeHtml(currentUser.displayName || currentUser.email.split("@")[0])}</strong>
        <p style="margin:8px 0 0;font-size:13px;">Entra in una sezione per leggere o aprire una conversazione.</p>
      </div>`
    : `<div class="forum-side-card">
        <a class="btn btn--lime" href="login.html" style="width:100%;justify-content:center;">Entra</a>
        <a class="btn btn--outline" href="register.html" style="width:100%;justify-content:center;margin-top:10px;">Registrati</a>
      </div>`;

  const discussions = allTopics.length;
  const messages = allTopics.reduce((n, t) => n + 1 + (t.replyCount || 0), 0);
  const us = userStats();
  const fmt = (n) => Number(n || 0).toLocaleString("it-IT");

  const pageUrl = encodeURIComponent(location.href.split("#")[0]);
  const pageTitle = encodeURIComponent(document.title || "Forum Gaming Relax");

  el.innerHTML = `
    ${authBox}
    <div class="forum-side-card">
      <p class="forum-side-card__kicker">Statistiche forum</p>
      <div class="forum-stats">
        <div><span>Discussioni:</span><strong>${fmt(discussions)}</strong></div>
        <div><span>Messaggi:</span><strong>${fmt(messages)}</strong></div>
        <div><span>Utenti registrati:</span><strong>${fmt(us.count)}</strong></div>
        <div><span>Ultimo registrato:</span><strong>${escapeHtml(us.lastName)}</strong></div>
      </div>
    </div>
    <div class="forum-side-card">
      <p class="forum-side-card__kicker">Condividi questa pagina</p>
      <div class="forum-share">
        <a href="https://www.facebook.com/sharer/sharer.php?u=${pageUrl}" target="_blank" rel="noopener" aria-label="Facebook">${shareIco("fb")}</a>
        <a href="https://wa.me/?text=${pageTitle}%20${pageUrl}" target="_blank" rel="noopener" aria-label="WhatsApp">${shareIco("wa")}</a>
        <button type="button" class="forum-share-app" data-app="ig" aria-label="Instagram">${shareIco("ig")}</button>
        <button type="button" class="forum-share-app" data-app="dc" aria-label="Discord">${shareIco("dc")}</button>
        <button type="button" id="forum-copy-link" aria-label="Copia link">${shareIco("link")}</button>
      </div>
      <p class="forum-share-hint" id="forum-share-hint" hidden>Link copiato, incollalo dove vuoi.</p>
    </div>`;

  const copyUrl = location.href.split("#")[0];
  const hint = document.getElementById("forum-share-hint");
  async function copyPageLink() {
    try { await navigator.clipboard.writeText(copyUrl); } catch (_) {}
    if (hint) {
      hint.hidden = false;
      setTimeout(() => { hint.hidden = true; }, 1800);
    }
  }
  document.getElementById("forum-copy-link")?.addEventListener("click", copyPageLink);
  const apps = {
    ig: "https://www.instagram.com/gamingrelaxofficials/",
    dc: "https://discord.gg/5MxfYT7C5f"
  };
  document.querySelectorAll(".forum-share-app").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await copyPageLink();
      const dest = apps[btn.dataset.app];
      if (dest) window.open(dest, "_blank", "noopener");
    });
  });
}

function shareIco(name) {
  const p = {
    fb: "M15 8h-3V6c0-.8.2-1 1-1h2V2h-3a4 4 0 0 0-4 4v2H6v3h2v9h3v-9h2.5L15 8z",
    wa: "M12 2a10 10 0 0 0-8.7 15L2 22l5.2-1.3A10 10 0 1 0 12 2zm5.7 14.3c-.2.7-1.2 1.2-2 1.4-.5.1-1.2.2-3.5-.7-2.9-1.2-4.8-4.2-4.9-4.4-.2-.2-1.3-1.7-1.3-3.3 0-1.5.8-2.3 1.1-2.6.3-.3.7-.4 1-.4h.7c.2 0 .5 0 .7.6l1 2.4c.1.2.1.4 0 .6l-.4.7c-.1.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l.9-1.2c.2-.2.4-.2.7-.1l2.3 1.1c.3.1.5.2.6.4.1.4 0 1.1-.2 1.8z",
    ig: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17.8 6.2a1 1 0 1 1-1 1 1 1 0 0 1 1-1z",
    dc: "M19.54 5.16A16.9 16.9 0 0 0 15.26 4c-.2.36-.43.85-.59 1.23a15.4 15.4 0 0 0-5.34 0A10.6 10.6 0 0 0 8.74 4 16.9 16.9 0 0 0 4.46 5.16C1.73 9.3.96 13.32 1.33 17.24c2.18 1.61 4.3 2.58 6.37 3.21l.81-1.4a12.4 12.4 0 0 1-1.96-.94l.38-.3c3.92 1.82 8.17 1.82 12.04 0l.39.3c-.62.37-1.28.68-1.96.94l.81 1.4c2.07-.63 4.19-1.6 6.37-3.21.44-4.54-.73-8.52-3.48-12.08zM8.68 14.72c-1.04 0-1.9-.96-1.9-2.13s.84-2.14 1.9-2.14 1.91.96 1.9 2.14c0 1.17-.84 2.13-1.9 2.13zm6.64 0c-1.04 0-1.9-.96-1.9-2.13s.84-2.14 1.9-2.14 1.91.96 1.9 2.14c0 1.17-.83 2.13-1.9 2.13z",
    link: "M10.5 13.5a4 4 0 0 1 0-5.6l2-2a4 4 0 1 1 5.6 5.6l-1.2 1.2-1.4-1.4 1.2-1.2a2 2 0 1 0-2.8-2.8l-2 2a2 2 0 0 0 0 2.8l-1.4 1.4zm3 3a4 4 0 0 1 0-5.6l1.4 1.4a2 2 0 0 0 0 2.8l-2 2a2 2 0 1 1-2.8-2.8l1.2-1.2-1.4-1.4-1.2 1.2a4 4 0 1 0 5.6 5.6l2-2-1.4-1.4-2 2a2 2 0 0 1-2.8 0z"
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${p[name]}"/></svg>`;
}

render();
