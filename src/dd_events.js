/* ---------- OLAYLAR ---------- */
const TABS=["learn","practice","progress","units","setup"];
/* Eski hedef adları: cards → Pratik/Kelime kartları, syl → Öğren/yol, log → İlerleme, paste → Ayarlar/Gelişmiş, coach → Pratik/sohbet, key → Ayarlar/Claude bağlantısı */
const TAB_ALIAS={roadmap:["progress","#roadmapCard"],progsetup:["setup","#progSetup"],cards:["practice","#cards"],syl:["progress","#pathCard"],log:["progress",null],paste:["setup","#pasteBox"],coach:["practice","#coach"],key:["setup","#keyCard"],backup:["setup","#backupCard"]};
const HASH={ogren:"learn",pratik:"practice",ilerleme:"progress",dersler:"units",ayarlar:"setup",kurulum:"setup",kartlar:"cards",yol:"syl"};
/* Dersler sekmesi (üniteler): sonraki aşama TYDIL.registerUnits(renderFn) ile bağlar; sekme o zamana kadar gizli */
let unitsRender=null, unitsMounted=false;
const reduceMo=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
function scrollToEl(el){if(!el)return;const bar=document.querySelector(".bar"), off=(bar?bar.getBoundingClientRect().height:0)+12;
  window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+window.scrollY-off),behavior:reduceMo()?"auto":"smooth"});}
function openTab(t,scroll){let target=null;
  if(TAB_ALIAS[t]){target=TAB_ALIAS[t][1];t=TAB_ALIAS[t][0];} if(!TABS.includes(t))t="learn";
  const was=TABS.find(k=>!$("#tab-"+k).hidden);
  document.querySelectorAll(".tabs button").forEach(x=>{x.setAttribute("aria-selected",String(x.dataset.tab===t));x.tabIndex=x.dataset.tab===t?0:-1;});
  TABS.forEach(k=>$("#tab-"+k).hidden=k!==t);
  if(t==="units"&&unitsRender&&!unitsMounted){unitsMounted=true; const m=$("#tyUnitsMount"); if(m){m.hidden=false; try{unitsRender(m);}catch(e){console.error(e);}}}
  if(scroll&&target){const el=$(target), d=el&&el.closest("details:not([open])"); if(d) d.open=true; requestAnimationFrame(()=>scrollToEl(el));}
  else if(was!==t) window.scrollTo({top:0,behavior:"auto"});
  if(t==="practice"&&typeof ccScroll==="function") requestAnimationFrame(()=>ccScroll(true));   /* Pratik sohbeti son mesajda açılır */}
document.querySelectorAll(".tabs button").forEach(b=>{b.id="tabBtn-"+b.dataset.tab;b.setAttribute("aria-controls","tab-"+b.dataset.tab);$("#tab-"+b.dataset.tab).setAttribute("aria-labelledby",b.id);b.addEventListener("click",()=>openTab(b.dataset.tab));});
$(".tabs").addEventListener("keydown",e=>{const bs=[...document.querySelectorAll(".tabs button")],i=bs.indexOf(document.activeElement);if(i<0)return;
  const j=e.key==="ArrowRight"?i+1:e.key==="ArrowLeft"?i-1:e.key==="Home"?0:e.key==="End"?bs.length-1:null;if(j==null)return;e.preventDefault();const b=bs[(j+bs.length)%bs.length];b.focus();openTab(b.dataset.tab);});
document.addEventListener("click",e=>{const g=e.target.closest("[data-go]");if(g){openTab(g.dataset.go,true);if(g.hasAttribute("data-add")){const d=$("details.add");if(d){d.open=true;setTimeout(()=>{const f=$("#addF");if(f)f.focus({preventScroll:true});},400);}}return;}
  const a=e.target.closest("[data-ask]");if(a){const l=a.dataset.ask.slice(0,2), t=SYL[l].find(x=>x[1]===a.dataset.ask);if(!t)return;
    openTab("coach",true);
    document.dispatchEvent(new CustomEvent("dd:ask",{detail:{agent:"db",text:`${t[2]} (${LANG[l]}, ${t[0]}) konusunu baştan anlat: ${t[3]}.`}}));}});
