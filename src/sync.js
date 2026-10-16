/* ---------- CİHAZLAR ARASI SENKRON (GitHub Gist) ----------
   Kullanıcının kendi GitHub token'ıyla (fine-grained, Account permissions → Gists: Read and write; ya da klasik ghp_ + gist)
   hesabında GİZLİ bir Gist ("TY Dil senkron · otomatik, silme", dosya tydil-sync.json) tutulur. Her cihaz:
     Gist'i oku → TYRT.sync.merge (rt.js: belge başına son yazan kazanır, mezar taşları, program/main koruması, days birleşimi)
     → değişenler yerelde uygulanır (onSnapshot → ekran yenilenir, sayfa yenilenmez) → birleşik durum uzaktakinden farklıysa PATCH.
   Tetikler: açılış (db yüklendikten sonra) · uygulamaya dönüş (visible) · yerel yazımdan 20 sn sonra · gizlenme/pagehide (keepalive) ·
             "Şimdi senkronla" · tekrar çevrimiçi olunca. Tek uçuş kilidi; hatada artan bekleme; çevrimdışıyken denenmez.
   Cihazda: tydil.sync.token · tydil.sync.gist · tydil.sync.last. Token ve Claude anahtarı yüke/yedeğe hiç girmez.
   Bağlar: #syncCard (syncState, syncOff, syncToken, btnSyncConnect, syncHow, syncOn, syncStatus, btnSyncNow, btnSyncOff, syncMsg) */
