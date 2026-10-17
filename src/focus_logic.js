/* ---------- DERS MODU · İLK KURULUM · SADE PANO ----------
   Ders modu: #ders tam ekran katman (pano gizlenir). Sohbet bileşeni (#coachChat) içine TAŞINIR, çıkınca Pratik'e geri döner;
   sohbet geçmişleri ve ajanlar aynen kalır. Akış: Başlat → koçla çalış → "Bloğu bitirdim" → sıradaki blok → (İtalyanca bitince) Oliver → bitti ekranı.
   Kayıt her zaman koçların araçlarıyla (gerçek dakika). Sayaç yalnızca gösterim.
   Blok "bitirdim" işaretleri: cihazda localStorage "tydil-ders" {date, fin:[blok anahtarı], t:{anahtar:ms}} + db days/<YYYY-MM-DD> {fin,updated} (cihazlar arası, birleşim).
   Diğer cihaz kolaylıkları: "tydil-tip-pin" · "tydil-tip-ready" (ilk bitti ekranından sonra ipucu) · "tydil-more" */
let progLoaded=false, onbStep=1, onbSkip=false, onbDate="", onbHtml="";
const F={open:false,phase:"block",fin:new Set(),t:{},run:null,paused:false,date:"",openDate:"",pushed:false,tok:"",busy:false,tick:0,said:{},lastY:0,
  lastNext:0,wrapErr:"",pendingStart:null,note:"",noteN:0,hiddenAt:0,doneSig:""};
const BLK_SHORT={kelime:"Kelime",gramer:"Gramer",okuma:"Okuma-yazma",sesli:"Sesli tekrar",speaking:"Konuşma"};
const BLK_SHORT_EN={kelime:"Kelime & ifade",gramer:"Gramer",okuma:"Okuma-dinleme",speaking:"Konuşma"};
/* Blok kimliği dil-tür (eski kayıtlardaki "0:it-gramer" biçimi de okunur) */
const normKey=k=>String(k).replace(/^\d+:/,"");
function blockName(b){if(!b)return ""; const t=b.t||"";
  if(/^Final/.test(t))return "Final sınavı"; if(/sınavı$/.test(t)&&/Checkpoint/.test(t))return "Sınav"; if(/mini sınav/i.test(t))return "Mini sınav";
  if(b.l==="en"&&b.k==="kelime"&&/tekrar/i.test(t))return "Kalıp tekrarı"; if(b.l==="en"&&b.k==="gramer"&&/tekrar/i.test(t))return "Gramer tekrarı";
  if(b.k==="kelime"&&/tekrar/i.test(t))return "Kelime tekrarı"; if(b.k==="okuma"&&/Hata/.test(t))return "Hata tekrarı";
  return (b.l==="en"?BLK_SHORT_EN[b.k]:BLK_SHORT[b.k])||t;}
const agentOf=b=>b&&b.l==="en"?"en":"it";
function fLoad(){const t=today(); if(F.date===t)return;
  /* gün değişti: açık sayacı eski günün kaydına yaz, sonra sıfırla */
  if(F.date&&F.run){F.t[F.run.k]=(+F.t[F.run.k]||0)+Math.max(0,Date.now()-F.run.s); F.run=null; fSave();}
  F.date=t; F.fin=new Set(); F.t={}; F.run=null; F.said={}; F.paused=false; F.wrapErr=""; F.doneSig="";
  try{const v=localStorage.getItem("tydil-ders"); const o=v?JSON.parse(v):null; if(o&&o.date===t){F.fin=new Set(Array.isArray(o.fin)?o.fin.map(normKey):[]); F.t=o.t&&typeof o.t==="object"?o.t:{};}}catch(e){}}
function fSave(){try{localStorage.setItem("tydil-ders",JSON.stringify({date:F.date,fin:[...F.fin],t:F.t}));}catch(e){}}
/* Cihazlar arası: days/<tarih>.fin = bu cihaz ∪ kayıttaki (sıralı yazım) */
const remoteFin=d=>{const x=S.days&&S.days[d]; return x&&Array.isArray(x.fin)?x.fin.map(normKey):[];};
finKeysFn=()=>{fLoad(); return new Set([...F.fin].concat(remoteFin(F.date)));};
let daysQ=Promise.resolve();
/* Yazmadan hemen önce kayıttaki belgeyi okuyup birleştirir: iki cihaz aynı anda yazarsa biri diğerinin işaretini silmez */
/* Günün dil seçimi de aynı belgede: en yeni modeAt kazanır */
function daysSave(){if(!db)return; fLoad(); dmLoad(); const d=F.date, mine=[...F.fin], loc=DM.date===d&&DM.at?{mode:DM.mode,modeAt:DM.at}:null; if(!S.days)S.days={};
  const prev=S.days[d]||{}, pm=prev.modeAt&&(!loc||prev.modeAt>=loc.modeAt)?{mode:prev.mode,modeAt:prev.modeAt}:loc;
  S.days[d]=Object.assign({},prev,{fin:[...new Set(remoteFin(d).concat(mine))]},pm||{});
  const job=async()=>{let cur=[], cm=null; try{const g=await db.collection("days").doc(d).get(); if(g&&g.exists){const v=g.data()||{}; if(Array.isArray(v.fin)) cur=v.fin.map(normKey); if(MODES[v.mode]) cm={mode:v.mode,modeAt:+v.modeAt||0};}}catch(e){}
    const m=cm&&(!loc||cm.modeAt>=loc.modeAt)?cm:loc;
    const fin=[...new Set(cur.concat(remoteFin(d),mine))]; try{await db.collection("days").doc(d).set(Object.assign({fin,updated:new Date().toISOString()},m||{}));}catch(e){}};
  daysQ=daysQ.then(job,job);}
/* days anlık görüntüsü: bugünün işaretlerini cihaz durumuna kat (yazma yok) */
function daysMerge(){const d=today(); if(F.date!==d) return; const rf=remoteFin(d); let ch=false; rf.forEach(k=>{if(!F.fin.has(k)){F.fin.add(k);ch=true;}}); if(ch) fSave();}
/* Bugünün blokları: kayıt (≥ planın yarısı) ya da "Bloğu bitirdim" ile tamam sayılır; ilk bekleyen = sıradaki */
function dayBlocks(){fLoad(); let ps=[]; try{ps=planState();}catch(e){ps=[];} let nextSet=false; const rf=remoteFin(F.date);
  return ps.map((b,i)=>{const key=b.l+"-"+b.k, logged=b.st==="done", done=logged||F.fin.has(key)||rf.includes(key); let st=done?"done":"wait"; if(!done&&!nextSet){st="next";nextSet=true;}
    return Object.assign({},b,{st,logged,key,i});});}

