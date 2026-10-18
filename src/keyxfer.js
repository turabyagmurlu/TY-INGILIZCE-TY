/* ---------- ANAHTAR (+ SENKRON) AKTARIMI (QR) ----------
   Bilgisayar: Ayarlar → "Başka cihaza aktar (QR)" → adres + "#k=<anahtar>" QR olarak gösterilir (90 sn sonra kendiliğinden kapanır).
   Senkron bağlıysa adres "#k=<anahtar>&s=<GitHub token>&g=<gist>" olur: tek okutma = koçlar + senkron + ilerleme (window.TYSYNCIMPORT).
   Telefon: kamerayla okutunca uygulama açılır; rt.js anahtarı kaydedip adresi temizler (window.TYKEYIMPORT), burada bildirim gösterilir.
   Anahtar sunucuya gitmez: "#" sonrası tarayıcıda kalır. */
const KX={timer:0,left:0};
function kxUrl(){const k=TYRT.getKey(); let base=""; try{base=location.origin+location.pathname;}catch(e){base="https://turabyagmurlu.github.io/TY-INGILIZCE-TY/";}
  if(!/^https?:/.test(base)) base="https://turabyagmurlu.github.io/TY-INGILIZCE-TY/";
  const sy=typeof syncConnected==="function"&&syncConnected(); const gm=TYRT.getGem?TYRT.getGem():""; return base+"#k="+k+(sy?"&s="+syToken()+"&g="+syGist():"")+(gm?"&gm="+gm:"");}