document.querySelectorAll("[data-rl]").forEach(b=>b.addEventListener("click",()=>{reviewLang=b.dataset.rl;buildQueue();}));
document.querySelectorAll("[data-sl]").forEach(b=>b.addEventListener("click",()=>{sylLang=b.dataset.sl;renderSyl();}));
$("#syl").addEventListener("click",async e=>{
  const sm=e.target.closest("summary.lvHead");if(sm){const d=sm.parentElement;lvOpen[d.dataset.lv]=!d.open;return;}
  const nl=e.target.closest("summary.nlvHead");if(nl){nlvOpen[sylLang]=!nl.parentElement.open;return;}
  const n=e.target.closest("[data-node]");
  if(n){const id=n.dataset.node;sylAuto[sylLang]=false;sylOpen[sylLang]=sylOpen[sylLang]===id?null:id;renderSyl();const nb=$(`#syl [data-node="${id}"]`);if(nb)nb.focus({preventScroll:true});return;}
  const s=e.target.closest("[data-topic][data-st]");if(!s)return;const id=s.dataset.topic, v=s.dataset.st;
  if(!db){$("#sylLead").textContent="Konu durumu kaydedilemedi: cihaz depolaması açılamadı.";return;}
  try{ if(v) await db.collection("topics").doc(id).set({status:v,updated:new Date().toISOString()}); else await db.collection("topics").doc(id).delete(); }
  catch(err){renderSyl(); $("#sylLead").textContent=dbErrText(err,"Konu durumu kaydedilemedi");}});
/* Ayarlar → Gelişmiş: Dersler (üniteler) yedeği ekranı Dersler sekmesinde açılır */
$("#btnUnitsBk").addEventListener("click",()=>{const U=window.TYDIL&&TYDIL.units; if(U&&typeof U.go==="function"){const l=(U.state&&U.state.lang)||"it"; openTab("units"); U.go(l+"/yedek");} else openTab("units");});
/* Tek ana eylem: ders bitmediyse Ders modunu açar (sohbet kapalıysa Ayarlar → Claude bağlantısı); bittiyse kartlar ya da serbest pratik */
$("#btnGo").addEventListener("click",()=>{
  const ps=dayBlocks(), due=dueCards("it").length+dueCards("en").length;
  if(!ps.some(b=>b.st!=="done")){openTab(due?"cards":"coach",true);return;}
  if(dersGate()) dersOpen();
});
$("#btnParse").addEventListener("click",async()=>{const el=$("#pasteMsg");if(!db){msg(el,"err","Kayıt yapılamıyor: cihaz depolaması açılamadı.");return;}
  try{const sum=parseSummary($("#pasteBox").value);const r=await applySummary(sum);
    msg(el,"ok","Kaydedildi: "+sum.sessions.length+" oturum, "+sum.sessions.reduce((a,s)=>a+s.total,0)+" dk, "+r.addedCards+" yeni kart"+(r.skipped?" ("+r.skipped+" kelime zaten destedeydi)":"")+". Aynı kodu tekrar işlersen ikinci kez sayılmaz.");$("#pasteBox").value="";}
  catch(e){msg(el,"err",e&&e.code?dbErrText(e,"Kaydedilemedi"):(e.message||String(e)));}});
$("#btnClear").addEventListener("click",()=>{$("#pasteBox").value="";msg($("#pasteMsg"));});
$("#btnAdd").addEventListener("click",async()=>{const el=$("#addMsg"),f=$("#addF").value.trim(),tr=$("#addTr").value.trim(),lang=$("#addLang").value;
  if(!db){msg(el,"err","Kayıt yapılamıyor: cihaz depolaması açılamadı.");return;} if(!f||!tr){msg(el,"err","Kelimeyi ve Türkçesini yaz, sonra tekrar dene.");return;}
  if(S.cards.some(c=>c.lang===lang&&c.f.toLowerCase()===f.toLowerCase())){msg(el,"info","Bu kelime destede zaten var.");return;}
  try{await db.collection("cards").add({lang,f,tr,ex:$("#addEx").value.trim(),box:1,due:addDays(today(),1),added:new Date().toISOString()});}
  catch(e){msg(el,"err",dbErrText(e,"Kart eklenemedi"));return;}
  ["#addF","#addTr","#addEx"].forEach(s=>$(s).value="");msg(el,"ok","Kart eklendi. Yarın ilk tekrara gelir.");});