/* ---- sayaç (yalnızca gösterim) ---- */
const tMs=k=>(+F.t[k]||0)+(F.run&&F.run.k===k?Math.max(0,Date.now()-F.run.s):0);
function tStop(){if(!F.run)return; F.t[F.run.k]=(+F.t[F.run.k]||0)+Math.max(0,Date.now()-F.run.s); F.run=null; fSave();}
function tStart(k){if(F.run&&F.run.k===k)return; tStop(); F.run={k,s:Date.now()};}
const mmss=ms=>{const s=Math.floor(Math.max(0,ms)/1000);return pad(Math.floor(s/60))+":"+pad(s%60);};
/* Gerçek dakika = koçun kaydettiği; kayıtsız geçilen blok sayılmaz */
function langStats(l){const d=doneToday()[l]||{}; const mins=Object.values(d).reduce((a,v)=>a+(+v||0),0);
  const words=S.cards.filter(c=>c.lang===l&&c.added&&trKey(c.added)===today()).length; return {mins,words};}
function fNotice(t){const w=$("#tab-learn"); if(!w)return; let n=$("#fNotice");
  if(!n){n=document.createElement("div");n.id="fNotice";n.className="msg info fNotice";n.setAttribute("role","status");w.prepend(n);}
  n.textContent=t; n.hidden=false; clearTimeout(fNotice._t); fNotice._t=setTimeout(()=>{n.hidden=true;},9000);}

/* ---- üst satır: hafta şeridi + ipucu + ilk kurulum + Pratik bandı ---- */
/* Hüküm, etiketin aynısını söylüyorsa gösterilmez ("Program bitti" · "Isınma…") */
const vRepeats=(lbl,v)=>{const a=String(lbl).toLocaleLowerCase("tr"), b=String(v).toLocaleLowerCase("tr").slice(0,5); return !!b&&a.includes(b);};
function renderTop(){
  const ws=$("#weekStrip"), p=progInfo();
  if(ws){ if(!p){ws.hidden=true;} else {const v=progVerdict(p,itToday()), w=p.finished?PROG_WEEKS:Math.max(0,p.week);
    const lbl=p.finished?"Program bitti":p.week<1?"Isınma · Hafta 1'e "+p.lead+" gün":"Hafta "+p.week+"/"+PROG_WEEKS, showV=!vRepeats(lbl,v.short);
    ws.hidden=false; ws.className="weekStrip "+v.cls;
    ws.innerHTML=`<span class="wsT">${esc(lbl)}</span><span class="wsBar" aria-hidden="true">${ROADMAP.map(r=>`<i class="${r.w<w?"on":r.w===w?"cur":""}"></i>`).join("")}</span>${showV?`<span class="wsV">${esc(v.short)}</span>`:""}`;
    ws.setAttribute("aria-label",lbl+(showV?", "+v.short:"")+". Yol haritasını aç");}}
  renderTip(); renderOnb(); renderPrac();
}
/* "Ana ekrana ekle" ipucu kaldırıldı: yerine kapağın altındaki Telefona kur kartı (install.js) var; eski tydil-tip-* anahtarları zararsız */
function renderTip(){const el=$("#tipPin"); if(el){el.hidden=true; el.innerHTML="";}}
/* Pratik sekmesi: bugünkü ders bitmediyse üstte "Derse devam et" bandı */
function renderPrac(){const el=$("#pracBanner"); if(!el)return; let bl=[]; try{bl=dayBlocks();}catch(e){bl=[];}
  const nx=bl.find(b=>b.st==="next"), started=bl.some(b=>b.st==="done");
  if(!nx||!chatReady()){el.hidden=true;el.innerHTML="";el.dataset.sig="";return;}   /* imza da sıfırlanır: anahtar girilince bant boş kalmasın */
  const left=bl.filter(b=>b.st!=="done").reduce((a,b)=>a+b.dk,0);
  const html=`<div class="pbTxt"><b>${started?"Bugünkü ders sürüyor":"Bugünkü ders seni bekliyor"}</b><span>Sıradaki: ${esc(blockName(nx))} · ${left} dk kaldı. Ders bu sohbetlerle Ders modunda yürür.</span></div>
    <button type="button" class="btn btn-primary btn-sm" id="pracGo">${ICON("play")}${started?"Derse devam et":"Derse başla"}</button>`;
  el.hidden=false; if(el.dataset.sig!==html){el.dataset.sig=html;el.innerHTML=html;}}
function renderOnb(){
  const el=$("#onb"), main=$("#learnMain"); if(!el||!main)return;
  const show=dbState==="ok"&&progLoaded&&!S.program&&!onbSkip;
  el.hidden=!show; main.hidden=show; if(!show){onbHtml="";return;}
  const d=onbDate||today(), anchor=validDay(d)?progAnchor(d):null, warm=anchor&&anchor>d;
  /* Tek ekran: dil seçimi (İkisi seçili) · başlangıç bugün (istersen değiştir) · Başla */
  const html=`<div class="onbStep" data-step="1"><h1 id="onbTitle1" tabindex="-1">12 hafta, günde 60 dk</h1>
      <div class="modeSeg" id="onbModeSeg" role="radiogroup" aria-labelledby="onbModeL">${modeSegHtml(dayMode(),"Ne çalışacaksın?","onbModeL")}</div>
      <p class="onbLead" id="onbModeLead">${onbModeLead(dayMode())}</p>
      <p class="onbLead">Her gün Bugün ekranında 2–3 adım: kart tekrarı, adım adım ders, koçla sesli konuşma. Tek düğme: Başla.</p>
      <details class="onbDate" ${d!==today()?"open":""}><summary>Başlangıç: ${d===today()?"bugün":esc(fmtDay(d,{day:"numeric",month:"long"}))} · değiştir</summary><label for="progStart">Başlangıç tarihi</label><input type="date" id="progStart" value="${esc(d)}">
        <p class="hint" id="progStartHint">${anchor?(warm?"Hafta 1: "+esc(fmtDay(anchor,{day:"numeric",month:"long",weekday:"long"}))+". O güne kadar ısınma.":"Hafta 1 bu hafta: "+esc(fmtDay(anchor,{day:"numeric",month:"long"}))+" Pazartesi'den sayılır."):""}</p></details>
      <div class="onbAct"><button type="button" class="btn btn-primary btn-big" id="btnProgStart">${ICON("play")}Başla</button></div>
      <div id="progStartMsg"></div></div>`+
    `<button type="button" class="onbSkip" id="onbSkip">Programsız göz at</button>`;
  /* Kayıt anlık görüntüsü her geldiğinde yeniden çizme: odak ve tarih girişi korunur */
  if(html===onbHtml) return; const a=document.activeElement;
  if(onbHtml&&a&&a.id==="progStart"&&el.contains(a)) return;
  onbHtml=html; el.innerHTML=html;
}
/* Kurulumdaki dil seçimi: her günün varsayılanı olur, kapaktan her gün değiştirilebilir */
function onbModeLead(m){return m==="it"?"<b>60 dk İtalyanca</b>: kelime, gramer, okuma-yazma, sesli tekrar. Pazar tekrar günü. Hedef: 12 haftada temel A1.":
  m==="en"?"<b>60 dk İngilizce</b>: kelime, gramer, okuma-dinleme, konuşma. Hedef: B1'den B2'ye. İtalyanca planı o günlerde ilerlemez.":
  "<b>45 dk İtalyanca</b> + <b>15 dk İngilizce</b> konuşma. Pazar tekrar günü. Hedef: 12 haftada temel A1 (günlük dinlemeyle sağlam A1).";}
