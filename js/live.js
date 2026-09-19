import { onSnapshot as fsOnSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function onSnapshot(ref, onNext, onError) {
  const unsub = fsOnSnapshot(ref, onNext, onError);
  window.__grCleanups = window.__grCleanups || [];
  window.__grCleanups.push(unsub);
  return unsub;
}

export function navCleanup() {
  const list = window.__grCleanups || [];
  window.__grCleanups = [];
  list.forEach((fn) => {
    try { fn(); } catch (_) {}
  });
}
