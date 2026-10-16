/* ---------- TELEFONA KUR (PWA kurulumu) ----------
   beforeinstallprompt yakalanır → Öğren kapağının altında kompakt kart (#instCard) + Ayarlar'da satır (#instRow): "Kur" → tarayıcı kurulum penceresi.
   appinstalled → kart gizlenir, Ayarlar satırı "Kuruldu ✓" olur. Zaten tam ekranda (standalone) ya da kurulduysa hiçbiri görünmez.
   iOS Safari (beforeinstallprompt yok): 2 adımlı ipucu "Paylaş → Ana Ekrana Ekle". Masaüstü Chrome: aynı pencere, etiket "Bilgisayara kur".
   Cihaz anahtarları: "tydil-inst-done" (kuruldu) · "tydil-inst-later" (Öğren kartı ertelendi, ms) */
const INST={deferred:null,installed:false,later:0};
const INST_LATER_MS=14*86400000;
const instLs=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const instLsSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
function instStandalone(){try{return navigator.standalone===true||matchMedia("(display-mode: standalone)").matches||matchMedia("(display-mode: fullscreen)").matches||matchMedia("(display-mode: minimal-ui)").matches;}catch(e){return false;}}
function instIOS(){const ua=navigator.userAgent||"", pf=navigator.platform||""; return /iP(hone|ad|od)/.test(ua)||(pf==="MacIntel"&&(navigator.maxTouchPoints||0)>1&&!/Chrome|CriOS|FxiOS/.test(ua)&&/Safari/.test(ua));}
function instDesktop(){return !/Android|iP(hone|ad|od)|Mobile|Tablet/i.test(navigator.userAgent||"");}
const INST_SVG={share:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5V4M8 8l4-4 4 4"/><path d="M6 11.5v6A2.5 2.5 0 0 0 8.5 20h7a2.5 2.5 0 0 0 2.5-2.5v-6"/></svg>',
  plusbox:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
  phone:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
  laptop:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2.5 19h19"/></svg>'};
/* Durum: "no" (gösterilmez) · "prompt" (Kur düğmesi) · "ios" (2 adım) · "done" (Kuruldu ✓, yalnızca Ayarlar) */
function instState(){
  if(INST.installed||instLs("tydil-inst-done")==="1") return instStandalone()?"no":"done";
  if(instStandalone()) return "no";
  if(INST.deferred) return "prompt";
  if(instIOS()) return "ios";
  return "no";
}
function instLabel(){return instDesktop()?"Bilgisayara kur":"Telefona kur";}
/* Bir kez "Sonra" denince Bugün ekranında bir daha çıkmaz (Ayarlar satırı kalır) */
function instLaterOn(){return +(instLs("tydil-inst-later")||0)>0;}
function renderInstall(){
  const st=instState(), card=$("#instCard"), row=$("#instRow"), desk=instDesktop(), label=instLabel();
  const ico=desk?INST_SVG.laptop:INST_SVG.phone;
  /* Öğren kartı: kur/iOS; ertelendiyse ya da kurulduysa yok */
  if(card){const show=(st==="prompt"||st==="ios")&&!instLaterOn();
    card.hidden=!show;
    if(show){const html=st==="prompt"
      ?`<div class="instHd"><span class="instIco" aria-hidden="true">${ico}</span><div><h3 id="instT">${esc(label)}</h3><p>${desk?"Kendi penceresinde, sekmeler olmadan açılır.":"Ana ekrana simge ekler, tam ekran açılır. Çevrimdışı da çalışır."}</p></div></div>
        <div class="instAct"><button type="button" class="btn btn-primary btn-sm" data-inst="go">${ico}Kur</button><button type="button" class="btn btn-ghost btn-sm" data-inst="later">Şimdi değil</button></div>`
      :`<div class="instHd"><span class="instIco" aria-hidden="true">${ico}</span><div><h3 id="instT">Telefona kur</h3><p>Safari'de iki adım: ana ekrana simge ekler, tam ekran açılır.</p></div></div>
        <ol class="instSteps"><li><span class="instN">1</span>${INST_SVG.share}<span>Alttaki <b>Paylaş</b> düğmesine bas</span></li><li><span class="instN">2</span>${INST_SVG.plusbox}<span><b>Ana Ekrana Ekle</b>'yi seç</span></li></ol>
        <div class="instAct"><button type="button" class="btn btn-ghost btn-sm" data-inst="later">Tamam, gördüm</button></div>`;
      if(card.dataset.sig!==html){card.dataset.sig=html; card.innerHTML=html;}}
    else {card.innerHTML=""; card.dataset.sig="";}}
  /* Ayarlar satırı: kur / iOS adımları / Kuruldu ✓ */
  if(row){row.hidden=st==="no";
    if(st!=="no"){const html=st==="done"
      ?`<div class="instRowIn"><span class="instIco ok" aria-hidden="true">${ICON("check")}</span><div><h2 id="instRowT">${esc(label)}</h2><p class="lead">Kuruldu ✓ · Ana ekrandaki TY Dil simgesinden aç.</p></div></div>`
      :st==="prompt"
      ?`<div class="instRowIn"><span class="instIco" aria-hidden="true">${ico}</span><div><h2 id="instRowT">${esc(label)}</h2><p class="lead">${desk?"Kendi penceresinde açılır; başlat menüsüne/dock'a simge gelir.":"Ana ekrana simge ekler, tam ekran açılır."}</p></div><button type="button" class="btn btn-primary" data-inst="go">${ico}Kur</button></div>`
      :`<div class="instRowIn"><span class="instIco" aria-hidden="true">${ico}</span><div><h2 id="instRowT">Telefona kur</h2><p class="lead">Safari'de: ${INST_SVG.share} <b>Paylaş</b> → ${INST_SVG.plusbox} <b>Ana Ekrana Ekle</b>. Ana ekrana simge ekler, tam ekran açılır.</p></div></div>`;
      if(row.dataset.sig!==html){row.dataset.sig=html; row.innerHTML=html;}}
    else {row.innerHTML=""; row.dataset.sig="";}}
}
async function instGo(btn){const d=INST.deferred; if(!d)return; if(btn){btn.disabled=true;}
  try{ const fn=d["prompt"]; if(typeof fn==="function") await fn.call(d); const ch=d.userChoice?await d.userChoice:null;
    if(ch&&ch.outcome==="accepted"){INST.deferred=null;} else if(btn){btn.disabled=false;} }
  catch(e){ if(btn)btn.disabled=false; }
  renderInstall();}
window.addEventListener("beforeinstallprompt",e=>{try{e.preventDefault();}catch(x){} INST.deferred=e; renderInstall();});
window.addEventListener("appinstalled",()=>{INST.installed=true; INST.deferred=null; instLsSet("tydil-inst-done","1"); renderInstall();});
try{matchMedia("(display-mode: standalone)").addEventListener("change",renderInstall);}catch(e){}
document.addEventListener("click",e=>{const b=e.target.closest("[data-inst]"); if(!b)return;
  if(b.dataset.inst==="go"){instGo(b);return;}
  if(b.dataset.inst==="later"){instLsSet("tydil-inst-later",String(Date.now())); renderInstall(); return;}});
renderInstall();
window.TYINST={state:instState,render:renderInstall,get deferred(){return INST.deferred;}};