function onbGo(n){const v=($("#progStart")||{}).value; if(v) onbDate=v; onbStep=1; renderOnb(); const h=$("#onbTitle"+onbStep); if(h) h.focus({preventScroll:true});}

/* ---- Ders modu ---- */
const dersEl=()=>$("#ders");
function ccWhenIdle(){return new Promise(r=>{const t=()=>CC.busy?setTimeout(t,120):r();t();});}
/* Hazır = örnekleme açık VE bu ajanın sohbet geçmişi yüklendi (yoksa ilk mesaj eski sohbeti ezerdi) */
function ccWhenReady(ms){const end=Date.now()+(ms||8000);return new Promise(r=>{const t=()=>CC.locked||(CC.ready&&!CC.loading)||Date.now()>end?r():setTimeout(t,120);t();});}
function dersSay(t){const l=$("#dersLive"); if(l){l.textContent="";setTimeout(()=>{l.textContent=t;},40);}}
function dersMountChat(on){const root=CC.root||$("#coachChat"); if(!root)return;
  if(on){const host=$("#dersChat"); if(root.parentNode!==host) host.appendChild(root);}
  else {const coach=$("#coach"); if(coach&&root.parentNode!==coach) coach.insertBefore(root,coach.querySelector(".chatPh"));}
  if(typeof ccPaintBar==="function") ccPaintBar();
  if(typeof ccScroll==="function") setTimeout(()=>ccScroll(true),30);}
function vvFit(){const el=dersEl(), vv=window.visualViewport; if(!el)return;
  if(F.open&&vv){el.style.height=Math.round(vv.height)+"px"; el.style.transform=vv.offsetTop?`translateY(${Math.round(vv.offsetTop)}px)`:"";}
  else {el.style.height=""; el.style.transform="";}
  if(F.open&&CC.root&&typeof ccScroll==="function") ccScroll();}
const dersHead=(bl,i)=>{const b=bl[i]; return b?(i+1)+"/"+bl.length+" · "+blockName(b)+" · "+b.dk+" dk":"";};
/* sohbet bileşenine Ders modu bilgisi (koç bağlamı + çip filtresi) */
ccDers.open=()=>F.open;
ccDers.head=()=>{if(!F.open)return ""; if(F.phase==="done")return "Bugünkü ders bitti"; const bl=dayBlocks(); return dersHead(bl,bl.findIndex(b=>b.st==="next"));};
ccDers.unfinished=()=>{try{return dayBlocks().some(b=>b.st!=="done");}catch(e){return false;}};
ccDers.afterInit=()=>{if(F.open&&F.pendingStart){const d=F.pendingStart; F.pendingStart=null; dersStart(d);}};
ccDers.done=()=>F.open&&F.phase==="done";
/* Anahtar kapısı: koç yokken Ders modu açılmaz; kapakta anahtar kartı (Ayarlar → Anahtar) ve anahtarsız seçenekler */
const noKey=()=>typeof CC!=="undefined"&&(typeof ccKeyLock==="function"?ccKeyLock(CC.locked):CC.locked===CC_NOKEY)||!(window.TYRT&&TYRT.hasKey&&TYRT.hasKey());
const iosTab=()=>{try{return /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1&&!(navigator.standalone===true||matchMedia("(display-mode: standalone)").matches);}catch(e){return false;}};
function renderKeyGate(show){const el=$("#keyGate"); if(!el)return; const on=!!show&&!chatReady()&&noKey(); el.hidden=!on; const hh=$("#heroHint"); if(hh) hh.hidden=on;   /* kart varken ipucu yok (çift metin olmasın) */
  if(!on){el.innerHTML="";el.dataset.sig="";return;}
  const ks=window.TYRT&&TYRT.keyStatus?TYRT.keyStatus():"none", pend=ks==="pending", bad=ks==="bad";
  const why=bad?(CC.locked||"").replace(CC_KEYBAD,""):"";
  const html=`<div class="kgHd"><span class="kgIco" aria-hidden="true">${ICON("setup")}</span><div><h3 id="keyGateT" tabindex="-1">${pend?"Anahtar doğrulanıyor…":bad?"Anahtar doğrulanamadı":"Koçlar için API anahtarı gerekli"}</h3><p>${pend?"Bağlantı test ediliyor; birkaç saniye sürer.":bad?esc(why):"Chiara ve Oliver senin Anthropic API anahtarınla çalışır. Anahtar yalnızca bu cihazda saklanır."}</p></div></div>
    ${pend?"":`<div class="kgAct">${(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)?`<button type="button" class="btn btn-primary" data-go="scan">${ICON("target")}QR okut</button><button type="button" class="btn btn-soft" data-go="key">${ICON("setup")}Anahtarı gir</button>`:`<button type="button" class="btn btn-primary" data-go="key">${ICON("setup")}Anahtarı gir</button>`}<button type="button" class="btn btn-ghost" id="keyGateUnits">${ICON("deck")}Dersler'e geç</button></div>
    ${iosTab()?`<p class="kgNote"><b>Ana ekrana kurduysan:</b> TY Dil'i ana ekrandaki simgesinden aç. Anahtarın orada kayıtlı; bu tarayıcı sekmesinin deposu ayrı.</p>`:""}<p class="kgNote"><b>Anahtarsız devam:</b> sadece Dersler (üniteler) ve kelime kartları çalışır; koçlu günlük ders ve kayıt anahtar ister.</p>`}`;
  if(el.dataset.sig===html)return; const first=!el.dataset.sig; el.dataset.sig=html; el.innerHTML=html;
  if(first){const h=$("#keyGateT"); if(h) h.focus({preventScroll:true}); requestAnimationFrame(()=>{try{el.scrollIntoView({block:"nearest",behavior:"smooth"});}catch(e){}});}}
