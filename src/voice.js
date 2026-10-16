/* ---------- SES: mikrofon (konuşmadan yazıya) · koçu sesli okuma · Konuşma modu (eller serbest) ----------
   Bağlar: #ccForm'a mikrofon düğmesi (#ccMic), form üstüne ses şeridi (#vcBar: Konuşma modu anahtarı, durum, Durdur),
           Ders modu başlığına "Konuşma modu" göstergesi (#dersHands), Ayarlar'a "Ses" kartı (#voiceCard; #backupCard'ın ardına eklenir).
   Köprü: dd_chat.js'teki ccHooks (afterRun, onSend, meta, beforeTts, voiceURI, rate, voiceOn, paint, onAgent, dersBlock, dersClose).
   Ayarlar: localStorage "tydil.voice" {autoSpeak, autoSend:"auto"|"on"|"off", handsAuto, rate, voices:{tr,it,en}, micLang:{it,en,db}, noted}.
   Ses tanıma: webkitSpeechRecognition/SpeechRecognition, interim açık, continuous kapalı; boş erken bitişte en çok 2 yeniden başlatma
   (eski TY İngilizce'deki Edge düzeltmesi), son sonuçtan sonra 1,2 sn bekleme, sonra otomatik gönderim.
   Dışa: TYDIL.voice = {listen, stop, speak, score, state} · voiceScore(target, heard, lang) → 0–1 (telaffuz eşleşmesi). */
const V_SR=typeof window!=="undefined"?(window.SpeechRecognition||window.webkitSpeechRecognition||null):null;
/* iPhone ana ekran uygulamasında ses tanıma genelde çalışmaz → mikrofon gizli, sesli okuma kalır */
const V_IOS_PWA=(()=>{try{return /iP(hone|ad|od)/.test(navigator.userAgent)&&(navigator.standalone===true||matchMedia("(display-mode: standalone)").matches);}catch(e){return false;}})();
const V_KEY="tydil.voice", V_GRACE=1200, V_MAX_RETRY=2, V_EARLY=3000, V_WATCH=12000;
const V_DEF={autoSpeak:true,autoSend:"auto",handsAuto:true,rate:0.9,voices:{},micLang:{},noted:0};
const V_MICLANG={it:"it-IT",en:"en-GB",db:"tr-TR"};
const V_LANGTAG={it:"it-IT",en:"en-GB",tr:"tr-TR"};
const V_LANGN={tr:"Türkçe",it:"İtalyanca",en:"İngilizce"};
const V={set:null,state:"idle",hands:false,sess:null,tts:null,unsupported:false,blockKey:"",fromMic:false,heard:"",pron:null,sendT:0,hint:"",noSpeech:0,err:""};
function vLoad(){let o={};try{o=JSON.parse(localStorage.getItem(V_KEY)||"{}")||{};}catch(e){o={};}
  const s=Object.assign({},V_DEF,o); s.voices=Object.assign({},o.voices||{}); s.micLang=Object.assign({},o.micLang||{});
  if(!["auto","on","off"].includes(s.autoSend))s.autoSend="auto"; s.rate=Math.min(1.4,Math.max(0.5,+s.rate||0.9)); return s;}
function vSave(p){Object.assign(V.set,p||{}); try{localStorage.setItem(V_KEY,JSON.stringify(V.set));}catch(e){} vPaint(); vSettingsPaint();}
V.set=vLoad();
const vMicOk=()=>!!V_SR&&!V_IOS_PWA&&!V.unsupported;
const vTtsOk=()=>typeof CC_TTS!=="undefined"&&CC_TTS;
const vMicLang=()=>V.set.micLang[CC.agent]||V_MICLANG[CC.agent]||"tr-TR";
/* Otomatik gönder: "auto" = Ders modunda açık, Pratik'te kapalı; Konuşma modu her zaman gönderir */
const vAutoSend=()=>V.hands||V.set.autoSend==="on"||(V.set.autoSend==="auto"&&ccDers.open());
const vBusyChat=()=>typeof CC==="undefined"||!CC.ready||!!CC.locked||CC.busy||CC.loading;

/* ===== telaffuz puanı (eski TY İngilizce'den; saf fonksiyonlar) ===== */
const V_NUM={
  en:{ones:["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"],tens:["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"]},
  it:{ones:["zero","uno","due","tre","quattro","cinque","sei","sette","otto","nove","dieci","undici","dodici","tredici","quattordici","quindici","sedici","diciassette","diciotto","diciannove"],tens:["","","venti","trenta","quaranta","cinquanta","sessanta","settanta","ottanta","novanta"]},
  tr:{ones:["sıfır","bir","iki","üç","dört","beş","altı","yedi","sekiz","dokuz","on","on bir","on iki","on üç","on dört","on beş","on altı","on yedi","on sekiz","on dokuz"],tens:["","","yirmi","otuz","kırk","elli","altmış","yetmiş","seksen","doksan"]}
};
function vNumWord(n,lang){const L=V_NUM[lang]||V_NUM.en;
  if(n<20)return L.ones[n];
  if(n<100){const t=L.tens[Math.floor(n/10)],o=n%10; if(!o)return t; if(lang==="it")return ((o===1||o===8)?t.slice(0,-1):t)+L.ones[o]; return t+" "+L.ones[o];}
  if(n===100)return lang==="it"?"cento":lang==="tr"?"yüz":"one hundred";
  if(n<1000){const h=Math.floor(n/100),r=n%100; if(lang==="it")return (h===1?"":L.ones[h])+"cento"+(r?vNumWord(r,lang):""); if(lang==="tr")return (h===1?"":L.ones[h]+" ")+"yüz"+(r?" "+vNumWord(r,lang):""); return L.ones[h]+" hundred"+(r?" "+vNumWord(r,lang):"");}
  return String(n);}
