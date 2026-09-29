// ==========================================================================
// Gaming Relax — gestione sfondi pagina + sfondi indipendenti Home.
// Gli sfondi Home sono configurabili da Dashboard → Sfondi.
// ==========================================================================
import { db } from "./firebase-init.js";
import { doc, onSnapshot, collection, getDocs, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { bindUploader, setPreview } from "./upload.js?v=20260921a";

const DEFAULTS = {
  home:{bgStyle:"none",bgOverlay:22,bgMotion:true,bgImageUrl:"images/home-bg.jpg"},
  store:{bgStyle:"none",bgOverlay:22,bgMotion:true,bgImageUrl:"images/bg-store.jpg"},
  custom:{bgStyle:"none",bgOverlay:22,bgMotion:true,bgImageUrl:"images/bg-studio.jpg"},
  art:{bgStyle:"none",bgOverlay:22,bgMotion:true,bgImageUrl:"images/bg-art.jpg"},
  novita:{bgStyle:"none",bgOverlay:22,bgMotion:true,bgImageUrl:"images/bg-store.jpg"},
  forum:{bgStyle:"none",bgOverlay:24,bgMotion:true,bgImageUrl:"images/bg-art.jpg"},
  team:{bgStyle:"none",bgOverlay:22,bgMotion:true,bgImageUrl:"images/bg-studio.jpg"},
  recensioni:{bgStyle:"none",bgOverlay:22,bgMotion:true,bgImageUrl:"images/bg-store.jpg"},
  contatti:{bgStyle:"none",bgOverlay:22,bgMotion:true,bgImageUrl:"images/bg-studio.jpg"},
  faq:{bgStyle:"none",bgOverlay:26,bgMotion:true,bgImageUrl:"images/bg-quiet.jpg"},
  login:{bgStyle:"none",bgOverlay:28,bgMotion:true,bgImageUrl:"images/bg-quiet.jpg"},
  register:{bgStyle:"none",bgOverlay:28,bgMotion:true,bgImageUrl:"images/bg-quiet.jpg"},
  dashboard:{bgStyle:"none",bgOverlay:40,bgMotion:false,bgImageUrl:"images/bg-quiet.jpg"},
  privacy:{bgStyle:"none",bgOverlay:26,bgMotion:true,bgImageUrl:"images/bg-quiet.jpg"},
  termini:{bgStyle:"none",bgOverlay:26,bgMotion:true,bgImageUrl:"images/bg-quiet.jpg"},
  grazie:{bgStyle:"none",bgOverlay:22,bgMotion:true,bgImageUrl:"images/bg-store.jpg"},
  "chi-siamo":{bgStyle:"none",bgOverlay:22,bgMotion:true,bgImageUrl:"images/bg-studio.jpg"}
};

const HOME_SECTIONS = [
  {key:"hero",label:"Hero / intestazione",selector:".hero"},
  {key:"features",label:"4 card principali",selector:"body[data-page=\"home\"] > .reveal:has(.feature-grid)"},
  {key:"news",label:"Novità & aggiornamenti",selector:".home-news"},
  {key:"store",label:"Dal nostro Store",selector:".home-store"},
  {key:"studio",label:"Un team. Uno studio.",selector:".studio-band"},
  {key:"community",label:"Community / Discord",selector:".community-band"},
  {key:"cta",label:"Banner finale / CTA",selector:"body[data-page=\"home\"] > .reveal:has(.cta-banner)"},
  {key:"partners",label:"Partner",selector:".partners"}
];
const HOME_DEFAULTS = {overlay:42,position:"center",size:"cover",enabled:true};
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let pageKey = document.body.dataset.page || "home";

function directUrl(raw=""){
  let url=String(raw||"").trim().replace(/^<|>$/g,"").replace(/^['"]|['"]$/g,"");
  if(!url)return "";
  if(url.startsWith("//"))url="https:"+url;
  if(url.startsWith("http://"))url="https://"+url.slice(7);
  let m=url.match(/drive\.google\.com\/file\/d\/([^/]+)/); if(m)return "https://lh3.googleusercontent.com/d/"+m[1]+"=s0";
  m=url.match(/drive\.google\.com\/(?:open|uc)\?[^#]*id=([^&]+)/); if(m)return "https://lh3.googleusercontent.com/d/"+m[1]+"=s0";
  if(/dropbox\.com\//.test(url))return url.replace("www.dropbox.com","dl.dropboxusercontent.com").replace(/[?&]dl=0/,"");
  m=url.match(/^https?:\/\/(?:www\.)?imgur\.com\/(?:gallery\/|a\/)?([A-Za-z0-9]+)(?:\.[a-z]+)?$/i); if(m)return "https://i.imgur.com/"+m[1]+".jpg";
  if(!/^https?:\/\//i.test(url)&&!url.startsWith("data:")){try{url=new URL(url,location.href).href;}catch(_) {}}
  return url;
}
function youtubeId(url=""){const m=String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);return m?m[1]:null;}
function isVideoFile(url=""){return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url);}

function mountShell(){
  let el=document.getElementById("page-bg");
  if(el){if(el.parentElement!==document.documentElement)document.documentElement.prepend(el);document.body.classList.add("has-page-bg");document.documentElement.classList.add("has-page-bg");return el;}
  el=document.createElement("div");el.id="page-bg";el.className="page-bg";el.setAttribute("aria-hidden","true");
  el.innerHTML='<div class="page-bg__layer" data-depth="media"></div><div class="page-bg__layer page-bg__fx" data-depth="fx"></div><canvas class="page-bg__particles" hidden></canvas><div class="page-bg__overlay"></div><div class="page-bg__vignette"></div>';
  document.documentElement.prepend(el);document.body.classList.add("has-page-bg");document.documentElement.classList.add("has-page-bg");return el;
}
function renderMedia(layer,cfg){
  const videoUrl=directUrl(cfg.bgVideoUrl),imageUrl=directUrl(cfg.bgImageUrl),nextKey=videoUrl+"|"+imageUrl;
  if(layer.dataset.key===nextKey&&layer.children.length)return true;
  if(videoUrl){
    const yt=youtubeId(videoUrl);layer.innerHTML="";layer.dataset.key=nextKey;
    if(yt){const wrap=document.createElement("div"),iframe=document.createElement("iframe");wrap.className="page-bg__yt";iframe.src=`https://www.youtube.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`;iframe.allow="autoplay; encrypted-media";iframe.setAttribute("allowfullscreen","");iframe.referrerPolicy="strict-origin-when-cross-origin";wrap.appendChild(iframe);layer.appendChild(wrap);return true;}
    if(isVideoFile(videoUrl)||/^https?:\/\//i.test(videoUrl)){const v=document.createElement("video");v.src=videoUrl;v.autoplay=true;v.muted=true;v.defaultMuted=true;v.loop=true;v.playsInline=true;v.setAttribute("muted","");v.setAttribute("playsinline","");v.setAttribute("autoplay","");layer.appendChild(v);const tryPlay=()=>v.play().catch(()=>{});v.addEventListener("canplay",tryPlay,{once:true});tryPlay();if(isVideoFile(videoUrl)||!imageUrl)return true;}
  }
  if(imageUrl){
    const incoming=document.createElement("div");incoming.className="page-bg__photo page-bg__photo--in";incoming.style.backgroundImage=`url("${imageUrl.replace(/\\/g,"/").replace(/"/g,"%22")}")`;
    const pic=document.createElement("img");pic.className="page-bg__photo-img";pic.alt="";pic.src=imageUrl;pic.decoding="async";pic.referrerPolicy="no-referrer";incoming.appendChild(pic);layer.appendChild(incoming);
    const reveal=()=>{incoming.classList.add("is-on");layer.dataset.key=nextKey;setTimeout(()=>{[...layer.children].forEach(ch=>{if(ch!==incoming)ch.remove();});incoming.classList.remove("page-bg__photo--in");},480);};
    if(pic.complete&&pic.naturalWidth)reveal();else{pic.addEventListener("load",reveal,{once:true});pic.addEventListener("error",reveal,{once:true});}
    return true;
  }
  layer.innerHTML="";layer.dataset.key=nextKey;return false;
}
function renderFx(fx,style,hasMedia){fx.innerHTML="";fx.className="page-bg__layer page-bg__fx";if(hasMedia||style==="none"||!style)return;if(style==="grid"||style==="cinematic")fx.classList.add("page-bg__fx--grid");if(style==="aurora"||style==="cinematic"){const a=document.createElement("div");a.className="page-bg__aurora";fx.appendChild(a);}}
function startParticles(canvas,enabled){if(!enabled){canvas.hidden=true;return()=>{};}canvas.hidden=false;const ctx=canvas.getContext("2d");let w=0,h=0,raf=0;const dots=Array.from({length:42},()=>({x:Math.random(),y:Math.random(),r:.6+Math.random()*1.6,s:.15+Math.random()*.35,a:.18+Math.random()*.4}));function resize(){w=canvas.width=innerWidth;h=canvas.height=innerHeight;}resize();addEventListener("resize",resize);function tick(){ctx.clearRect(0,0,w,h);dots.forEach(d=>{d.y-=d.s*.00035;if(d.y<-.02)d.y=1.02;ctx.beginPath();ctx.fillStyle=`rgba(198,255,26,${d.a})`;ctx.arc(d.x*w,d.y*h,d.r,0,Math.PI*2);ctx.fill();});raf=requestAnimationFrame(tick);}if(!reduceMotion)raf=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(raf);removeEventListener("resize",resize);};}
function startMotion(root,enabled){const media=root.querySelector("[data-depth=media]"),fx=root.querySelector("[data-depth=fx]");if(!enabled||reduceMotion)return()=>{};let tx=0,ty=0,cx=0,cy=0,raf=0;const onMove=e=>{tx=(e.clientX/innerWidth-.5)*2;ty=(e.clientY/innerHeight-.5)*2;};addEventListener("pointermove",onMove,{passive:true});function tick(){cx+=(tx-cx)*.045;cy+=(ty-cy)*.045;if(media)media.style.transform=`translate3d(${cx*-18}px,${cy*-12}px,0)`;if(fx)fx.style.transform=`translate3d(${cx*-12}px,${cy*-10}px,0)`;raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(raf);removeEventListener("pointermove",onMove);};}
let stopMotion=()=>{},stopParticles=()=>{};
function apply(cfg){const root=mountShell(),imageUrl=directUrl(cfg.bgImageUrl),videoUrl=directUrl(cfg.bgVideoUrl),hasMedia=!!(imageUrl||videoUrl);root.classList.toggle("page-bg--has-media",hasMedia);let overlay=Number(cfg.bgOverlay);if(!Number.isFinite(overlay))overlay=28;overlay=Math.max(0,Math.min(80,overlay));const ov=root.querySelector(".page-bg__overlay"),vig=root.querySelector(".page-bg__vignette");if(hasMedia){if(ov)ov.style.display="none";if(vig)vig.style.display="none";}else{const o=overlay/100,center=Math.min(.75,o*.85),edge=Math.min(.9,o+.15);if(ov)ov.style.background=`radial-gradient(ellipse 90% 70% at 50% 38%,rgba(10,13,22,${center}) 0%,rgba(8,10,18,${edge}) 100%)`;if(vig){vig.style.display="";vig.style.opacity="1";}}renderMedia(root.querySelector("[data-depth=media]"),{bgImageUrl:imageUrl,bgVideoUrl:videoUrl});renderFx(root.querySelector("[data-depth=fx]"),cfg.bgStyle||"aurora",hasMedia);stopMotion();stopParticles();stopMotion=startMotion(root,!hasMedia&&cfg.bgMotion!==false);stopParticles=startParticles(root.querySelector(".page-bg__particles"),cfg.bgStyle==="particles");}
function saveCache(cfg){try{const all=JSON.parse(localStorage.getItem("gr_bgs")||"{}");all[pageKey]={image:directUrl(cfg.bgImageUrl)||"",video:directUrl(cfg.bgVideoUrl)||"",style:cfg.bgStyle||"",overlay:cfg.bgOverlay,motion:cfg.bgMotion};localStorage.setItem("gr_bgs",JSON.stringify(all));}catch(_) {}}
function loadCache(){try{const all=JSON.parse(localStorage.getItem("gr_bgs")||"{}");const c=all[pageKey];if(!c)return null;return{bgImageUrl:c.image||"",bgVideoUrl:c.video||"",bgStyle:c.style||"",bgOverlay:c.overlay,bgMotion:c.motion};}catch(_){return null;}}

let fallback=DEFAULTS[pageKey]||DEFAULTS.home;
function bootPageBg(){pageKey=document.body.dataset.page||"home";fallback=DEFAULTS[pageKey]||DEFAULTS.home;const cached=loadCache();if(cached&&(cached.bgImageUrl||cached.bgVideoUrl))apply({bgImageUrl:cached.bgImageUrl,bgVideoUrl:cached.bgVideoUrl,bgStyle:cached.bgStyle||fallback.bgStyle,bgOverlay:cached.bgOverlay!=null?cached.bgOverlay:fallback.bgOverlay,bgMotion:cached.bgMotion!=null?cached.bgMotion:fallback.bgMotion});else apply(fallback);}
bootPageBg();
let unsubPageBg=()=>{};
function listenPageBg(){unsubPageBg();unsubPageBg=onSnapshot(doc(db,"siteContent",pageKey),snap=>{const d=snap.exists()?snap.data():{};const cfg={bgImageUrl:d.bgImageUrl||d.imageUrl||d.backgroundUrl||fallback.bgImageUrl,bgVideoUrl:d.bgVideoUrl||"",bgStyle:d.bgStyle||fallback.bgStyle,bgOverlay:d.bgOverlay!=null?d.bgOverlay:fallback.bgOverlay,bgMotion:d.bgMotion!=null?d.bgMotion:fallback.bgMotion};saveCache(cfg);apply(cfg);},()=>{});}
listenPageBg();
addEventListener("gr:navigated",()=>{bootPageBg();listenPageBg();});
getDocs(collection(db,"siteContent")).then(snap=>{try{const all=JSON.parse(localStorage.getItem("gr_bgs")||"{}");snap.forEach(docSnap=>{const d=docSnap.data()||{},image=(d.bgImageUrl||d.imageUrl||d.backgroundUrl||"").trim(),video=(d.bgVideoUrl||"").trim();if(!image&&!video)return;all[docSnap.id]={image,video,style:d.bgStyle||"",overlay:d.bgOverlay,motion:d.bgMotion};});localStorage.setItem("gr_bgs",JSON.stringify(all));}catch(_){}}).catch(()=>{});

function sectionEl(section){try{return document.querySelector(section.selector);}catch(_){return null;}}
function applyHomeSectionBackgrounds(data={}){if(document.body?.dataset.page!=="home")return;const map=data.sectionBackgrounds||{};HOME_SECTIONS.forEach(section=>{const el=sectionEl(section);if(!el)return;const cfg=map[section.key]||{};el.classList.toggle("gr-home-section-bg",cfg.enabled!==false&&!!cfg.image);el.style.removeProperty("--gr-section-bg-image");el.style.removeProperty("--gr-section-bg-overlay");el.style.removeProperty("--gr-section-bg-position");el.style.removeProperty("--gr-section-bg-size");if(cfg.enabled===false||!cfg.image)return;const image=directUrl(cfg.image);if(!image)return;const overlay=Math.max(0,Math.min(90,Number(cfg.overlay??HOME_DEFAULTS.overlay)))/100;el.style.setProperty("--gr-section-bg-image",`url("${image.replace(/"/g,"%22")}")`);el.style.setProperty("--gr-section-bg-overlay",String(overlay));el.style.setProperty("--gr-section-bg-position",cfg.position||HOME_DEFAULTS.position);el.style.setProperty("--gr-section-bg-size",cfg.size||HOME_DEFAULTS.size);});}
function ensureHomeBgStyles(){if(document.getElementById("gr-home-section-bg-styles"))return;const style=document.createElement("style");style.id="gr-home-section-bg-styles";style.textContent=`
.gr-home-section-bg{position:relative;isolation:isolate;overflow:hidden;background-color:rgba(5,7,14,.35)}
.gr-home-section-bg::before{content:"";position:absolute;inset:0;z-index:-2;background-image:var(--gr-section-bg-image);background-size:var(--gr-section-bg-size,cover);background-position:var(--gr-section-bg-position,center);background-repeat:no-repeat;background-attachment:scroll;transform:scale(1.015)}
.gr-home-section-bg::after{content:"";position:absolute;inset:0;z-index:-1;background:rgba(5,7,14,var(--gr-section-bg-overlay,.42));pointer-events:none}
.gr-home-section-bg>.container{position:relative;z-index:0}
`;document.head.appendChild(style);}
let stopHomeBg=()=>{};
function listenHomeSectionBackgrounds(){if(document.body?.dataset.page!=="home")return;ensureHomeBgStyles();stopHomeBg();stopHomeBg=onSnapshot(doc(db,"siteContent","home"),snap=>applyHomeSectionBackgrounds(snap.exists()?snap.data():{}),()=>applyHomeSectionBackgrounds({}));}

async function initHomeBackgroundAdmin(){
  if(document.body?.dataset.page!=="dashboard")return;const panel=document.getElementById("panel-backgrounds");if(!panel||panel.dataset.homeSectionBgReady==="1")return;panel.dataset.homeSectionBgReady="1";
  const card=document.createElement("div");card.className="dash-form-card gr-home-section-bg-admin";card.style.cssText="max-width:640px;margin-top:24px";
  card.innerHTML=`<h3>🌌 Sfondi delle sezioni Home</h3><p style="color:var(--text-dim);font-size:14px;margin:0 0 18px">Imposta uno sfondo diverso per ogni blocco della Home. L'immagine viene salvata su Firebase e applicata automaticamente a tutti i visitatori.</p><form id="gr-home-bg-form"><div class="field"><label for="gr-hbg-section">Sezione</label><select id="gr-hbg-section">${HOME_SECTIONS.map(s=>`<option value="${s.key}">${s.label}</option>`).join("")}</select></div><div class="field"><label for="gr-hbg-file">Immagine di sfondo</label><input type="file" id="gr-hbg-file" accept="image/*,.heic,.heif"><input type="hidden" id="gr-hbg-image"><img id="gr-hbg-preview" class="file-preview" alt=""><p class="file-status" id="gr-hbg-status"></p></div><div class="field"><label for="gr-hbg-overlay">Overlay scuro <span id="gr-hbg-overlay-val">42%</span></label><input type="range" id="gr-hbg-overlay" min="0" max="90" value="42"></div><div class="field"><label for="gr-hbg-position">Posizione</label><select id="gr-hbg-position"><option value="center">Centro</option><option value="center top">Centro / alto</option><option value="center bottom">Centro / basso</option><option value="left center">Sinistra</option><option value="right center">Destra</option></select></div><div class="field"><label for="gr-hbg-size">Dimensione</label><select id="gr-hbg-size"><option value="cover">Copri tutta la sezione</option><option value="100% auto">100% larghezza</option><option value="contain">Contieni immagine</option></select></div><div style="display:flex;gap:12px;flex-wrap:wrap"><button class="btn btn--lime" type="submit">Salva sfondo</button><button class="btn btn--outline" type="button" id="gr-hbg-clear">Rimuovi sfondo</button></div><p class="dash-save-msg" id="gr-hbg-save"></p></form>`;
  panel.appendChild(card);
  const $=id=>card.querySelector(id),select=$("#gr-hbg-section"),file=$("#gr-hbg-image"),overlay=$("#gr-hbg-overlay"),preview=$("#gr-hbg-preview"),saveMsg=$("#gr-hbg-save"),ref=doc(db,"siteContent","home");
  bindUploader({fileId:"gr-hbg-file",hiddenId:"gr-hbg-image",previewId:"gr-hbg-preview",statusId:"gr-hbg-status",folder:"backgrounds/home-sections"});
  let data={};try{const snap=await getDoc(ref);data=snap.exists()?snap.data().sectionBackgrounds||{}:{};}catch(_){data={};}
  function render(){const c=data[select.value]||{};file.value=c.image||"";overlay.value=c.overlay??HOME_DEFAULTS.overlay;$("#gr-hbg-overlay-val").textContent=overlay.value+"%";$("#gr-hbg-position").value=c.position||HOME_DEFAULTS.position;$("#gr-hbg-size").value=c.size||HOME_DEFAULTS.size;setPreview(preview,file.value);}
  select.addEventListener("change",render);overlay.addEventListener("input",()=>$("#gr-hbg-overlay-val").textContent=overlay.value+"%");render();
  $("#gr-home-bg-form").addEventListener("submit",async e=>{e.preventDefault();const key=select.value;data[key]={image:file.value.trim(),overlay:Number(overlay.value),position:$("#gr-hbg-position").value,size:$("#gr-hbg-size").value,enabled:!!file.value.trim()};try{await setDoc(ref,{sectionBackgrounds:data},{merge:true});saveMsg.textContent="Sfondo salvato correttamente.";saveMsg.classList.add("visible");setTimeout(()=>saveMsg.classList.remove("visible"),3000);}catch(_){saveMsg.textContent="Errore nel salvataggio.";saveMsg.classList.add("visible");}});
  $("#gr-hbg-clear").addEventListener("click",async()=>{const key=select.value;if(!confirm("Rimuovere lo sfondo personalizzato da questa sezione?"))return;data[key]={image:"",enabled:false};await setDoc(ref,{sectionBackgrounds:data},{merge:true});render();saveMsg.textContent="Sfondo rimosso.";saveMsg.classList.add("visible");setTimeout(()=>saveMsg.classList.remove("visible"),3000);});
}

ensureHomeBgStyles();listenHomeSectionBackgrounds();
if(document.body?.dataset.page==="dashboard"){const boot=()=>initHomeBackgroundAdmin();if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();new MutationObserver(boot).observe(document.body,{childList:true,subtree:true});}
addEventListener("gr:navigated",()=>{pageKey=document.body.dataset.page||"home";listenHomeSectionBackgrounds();initHomeBackgroundAdmin();});