function dersGate(){ if(chatReady()) return true; if(noKey()){openTab("learn"); renderKeyGate(true); return false;} openTab("key",true); return false; }
document.addEventListener("tydil:key",()=>{const el=$("#keyGate"); if(chatReady()||!noKey()) renderKeyGate(false); else if(el&&!el.hidden) renderKeyGate(true);
  if(F.open){F.lk=!!CC.locked; renderFocus();}   /* kilit anahtarla açıldıysa Tekrar dene hemen görünsün (sayaç tikini bekleme) */});
async function dersStart(det){
  if(!F.open)return; await ccWhenReady(); if(!F.open)return;
  if(!CC.ready&&!CC.locked){F.pendingStart=det; return;}
  const r=typeof ccStartToday==="function"?await ccStartToday(det):"";
  if(!F.open)return;
  if(r==="resumed"){const bl=dayBlocks(), b=bl.find(x=>x.st==="next"); F.note=b?"Kaldığın yer: "+blockName(b):""; F.noteN=CC.turns.length;}
  setTimeout(()=>{renderFocus();if(F.open)dersFocusIn();},450);
}
function dersFocusIn(){if(F.phase==="done"){const t=$("#dersDoneT"); if(t) t.focus({preventScroll:true}); return;} const t=F.phase==="trans"?$("#dersGoEn"):$("#ccIn"); if(t&&!t.disabled) t.focus({preventScroll:true}); else $("#dersExit").focus({preventScroll:true});}
async function dersOpen(){
  if(F.open)return; fLoad(); const bl=dayBlocks(), i=bl.findIndex(b=>b.st==="next"); if(i<0)return;
  F.open=true; F.phase="block"; dersEl().classList.remove("chat-open"); F.paused=false; F.wrapErr=""; F.note=""; F.pendingStart=null; F.doneSig=""; F.openDate=F.date; F.lastY=window.scrollY||0;
  dersMountChat(true); const el=dersEl(); el.hidden=false; document.documentElement.classList.add("ders-on");
  F.tok=Math.random().toString(36).slice(2,10);
  try{history.pushState({ders:F.tok},"","#ders"); F.pushed=true;}catch(e){F.pushed=false;}
  clearInterval(F.tick); F.tick=setInterval(dersTick,1000); vvFit();
  const b=bl[i], ag=agentOf(b);
  F.transDone=false; if(dayMode()==="both"&&ag==="en"&&CC.agent!=="en"&&bl.some(x=>x.l==="it"&&x.st==="done")){F.phase="trans";F.transDone=true;}
  renderFocus(); dersFocusIn();
  if(F.phase==="block") await dersStart({agent:ag,text:startMessage()});
}
function dersClose(){
  if(!F.open)return; tStop(); F.open=false; if(typeof ccHooks!=="undefined"&&ccHooks.dersClose) ccHooks.dersClose(); F.phase="block"; F.pendingStart=null; F.note=""; clearInterval(F.tick); F.tick=0;
  const el=dersEl(); el.hidden=true; document.documentElement.classList.remove("ders-on"); vvFit();
  dersMountChat(false); renderLive(); window.scrollTo({top:F.lastY||0,behavior:"auto"});
  const g=$("#btnGo"); if(g) g.focus({preventScroll:true});
}
/* Çıkış: kendi geçmiş girdimizse geri git; değilse #ders'i adresten sil (yenileme sonrası Geri başka sayfaya gitmesin) */
function dersExit(){const pushed=F.pushed, tok=F.tok; F.pushed=false; dersClose();
  try{ if(pushed&&history.state&&history.state.ders===tok) history.back();
       else if(location.hash==="#ders") history.replaceState(null,"",location.pathname+location.search); }catch(e){}}
/* Gece yarısı: sayacı eski güne yaz, dersi kapat, panoyu yeni güne çiz */
function dersRollover(){if(!F.open)return; dersExit(); if(typeof ccLoad==="function"&&!CC.busy&&CC.key&&CC.key!==ccKey()) ccLoad();
  renderAll(); fNotice("Gün değişti; yeni günün dersi hazır.");}
/* Otomatik geçişler: İtalyanca bitti → geçiş kartı; hepsi bitti → bitti ekranı (koç yazarken beklenir) */
function dersAuto(bl){if(F.phase!=="block"||F.busy||CC.busy)return;
  const i=bl.findIndex(b=>b.st==="next"), b=bl[i];
  if(i<0){F.phase="done";tStop();dersSay("Bugünkü ders bitti. Koçun kapanış notu sohbette duruyor.");try{localStorage.setItem("tydil-tip-ready","1");}catch(e){}return;}
  if(!F.transDone&&dayMode()==="both"&&agentOf(b)==="en"&&CC.agent==="it"&&bl.some(x=>x.l==="it"&&x.st==="done")){F.phase="trans";F.transDone=true;tStop();dersSay("İtalyanca bitti. Sıra İngilizce konuşmada.");
    const ta=$("#ccIn"); if(ta){ta.value="";ta.classList.remove("vc-interim"); if(typeof ccGrow==="function")ccGrow();}   /* geçiş kartı: Chiara'ya yazılmış taslak Oliver'a gitmesin */
    const a=document.activeElement; F.focusTrans=!a||a===document.body||!!(a.closest&&a.closest(".cc-form"));}}
function dersTick(){if(!F.open)return; if(today()!==F.openDate){dersRollover();return;}
  if(F.note&&CC.turns.length>F.noteN){F.note="";renderFocus();return;}
  if(!!CC.locked!==!!F.lk){F.lk=!!CC.locked;renderFocus();return;}
  const bl=dayBlocks(), ph=F.phase; dersAuto(bl); if(F.phase!==ph){renderFocus();return;}
  const sig=bl.map(b=>b.st).join(); if(F.stSig&&F.stSig!==sig){F.stSig=sig;renderFocus();return;} F.stSig=sig; dersSync(bl); paintTimer(bl);}
