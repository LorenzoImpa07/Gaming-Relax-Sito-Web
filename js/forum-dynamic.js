// ==========================================================================
// Forum — indice: categorie + sezioni (stile forum classico)
// ==========================================================================
import { db, auth, verifiedOrNull } from "./firebase-init.js?v=20260919ad";
import { collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { userNickHtml, userBadgesHtml } from "./user-card.js";
import { listenVisibleTopics, viewerIsStaff, areaIsPrivate } from "./forum-privacy.js";

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
  return ts.toDate().toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
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
    const rows = boards.length
      ? boards.map((b) => boardRow(b, cat)).join("")
      : `<div class="forum-board-row forum-board-row--empty">Nessuna pagina in questa categoria. Creala da Dashboard → Forum → Pagine / sezioni.</div>`;

    const lock = cat.private ? `<span class="forum-lock-pill">Privata</span>` : "";
    return `
      <section class="forum-group">
        <header class="forum-group__head">
          <span class="forum-group__mark" style="background:${escapeHtml(cat.color || "#ff4dad")}"></span>
          <h2>${escapeHtml(categoryIcon(cat))} ${escapeHtml(cat.name)} ${lock}</h2>
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

function boardRow(b, cat) {
  const { discussions, messages, last } = statsForBoard(b.id);
  const isRead = b.type === "readonly";
  const priv = areaIsPrivate(cat, b);
  const lastHtml = last
    ? `<a class="forum-board-row__last" href="forum-topic.html?id=${last.id}">
        <span class="forum-board-row__last-title">${escapeHtml(last.title)}</span>
        <span>${formatDate(last.lastActivityAt)} · ${userNickHtml(last.authorEmail, last.authorName || "Utente")}${badgeFor(last.authorEmail)}</span>
      </a>`
    : `<div class="forum-board-row__last"><span>${isRead ? "Solo lettura" : (priv ? "Conversazioni private" : "Nessuna discussione")}</span></div>`;

  return `
    <div class="forum-board-row">
      <a class="forum-board-row__hit" href="forum-board.html?id=${b.id}">
        <div class="forum-board-row__icon" style="color:${escapeHtml(cat.color || "#ff4dad")}">${escapeHtml(b.icon || (isRead ? "📄" : (priv ? "🔒" : "💬")))}</div>
        <div class="forum-board-row__main">
          <div class="forum-board-row__title">${escapeHtml(b.name)}${priv ? ' <span class="forum-lock-pill">Privata</span>' : ""}</div>
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

  const latest = allTopics.slice(0, 5).map((t) => `
    <a class="forum-side-msg" href="forum-topic.html?id=${t.id}">
      <strong>${escapeHtml(t.title)}</strong>
      <span>${userNickHtml(t.authorEmail, t.authorName || "Utente")} · ${formatDate(t.lastActivityAt)}</span>
    </a>`).join("") || '<p class="forum-side-empty">Nessun messaggio ancora.</p>';

  el.innerHTML = `
    ${authBox}
    <div class="forum-side-card">
      <p class="forum-side-card__kicker">Ultimi messaggi</p>
      ${latest}
    </div>`;
}

render();
