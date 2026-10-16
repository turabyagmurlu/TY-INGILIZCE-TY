/* ---------- KONUŞ: telefon görüşmesi gibi konuşma pratiği (Konuş sekmesi + dersin Konuş adımı) ----------
   Sıra: koç konuşur (cümle cümle, akış gelirken) → okuma bitince mikrofon kendiliğinden dinler → ~1,2 sn sessizlik turu bitirir → yanıt.
   Küreye dokun: koçu keser ve dinlemeye geçer (dinlerken dokunmak turu hemen bitirir). Ses tanıma yok/izin yok → yazı kutusu (klavyenin mikrofonuyla dikte).
   Bitir → özet (süre, 3 düzeltme, 3 ifade + Dinle/Kartlara ekle, 1 ipucu) + seans: İngilizce "speaking", İtalyanca "sesli" (aynı gün toplanır). */
const K={el:null,coach:"en",topic:0,call:null};
const K_SIL=1200, K_RETRY=2;
const KIT_ALT=["Kendini tanıt: adın, şehrin, işin","Ailen ve memleketin","Şantiyede bir gün: ne var, ne yok"];
function kTopics(coach){const out=[];
  if(coach==="en"){const e=C.enToday(), wk=C.SPEAK_EN, i0=Math.max(0,wk.indexOf(e.theme)); const L0=C.LX.index&&e.t?C.lxMeta(e.t[1]):null;
    out.push({t:e.theme||wk[0],lesson:L0?L0.id:null,sub:e.t?"Gramer odağı: "+e.t[2]:""}); for(let k=1;k<=3;k++)out.push({t:wk[(i0+k)%wk.length]});}
  else{const x=C.itToday(), id=x.t?x.t[1]:null, m=id?C.lxMeta(id):null; out.push({t:m?m.title:x.t?x.t[2]:"Selamlaşma ve tanışma",lesson:m&&C.lxP(m.id).passed?m.id:null}); KIT_ALT.forEach(t=>out.push({t}));}
  out.push({t:"Serbest",free:1}); return out;}
/* Ses ipucu Konuş'ta yalnızca ilk açılışta (o oturum boyunca) görünür; asıl yeri Ayarlar › Ses */
function kTip(){if(K.tipOn===undefined){let seen=false; try{seen=localStorage.getItem("tydil.vtip.konusSeen")==="1";}catch(e){} K.tipOn=!seen; if(!seen){try{localStorage.setItem("tydil.vtip.konusSeen","1");}catch(e){}}}
  return K.tipOn?C.tipHtml(["it","en"],"konus"):"";}