const V_ART={en:new Set(["a","an","the"]),it:new Set(["il","lo","la","l","i","gli","le","un","una","uno"]),tr:new Set([])};
const V_FILL=new Set(["uh","um","umm","eh","ehm","ah","hmm","mm","ıı","ee"]);
const V_ABBR={en:{mr:"mister",mrs:"missus",dr:"doctor",okay:"ok"},it:{},tr:{}};
const vL=l=>l==="it"||l==="tr"?l:"en";
/* Karşılaştırılabilir kelime dizisi: küçük harf, noktalama/aksan yok, İngilizce kısaltmalar açık (I'm → i am), rakamlar yazıyla, l'acqua → l acqua */
function vNorm(s,lang){lang=vL(lang);
  let t=String(s==null?"":s).normalize("NFC").toLowerCase().replace(/[’‘`´ʼ]/g,"'").replace(/\([^)]*\)/g," ").replace(/(\d)[:.]00\b/g,"$1").replace(/&/g,lang==="it"?" e ":lang==="tr"?" ve ":" and ");
  if(lang==="en"){t=t.replace(/\bwon't\b/g,"will not").replace(/\bcan't\b/g,"can not").replace(/\bcannot\b/g,"can not").replace(/\bshan't\b/g,"shall not").replace(/\bain't\b/g,"is not").replace(/\blet's\b/g,"let us")
      .replace(/n't\b/g," not").replace(/'re\b/g," are").replace(/'m\b/g," am").replace(/'ll\b/g," will").replace(/'ve\b/g," have").replace(/'d\b/g," would").replace(/'s\b/g," is").replace(/'/g,"");}
  else t=t.replace(/'/g," ");
  if(lang==="tr")t=t.replace(/ı/g,"i").replace(/ğ/g,"g").replace(/ş/g,"s").replace(/ç/g,"c").replace(/ö/g,"o").replace(/ü/g,"u");
  t=t.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const out=[]; t.split(" ").forEach(w=>{if(!w||V_FILL.has(w))return;
    if(/^\d+$/.test(w)){const n=parseInt(w,10); if(n<=999)vNumWord(n,lang).split(" ").forEach(x=>out.push(x)); else out.push(w); return;}
    const m=w.match(/^(\d+)(st|nd|rd|th)$/); if(m){out.push(m[1]);return;}
    out.push(V_ABBR[lang][w]||w);});
  return out;}
function vLev(a,b){if(a===b)return 0; const m=a.length,n=b.length; if(!m)return n; if(!n)return m;
  let p=new Array(n+1),c=new Array(n+1); for(let j=0;j<=n;j++)p[j]=j;
  for(let i=1;i<=m;i++){c[0]=i; for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); const x=p;p=c;c=x;}
  return p[n];}
const vSim=(a,b)=>{if(a===b)return 1; const L=Math.max(a.length,b.length); return L?1-vLev(a,b)/L:1;};
/* Tek hedef ↔ tek duyulan: kelimeleri sırayla hizala (kelime başına Levenshtein benzerliği); puan = hedef kapsaması (artikel az ağırlıklı) − fazla kelime cezası */
function vScoreOne(target,heard,lang){lang=vL(lang); const ART=V_ART[lang], open=/\.\.\.|…/.test(target);
  const T=vNorm(target,lang),H=vNorm(heard,lang);
  if(!T.length)return {score:0,bad:[]};
  if(!H.length)return {score:0,bad:T.filter(w=>!ART.has(w))};
  const m=T.length,n=H.length,wt=w=>ART.has(w)?0.4:1,dp=[];
  for(let i=0;i<=m;i++)dp.push(new Array(n+1).fill(0));
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){const s=vSim(T[i-1],H[j-1]); dp[i][j]=Math.max(dp[i-1][j],dp[i][j-1],s>=0.5?dp[i-1][j-1]+s*wt(T[i-1]):0);}
  const got=new Array(m).fill(0),usedH=new Set(); let i=m,j=n;
  while(i>0&&j>0){const s=vSim(T[i-1],H[j-1]);
    if(s>=0.5&&Math.abs(dp[i][j]-(dp[i-1][j-1]+s*wt(T[i-1])))<1e-9){got[i-1]=s;usedH.add(j-1);i--;j--;}
    else if(dp[i-1][j]>=dp[i][j-1])i--; else j--;}
  let tw=0,sw=0; T.forEach((w,k)=>{tw+=wt(w);sw+=got[k]*wt(w);});
  const extra=H.filter((w,k)=>!usedH.has(k)&&!ART.has(w)).length;
  let score=sw/tw-(open?0:Math.min(0.2,0.05*extra));
  let bad=T.filter((w,k)=>!ART.has(w)&&got[k]<0.75);
  const J=vSim(T.join(""),H.join("")); if(T.length!==H.length&&J>=0.9&&J>score){score=J;bad=[];}
  return {score:Math.max(0,Math.min(1,score)),bad};}
/* target: hedef metin ("a / b" alternatifleri olabilir); heard: metin ya da alternatif listesi. Döner {score, grade good|near|bad, bad[], heard, target} */
function voiceScoreInfo(target,heard,lang){lang=vL(lang); const tgts=String(target==null?"":target).split(" / ").map(s=>s.trim()).filter(Boolean);
  const hs=(Array.isArray(heard)?heard:[heard]).map(h=>String(h==null?"":h).trim()).filter(Boolean);
  let best={score:0,bad:vNorm(tgts[0]||"",lang).filter(w=>!V_ART[lang].has(w)),heard:hs[0]||"",target:tgts[0]||""};
  hs.forEach(h=>tgts.forEach(t=>{const r=vScoreOne(t,h,lang); if(r.score>best.score+1e-9)best={score:r.score,bad:r.bad,heard:h,target:t};}));
  best.grade=best.score>=0.85&&!best.bad.length?"good":best.score>=0.6?"near":"bad"; return best;}
function voiceScore(target,heard,lang){return voiceScoreInfo(target,heard,lang).score;}

/* ===== sesli okuma: markdown → dil parçaları ===== */
const vSep=l=>/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
function vCleanText(t){return String(t||"").replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu,"").replace(/[*_#`>|]+/g," ").replace(/\s+([,.;:!?])/g,"$1").replace(/\s+/g," ").trim().replace(/^[–—-]\s*|\s*[–—-]$/g,"").trim();}
/* Parçalar: [{lang:"tr"|"it"|"en", t}] — kod ve URL atlanır, tablo satırı "hücre – hücre", başlık/liste işaretleri düşer */
function vSegments(md){
  let s=String(md||"").replace(/\r\n?/g,"\n").replace(/```[\s\S]*?(```|$)/g," ").replace(/`[^`\n]*`/g," ").replace(/https?:\/\/\S+/g," ").replace(/\*\((Yanıt uzunluk sınırında kesildi[^)]*)\)\*/g,"");
  const L=s.split("\n"), out=[]; const push=(lang,t)=>{t=vCleanText(t); if(!/[\p{L}\p{N}]/u.test(t))return; out.push({lang,t});};
  for(let i=0;i<L.length;i++){let l=L[i].trim(); if(!l||vSep(l))continue;
    if(/\|/.test(l)&&i+1<L.length&&vSep(L[i+1]))continue;                       /* tablo başlığı */
    if(/\|/.test(l)&&l.split("|").length>=3){l=ccCells(l).filter(c=>c.trim()).join(" – ");}
    l=l.replace(/^#{1,4}\s+/,"").replace(/^>\s?/,"").replace(/^([-*+•]|\d{1,3}[.)])\s+/,"");
    if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(l))continue;
    l=l.replace(/\*\*([^*\n]+?)\*\*/g,"$1").replace(/__([^_\n]+?)__/g,"$1").replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\w)/g,"$1$2").replace(/(^|[^\w])_([^_\s][^_\n]*?)_(?!\w)/g,"$1$2").replace(/~~([^~\n]+?)~~/g,"$1");
    const re=/\[\[(it|en):\s*([^\]\n]+?)\s*\]\]/g; let k=0,m;
    while((m=re.exec(l))){push("tr",l.slice(k,m.index)); push(m[1],m[2]); k=m.index+m[0].length;}
    push("tr",l.slice(k));}
  /* uzun Türkçe parçaları cümlelere böl (Chrome uzun cümlede kesiyor) */
  const fin=[]; out.forEach(x=>{if(x.t.length<=220){fin.push(x);return;} let cur=""; x.t.split(/(?<=[.!?;:])\s+/).forEach(p=>{if((cur+" "+p).length>220&&cur){fin.push({lang:x.lang,t:cur});cur=p;} else cur=cur?cur+" "+p:p;}); if(cur)fin.push({lang:x.lang,t:cur});});
  return fin;}
/* Metni (ya da parça listesini) sırayla okur. Döner Promise → {done:true} bitti · {cancelled:true} kesildi. Sayfa sesi mikrofona girmesin: dinleme durur */
function voiceSpeak(src,o){o=o||{};
  if(!vTtsOk())return Promise.resolve({done:false,unsupported:true});
  vTtsCancel(); vListenAbort(false);
  const segs=Array.isArray(src)?src:vSegments(src); if(!segs.length)return Promise.resolve({done:true,empty:true});
  const syn=window.speechSynthesis;
  return new Promise(res=>{const job={segs,i:0,res,cancelled:false,watch:0,done:false}; V.tts=job;
    const finish=r=>{if(job.done)return; job.done=true; clearTimeout(job.watch); if(V.tts===job)V.tts=null; vState(V.state==="speaking"?"idle":V.state); res(r);};
    job.finish=finish;
    const next=()=>{if(job.cancelled)return finish({cancelled:true}); if(job.i>=segs.length)return finish({done:true});
      const sg=segs[job.i++], u=new SpeechSynthesisUtterance(sg.t); u.lang=V_LANGTAG[sg.lang]||"tr-TR"; u.rate=V.set.rate;
      const v=typeof ccPickVoice==="function"?ccPickVoice(sg.lang):null; if(v)u.voice=v;
      u.onend=()=>{clearTimeout(job.watch); if(!job.cancelled)next();};
      u.onerror=e=>{clearTimeout(job.watch); const c=e&&e.error; if(c==="interrupted"||c==="canceled"){finish({cancelled:true});return;} if(!job.cancelled)next();};
      /* bekçi: ses hiç başlamazsa 2,5 sn (iOS: ilk okuma dokunuş ister; başsız tarayıcı) ya da bitmezse (uyku) takılı kalma */
      const bail=()=>{if(job.done)return; try{syn.cancel();}catch(e){} finish({done:true,timeout:true});};
      clearTimeout(job.watch); job.watch=setTimeout(bail,2500);
      u.onstart=()=>{clearTimeout(job.watch); job.watch=setTimeout(bail,Math.min(60000,3000+sg.t.length*90));};
      try{syn.speak(u);}catch(e){next();}};
    vState("speaking"); next();});}
function vTtsCancel(){const j=V.tts; if(j){j.cancelled=true; V.tts=null; clearTimeout(j.watch);} if(vTtsOk()){try{window.speechSynthesis.cancel();}catch(e){}} if(j&&j.finish)j.finish({cancelled:true}); if(V.state==="speaking")vState("idle");}

/* ===== ses tanıma oturumu ===== */
/* voiceListen({lang,onInterim,onState}) → Promise {text, err, aborted}. Boş erken bitişte ≤2 yeniden başlatma; sonuç yoksa err "no-speech" */
function voiceListen(o){o=o||{};
  if(!vMicOk())return Promise.resolve({text:"",err:"unsupported"});
  vListenAbort(false); vTtsCancel();
  return new Promise(res=>{const s={o,lang:o.lang||vMicLang(),finals:[],interim:"",err:"",retries:0,rec:null,done:false,res,aborted:false,timer:0,begunAt:0}; V.sess=s;
    s.finish=r=>{if(s.done)return; s.done=true; clearTimeout(s.timer); if(V.sess===s)V.sess=null; try{if(s.rec){s.rec.onend=s.rec.onerror=s.rec.onresult=s.rec.onstart=null;}}catch(e){} if(V.state==="listening")vState("idle"); res(r);};
    vBegin(s);});}
function vText(s){return (s.finals.join(" ")+" "+s.interim).replace(/\s+/g," ").trim();}
function vBegin(s){if(s.done)return; let rec;
  try{rec=new V_SR();}catch(e){s.finish({text:"",err:"start-failed"});return;}
  s.rec=rec; rec.lang=s.lang; rec.interimResults=true; rec.continuous=false; try{rec.maxAlternatives=3;}catch(e){}
  s.finals=[]; s.interim=""; s.err=""; s.begunAt=Date.now(); let gotFinal=false;
  rec.onstart=()=>{if(s.done||V.sess!==s)return; vState("listening"); if(s.o.onState)s.o.onState("listening");};
  rec.onresult=e=>{if(s.done||V.sess!==s)return; const fin=[]; let interim="";
    const R=e&&e.results?e.results:[]; for(let i=0;i<R.length;i++){const r=R[i]; if(!r||!r.length)continue; const t=(r[0]&&r[0].transcript)||""; if(r.isFinal)fin.push(t); else interim+=t+" ";}
    if(fin.length){s.finals=fin;gotFinal=true;} s.interim=interim.trim();
    if(s.o.onInterim)s.o.onInterim(vText(s),gotFinal&&!s.interim);
    if(gotFinal&&!s.interim){try{rec.stop();}catch(x){}}
    clearTimeout(s.timer); s.timer=setTimeout(()=>vKill(s),V_WATCH);};
  rec.onerror=ev=>{if(s.done||V.sess!==s)return; s.err=(ev&&ev.error)||"unknown";};
  rec.onend=()=>{if(s.done||V.sess!==s)return; vEnded(s);};
  try{rec.start();}catch(e){s.finish({text:"",err:"start-failed"});return;}
  clearTimeout(s.timer); s.timer=setTimeout(()=>vKill(s),V_WATCH);}
function vKill(s){if(s.done)return; try{s.rec.stop();}catch(e){} setTimeout(()=>{if(!s.done){try{s.rec.abort();}catch(e){} vEnded(s);}},1500);}
function vEnded(s){if(s.done)return; const text=vText(s);
  /* Edge/Chrome: hiçbir şey duymadan ~1 sn içinde boş kapanış → sessizce yeniden dinle (en çok 2) */
  if(!text&&!s.aborted&&s.retries<V_MAX_RETRY&&Date.now()-s.begunAt<V_EARLY&&(!s.err||s.err==="no-speech"||s.err==="aborted")){
    s.retries++; try{s.rec.onend=s.rec.onerror=s.rec.onresult=s.rec.onstart=null;}catch(e){} setTimeout(()=>vBegin(s),150); return;}
  if(text)return s.finish({text,err:""});
  s.finish({text:"",err:s.aborted?"aborted":(s.err||"no-speech")});}
/* Dinlemeyi kes. keep=true: o ana kadarki metin kalır (mikrofona ikinci dokunuş) */
function vListenAbort(keep){const s=V.sess; if(!s)return; s.aborted=!keep;
  if(keep){try{s.rec.stop();}catch(e){} setTimeout(()=>{if(!s.done)vEnded(s);},800); return;}
  try{s.rec.abort();}catch(e){} s.finish({text:"",err:"aborted",aborted:true});}
function voiceStop(){clearTimeout(V.sendT); V.sendT=0; vListenAbort(false); vTtsCancel(); vInterim(null); vState("idle");}

/* ===== sohbet akışı ===== */
function vState(st){V.state=st; vPaint();}
function vInterim(text,final){const ta=ccq("#ccIn"); if(!ta)return;
  if(text==null){ta.classList.remove("vc-interim");return;}
  ta.value=text; ta.classList.toggle("vc-interim",!final); if(typeof ccGrow==="function")ccGrow(); if(!final)V.fromMic=false;}
/* Chiara'nın son mesajındaki [[it:]] hedefleri (sesli tekrar) */
function vTargets(){if(!CC.root||CC.agent!=="it")return []; const rows=[...CC.root.querySelectorAll("#ccLog .cc-row:not(.me):not(.sys):not(.live)")], r=rows[rows.length-1]; if(!r)return [];
  return [...r.querySelectorAll(".cc-tl.it .cc-tx")].map(x=>x.textContent.trim()).filter(Boolean);}
function vScoreHeard(text){const T=vTargets(); if(!T.length||!text)return null; let best=null;
  T.forEach(t=>{const r=voiceScoreInfo(t,text,"it"); if(!best||r.score>best.score)best=Object.assign({target:t},r);});
  return best?{pct:Math.round(best.score*100),target:best.target,bad:best.bad}:null;}
/* Mikrofon: bas → dinle; dinlerken bas → bitir (metin kalır) */
function vMicTap(){
  if(V.state==="listening"){clearTimeout(V.sendT); V.sendT=0; V.manualStop=true; vListenAbort(true); return;}
  if(V.state==="speaking")vTtsCancel();
  if(vBusyChat()){if(CC.busy&&CC.ctl)CC.ctl.abort(); return;}
  vStartListen(false);}
async function vStartListen(auto){
  if(!vMicOk()||vBusyChat())return; if(V.sess)return;
  const ta=ccq("#ccIn"); if(!ta)return; const prev=auto?"":ta.value; V.manualStop=false; V.hint=""; V.err="";
  const r=await voiceListen({onInterim:(t,fin)=>vInterim((prev?prev+" ":"")+t,fin)});
  const ta2=ccq("#ccIn"); if(!ta2)return;
  if(r.err&&!r.text){vInterim(null);
    if(r.err==="not-allowed"||r.err==="service-not-allowed"){V.err="perm"; V.hands=false; vErrCard("perm"); vPaint(); return;}
    if(r.err==="language-not-supported"){V.err="lang"; V.hands=false; vErrCard("lang"); vPaint(); return;}
    if(r.err==="audio-capture"){V.hint="Mikrofon bulunamadı; başka uygulama kullanıyor olabilir."; vPaint(); return;}
    if(r.err==="network"){V.hint="Ses tanıma için internet gerekiyor."; vPaint(); return;}
    if(r.err==="aborted"){if(prev&&!auto)return; vPaint(); return;}
    /* no-speech: bir kez sessizce tekrar dene, sonra ipucu */
    if(r.err==="no-speech"&&auto&&V.noSpeech<1&&V.hands&&!document.hidden){V.noSpeech++; return vStartListen(true);}
    V.noSpeech=0; V.hint="Sesini duyamadım; mikrofona bas ve biraz yüksek sesle söyle."; vPaint(); return;}
  V.noSpeech=0; const text=((prev?prev+" ":"")+r.text).trim(); vInterim(text,true); V.fromMic=true; V.heard=text; V.pron=vScoreHeard(r.text);
  if(V.pron){V.hint="Telaffuz: %"+V.pron.pct+(V.pron.bad.length?" · dikkat: "+V.pron.bad.join(", "):"");}
  const send=vAutoSend()&&!V.manualStop;
  if(send){vState("processing"); clearTimeout(V.sendT);
    V.sendT=setTimeout(()=>{V.sendT=0; if(V.state!=="processing")return; vState("idle"); const t2=ccq("#ccIn"); if(!t2||!t2.value.trim()){return;} if(typeof ccSubmit==="function")ccSubmit();},V_GRACE);}
  else {vState("idle"); try{ta2.focus({preventScroll:true});}catch(e){}}
}
function vErrCard(kind){const log=ccq("#ccLog"); if(!log)return; log.querySelectorAll(".cc-err.vc-err").forEach(e=>e.remove());
  const t=kind==="perm"?"Mikrofon izni ver (tarayıcı adres çubuğundaki kilit/mikrofon simgesi → Mikrofon → İzin ver), sonra tekrar dene.":"Bu cihaz "+(V_LANGN[CC.agent]||"bu dilde")+" ses tanımayı desteklemiyor; klavyeyle yaz ya da Ayarlar → Ses'ten mikrofon dilini değiştir.";
  log.insertAdjacentHTML("beforeend",`<div class="cc-err vc-err" role="alert"><span>${esc(t)}</span><button type="button" class="cc-mini" data-vc-retry>Tekrar dene</button></div>`); if(typeof ccScroll==="function")ccScroll(true);}
/* Koç yanıtı bitti: sesli oku → Konuşma modunda dinle */
async function vAfterRun(reply,ok){
  if(!reply||reply.stopped||!ok||!CC.root)return; if(document.hidden)return;
  const log=ccq("#ccLog"); if(log&&log.querySelector(".cc-err:last-child"))return;      /* hata kartı varsa okuma */
  let r={done:true};
  if(V.set.autoSpeak&&vTtsOk()){r=await voiceSpeak(reply.c); if(!r.done||r.timeout)return;}   /* kesildi ya da ses hiç çalmadı (başsız tarayıcı): dinlemeye geçme */
  if(V.hands&&vMicOk()&&!document.hidden&&!vBusyChat()&&(ccDers.open()||vChatVisible())){await new Promise(r=>setTimeout(r,300)); if(V.hands&&!vBusyChat()&&!document.hidden)vStartListen(true);}}   /* hoparlörün kuyruğu mikrofona girmesin */
function vChatVisible(){const r=CC.root; if(!r)return false; const p=r.closest(".panel"); return !(p&&p.hidden);}
function vSetHands(on,auto){on=!!on; if(V.hands===on){vPaint();return;} V.hands=on; V.noSpeech=0;
  if(!on){clearTimeout(V.sendT); V.sendT=0; if(V.state==="listening")vListenAbort(false); if(V.state==="processing")vState("idle"); const ta=ccq("#ccIn"); if(ta&&ta.classList.contains("vc-interim")){ta.value="";ta.classList.remove("vc-interim"); if(typeof ccGrow==="function")ccGrow();}}
  else if(!auto&&!vBusyChat()&&V.state==="idle"&&!V.tts){const lt=CC.turns[CC.turns.length-1]; if(lt&&lt.r==="a")vStartListen(true);}  /* el ile açıldı, sıra öğrencideyse hemen dinle */
  vPaint();}

/* ===== arayüz ===== */
function vMount(){if(!CC.root||CC.root.querySelector("#vcBar"))return; const form=ccq("#ccForm"), ta=ccq("#ccIn"); if(!form||!ta)return;
  if(vMicOk()){form.insertBefore(Object.assign(document.createElement("button"),{type:"button",className:"cc-mic",id:"ccMic",innerHTML:ICON("speaking")}),ta);
    const m=ccq("#ccMic"); m.setAttribute("aria-label","Konuş (bas ve söyle)"); m.setAttribute("aria-pressed","false"); m.title="Konuş"; m.addEventListener("click",vMicTap);}
  if(vMicOk()||vTtsOk()){form.insertAdjacentHTML("beforebegin",`<div class="vc-bar" id="vcBar">${vMicOk()?`<button type="button" class="vc-hands" id="vcHands" aria-pressed="false" title="Konuşma modu: koç okur, sen cevaplarsın; eller serbest">${ICON("speaking")}<span>Konuşma modu</span></button>`:""}<span class="vc-st" id="vcSt" role="status" aria-live="polite"></span><button type="button" class="vc-stop" id="vcStop" hidden>${CC_SVG.stop}<span>Durdur</span></button></div>`);
    const h=ccq("#vcHands"); if(h)h.addEventListener("click",()=>vSetHands(!V.hands));
    ccq("#vcStop").addEventListener("click",()=>{voiceStop();});}
  if(!vMicOk()&&!V.set.noted&&!V_IOS_PWA&&!V_SR){const f=ccq("#ccFoot"); if(f){f.insertAdjacentHTML("beforeend",`<span class="vc-note" id="vcNote">Bu tarayıcıda sesli giriş yok; Chrome kullan.<button type="button" class="vc-x" aria-label="Kapat">${ICON("x")}</button></span>`); f.querySelector("#vcNote .vc-x").addEventListener("click",()=>{vSave({noted:1}); const n=ccq("#vcNote"); if(n)n.remove(); const d=document.getElementById("dersNoMic"); if(d)d.remove();});}}
  if(!vMicOk()&&V_IOS_PWA&&!V.set.noted){const f=ccq("#ccFoot"); if(f){f.insertAdjacentHTML("beforeend",`<span class="vc-note" id="vcNote">iPhone ana ekran uygulamasında mikrofon çalışmaz; Safari'de aç.<button type="button" class="vc-x" aria-label="Kapat">${ICON("x")}</button></span>`); f.querySelector("#vcNote .vc-x").addEventListener("click",()=>{vSave({noted:1}); const n=ccq("#vcNote"); if(n)n.remove(); const d=document.getElementById("dersNoMic"); if(d)d.remove();});}}
  ta.addEventListener("input",()=>{V.fromMic=false; ta.classList.remove("vc-interim"); if(V.state==="processing"){clearTimeout(V.sendT);V.sendT=0;vState("idle");}});
  const log=ccq("#ccLog"); if(log)log.addEventListener("click",e=>{const b=e.target.closest("[data-vc-retry]"); if(b){b.closest(".cc-err").remove(); V.err=""; vStartListen(false);}});
  vPaint();}
