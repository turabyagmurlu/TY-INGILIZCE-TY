/* ---------- ANAHTAR AKTARIMI (QR) ----------
   Bilgisayar: Ayarlar → "Telefona aktar (QR)" → adres + "#k=<anahtar>" QR olarak gösterilir (90 sn sonra kendiliğinden kapanır).
   Telefon: kamerayla okutunca uygulama açılır; rt.js anahtarı kaydedip adresi temizler (window.TYKEYIMPORT), burada bildirim gösterilir.
   Anahtar sunucuya gitmez: "#" sonrası tarayıcıda kalır. */
const KX={timer:0,left:0};
function kxUrl(){const k=TYRT.getKey(); let base=""; try{base=location.origin+location.pathname;}catch(e){base="https://turabyagmurlu.github.io/TY-INGILIZCE-TY/";}
  if(!/^https?:/.test(base)) base="https://turabyagmurlu.github.io/TY-INGILIZCE-TY/"; return base+"#k="+k;}
function kxSvg(text){const q=TYQR(text,"M"), n=q.n, pad=4, N=n+pad*2; let d="";
  for(let r=0;r<n;r++) for(let c=0;c<n;c++) if(q.dark(r,c)) d+=`M${c+pad} ${r+pad}h1v1h-1z`;
  return `<svg class="kxQr" viewBox="0 0 ${N} ${N}" role="img" aria-label="Anahtar aktarım QR kodu" shape-rendering="crispEdges"><rect width="${N}" height="${N}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;}
function kxClose(){clearInterval(KX.timer); KX.timer=0; const b=$("#kxBox"), t=$("#btnKx"); if(b){b.hidden=true; b.innerHTML="";} if(t){t.setAttribute("aria-expanded","false"); t.textContent="Telefona aktar (QR)";}}
function kxOpen(){const b=$("#kxBox"), t=$("#btnKx"); if(!b||!TYRT.hasKey())return;
  let svg=""; try{svg=kxSvg(kxUrl());}catch(e){msg($("#keyMsg"),"err","QR oluşturulamadı."); return;}
  KX.left=90;
  b.innerHTML=`<div class="kxIn">${svg}<div class="kxTxt"><b>Telefonun kamerasıyla okut</b>
    <ol><li>Kamerayı aç, QR'a tut, çıkan bağlantıya dokun.</li><li>Uygulama açılır, anahtar kendiliğinden kaydedilir ve doğrulanır.</li><li>Sonra "Telefona kur" ile ana ekrana ekle.</li></ol>
    <p class="hint">Bu QR anahtarının kendisi: sadece kendi telefonunla okut, ekran görüntüsü alma. iPhone'da ana ekran uygulaması Safari'den ayrı saklar; orada anahtarı Ayarlar'a elle yapıştırman gerekebilir.</p>
    <p class="kxLeft" id="kxLeft" aria-live="polite">${KX.left} sn sonra kapanır</p></div></div>`;
  b.hidden=false; if(t){t.setAttribute("aria-expanded","true"); t.textContent="QR'ı kapat";}
  clearInterval(KX.timer); KX.timer=setInterval(()=>{KX.left--; const l=$("#kxLeft"); if(KX.left<=0||!l){kxClose();return;} l.textContent=KX.left+" sn sonra kapanır";},1000);}
function kxRender(){const r=$("#kxRow"); if(!r)return; const ok=TYRT.hasKey()&&(!TYRT.keyStatus||TYRT.keyStatus()!=="bad"); r.hidden=!ok; if(!ok) kxClose();}
/* Telefonda: QR ile açıldıysa bildirim */
function kxToast(kind,text){let el=$("#kxToast"); if(!el){el=document.createElement("div"); el.id="kxToast"; el.setAttribute("role","status"); document.body.appendChild(el);}
  el.className="kxToast "+kind; el.innerHTML=`<span>${esc(text)}</span><button type="button" class="kxX" aria-label="Kapat">×</button>`; el.hidden=false;
  clearTimeout(kxToast._t); if(kind!=="pend") kxToast._t=setTimeout(()=>{el.hidden=true;},kind==="ok"?6000:12000);}
if(window.TYKEYIMPORT==="ok") kxToast("pend","Anahtar telefona aktarıldı · doğrulanıyor…");
else if(window.TYKEYIMPORT==="bad") kxToast("err","QR'daki anahtar okunamadı. Bilgisayarda QR'ı yeniden aç ya da anahtarı Ayarlar'a yapıştır.");
document.addEventListener("tydil:key",e=>{const d=e&&e.detail||{}; kxRender();
  if(window.TYKEYIMPORT==="ok"&&d.status&&d.status!=="pending"){window.TYKEYIMPORT="done";
    if(d.status==="ok") kxToast("ok","Bağlandı ✓ Koçlar bu cihazda açık.");
    else kxToast("err","Anahtar aktarıldı ama doğrulanamadı: "+(typeof keyErrText==="function"?keyErrText(d.error):"bağlantı hatası")+"");}});
document.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b)return;
  if(b.id==="btnKx"){$("#kxBox").hidden?kxOpen():kxClose(); return;}
  if(b.classList.contains("kxX")){const t=$("#kxToast"); if(t) t.hidden=true; return;}});
document.addEventListener("visibilitychange",()=>{if(document.hidden) kxClose();});
kxRender();