const SY_API="https://api.github.com", SY_DESC="TY Dil senkron · otomatik, silme", SY_FILE="tydil-sync.json", SY_LAST="tydil.sync.last";
const SY={busy:false,again:false,fails:0,nextOk:0,timer:0,err:null,dirty:false,pruned:0,runs:0,offArm:0,tick:0};
const syLs=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const sySet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
const syDel=k=>{try{localStorage.removeItem(k);}catch(e){}};
const syToken=()=>(syLs(TYRT.sync.TOKEN_KEY)||"").trim();
const syGist=()=>(syLs(TYRT.sync.GIST_KEY)||"").trim();
function syncConnected(){return !!(syToken()&&syGist());}
function syErr(code,status,msg){const e=new Error(msg||code); e.code=code; e.status=status||0; return e;}
async function ghFetch(path,opt){opt=opt||{}; const tok=opt.token||syToken();
  const h={"Authorization":"Bearer "+tok,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
  if(opt.body) h["Content-Type"]="application/json";
  if(typeof navigator!=="undefined"&&navigator.onLine===false) throw syErr("offline");
  let r; try{ r=await fetch(SY_API+path,{method:opt.method||"GET",headers:h,body:opt.body,keepalive:!!opt.keepalive,cache:"no-store"}); }
  catch(e){ throw syErr("offline",0,String(e&&e.message||e)); }
  if(!r.ok){ let rl=false; try{rl=r.headers.get("x-ratelimit-remaining")==="0";}catch(e){} throw syErr(rl?"rate":"http",r.status); }
  return r.json();}
/* Bağlanırken: aynı açıklamalı Gist varsa onu bul (en çok 5 sayfa × 100), yoksa gizli Gist oluştur */
async function syFindOrCreate(tok){
  for(let page=1;page<=5;page++){ const arr=await ghFetch("/gists?per_page=100&page="+page,{token:tok}); if(!Array.isArray(arr))break;
    const g=arr.find(x=>x&&x.description===SY_DESC&&x.files&&x.files[SY_FILE]); if(g) return {id:String(g.id),created:false};
    if(arr.length<100)break; }
  const body=JSON.stringify({description:SY_DESC,public:false,files:{[SY_FILE]:{content:JSON.stringify({format:1,updated:new Date().toISOString(),docs:{},ls:{}})}}});
  const g=await ghFetch("/gists",{method:"POST",body,token:tok}); return {id:String(g.id),created:true};}
/* Uzak durum: dosya büyükse (truncated) raw_url'den tamamı */
async function syRead(){ const g=await ghFetch("/gists/"+encodeURIComponent(syGist())); const f=g&&g.files&&g.files[SY_FILE]; if(!f) return null;
  let text=f.content||"";
  if(f.truncated&&f.raw_url){ let r; try{r=await fetch(f.raw_url,{cache:"no-store"});}catch(e){throw syErr("offline");} if(!r.ok) throw syErr("http",r.status); text=await r.text(); }
  if(!text.trim()) return null;
  let o; try{o=JSON.parse(text);}catch(e){throw syErr("format");} if(!o||typeof o!=="object"||o.format!==1) throw syErr("format"); return o;}
async function syWrite(payload,keepalive){ const content=JSON.stringify(payload); const body=JSON.stringify({files:{[SY_FILE]:{content}}});
  /* keepalive gövdesi tarayıcıda ~64 KB ile sınırlı: büyükse normal istek */
  await ghFetch("/gists/"+encodeURIComponent(syGist()),{method:"PATCH",body,keepalive:!!keepalive&&body.length<60000}); return content.length;}
function syErrText(e){const c=e&&e.code, s=e&&e.status;
  if(c==="offline") return "İnternet yok; sonra denenecek.";
  if(c==="format") return "Senkron dosyası okunamadı. Bağlantıyı kesip yeniden bağla.";
  if(c==="rate") return "GitHub istek sınırı doldu; biraz sonra yeniden denenecek.";
  if(c==="token") return "Token github_pat_ (ya da klasik ghp_) ile başlamalı; tamamını yapıştır.";
  if(s===401) return "Token geçersiz ya da süresi dolmuş. GitHub'da yeni token oluşturup buraya yapıştır.";
  if(s===403||s===404) return "İzin yok: token'da Account permissions → Gists → Read and write gerekli.";
  if(s===422) return "GitHub isteği reddetti (422). Sonra yeniden denenecek.";
  return "GitHub'a ulaşılamadı"+(s?" (HTTP "+s+")":"")+". Sonra yeniden denenecek.";}
function syFire(detail){try{document.dispatchEvent(new CustomEvent("tydil:sync",{detail}));}catch(e){}}
/* Tek senkron turu. opt: {force (beklemeyi atla), keepalive} */
async function syncRun(reason,opt){opt=opt||{};
  if(!syncConnected()) return false;
  if(SY.busy){SY.again=true; return false;}
  if(typeof navigator!=="undefined"&&navigator.onLine===false){SY.err=syErr("offline"); syRender(); return false;}
  if(!opt.force&&Date.now()<SY.nextOk) return false;
  SY.busy=true; SY.dirty=false; clearTimeout(SY.timer); syRender();
  try{ await TYRT.ready(); const remote=await syRead(); const r=await TYRT.sync.merge(remote);
    if(r.differs) await syWrite(r.payload,opt.keepalive);
    SY.fails=0; SY.nextOk=0; SY.err=null; SY.pruned=r.pruned; SY.runs++; sySet(SY_LAST,String(Date.now()));
    syFire({ok:true,reason,applied:r.applied,colls:r.colls,pushed:r.differs,first:SY.runs===1}); return true; }
  catch(e){ SY.fails++; SY.nextOk=Date.now()+Math.min(15*60e3,30e3*Math.pow(2,SY.fails-1)); SY.err=e; SY.dirty=true;
    syFire({ok:false,reason,error:{code:e&&e.code,status:e&&e.status},text:syErrText(e)}); return false; }
  finally{ SY.busy=false; syRender(); if(SY.again){SY.again=false; setTimeout(()=>syncRun("again"),50);} }}
function syAgo(t){const m=Math.floor((Date.now()-t)/60000); if(m<1) return "az önce"; if(m<60) return m+" dk önce"; const h=Math.floor(m/60); if(h<24) return h+" sa önce"; return Math.floor(h/24)+" gün önce";}
const syMask=t=>t.length>16?t.slice(0,11)+"…"+t.slice(-4):"••••";
function syRender(){const card=$("#syncCard"); if(!card) return; const on=syncConnected(), st=$("#syncState");
  if(st){st.innerHTML=on?ICON("check")+"Açık":"Kapalı"; st.className="keySt "+(on&&!SY.err?"on":"off");}
  const off=$("#syncOff"), onb=$("#syncOn"); if(off) off.hidden=on; if(onb) onb.hidden=!on;
  const s=$("#syncStatus"); if(!s||!on) return; const last=+(syLs(SY_LAST)||0);
  let txt, cls="";
  if(SY.busy){txt="Senkronlanıyor…"; cls="busy";}
  else if(SY.err){txt=syErrText(SY.err); cls="err";}
  else if(last){txt="Son senkron: "+syAgo(last)+" ✓"; cls="ok";}
  else txt="Henüz senkronlanmadı.";
  s.className="syncStatus "+cls; s.textContent=txt;
  const sub=document.createElement("span"); sub.className="syncSub"; sub.textContent="Token "+syMask(syToken())+" · Gist "+syGist().slice(0,8)+"…"+(SY.pruned?" · 90 günden eski "+SY.pruned+" sohbet senkrona girmedi (bu cihazda duruyor).":""); s.appendChild(sub);
  const nb=$("#btnSyncNow"); if(nb) nb.disabled=SY.busy;}
async function syConnect(){const inp=$("#syncToken"), el=$("#syncMsg"), b=$("#btnSyncConnect"), v=(inp.value||"").trim();
  if(!v){msg(el,"err","Önce GitHub token'ını yapıştır."); inp.focus(); return;}
  if(!TYRT.sync.TOKEN_RE.test(v)){msg(el,"err",syErrText(syErr("token"))); inp.setAttribute("aria-invalid","true"); inp.focus(); return;}
  inp.removeAttribute("aria-invalid"); b.disabled=true; msg(el,"info","Bağlanıyor…");
  try{ const g=await syFindOrCreate(v); sySet(TYRT.sync.TOKEN_KEY,v); sySet(TYRT.sync.GIST_KEY,g.id); inp.value=""; SY.err=null; SY.fails=0; SY.nextOk=0; syRender();
    msg(el,"info",g.created?"Gizli Gist oluşturuldu · ilk senkron…":"Mevcut senkron bulundu · ilerleme birleştiriliyor…");
    const ok=await syncRun("connect",{force:true});
    if(ok) msg(el,"ok","Bağlandı ✓ Bu cihazın kayıtları diğerleriyle birleştirildi. Diğer cihazlarda aynı token'ı gir ya da Claude bağlantısındaki QR'ı okut.");
    else msg(el); }
  catch(e){ msg(el,"err",syErrText(e)); }
  finally{ b.disabled=false; }}
function syOff(){const b=$("#btnSyncOff"), el=$("#syncMsg");
  if(Date.now()-SY.offArm>3500){SY.offArm=Date.now(); b.textContent="Kesilsin mi? Tekrar bas"; b.classList.add("warn"); setTimeout(()=>{if(Date.now()-SY.offArm>=3400){b.textContent="Bağlantıyı kes"; b.classList.remove("warn");}},3600); return;}
  SY.offArm=0; b.textContent="Bağlantıyı kes"; b.classList.remove("warn");
  syDel(TYRT.sync.TOKEN_KEY); syDel(TYRT.sync.GIST_KEY); syDel(SY_LAST); SY.err=null; SY.fails=0; clearTimeout(SY.timer); syRender();
  msg(el,"info","Senkron kapandı. Bu cihazdaki kayıtlar duruyor; GitHub'daki Gist silinmedi (yeniden bağlanınca kaldığı yerden birleşir).");}
document.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b) return;
  if(b.id==="btnSyncConnect"){syConnect(); return;}
  if(b.id==="btnSyncNow"){msg($("#syncMsg")); syncRun("manual",{force:true}); return;}
  if(b.id==="btnSyncOff"){syOff(); return;}});