/* Sayaç yalnızca blok evresinde, sayfa görünürken ve doğru koç açıkken akar */
function dersSync(bl){const b=bl.find(x=>x.st==="next");
  if(F.open&&F.phase==="block"&&b&&!F.paused&&!document.hidden&&(CC.agent===agentOf(b)||!CC.ready)) tStart(b.key); else tStop();}
function paintTimer(bl){const b=bl.find(x=>x.st==="next"), box=$("#dersTimer"); if(!box)return;
  if(!b||F.phase!=="block"){box.hidden=true;return;} box.hidden=false;
  const ms=tMs(b.key), tgt=b.dk*60000, hit=ms>=tgt;
  $("#dersTime").textContent=mmss(ms)+" / "+mmss(tgt);
  box.classList.toggle("reached",hit); box.classList.toggle("paused",F.paused);
  if(hit&&!F.said[b.key]){F.said[b.key]=1; dersSay(blockName(b)+" için hedef süre doldu. Hazırsan Bloğu bitirdim'e bas.");}}
function renderFocus(){
  if(!F.open)return; const bl=dayBlocks(); dersAuto(bl); dersSync(bl);
  const i=bl.findIndex(b=>b.st==="next"), b=bl[i], el=dersEl();
  el.dataset.phase=F.phase; el.classList.toggle("is-trans",F.phase==="trans"); el.classList.toggle("is-done",F.phase==="done");
  $("#dersSteps").innerHTML=bl.map((x,j)=>{const cls=x.st==="done"?"done":j===i?"cur":"todo";
    return `<li class="dStep ${x.l} ${cls}" ${j===i&&F.phase==="block"?'aria-current="step"':""}><span class="dsn">${x.st==="done"?ICON("check"):j+1}</span><span class="dsl">${esc(blockName(x))}</span><span class="cc-vh">${x.dk} dk${x.st==="done"?", tamam":j===i?", şu an":""}</span></li>`;}).join("");
  $("#dersTitle").innerHTML=F.phase==="done"?"Bugünkü ders bitti":b?`${FLAG(b.l)}<span>${esc(dersHead(bl,i))}</span>`:"Bugünkü ders";
  if(typeof ccHooks!=="undefined"&&ccHooks.dersBlock) ccHooks.dersBlock(F.phase==="block"&&b?b:null);   /* ses: Konuşma/Sesli tekrar bloğunda Konuşma modu */
  $("#dersExit").innerHTML=ICON("x")+(F.phase==="done"?"<span>Kapat</span>":"<span>Dersten çık</span>"); $("#dersExit").setAttribute("aria-label",F.phase==="done"?"Dersi kapat":"Dersten çık");
  const dm=$("#dersMode"); if(dm){dm.parentElement.hidden=F.phase==="done"; dm.innerHTML=ICON("globe")+"<span>Dil</span>"; dm.title="Bugünün dili: "+MODES[dayMode()]+". Değiştir";}
  const pz=$("#dersPause"); pz.innerHTML=F.paused?ICON("play"):'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>';
  pz.setAttribute("aria-pressed",String(F.paused)); pz.setAttribute("aria-label",F.paused?"Süreyi devam ettir":"Süreyi duraklat"); pz.title=F.paused?"Devam ettir":"Duraklat";
  paintTimer(bl);
  const nb=$("#dersNext"), tr=$("#dersTrans"), done=$("#dersDone"), chat=$("#dersChat"), alt=$("#dersAlt");
  chat.hidden=false; alt.hidden=true; el.classList.toggle("has-wrapErr",!!(b&&F.wrapErr===b.key&&F.phase==="block"));
  if(F.phase==="block"&&b){const nx=bl.slice(i+1).find(x=>x.st!=="done"), locked=!!CC.locked, nxT=nx?`<span class="dnS">Sıradaki: </span>`+esc(blockName(nx)):"Dersi bitir";
    tr.hidden=true; done.hidden=true;
    if(F.wrapErr===b.key&&!locked&&!F.busy){nb.hidden=true; alt.hidden=false;
      alt.innerHTML=`<p class="dAltT" role="status"><b>${esc(blockName(b))} kaydedilemedi;</b> blok açık kaldı. Kaydetmeden geçersen süre sayılmaz.</p><div class="dAltB"><button type="button" class="btn btn-primary" id="dersRetry">${ICON("repeat")}Tekrar dene</button><button type="button" class="btn btn-ghost" id="dersSkip">Kaydetmeden geç</button></div>`;}
    else {nb.hidden=false; nb.disabled=F.busy;
      if(locked){alt.hidden=false; alt.innerHTML=`<p class="dAltT" role="status"><b>Sohbet kapalı.</b> Ayarlar'dan API anahtarını kontrol et; ders koçsuz da ilerler ama kayıtsız bitirilen blok dakikalara ve seriye sayılmaz.</p>`;}
      else if(F.note){alt.hidden=false; alt.innerHTML=`<p class="dNote">${ICON("clock")}${esc(F.note)}</p>`;}
      nb.innerHTML=F.busy?"<span>Kaydediliyor…</span>":locked?`${ICON("check")}<span>Kayıtsız bitir <span class="dnA">→</span> <span class="dnN">${nxT}</span></span>`
        :`${ICON("check")}<span>Bloğu bitirdim <span class="dnA">→</span> <span class="dnN">${nxT}</span></span>`;}}
  else if(F.phase==="trans"){const it=langStats("it"), en=bl.find(x=>x.l==="en"&&x.st!=="done");
    nb.hidden=true; done.hidden=true; tr.hidden=false;
    tr.innerHTML=`<div class="dtTxt"><p class="dtA">${ICON("check")}<b>İtalyanca bitti</b> · ${it.mins} dk · ${it.words} yeni kelime</p><p class="dtB">Şimdi ${en?en.dk:15} dk İngilizce konuşma · Oliver</p><p class="dtC">Chiara çıkış sorusu sorduysa önce cevapla.</p></div>
      <button type="button" class="btn btn-primary dtGo" id="dersGoEn"><span class="cc-av en sm" aria-hidden="true">EN</span>Konuşmaya başla${ICON("arrow")}</button>`;
    if(F.focusTrans){F.focusTrans=false; $("#dersGoEn").focus({preventScroll:true});}}
  else if(F.phase==="done"){nb.hidden=true; tr.hidden=true; done.hidden=false; const h=doneHtml(bl);
    if(F.doneSig!==h){const first=!F.doneSig; F.doneSig=h; done.innerHTML=h;
      if(first){const a=document.activeElement; if(a&&a.id==="ccIn") a.blur(); const t=$("#dersDoneT"); if(t) t.focus({preventScroll:true}); setTimeout(dersShowClosing,60);}}}
}
/* Bitti ekranı açılınca sohbeti koçun son (kapanış) mesajının başına kaydır: tablo ve son görev baştan okunur */
function dersShowClosing(){const log=$("#ccLog"); if(!log)return; const rows=[...log.querySelectorAll(".cc-row:not(.me):not(.sys):not(.live)")], r=rows[rows.length-1]; if(!r)return;
  log.scrollTop=Math.max(0,log.scrollTop+r.getBoundingClientRect().top-log.getBoundingClientRect().top-8); if(typeof CC!=="undefined") CC.stick=false;}