function vPaint(){if(!CC.root)return; const mic=ccq("#ccMic"), bar=ccq("#vcBar"), st=ccq("#vcSt"), stop=ccq("#vcStop"), hands=ccq("#vcHands"), ta=ccq("#ccIn");
  const busy=vBusyChat(), lis=V.state==="listening", spk=V.state==="speaking", pro=V.state==="processing";
  if(mic){mic.disabled=!CC.ready||!!CC.locked||CC.loading; mic.classList.toggle("on",lis); mic.classList.toggle("busy",pro); mic.setAttribute("aria-pressed",String(lis));
    mic.setAttribute("aria-label",lis?"Dinliyor — bitirmek için bas":pro?"Gönderiliyor…":CC.busy?"Koç yazıyor — kesmek için bas":"Konuş (bas ve söyle)"); mic.title=lis?"Bitir":"Konuş";}
  if(ta){if(lis)ta.placeholder=(V_LANGN[{it:"it",en:"en"}[CC.agent]]||"Türkçe")+" konuş…"; else if(typeof ccPaintBar==="function"&&ta.placeholder.endsWith("konuş…"))ta.placeholder=ccA().ph;}
  if(hands){hands.setAttribute("aria-pressed",String(V.hands)); hands.classList.toggle("on",V.hands); hands.disabled=!CC.ready||!!CC.locked;}
  if(st){st.textContent=lis?"Dinliyorum… konuş":pro?"Gönderiliyor…":spk?(ccA().name+" okuyor…"):V.hint||(V.hands&&!busy?"Konuşma modu açık: koç okur, sen cevaplarsın.":""); st.classList.toggle("warn",!!V.hint&&!lis&&!pro&&!spk);}
  if(stop)stop.hidden=!(spk||lis||pro);
  if(bar){bar.classList.toggle("is-on",lis||spk||pro); bar.hidden=!(vMicOk()||spk);}
  CC.root.classList.toggle("vc-listening",lis); CC.root.classList.toggle("vc-speaking",spk);
  const dh=document.getElementById("dersHands"); if(dh){dh.hidden=!vMicOk(); dh.setAttribute("aria-pressed",String(V.hands)); dh.classList.toggle("on",V.hands); dh.classList.toggle("it",CC.agent==="it"); dh.classList.toggle("live",lis||spk);}
}
/* Ders modu başlığına Konuşma modu göstergesi/anahtarı */
function vMountDers(){const top=document.querySelector("#ders .dTop"), ttl=document.getElementById("dersTitle"); if(!top||!ttl||document.getElementById("dersHands"))return;
  if(!vMicOk()&&!V.set.noted){const f=document.getElementById("dersFoot"); if(f) f.insertAdjacentHTML("afterbegin",`<p class="vc-note dNoMic" id="dersNoMic"><span>${V_IOS_PWA?"iPhone ana ekran uygulamasında mikrofon çalışmaz; Safari'de aç.":"Bu tarayıcıda sesli giriş yok; Chrome kullan. Cevabını yazarsın."}</span><button type="button" class="vc-x" aria-label="Kapat">${ICON("x")}</button></p>`); const x=document.querySelector("#dersNoMic .vc-x"); if(x) x.addEventListener("click",()=>{vSave({noted:1}); const n=document.getElementById("dersNoMic"); if(n)n.remove(); const n2=ccq("#vcNote"); if(n2)n2.remove();});}
  ttl.insertAdjacentHTML("afterend",`<button type="button" class="dHands" id="dersHands" aria-pressed="false" title="Konuşma modu: koç okur, sen mikrofona cevaplarsın" hidden>${ICON("speaking")}<span class="dhL">Konuşma modu</span><span class="dhS">Ses</span></button>`);
  document.getElementById("dersHands").addEventListener("click",()=>vSetHands(!V.hands));}
