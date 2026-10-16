/* ---------- GÜNÜN SÖZÜ ---------- */
const QUOTES={
 it:[["L'appetito vien mangiando.","İştah yedikçe gelir; başladıkça açılır."],["Sbagliando s'impara.","Hata yaparak öğrenilir."],["Piano piano si va lontano.","Yavaş yavaş uzağa gidilir."],
     ["Meglio tardi che mai.","Geç olsun, güç olmasın."],["Volere è potere.","İsteyen yapar."],["Roma non fu fatta in un giorno.","Roma bir günde kurulmadı."],
     ["Chi va piano va sano e va lontano.","Yavaş giden sağlam ve uzağa gider."],["Il buongiorno si vede dal mattino.","İyi gün sabahından belli olur."]],
 en:[["Practice makes perfect.","Pratik mükemmelleştirir."],["Every expert was once a beginner.","Her usta bir zamanlar acemiydi."],["Little by little, one travels far.","Azar azar, insan uzağa gider."],
     ["Where there's a will, there's a way.","İsteyen yolunu bulur."],["Slow and steady wins the race.","Yavaş ama istikrarlı olan kazanır."],["Rome wasn't built in a day.","Roma bir günde kurulmadı."]]
};
/* ---------- YARDIMCILAR ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const dkey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
/* Takvim günü her zaman İstanbul saatine göre (cihaz saat dilimi yanlış ya da yurt dışındayken de seri/plan kaymasın) */
const TZ="Europe/Istanbul";
let tzFmt=null; try{tzFmt=new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"});}catch(e){tzFmt=null;}
/* Sık çağrılır (her çizimde onlarca kez): 1 sn önbellek; gün dönümü en geç 1 sn gecikmeyle görülür */
let nowMemo={at:-1e15,v:null};
function nowTR(){const ms=Date.now(); if(nowMemo.v&&ms>=nowMemo.at&&ms-nowMemo.at<1000) return nowMemo.v; const v=nowTR0(); nowMemo={at:ms,v}; return v;}
function nowTR0(){const d=new Date(); if(!tzFmt) return {key:dkey(d),hour:d.getHours()};
  try{const p={};tzFmt.formatToParts(d).forEach(x=>p[x.type]=x.value);return {key:p.year+"-"+p.month+"-"+p.day,hour:(+p.hour)%24};}catch(e){return {key:dkey(d),hour:d.getHours()};}}
const today=()=>nowTR().key;
const addDays=(k,n)=>{const d=new Date(k+"T12:00:00");d.setDate(d.getDate()+n);return dkey(d);};
const wdOf=k=>new Date(k+"T12:00:00").getDay();
const weekday=()=>wdOf(today());
const dayIdx=()=>Math.round(Date.parse(today()+"T00:00:00Z")/864e5);
const INTERVAL=[0,1,2,4,8,16,32];
const DAYS=["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
const LANG={it:"İtalyanca",en:"İngilizce"};
const fmtMemo=new Map();
const fmtDay=(k,opt)=>{const mk=k+"|"+JSON.stringify(opt||0); if(fmtMemo.has(mk)) return fmtMemo.get(mk);
  let v; try{v=new Date(k+"T12:00:00").toLocaleDateString("tr-TR",opt||{day:"numeric",month:"long",weekday:"long"});}catch(e){v=k;} if(fmtMemo.size>5000)fmtMemo.clear(); fmtMemo.set(mk,v); return v;};
const inDays=n=>n<=0?"bugün":n===1?"yarın":n+" gün sonra";
const fmtMin=m=>m<60?m+" dk":Math.floor(m/60)+" sa"+(m%60?" "+(m%60)+" dk":"");
function msg(el,kind,text){el.innerHTML=text?`<div class="msg ${kind}">${esc(text)}</div>`:"";}
async function copyText(text,btn,pre){
  try{await navigator.clipboard.writeText(text);const o=btn.innerHTML;btn.innerHTML=ICON("check")+"Kopyalandı";setTimeout(()=>btn.innerHTML=o,1800);return true;}
  catch(e){ if(pre){pre.hidden=false;const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);} return false; }
}
/* ---------- DURUM ---------- */
let db=null, dbState="wait"; const S={sessions:[],cards:[],topics:{},program:null,habits:{},exams:[],days:{}}; let reviewLang="it", sylLang="it", rq=[], rqi=0, flipped=false; const reviewed=new Set();
function curTopic(lang){const list=SYL[lang];return list.find(t=>(S.topics[t[1]]||{}).status==="doing")||list.find(t=>(S.topics[t[1]]||{}).status!=="done")||null;}
function dueCards(lang){const t=today();return S.cards.filter(c=>c.lang===lang&&(c.due||"")<=t);}
/* Seri: günün planlanan dakikasının en az yarısı (60 dk plan → 30 dk) kayıtlıysa o gün sayılır */
const STREAK_MIN=30;
function dayCounts(k){return (minsByDay()[k]||0)>=STREAK_MIN;}
function streak(){const mb=minsByDay();let n=0,k=today();if(!((mb[k]||0)>=STREAK_MIN))k=addDays(k,-1);while((mb[k]||0)>=STREAK_MIN){n++;k=addDays(k,-1);}return n;}
const streakTxt=()=>{const st=streak(), m=minsByDay()[today()]||0; return st?"Seri · "+st+" gün":m>0?"Seri · bugün başladın":"Seri · 0 gün";};
/* Tekrar birikmesi: bugünden önce eklenip vadesi gelmiş kartlar (bugün öğrenilenler hariç) */
/* Kalan kart: aynı metin ve süre formülü kapakta ve bitti ekranında (8 sn/kart) */
const cardMin=n=>Math.max(1,Math.ceil(n*8/60));
const cardsLeftTxt=n=>"Kalan kartları bitir: "+n+" (~"+cardMin(n)+" dk)";
function backlogCards(lang){const t=today();return S.cards.filter(c=>(!lang||c.lang===lang)&&(c.due||"")<=t&&!(c.added&&trKey(c.added)===t)).length;}
/* Arayüzde müfredat kodu gösterilmez: "it05 · essere" → "essere", tek başına "it05" → konunun adı, "it01–it08" → "Hafta 1–4 konuları" */
function noId(v){let s=String(v==null?"":v);
  s=s.replace(/\b(?:it|en)(\d{2})\s*[–-]\s*(?:it|en)(\d{2})\b/gi,(m,a,b)=>{const wa=weekOfTopic("it"+a), wb=weekOfTopic("it"+b);return wa&&wb?"Hafta "+wa+"–"+wb+" konuları":"konu "+(+a)+"–"+(+b);});
  return s.replace(/\b((?:it|en)\d{2})\b(\s*[·:–-]\s*|\s+)?(?=(.?))/gi,(m,id,sep,nx)=>{if(sep&&/[A-Za-zÇĞİÖŞÜçğıöşü(]/.test(nx))return ""; const t=topicById(id.toLowerCase()); return t?t[2]+(sep||""):"";});}
function topMistakes(lang,limit){const m={};S.sessions.filter(s=>!lang||s.lang===lang).forEach(s=>(s.mistakes||[]).forEach(x=>{const k=String(x).trim();if(k)m[k]=(m[k]||0)+1;}));return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,limit||5);}
function lastNext(){const s=[...S.sessions].sort((a,b)=>((b.date||"")+(b.created||"")).localeCompare((a.date||"")+(a.created||"")));const f=s.find(x=>x.next);return f?f.next:"";}
/* Dakika anahtarları: eski satırlarda "sesli" yok → 0 sayılır */
const MIN_KEYS=["kelime","gramer","okuma","sesli","speaking"];
/* Gerçek dakika (koç kaydı), blok başına planla sınırlı */
function realDone(ps){const d=doneToday();return ps.reduce((a,b)=>a+Math.min(+(d[b.l]||{})[b.k]||0,b.dk),0);}
function doneToday(){const d={it:{},en:{}};S.sessions.filter(s=>s.date===today()).forEach(s=>{const m=s.mins||{};MIN_KEYS.forEach(k=>{d[s.lang][k]=(d[s.lang][k]||0)+(+m[k]||0);});});return d;}
function minsByDay(){const m={};S.sessions.forEach(s=>{m[s.date]=(m[s.date]||0)+(s.total||0);});return m;}
function weekStart(){const d=new Date(today()+"T12:00:00");const wd=(d.getDay()+6)%7;return addDays(today(),-wd);}
/* İkisi modu = günlük 60 dk: İT 45 (kelime 10 · gramer 20 · okuma-yazma 10 · sesli tekrar 5) + EN 15. Pazar 60: İT 40 (kartlar + mini sınav; sınav haftası checkpoint/final) + EN 20 */
/* ---------- GÜNÜN DİL SEÇİMİ ----------
   İkisi (45 İT + 15 EN) · Sadece İtalyanca (60) · Sadece İngilizce (60). Cihazda localStorage "tydil-mode" {date,mode,at} + "tydil-mode-last"
   (yeni günün varsayılanı = son seçim), kayıtta days/<tarih> {mode,modeAt}; en yeni seçim (modeAt) geçerli. */
const MODES={both:"İkisi",it:"Sadece İtalyanca",en:"Sadece İngilizce"};
const DM={date:"",mode:"both",at:0};
function dmLoad(){const t=today(); if(DM.date===t)return; DM.date=t; DM.mode=""; DM.at=0;
  try{const v=localStorage.getItem("tydil-mode"); const o=v?JSON.parse(v):null; if(o&&o.date===t&&MODES[o.mode]){DM.mode=o.mode;DM.at=+o.at||0;}}catch(e){}
  if(!DM.mode){let last=""; try{const v=localStorage.getItem("tydil-mode-last"); last=v||"";}catch(e){last="";} DM.mode=MODES[last]?last:"both"; DM.at=0;}}
function dayMode(){dmLoad(); const r=S.days&&S.days[DM.date]; if(r&&MODES[r.mode]&&(+r.modeAt||0)>DM.at) return r.mode; return DM.mode;}
function setDayMode(m){if(!MODES[m])return; dmLoad(); DM.mode=m; DM.at=Date.now();
  try{localStorage.setItem("tydil-mode",JSON.stringify({date:DM.date,mode:m,at:DM.at}));}catch(e){}
  try{localStorage.setItem("tydil-mode-last",m);}catch(e){}
  if(typeof daysSave==="function") daysSave();}
/* Bitirildi işaretleri (focus_logic doldurur): plan birleştirmede kullanılır */
let finKeysFn=null;
const finKeys=()=>{try{return finKeysFn?finKeysFn():new Set();}catch(e){return new Set();}};
/* ---------- PLAN ---------- */
/* Seçili moda göre günün blokları. Blok kimliği dil-tür (it-kelime, en-speaking): gün içinde mod değişse de aynı kalır. */
function planMode(mode){const wd=weekday();
  if(wd===0){const sk=sundayKind();
    if(mode==="en") return [
      {l:"en",k:"kelime",dk:15,t:"Kalıp tekrarı",s:"Haftanın İngilizce kalıp ve ifadeleri: önce tekrar kartları, sonra karışık kullanım."},
      {l:"en",k:"gramer",dk:15,t:"Gramer tekrarı",s:"Haftanın gramer odağından karışık alıştırma, sonra hataların tekrarı."},
      {l:"en",k:"speaking",dk:30,t:"Serbest konuşma",s:"İngilizce, haftanın temalarıyla serbest sohbet."}];
    const io=mode==="it";
    if(sk.kind==="final") return [
      {l:"it",k:"gramer",dk:40,t:"Final · A1 sınav simülasyonu",s:"Okuma, gramer, kelime ve yazma; 30 puan. Dinleme bölümü sayfada yapılamaz."},
      io?{l:"it",k:"kelime",dk:20,t:"Kelime tekrarı",s:"Sınavda zorlandığın kelimeler ve haftanın kartları."}
        :{l:"en",k:"speaking",dk:20,t:"Serbest konuşma",s:"İngilizce, sadece akıcılık için."}];
    if(sk.kind==="checkpoint") return [
      {l:"it",k:"kelime",dk:io?15:10,t:"Kelime tekrarı",s:"Bu haftanın İtalyanca kartları, hızlı tur."},
      {l:"it",k:"gramer",dk:30,t:sk.cp.name+" sınavı",s:sk.cp.what+": "+sk.cp.scope[0]+"–"+sk.cp.scope[sk.cp.scope.length-1]+", 20 soru (kelime, gramer, okuma, yazma)."}].concat(io?
      [{l:"it",k:"okuma",dk:15,t:"Hata ve okuma tekrarı",s:"Sınavdaki hatalarının tekrarı ve kısa bir metin."}]:
      [{l:"en",k:"speaking",dk:20,t:"Serbest konuşma",s:"İngilizce, sadece akıcılık için."}]);
    return [
    {l:"it",k:"kelime",dk:io?25:15,t:"Kelime tekrarı",s:"Bu haftanın bütün İtalyanca kartlarını tekrar et."},
    {l:"it",k:"gramer",dk:io?35:25,t:"Gramer mini sınavı",s:"Haftanın konularından 10 soru, sonra hataların tekrarı."}].concat(io?[]:
    [{l:"en",k:"speaking",dk:20,t:"Serbest konuşma",s:"İngilizce, sadece akıcılık için."}]);}
  const en=enToday();
  if(mode==="en"){const ed=backlogCards("en"); return [
    {l:"en",k:"kelime",dk:10,t:"Kelime & ifade",s:(ed?ed+" İngilizce kartı tekrar et, sonra ":"")+"haftanın konusu için 5–8 yeni kalıp ve ifade."},
    {l:"en",k:"gramer",dk:15,t:"Gramer",s:en.t?en.t[2]+": "+en.t[3]+".":"Gramer tekrarı."},
    {l:"en",k:"okuma",dk:10,t:"Okuma-dinleme",s:"150–250 kelimelik B1+/B2 metin: önce hoparlörle dinle, sonra oku; 3 anlama sorusu."},
    {l:"en",k:"speaking",dk:25,t:"Konuşma",s:en.theme+"."}];}
  /* Yük ölçüsü: bugünden önce eklenmiş, vadesi gelmiş kartlar (bugün öğrenilenler hariç) */
  const x=itToday(), it=x.t, due=backlogCards("it"), late=x.p&&x.p.week>=10, io=mode==="it";
  const gs=x.mode==="review"?"Tekrar: "+x.set.map(id=>id+" "+topicById(id)[2]).join(", ")+".":it?it[2]+": "+it[3]+".":"Eski konuları tekrar et.";
  /* Tekrar yükü büyüdükçe yeni kelime azalır (kartlar çığ gibi birikmesin): >60 → 0, >30 → 6, değilse 10 */
  const nw=due>60?0:due>30?6:10;
  const kel={l:"it",k:"kelime",dk:io?15:10,t:"Kelime",nw,s:nw?(due?due+" eski kelimeyi tekrar et, ":"")+nw+" yeni kelime öğren.":"Önce birikmiş "+due+" kartı tekrar et; bugün yeni kelime yok."};
  const gra={l:"it",k:"gramer",dk:io?25:20,t:"Gramer",s:gs};
  /* it01 (sesler) günü: Chiara önce sesleri yapar → arayüz sırası da Gramer → Kelime */
  const first=it&&it[1]==="it01"&&x.mode!=="review"?[gra,kel]:[kel,gra];
  return [
    first[0],first[1],
    {l:"it",k:"okuma",dk:io?12:10,t:"Okuma ve yazma",s:late?"Kısa bir metin oku, geçmiş zamanla 4–6 cümle yaz (dün ne yaptın).":"Kısa bir metin oku, 4–6 cümle yaz."},
    {l:"it",k:"sesli",dk:io?8:5,t:"Sesli tekrar",s:"Günün 5–8 cümlesini hoparlörle dinle, her birini 3 kez sesli söyle, kendine 1–5 puan ver."}].concat(io?[]:
    [{l:"en",k:"speaking",dk:15,t:"Konuşma",s:en.theme+"."+(en.t?" Gramer odağı: "+en.t[2]+".":"")}]);
}
/* Kalan blokları kalan dakikaya oranla sığdır (blok başına en az 5 dk) */
function fitPlan(rest,rem){if(!rest.length||rem<=0)return []; const sum=rest.reduce((a,b)=>a+b.dk,0); if(sum<=rem)return rest;
  const out=rest.map(b=>Object.assign({},b,{dk:Math.max(5,Math.round(b.dk*rem/sum))})); const diff=rem-out.reduce((a,b)=>a+b.dk,0);
  if(diff){const big=out.reduce((m,b)=>b.dk>m.dk?b:m,out[0]); big.dk=Math.max(5,big.dk+diff);} return out;}
/* Gün içinde mod değişirse: başka moddan bitmiş bloklar sayılmaya devam eder, yeni modun kalan blokları günün 60 dk'sına sığdırılır */
function planFor(mode){mode=mode||dayMode(); const base=planMode(mode);
  const d=doneToday(), fk=finKeys(), kid=b=>b.l+"-"+b.k, isDone=b=>(+(d[b.l]||{})[b.k]||0)>=b.dk*0.5||fk.has(kid(b));
  const keys=new Set(base.map(kid)), kept=[];
  Object.keys(MODES).filter(m=>m!==mode).forEach(m=>planMode(m).forEach(b=>{const k=kid(b); if(!keys.has(k)&&isDone(b)){kept.push(Object.assign({},b,{kept:1}));keys.add(k);}}));
  if(!kept.length) return base;
  const total=base.reduce((a,b)=>a+b.dk,0), used=kept.concat(base.filter(isDone)).reduce((a,b)=>a+b.dk,0);
  const rest=fitPlan(base.filter(b=>!isDone(b)),total-used);
  return kept.concat(base.filter(isDone),rest);
}
/* Koçlar artık gerçek dakikayı yazar: kısa ama bitmiş blok (planın yarısı) tamam sayılır */
function planState(){const p=planFor(), d=doneToday(); let nextSet=false;
  return p.map(b=>{const did=(d[b.l][b.k]||0)>=b.dk*0.5; let st=did?"done":"wait"; if(!did&&!nextSet){st="next";nextSet=true;} return Object.assign({st},b);});}
function greet(){const h=nowTR().hour;return h<5?"İyi geceler":h<12?"Günaydın":h<18?"İyi günler":"İyi akşamlar";}
function chatReady(){const c=$("#coachChat");return !!(c&&c.children.length)&&!(typeof CC!=="undefined"&&CC.locked);}
function renderHero(){
  const wd=weekday(), x=itToday(), it=x.t, st=streak(), ps=dayBlocks(), total=ps.reduce((a,b)=>a+b.dk,0), p=x.p, sk=wd===0?sundayKind():null;
  const doneMin=realDone(ps), nx=ps.find(b=>b.st==="next"), allDone=!nx, started=ps.some(b=>b.st==="done")||doneMin>0, left=ps.filter(b=>b.st!=="done").reduce((a,b)=>a+b.dk,0);
  const due=dueCards("it").length+dueCards("en").length;
  $("#dateLine").textContent=greet()+" Türab · "+fmtDay(today());
  $("#barDate").textContent=fmtDay(today(),{day:"numeric",month:"short",weekday:"short"});
  $("#streakChip").innerHTML=ICON("flame")+esc(streakTxt());
  $("#streakChip").title=st?st+" gündür aralıksız çalışıyorsun (günde en az "+STREAK_MIN+" dk). Bir gün atlarsan sıfırlanır.":"Bugün en az "+STREAK_MIN+" dk çalışırsan seri başlar.";
  const nxt=()=>`Sıradaki: <b>${esc(blockName(nx))}</b> · ${nx.dk} dk.`, mode=dayMode(), enS=mode==="it"?"":" Sonra 20 dk İngilizce.";
  let kicker, title, sub, go;
  if(allDone){kicker=ICON("check")+"Bugünün "+total+" dakikası tamam"; title="Bugün tamam.";
    sub=(due?due+" kart kaldı; ders tamam. ":"")+"Yarın devam edersen seri "+(st+1)+" gün olur.";
    go=due?cardsLeftTxt(due):"Koçlarla serbest çalış";}
  else if(mode==="en"){const e=enToday(), wk=p&&p.week>=1&&!p.finished?"Hafta "+p.week+" · ":"";
    kicker=FLAG("en")+" Sadece İngilizce · "+wk+(wd===0?"haftalık tekrar":"gramer odağı"); title=wd===0?"Haftanın İngilizce tekrarı":esc(e.t?e.t[2]:"Serbest pratik");
    sub=started?nxt():(wd===0?"Kalıplar, gramer tekrarı ve serbest konuşma.":esc(e.theme)+".")+" İtalyanca bugün yok; program ilerlemesi buna göre hesaplanır.";
    go=started?"Derse devam et":"Bugünkü dersi başlat ("+total+" dk)";}
  else if(wd===0&&sk.kind!=="normal"){kicker=FLAG("it")+` Pazar · Hafta ${p.week} sınav günü`; title=esc(sk.cp.name+" · "+sk.cp.what);
    sub=started?nxt():sk.kind==="final"?"30 puan; Chiara soruları tek tek sorar ve puanlar."+enS:esc(noId(sk.cp.scope[0]+"–"+sk.cp.scope[sk.cp.scope.length-1]))+": 20 soru."+enS;
    go=started?"Derse devam et":"Sınava başla ("+total+" dk)";}
  else if(wd===0){kicker=FLAG("it")+" Pazar · haftalık tekrar"+(p&&p.week>=1&&!p.finished?" · Hafta "+p.week:""); title="Haftanın tekrarı";
    sub=started?nxt():"Haftanın kelimeleri, mini sınav"+(mode==="it"?"":", 20 dk İngilizce")+". Yeni konu yok.";
    go=started?"Derse devam et":"Bugünkü dersi başlat ("+total+" dk)";}
  else if(x.mode==="review"){kicker=FLAG("it")+` Hafta ${p.week} · tekrar günü`; title="Tekrar: "+esc(x.set.map(id=>topicById(id)[2]).slice(0,2).join(", "))+(x.set.length>2?" …":"");
    sub=started?nxt():`Gramer bloğu şu konuları pekiştirir: ${esc(x.set.map(id=>topicById(id)[2]).join(", "))}.`;
    go=started?"Derse devam et":"Bugünkü dersi başlat ("+total+" dk)";}
  else if(it){const doing=(S.topics[it[1]]||{}).status==="doing";
    const mk={lead:"Isınma · Hafta 1 konusu",week:`Hafta ${p&&p.week} · bu haftanın konusu`,catchup:`Telafi · Hafta ${weekOfTopic(it[1])} konusu`,ahead:`Öne geçiyorsun · Hafta ${weekOfTopic(it[1])} konusu`}[x.mode];
    kicker=FLAG("it")+` İtalyanca ${it[0]} · ${mk?mk+(doing?" (devam)":""):doing?"devam eden konu":"yeni konu"}`; title=esc(it[2]);
    sub=started?nxt():esc(it[3])+"."+(mode==="it"?" İngilizce bugün yok.":"");
    go=started?"Derse devam et":"Bugünkü dersi başlat ("+total+" dk)";}
  else {kicker=FLAG("it")+" İtalyanca müfredat bitti"; title="Serbest pratik"; sub="Bugün tekrar, okuma ve konuşma."; go=started?"Derse devam et":"Bugünkü dersi başlat ("+total+" dk)";}
  if(started&&!allDone) go+=` · ${left} dk kaldı`;
  renderModeSeg(allDone);
  $("#heroKicker").innerHTML=kicker; $("#heroTitle").innerHTML=title; $("#heroSub").innerHTML=sub;
  $("#hero").classList.toggle("isDone",allDone);
  const g=$("#btnGo"); g.innerHTML=ICON(allDone?(due?"repeat":"chat"):"play")+`<span>${esc(go)}</span>`;
  g.className="btn btn-big goBtn "+(allDone&&!due?"btn-soft":"btn-primary");
  const dc=$("#dueChip"); dc.hidden=allDone||!due; dc.parentElement.hidden=dc.hidden; dc.innerHTML=ICON("repeat")+`Bugün ${due} kelime tekrarı`;
  const kgOn=!!($("#keyGate")&&!$("#keyGate").hidden);
  $("#heroHint").textContent=kgOn?"":!chatReady()?(typeof CC!=="undefined"&&CC.locked===CC_NOKEY?"Koçlar kilitli: Ayarlar → Anahtar'dan API anahtarı gir. Anahtarsız Dersler ve kartlar çalışır.":"Sohbet kapalı; düğme Ayarlar'ı açar. Dersi uygulama dışında yaptıysan TYDIL kodunu Ayarlar → Gelişmiş'e yapıştır."):"";
  renderMeter(ps,total,doneMin); renderDayPlan(); fitBarDate();   /* seri çipi çizildikten sonra: sığmıyorsa tarih gizli */
}
/* Günün dil seçimi: kapakta, başlat düğmesinin üstünde 3'lü seçim */
function modeSegHtml(m,label,lid){const opt=[["both","İkisi · 60 dk","önerilen","İkisi: 45 dk İtalyanca, 15 dk İngilizce"],["it","Sadece İtalyanca","60 dk","Sadece İtalyanca, 60 dakika"],["en","Sadece İngilizce","60 dk","Sadece İngilizce, 60 dakika"]];
  return `<span class="msL" id="${lid||"modeL"}">${label||"Bugün:"}</span><div class="msB">${opt.map(o=>`<button type="button" role="radio" data-mode="${o[0]}" aria-checked="${o[0]===m}" aria-label="${o[3]}" tabindex="${o[0]===m?0:-1}" class="${o[0]===m?"on":""}"><b>${o[1]}</b><small>${o[2]}</small></button>`).join("")}</div>`;}
function renderModeSeg(allDone){const el=$("#modeSeg"); if(!el)return; el.hidden=!!allDone; if(allDone)return; const html=modeSegHtml(dayMode());
  if(el.dataset.sig!==html){el.dataset.sig=html; el.innerHTML=html;}}
/* Ölçer: koçun kaydettiği gerçek dakika / plan (kalan dakika yalnızca düğmede yazar) */
/* Üst çubuktaki tarih sığmıyorsa (kesik "8 Eki Pe…") hiç gösterme */
/* Tarih ya tam görünür ya hiç: kutusuna sığmıyorsa (kesik "9 Eki Cu…" olmasın) gizlenir */
function fitBarDate(){const bd=$("#barDate"); if(!bd)return; bd.hidden=false; const side=bd.parentElement; if(!side)return; if(bd.getBoundingClientRect().right>side.getBoundingClientRect().right+0.5) bd.hidden=true;}
window.addEventListener("resize",()=>{clearTimeout(fitBarDate._t);fitBarDate._t=setTimeout(fitBarDate,120);});
function renderMeter(ps,total,doneMin){
  $("#meter").innerHTML=`<div class="meterTop"><b>${doneMin} <small>/ ${total} dk</small></b><span>${doneMin>=total?"Günlük hedef tamam":"kayıtlı gerçek süre"}</span></div>
    <div class="segbar" role="img" aria-label="Bugün ${total} dakikanın ${doneMin} dakikası tamam">${ps.map(b=>`<i class="${b.l} ${b.st}" style="--w:${b.dk}" title="${esc(b.t)} · ${b.dk} dk"></i>`).join("")}</div>`;
}
function renderPlan(){
  const ps=dayBlocks(), doneN=ps.filter(b=>b.st==="done").length, left=ps.filter(b=>b.st!=="done").reduce((a,b)=>a+b.dk,0);
  const lbl={done:ICON("check")+"Tamam",next:"Sırada",wait:"Bekliyor"};
  $("#todayTitle").textContent="Bugünün "+(NUMW[ps.length]||ps.length)+" bloğu";
  $("#todaySide").textContent=doneN===ps.length?"Hepsi tamam.":doneN+" / "+ps.length+" blok tamam · "+left+" dk kaldı";
  $("#plan").innerHTML=ps.map(b=>`<div class="row ${b.l} ${b.st}"><span class="bi">${ICON(b.st==="done"?"check":b.k)}</span>
    <div><h3>${FLAG(b.l)}${esc(b.t)} <span class="dk">· ${b.dk} dk</span></h3><p>${esc(noId(b.s))}</p></div><span class="st ${b.st}">${lbl[b.st]}</span></div>`).join("");
  const di=dueCards("it").length, de=dueCards("en").length, due=di+de, el=$("#dueCard"); if(!el) return;
  el.classList.toggle("calm",!due);
  el.innerHTML=!S.cards.length
    ?`<span class="di">${ICON("deck")}</span><div class="dt"><b>Henüz kelime kartın yok</b><span>Koçun öğrettiği kelimeler kendiliğinden kart olur.</span></div><button class="btn btn-soft btn-sm" data-go="cards" data-add>${ICON("plus")}Kendin ekle</button>`
    :due?`<span class="di">${ICON("repeat")}</span><div class="dt"><b>Bugün ${due} kelime tekrarı seni bekliyor</b><span><em>${FLAG("it")}${di} İtalyanca</em><em>${FLAG("en")}${de} İngilizce</em><em>${ICON("clock")}yaklaşık ${Math.max(1,Math.ceil(due*8/60))} dk</em></span></div><button class="btn btn-accent btn-sm" data-go="cards">Tekrar et${ICON("arrow")}</button>`
    :`<span class="di">${ICON("check")}</span><div class="dt"><b>Bugün tekrar bekleyen kelime yok</b><span>${S.cards.length} kartın var. Sıradaki tekrar ${esc(fmtDay(S.cards.map(c=>c.due).filter(Boolean).sort()[0]||addDays(today(),1),{day:"numeric",month:"long"}))}.</span></div>`;
}
function startMessage(){
  const p=planFor(), x=itToday(), it=x.t, en=enToday().t, dIt=dueCards("it").slice(0,20), dEn=dueCards("en").slice(0,10), pi=x.p;
  const mIt=topMistakes("it",5).map(x=>x[0]), mEn=topMistakes("en",5).map(x=>x[0]), nx=lastNext();
  const L=["BUGÜNKÜ DERS — "+today()+" ("+DAYS[weekday()]+")",""];
  if(pi) L.push(pi.finished?"Program: 12 haftalık yoğun program tamamlandı.":pi.week<1?"Program: yoğun 12 hafta · ısınma, Hafta 1 "+pi.anchor+" başlıyor.":"Program: yoğun 12 hafta · Hafta "+pi.week+"/12 · Gün "+pi.day+"/84 · bu hafta "+pi.road.it.join(", ")+(pi.road.cp?" + "+pi.road.cp.name+" ("+pi.road.cp.what+")":"")+" · durum: "+(pi.diff<0?(-pi.diff)+" konu geride":pi.diff>0?pi.diff+" konu önde":"planda"),"");
  L.push("Plan ("+p.reduce((a,b)=>a+b.dk,0)+" dk):");
  p.forEach(b=>L.push("- ["+(b.l==="it"?"İT":"EN")+"] "+b.dk+" dk · "+b.t+" — "+b.s));
  L.push("","İtalyanca gramer konusu: "+(x.mode==="review"?"tekrar günü — "+x.set.join(", "):it?it[1]+" "+it[2]+" ("+it[3]+")"+((S.topics[it[1]]||{}).status==="doing"?" — devam ediyoruz":" — yeni konu"):"tekrar"));
  L.push("İngilizce gramer odağı: "+(en?en[1]+" "+en[2]:"serbest"));
  L.push("Tekrar edilecek İtalyanca kelimeler: "+(dIt.length?dIt.map(c=>c.f+" ("+c.tr+")").join(", "):"yok, yeni kelimeyle başla"));
  if(dEn.length) L.push("Tekrar edilecek İngilizce kalıplar: "+dEn.map(c=>c.f+" ("+c.tr+")").join(", "));
  if(mIt.length) L.push("İtalyancada tekrarlayan hatalarım: "+mIt.join("; "));
  if(mEn.length) L.push("İngilizcede tekrarlayan hatalarım: "+mEn.join("; "));
  if(nx) L.push("Geçen seanstan not: "+nx);
  L.push("","Talimatındaki akışla dersi başlat. Seans sonunda TYDIL özet kodunu ver.");
  return L.join("\n");
}
/* ---------- İLERLEME ---------- */
function weekMins(){const mb=minsByDay(), ws=weekStart(); let wk=0; for(let i=0;i<7;i++) wk+=mb[addDays(ws,i)]||0; return wk;}
function renderGoal(){
  const wk=weekMins(), ps=planState(), total=ps.reduce((a,b)=>a+b.dk,0), doneMin=realDone(ps);
  const md=dayMode(), mdTxt=md==="it"?"Bugün sadece İtalyanca (60 dk)":md==="en"?"Bugün sadece İngilizce (60 dk)":"45 dk İtalyanca + 15 dk İngilizce konuşma";
  $("#goal").innerHTML=`<div class="goalTop"><h2>Günlük hedef: 60 dakika<small>${mdTxt}, haftada 420 dk · kayıtlı gerçek süre</small></h2></div>
    <div class="gbar"><div class="gl">Bugün<span>${doneMin} / ${total} dk</span></div><div class="pbar blue" role="img" aria-label="Bugün ${doneMin} / ${total} dakika"><span style="width:${Math.min(100,Math.round(doneMin/total*100))}%"></span></div></div>
    <div class="gbar"><div class="gl">Bu hafta<span>${wk} / 420 dk${wk>=420?" · hedef tamam":" · kalan "+(420-wk)+" dk"}</span></div><div class="pbar" role="img" aria-label="Bu hafta ${wk} / 420 dakika"><span style="width:${Math.min(100,Math.round(wk/420*100))}%"></span></div></div>`;
}
function renderStats(){
  const st=streak(), tot=S.sessions.reduce((a,s)=>a+(s.total||0),0), due=dueCards("it").length+dueCards("en").length, solid=S.cards.filter(c=>(c.box||1)>=6).length;
  const tb=$("#tabDue"); tb.hidden=!due; tb.textContent=due; tb.setAttribute("aria-label",due+" kelime tekrar bekliyor");
  const days=new Set(S.sessions.map(s=>s.date)).size;
  $("#stats").innerHTML=[
    [S.sessions.length+"","Oturum",S.sessions.length?days+" farklı günde":"İlk dersten sonra sayılır"],
    [tot>=60?Math.floor(tot/60)+`<small>sa</small>`+(tot%60?" "+(tot%60)+`<small>dk</small>`:""):tot+`<small>dk</small>`,"Toplam süre",tot?"Başladığından beri":"Henüz çalışma yok"],
    [S.cards.length+"","Kelime",S.cards.length?solid+" tanesi kalıcı hafızada":"Koç öğrettikçe eklenir",due?`<button class="btn btn-accent btn-sm" data-go="cards">${due} tekrar</button>`:""],
    [st+`<small>gün</small>`,"Seri",st?"Seri · "+st+" gün · günde en az "+STREAK_MIN+" dk":"Günde en az "+STREAK_MIN+" dk çalışınca başlar"]
  ].map(x=>`<div class="stat"><span class="num">${x[0]}</span><span class="lbl">${x[1]}</span><span class="e">${x[2]}</span>${x[3]||""}</div>`).join("");
}
function renderHeat(){
  const mb=minsByDay(), t=today(), start=addDays(weekStart(),-49); let h="", active=0;
  for(let i=0;i<56;i++){const k=addDays(start,i), m=mb[k]||0;
    if(k>t){h+=`<i class="fut"></i>`;continue;} if(m) active++;
    const c=!m?"":m<15?"h1":m<30?"h2":m<60?"h3":"h4"; h+=`<i class="${c} ${k===t?"today":""}" title="${esc(fmtDay(k,{day:"numeric",month:"long"}))}: ${m} dk"></i>`;}
  $("#heat").innerHTML=h;
  $("#heatLead").textContent=active?`Son 8 haftada ${active} gün çalıştın. Renk koyulaştıkça o gün daha uzun çalışmışsın; sarı çerçeveli kare bugün.`:"Her kare bir gün. Ders yaptıkça kareler yeşillenir; sarı çerçeveli kare bugün.";
}
const LVC={A1:1,A2:2,B1:3,B2:4};
const lvVars=x=>`--lc:var(--l${LVC[x]||1});--lb:var(--lb${LVC[x]||1})`;
function renderPaths(){
  const conf=[["it",["A1","A2","B1"],"12 haftada temel A1, sonra B1"],["en",["B1","B2"],"B1+'dan B2'ye"]];
  $("#paths").innerHTML=conf.map(([l,lv,goal])=>{const list=SYL[l], done=list.filter(t=>(S.topics[t[1]]||{}).status==="done").length, pct=Math.round(done/list.length*100), cur=curTopic(l);
    const bars=lv.map(x=>{const ts=list.filter(t=>t[0]===x), d=ts.filter(t=>(S.topics[t[1]]||{}).status==="done").length;
      return `<div class="lv" style="--w:${ts.length};${lvVars(x)}"><div class="b"><i style="width:${Math.round(d/ts.length*100)}%"></i></div><div class="t"><b>${x}</b>${d}/${ts.length}</div></div>`;}).join("");
    const st=cur?(S.topics[cur[1]]||{}).status:"";
    return `<article class="card track ${l}"><div class="hd"><div><h3>${FLAG(l)}${LANG[l]}</h3><div class="goalT">${goal} · şu an ${cur?cur[0]:"hedefte"} seviyesindesin</div></div>
      <div class="pct">%${pct}<small>${done} / ${list.length} konu tamam</small></div></div>
      <div class="course" role="img" aria-label="${LANG[l]}: ${list.length} konudan ${done} tanesi tamam">${bars}</div>
      <div class="next"><span class="l">${cur?(st==="doing"?"Şu an çalıştığın konu":"Sıradaki konu"):"Durum"}</span><b>${esc(cur?cur[2]:"Bütün konular tamam")}</b><span>${esc(cur?cur[3]:"Tekrar ve konuşmayla devam et.")}</span></div></article>`;}).join("");
}
/* ---------- KARTLAR ---------- */
function updateLangBtns(){["it","en"].forEach(l=>{const b=$("#rl"+(l==="it"?"It":"En")), n=dueCards(l).length;b.classList.toggle("on",l===reviewLang);b.setAttribute("aria-pressed",String(l===reviewLang));b.innerHTML=FLAG(l)+LANG[l]+(n?` <span class="cnt">${n}</span>`:"");});}
function buildQueue(){rq=dueCards(reviewLang).filter(c=>!reviewed.has(c.id)).sort(()=>Math.random()-.5);rqi=0;flipped=false;renderReview();}
function renderReview(){
  updateLangBtns();
  const box=$("#review"), all=S.cards.filter(c=>c.lang===reviewLang), total=all.length;
  if(!db){box.innerHTML=dbState==="none"?`<div class="empty"><b>Kartlar açılamadı</b>Cihaz depolaması açılamadı. Sayfayı yenile; sürerse tarayıcıyı güncelle ya da gizli pencereden çık.</div>`
    :`<div class="empty"><b>Kayıtlara bağlanılıyor</b>Kartların birkaç saniye içinde burada görünecek.</div>`;return;}
  if(!total){box.innerHTML=`<div class="empty"><b>${LANG[reviewLang]} destesi boş</b>Koçla ders yaptıkça öğrendiğin kelimeler buraya kendiliğinden eklenir. Beklemek istemezsen aşağıdan kendin ekle.</div>`;return;}
  if(rqi>=rq.length){const nextDue=all.map(c=>c.due).filter(d=>d&&d>today()).sort()[0];
    box.innerHTML=`<div class="empty"><b>Bugünlük tekrar bitti</b>${total} ${LANG[reviewLang]} kartın var.${nextDue?" Sıradaki tekrar "+esc(fmtDay(nextDue,{day:"numeric",month:"long",weekday:"long"}))+".":""}</div>`;return;}
  const c=rq[rqi], lv=c.box||1, up=Math.min(6,lv+1);
  let pips="";for(let i=1;i<=6;i++)pips+=`<i class="${i<=lv?"on":""}"></i>`;
  box.innerHTML=`<div class="rv"><div class="cardMeta"><span>${rqi+1} / ${rq.length} kart</span><span class="lvlPips" title="Ezber seviyesi: 1 yeni, 6 kalıcı">Ezber seviyesi ${lv}/6 <span>${pips}</span></span></div>
   <div class="deck"><div class="fcard ${reviewLang} ${flipped?"flip":""}" id="fc" role="button" tabindex="0" aria-label="Kartı çevir">
     <div class="face front"><span class="lang">${FLAG(reviewLang)}${LANG[reviewLang]}</span><div class="w" lang="${reviewLang}">${esc(c.f)}</div><div class="fh">Anlamını aklından söyle, sonra kartı çevir</div></div>
     <div class="face back"><span class="lang">Türkçesi</span><div class="tr">${esc(c.tr)}</div>${c.ex?`<div class="ex" lang="${reviewLang}">${esc(c.ex)}</div>`:""}</div></div></div>
   <div class="grade">${flipped?`<button class="btn no" id="cNo">Bilemedim<small>yarın tekrar gelir</small></button><button class="btn yes" id="cYes">Bildim<small>${inDays(INTERVAL[up])} gelir</small></button>`:`<button class="btn btn-primary full" id="cShow">Kartı çevir</button>`}</div></div>`;
  const flip=()=>{flipped=true;renderReview();};
  $("#fc").onclick=()=>{if(!flipped)flip();}; $("#fc").onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&!flipped){e.preventDefault();flip();}};
  if(flipped){$("#cNo").onclick=()=>grade(false);$("#cYes").onclick=()=>grade(true);}else $("#cShow").onclick=flip;
}
let grading=false;
async function grade(ok){if(grading)return; const c=rq[rqi]; if(!c||!c.id)return; grading=true;
  const box=ok?Math.min(6,(c.box||1)+1):1; const due=addDays(today(),INTERVAL[box]);
  try{await db.collection("cards").doc(c.id).update({box,due,last:today()});}
  catch(e){grading=false; const g=$("#review .grade"); if(g) g.insertAdjacentHTML("afterend",`<div class="msg err">${esc(dbErrText(e,"Cevap kaydedilemedi"))}</div>`); return;}
  grading=false; reviewed.add(c.id); rqi++;flipped=false;renderReview();}