/* Yarın: önce İtalyanca odağı (Chiara'nın notu), sonra İngilizce; yarın Pazar ise yol haritasındaki gün */
function tomorrowLine(){const t=today(), tm=addDays(t,1);
  if(wdOf(tm)===0){const p=progInfo(), cp=p&&p.week>=1&&!p.finished?p.road.cp:null;
    return cp?"Pazar: "+cp.name+" · "+cp.what+" (40 dk) + 20 dk İngilizce.":"Pazar: haftalık tekrar ve mini sınav + 20 dk İngilizce.";}
  const x=itToday(), ni=noId(ccNextFor("it")), ne=noId(ccNextFor("en"));
  const it=ni||(x.mode==="review"?"tekrar günü ("+x.set.map(id=>topicById(id)[2]).join(", ")+")":x.t?x.t[2]:"serbest pratik");
  return "İtalyanca: "+it+(ne?" · İngilizce: "+ne:"");}
/* Bugünün konusu: Chiara'nın bugün kaydettiği konu (yoksa programdaki) + durumu */
function todayTopicLine(){const l=dayMode()==="en"?"en":"it", ss=S.sessions.filter(s=>s.date===today()&&s.lang===l&&s.topic), id=ss.length?ss[ss.length-1].topic:((l==="en"?enToday().t:itToday().t)||[])[1];
  const t=id&&topicById(id); if(!t) return ""; const st=stOf(id);
  return t[2]+" · "+(st==="done"?"tamamlandı":st==="doing"?"devam ediyor (%80 doğrulukla kapanır)":"bugün işlendi");}
function doneHtml(bl){
  const it=langStats("it"), en=langStats("en"), total=it.mins+en.mins, words=it.words+en.words, dn=bl.filter(b=>b.st==="done").length, st=streak(), plus=dayCounts(today());
  const mt=[...new Set(S.sessions.filter(s=>s.date===today()).reduce((a,s)=>a.concat(s.mistakes||[]),[]))].slice(0,3), fallback=!mt.length, ms=fallback?topMistakes(null,3).map(x=>x[0]):mt;
  const left=dueCards("it").length+dueCards("en").length, tl=todayTopicLine(), unlogged=bl.filter(b=>b.st==="done"&&!b.logged).length;
  const ex=S.exams.filter(e=>e.tarih===today()).map(e=>(e.tur==="haftalik"?"Hafta "+e.hafta+" mini sınavı":e.tur==="final"?"Final":"Checkpoint")+" · "+e.puan+"/"+e.toplam+" (%"+Math.round(e.puan/Math.max(1,e.toplam)*100)+")");
  const primary=left?`<button type="button" class="btn btn-primary" id="dersCards">${ICON("repeat")}${esc(cardsLeftTxt(left))}</button>`:"";
  return `<div class="ddIn"><div class="ddHd"><span class="ddIco">${ICON("check")}</span><div><h2 id="dersDoneT" tabindex="-1">Bugün tamam</h2><p class="ddLead">${fmtDay(today(),{day:"numeric",month:"long",weekday:"long"})} dersi bitti. Koçun kapanış notu yukarıda.</p></div></div>
    <dl class="ddStats"><div><dt>Toplam</dt><dd>${total} <small>dk</small></dd></div><div><dt>Blok</dt><dd>${dn} <small>/ ${bl.length}</small></dd></div><div><dt>Kelime</dt><dd>${words}</dd></div><div><dt>Seri</dt><dd>${st} <small>gün</small>${plus?`<span class="ddPlus">+1</span>`:""}</dd></div></dl>
    ${unlogged?`<p class="ddNote">${unlogged} blok kayıtsız bitirildi: 0 dk sayılır, seriye girmez.</p>`:""}
    <div class="ddAct">${primary}<button type="button" class="btn ${left?"btn-ghost":"btn-primary"}" id="dersBack">Öğren'e dön</button><button type="button" class="btn btn-ghost" id="dersChatOpen">${ICON("chat")}Koça cevap yaz</button></div>
    ${left?`<p class="ddNote">Kartları her gün bitirmezsen yeni kelime sayısı düşer.</p>`:""}
    ${tl||ex.length?`<div class="ddBox"><b>Bugünün konusu</b>${tl?`<p>${esc(tl)}</p>`:""}${ex.map(x=>`<p>Sınav: ${esc(x)}</p>`).join("")}</div>`:""}
    <div class="ddBox"><b>${fallback&&ms.length?"Genel tekrarlayan hatalar":"Dikkat et"}</b>${ms.length?`<ul>${ms.map(x=>`<li>${esc(noId(x))}</li>`).join("")}</ul>`:`<p>Kayıtlı hata yok.</p>`}</div>
    <div class="ddBox"><b>Yarın</b><p>${esc(tomorrowLine())}</p></div></div>`;}
/* Blok sonu mesajı (modele giden tam metin) + sohbette görünen kısa sistem notu */
function wrapKind(b,nx){const t=b.t||"";
  if(b.l==="en"&&b.k==="speaking") return "talk"; if(/^Final/.test(t)||(/Checkpoint/.test(t)&&/sınavı$/.test(t))) return "exam"; if(/mini sınav/i.test(t)) return "mini";
  if(b.l==="it"&&(!nx||agentOf(nx)!==agentOf(b))) return "lastIt"; return "normal";}
