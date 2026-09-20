import { db } from "./firebase-init.js";
import { collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onSnapshot } from "./live.js";

const urls = new Set();

function paint() {
  const wrap = document.getElementById("photo-marquee");
  const track = document.getElementById("photo-marquee-track");
  if (!wrap || !track) return;
  const list = [...urls].filter(Boolean).slice(0, 10);
  if (list.length < 3) {
    wrap.hidden = true;
    return;
  }
  const cells = list.map((src) => `<div class="photo-marquee__item" style="background-image:url('${src.replace(/'/g, "%27")}')"></div>`).join("");
  track.innerHTML = cells + cells;
  wrap.hidden = false;
}

onSnapshot(collection(db, "gallery"), (snap) => {
  snap.docs.forEach((d) => {
    const u = d.data().imageUrl;
    if (u) urls.add(u);
  });
  paint();
});

onSnapshot(collection(db, "products"), (snap) => {
  snap.docs.forEach((d) => {
    const p = d.data();
    if (p.imageUrl) urls.add(p.imageUrl);
    String(p.galleryUrls || "").split(/\s+/).filter(Boolean).forEach((u) => urls.add(u));
  });
  paint();
});