/* ---- seçim ekranı ---- */
function kMount(el){if(!el)return; K.el=el; kPaint();}
function kPaint(){const el=K.el; if(!el)return; const tp=kTopics(K.coach); if(K.topic>=tp.length)K.topic=0;
  const co=c=>`<button type="button" class="kco" role="radio" aria-checked="${K.coach===c}" data-kco="${c}"><span class="kav ${c}" aria-hidden="true">${COACH[c].mono}</span><span><b>${COACH[c].name}</b><small>${c==="en"?"İngilizce · B1+ → B2":"İtalyanca · A1, çok yavaş ve basit"}</small></span></button>`;
  const lk=coachReady();
  el.innerHTML=`<div class="kpick"><div class="phead"><h2>Konuş</h2><p>Telefonla konuşur gibi: koç konuşur, sen sesli cevap verirsin. Mikrofon kendiliğinden açılır; koçu kesmek için küreye dokun.</p></div>
   <article class="card kpick"><div class="kcoaches" role="radiogroup" aria-label="Koç">${co("en")}${co("it")}</div>
    <h3 id="kTopL">Konu</h3><div class="kchips" role="radiogroup" aria-labelledby="kTopL">${tp.map((t,i)=>`<button type="button" class="kchip" role="radio" aria-checked="${i===K.topic}" data-kt="${i}">${esc(t.t)}</button>`).join("")}</div>
    ${tp[K.topic]&&tp[K.topic].sub?`<p class="hint" style="margin:0">${esc(tp[K.topic].sub)}</p>`:""}
    ${kTip()}
    ${lk?`<p class="msg info" style="margin:0">${esc(lk)} <button type="button" class="btn btn-soft btn-sm" data-go="key">Ayarlar'a git</button></p>`:""}
    <div class="btnRow"><button type="button" class="btn btn-primary btn-big" id="kStart" ${lk?"disabled":""}>${ICON("speaking")}Aramayı başlat</button><button type="button" class="btn btn-ghost" data-go="coach">${ICON("chat")}Yazarak çalış</button></div></article></div>`;}
document.addEventListener("click",e=>{const b=e.target.closest("#konusMount button"); if(!b)return;
  if(b.dataset.kco){K.coach=b.dataset.kco; K.topic=0; kPaint(); return;}
  if(b.dataset.kt){K.topic=+b.dataset.kt; kPaint(); return;}
  if(b.id==="kStart"){const t=kTopics(K.coach)[K.topic]||{}; kStartFrom(K.coach,t);}});
function kStartFrom(coach,t){let o={coach,topic:t.free?"":t.t};
  if(t.lesson){C.lxGet(t.lesson).then(d=>{const k=d.konus||{}; kCall(Object.assign(o,{lessonId:d.id,lessonTitle:d.title,goal:k.goal,vocab:arr(k.vocab),structures:arr(k.structures),opener:k.opener_hint,level:k.level_note}));}).catch(()=>kCall(o));}
  else kCall(o);}
/* Bugün planından: {coach, lesson} */
function kCallPlan(o){const coach=o.coach==="it"?"it":"en"; K.coach=coach; K.topic=0; kPaint(); const t=kTopics(coach)[0]; if(o.lesson)t.lesson=o.lesson; kStartFrom(coach,t);}
/* ---- arama ekranı ---- */
function kEl(){let el=document.getElementById("kc"); if(el)return el;
  el=document.createElement("div"); el.id="kc"; el.className="kc"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-labelledby","kcWho"); el.lang="tr"; el.hidden=true;
  document.body.appendChild(el); el.addEventListener("click",kClick); el.addEventListener("submit",kSubmit);
  el.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault(); e.stopPropagation(); kFinish();} if(e.key==="Enter"&&!e.shiftKey&&e.target.id==="kcIn"){e.preventDefault(); e.target.form.requestSubmit();}});
  return el;}
const KSTN={listening:"Dinliyorum",thinking:"Düşünüyor",speaking:"Konuşuyor",idle:"Duraklatıldı"};
function kCall(o){if(K.call)kEnd(true); const why=coachReady(); if(why){C.fNotice(why); return;}
  const coach=o.coach==="it"?"it":"en", el=kEl();
  K.call={o,coach,lang:coach,turns:[],last:"",you:"",st:"thinking",paused:false,t0:Date.now(),pausedMs:0,pauseAt:0,timer:0,rec:null,srOff:!C.srOk(),retry:0,ctl:null,gen:0,caps:true,ended:false,userTurns:0};
  el.className="kc "+coach; el.hidden=false; document.documentElement.classList.add("kc-on"); C.ccStop(); ttsStop();
  try{/* iOS: ilk okuma dokunuşla açılır */if(ttsOk()){const u=new SpeechSynthesisUtterance(" "); u.volume=0; window.speechSynthesis.speak(u);}}catch(e){}
  kPaintCall(); K.call.timer=setInterval(kTime,1000); kSend(null);}
function kPaintCall(){const c=K.call, el=kEl(), co=COACH[c.coach], o=c.o;
  el.innerHTML=`<header class="kcTop"><div><b id="kcWho">${co.name}</b><span>${esc(LN[c.lang])}${o.topic?" · "+esc(o.topic):" · serbest"}</span></div><span class="kcTime mono" id="kcTime" role="timer">00:00</span></header>
   <div class="kcMid" id="kcMid"><button type="button" class="kcOrb" id="kcOrb" data-st="${c.st}" aria-label="Küre: koçu kes ya da konuşmanı bitir"><span class="kcRing"></span><span class="kcCore">${co.mono}</span></button>
    <p class="kcSt" id="kcSt" aria-live="polite">${KSTN[c.st]}</p><div class="kcHint" id="kcHint" hidden></div>
    <div class="kcCap" id="kcCap"></div>
    <form class="kcType" id="kcType" ${c.srOff?"":"hidden"}><div><label class="cc-vh" for="kcIn">Cevabın</label><textarea id="kcIn" rows="1" lang="${c.lang}" placeholder="${c.lang==="it"?"İtalyanca cevap ver…":"Answer in English…"}"></textarea><button type="submit" class="btn btn-primary">Gönder</button></div><p class="hint">Klavyedeki mikrofon tuşuyla dikte et</p></form>
</div>
   <footer class="kcCtl"><button type="button" class="kcB" id="kcMic" aria-pressed="false">${ICON("speaking")}<span>Duraklat</span></button><button type="button" class="kcB" id="kcRep">${ICON("repeat")}<span>Tekrar et</span></button><button type="button" class="kcB" id="kcTr">${ICON("globe")}<span>Türkçesi?</span></button><button type="button" class="kcB" id="kcCapT" aria-pressed="true">${ICON("chat")}<span>Altyazı</span></button><button type="button" class="kcB end" id="kcEnd">${ICON("x")}<span>Bitir</span></button></footer>`;
  kCaps(); kState(c.st);}
function kTime(){const c=K.call; if(!c)return; const el=document.getElementById("kcTime"); if(el){const s=Math.floor(kMs()/1000); el.textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");}}
function kMs(){const c=K.call; if(!c)return 0; return Math.max(0,(c.endAt||Date.now())-c.t0-c.pausedMs-(c.pauseAt?Date.now()-c.pauseAt:0));}
function kState(st){const c=K.call; if(!c)return; c.st=st; const o=document.getElementById("kcOrb"), s=document.getElementById("kcSt"); if(o)o.dataset.st=st; if(s)s.textContent=c.srOff&&st==="listening"?"Sıra sende: yaz ya da dikte et":KSTN[st];
  const m=document.getElementById("kcMic"); if(m){m.setAttribute("aria-pressed",String(c.paused)); m.querySelector("span").textContent=c.paused?"Devam et":"Duraklat";}}
function kCaps(){const c=K.call, el=document.getElementById("kcCap"); if(!c||!el)return; el.hidden=!c.caps;
  el.innerHTML=(c.last?`<p class="c"><span>${COACH[c.coach].name}</span>${esc(spoken(c.last))}</p>`:"")+(c.you?`<p class="u"><span>Sen</span>${esc(c.you)}</p>`:"");}
/* ---- istek: akış gelirken tamamlanan cümle hemen okunur ---- */
function kTurns(){const c=K.call, o=c.o; const sys=C.speakRules(c.lang,{topic:o.topic,goal:o.goal,vocab:o.vocab,structures:o.structures,opener:o.opener,level:o.level});
  const T=c.turns.slice(-24); if(!T.length||T[0].role!=="user")T.unshift({role:"user",content:c.lang==="it"?"(Görüşme başladı. Merhaba!)":"(The call has started. Hi!)"});
  return [{role:"user",content:sys},...T];}
async function kSend(text){const c=K.call; if(!c||c.ended)return; const gen=++c.gen;
  if(text){c.turns.push({role:"user",content:text}); c.you=text; c.userTurns++; kCaps();}
  kStopListen(); kState("thinking"); let said=0, buf="", started=false;
  const out=x=>{if(!started){started=true; kSpeakOpen();} ttsPush(x);};
  const flush=final=>{let end=0; const re=/[.!?…]+["'»)*_]*\s+/g; let m; while((m=re.exec(buf)))end=m.index+m[0].length;
    if(end){sentences(buf.slice(0,end)).forEach(out); buf=buf.slice(end);} if(final&&buf.trim()){sentences(buf).forEach(out); buf="";}};
  let r=null;
  try{r=await C.sample()(kTurns(),{onText:({text:t})=>{if(gen!==c.gen||c.ended)return; buf+=t.slice(said); said=t.length; flush(false);}});}
  catch(e){if(c.ended)return; if(text&&c.turns[c.turns.length-1]&&c.turns[c.turns.length-1].content===text){c.turns.pop(); c.userTurns--;} if(gen!==c.gen)return; ttsStop(); kHint(coachErr(e)||"Yanıt gelmedi. Tekrar dene."); c.paused=true; c.pauseAt=Date.now(); kState("idle"); return;}
  if(c.ended)return;
  const full=String(r&&r.text||"").trim(); c.turns.push({role:"assistant",content:full||"…"}); c.last=full; kCaps();
  if(gen!==c.gen)return;                                                   /* kesildi: kayda girer, okunmaz */
  if(said<full.length){buf+=full.slice(said);} flush(true);
  if(!started){kAfterSpeak();} else ttsClose();}
function kSpeakOpen(){const c=K.call; kState("speaking"); const g=c.gen; speak([],c.lang,{open:true}).then(r=>{if(!K.call||K.call.gen!==g)return; if(r&&r.cancelled&&K.call.interrupted){K.call.interrupted=false; return;} kAfterSpeak();});}
function kAfterSpeak(){const c=K.call; if(!c||c.ended)return; if(c.paused){kState("idle"); return;} kListen();}
/* ---- dinleme: continuous + 1,2 sn sessizlik; boş bitişte en çok 2 yeniden başlatma ---- */
function kListen(){const c=K.call; if(!c||c.ended||c.paused)return; kStopListen();
  if(c.srOff){kState("listening"); const i=document.getElementById("kcIn"); if(i)i.focus({preventScroll:true}); return;}
  const SR=C.SR(); let rec; try{rec=new SR();}catch(e){kNoSR(); return;}
  const s={rec,fin:[],interim:"",silT:0,done:false}; c.rec=s; rec.lang=tagOf(c.lang); rec.continuous=true; rec.interimResults=true; try{rec.maxAlternatives=1;}catch(e){}
  const text=()=>(s.fin.join(" ")+" "+s.interim).replace(/\s+/g," ").trim();
  rec.onresult=e=>{if(s.done||c.rec!==s)return; const R=e.results||[]; let interim=""; for(let i=e.resultIndex||0;i<R.length;i++){const r=R[i]; if(!r||!r[0])continue; if(r.isFinal)s.fin[i]=r[0].transcript; else interim+=r[0].transcript+" ";}
    s.interim=interim.trim(); c.you=text(); kCaps(); clearTimeout(s.silT); if(c.you)s.silT=setTimeout(()=>kTurnEnd(),K_SIL);};
  rec.onerror=e=>{if(s.done||c.rec!==s)return; const er=e&&e.error; if(er==="not-allowed"||er==="service-not-allowed"||er==="audio-capture"||er==="language-not-supported"){s.done=true; kNoSR();}};
  rec.onend=()=>{if(s.done||c.rec!==s)return; if(text())return kTurnEnd(); if(c.retry<K_RETRY){c.retry++; setTimeout(()=>{if(K.call===c&&c.rec===s&&!c.paused&&!c.ended)kListen();},150); return;}
    c.retry=0; c.rec=null; c.paused=true; kState("idle"); kHint("Seni duyamadım. Devam etmek için mikrofona dokun.");};
  try{rec.start(); kState("listening");}catch(e){kNoSR();}}
function kTurnEnd(){const c=K.call; if(!c)return; const s=c.rec; if(!s)return; const t=(s.fin.join(" ")+" "+s.interim).replace(/\s+/g," ").trim(); s.done=true; clearTimeout(s.silT); try{s.rec.stop();}catch(e){} c.rec=null; c.retry=0;
  if(t){kHint(""); kSend(t);} else kListen();}
function kStopListen(){const c=K.call; if(!c||!c.rec)return; const s=c.rec; s.done=true; clearTimeout(s.silT); try{s.rec.abort();}catch(e){} c.rec=null;}
function kNoSR(){const c=K.call; if(!c)return; c.srOff=true; c.rec=null; const f=document.getElementById("kcType"); if(f)f.hidden=false; kState("listening"); const i=document.getElementById("kcIn"); if(i)i.focus({preventScroll:true});}
function kHint(t){const h=document.getElementById("kcHint"); if(!h)return; h.textContent=t||""; h.hidden=!t;}
/* ---- düğmeler ---- */
async function kClick(e){const b=e.target.closest("button"); if(!b)return; const c=K.call;
  if(b.id==="kcOrb"&&c&&!c.ended){if(c.st==="speaking"||c.st==="thinking"){c.interrupted=c.st==="speaking"; c.gen++; ttsStop(); c.paused=false; kListen();} else if(c.st==="listening"&&c.rec){kTurnEnd();} else if(c.st==="idle"){kResume();} return;}
  if(b.id==="kcMic"&&c){if(c.paused)kResume(); else{c.paused=true; c.pauseAt=Date.now(); c.gen++; ttsStop(); kStopListen(); kState("idle");} return;}
  if(b.id==="kcRep"&&c&&c.last){c.gen++; kStopListen(); kState("speaking"); const g=c.gen; speak(c.last,c.lang,{rate:C.rate()*0.75}).then(()=>{if(K.call===c&&c.gen===g)kAfterSpeak();}); return;}
  if(b.id==="kcTr"&&c&&c.last){kHint("Türkçesi hazırlanıyor…"); try{const r=await C.sample()([{role:"user",content:"Aşağıdaki "+LN[c.lang]+" cümle(ler)in Türkçesini TEK satırda yaz. Başka hiçbir şey yazma, açıklama ekleme.\n\n"+spoken(c.last)}],{}); if(K.call===c)kHint("Türkçesi: "+String(r.text||"").replace(/\s+/g," ").trim());}catch(x){if(K.call===c)kHint(coachErr(x)||"Çeviri gelmedi.");} return;}
  if(b.id==="kcCapT"&&c){c.caps=!c.caps; b.setAttribute("aria-pressed",String(c.caps)); kCaps(); return;}
  if(b.id==="kcEnd"){kFinish(); return;}
  if(b.dataset.kph!==undefined){const p=K.sum&&K.sum.phrases[+b.dataset.kph]; if(p)speak([p.x],K.sum.lang); return;}
  if(b.dataset.kadd!==undefined){kAddCard(+b.dataset.kadd,b); return;}
  if(b.id==="kcClose"){kClose(); return;}}
function kResume(){const c=K.call; if(!c)return; if(c.pauseAt){c.pausedMs+=Date.now()-c.pauseAt; c.pauseAt=0;} c.paused=false; kHint(""); kListen();}
function kSubmit(e){e.preventDefault(); const c=K.call; if(!c||c.ended)return; const i=document.getElementById("kcIn"), v=(i.value||"").trim(); if(!v)return; i.value=""; c.gen++; ttsStop(); kSend(v);}
/* ---- bitir: özet + kayıt ---- */
async function kFinish(){const c=K.call; if(!c||c.ended)return; c.ended=true; c.endAt=Date.now(); if(c.pauseAt){c.pausedMs+=Date.now()-c.pauseAt; c.pauseAt=0;} c.gen++; clearInterval(c.timer); kStopListen(); ttsStop();
  const mins=Math.max(1,Math.round(kMs()/60000)); const mid=document.getElementById("kcMid"), ctl=document.querySelector("#kc .kcCtl"); if(ctl)ctl.hidden=true;
  if(!c.userTurns){kClose(); return;}
  if(mid){mid.classList.add("sum"); mid.scrollTop=0;}
  if(mid)mid.innerHTML=`<div class="kcSum"><h2>Özet hazırlanıyor…</h2><p class="lead">${COACH[c.coach].name} konuşmanı gözden geçiriyor.</p></div>`;
  let sum={duzeltmeler:[],ifadeler:[],ipucu:""};
  try{const ask=c.lang==="it"?"GÖRÜŞME BİTTİ. Şimdi yalnızca şu biçimde JSON yaz, başka hiçbir metin yazma":"THE CALL IS OVER. Now output ONLY this JSON, no other text";
    const r=await C.sample()([{role:"user",content:C.speakRules(c.lang,{topic:c.o.topic})},{role:"user",content:"(…)"},...c.turns.slice(-30),{role:"user",content:ask+':\n{"duzeltmeler":[{"sen":"öğrencinin gerçek cümlesi","dogal":"doğal hali"}],"ifadeler":[{"x":"'+LN[c.lang]+' faydalı ifade","tr":"Türkçesi"}],"ipucu":"Türkçe tek cümle ipucu"}\nEn çok 3 düzeltme (yalnızca öğrencinin söylediklerinden; hata yoksa boş liste), tam 3 faydalı ifade, 1 ipucu.'}],{});
    const t=String(r.text||""), a=t.indexOf("{"), z=t.lastIndexOf("}"); if(a>=0&&z>a){const j=JSON.parse(t.slice(a,z+1)); sum={duzeltmeler:arr(j.duzeltmeler).filter(x=>x&&x.sen&&x.dogal).slice(0,3),ifadeler:arr(j.ifadeler).filter(x=>x&&x.x).slice(0,3),ipucu:String(j.ipucu||"")};}}
  catch(e){sum.ipucu=coachErr(e)?"Özet alınamadı: "+coachErr(e):"";}
  K.sum={lang:c.lang,phrases:sum.ifadeler};
  await kSave(c,mins);
  const res={turns:c.userTurns,mins,fixes:sum.duzeltmeler.length,phrases:sum.ifadeler.length};
  if(mid)mid.innerHTML=`<div class="kcSum" id="kcSum"><h2>Konuşma tamam</h2><div class="kcStats"><span>${ICON("clock")} ${mins} dk</span><span>${c.userTurns} cevap</span><span>${COACH[c.coach].name}</span></div>
    ${sum.duzeltmeler.length?`<h3>DAHA DOĞAL SÖYLE</h3><ul class="kcFix">${sum.duzeltmeler.map(f=>`<li><span><s>${esc(f.sen)}</s></span><span>→ <b lang="${c.lang}">${esc(f.dogal)}</b></span></li>`).join("")}</ul>`:`<p class="fb ok">Belirgin bir hata yakalanmadı.</p>`}
    ${sum.ifadeler.length?`<h3>İŞİNE YARAYACAK İFADELER</h3><ul class="kcFix kcPh">${sum.ifadeler.map((p,i)=>`<li><button type="button" class="say" data-kph="${i}" aria-label="Dinle: ${esc(p.x)}">${SPK}</button><span><b lang="${c.lang}">${esc(p.x)}</b>${p.tr?`<small>${esc(p.tr)}</small>`:""}</span><button type="button" class="kcAdd" data-kadd="${i}">Kartlara ekle</button></li>`).join("")}</ul>`:""}
    ${sum.ipucu?`<p class="lnote"><b>İpucu:</b> ${esc(sum.ipucu)}</p>`:""}
    <div class="btnRow"><button type="button" class="btn btn-primary" id="kcClose">${c.o.lessonId&&L.open?"Derse dön":"Kapat"}</button></div></div>`;
  const cl=document.getElementById("kcClose"); if(cl)cl.focus({preventScroll:true});
  c.result=res;}
async function kSave(c,mins){const db=C.db; if(!db)return; const t=today(), lang=c.lang, k=lang==="en"?"speaking":"sesli", id="konus-"+t+"-"+lang;
  const prev=C.S.sessions.find(s=>s.id===id), pm=prev&&prev.mins?+prev.mins[k]||0:0, m={}; m[k]=pm+mins;
  try{await C.upsertSession(id,{date:t,lang,mins:m,total:pm+mins,topic:c.o.lessonId&&C.topicById(c.o.lessonId)?c.o.lessonId:lang==="en"&&C.enToday().t?C.enToday().t[1]:"",mistakes:[],note:"Konuş: "+(c.o.topic||"serbest"),next:"",created:new Date().toISOString(),words:0,src:"konus"});}catch(e){}
  C.lxFin(lang,[lang==="en"?"speaking":"sesli"]);}
async function kAddCard(i,b){const p=K.sum&&K.sum.phrases[i], db=C.db; if(!p||!db)return; b.disabled=true; const lang=K.sum.lang;
  if(C.S.cards.some(c=>c.lang===lang&&String(c.f||"").toLowerCase()===String(p.x).toLowerCase())){b.textContent="Zaten kartlarda"; return;}
  try{await db.collection("cards").add({lang,f:String(p.x).slice(0,120),tr:String(p.tr||"").slice(0,160),ex:"",box:1,due:C.addDays(today(),1),added:new Date().toISOString()}); b.textContent="Eklendi ✓";}catch(e){b.disabled=false; b.textContent="Eklenemedi";}}
function kClose(){const c=K.call; const r=c&&c.result; kEnd(true); if(c&&c.o.onEnd)c.o.onEnd(r||null); C.renderLive(); C.lxPaint();}
function kEnd(quiet){const c=K.call; if(c){c.ended=true; c.gen++; clearInterval(c.timer); kStopListen();} ttsStop(); K.call=null; const el=document.getElementById("kc"); if(el){el.hidden=true; el.innerHTML="";} document.documentElement.classList.remove("kc-on");}
document.addEventListener("visibilitychange",()=>{const c=K.call; if(document.hidden&&c&&!c.ended&&!c.paused){c.paused=true; c.pauseAt=Date.now(); c.gen++; ttsStop(); kStopListen(); kState("idle");}});
window.TYLESSON={open,close,validate,konus:{mount:kMount,call:kCallPlan,start:kCall},spoken,sentences,state:()=>({L,K})};
