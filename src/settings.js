/* ---------- AYARLAR: Claude bağlantısı (API anahtarı, model) · Yedek ----------
   Bağlar: #keyCard (apiKey, keyEye, btnKeySave, btnKeyTest, btnKeyDel, keyMsg, keyState, modelSel, modelNote)
           #backupCard (btnBkDl, btnBkCopy, bkCode, bkFile, bkPaste, btnBkRestore, bkConfirm, bkMsg)
   Kullandıkları: TYRT (rt.js), $, msg, esc, ICON, copyText, fmtDay, today. Onay her zaman sayfa içinde (window.confirm yok). */
const KEY_ERR={capability_disabled:"Önce bir anahtar gir.",session_expired:"API anahtarı geçersiz; Ayarlar'dan kontrol et.",permission_denied:"Bu anahtar bu modele erişemiyor / izin yok.",rate_limited:"Anahtar çalışıyor ama limit doldu ya da sunucu yoğun. Biraz sonra tekrar dene.",prompt_too_large:"İstek çok büyük.",upstream_error:"Bağlantı kurulamadı. İnterneti ve anahtarı kontrol et."};
const keyErrText=e=>{const c=e&&e.code; const base=KEY_ERR[c]||"Bağlantı kurulamadı."; const m=e&&e.message&&c==="upstream_error"&&!/Ağ hatası/.test(e.message)?" ("+String(e.message).slice(0,120)+")":""; return base+m;};
function maskKey(k){k=String(k||""); if(k.length<=12)return k?"••••":""; return k.slice(0,7)+"…"+k.slice(-4);}
function renderKey(){
  const has=TYRT.hasKey(), st=$("#keyState"), inp=$("#apiKey"), del=$("#btnKeyDel");
  const ks=TYRT.keyStatus?TYRT.keyStatus():(has?"ok":"none");
  if(st){st.innerHTML=!has?"Anahtar yok":ks==="pending"?"Doğrulanıyor…":ks==="bad"?"Doğrulanamadı · "+esc(maskKey(TYRT.getKey())):ICON("check")+"Bağlı · "+esc(maskKey(TYRT.getKey())); st.className="keySt "+(has&&ks==="ok"?"on":"off");}
  if(inp&&!inp.value&&has) inp.placeholder="Kayıtlı: "+maskKey(TYRT.getKey())+" · değiştirmek için yeni anahtarı yaz";
  else if(inp&&!has) inp.placeholder="sk-ant-…";
  if(del) del.hidden=!has;
  const sel=$("#modelSel"), set=TYRT.getSettings();
  if(sel){ if(!sel.options.length) TYRT.MODELS.forEach(m=>{const o=document.createElement("option");o.value=m.id;o.textContent=m.name+" — "+m.note;sel.appendChild(o);}); sel.value=set.model;
    const mn=$("#modelNote"); if(mn){const m=TYRT.MODELS.find(x=>x.id===set.model); mn.textContent=m?(m.id===TYRT.DEFAULT_MODEL?"Günlük ders için yeterli ve ekonomik.":m.id.includes("opus")?"Daha derin açıklama ister ya da Sonnet hata yaparsa seç; maliyeti iki kat.":"En ucuz seçenek; uzun ders akışında kuralları daha kolay kaçırır."):"";}}
}
async function keySave(){const inp=$("#apiKey"), el=$("#keyMsg"), v=inp.value.trim();
  if(!v){msg(el,"err","Anahtarı yapıştır, sonra Kaydet.");inp.focus();return;}
  if(!TYRT.validKey(v)){msg(el,"err",/^sk-ant-/.test(v)?"Anahtar eksik görünüyor (en az "+TYRT.KEY_MIN+" karakter); tamamını yapıştır (console.anthropic.com → API Keys).":"Anahtar sk-ant- ile başlamalı. console.anthropic.com → API Keys.");inp.setAttribute("aria-invalid","true");inp.focus();return;}
  inp.removeAttribute("aria-invalid"); try{TYRT.setKey(v,{verify:true});}catch(e){msg(el,"err","Anahtar sk-ant- ile başlamalı.");return;}
  inp.value=""; renderKey(); msg(el,"info","Anahtar kaydedildi · doğrulanıyor…");}