/* Uzun adreste (anahtar + token) modüller küçülmesin diye hata düzeltme L */
function kxSvg(text){const q=window.TYQR(text,text.length>200?"L":"M"), n=q.n, pad=4, N=n+pad*2; let d="";
  for(let r=0;r<n;r++) for(let c=0;c<n;c++) if(q.dark(r,c)) d+=`M${c+pad} ${r+pad}h1v1h-1z`;
  return `<svg class="kxQr" viewBox="0 0 ${N} ${N}" role="img" aria-label="Anahtar aktarım QR kodu" shape-rendering="crispEdges"><rect width="${N}" height="${N}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;}
function kxClose(){clearInterval(KX.timer); KX.timer=0; const b=$("#kxBox"), t=$("#btnKx"); if(b){b.hidden=true; b.innerHTML="";} if(t){t.setAttribute("aria-expanded","false"); t.textContent="Başka cihaza aktar (QR)";}}
/* QR üretici ilk kullanımda yüklenir (vendor/tyqr.js; sw.js önbelleğe alır) */
function kxLoadQR(){if(window.TYQR)return Promise.resolve(); return new Promise((res,rej)=>{const s=document.createElement("script"); s.src="vendor/tyqr.js"; s.onload=()=>window.TYQR?res():rej(new Error("tyqr")); s.onerror=()=>rej(new Error("tyqr")); document.head.appendChild(s);});}
async function kxOpen(){const b=$("#kxBox"), t=$("#btnKx"); if(!b||!TYRT.hasKey())return;
  try{await kxLoadQR();}catch(e){msg($("#keyMsg"),"err","QR üretici yüklenemedi. İnterneti kontrol edip tekrar dene."); return;}
  let svg=""; try{svg=kxSvg(kxUrl());}catch(e){msg($("#keyMsg"),"err","QR oluşturulamadı."); return;}
  KX.left=90; const sy=typeof syncConnected==="function"&&syncConnected();
  b.innerHTML=`<div class="kxIn">${svg}<div class="kxTxt"><b>Telefon ya da tabletin kamerasıyla okut</b>
    <ol><li>Kamerayı aç, QR'a tut, çıkan bağlantıya dokun.</li><li>Uygulama açılır, anahtar kendiliğinden kaydedilir ve doğrulanır${sy?"; senkron bağlanır, ilerleme iner":""}.</li><li>Sonra "Telefona kur" ile ana ekrana ekle.</li></ol>
    <p class="hint">Bu QR anahtarının${sy?" ve GitHub token'ının":""} kendisi: sadece kendi cihazlarınla okut, ekran görüntüsü alma. iPhone/iPad'de ana ekrandaki uygulamayı aç ve oradaki "QR okut" düğmesiyle okut (telefonun kendi kamerası bağlantıyı Safari'de açar).</p>
    <p class="kxLeft" id="kxLeft" aria-live="polite">${KX.left} sn sonra kapanır</p></div></div>`;
  b.hidden=false; if(t){t.setAttribute("aria-expanded","true"); t.textContent="QR'ı kapat";}
  clearInterval(KX.timer); KX.timer=setInterval(()=>{KX.left--; const l=$("#kxLeft"); if(KX.left<=0||!l){kxClose();return;} l.textContent=KX.left+" sn sonra kapanır";},1000);}
function kxRender(){const r=$("#kxRow"); if(!r)return; const ok=TYRT.hasKey()&&(!TYRT.keyStatus||TYRT.keyStatus()!=="bad"); r.hidden=!ok; if(!ok) kxClose();}
/* Telefonda: QR ile açıldıysa bildirim */
function kxToast(kind,text){let el=$("#kxToast"); if(!el){el=document.createElement("div"); el.id="kxToast"; el.setAttribute("role","status"); document.body.appendChild(el);}
  el.className="kxToast "+kind; el.innerHTML=`<span>${esc(text)}</span><button type="button" class="kxX" aria-label="Kapat">×</button>`; el.hidden=false;
  clearTimeout(kxToast._t); if(kind!=="pend") kxToast._t=setTimeout(()=>{el.hidden=true;},kind==="ok"?6000:12000);}
const KXS={sync:window.TYSYNCIMPORT==="ok",keyOk:false,syncDone:false};
if(window.TYKEYIMPORT==="ok") kxToast("pend",KXS.sync?"Anahtar ve senkron aktarıldı · doğrulanıyor…":"Anahtar telefona aktarıldı · doğrulanıyor…");
else if(window.TYKEYIMPORT==="bad") kxToast("err","QR'daki anahtar okunamadı. Bilgisayarda QR'ı yeniden aç ya da anahtarı Ayarlar'a yapıştır.");
document.addEventListener("tydil:key",e=>{const d=e&&e.detail||{}; kxRender();
  if(window.TYKEYIMPORT==="ok"&&d.status&&d.status!=="pending"){window.TYKEYIMPORT="done";
    if(d.status==="ok"&&KXS.sync){KXS.keyOk=true; KXS.syncDone?(KXS.syncOk?kxToast("ok","Bağlandı ✓ Koçlar açık · İlerleme indirildi ✓"):kxToast("err","Bağlandı ✓ Koçlar açık · ilerleme indirilemedi: "+KXS.syncText)):kxToast("pend","Bağlandı ✓ Koçlar açık · ilerleme indiriliyor…");}
    else if(d.status==="ok") kxToast("ok","Bağlandı ✓ Koçlar bu cihazda açık."+(window.TYGEMIMPORT==="ok"?" Canlı ses de açık.":""));
    else kxToast("err","Anahtar aktarıldı ama doğrulanamadı: "+(typeof keyErrText==="function"?keyErrText(d.error):"bağlantı hatası")+"");}});
/* QR ile senkron da geldiyse: ilk senkron sonucu */
document.addEventListener("tydil:sync",e=>{const d=e&&e.detail||{}; if(!KXS.sync||KXS.syncDone) return; KXS.syncDone=true; KXS.syncOk=!!d.ok; KXS.syncText=d.text||"bağlantı hatası";
  if(!d.ok){kxToast("err","İlerleme indirilemedi: "+(d.text||"bağlantı hatası")+" Ayarlar → Cihazlar arası senkron."); return;}
  if(KXS.keyOk||window.TYKEYIMPORT!=="ok") kxToast("ok","İlerleme indirildi ✓");});
document.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b)return;
  if(b.id==="btnKx"){$("#kxBox").hidden?kxOpen():kxClose(); return;}
  if(b.classList.contains("kxX")){const t=$("#kxToast"); if(t) t.hidden=true; return;}});
document.addEventListener("visibilitychange",()=>{if(document.hidden) kxClose();});
kxRender();
/* ---------- UYGULAMA İÇİ QR OKUYUCU ----------
   iPhone/iPad'de ana ekran uygulaması Safari'den ayrı saklar: kamerayla okutulan bağlantı Safari'de açılır, anahtar uygulamaya gelmez.
   Çözüm: "QR okut" düğmesi kamerayı uygulamanın içinde açar, bilgisayardaki QR'ı okur (vendor/jsqr.js, Apache-2.0, ilk kullanımda yüklenir). */
const KXC={on:false,stream:null,raf:0};
const kxCamOk=()=>!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
function kxLoadJsQR(){if(window.jsQR) return Promise.resolve(); return new Promise((res,rej)=>{const s=document.createElement("script"); s.src="vendor/jsqr.js"; s.onload=()=>window.jsQR?res():rej(new Error("jsqr")); s.onerror=()=>rej(new Error("jsqr")); document.head.appendChild(s);});}
function kxScanStop(){KXC.on=false; cancelAnimationFrame(KXC.raf); if(KXC.stream){KXC.stream.getTracks().forEach(t=>{try{t.stop();}catch(e){}});} KXC.stream=null; const o=$("#kxScan"); if(o) o.remove();}
function kxScanMsg(t,kind){const m=$("#kxScanMsg"); if(m){m.textContent=t; m.className="kxScanMsg "+(kind||"");}}
async function kxScan(){ if(KXC.on) return; if(!kxCamOk()){kxToast("err","Bu cihazda kamera açılamıyor. Anahtarı Ayarlar'a yapıştır."); return;}
  KXC.on=true; const o=document.createElement("div"); o.id="kxScan"; o.className="kxScan"; o.setAttribute("role","dialog"); o.setAttribute("aria-modal","true"); o.setAttribute("aria-label","QR okut");
  o.innerHTML=`<div class="kxScanBox"><video id="kxVid" playsinline muted autoplay></video><span class="kxFrame" aria-hidden="true"></span></div>
    <p class="kxScanMsg" id="kxScanMsg">Bilgisayarda Ayarlar → "Başka cihaza aktar (QR)" aç, kamerayı QR'a tut.</p>
    <button type="button" class="btn btn-ghost kxScanX" id="kxScanX">İptal</button>`;
  document.body.appendChild(o); const btn=$("#kxScanX"); if(btn) btn.focus();
  try{ await kxLoadJsQR(); }catch(e){kxScanMsg("QR okuyucu yüklenemedi. İnterneti kontrol edip tekrar dene.","err"); return;}
  try{ KXC.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false}); }
  catch(e){kxScanMsg(e&&e.name==="NotAllowedError"?"Kamera izni verilmedi. Cihaz ayarlarından bu uygulamaya kamera izni ver ya da anahtarı Ayarlar'a yapıştır.":"Kamera açılamadı. Anahtarı Ayarlar'a yapıştırabilirsin.","err"); return;}
  if(!KXC.on){kxScanStop(); return;}
  const v=$("#kxVid"); v.srcObject=KXC.stream; try{await v.play();}catch(e){}
  const c=document.createElement("canvas"), ctx=c.getContext("2d",{willReadFrequently:true}); let last=0, warned=0;
  const tick=t=>{ if(!KXC.on) return; KXC.raf=requestAnimationFrame(tick); if(t-last<120||!v.videoWidth) return; last=t;
    const sc=Math.min(1,720/Math.max(v.videoWidth,v.videoHeight)); c.width=Math.round(v.videoWidth*sc); c.height=Math.round(v.videoHeight*sc);
    ctx.drawImage(v,0,0,c.width,c.height); let r=null; try{r=window.jsQR(ctx.getImageData(0,0,c.width,c.height).data,c.width,c.height,{inversionAttempts:"dontInvert"});}catch(e){r=null;}
    if(!r||!r.data) return;
    if(r.data.indexOf("#k=")<0){ if(t-warned>2500){warned=t; kxScanMsg("Bu TY Dil QR'ı değil. Bilgisayardaki \"Başka cihaza aktar\" QR'ını okut.","err");} return; }
    const syncIn=/&s=/.test(r.data); KXS.sync=syncIn; KXS.syncDone=false; KXS.keyOk=false;
    const res=TYRT.applyTransfer(r.data); kxScanStop();
    if(res.key!=="ok"){kxToast("err","QR'daki anahtar okunamadı. Bilgisayarda QR'ı yeniden aç."); return;}
    kxToast("pend",res.sync?"Anahtar ve senkron alındı · doğrulanıyor…":"Anahtar alındı · doğrulanıyor…");
    if(res.sync&&typeof syncRun==="function"){try{syncRun("qr");}catch(e){}} };
  KXC.raf=requestAnimationFrame(tick); }
document.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b)return;
  if(b.dataset.go==="scan"||b.id==="btnScan"){e.preventDefault(); kxScan(); return;}
  if(b.id==="kxScanX"){kxScanStop(); return;}});
document.addEventListener("keydown",e=>{if(KXC.on&&e.key==="Escape"){e.preventDefault(); e.stopPropagation(); kxScanStop();}},true);
document.addEventListener("visibilitychange",()=>{if(document.hidden&&KXC.on) kxScanStop();});
{const sr=$("#scanRow"); if(sr) sr.hidden=!kxCamOk();}