$("#instr").textContent=INSTR;
$("#btnCopyInstr").addEventListener("click",async()=>{const ok=await copyText(INSTR,$("#btnCopyInstr"),$("#instr"));if(!ok)$("#btnCopyInstr").textContent="Metin seçildi, basılı tutup kopyala";});
/* ---------- BAŞLAT ---------- */
renderAll();
{const h=(location.hash||"").slice(1).toLowerCase(); if(HASH[h]) openTab(HASH[h],true);}
/* Kayıt bağlantısı koparsa tek sefer uyar (otomatik yeniden deneme yok) */
let liveWarned=false;
function liveErr(e){if(liveWarned)return;liveWarned=true;const n=document.createElement("div");n.className="msg err liveErr";n.setAttribute("role","alert");
  n.textContent="Kayıtlarla bağlantı koptu. Gösterilenler güncel olmayabilir; sayfayı yenile.";
  const w=$(".wrap");if(w)w.prepend(n);}
(async()=>{ try{ db=window.claude&&typeof claude.use==="function"?await claude.use("db"):null; }catch(e){ db=null; }
  dbState=db?"ok":"none"; if(typeof initChat==="function") initChat(); if(!db){renderAll();return;}
  db.collection("sessions").onSnapshot(q=>{S.sessions=q.docs.map(d=>Object.assign({id:d.id},d.data()));renderLive();},liveErr);
  db.collection("topics").onSnapshot(q=>{S.topics={};q.docs.forEach(d=>S.topics[d.id]=d.data());renderSyl();renderLive();},liveErr);
  db.collection("program").onSnapshot(q=>{const d=q.docs.find(x=>x.id==="main");S.program=d?d.data():null;progLoaded=true;renderSyl();renderLive();},liveErr);
  db.collection("habits").onSnapshot(q=>{S.habits={};q.docs.forEach(d=>S.habits[d.id]=d.data());renderProg();},liveErr);
  db.collection("exams").onSnapshot(q=>{S.exams=q.docs.map(d=>Object.assign({id:d.id},d.data()));renderProg();},liveErr);
  db.collection("days").onSnapshot(q=>{S.days={};q.docs.forEach(d=>S.days[d.id]=d.data());daysMerge();renderLive();},liveErr);
  let first=true; db.collection("cards").onSnapshot(q=>{S.cards=q.docs.map(d=>Object.assign({id:d.id},d.data()));renderLive();
    if(first){first=false;buildQueue();} else if(rqi>=rq.length) buildQueue(); else updateLangBtns(); },liveErr);
})();
/* ---------- DIŞA AÇIK KANCALAR (sonraki aşamalar: üniteler, ses) ---------- */
window.TYDIL={openTab,
  /* Dersler sekmesi: fn(mountEl) ilk açılışta çağrılır; sekme düğmesi görünür olur */
  registerUnits(fn,opt){unitsRender=fn; unitsMounted=false; const b=$('.tabs [data-tab="units"]'); if(b){b.hidden=false; if(opt&&opt.label){const l=b.querySelector(".tl"); if(l)l.textContent=opt.label;}} const m=$("#tyUnitsMount"); if(m)m.hidden=false; decorate(); if(!$("#tab-units").hidden)openTab("units");},
  get db(){return db;}, S, get rt(){return window.TYRT;},
  chat:{send:(t,o)=>typeof ccSend==="function"?ccSend(t,o):false, submit:()=>typeof ccSubmit==="function"?ccSubmit():undefined, fill:t=>typeof ccFill==="function"?ccFill(t):undefined, speak:(t,l,b)=>typeof ccSpeak==="function"?ccSpeak(t,l,b):undefined, render:()=>typeof ccRender==="function"?ccRender():undefined, get state(){return typeof CC!=="undefined"?CC:null;}},
  ders:{open:()=>typeof dersOpen==="function"?dersOpen():undefined, render:()=>{if(typeof F!=="undefined")F.doneSig=""; if(typeof renderFocus==="function")renderFocus();}, get state(){return typeof F!=="undefined"?F:null;}}};