function wrapMsg(b,nx){const n=blockName(b), k=wrapKind(b,nx);
  if(k==="talk") return "Konuşmayı bitiriyorum. KAPANIŞ: 3 ifade tablosu + en sık 2 hatam, sonra bir ifadeyle tek cümle yazmamı iste ve değerlendir; seans_kaydet'i hemen yap.";
  if(k==="exam") return "Sınavı ("+n+") bitiriyorum: cevapsızları 0 say, | Bölüm | Puan | Zayıf nokta | tablosunu ver, sinav_kaydet ile kaydet.";
  if(k==="mini") return "Mini sınavı ("+n+") bitiriyorum: cevapsızları 0 say, puanı ver, sinav_kaydet (tur haftalik) ve seans_kaydet yap, sonra hatalarımdan 2'sini tekrar sor.";
  if(k==="lastIt") return "Bu bloğu ("+n+") bitiriyorum: "+(b.k==="sesli"?"sesli tekrar bitti. ":"")+"ÇIKIŞ kontrolünü yap (3 kelime karışık yön + konudan 1 soru); seans_kaydet'i bu mesajda hemen yap"+(b.k==="sesli"?" (sesli dk dahil)":"")+"; cevaplarımı gelince değerlendir, hata çıkarsa seans_kaydet'i hatalarla güncelle.";
  if(!nx) return "Bu bloğu ("+n+") bitiriyorum. seans_kaydet ile gerçek dakikayı kaydet; tek satır özet (1 kazanım + 1 hatam).";
  return "Bu bloğu ("+n+") bitiriyorum. seans_kaydet ile gerçek dakikayı kaydet; tek satır özet (1 kazanım + 1 hatam), sonra "+blockName(nx)+" bloğunu başlat.";}
function wrapPill(b,nx){const n=blockName(b), k=wrapKind(b,nx);
  return n+" bitti → "+({talk:"kapanış",exam:"puanlama",mini:"puan ve hata tekrarı",lastIt:"çıkış kontrolü"}[k]||blockName(nx));}
/* Başarısız kapanışta "✓ … bitti" notu yanıltmasın: "… kaydedilemedi" olarak nötrleşir; tekrar deneme başarılıysa geri gelir */
function wrapPillMark(b,ok,nx){const t=[...CC.turns].reverse().find(x=>x.r==="u"&&x.sys); if(!t||!/bitiriyorum/.test(t.c))return;
  if(ok){t.sys=wrapPill(b,nx); delete t.sf;} else {t.sys=blockName(b)+" kaydedilemedi"; t.sf=1;}
  const rows=CC.root?[...CC.root.querySelectorAll("#ccLog .cc-row.sys")]:[], r=rows[rows.length-1]; if(r){const tmp=document.createElement("div"); tmp.innerHTML=ccMsgHtml(t); r.replaceWith(tmp.firstElementChild);}
  if(typeof ccSave==="function") ccSave();}
async function dersNext(ev,mode){
  if(ev&&ev.detail>1)return;                       /* çift tıklamanın ikinci tıkı */
  if(F.busy||F.phase!=="block")return;
  /* Çift basma koruması: koça mesaj gitmeyen (anında) geçişten sonra 1,2 sn; koç yanıtı beklenen geçişten sonra 0,25 sn */
  if(!mode&&Date.now()<F.lastNext)return; F.lastNext=Date.now()+1200;
  if(today()!==F.openDate){dersRollover();return;}
  const bl=dayBlocks(), i=bl.findIndex(b=>b.st==="next"), b=bl[i]; if(!b)return; const key=b.key, day=F.date;
  F.busy=true; F.note=""; renderFocus(); let ok=true;
  try{ await ccWhenIdle(); if(!F.open||today()!==day)return;
    const ag=agentOf(b), nx=bl.slice(i+1).find(x=>x.st!=="done"), fresh=dayBlocks().find(x=>x.key===key);
    const usable=CC.ready&&!CC.locked&&CC.agent===ag&&CC.turns.length>0;
    if(mode!=="skip"&&fresh&&!fresh.logged&&usable){
      const r=mode==="retry"&&typeof ccRetry==="function"?await ccRetry():await ccSend(wrapMsg(b,nx),{sys:wrapPill(b,nx)});
      ok=!!(r&&r.ok); F.lastNext=Date.now()+250;}
    if(!F.open||today()!==day)return;
    if(!ok){F.wrapErr=key; wrapPillMark(b,false); dersSay(CC.locked?blockName(b)+" kaydedilemedi; sohbet kapalı. Ayarlar'dan anahtarı düzelt.":blockName(b)+" kaydedilemedi. Tekrar dene ya da kaydetmeden geç.");}   /* kilitliyse anahtar düzelince Tekrar dene görünür */
    else if(ok){F.wrapErr=""; if(mode==="retry") wrapPillMark(b,true,nx); const cur=dayBlocks().find(x=>x.st==="next");
      if(cur&&cur.key===key){tStop(); F.fin.add(key); fSave(); daysSave();}   /* yalnızca hâlâ aynı blok */
      dersSay(nx?blockName(b)+" tamam. Sıradaki: "+blockName(nx)+".":blockName(b)+" tamam.");}
  } finally{F.busy=false;}
  renderFocus(); renderLive();
}
function dersGoEn(){if(F.phase!=="trans")return; F.phase="block"; renderFocus();
  dersStart({agent:"en",auto:true,text:startMessage()});}

/* Ders içinde dil değiştirme: biten bloklar sayılır, kalan bloklar yeni moda göre */
function dersModeMenu(open){const m=$("#dersModeM"), b=$("#dersMode"); if(!m||!b)return; m.hidden=!open; b.setAttribute("aria-expanded",String(open));
  /* dar ekranda menü başlığın altında, ekrana sabit (sağdan taşmasın) */
  if(open){const head=$("#ders .dHead"); const r=head?head.getBoundingClientRect():b.getBoundingClientRect(); m.style.top=window.innerWidth<=560?Math.round(r.bottom+6)+"px":"";}
  if(open){const cur=dayMode(); m.innerHTML=Object.keys(MODES).map(k=>`<button type="button" role="menuitemradio" aria-checked="${k===cur}" data-dmode="${k}">${k===cur?ICON("check"):'<span class="dmSp"></span>'}${esc(MODES[k])}<small>${k==="both"?"45 + 15 dk":"60 dk"}</small></button>`).join("");
    const f=m.querySelector('[aria-checked="true"]'); if(f) f.focus({preventScroll:true});}}
