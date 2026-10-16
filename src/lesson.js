/* ---------- DERS EKRANI (tembel modül: mod/lesson.js) ----------
   Anlat · Dinle · Uygula · Konuş · Yokla + her adımda "Koça sor". İçerik şeması content/SCHEMA.md (metinlerde yalnızca **kalın**).
   Köprü: window.TYDIL.core (db, setTopic, upsertSession, lxFin, sample, ses seçimi). Bu dosya konus.js ile aynı kapsamdadır (build.py birleştirir). */
const T=window.TYDIL, C=T.core, esc=C.esc, ICON=C.ICON, FLAG=C.FLAG;
{const st=document.createElement("style"); st.id="lsnCss"; st.textContent=LCSS; document.head.appendChild(st);}
const md=s=>esc(s).replace(/\*\*([^*\n]+?)\*\*/g,"<b>$1</b>");
const LN={it:"İtalyanca",en:"İngilizce"};
const COACH={it:{name:"Chiara",to:"Chiara'ya",mono:"CH"},en:{name:"Oliver",to:"Oliver'a",mono:"OL"}};
const SPK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/></svg>';
/* ---- konuşma metni temizliği: markdown, boru, emoji, URL, köşeli/parantez işaretleri; cümle cümle ---- */
function spoken(t){return String(t||"").replace(/\[\[(?:it|en|tr):\s*([^\]]*?)\s*\]\]/g,"$1").replace(/https?:\/\/\S+/g," ").replace(/\[[^\]]*\]/g," ").replace(/\([^)]*\)/g," ")
  .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu,"").replace(/[*_#`>|~<{}]+/g," ").replace(/^\s*[-•]\s+/gm,"").replace(/\s+([,.;:!?])/g,"$1").replace(/\s+/g," ").trim();}
function sentences(t){return (spoken(t).match(/[^.!?…]+(?:[.!?…]+["'»)]*|$)/g)||[]).map(s=>s.trim()).filter(s=>/[\p{L}\p{N}]/u.test(s));}
const TTS={job:null};
const ttsOk=()=>C.ttsOk();
const tagOf=l=>l==="it"?"it-IT":l==="en"?"en-GB":"tr-TR";
/* speak(metin|cümleler, dil, {rate, onStart}) → Promise {done|cancelled}. Kesilebilir: ttsStop() */
function speak(src,lang,o){o=o||{}; ttsStop(); if(!ttsOk())return Promise.resolve({done:false});
  const list=Array.isArray(src)?src:sentences(src); const job={q:list.slice(),cancelled:false,lang,rate:o.rate||C.rate(),open:!!o.open}; TTS.job=job;
  return new Promise(res=>{job.res=res; ttsNext(job);});}
function ttsPush(s){const j=TTS.job; if(!j||j.cancelled)return; j.q.push(s); if(!j.busy&&!j.ended)ttsNext(j);}
function ttsClose(){const j=TTS.job; if(!j)return; j.open=false; if(!j.busy&&!j.q.length)ttsFin(j,{done:true});}
function ttsFin(j,r){if(j.ended)return; j.ended=true; clearTimeout(j.w); if(TTS.job===j)TTS.job=null; j.res(r);}
function ttsNext(j){if(j.cancelled)return ttsFin(j,{cancelled:true}); const s=j.q.shift(); if(s==null){j.busy=false; if(!j.open)ttsFin(j,{done:true}); return;}
  j.busy=true; const SY=window.speechSynthesis, u=new SpeechSynthesisUtterance(s); u.lang=tagOf(j.lang); u.rate=j.rate; const v=C.voiceFor(j.lang); if(v)u.voice=v;
  const go=()=>{clearTimeout(j.w); if(!j.cancelled)ttsNext(j);};
  u.onend=go; u.onerror=e=>{const c=e&&e.error; if(c==="interrupted"||c==="canceled"){clearTimeout(j.w); return ttsFin(j,{cancelled:true});} go();};
  clearTimeout(j.w); j.w=setTimeout(()=>{try{SY.cancel();}catch(e){} go();},2500);
  u.onstart=()=>{clearTimeout(j.w); j.w=setTimeout(()=>{try{SY.cancel();}catch(e){} go();},Math.min(30000,3000+s.length*90));};
  try{SY.speak(u);}catch(e){go();}}
function ttsStop(){const j=TTS.job; if(j){j.cancelled=true; TTS.job=null; clearTimeout(j.w); ttsFin(j,{cancelled:true});} try{if(ttsOk())window.speechSynthesis.cancel();}catch(e){} document.querySelectorAll(".say.on").forEach(b=>b.classList.remove("on"));}
const sayBtn=(t,lang,label)=>`<button type="button" class="say" data-say="${esc(t)}" data-sl="${lang}" aria-label="${esc(label||("Dinle: "+t))}">${SPK}</button>`;
/* ---- koç isteği (CC.sample) ---- */
function coachErr(e){const c=e&&e.code; return c==="capability_disabled"||c==="session_expired"?"Koç için Ayarlar → Claude bağlantısı'ndan anahtar gir.":c==="rate_limited"?"Şu an çok istek var. Biraz sonra tekrar dene.":c==="cancelled"?"":"Bağlantı kurulamadı. Tekrar dene.";}
function coachReady(){const s=C.sample(); if(!s)return "Koç hazırlanıyor; birkaç saniye sonra tekrar dene."; const lk=C.locked(); if(lk)return lk; return "";}
/* ---- değerlendirme ---- */
const norm=s=>String(s||"").toLowerCase().replace(/[.!?¿¡,;:"'’‘`´«»“”]/g,"").replace(/\s+/g," ").trim();
const deacc=s=>norm(s).normalize("NFD").replace(/[̀-ͯ]/g,"");
const arr=v=>Array.isArray(v)?v:v==null?[]:[v];
function judge(item,val){if(item.t==="choice")return val===item.a?"ok":"no";
  const v=norm(val), A=arr(item.a).concat(arr(item.alt));
  if(A.some(a=>norm(a)===v))return "ok";
  if(arr(item.soft).some(a=>norm(a)===v)||A.some(a=>deacc(a)===deacc(val)))return "soft";
  return "no";}
const ansOf=item=>arr(item.a)[0]||"";
const cap=s=>String(s).replace(/^./,c=>c.toUpperCase());
/* ---- durum ---- */
const STEPS=[["anlat","Anlat"],["dinle","Dinle"],["uygula","Uygula"],["konus","Konuş"],["yokla","Yokla"]];
const L={id:"",d:null,lang:"it",coach:"it",step:0,done:[0,0,0,0,0],page:0,pr:{i:0,score:0,ans:false},qz:{i:0,score:0,ans:false,miss:[]},pk:null,ask:[],askBusy:false,open:false,ms:0,msDate:"",act:0,tick:0,tok:"",konus:null,order:[]};
const $l=s=>document.querySelector("#lsn "+s);
function lsnEl(){let el=document.getElementById("lsn"); if(el)return el;
  el=document.createElement("div"); el.id="lsn"; el.className="lsn"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-labelledby","lsnT"); el.lang="tr"; el.hidden=true;
  el.innerHTML=`<div class="lsnSticky"><div class="lsnBar"><button type="button" class="lsnX" id="lsnX">${ICON("arrow")}<span>Çık</span></button>
      <div class="lsnBt"><small id="lsnEye"></small><h1 id="lsnT"></h1></div>
      <button type="button" class="askFab" id="askFab" aria-expanded="false" aria-controls="ask">${ICON("ask")}<span>Koça sor</span></button></div>
    <ol class="lpath" id="lpath" aria-label="Dersin adımları"></ol></div>
   <div class="lsnIn"><p class="lead lsnLead" id="lsnLead"></p><main id="lstage"></main></div>
   <section class="ask" id="ask" hidden aria-label="Koça sor"><header><div><strong id="askWho">Koça sor</strong><small id="askCtx"></small></div><button type="button" class="lx" id="askX" aria-label="Kapat">×</button></header>
    <div class="askLog" id="askLog" aria-live="polite"></div><form id="askForm"><label class="cc-vh" for="askIn">Sorun</label><textarea id="askIn" rows="1" placeholder="Takıldığın yeri yaz…"></textarea><button type="submit" class="btn btn-primary btn-sm" id="askSend">Sor</button></form></section>`;
  document.body.appendChild(el); el.addEventListener("click",onClick); el.addEventListener("submit",onSubmit); el.addEventListener("keydown",onKey);
  el.addEventListener("pointerdown",()=>{L.act=Date.now();},{passive:true}); el.addEventListener("keydown",()=>{L.act=Date.now();},{passive:true});
  return el;}
function today(){return C.today();}
function progDoc(){return C.lxP(L.id);}
async function save(extra){const db=C.db; if(!db)return; const p=progDoc();
  const rec=Object.assign({},p,{step:L.step,done:L.done.map(Boolean),page:L.page,p:{i:L.pr.i,score:L.pr.score},ms:{date:L.msDate,v:Math.round(L.ms)},updated:new Date().toISOString()},extra||{});
  C.LX.prog[L.id]=rec; try{await db.collection("lessons").doc(L.id).set(rec);}catch(e){} }
/* aktif süre: görünür + son 3 dk içinde etkileşim (Konuş görüşmesi ayrıca sayılır) */
function tick(){if(!L.open||document.hidden||K.call)return; if(Date.now()-L.act>180000)return; const t=today(); if(L.msDate!==t){L.msDate=t; L.ms=0;} L.ms+=15000;}
/* ---- aç / kapat ---- */
async function open(id,o){o=o||{}; let d, wk=null; try{d=await C.lxGet(id); if(o.week&&o.week.length>1)wk=await Promise.all(o.week.map(x=>C.lxGet(x)));}catch(e){C.fNotice(e.message||"Ders açılamadı."); return;}
  const bad=validate(d); if(bad){C.fNotice("Ders dosyası hatalı: "+bad); return;}
  if(L.open)close(true);
  const p=C.lxP(id); Object.assign(L,{id,d,lang:d.lang==="en"?"en":"it",coach:d.konus&&d.konus.coach==="oliver"?"en":d.konus&&d.konus.coach==="chiara"?"it":(d.lang==="en"?"en":"it"),
    done:[0,1,2,3,4].map(i=>!!(p.done&&p.done[i])),step:Math.min(4,Math.max(0,+p.step||0)),page:0,pr:{i:+(p.p&&p.p.i)||0,score:+(p.p&&p.p.score)||0,ans:false},qz:{i:0,score:0,ans:false,miss:[]},
    pk:o.pk&&d.pekistir&&Array.isArray(d.pekistir.items)?{i:0,score:0,ans:false,talk:false,items:wk?[].concat(...wk.map(x=>arr(x.pekistir&&x.pekistir.items).slice(0,4))):d.pekistir.items}:null,week:wk?o.week.slice():null,ask:[],sum:null,open:true,act:Date.now(),msDate:p.ms&&p.ms.date===today()?p.ms.date:today(),ms:p.ms&&p.ms.date===today()?+p.ms.v||0:0});
  if(L.pr.i>=(d.uygula||[]).length&&!L.done[2])L.pr={i:0,score:0,ans:false};
  const el=lsnEl(); el.hidden=false; el.scrollTop=0; document.documentElement.classList.add("lsn-on"); C.ccStop();
  L.tok=Math.random().toString(36).slice(2,9); try{history.pushState({lsn:L.tok},"",location.pathname+location.search+"#ders-"+id); L.pushed=true;}catch(e){L.pushed=false;}
  clearInterval(L.tick); L.tick=setInterval(tick,15000);
  render(); const x=$l("#lsnX"); if(x)x.focus({preventScroll:true});}
function close(quiet){if(!L.open)return; tick(); save(); L.open=false; clearInterval(L.tick); ttsStop(); closeAsk(true); if(K.call)kEnd(true);
  const el=document.getElementById("lsn"); if(el)el.hidden=true; document.documentElement.classList.remove("lsn-on");
  if(L.pushed&&!quiet){L.pushed=false; try{if(history.state&&history.state.lsn===L.tok)history.back();}catch(e){}}
  else if(location.hash.indexOf("#ders-")===0){try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}}
  C.lxPaint(); C.renderLive();}
window.addEventListener("popstate",e=>{if(L.open&&!(e.state&&e.state.lsn===L.tok)){L.pushed=false; close(true);}});
/* şema denetimi: hatalıysa kısa neden (tests: her içerik dosyası) */
function validate(d){if(!d||typeof d!=="object")return "JSON nesnesi değil"; if(!d.id||!d.title)return "id/title yok"; if(!(d.lang==="it"||d.lang==="en"))return "lang it|en olmalı";
  if(!Array.isArray(d.anlat)||!d.anlat.length)return "anlat boş"; for(const c of d.anlat){if(!c||!Array.isArray(c.blocks))return "anlat kartında blocks yok"; for(const b of c.blocks){if(!b||!BLOCK[b.type])return "bilinmeyen blok: "+(b&&b.type);}}
  if(!Array.isArray(d.dinle)||!d.dinle.every(x=>x&&x.x))return "dinle hatalı";
  const items=(a,n)=>{if(!Array.isArray(a)||!a.length)return n+" boş"; for(const it of a){const e=itemErr(it); if(e)return n+": "+e;} return "";};
  return items(d.uygula,"uygula")||items(d.yokla,"yokla")||(d.konus&&typeof d.konus==="object"?"":"konus yok")||(d.pekistir&&d.pekistir.items?items(d.pekistir.items,"pekistir"):"");}
function itemErr(it){if(!it||!it.q)return "soru metni yok";
  if(it.t==="choice")return Array.isArray(it.o)&&it.o.includes(it.a)?"":"choice: a seçeneklerde yok ("+it.q+")";
  if(it.t==="type")return arr(it.a).length?"":"type: a boş";
  if(it.t==="order")return Array.isArray(it.words)&&it.words.length&&arr(it.a).length?"":"order: words/a eksik";
  return "bilinmeyen tür: "+it.t;}
/* ---- çizim ---- */
const unlocked=i=>i===0||L.done[i-1]||L.done[i]||!!progDoc().passed;
function render(){const d=L.d; $l("#lsnEye").innerHTML=FLAG(L.lang)+esc(LN[L.lang]+" "+(d.level||"")+(L.pk?" · Pekiştir":" · Ders"));
  $l("#lsnT").textContent=L.week?"Haftanın Pekiştir'i":d.title; const lead=$l("#lsnLead"); lead.innerHTML=L.pk?(L.week?"Haftanın derslerini pekiştir: kısa sorular, sonra kısa konuşma.":"Dünkü dersi pekiştir: kısa sorular, sonra kısa konuşma."):md(d.lead||""); lead.hidden=!L.pk&&!(L.step===0&&L.page===0&&d.lead);
  const path=$l("#lpath");
  if(L.pk){const ps=[["Sorular",!!L.pk.talk||L.pk.i>=L.pk.items.length],["Konuş",false]]; path.style.setProperty("--n",2);
    path.innerHTML=ps.map((s,i)=>`<li><button type="button" disabled class="${s[1]?"done":""}" ${(i===0)!==!!L.pk.talk?'aria-current="step"':""}><span>${s[1]?"✓":i+1}</span>${s[0]}</button></li>`).join("");}
  else{path.style.setProperty("--n",5); path.innerHTML=STEPS.map((s,i)=>`<li><button type="button" data-step="${i}" ${i===L.step?'aria-current="step"':""} class="${L.done[i]?"done":""}" ${unlocked(i)?"":"disabled"}><span>${L.done[i]?"✓":i+1}</span>${s[1]}</button></li>`).join("");}
  const k=L.pk?(L.pk.talk?"pkTalk":"pk"):STEPS[L.step][0];
  $l("#lstage").innerHTML=({anlat:vAnlat,dinle:vDinle,uygula:vUygula,konus:vKonus,yokla:vYokla,pk:vPk,pkTalk:vPkTalk})[k]();
  $l("#askWho").textContent=COACH[L.lang].to+" sor"; $l("#askCtx").textContent="Şu an: "+ctxName();
  const f=$l("#lstage [data-focus]"); if(f)f.focus({preventScroll:true});}
function go(i){if(!unlocked(i))return; L.step=i; if(i===0)L.page=0; save(); render(); const el=document.getElementById("lsn"); if(el)el.scrollTo({top:0,behavior:"auto"});}
function finish(i){L.done[i]=true; if(i<4)go(i+1); else{save(); render();}}
/* Anlat blokları */
const BLOCK={
  p:b=>`<p>${md(b.text)}</p>`,
  note:b=>`<p class="lnote${b.warn?" warn":""}">${md(b.text)}</p>`,
  compare:b=>`<div class="compare">${arr(b.rows).map(r=>`<div class="lane"><b>${md(r.label)}</b><div class="blks">${arr(r.items).map(x=>`<span class="blk${x.hl?" v":""}">${md(x.t)}${x.s?`<small>${md(x.s)}</small>`:""}</span>`).join("")}</div></div>`).join("")}</div>`,
  table:b=>{const x=Number.isInteger(b.x)?b.x:-1, say=Array.isArray(b.say)?b.say:null, sp=say||x>=0, H=arr(b.head);
    /* dar ekran (<600 px): her satır bir kart — hedef dil + okunuş + hoparlör, diğer sütunlar küçük etiketli */
    const cards=`<div class="lrcs">${arr(b.rows).map((r,ri)=>{r=arr(r); const k=x>=0?x:0, t=say?say[ri]:x>=0?String(r[x]||"").replace(/\*\*/g,""):"";
      return `<div class="lrc"><div class="lrcH"><span class="${x>=0?"tx":""}">${md(r[k])}</span>${t?sayBtn(t,L.lang):""}</div>${r.map((c,ci)=>ci===k||c===""||c==null?"":`<div class="lrcR"><span>${md(H[ci]||"")}</span><b>${md(c)}</b></div>`).join("")}</div>`;}).join("")}</div>`;
    return cards+`<div class="ltbl" tabindex="0" role="region" aria-label="Tablo"><table>${arr(b.head).length?`<thead><tr>${b.head.map(h=>`<th>${md(h)}</th>`).join("")}${sp?"<th></th>":""}</tr></thead>`:""}<tbody>${arr(b.rows).map((r,ri)=>{const t=say?say[ri]:x>=0?String(arr(r)[x]||"").replace(/\*\*/g,""):"";
      return `<tr>${arr(r).map((c,ci)=>`<td class="${ci===x?"tx":""}">${md(c)}</td>`).join("")}${sp?`<td>${t?sayBtn(t,L.lang):""}</td>`:""}</tr>`;}).join("")}</tbody></table></div>`;},
  rules:b=>`<ol class="rules">${arr(b.items).map((r,i)=>`<li><span class="n">${i+1}</span><div><b>${md(r.title)}</b>${r.text?`<p>${md(r.text)}</p>`:""}${r.ex&&r.ex.x?`<div class="ex"><span class="tx">${md(r.ex.x)}</span>${sayBtn(r.ex.x.replace(/\*\*/g,""),L.lang)}${r.ex.tr?`<span>= ${md(r.ex.tr)}</span>`:""}</div>`:""}</div></li>`).join("")}</ol>`,
  examples:b=>`<ul class="lines">${arr(b.items).map(e=>`<li>${sayBtn(String(e.x).replace(/\*\*/g,""),L.lang)}<div><div class="tx">${md(e.x)}</div>${e.ph?`<div class="ph">${md(e.ph)}</div>`:""}${e.tr?`<div class="tr">${md(e.tr)}</div>`:""}</div></li>`).join("")}</ul>`
};
function vAnlat(){const cards=L.d.anlat, pg=Math.min(L.page,cards.length-1), c=cards[pg];
  const dots=`<div class="lsub" aria-hidden="true">${cards.map((x,i)=>`<i class="${i<=pg?"on":""}"></i>`).join("")}</div>`;
  return `<section class="lcard" aria-labelledby="lh">${dots}<p class="lk">Anlat · ${pg+1} / ${cards.length}</p><h2 id="lh" data-focus tabindex="-1">${md(c.title||"")}</h2>${c.blocks.map(b=>BLOCK[b.type](b)).join("")}
   <div class="lnav"><button type="button" class="btn btn-ghost" data-act="aPrev" ${pg===0?"disabled":""}>Geri</button><button type="button" class="btn btn-primary" data-act="aNext">${pg<cards.length-1?"Devam":"Anlatım bitti → Dinle"}</button></div></section>`;}
function vDinle(){const lines=L.d.dinle;
  return `<section class="lcard"><h2 data-focus tabindex="-1">Dinle ve tekrar et</h2><p class="lead">Her cümleyi dinle, sonra yüksek sesle tekrar et.${L.lang==="it"?" Büyük harfli hece vurgulu okunur.":""}</p>
   <div class="lrow"><button type="button" class="btn btn-soft" data-act="playAll">${ICON("sesli")}Hepsini sırayla dinle</button><button type="button" class="btn btn-ghost" data-act="slow">Yavaş dinle</button></div>
   <ul class="lines">${lines.map(l=>`<li>${sayBtn(l.x,L.lang)}<div><div class="tx">${esc(l.x)}</div>${l.ph?`<div class="ph">${esc(l.ph)}</div>`:""}${l.tr?`<div class="tr">${esc(l.tr)}</div>`:""}</div></li>`).join("")}</ul>
   <div class="lnav"><button type="button" class="btn btn-ghost" data-act="toStep" data-to="0">Anlatıma dön</button><button type="button" class="btn btn-primary" data-act="finish" data-i="1">Tekrar ettim → Uygula</button></div></section>`;}
/* ortak soru görünümü: kind p (Uygula) · q (Yokla) · k (Pekiştir) */
function qView(item,st,total,kind){
  const head=`<div class="lmeter" aria-hidden="true"><i style="width:${Math.round(st.i/total*100)}%"></i></div><p class="lk">${kind==="q"?"Yoklama":kind==="k"?"Pekiştir":"Alıştırma"} ${st.i+1} / ${total}</p>`;
  const q=String(item.q).includes("___")?md(item.q).replace("___",'<span class="gap">&nbsp;</span>'):md(item.q);
  let input;
  if(item.t==="choice")input=`<div class="opts" role="group" aria-label="Seçenekler">${item.o.map(o=>`<button type="button" class="opt" data-ans="${esc(o)}" data-kind="${kind}">${esc(o)}</button>`).join("")}</div>`;
  else if(item.t==="order"){L.order=[]; input=`<div class="oBuilt" id="oBuilt" aria-live="polite"></div><div class="oPool" role="group" aria-label="Kelimeler">${item.words.map((w,i)=>`<button type="button" class="oW" data-ow="${i}">${esc(w)}</button>`).join("")}</div>
     <div class="lrow"><button type="button" class="btn btn-ghost btn-sm" data-act="oUndo">Geri al</button><button type="button" class="btn btn-primary" data-act="oCheck" data-kind="${kind}">Kontrol</button></div>`;}
  else input=`<form data-form="${kind}" class="lform"><label class="cc-vh" for="ans_${kind}">Cevabın</label><input type="text" class="lin" id="ans_${kind}" autocomplete="off" autocapitalize="off" spellcheck="false" lang="${L.lang}" placeholder="${LN[L.lang]} yaz"><button class="btn btn-primary" type="submit">Kontrol</button></form>${item.hint&&kind!=="q"?`<p class="lnote">İpucu: ${md(item.hint)}</p>`:""}`;
  return `${head}<p class="q" data-focus tabindex="-1">${q}</p>${input}<div id="fb_${kind}" aria-live="polite"></div>`;}
function feedback(kind,item,val,res){const box=$l("#fb_"+kind); let h;
  if(res==="ok")h=`<div class="fb ok"><b>Doğru.</b> ${md(item.ok||"")}</div>`;
  else if(res==="soft")h=`<div class="fb ok"><b>Doğru sayıldı.</b> ${item.soft_note?md(item.soft_note):`Doğru yazımı: <b>${esc(cap(ansOf(item)))}</b>.`}</div>`;
  else{const why=item.t==="choice"&&item.why&&item.why[val]?item.why[val]:(kind!=="q"?item.hint||"":""); h=`<div class="fb no"><b>Doğrusu: ${esc(ansOf(item))}</b>${why?"<br>"+md(why):""}</div>`;}
  h+=`<div class="lrow" style="margin-top:12px"><button type="button" class="btn btn-primary" data-act="next" data-kind="${kind}" data-focusnext>Sonraki</button>${res==="no"&&kind!=="q"?`<button type="button" class="btn btn-ghost" data-act="askWhy">${ICON("ask")}Koça neden diye sor</button>`:""}</div>`;
  box.innerHTML=h; L.lastQ={q:item.q,val,a:ansOf(item)};
  document.querySelectorAll("#lstage .opt").forEach(o=>{o.disabled=true; if(o.dataset.ans===ansOf(item))o.classList.add("right"); else if(o.dataset.ans===val)o.classList.add("wrong");});
  document.querySelectorAll("#lstage .lform input,#lstage .lform button,#lstage .oW,#lstage [data-act=oCheck],#lstage [data-act=oUndo]").forEach(x=>x.disabled=true);
  const b=box.querySelector("[data-focusnext]"); if(b)b.focus({preventScroll:true});}
function stOf(kind){return kind==="p"?L.pr:kind==="q"?L.qz:L.pk;}
function itemsOf(kind){return kind==="p"?L.d.uygula:kind==="q"?L.d.yokla:L.pk.items;}
function answer(kind,val){const st=stOf(kind), item=itemsOf(kind)[st.i]; if(!item||st.ans)return; st.ans=true; L.act=Date.now();
  const res=judge(item,val); if(res!=="no")st.score++; else if(kind==="q")st.miss.push(item.topic||"Genel tekrar");
  feedback(kind,item,val,res); if(kind==="p")save();}
function vUygula(){const st=L.pr, U=L.d.uygula, n=U.length;
  if(st.i>=n){const good=st.score>=Math.ceil(n*0.75);
    return `<section class="lcard ldone"><p class="lk">Alıştırma bitti</p><p class="lbig">${st.score} / ${n}</p><p class="lead">${good?"İyi gidiyorsun. Şimdi "+COACH[L.coach].name+" ile bu kalıpları konuşarak kullan.":"Yanlış yaptıklarını bir kez daha gözden geçir, sonra konuşmaya geç."}</p>
     <div class="lrow"><button type="button" class="btn btn-ghost" data-act="redoP">Alıştırmayı baştan yap</button><button type="button" class="btn btn-primary" data-act="finish" data-i="2">Konuşmaya geç</button></div></section>`;}
  return `<section class="lcard">${qView(U[st.i],st,n,"p")}</section>`;}
function vKonus(){const k=L.d.konus||{}, c=COACH[L.coach], s=L.konus;
  const lk=coachReady();
  return `<section class="lcard"><div class="lcoach"><span class="kav ${L.coach}" aria-hidden="true">${c.mono}</span><div><h2 data-focus tabindex="-1">${c.name} ile konuş</h2><p class="lead">Telefonla konuşur gibi: ${c.name} kısa sorular sorar, sen sesli cevap verirsin.</p></div></div>
   ${k.goal?`<p><b>Hedef:</b> ${md(k.goal)}</p>`:""}${arr(k.structures).length?`<ul class="lgoal">${k.structures.map(x=>`<li>${md(x)}</li>`).join("")}</ul>`:""}
   ${s?`<p class="fb ok"><b>Konuşma tamam · ${s.mins} dk.</b> ${s.fixes?s.fixes+" düzeltme, ":""}${s.phrases?s.phrases+" faydalı ifade.":""}</p>`:""}
   ${lk?`<p class="lnote">${esc(lk)} Bu adımı şimdilik atlayabilirsin.</p>`:""}
   <div class="lrow"><button type="button" class="btn ${s?"btn-soft":"btn-primary"}" data-act="call" ${lk?"disabled":""}>${ICON("speaking")}${s?"Yeniden konuş":"Aramayı başlat"}</button></div>
   <div class="lnav"><button type="button" class="btn btn-ghost" data-act="toStep" data-to="2">Alıştırmaya dön</button><button type="button" class="btn ${s||lk?"btn-primary":"btn-ghost"}" data-act="finish" data-i="3">Konuşmayı bitirdim → Yokla</button></div></section>`;}
function vYokla(){const st=L.qz, Q=L.d.yokla, n=Q.length, pass=+L.d.pass||Math.ceil(n*0.8);
  if(st.i>=n){const ok=st.score>=pass, miss=[...new Set(st.miss)], sm=L.sum, nx=ok&&C.lxNext?C.lxNext():null;
    if(ok)return `<section class="lcard ldone"><p class="lk">Ders tamam</p><p class="lbig">${st.score} / ${n}</p><p class="lead">Konu tamamlandı olarak işaretlendi; yarın kısa bir Pekiştir gelir.</p>
     <div class="lsum">${sm?`<span>${ICON("clock")} ${sm.mins} dk</span><span>${ICON("deck")} ${sm.words?sm.words+" kelime kartlara eklendi":"Kartlar zaten vardı"}</span>`:""}</div>
     ${sm&&sm.miss.length?`<p class="lk">Dikkat edeceğin konular</p><div class="ltopics">${sm.miss.map(m=>`<span>${esc(m)}</span>`).join("")}</div>`:""}
     <div class="lrow">${nx?`<button type="button" class="btn btn-primary" data-act="planNext">Sıradaki: ${esc(nx.label)}${ICON("arrow")}</button>`:""}<button type="button" class="btn ${nx?"btn-ghost":"btn-primary"}" data-act="close">${nx?"Kapat":"Bitir"}</button><button type="button" class="btn btn-ghost" data-act="redoQ">Yoklamayı tekrar et</button></div></section>`;
    return `<section class="lcard ldone"><p class="lk">Henüz değil</p><p class="lbig">${st.score} / ${n}</p>
     <p class="lead">Geçmek için ${n} sorudan en az ${pass} doğru olmalı. Tekrar bakman gereken konular:</p>
     ${miss.length?`<div class="ltopics">${miss.map(m=>`<span>${esc(m)}</span>`).join("")}</div>`:""}
     <div class="lrow"><button type="button" class="btn btn-ghost" data-act="toStep" data-to="0">Anlatıma dön</button><button type="button" class="btn btn-primary" data-act="redoQ">Yoklamayı tekrar et</button></div></section>`;}
  return `<section class="lcard">${qView(Q[st.i],st,n,"q")}</section>`;}
function vPk(){const st=L.pk, P=st.items, n=P.length;
  if(st.i>=n)return `<section class="lcard ldone"><p class="lk">Sorular bitti</p><p class="lbig">${st.score} / ${n}</p><p class="lead">Şimdi kısa bir konuşma: ${esc(COACH[L.coach].name)} seninle aynı kalıpları kullanır.</p>
    <div class="lrow"><button type="button" class="btn btn-primary" data-act="pkTalk">Konuşmaya geç</button></div></section>`;
  return `<section class="lcard">${qView(P[st.i],st,n,"k")}</section>`;}
function vPkTalk(){const c=COACH[L.coach], lk=coachReady(), s=L.konus;
  return `<section class="lcard"><div class="lcoach"><span class="kav ${L.coach}" aria-hidden="true">${c.mono}</span><div><h2 data-focus tabindex="-1">Kısa konuşma</h2><p class="lead">${md(L.d.pekistir.konus_prompt||"Dünkü kalıplarla 3–4 dakika konuş.")}</p></div></div>
   ${s?`<p class="fb ok"><b>Konuşma tamam · ${s.mins} dk.</b></p>`:""}${lk?`<p class="lnote">${esc(lk)}</p>`:""}
   <div class="lrow"><button type="button" class="btn ${s?"btn-soft":"btn-primary"}" data-act="call" ${lk?"disabled":""}>${ICON("speaking")}${s?"Yeniden konuş":"Aramayı başlat"}</button></div>
   <div class="lnav"><button type="button" class="btn btn-ghost" data-act="full">Dersi baştan aç</button><button type="button" class="btn btn-primary" data-act="pkDone">Pekiştirmeyi bitir</button></div></section>`;}
/* ---- geçti / pekiştir kaydı ---- */
function minsNow(){tick(); return Math.max(1,Math.round(L.ms/60000));}
/* dersin kelimeleri karta: Dinle cümleleri (x → tr) + konuşma kelimelerinden Türkçesi derste geçenler; aynısı varsa atlanır, yarın ilk tekrar */
function lessonCards(){const d=L.d, out=[], seen=new Set(), clean=x=>String(x||"").replace(/\*\*/g,"").trim();
  const ex={}; arr(d.anlat).forEach(c=>arr(c.blocks).forEach(b=>{if(b.type==="examples")arr(b.items).forEach(e=>{if(e.x&&e.tr)ex[norm(clean(e.x))]=clean(e.tr);});}));
  arr(d.konus&&d.konus.vocab).forEach(v=>{const t=ex[norm(v)]; if(t)out.push({f:clean(v),tr:t});});
  arr(d.dinle).forEach(l=>{if(l.x&&l.tr)out.push({f:clean(l.x),tr:clean(l.tr),ex:l.ph?clean(l.ph):""});});
  return out.filter(w=>{const k=w.f.toLowerCase(); if(seen.has(k))return false; seen.add(k); return true;});}
async function addCards(){const db=C.db; if(!db)return 0; const lang=L.lang, due=C.addDays(today(),1), now=new Date().toISOString(); let n=0;
  for(const w of lessonCards()){if(C.S.cards.some(c=>c.lang===lang&&String(c.f||"").toLowerCase()===w.f.toLowerCase()))continue;
    try{await db.collection("cards").add({lang,f:w.f.slice(0,120),tr:w.tr.slice(0,160),ex:(w.ex||"").slice(0,240),box:1,due,added:now,src:"lesson:"+L.id}); n++;}catch(e){}}
  return n;}
function missAll(){return [...new Set(arr(progDoc().miss).concat(L.qz.miss))].slice(0,10);}
async function lessonSession(extra){const t=today(), m=minsNow(), lang=L.lang;
  const mins=lang==="it"?{gramer:Math.ceil(m*0.7),okuma:m-Math.ceil(m*0.7)}:{gramer:m};
  try{await C.upsertSession("lesson-"+t+"-"+L.id,Object.assign({date:t,lang,mins,total:m,topic:C.topicById(L.id)?L.id:"",mistakes:missAll().map(x=>x+" ("+L.d.title+")"),note:"",next:"",created:new Date().toISOString(),words:0,src:"lesson"},extra||{}));}catch(e){}
  return m;}
async function passLesson(){const t=today(), p=progDoc(), db=C.db, lang=L.lang, first=!p.passed;
  await save({passed:true,passedAt:p.passed?p.passedAt:t,best:Math.max(+p.best||0,L.qz.score),last:L.qz.score,attempts:(+p.attempts||0)+1,miss:missAll()});
  if(!db)return;
  try{if(C.topicById(L.id))await C.setTopic(L.id,"done");}catch(e){}
  const words=first?await addCards():0;
  const m=await lessonSession({note:"Ders geçildi: "+L.d.title+" ("+L.qz.score+"/"+L.d.yokla.length+")",words});
  C.lxFin(lang,lang==="it"?["kelime","gramer","okuma","sesli"]:["kelime","gramer","okuma"]);
  L.sum={mins:m,words,miss:missAll()};}
async function failLesson(){const p=progDoc(); await save({best:Math.max(+p.best||0,L.qz.score),last:L.qz.score,attempts:(+p.attempts||0)+1,miss:missAll()}); await lessonSession({note:"Yoklama: "+L.d.title+" ("+L.qz.score+"/"+L.d.yokla.length+")"});}
async function pkDone(){const t=today(), m=minsNow(); await save({pk:t});
  if(L.week){for(const id of L.week){if(id===L.id)continue; const p=C.lxP(id), rec=Object.assign({},p,{pk:t,updated:new Date().toISOString()}); C.LX.prog[id]=rec; try{await C.db.collection("lessons").doc(id).set(rec);}catch(e){}}}
  try{await C.upsertSession("pekistir-"+t+"-"+L.id,{date:t,lang:L.lang,mins:{gramer:m},total:m,topic:C.topicById(L.id)?L.id:"",mistakes:[],note:"Pekiştir: "+L.d.title,next:"",created:new Date().toISOString(),words:0,src:"lesson"});}catch(e){}
  close();}
/* ---- olaylar ---- */
async function onClick(e){const b=e.target.closest("button"); if(!b||b.disabled)return; L.act=Date.now();
  if(b.dataset.say!==undefined){const on=b.classList.contains("on"); ttsStop(); if(on)return; b.classList.add("on"); speak([b.dataset.say],b.dataset.sl||L.lang).then(()=>b.classList.remove("on")); return;}
  if(b.dataset.step){go(+b.dataset.step); return;}
  if(b.dataset.ans!==undefined){answer(b.dataset.kind,b.dataset.ans); return;}
  if(b.dataset.ow!==undefined){const i=+b.dataset.ow; if(L.order.includes(i))return; L.order.push(i); paintOrder(); return;}
  if(b.dataset.ob!==undefined){L.order=L.order.filter(x=>x!==+b.dataset.ob); paintOrder(); return;}
  const a=b.dataset.act;
  if(b.id==="lsnX"||a==="close"){close(); return;}
  if(b.id==="askFab"){openAsk(); return;} if(b.id==="askX"){closeAsk(); return;}
  if(a==="aNext"){if(L.page<L.d.anlat.length-1){L.page++; render(); $l("#lstage").scrollIntoView({block:"start"});} else finish(0); return;}
  if(a==="aPrev"){L.page=Math.max(0,L.page-1); render(); return;}
  if(a==="finish"){finish(+b.dataset.i); return;}
  if(a==="toStep"){go(+b.dataset.to); return;}
  if(a==="playAll"||a==="slow"){speak(L.d.dinle.map(l=>l.x),L.lang,{rate:a==="slow"?C.rate()*0.72:C.rate()}); return;}
  if(a==="oUndo"){L.order.pop(); paintOrder(); return;}
  if(a==="oCheck"){const kind=b.dataset.kind, item=itemsOf(kind)[stOf(kind).i]; if(!L.order.length)return; answer(kind,L.order.map(i=>item.words[i]).join(" ")); return;}
  if(a==="next"){const kind=b.dataset.kind, st=stOf(kind); st.i++; st.ans=false;
    if(kind==="q"&&st.i>=L.d.yokla.length){if(st.score>=(+L.d.pass||Math.ceil(L.d.yokla.length*0.8))){L.done[4]=true; await passLesson();} else await failLesson();}
    if(kind==="p")save(); render(); return;}
  if(a==="redoP"){L.pr={i:0,score:0,ans:false}; save(); render(); return;}
  if(a==="redoQ"){L.qz={i:0,score:0,ans:false,miss:[]}; render(); return;}
  if(a==="askWhy"){const q=L.lastQ||{}; openAsk("Bu soruda neden yanlış yaptım? Soru: "+String(q.q||"").replace(/\*\*/g,"")+" · Benim cevabım: "+(q.val||"")+" · Doğrusu: "+(q.a||"")); return;}
  if(a==="call"){startCall(); return;}
  if(a==="pkTalk"){L.pk.talk=true; L.konus=null; render(); return;}
  if(a==="pkDone"){pkDone(); return;}
  if(a==="planNext"){close(); setTimeout(()=>C.lxGo(),0); return;}
  if(a==="full"){L.pk=null; L.step=0; L.page=0; render(); return;}}
function paintOrder(){const kind=(document.querySelector("#lstage [data-act=oCheck]")||{dataset:{}}).dataset.kind; if(!kind)return; const item=itemsOf(kind)[stOf(kind).i];
  $l("#oBuilt").innerHTML=L.order.map(i=>`<button type="button" class="oW" data-ob="${i}" aria-label="Çıkar: ${esc(item.words[i])}">${esc(item.words[i])}</button>`).join("");
  document.querySelectorAll("#lstage .oPool .oW").forEach(w=>w.disabled=L.order.includes(+w.dataset.ow));}
function onSubmit(e){e.preventDefault(); const f=e.target; L.act=Date.now();
  if(f.dataset.form){const kind=f.dataset.form, v=f.querySelector("input").value; if(!v.trim())return; answer(kind,v); return;}
  if(f.id==="askForm"){const t=$l("#askIn"), v=t.value.trim(); if(!v)return; t.value=""; askSend(v);}}
function onKey(e){if(e.key==="Enter"&&!e.shiftKey&&e.target.id==="askIn"){e.preventDefault(); e.target.form.requestSubmit();}
  if(e.key==="Escape"){if(K.call)return; e.preventDefault(); if(!$l("#ask").hidden)closeAsk(); else close();}}
/* ---- Konuş adımı: arama ekranı (konus.js) ---- */
function startCall(){const k=L.d.konus||{}; ttsStop(); tick();
  kCall({coach:L.coach,lessonId:L.id,lessonTitle:L.d.title,topic:L.pk?(L.d.pekistir.konus_prompt||k.goal):(k.goal||L.d.title),goal:k.goal,vocab:arr(k.vocab),structures:arr(k.structures),opener:k.opener_hint,level:k.level_note,
    onEnd:r=>{L.act=Date.now(); if(r&&r.turns){L.konus={mins:r.mins,fixes:r.fixes,phrases:r.phrases}; if(!L.pk){L.done[3]=true; save();}} if(L.open)render();}});}
/* ---- Koça sor ---- */
function ctxName(){const k=L.pk?(L.pk.talk?"Pekiştir · konuşma":"Pekiştir · soru "+(L.pk.i+1)):STEPS[L.step][1]; if(L.pk)return k;
  if(L.step===0)return k+" · kart "+(Math.min(L.page,L.d.anlat.length-1)+1)+"/"+L.d.anlat.length; if(L.step===2&&L.pr.i<L.d.uygula.length)return k+" · alıştırma "+(L.pr.i+1); if(L.step===4&&L.qz.i<L.d.yokla.length)return k+" · soru "+(L.qz.i+1); return k;}
function askRules(){const c=COACH[L.lang], quiz=!L.pk&&L.step===4&&L.qz.i<L.d.yokla.length;
  return `=== AJAN: ${c.name.toUpperCase()} — KOÇA SOR (ders içi) ===
Sen ${c.name}'sın, Türk bir yetişkine (Türab) ${LN[L.lang]} öğreten öğretmen. Öğrenci "${L.d.title}" dersinde (kod ${L.id}) bir şeye takıldı.
Kısa, net, Türkçe cevap ver (en fazla 4 cümle). Gerekirse 1–2 ${LN[L.lang]} örnek ver, yanına Türkçesini yaz. Dersin konusunun dışına çıkma; ileri konu sorulursa "ilerideki derste" de, tek cümleyle söyle.
Yoklama (Yokla) sorularının cevabını ASLA verme; yalnızca kuralı hatırlatan bir ipucu ver.${quiz?" ŞU AN YOKLAMA AÇIK: cevabı söyleme, harfini/kelimesini verme.":""} Markdown, tablo, emoji kullanma.
Öğrenci şu an: ${ctxName()}.
Ekranda gördüğü:
${(($l("#lstage")||{}).innerText||"").replace(/\n{2,}/g,"\n").slice(0,1500)}`;}
/* koç metni: yalnızca **kalın** ve [[it: …]]/[[en: …]] (hoparlörlü); başka işaret yok */
function rich(t){const parts=[]; let s=String(t||"").replace(/\[\[(it|en|tr):\s*([^\]]*?)\s*\]\]/g,(m,l,x)=>{parts.push([l,x]); return "\u0001"+(parts.length-1)+"\u0002";});
  s=esc(s).replace(/\*\*([^*\n]+?)\*\*/g,"<b>$1</b>").replace(/\*/g,"").replace(/^#+\s*/gm,"");
  return s.replace(/\u0001(\d+)\u0002/g,(m,i)=>{const [l,x]=parts[+i]; return `<b class="tx" lang="${l}">${esc(x)}</b>${l!=="tr"?" "+sayBtn(x,l):""}`;});}
function bubble(log,cls,text){const d=document.createElement("div"); d.className="m "+cls; d.textContent=text; log.appendChild(d); log.scrollTop=log.scrollHeight; return d;}
function openAsk(prefill){const p=$l("#ask"); p.hidden=false; const f=$l("#askFab"); f.hidden=true; f.setAttribute("aria-expanded","true"); $l("#askCtx").textContent="Şu an: "+ctxName();
  const i=$l("#askIn"); if(prefill)i.value=prefill; i.focus();}
function closeAsk(quiet){const p=document.querySelector("#lsn #ask"); if(!p||p.hidden)return; p.hidden=true; const f=$l("#askFab"); f.hidden=false; f.setAttribute("aria-expanded","false"); if(!quiet)f.focus();}
async function askSend(q){const log=$l("#askLog"); bubble(log,"u",q); const why=coachReady(); if(why){bubble(log,"sys",why); return;}
  if(L.askBusy)return; L.askBusy=true; L.ask.push({role:"user",content:q}); const b=bubble(log,"c",COACH[L.lang].name+" düşünüyor…"); $l("#askSend").disabled=true;
  try{const r=await C.sample()([{role:"user",content:askRules()},...L.ask.slice(-8)],{onText:({text})=>{b.innerHTML=rich(text); log.scrollTop=log.scrollHeight;}});
    b.innerHTML=rich(r.text||"…"); L.ask.push({role:"assistant",content:r.text||"…"});}
  catch(e){b.textContent=(e&&e.text)||coachErr(e)||"Yanıt gelmedi."; L.ask.pop();}
  finally{L.askBusy=false; const s=$l("#askSend"); if(s)s.disabled=false;}}