/* Blok değişti: Konuşma (Oliver) ve Sesli tekrar (Chiara) bloklarında Konuşma modu kendiliğinden açık; diğerlerinde bas-konuş */
function vDersBlock(b){const key=b?b.key:""; if(key===V.blockKey)return; V.blockKey=key; if(!vMicOk())return;
  const hf=!!b&&((b.l==="en"&&b.k==="speaking")||(b.l==="it"&&b.k==="sesli"));
  vSetHands(hf&&V.set.handsAuto,true);}
function vDersClose(){V.blockKey=""; voiceStop(); vSetHands(false,true);}

/* ===== en doğal ses (dil başına puan) =====
   Natural/Neural/Online > Premium/Enhanced/Siri > Google; Compact/eSpeak/yenilik sesleri cezalı. voiceschanged'de yeniden; elle seçim (Ayarlar) her zaman önce. */
const V_BAD=/compact|espeak|novelty|zarvox|trinoids|whisper|bad news|good news|jester|superstar|wobble|cellos|bubbles|boing|deranged|hysterical|bahh|pipe organ|\b(organ|bells|fred|albert|junior|kathy|ralph|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley)\b/i;
const V_NAT=/natural|neural|online|premium|enhanced|siri/i;
function vVoiceScore(v,lang){const n=String(v&&v.name||""); let s=0;
  if(/natural|neural|online/i.test(n))s+=100; if(/premium|enhanced|siri/i.test(n))s+=70; if(/google/i.test(n))s+=40; if(V_BAD.test(n))s-=300;
  if(v.localService===false)s+=4; if(String(v.lang||"").replace("_","-").toLowerCase()===(V_LANGTAG[lang]||"").toLowerCase())s+=3; if(v.default)s+=1; return s;}