async function dersSetMode(m){dersModeMenu(false); if(!MODES[m]||m===dayMode()) return;
  if(F.busy||CC.busy){dersSay("Koç yazarken dil değiştirilemez; yanıt bitince tekrar dene.");return;}
  tStop(); setDayMode(m); F.transDone=false; F.wrapErr=""; F.note=""; F.doneSig="";
  const bl=dayBlocks(), nx=bl.find(b=>b.st==="next"); F.phase=nx?"block":"done";
  renderFocus(); renderLive(); dersSay("Bugünün dili: "+MODES[m]+"."+(nx?" Sıradaki: "+blockName(nx)+".":""));
  if(nx&&agentOf(nx)!==CC.agent) await dersStart({agent:agentOf(nx),auto:true,text:startMessage()});
  else $("#dersMode").focus({preventScroll:true});}

/* ---- olaylar ---- */
document.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b)return;
  if(b.id==="dersExit"){dersExit();return;}
  if(b.id==="dersMode"){dersModeMenu($("#dersModeM").hidden);return;}
  if(b.dataset.dmode){dersSetMode(b.dataset.dmode);return;}
  if(b.dataset.mode&&b.closest("#modeSeg,#onbModeSeg")){const seg=b.closest("#onbModeSeg")?"#onbModeSeg":"#modeSeg"; setDayMode(b.dataset.mode); if(seg==="#onbModeSeg"){const v=($("#progStart")||{}).value; if(v) onbDate=v; onbHtml="";} renderAll(); const n=$(seg+' [data-mode="'+b.dataset.mode+'"]'); if(n) n.focus({preventScroll:true}); return;}
  if(b.id==="dersNext"){dersNext(e);return;}
  if(b.id==="dersRetry"){dersNext(null,"retry");return;}
  if(b.id==="dersSkip"){F.wrapErr="";dersNext(null,"skip");return;}
  if(b.id==="dersPause"){F.paused=!F.paused; dersSync(dayBlocks()); renderFocus(); return;}
  if(b.id==="dersGoEn"){dersGoEn();return;}
  if(b.id==="dersBack"){dersExit();openTab("learn");return;}
  if(b.id==="dersCards"){dersExit(); openTab("cards",true); return;}
  if(b.id==="pracGo"){if(dersGate()) dersOpen(); return;}
  if(b.id==="keyGateUnits"){openTab("units"); return;}
  if(b.id==="dersChatOpen"){const el=dersEl(); el.classList.add("chat-open"); b.hidden=true; const ta=$("#ccIn"); if(ta&&!ta.disabled) ta.focus({preventScroll:true}); if(typeof ccScroll==="function") ccScroll(true); return;}
  if(b.dataset.onb){onbGo(+b.dataset.onb);return;}
  if(b.id==="onbSkip"){onbSkip=true; renderOnb(); const g=$("#btnGo"); if(g)g.focus({preventScroll:true}); return;}
  if(b.hasAttribute("data-onb-open")){onbSkip=false; onbStep=1; openTab("learn"); renderOnb(); const h=$("#onbTitle1"); if(h)h.focus({preventScroll:true}); return;}
  if(b.id==="tipX"){try{localStorage.setItem("tydil-tip-pin","1");}catch(e){} const t=$("#tipPin"); if(t)t.hidden=true; return;}
});
document.addEventListener("input",e=>{if(e.target&&e.target.id==="progStart") onbDate=e.target.value;});
document.addEventListener("change",e=>{if(e.target&&e.target.id==="progStart"){onbDate=e.target.value; const h=$("#progStartHint"), d=onbDate;
  if(h&&validDay(d)){const a=progAnchor(d); h.textContent=a>d?"Hafta 1: "+fmtDay(a,{day:"numeric",month:"long",weekday:"long"})+". O güne kadar ısınma.":"Hafta 1 bu hafta: "+fmtDay(a,{day:"numeric",month:"long"})+" Pazartesi'den sayılır.";}}});
/* Esc: yazı varken kutudan çıkar (taslak kalır), boşken dersten çıkar */
/* Dil menüsü dışına tıklayınca kapanır · kapaktaki dil seçiminde ok tuşları */
document.addEventListener("click",e=>{const m=$("#dersModeM"); if(m&&!m.hidden&&!e.target.closest(".dMode")) dersModeMenu(false);});
document.addEventListener("keydown",e=>{const g=e.target&&e.target.closest&&e.target.closest(".modeSeg [data-mode]"); if(!g)return;
  const ks=[...document.querySelectorAll(".modeSeg [data-mode]")], i=ks.indexOf(g), j=e.key==="ArrowRight"||e.key==="ArrowDown"?i+1:e.key==="ArrowLeft"||e.key==="ArrowUp"?i-1:null;
  if(j==null)return; e.preventDefault(); ks[(j+ks.length)%ks.length].click();});
document.addEventListener("keydown",e=>{if(!F.open||e.key!=="Escape"||e.isComposing)return; e.preventDefault();
  const mm=$("#dersModeM"); if(mm&&!mm.hidden){dersModeMenu(false); $("#dersMode").focus({preventScroll:true}); return;}
  const a=document.activeElement; if(a&&(a.tagName==="TEXTAREA"||a.tagName==="INPUT")&&String(a.value||"").trim()){a.blur();return;}
  dersExit();});
window.addEventListener("popstate",()=>{if(F.open&&!(history.state&&history.state.ders&&history.state.ders===F.tok)){F.pushed=false;dersClose();}});
/* Sayfa gizliyken sayaç durur; 5 dk'dan uzun aradan sonra duraklatılmış döner */
document.addEventListener("visibilitychange",()=>{if(!F.open)return;
  if(document.hidden){F.hiddenAt=Date.now(); tStop();}
  else {if(F.hiddenAt&&Date.now()-F.hiddenAt>5*60000&&F.phase==="block"){F.paused=true; dersSay("Uzun ara verdin; süre duraklatıldı.");} F.hiddenAt=0; renderFocus();}});
if(window.visualViewport){visualViewport.addEventListener("resize",vvFit);visualViewport.addEventListener("scroll",vvFit);}
window.addEventListener("pagehide",()=>{if(F.run){tStop();}});
/* Yenileme sonrası eski #ders girdisi kalmasın (Geri tuşu dersi açıp kapatmasın) */
try{if((history.state&&history.state.ders)||location.hash==="#ders") history.replaceState(null,"",location.pathname+location.search);}catch(e){}
{const m=$("#learnMore"); if(m){try{const v=localStorage.getItem("tydil-more");m.open=v==="1";}catch(e){} m.addEventListener("toggle",()=>{try{localStorage.setItem("tydil-more",m.open?"1":"0");}catch(e){}});}}
