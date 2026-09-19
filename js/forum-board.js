// ==========================================================================
// Forum — pagina sezione: contenuto in sola lettura OPPURE elenco conversazioni
// ==========================================================================
import { db, auth, ADMIN_EMAIL, verifiedOrNull } from "./firebase-init.js?v=20260919ad";
import { doc, getDoc, collection, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { userNickHtml, userBadgesHtml, bumpMessageCount } from "./user-card.js";
import { listenVisibleTopics, viewerIsStaff, areaIsPrivate } from "./forum-privacy.js";
import { uploadFile } from "./upload.js";

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
  return ts.toDate().toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function textColorFor(hex) {
  if (!hex) return "#0a0d16";
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0a0d16" : "#ffffff";
}

const STATUS_META = {
  open:     { label: "Aperto",     color: "#22c55e", bg: "rgba(34,197,94,0.18)" },
  closed:   { label: "Chiuso",     color: "#94a3b8", bg: "rgba(148,163,184,0.18)" },
  onhold:   { label: "In attesa",  color: "#f59e0b", bg: "rgba(245,158,11,0.18)" },
  approved: { label: "Approvato",  color: "#06b6d4", bg: "rgba(6,182,212,0.18)" },
  rejected: { label: "Respinto",   color: "#ef4444", bg: "rgba(239,68,68,0.18)" }
};

function statusBadge(status) {
  const s = STATUS_META[status] || STATUS_META.open;
  return `<span class="status-badge" style="color:${s.color};background:${s.bg};border:1px solid ${s.color}33;">${s.label}</span>`;
}

const params = new URLSearchParams(window.location.search);
const boardId = params.get("id");
const headerEl = document.getElementById("board-header");
const bodyEl = document.getElementById("board-body");
const newTopicEl = document.getElementById("new-topic-area");

let currentUser = null;
let board = null;
let category = null;
let staffTags = {};
let topics = [];

onSnapshot(collection(db, "staffTags"), (snap) => {
  staffTags = {};
  snap.forEach((d) => { staffTags[d.id] = d.data(); });
  if (board && board.type !== "readonly") renderTopics();
});

function badgeFor(email) {
  return userBadgesHtml(email);
}

onAuthStateChanged(auth, (user) => {
  currentUser = verifiedOrNull(user);
  renderNewTopic();
});

if (!boardId) {
  headerEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Sezione non specificata. <a href="forum.html">Torna al Forum</a>.</p>';
} else {
  loadBoard();
}

async function loadBoard() {
  try {
    const snap = await getDoc(doc(db, "forumBoards", boardId));
    if (!snap.exists()) {
      headerEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Sezione non trovata. <a href="forum.html">Torna al Forum</a>.</p>';
      return;
    }
    board = { id: snap.id, ...snap.data() };
    if (board.categoryId) {
      const catSnap = await getDoc(doc(db, "forumCategories", board.categoryId));
      category = catSnap.exists() ? { id: catSnap.id, ...catSnap.data() } : null;
    }
    const priv = areaIsPrivate(category, board);
    document.title = `${board.name} — Forum Gaming Relax`;
    headerEl.innerHTML = `
      <div class="board-hero">
        <div class="board-hero__icon">${escapeHtml(board.icon || (board.type === "readonly" ? "📄" : (priv ? "🔒" : "💬")))}</div>
        <div>
          <p class="board-hero__type">${board.type === "readonly" ? "Pagina in sola lettura" : (priv ? "Sezione privata — solo tu e lo staff" : "Sezione conversazioni")}${priv ? ' <span class="forum-lock-pill">Privata</span>' : ""}</p>
          <h1>${escapeHtml(board.name)}</h1>
          <p class="lede" style="margin:0;">${escapeHtml(board.description || "")}</p>
        </div>
      </div>`;

    if (board.type === "readonly") {
      newTopicEl.innerHTML = "";
      const text = (board.content || "").trim();
      bodyEl.innerHTML = `<article class="board-article">${text ? escapeHtml(text) : "Questa pagina non ha ancora un contenuto. Lo staff può inserirlo dalla Dashboard."}</article>`;
      return;
    }

    listenTopics();
    renderNewTopic();
  } catch {
    headerEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Impossibile caricare la sezione.</p>';
  }
}

function listenTopics() {
  listenVisibleTopics((list) => {
    topics = list.filter((t) => t.boardId === boardId);
    renderTopics();
  });
}

function renderTopics() {
  if (!bodyEl || !board || board.type === "readonly") return;
  const docs = topics.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  if (docs.length === 0) {
    const priv = areaIsPrivate(category, board);
    const msg = priv && !viewerIsStaff()
      ? "Non hai ancora conversazioni private qui. Aprine una: la vedranno solo tu e lo staff."
      : "Nessuna conversazione in questa sezione.";
    bodyEl.innerHTML = `<p style="text-align:center;color:var(--text-dim);padding:24px 0;">${msg}</p>`;
    return;
  }
  bodyEl.innerHTML = docs.map((t) => {
    const pinnedIcon = t.pinned ? `<span class="pin-icon">📌</span>` : "";
    const lockedIcon = t.locked ? `<span class="lock-icon">🔒</span>` : "";
    return `
      <a href="forum-topic.html?id=${t.id}" class="topic-row ${t.pinned ? "topic-row--pinned" : ""}">
        <div class="topic-row__top">
          ${pinnedIcon}
          <div class="topic-row__title">${escapeHtml(t.title)}</div>
          ${statusBadge(t.status || "open")}
          ${lockedIcon}
        </div>
        <div class="topic-row__meta">
          <span>di ${userNickHtml(t.authorEmail, t.authorName || "Utente")}${badgeFor(t.authorEmail)}</span>
          <span>💬 ${t.replyCount || 0} risposte</span>
          <span>Ultima attività: ${formatDate(t.lastActivityAt)}</span>
        </div>
      </a>`;
  }).join("");
}

function renderNewTopic() {
  if (!newTopicEl || !board || board.type === "readonly") return;

  if (!currentUser) {
    const priv = areaIsPrivate(category, board);
    newTopicEl.innerHTML = priv
      ? '<div class="forum-login-prompt">Sezione privata: <a href="login.html">accedi</a> per aprire una conversazione visibile solo a te e allo staff.</div>'
      : '<div class="forum-login-prompt">Devi <a href="login.html">accedere</a> per aprire una conversazione in questa sezione.</div>';
    return;
  }

  newTopicEl.innerHTML = `
    <button type="button" class="btn btn--lime new-topic-toggle" id="new-topic-btn">+ Nuova conversazione</button>
    <div class="dash-form-card" id="new-topic-form-wrap" style="display:none;margin-top:16px;">
      <form id="new-topic-form">
        <div class="field">
          <label for="nt-title">Titolo</label>
          <input type="text" id="nt-title" required maxlength="120">
        </div>
        <div class="field">
          <label for="nt-text">Messaggio</label>
          <textarea id="nt-text" required rows="5"></textarea>
        </div>
        <div class="field">
          <label for="nt-image">Immagine (opzionale)</label>
          <input type="file" id="nt-image" accept="image/*">
        </div>
        <button type="submit" class="btn btn--lime">Pubblica</button>
      </form>
    </div>`;

  document.getElementById("new-topic-btn").addEventListener("click", () => {
    const wrap = document.getElementById("new-topic-form-wrap");
    wrap.style.display = wrap.style.display === "none" ? "block" : "none";
  });

  document.getElementById("new-topic-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const authorName = currentUser.displayName || currentUser.email.split("@")[0];
    try {
      const topicRef = doc(collection(db, "forumTopics"));
      const imageFile = document.getElementById("nt-image").files?.[0];
      const imageUrl = imageFile ? await uploadFile(imageFile, "forum") : "";
      await setDoc(topicRef, {
        title: document.getElementById("nt-title").value.trim(),
        categoryId: board.categoryId || "",
        boardId,
        authorEmail: currentUser.email,
        authorName,
        createdAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        replyCount: 0,
        status: "open",
        locked: false,
        pinned: false,
        private: areaIsPrivate(category, board)
      });
      const post = {
        authorEmail: currentUser.email,
        authorName,
        text: document.getElementById("nt-text").value.trim(),
        createdAt: serverTimestamp()
      };
      if (imageUrl) post.imageUrl = imageUrl;
      await addDoc(collection(db, "forumTopics", topicRef.id, "posts"), post);
      await bumpMessageCount(currentUser.uid);
      window.location.href = `forum-topic.html?id=${topicRef.id}`;
    } catch (err) {
      console.error("pubblica topic", err);
      alert("Errore nella pubblicazione. Riprova.");
      submitBtn.disabled = false;
    }
  });
}