/* Doğrulama sonucu (tydil:key): Bağlı + "Dersi başlat" ya da hata */
function keyVerified(d){const el=$("#keyMsg"); if(!el||!d||!d.status)return; renderKey();
  if(d.status==="ok"&&el.querySelector(".msg.info")) el.innerHTML=`<div class="msg ok">✓ Bağlı · koçlar açıldı. <button type="button" class="btn btn-primary btn-sm" id="btnKeyGo">${ICON("play")}Dersi başlat</button></div>`;
  else if(d.status==="bad") msg(el,"err",keyErrText(d.error)+" Anahtarı kontrol edip yeniden kaydet.");}
document.addEventListener("tydil:key",e=>keyVerified(e&&e.detail));
async function keyTest(){const inp=$("#apiKey"), el=$("#keyMsg"), b=$("#btnKeyTest"), v=inp.value.trim()||TYRT.getKey();
  if(!v){msg(el,"err","Önce bir anahtar gir.");inp.focus();return;}
  b.disabled=true; msg(el,"info","Bağlantı deneniyor…");
  try{const r=await TYRT.testKey(v); msg(el,"ok","✓ Bağlantı tamam · "+(r.model||"")+(inp.value.trim()&&!TYRT.hasKey()?" · Kaydet'e basarsan koçlar açılır.":""));}
  catch(e){msg(el,"err",keyErrText(e));}
  finally{b.disabled=false;}}
let keyDelArmed=0;
function keyDel(){const b=$("#btnKeyDel"), el=$("#keyMsg");
  if(Date.now()-keyDelArmed>3500){keyDelArmed=Date.now(); b.textContent="Silinsin mi? Tekrar bas"; b.classList.add("warn"); setTimeout(()=>{if(Date.now()-keyDelArmed>=3400){b.textContent="Anahtarı sil";b.classList.remove("warn");}},3600); return;}
  keyDelArmed=0; b.textContent="Anahtarı sil"; b.classList.remove("warn"); TYRT.setKey(""); renderKey(); msg(el,"info","Anahtar silindi. Koçlar yeni anahtar girilince açılır.");}
/* ---- yedek ---- */
const bkName=()=>"ty-dil-yedek-"+today()+".json";
function bkDownload(){const el=$("#bkMsg"); try{const data=JSON.stringify(TYRT.export(),null,1), blob=new Blob([data],{type:"application/json"}), url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url; a.download=bkName(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000);
    msg(el,"ok","Yedek indirildi: "+bkName()+" · "+Math.round(data.length/1024)+" KB. Dosyayı Drive'a ya da e-postaya at.");}
  catch(e){msg(el,"err","Yedek oluşturulamadı: "+(e&&e.message||e));}}
async function bkCopy(){const el=$("#bkMsg"), pre=$("#bkCode"); const data=JSON.stringify(TYRT.export()); pre.textContent=data;
  const ok=await copyText(data,$("#btnBkCopy"),pre); pre.hidden=ok; msg(el,ok?"ok":"info",ok?"Yedek kodu panoya kopyalandı ("+Math.round(data.length/1024)+" KB). Başka cihazda Yedekten geri yükle → kodu yapıştır.":"Tarayıcı kopyalamaya izin vermedi. Kod aşağıda seçili; basılı tutup kopyala.");}
let bkPending=null;
function bkSummary(o){const c=o.collections||{}, n=k=>Object.keys(c[k]||{}).length;
  return {sessions:n("sessions"),cards:n("cards"),topics:n("topics"),chats:n("chats"),program:!!(c.program&&c.program.main),created:o.created||"",ty:o.ty!==undefined};}
