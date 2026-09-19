// ==========================================================================
// Forum — visibilita argomenti pubblici vs privati (staff + autore)
// ==========================================================================
import { db, auth, ADMIN_EMAIL } from "./firebase-init.js";
import { collection, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { isStaffByUid, onUsersChange } from "./user-card.js";

export function viewerIsStaff() {
  const u = auth.currentUser;
  return !!(u && (u.email === ADMIN_EMAIL || isStaffByUid(u.uid)));
}

export function areaIsPrivate(cat, board) {
  return !!(board?.private || cat?.private);
}

function mapSnap(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function listenVisibleTopics(callback) {
  let unsubs = [];
  let publicList = [];
  let mineList = [];
  let staffList = [];
  let mode = "anon";
  let lastKey = "";

  function emit() {
    if (mode === "staff") {
      callback(staffList.slice());
      return;
    }
    const merged = new Map();
    publicList.concat(mineList).forEach((t) => merged.set(t.id, t));
    callback([...merged.values()]);
  }

  function restart() {
    const user = auth.currentUser;
    const staff = viewerIsStaff();
    const key = (user?.uid || "anon") + ":" + (staff ? "staff" : "user");
    if (key === lastKey && unsubs.length) return;
    lastKey = key;
    unsubs.forEach((fn) => fn());
    unsubs = [];
    publicList = [];
    mineList = [];
    staffList = [];

    if (staff) {
      mode = "staff";
      unsubs.push(onSnapshot(collection(db, "forumTopics"), (snap) => {
        staffList = mapSnap(snap);
        if (user?.email === ADMIN_EMAIL) {
          staffList.forEach((t) => {
            if (t.private === undefined) {
              updateDoc(doc(db, "forumTopics", t.id), { private: false }).catch(() => {});
            }
          });
        }
        emit();
      }, () => { staffList = []; emit(); }));
      return;
    }

    mode = user ? "user" : "anon";
    unsubs.push(onSnapshot(
      query(collection(db, "forumTopics"), where("private", "==", false)),
      (snap) => { publicList = mapSnap(snap); emit(); },
      () => { publicList = []; emit(); }
    ));
    if (user && user.email) {
      unsubs.push(onSnapshot(
        query(collection(db, "forumTopics"), where("authorEmail", "==", user.email)),
        (snap) => { mineList = mapSnap(snap); emit(); },
        () => { mineList = []; emit(); }
      ));
    }
  }

  onAuthStateChanged(auth, restart);
  onUsersChange(restart);
  restart();
}