/* db hata kodu → kullanıcı metni (kod üzerinden, mesaj metninden değil) */
function dbErrText(e,what){const c=e&&e.code;
  if(c==="quota_exceeded") return what+": kayıt alanı doldu. Eski sohbetleri sil ya da kartları azalt, sonra tekrar dene.";
  if(c==="resource_exhausted") return what+": çok hızlı işlem yapıldı. Birkaç saniye bekleyip tekrar dene.";
  if(c==="revoked"||c==="not_granted"||c==="capability_disabled"||c==="capability_removed") return what+": cihaz depolamasına yazılamıyor.";
  if(c==="invalid_argument"||c==="transform_error") return what+": kayıt reddedildi.";
  return what+": bağlantı sorunu. Tekrar dene.";}
/* ---------- ÖĞRENME YOLU ---------- */
const sylOpen={it:null,en:null}, sylAuto={it:true,en:true}, lvOpen={}, nlvOpen={it:false,en:false};
function renderSyl(){
  ["it","en"].forEach(l=>{const b=$("#sl"+(l==="it"?"It":"En"));b.classList.toggle("on",l===sylLang);b.setAttribute("aria-pressed",String(l===sylLang));b.innerHTML=FLAG(l)+(l==="it"?"İtalyanca<span class=\"lvlx\">&nbsp;· A1→B1</span>":"İngilizce<span class=\"lvlx\">&nbsp;· B1→B2</span>");});
  const list=SYL[sylLang], done=list.filter(t=>(S.topics[t[1]]||{}).status==="done").length, cur=sylLang==="it"?(itToday().t||curTopic("it")):curTopic(sylLang);
  const pi=progInfo(), wkNow=pi&&pi.week>=1&&pi.week<=PROG_WEEKS?pi.week:pi&&pi.week<1?1:0, wkOf=id=>sylLang==="it"?weekOfTopic(id):pi&&+id.slice(2)<=PROG_WEEKS?+id.slice(2):null;
  if(sylAuto[sylLang]) sylOpen[sylLang]=cur?cur[1]:null;
  const open=sylOpen[sylLang];
  $("#sylLead").textContent=`${list.length} konudan ${done} tanesi tamam. Konuya dokun: içeriği, durumu, Selin'e sor.`;
  const lvName={A1:"Temel",A2:"Temel üstü",B1:"Orta",B2:"Orta üstü"};
  const stTxt={done:"Tamamlandı",doing:"Çalışılıyor",next:"Sıradaki konu",todo:"Başlanmadı"};
  const levels=[...new Set(list.map(t=>t[0]))];
  /* Şu anki seviyeye kadar açık; sonraki seviyeler tek bir "Sonraki seviyeler" katlamasının içinde */
  const curLv=Math.max(0,levels.indexOf(cur?cur[0]:levels[levels.length-1])), later=levels.slice(curLv+1);
  const nlvOn=nlvOpen[sylLang]||(!!open&&later.includes((list.find(t=>t[1]===open)||[])[0]));
  let html="";
  levels.forEach((lv,li)=>{const ts=list.filter(t=>t[0]===lv), d=ts.filter(t=>(S.topics[t[1]]||{}).status==="done").length;
    if(li===curLv+1) html+=`<details class="nlv" ${nlvOn?"open":""}><summary class="nlvHead"><svg class="ico chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>Sonraki seviyeler (${later.join(", ")})</summary>`;
    const hasCur=ts.some(t=>cur&&cur[1]===t[1]), key=sylLang+lv, isOpenLv=lvOpen[key]!=null?lvOpen[key]:(hasCur||ts.some(t=>t[1]===open)||!cur);
    html+=`<details class="lvGroup" data-lv="${key}" style="${lvVars(lv)}" ${isOpenLv?"open":""}><summary class="lvHead"><span class="cefr">${lv}</span><b>${lvName[lv]||""}</b><span class="lvProg">${d} / ${ts.length} konu</span><svg class="ico chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="lv-bar"><span style="width:${Math.round(d/ts.length*100)}%"></span></div><ol class="nodes">`;
    ts.forEach(t=>{const i=list.indexOf(t), st=(S.topics[t[1]]||{}).status||"", isCur=!!cur&&cur[1]===t[1], isOpen=open===t[1];
      const kind=st==="done"?"done":isCur?(st==="doing"?"doing":"next"):st==="doing"?"doing":"todo";
      const chip=st==="done"?`<span class="st done">${ICON("check")}Tamam</span>`:isCur?`<span class="st next">${st==="doing"?"Şu an":"Sıradaki"}</span>`:st==="doing"?`<span class="st doing">Devam</span>`:"";
      const wk=pi?wkOf(t[1]):null, thisWk=!!wk&&wk===wkNow;
      html+=`<li class="node ${st==="done"?"done":""} ${isCur?"cur":""} ${st==="doing"?"doing":""} ${isOpen?"open":""} ${thisWk?"wkNow":""}"><button type="button" class="nodeBtn" data-node="${t[1]}" aria-expanded="${isOpen}" ${isOpen?`aria-controls="nd-${t[1]}"`:""}>
        <span class="dot">${st==="done"?ICON("check"):pad(i+1)}</span><span class="nt"><b>${esc(t[2])}</b><small>${stTxt[kind]}${wk?` · <span class="wkTag">${thisWk?"Bu hafta":"Hafta "+wk}</span>`:""}</small></span>${chip}</button>`;
      if(isOpen) html+=`<div class="nodeDetail" id="nd-${t[1]}"><div><div class="ndk">${esc(lv)} · ${LANG[sylLang]} · konu ${i+1}</div><p>${esc(t[3])}</p></div>
        <div class="stSeg" role="group" aria-label="Durum: ${esc(t[2])}">${[["","Başlanmadı"],["doing","Devam ediyor"],["done","Tamam"]].map(([v,n])=>`<button type="button" data-topic="${t[1]}" data-st="${v}" aria-pressed="${st===v}">${n}</button>`).join("")}</div>
        <div class="ndAct"><button type="button" class="btn btn-soft btn-sm" data-ask="${t[1]}">${ICON("ask")}Selin'e bu konuyu sor</button></div></div>`;
      html+=`</li>`;});
    html+=`</ol></details>`;});
  if(later.length) html+=`</details>`;
  $("#syl").innerHTML=html;
}
/* ---------- GEÇMİŞ ---------- */
function renderLog(){
  const days=[];for(let i=6;i>=0;i--)days.push(addDays(today(),-i));
  const per=days.map(d=>({d,it:0,en:0}));S.sessions.forEach(s=>{const x=per.find(p=>p.d===s.date);if(x)x[s.lang]+=s.total||0;});
  const max=Math.max(60,...per.map(p=>p.it+p.en)); let wk=0;
  $("#chart").innerHTML=per.map(p=>{const t=p.it+p.en;wk+=t;const hI=Math.round(p.it/max*116),hE=Math.round(p.en/max*116);
    return `<div class="c ${p.d===today()?"today":""}" title="${esc(fmtDay(p.d,{day:"numeric",month:"long"}))}: İtalyanca ${p.it} dk, İngilizce ${p.en} dk"><span class="v">${t||""}</span>${hE?`<div class="s en" style="height:${hE}px"></div>`:""}${hI?`<div class="s it" style="height:${hI}px"></div>`:""}<span class="d">${p.d===today()?"Bugün":DAYS[new Date(p.d+"T12:00:00").getDay()]}</span></div>`;}).join("");
  $("#weekTotal").textContent="Toplam "+wk+" dk · hedef 420 dk";
  const m=topMistakes(null,8), mx=m.length?m[0][1]:1;
  $("#mistakes").innerHTML=m.length?`<div class="mist">${m.map(x=>`<div class="mi"><span>${esc(noId(x[0]))}</span><span class="n">${x[1]} kez</span><div class="bar"><i style="width:${Math.round(x[1]/mx*100)}%"></i></div></div>`).join("")}</div>`:`<div class="empty"><b>Henüz kayıtlı hata yok</b>Koç ders sonunda yaptığın hataları buraya ekler. Ne kadar sık tekrarlandığını burada görürsün.</div>`;
  const ss=[...S.sessions].sort((a,b)=>((b.date||"")+(b.created||"")).localeCompare((a.date||"")+(a.created||""))).slice(0,30);
  $("#sessions").innerHTML=ss.length?`<table><thead><tr><th>Tarih</th><th>Dil</th><th>Konu</th><th class="num">Süre</th><th class="num">Yeni kelime</th></tr></thead><tbody>${ss.map(s=>`<tr><td>${esc(fmtDay(s.date,{day:"numeric",month:"short"}))}</td><td>${FLAG(s.lang)}</td><td>${esc(((SYL[s.lang]||[]).find(t=>t[1]===s.topic)||[])[2]||noId(s.topic)||"Serbest")}</td><td class="num">${s.total||0} dk</td><td class="num">${s.words||0}</td></tr>`).join("")}</tbody></table>`:`<div class="empty"><b>Henüz ders yok</b>İlk dersini koçla yaptığında tarih, konu ve süresi burada listelenir.</div>`;
}
function decorate(){
  const tabIco={learn:"today",konus:"speaking",cards:"deck",units:"okuma"};
  const bb=$("#btnBen"); if(bb&&!bb.querySelector(".ico")) bb.innerHTML=ICON("user")+"<span>Ben</span>";
  document.querySelectorAll(".tabs button").forEach(b=>{if(!b.querySelector(".ico")){const n=b.firstChild;const sp=document.createElement("span");sp.className="tl";sp.textContent=n.textContent;b.replaceChild(sp,n);b.insertAdjacentHTML("afterbegin",ICON(tabIco[b.dataset.tab]));}});
  $("#barFlags").innerHTML=FLAG("it")+FLAG("en");
  $("#btnCopyInstr").innerHTML=ICON("copy")+"Talimatı kopyala";
  const br=$("#btnRoad"); if(br&&!br.querySelector(".ico")) br.innerHTML=ICON("learn")+"Yol haritası ve konular";
  const om=$("#onbMini"); if(om&&!om.querySelector(".ico")) om.innerHTML=ICON("play")+"Programı kur";
}
function renderAll(){decorate();renderHero();renderPlan();renderGoal();renderStats();renderHeat();renderPaths();renderReview();renderSyl();renderLog();renderProg();renderTop();}
function renderLive(){renderHero();renderPlan();renderGoal();renderStats();renderHeat();renderPaths();renderLog();renderProg();renderTop();}