let V_BEST={};
function vBest(lang){if(V_BEST[lang]!==undefined)return V_BEST[lang]; const vs=vVoices(lang).slice().sort((a,b)=>vVoiceScore(b,lang)-vVoiceScore(a,lang)); V_BEST[lang]=vs[0]||null; return V_BEST[lang];}
if(typeof window!=="undefined"&&window.speechSynthesis){try{window.speechSynthesis.addEventListener("voiceschanged",()=>{V_BEST={};});}catch(e){}}
/* Doğal ses ipucu: en iyi ses doğal/premium değilse platforma göre tek satır (kapatılabilir) */
function vPlat(){const ua=navigator.userAgent||"", pf=navigator.platform||""; if(/iP(hone|ad|od)/.test(ua)||(pf==="MacIntel"&&(navigator.maxTouchPoints||0)>1))return "ios"; if(/Android/i.test(ua))return "android"; if(/Mac/.test(pf))return "mac"; if(/Edg\//.test(ua))return "edge"; return "win";}
function vTipText(langs){langs=langs.filter(l=>{const v=vBest(l); return !(v&&V_NAT.test(v.name||""));}); if(!langs.length)return "";
  const ln=langs.map(l=>V_LANGN[l]).join(" / "), pl=vPlat();
  if(pl==="ios")return "Daha doğal ses: Ayarlar → Erişilebilirlik → Seslendirilen İçerik → Sesler → "+ln+" → 'Gelişmiş' ya da 'Premium' yazan sesi indir.";
  if(pl==="mac")return "Daha doğal ses: Sistem Ayarları → Erişilebilirlik → Seslendirilen İçerik → Sistem sesi → Sesleri yönet → "+ln+" → 'Gelişmiş' ya da 'Premium' sesi indir.";
  if(pl==="android")return "Daha doğal ses: Ayarlar → Google Konuşma Hizmetleri → ses verilerini yükle.";
  if(pl==="win")return "Daha doğal ses için uygulamayı Microsoft Edge'de aç.";
  return "";}
function vTipHtml(langs,where){if(!vTtsOk())return ""; langs=Array.isArray(langs)?langs:[langs]; const k="tydil.vtip."+(where||"x"); let off=false; try{off=localStorage.getItem(k)==="1";}catch(e){} if(off)return "";
  const t=vTipText(langs); return t?`<p class="vTip" data-vtip="${esc(k)}"><span>${esc(t)}</span><button type="button" data-vtip-x aria-label="İpucunu kapat">×</button></p>`:"";}
document.addEventListener("click",e=>{const b=e.target.closest("[data-vtip-x]"); if(!b)return; const p=b.closest("[data-vtip]"); if(!p)return; try{localStorage.setItem(p.dataset.vtip,"1");}catch(x){} p.remove();});

/* ===== Ayarlar → Ses kartı ===== */
const V_MIC_OPTS=[["it-IT","İtalyanca (it-IT)"],["en-GB","İngilizce · Birleşik Krallık (en-GB)"],["en-US","İngilizce · ABD (en-US)"],["tr-TR","Türkçe (tr-TR)"]];
function vVoices(lang){try{return (window.speechSynthesis.getVoices()||[]).filter(v=>(v.lang||"").toLowerCase().replace("_","-").startsWith(lang));}catch(e){return [];}}
function vSettingsMount(){if(document.getElementById("voiceCard"))return; const after=document.getElementById("backupCard")||document.querySelector("#tab-setup .card"); if(!after)return;
  const tog=(id,lbl,hint)=>`<label class="vcRow" for="${id}"><span class="vcTog"><input type="checkbox" id="${id}"><i></i></span><span class="vcLbl"><b>${lbl}</b>${hint?`<small>${hint}</small>`:""}</span></label>`;
  const sel=(id,lbl,opts)=>`<label class="fl" for="${id}">${lbl}</label><select class="inp" id="${id}">${opts}</select>`;
  after.insertAdjacentHTML("afterend",`<article class="card" id="voiceCard" aria-labelledby="voiceTitle">
    <h2 id="voiceTitle">Ses</h2>
    <p class="lead" style="margin-bottom:14px">Koç yanıtlarını sesli okur; cevabını mikrofona söylersin (konuşma yazıya çevrilir). Ses tanıma tarayıcının kendi servisidir; Chrome önerilir.</p>
    ${vMicOk()?"":`<p class="msg info vcMsg" role="status">${V_IOS_PWA?"iPhone ana ekran uygulamasında mikrofon çalışmaz; Safari'de açarsan çalışır. Sesli okuma burada da var.":V_SR?"Mikrofon bu dil için kapandı.":"Bu tarayıcıda sesli giriş yok; Chrome kullan. Sesli okuma çalışır."}</p>`}
    <div class="vcGrid">
      ${tog("vcAutoSpeak","Koçu sesli oku","Yanıt bitince okunur: Türkçe kısımlar Türkçe sesle, İtalyanca/İngilizce kısımlar kendi sesiyle.")}
      ${tog("vcHandsAuto","Konuşma modunda otomatik dinle","Konuşma (Oliver) ve Sesli tekrar (Chiara) bloklarında koç okuyunca mikrofon kendiliğinden açılır.")}
      <div class="vcField">${sel("vcAutoSend","Otomatik gönder",`<option value="auto">Ders modunda (varsayılan) — Pratik'te önce göster</option><option value="on">Her zaman</option><option value="off">Kapalı — ben Gönder'e basarım</option>`)}
        <p class="hint">Konuşma modunda cevap her zaman kendiliğinden gider.</p></div>
      <div class="vcField"><label class="fl" for="vcRate">Okuma hızı <output id="vcRateOut" for="vcRate"></output></label><input type="range" id="vcRate" min="0.6" max="1.3" step="0.05" aria-describedby="vcRateOut"></div>
      <div class="vcField"><label class="fl">Sesler</label><div id="vcTip"></div><div class="vcVoices" id="vcVoices"></div><p class="hint">Otomatik: cihazdaki en doğal ses seçilir (Natural, Premium, Gelişmiş). Listeden elle de seçebilirsin.</p></div>
      <div class="vcField"><label class="fl">Mikrofon dili</label><div class="vcMics">${["it","en","db"].map(k=>`<label><span>${esc(CC_AGENTS[k].name)}</span><select class="inp" id="vcMic-${k}" data-mic="${k}">${V_MIC_OPTS.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join("")}</select></label>`).join("")}</div></div>
      <div class="vcField"><div class="btnRow"><button type="button" class="btn btn-soft" id="vcTest" ${vMicOk()?"":"disabled"}>${ICON("speaking")}Mikrofonu dene</button><button type="button" class="btn btn-ghost" id="vcTestTts">Sesleri dinle</button></div><div class="vcOut" id="vcTestOut" role="status" aria-live="polite" hidden></div></div>
    </div></article>`);
  const card=document.getElementById("voiceCard");
  card.addEventListener("change",e=>{const t=e.target; if(!t)return;
    if(t.id==="vcAutoSpeak"){vSave({autoSpeak:t.checked}); if(!t.checked)vTtsCancel(); return;}
    if(t.id==="vcHandsAuto"){vSave({handsAuto:t.checked});return;}
    if(t.id==="vcAutoSend"){vSave({autoSend:t.value});return;}
    if(t.id==="vcRate"){vSave({rate:+t.value});return;}
    if(t.dataset.voice){const voices=Object.assign({},V.set.voices); if(t.value)voices[t.dataset.voice]=t.value; else delete voices[t.dataset.voice]; vSave({voices});return;}
    if(t.dataset.mic){const micLang=Object.assign({},V.set.micLang); if(t.value===V_MICLANG[t.dataset.mic])delete micLang[t.dataset.mic]; else micLang[t.dataset.mic]=t.value; vSave({micLang}); V.unsupported=false; return;}});
  card.addEventListener("input",e=>{if(e.target&&e.target.id==="vcRate"){const o=document.getElementById("vcRateOut"); if(o)o.textContent="×"+(+e.target.value).toFixed(2);}});
  card.addEventListener("click",async e=>{const b=e.target.closest("button"); if(!b)return;
    if(b.id==="vcTest"){const out=document.getElementById("vcTestOut"); out.hidden=false;
      if(V.sess){vListenAbort(true);return;}
      b.classList.add("on"); b.innerHTML=ICON("speaking")+"Dinliyorum… bitirmek için bas"; out.textContent="Konuş: "+(V_LANGN[{it:"it",en:"en",db:"tr"}[CC.agent]]||"Türkçe")+" ("+vMicLang()+")";
      const r=await voiceListen({onInterim:t=>{out.textContent="“"+t+"”";}});
      b.classList.remove("on"); b.innerHTML=ICON("speaking")+"Mikrofonu dene";
      if(r.text)out.innerHTML=`<b>Anlaşılan:</b> “${esc(r.text)}” <small>(${esc(vMicLang())})</small>`;
      else out.textContent=r.err==="not-allowed"?"Mikrofon izni yok: adres çubuğundaki kilit simgesinden Mikrofon → İzin ver.":r.err==="no-speech"?"Ses alınamadı. Düğmeye basınca hemen, biraz yüksek sesle konuş.":r.err==="language-not-supported"?"Bu cihaz bu dilde ses tanımıyor.":r.err==="network"?"Ses tanıma için internet gerekir.":"Mikrofon çalışmadı ("+r.err+").";
      return;}
    if(b.id==="vcTestTts"){const r=await voiceSpeak([{lang:"tr",t:"Merhaba Türab, ben böyle okuyorum."},{lang:"it",t:"Buongiorno, come stai?"},{lang:"en",t:"Good morning, how are you today?"}]); const out=document.getElementById("vcTestOut"); if(!r.done&&!r.cancelled){out.hidden=false; out.textContent="Bu tarayıcıda sesli okuma yok.";} return;}});
  vSettingsPaint(); if(vTtsOk()){try{window.speechSynthesis.addEventListener("voiceschanged",vSettingsPaint);}catch(e){}}}
function vSettingsPaint(){const card=document.getElementById("voiceCard"); if(!card)return; const s=V.set, q=id=>document.getElementById(id);
  if(q("vcAutoSpeak"))q("vcAutoSpeak").checked=!!s.autoSpeak; if(q("vcHandsAuto"))q("vcHandsAuto").checked=!!s.handsAuto; if(q("vcAutoSend"))q("vcAutoSend").value=s.autoSend;
  if(q("vcRate")){q("vcRate").value=String(s.rate); q("vcRateOut").textContent="×"+s.rate.toFixed(2);}
  ["it","en","db"].forEach(k=>{const el=q("vcMic-"+k); if(el)el.value=s.micLang[k]||V_MICLANG[k];});
  const vw=q("vcVoices"); if(vw){const prev=vw.dataset.sig||"", html=["tr","it","en"].map(l=>{const vs=vVoices(l), cur=s.voices[l]||"";
      return `<label><span>${V_LANGN[l]}</span><select class="inp" data-voice="${l}" aria-label="${V_LANGN[l]} sesi"><option value="">Otomatik${vs.length?" (en iyi tahmin)":" — ses bulunamadı"}</option>${vs.map(v=>`<option value="${esc(v.voiceURI)}"${v.voiceURI===cur?" selected":""}>${esc(v.name)}${v.localService===false?" · çevrimiçi":""}</option>`).join("")}</select></label>`;}).join("");
    if(prev!==html){vw.dataset.sig=html; vw.innerHTML=html;}}
  const tp=q("vcTip"); if(tp){const h=vTipHtml(["it","en"],"set"); if(tp.dataset.sig!==h){tp.dataset.sig=h; tp.innerHTML=h;}}}

/* ===== köprü (dd_chat.js ccHooks) ===== */
if(typeof ccHooks!=="undefined"){
  ccHooks.afterRun=vAfterRun;
  ccHooks.onSend=()=>{clearTimeout(V.sendT); V.sendT=0; vTtsCancel(); if(V.sess)vListenAbort(false); vInterim(null); if(V.state!=="idle")vState("idle"); V.hint="";};
  ccHooks.meta=text=>{if(!V.fromMic||!text)return null; const o={voice:1}; if(V.pron&&V.pron.target)o.pron={pct:V.pron.pct,target:V.pron.target}; V.fromMic=false; V.pron=null; return o;};
  ccHooks.beforeTts=()=>{if(V.sess)vListenAbort(false); if(V.tts)vTtsCancel(); clearTimeout(V.sendT); V.sendT=0; if(V.state!=="idle")vState("idle");};
  ccHooks.voiceURI=lang=>V.set.voices[lang]||"";
  ccHooks.rate=()=>V.set.rate;
  ccHooks.voiceOn=()=>({mic:vMicOk(),tts:vTtsOk(),speak:!!V.set.autoSpeak&&vTtsOk(),hands:V.hands,lang:vMicLang()});
  ccHooks.paint=vPaint;
  ccHooks.onAgent=()=>{voiceStop(); V.hint=""; V.err=""; vPaint();};
  ccHooks.dersBlock=vDersBlock;
  ccHooks.dersClose=vDersClose;
}
/* Esc: mikrofon açıkken (dinleme/gönderim bekleme) yalnızca sesi kapatır — dersten çıkmaz; okuma sırasında okumayı keser ve Esc normal işler (Ders modunda çıkış) */
document.addEventListener("keydown",e=>{if(e.key!=="Escape"||e.isComposing)return; if(V.state==="idle"&&!V.hands&&!V.tts)return;
  const mic=V.state==="listening"||V.state==="processing"; voiceStop(); vSetHands(false); const ta=ccq("#ccIn"); if(ta&&ta.classList.contains("vc-interim")){ta.value="";ta.classList.remove("vc-interim");}
  if(mic){e.preventDefault(); e.stopImmediatePropagation();}},true);
document.addEventListener("visibilitychange",()=>{if(document.hidden){clearTimeout(V.sendT); V.sendT=0; if(V.sess)vListenAbort(false); if(V.state!=="idle"&&V.state!=="speaking")vState("idle");}});
window.addEventListener("pagehide",()=>{try{vTtsCancel();}catch(e){}});
vMount(); vMountDers(); vSettingsMount();
/* Dışa açık (üniteler ve sonraki aşamalar) */
const VOICE_API={listen:voiceListen,stop:voiceStop,speak:voiceSpeak,score:voiceScore,scoreInfo:voiceScoreInfo,segments:vSegments,setHands:vSetHands,get state(){return {state:V.state,hands:V.hands,mic:vMicOk(),tts:vTtsOk(),settings:Object.assign({},V.set)};}};
window.TYDIL_VOICE=VOICE_API;
{const attach=()=>{if(window.TYDIL&&!window.TYDIL.voice)window.TYDIL.voice=VOICE_API;}; attach(); document.addEventListener("DOMContentLoaded",attach); setTimeout(attach,0);}
