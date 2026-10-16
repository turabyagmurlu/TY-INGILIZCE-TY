/* ---------- DERSLER (içerik) · GÜNÜN PLANI · BENİM DERSLERİM · GÜNCELLEME BANDI ----------
   İçerik: content/index.json + content/<id>.json (fetch, göreli adres; sw.js önbelleğe alır). Ders ekranı ve Konuş, ilk kullanımda mod/lesson.js
   olarak yüklenir (gzip bütçesi): o dosya window.TYDIL.core köprüsünü kullanır.
   db: lessons/<id> {step, done[5], anlatPage, p:{i,score}, best, last, attempts, passed, passedAt, pk (pekiştir tarihi), ms:{date,v}, updated}
   Not: renderAll bu dosya çalışmadan önce de çağrılır → durum "var" ile (TDZ yok). */
var LX={index:null,idxP:null,docs:{},prog:{},modP:null,hero:null,progOk:null};
const lxProgP=new Promise(r=>{LX.progOk=r;});
function lxNormIndex(j){const list=Array.isArray(j)?j:(j&&(j.lessons||j.items))||[];
  return list.map(e=>typeof e==="string"?{id:e}:e).filter(e=>e&&typeof e.id==="string"&&/^[a-z0-9_-]{2,40}$/i.test(e.id)).map(e=>{
    const t=topicById(e.id); return {id:e.id,lang:e.lang==="en"||e.lang==="it"?e.lang:/^en/.test(e.id)?"en":"it",level:e.level||(t?t[0]:""),title:e.title||(t?t[2]:e.id),minutes:+e.minutes||0,
      file:"content/"+(typeof e.file==="string"&&/^[\w./-]+\.json$/.test(e.file)&&!/\.\./.test(e.file)?e.file.replace(/^content\//,""):e.id+".json")};});}
function lxIndex(){if(LX.idxP)return LX.idxP;
  LX.idxP=fetch("content/index.json").then(r=>r.ok?r.json():null).then(j=>{LX.index=j?lxNormIndex(j):[];}).catch(()=>{LX.index=[];}).then(()=>{lxPaint();return LX.index;});
  return LX.idxP;}
const lxHas=id=>!!(id&&LX.index&&LX.index.some(x=>x.id===id));
const lxMeta=id=>(LX.index||[]).find(x=>x.id===id)||null;
function lxGet(id){const m=lxMeta(id); if(!m)return Promise.reject(new Error("Ders bulunamadı"));
  if(!LX.docs[id])LX.docs[id]=fetch(m.file).then(r=>{if(!r.ok)throw new Error("Ders dosyası açılamadı ("+r.status+")"); return r.json();}).catch(e=>{delete LX.docs[id]; throw e;});
  return LX.docs[id];}
const lxP=id=>LX.prog[id]||{};
const lxPassed=id=>!!lxP(id).passed;
function lxDb(){if(!db)return; db.collection("lessons").onSnapshot(q=>{LX.prog={}; q.docs.forEach(d=>LX.prog[d.id]=d.data()); LX.progOk(); lxPaint(); if(typeof renderHero==="function")renderHero();},()=>{});}
function lxPaint(){try{renderDayPlan();}catch(e){} try{lxRenderMine();}catch(e){}}
/* Blokları "bitti" işaretle (Ders modu planı da tamam görsün): lang + türler (yoksa o dilin hepsi) */
function lxFin(lang,kinds){try{fLoad(); planFor().forEach(b=>{if(b.l===lang&&(!kinds||kinds.includes(b.k)))F.fin.add(b.l+"-"+b.k);}); fSave(); daysSave(); renderLive();}catch(e){}}
/* ---- günün planı ---- */
function lxSteps(){
  if(!LX.index||!LX.index.length||weekday()===0)return null;
  const mode=dayMode(), t=today(), x=itToday(), itId=x.t&&x.mode!=="review"?x.t[1]:null, e=enToday(), enId=e.t?e.t[1]:null;
  const due=dueCards("it").length+dueCards("en").length, revToday=S.cards.some(c=>c.last===t);
  const pkOf=lang=>LX.index.filter(m=>m.lang===lang&&lxPassed(m.id)&&(lxP(m.id).passedAt||"")<t&&lxP(m.id).pk!==t&&!(lxP(m.id).pk>lxP(m.id).passedAt)).sort((a,b)=>(lxP(b.id).passedAt||"").localeCompare(lxP(a.id).passedAt||""))[0]||null;
  const konusDone=lang=>S.sessions.some(s=>s.date===t&&s.lang===lang&&(s.src==="konus"||(lang==="en"&&(+(s.mins||{}).speaking||0)>=7)));
  const doneToday=lang=>(LX.index.find(m=>m.lang===lang&&lxP(m.id).passed&&lxP(m.id).passedAt===t)||{}).id||null;
  const out=[]; let usesContent=false;
  const cards=()=>{if(due>0||revToday)out.push({k:"cards",t:"Kart tekrarı",s:due?due+" kart · yaklaşık "+cardMin(due)+" dk":"Bugünlük kartlar bitti",done:!due});};
  const lessonStep=(id,lang)=>{const m=lxMeta(id), p=lxP(id); out.push({k:"lesson",id,lang,t:m.title,s:(lang==="it"?"İtalyanca":"İngilizce")+" ders"+(m.minutes?" · "+m.minutes+" dk":"")+" · 5 adım",done:!!p.passed&&p.passedAt===t});};
  const pkStep=m=>out.push({k:"pekistir",id:m.id,lang:m.lang,t:"Pekiştir: "+m.title,s:"6 kısa soru + kısa konuşma",done:lxP(m.id).pk===t});
  if(mode!=="en"){
    const pk=pkOf("it"), lid=lxHas(itId)&&!lxPassed(itId)?itId:doneToday("it"), lessonNow=!!lid;
    if(lessonNow||pk){usesContent=true; cards(); if(lessonNow)lessonStep(lid,"it"); if(pk&&(!lessonNow||mode==="it"))pkStep(pk);}
    else out.push({k:"ders",lang:"it",t:"İtalyanca · Chiara ile ders",s:"Koç bloğu bloğu yürütür",done:dayBlocks().filter(b=>b.l==="it").every(b=>b.st==="done")});
    if(mode==="it"&&usesContent)out.push({k:"konus",coach:"it",t:"Chiara ile konuş",s:"5–8 dk sesli konuşma",done:konusDone("it")});}
  if(mode!=="it"){
    const eid=lxHas(enId)&&!lxPassed(enId)?enId:doneToday("en");
    if(mode==="en"&&eid){usesContent=true; if(!out.length)cards(); lessonStep(eid,"en");}
    if(usesContent)out.push({k:"konus",coach:"en",lesson:lxHas(enId)?enId:null,t:"Oliver ile konuş",s:(mode==="en"?"25":"15")+" dk sesli konuşma",done:konusDone("en")});
    else out.push({k:"ders",lang:"en",t:"İngilizce · Oliver ile konuşma",s:(mode==="en"?"60":"15")+" dk · "+(e.theme||"serbest"),done:dayBlocks().filter(b=>b.l==="en").every(b=>b.st==="done")});}
  if(!usesContent)return null;
  const n=out.find(s=>!s.done); if(n)n.next=true; return out;}
function renderDayPlan(){const el=$("#dayPlan"); if(!el||!LX)return; let st=null; try{st=lxSteps();}catch(e){st=null;} LX.hero=st;
  el.hidden=!st; const sub=$("#heroSub"); if(sub)sub.hidden=!!st; if(!st){el.innerHTML="";return;}
  const html=st.map((s,i)=>`<li class="${s.done?"done":s.next?"next":""}"><span class="pn">${s.done?ICON("check"):i+1}</span><div><b>${esc(s.t)}</b><small>${esc(s.s)}</small></div></li>`).join("");
  if(el.dataset.sig!==html){el.dataset.sig=html; el.innerHTML=html;}
  const dc=$("#dueChip"); if(dc){dc.hidden=true; dc.parentElement.hidden=true;}                     /* kart tekrarı planda bir adım */
  const g=$("#btnGo"), n=st.find(s=>s.next); if(!g||!n)return;
  const lbl=n.k==="cards"?"Başla · önce kart tekrarı":n.k==="lesson"?(lxP(n.id).step?"Derse devam et":"Bugünkü dersi başlat"):n.k==="pekistir"?"Başla · Pekiştir":n.k==="konus"?"Başla · "+(n.coach==="it"?"Chiara":"Oliver")+" ile konuş":"Bugünkü dersi başlat";
  g.innerHTML=ICON("play")+`<span>${esc(lbl)}</span>`; g.className="btn btn-big goBtn btn-primary";}
/* Başla: plan içerikliyse sıradaki adımı açar (true); değilse eski akış (Ders modu) */
function lxGo(){if(!LX)return false; const st=LX.hero; if(!st)return false; const n=st.find(s=>s.next); if(!n)return false;
  if(n.k==="cards"){openTab("cards");return true;}
  if(n.k==="lesson"||n.k==="pekistir"){lxOpen(n.id,{pk:n.k==="pekistir"});return true;}
  if(n.k==="konus"){openTab("konus"); lxMod().then(M=>M.konus.call({coach:n.coach,lesson:n.lesson||null})).catch(lxModErr); return true;}
  if(n.k==="ders"){if(dersGate())dersOpen(); return true;}
  return false;}
/* ---- Benim derslerim ---- */
function lxRenderMine(){const el=$("#myLessons"); if(!el||!LX)return; const L=LX.index||[]; el.hidden=!L.length; if(!L.length)return;
  const x=itToday(), cur=new Set([x.t&&x.t[1],(enToday().t||[])[1]].filter(Boolean)), STEP=["Anlat","Dinle","Uygula","Konuş","Yokla"];
  const html=`<div class="chead"><div><h2 id="myLT">Benim derslerim</h2><p class="lead">Adım adım dersler: Anlat · Dinle · Uygula · Konuş · Yokla. İstediğini aç.</p></div></div>
   <ol class="myList">${L.map(m=>{const p=lxP(m.id), chip=p.passed?`<span class="lst ok">${ICON("check")}Geçti</span>`:p.step||(p.done||[]).some(Boolean)?`<span class="lst go">Devam · ${STEP[p.step||0]}</span>`:cur.has(m.id)?`<span class="lst go">Bugün</span>`:`<span class="lst">Yeni</span>`;
     return `<li><button type="button" data-lesson="${esc(m.id)}">${FLAG(m.lang)}<span><b>${esc(m.title)}</b><small>${esc([m.level,m.lang==="it"?"İtalyanca":"İngilizce",m.minutes?m.minutes+" dk":""].filter(Boolean).join(" · "))}</small></span>${chip}</button></li>`;}).join("")}</ol>`;
  if(el.dataset.sig!==html){el.dataset.sig=html; el.innerHTML=html;}}
document.addEventListener("click",e=>{const b=e.target.closest("[data-lesson]"); if(b){const id=b.dataset.lesson; lxOpen(id,{pk:lxPassed(id)});}});
/* ---- tembel modül ---- */
function lxMod(){if(window.TYLESSON)return Promise.resolve(window.TYLESSON); if(LX.modP)return LX.modP;
  LX.modP=new Promise((res,rej)=>{const s=document.createElement("script"); s.src="mod/lesson.js"; s.onload=()=>window.TYLESSON?res(window.TYLESSON):rej(new Error("modül")); s.onerror=()=>{LX.modP=null; rej(new Error("Ders modülü yüklenemedi"));}; document.head.appendChild(s);});
  return LX.modP;}
function lxModErr(e){fNotice((e&&e.message||"Yüklenemedi")+". Bağlantıyı kontrol edip tekrar dene.");}
function lxOpen(id,o){lxMod().then(M=>M.open(id,o||{})).catch(lxModErr);}
function lxKonusTab(){lxMod().then(M=>M.konus.mount($("#konusMount"))).catch(()=>{const m=$("#konusMount"); if(m)m.innerHTML=`<div class="empty"><b>Konuş açılamadı</b>Bağlantıyı kontrol edip sekmeyi yeniden aç.</div>`;});}
/* ---- köprü (mod/lesson.js) ---- */
window.TYDIL.core={esc,today,addDays,ICON,FLAG,SYL,SPEAK_EN,itToday,enToday,dayMode,setTopic,upsertSession,lxFin,lxGet,lxMeta,lxP,lxPaint,dueCards,openTab,renderLive,fNotice,
  get db(){return db;}, S, LX, sample:()=>CC.sample, locked:()=>CC.locked, speakRules:ccSpeakRules, voiceFor:lang=>ccPickVoice(lang), rate:()=>V.set.rate, tipHtml:vTipHtml, ttsOk:vTtsOk,
  srOk:()=>!!V_SR&&!V_IOS_PWA, SR:()=>V_SR, ccStop:()=>{try{voiceStop();}catch(e){}}, topicById, cardMin};
lxIndex();
/* Ders ekranında sayfa yenilendiyse (#ders-<id>) aynı ders kaldığı adımdan açılır */
{const m=/^#ders-([a-z0-9_-]{2,40})$/i.exec(location.hash||""); if(m){try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}
  Promise.all([lxIndex(),lxProgP]).then(()=>{if(lxHas(m[1]))lxOpen(m[1],{pk:lxPassed(m[1])&&lxP(m[1]).passedAt!==today()});});}}
/* ---- güncelleme bandı: yeni service worker kurulunca "Yeni sürüm hazır · Yenile"; uygulamaya dönünce güncelleme denetimi ---- */
(function(){const sw=navigator.serviceWorker; if(!sw||!/^https?:$/.test(location.protocol))return; let had=!!sw.controller, shown=false, last=0, waitingW=null;
  const show=()=>{if(shown)return; shown=true; const b=$("#updBar"); if(b)b.hidden=false;};
  const watch=reg=>{if(!reg||reg.__ty)return; reg.__ty=1; if(reg.waiting&&sw.controller){waitingW=reg.waiting; show();}
    reg.addEventListener("updatefound",()=>{const w=reg.installing; if(!w)return; w.addEventListener("statechange",()=>{if(w.state==="installed"&&sw.controller){waitingW=reg.waiting; show();}});});};
  sw.addEventListener("controllerchange",()=>{if(had)show(); had=true;});
  sw.ready.then(watch).catch(()=>{}); sw.getRegistration().then(watch).catch(()=>{});
  const check=()=>{if(Date.now()-last<60000)return; last=Date.now(); sw.getRegistration().then(r=>{if(r){watch(r); r.update().catch(()=>{});}}).catch(()=>{});};
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)check();}); window.addEventListener("focus",check);
  $("#updGo").addEventListener("click",()=>{if(waitingW){try{waitingW.postMessage({type:"SKIP_WAITING"});}catch(e){} setTimeout(()=>location.reload(),600);} else location.reload();});})();