function bkPrepare(text){const el=$("#bkMsg"), box=$("#bkConfirm"); let o;
  try{o=JSON.parse(text);}catch(e){msg(el,"err","Yedek okunamadı (JSON hatası). Dosyanın ya da kodun tamamını al.");box.innerHTML="";return;}
  if(!o||o.app!=="TY-DIL"||!o.collections){msg(el,"err","Bu bir TY Dil yedeği değil.");box.innerHTML="";return;}
  bkPending=o; msg(el); const s=bkSummary(o), cur=bkSummary(TYRT.export());
  const when=s.created?fmtDay(String(s.created).slice(0,10),{day:"numeric",month:"long",year:"numeric"}):"tarih yok";
  box.innerHTML=`<div class="confirm" role="alertdialog" aria-labelledby="bkCfT"><p id="bkCfT"><b>Bu yedek geri yüklensin mi?</b> ${esc(when)} · ${s.sessions} oturum, ${s.cards} kart, ${s.topics} konu, ${s.chats} sohbet${s.program?", program var":""}${s.ty?", eski TY İngilizce verisi":""}.</p>
    <p>Bu cihazdaki mevcut kayıtlar (${cur.sessions} oturum, ${cur.cards} kart) <b>silinir</b> ve yedektekiler gelir. API anahtarı değişmez. Emin değilsen önce bu cihazın yedeğini indir.</p>
    <div class="btnRow"><button type="button" class="btn btn-danger" id="btnBkYes">Evet, geri yükle</button><button type="button" class="btn btn-ghost" id="btnBkNo">Vazgeç</button></div></div>`;
  const y=$("#btnBkNo"); if(y)y.focus();}
async function bkApply(){const el=$("#bkMsg"), box=$("#bkConfirm"), o=bkPending; if(!o)return; const b=$("#btnBkYes"); if(b)b.disabled=true;
  try{const r=await TYRT.import(o); bkPending=null; box.innerHTML=""; $("#bkPaste").value=""; try{$("#bkFile").value="";}catch(e){}
    msg(el,"ok","Geri yüklendi: "+r.docs+" kayıt, "+r.collections+" koleksiyon"+(r.ty?" + eski TY İngilizce verisi":"")+". Sayfa yenileniyor…"); setTimeout(()=>location.reload(),900);}
  catch(e){if(b)b.disabled=false; msg(el,"err","Geri yüklenemedi: "+(e&&e.message||e));}}
function bkFromFile(f){if(!f)return; const r=new FileReader(); r.onload=()=>bkPrepare(String(r.result||"")); r.onerror=()=>msg($("#bkMsg"),"err","Dosya okunamadı."); r.readAsText(f);}
/* ---- olaylar ---- */
document.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b)return;
  if(b.id==="btnKeySave"){keySave();return;} if(b.id==="btnKeyGo"){openTab("learn"); if(typeof dersGate==="function"&&dersGate()) dersOpen(); return;} if(b.id==="btnKeyTest"){keyTest();return;} if(b.id==="btnKeyDel"){keyDel();return;}
  if(b.id==="keyEye"){const i=$("#apiKey"), on=i.type==="password"; i.type=on?"text":"password"; b.textContent=on?"Gizle":"Göster"; b.setAttribute("aria-pressed",String(on)); b.setAttribute("aria-label",on?"Anahtarı gizle":"Anahtarı göster"); return;}
  if(b.id==="btnBkDl"){bkDownload();return;} if(b.id==="btnBkCopy"){bkCopy();return;}
  if(b.id==="btnBkRestore"){const t=$("#bkPaste").value.trim(); if(!t){msg($("#bkMsg"),"err","Önce bir dosya seç ya da yedek kodunu yapıştır.");return;} bkPrepare(t); return;}
  if(b.id==="btnBkYes"){bkApply();return;} if(b.id==="btnBkNo"){bkPending=null;$("#bkConfirm").innerHTML="";return;}
});
document.addEventListener("change",e=>{const t=e.target; if(!t)return;
  if(t.id==="bkFile"){bkFromFile(t.files&&t.files[0]);return;}
  if(t.id==="modelSel"){TYRT.setSettings({model:t.value}); renderKey(); msg($("#keyMsg"),"ok","Model: "+(TYRT.MODELS.find(m=>m.id===t.value)||{}).name+". Yeni mesajlardan itibaren geçerli.");}});
document.addEventListener("keydown",e=>{if(e.target&&e.target.id==="apiKey"&&e.key==="Enter"){e.preventDefault();keySave();}});
document.addEventListener("tydil:key",renderKey);
renderKey();