document.addEventListener("keydown",e=>{if(e.target&&e.target.id==="syncToken"&&e.key==="Enter"){e.preventDefault(); syConnect();}});
/* Yerel yazım → 20 sn sonra (her yeni yazım süreyi yeniler) */
document.addEventListener("tydil:dbwrite",()=>{SY.dirty=true; if(!syncConnected()) return; clearTimeout(SY.timer); SY.timer=setTimeout(()=>syncRun("write"),20000);});
document.addEventListener("visibilitychange",()=>{ if(!syncConnected()) return;
  if(document.visibilityState==="visible") syncRun("visible"); else if(SY.dirty) syncRun("hidden",{keepalive:true,force:true}); });
window.addEventListener("pagehide",()=>{ if(syncConnected()&&SY.dirty) syncRun("pagehide",{keepalive:true,force:true}); });
window.addEventListener("online",()=>{ if(syncConnected()){SY.nextOk=0; syncRun("online");} });
SY.tick=setInterval(()=>{const p=$("#tab-setup"); if(p&&!p.hidden&&!document.hidden) syRender();},30000);
window.TYSYNC={connected:syncConnected,token:syToken,gist:syGist,run:(o)=>syncRun("api",Object.assign({force:true},o||{})),get busy(){return SY.busy;},get error(){return SY.err;}};
syRender();
if(syncConnected()) TYRT.ready().then(()=>syncRun("boot",{force:true})).catch(()=>{});
