// ==========================================================================
// Forum — pagina singolo argomento: messaggi in tempo reale + moderazione
// Sistema custom con stati, lock, pin e permessi staff
// ==========================================================================
import { db, auth, verifiedOrNull } from "./firebase-init.js?v=20260919y";
import { doc, getDoc, updateDoc, deleteDoc, collection, query, orderBy, addDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { userNickHtml, userBadgesHtml, bumpMessageCount, onUsersChange } from "./user-card.js";
import { viewerIsStaff } from "./forum-privacy.js";
import { uploadFile } from "./upload.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function formatDate(ts) {
  if (!ts || typeof ts.toDate !== "function") return "";
  return ts.toDate().toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function textColorFor(hex) {
  if (!hex) return "#0a0d16";
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0a0d16" : "#ffffff";
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

let staffTags = {};
let categories = {};
let boards = {};

onSnapshot(collection(db, "staffTags"), (snap) => {
  staffTags = {};
  snap.forEach((d) => { staffTags[d.id] = d.data(); });
  if (currentTopicData) renderTopicHeader(currentTopicData);
});

onSnapshot(collection(db, "forumCategories"), (snap) => {
  categories = {};
  snap.forEach((d) => { categories[d.id] = d.data(); });
  if (currentTopicData) renderTopicHeader(currentTopicData);
});

onSnapshot(collection(db, "forumBoards"), (snap) => {
  boards = {};
  snap.forEach((d) => { boards[d.id] = { id: d.id, ...d.data() }; });
  if (currentTopicData) renderTopicHeader(currentTopicData);
});

function badgeFor(email) {
  return userBadgesHtml(email);
}

function categoryBadge(catId) {
  const cat = categories[catId];
  if (!cat) return "";
  return `<span class="cat-badge" style="color:${escapeHtml(cat.color || "#c6ff1a")};background:${escapeHtml(cat.color || "#c6ff1a")}18;border:1px solid ${escapeHtml(cat.color || "#c6ff1a")}44;">${escapeHtml(cat.name)}</span>`;
}

const params = new URLSearchParams(window.location.search);
const topicId = params.get("id");
const headerEl = document.getElementById("topic-header");
const postsEl = document.getElementById("posts-list");
const replyAreaEl = document.getElementById("reply-area");

let currentUser = null;
let currentTopicData = null;

function canModerate() {
  return viewerIsStaff();
}

if (!topicId) {
  headerEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Argomento non specificato. <a href="forum.html">Torna al Forum</a>.</p>';
} else {
  loadTopic();
  loadPosts();
  onAuthStateChanged(auth, (user) => {
    currentUser = verifiedOrNull(user);
    renderReplyForm();
    if (currentTopicData) renderTopicHeader(currentTopicData);
  });
  onUsersChange(() => {
    if (currentTopicData) renderTopicHeader(currentTopicData);
    renderReplyForm();
  });
}

async function loadTopic() {
  try {
    const snap = await getDoc(doc(db, "forumTopics", topicId));
    if (!snap.exists()) {
      headerEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Argomento non trovato. <a href="forum.html">Torna al Forum</a>.</p>';
      return;
    }
    currentTopicData = snap.data();
    document.title = `${currentTopicData.title} — Forum Gaming Relax`;
    renderTopicHeader(currentTopicData);
  } catch (err) {
    const denied = String(err?.code || err?.message || "").includes("permission");
    headerEl.innerHTML = denied
      ? '<p style="text-align:center;color:var(--text-dim);">Questa discussione è <strong>privata</strong>. Possono vederla solo lo staff e chi l\'ha aperta. <a href="forum.html">Torna al Forum</a>.</p>'
      : '<p style="text-align:center;color:var(--text-dim);">Impossibile caricare l\'argomento al momento.</p>';
    postsEl.innerHTML = "";
    replyAreaEl.innerHTML = "";
  }
}

function renderTopicHeader(t) {
  const status = t.status || "open";
  const pinnedIcon = t.pinned ? ` <span class="pin-icon" title="Fissato">📌</span>` : "";
  const lockedIcon = t.locked ? ` <span class="lock-icon" title="Bloccato">🔒</span>` : "";
  const board = boards[t.boardId];
  const crumb = document.getElementById("forum-crumb");
  if (crumb) {
    crumb.innerHTML = board
      ? `<a href="forum.html">Forum</a> <span>/</span> <a href="forum-board.html?id=${t.boardId}">${escapeHtml(board.name)}</a>`
      : `<a href="forum.html">← Torna al Forum</a>`;
  }

  let modPanel = "";
  if (canModerate()) {
    modPanel = `
      <div class="mod-panel">
        <div class="mod-panel__title">Moderazione staff</div>
        <div class="mod-panel__actions">
          <select id="mod-status" class="mod-select">
            <option value="open" ${status === "open" ? "selected" : ""}>Aperto</option>
            <option value="onhold" ${status === "onhold" ? "selected" : ""}>In attesa</option>
            <option value="approved" ${status === "approved" ? "selected" : ""}>Approvato</option>
            <option value="rejected" ${status === "rejected" ? "selected" : ""}>Respinto</option>
            <option value="closed" ${status === "closed" ? "selected" : ""}>Chiuso</option>
          </select>
          <button type="button" class="btn btn--outline btn-sm" id="mod-lock">${t.locked ? "Sblocca risposte" : "Blocca risposte"}</button>
          <button type="button" class="btn btn--outline btn-sm" id="mod-pin">${t.pinned ? "Togli pin" : "Fissa in cima"}</button>
          <button type="button" class="btn btn--outline btn-sm" id="mod-delete-topic" style="color:#ff8080;border-color:#ff808055;">Elimina argomento</button>
        </div>
      </div>`;
  }

  headerEl.innerHTML = `
    <div class="topic-header-card">
      <div class="topic-header-card__badges">
        ${categoryBadge(t.categoryId)}
        ${statusBadge(status)}${pinnedIcon}${lockedIcon}${t.private ? ' <span class="forum-lock-pill">Privata</span>' : ""}
      </div>
      <h1 class="topic-header-card__title">${escapeHtml(t.title)}</h1>
      <p class="topic-header-card__meta">
        Aperto da ${userNickHtml(t.authorEmail, t.authorName || "Utente")}${badgeFor(t.authorEmail)}
        · ${formatDate(t.createdAt)}
      </p>
      ${modPanel}
    </div>`;

  if (canModerate()) {
    document.getElementById("mod-status")?.addEventListener("change", async (e) => {
      const newStatus = e.target.value;
      await updateDoc(doc(db, "forumTopics", topicId), { status: newStatus });
      currentTopicData.status = newStatus;
      renderTopicHeader(currentTopicData);
    });

    document.getElementById("mod-lock")?.addEventListener("click", async () => {
      const newLocked = !currentTopicData.locked;
      await updateDoc(doc(db, "forumTopics", topicId), { locked: newLocked });
      currentTopicData.locked = newLocked;
      renderTopicHeader(currentTopicData);
      renderReplyForm();
    });

    document.getElementById("mod-pin")?.addEventListener("click", async () => {
      const newPinned = !currentTopicData.pinned;
      await updateDoc(doc(db, "forumTopics", topicId), { pinned: newPinned });
      currentTopicData.pinned = newPinned;
      renderTopicHeader(currentTopicData);
    });

    document.getElementById("mod-delete-topic")?.addEventListener("click", async () => {
      if (!confirm("Eliminare definitivamente questo argomento e tutti i suoi messaggi?")) return;
      await deleteDoc(doc(db, "forumTopics", topicId));
      window.location.href = "forum.html";
    });
  }
}

function loadPosts() {
  onSnapshot(query(collection(db, "forumTopics", topicId, "posts"), orderBy("createdAt", "asc")), (snap) => {
    if (snap.empty) {
      postsEl.innerHTML = "";
      return;
    }
    postsEl.innerHTML = snap.docs.map((d) => {
      const p = d.data();
      const canDelete = currentUser && (currentUser.email === p.authorEmail || canModerate());
      const initial = (p.authorName || "U").charAt(0).toUpperCase();

      return `
        <div class="forum-post">
          <div class="forum-post__avatar">${initial}</div>
          <div class="forum-post__body">
            <div class="forum-post__head">
              ${userNickHtml(p.authorEmail, p.authorName || "Utente")}
              ${badgeFor(p.authorEmail)}
              <span class="forum-post__date">${formatDate(p.createdAt)}</span>
            </div>
            <div class="forum-post__text">${escapeHtml(p.text)}</div>
            ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="" class="forum-post__img" loading="lazy">` : ""}
            ${canDelete ? `<button type="button" class="forum-post__delete" data-id="${d.id}">Elimina</button>` : ""}
          </div>
        </div>`;
    }).join("");

    postsEl.querySelectorAll(".forum-post__delete").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Eliminare questo messaggio?")) {
          await deleteDoc(doc(db, "forumTopics", topicId, "posts", btn.dataset.id));
        }
      });
    });
  }, () => {
    postsEl.innerHTML = '<p style="text-align:center;color:var(--text-dim);">Messaggi non visibili: discussione privata o errore di caricamento.</p>';
  });
}

function renderReplyForm() {
  if (!currentUser) {
    replyAreaEl.innerHTML = '<div class="forum-login-prompt">Devi <a href="login.html">accedere</a> per rispondere a questo argomento.</div>';
    return;
  }

  const t = currentTopicData || {};
  const isLocked = t.locked === true;
  const isClosed = t.status === "closed" || t.status === "rejected";

  if ((isLocked || isClosed) && !canModerate()) {
    const reason = isLocked ? "Questo argomento è bloccato dallo staff." : "Questo argomento è chiuso.";
    replyAreaEl.innerHTML = `<div class="forum-locked-prompt">${reason} Non è possibile aggiungere nuove risposte.</div>`;
    return;
  }

  replyAreaEl.innerHTML = `
    <div class="dash-form-card reply-card">
      <h3 style="font-size:16px;margin-bottom:16px;">Rispondi come <strong>${escapeHtml(currentUser.displayName || currentUser.email.split("@")[0])}</strong></h3>
      <form id="reply-form">
        <div class="field">
          <label for="rp-text">Il tuo messaggio</label>
          <textarea id="rp-text" required placeholder="Scrivi la tua risposta..." rows="4"></textarea>
        </div>
        <div class="field">
          <label for="rp-image">Immagine (opzionale)</label>
          <input type="file" id="rp-image" accept="image/*">
        </div>
        <button type="submit" class="btn btn--lime">Invia risposta</button>
      </form>
    </div>`;

  document.getElementById("reply-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const authorName = currentUser.displayName || currentUser.email.split("@")[0];
    const text = document.getElementById("rp-text").value.trim();
    const imageFile = document.getElementById("rp-image").files?.[0];
    const imageUrl = imageFile ? await uploadFile(imageFile, "forum") : "";

    try {
      await addDoc(collection(db, "forumTopics", topicId, "posts"), {
        authorEmail: currentUser.email,
        authorName,
        text,
        imageUrl: imageUrl || "",
        createdAt: serverTimestamp()
      });
      await bumpMessageCount(currentUser.uid);
      await updateDoc(doc(db, "forumTopics", topicId), {
        lastActivityAt: serverTimestamp(),
        replyCount: increment(1)
      });
      document.getElementById("reply-form").reset();
    } catch {
      alert("Si è verificato un errore nell'invio. Riprova.");
    } finally {
      submitBtn.disabled = false;
    }
  });
}
