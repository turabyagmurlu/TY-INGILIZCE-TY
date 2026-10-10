/* ---------- YOĞUN PROGRAM (12 hafta · 60 dk/gün) ----------
   db: program/main {start,weeks:12,dailyMin:60,mode:"yogun"} — yalnızca "Yoğun programı başlat" ile yazılır, yüklemede asla.
       habits/<YYYY-MM-DD> {dinleme:true|false} · exams/<tur>-wNN {hafta,puan,toplam,tur,notlar,tarih}
   Haftalar Pazartesi başlar, Pazar tekrar günüdür. Başlangıç Pzt–Çar ise o haftanın Pazartesi'si Hafta 1;
   Per–Paz ise o günler "ısınma" sayılır ve Hafta 1 sonraki Pazartesi başlar. Program = 84 gün. */
const PROG_WEEKS=12, PROG_DAYS=84;
const CP_SCOPE1=["it01","it02","it03","it04","it05","it06","it07","it08"], CP_SCOPE2=["it09","it10","it11","it12","it13","it14","it15","it16"];
const ROADMAP=[
 {w:1,it:["it01","it02"],t:"Sesler ve tanışma",words:50},
 {w:2,it:["it03","it04"],t:"İsimler ve artikeller",words:50},
 {w:3,it:["it05","it06"],t:"essere ve avere",words:50},
 {w:4,it:["it07","it08"],t:"Sıfatlar, sayılar, saat",words:50,cp:{id:"cp1",tur:"checkpoint",name:"Checkpoint 1",what:"A1 başlangıç testi",scope:CP_SCOPE1,q:20}},
 {w:5,it:["it09","it10"],t:"Şimdiki zaman",words:50},
 {w:6,it:["it11","it12"],t:"Düzensiz fiiller ve sorular",words:50},
 {w:7,it:["it13","it14"],t:"Yer bildirme ve edatlar",words:50},
 {w:8,it:["it15","it16"],t:"Günlük rutin ve modal fiiller",words:50,cp:{id:"cp2",tur:"checkpoint",name:"Checkpoint 2",what:"A1 ara sınavı",scope:CP_SCOPE2,q:20}},
 {w:9,it:["it17","it18"],t:"Kafe, market, zevkler",words:50},
 {w:10,it:["it19"],t:"Passato prossimo (avere) + tekrar",words:50,rev:true},
 {w:11,it:["it20"],t:"Passato prossimo (essere) + tekrar",words:50,rev:true},
 {w:12,it:[],t:"Genel A1 tekrarı + final sınavı",words:30,rev:true,cp:{id:"final",tur:"final",name:"Final",what:"A1 sınav simülasyonu",scope:"it01–it20",q:30}}
];
const ITP=ROADMAP.reduce((a,r)=>a.concat(r.it),[]);
const WORDS_TOTAL=ROADMAP.reduce((a,r)=>a+r.words,0);
const WEEK_MIN=7*60;
/* Tekrar günlerinde (hafta 10–12) gramer bloğu bu setleri sırayla döner: Pzt…Cmt */
/* Sonraki günler zayıf kalan geçmiş zamanı (it19/it20) da döndürür */
const REVIEW_SETS=[["it01","it02","it03","it04"],["it05","it06","it07","it08"],["it09","it10","it11","it19"],["it12","it13","it14","it20"],["it15","it16","it19"],["it17","it18","it20"]];
const weekOfTopic=id=>{const r=ROADMAP.find(x=>x.it.includes(id));return r?r.w:null;};
const topicById=id=>SYL.it.find(t=>t[1]===id)||SYL.en.find(t=>t[1]===id)||null;
const stOf=id=>(S.topics[id]||{}).status||"";
const daysBetween=(a,b)=>Math.round((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/864e5);
const trKeyMemo=new Map();
function trKey(iso){if(!iso)return ""; const k=String(iso); if(trKeyMemo.has(k))return trKeyMemo.get(k); const v=trKey0(iso); if(trKeyMemo.size>20000)trKeyMemo.clear(); trKeyMemo.set(k,v); return v;}
function trKey0(iso){try{const d=new Date(iso);if(isNaN(d))return String(iso).slice(0,10);
  if(tzFmt){const p={};tzFmt.formatToParts(d).forEach(x=>p[x.type]=x.value);return p.year+"-"+p.month+"-"+p.day;}return dkey(d);}catch(e){return String(iso).slice(0,10);}}
function progAnchor(start){const wd=(wdOf(start)+6)%7; return wd<=2?addDays(start,-wd):addDays(start,7-wd);}
const validDay=k=>/^\d{4}-\d{2}-\d{2}$/.test(k||"")&&!isNaN(Date.parse(k+"T00:00:00Z"));
/* Bir topic'in hafta içindeki son günü (Pzt=1): 2 konu → Çar, Cmt · 1 konu → Per */
const dueDays=n=>n>=2?[3,6]:n===1?[4]:[];
function expectedBy(week,dw){let e=0;ROADMAP.forEach(r=>{if(r.w<week)e+=r.it.length;else if(r.w===week)e+=dueDays(r.it.length).filter(d=>d<=dw).length;});return e;}
function progInfo(){
  const pr=S.program; if(!pr||!validDay(pr.start)) return null;
  const t=today(), anchor=progAnchor(pr.start), day=daysBetween(anchor,t)+1, lead=day<1?1-day:0;
  const finished=day>PROG_DAYS, week=day<1?0:finished?PROG_WEEKS+1:Math.ceil(day/7), dw=day<1?0:finished?7:((day-1)%7)+1;
  const doneN=ITP.filter(id=>stOf(id)==="done").length;
  const expected=day<1?0:finished?ITP.length:expectedBy(week,dw);
  const finalDate=addDays(anchor,PROG_DAYS-1);
  return {start:pr.start,anchor,day,lead,week,dw,finished,elapsed:Math.max(0,Math.min(PROG_DAYS,day)),doneN,expected,diff:doneN-expected,finalDate,
    a1Days:daysBetween(t,finalDate),road:ROADMAP[Math.min(PROG_WEEKS,Math.max(1,week))-1],isSunday:wdOf(t)===0};
}
const weekRange=(p,w)=>[addDays(p.anchor,(w-1)*7),addDays(p.anchor,(w-1)*7+6)];
const cpDate=(p,w)=>addDays(p.anchor,w*7-1);
const fmtShort=k=>fmtDay(k,{day:"numeric",month:"short"});
function fmtRange(a,b){try{const A=new Date(a+"T12:00:00"),B=new Date(b+"T12:00:00");
  return A.getMonth()===B.getMonth()?A.getDate()+"–"+fmtDay(b,{day:"numeric",month:"short"}):fmtShort(a)+" – "+fmtShort(b);}catch(e){return a+" – "+b;}}
/* Bugünün İtalyanca gramer konusu (programa göre). mode: free|lead|week|catchup|ahead|review|done */
function itToday(){
  const p=progInfo();
  if(!p||p.finished){const ct=curTopic("it");return {t:ct,mode:ct?"free":"done",p};}
  const doing=ITP.find(id=>stOf(id)==="doing"), first=ITP.find(id=>stOf(id)!=="done");
  const reviewSet=()=>REVIEW_SETS[Math.max(0,Math.min(5,(p.dw||1)-1))];
  if(!first) return p.week>=10?{t:null,mode:"review",set:reviewSet(),p}:{t:curTopic("it"),mode:"free",p};
  const id=doing&&ITP.indexOf(doing)<=ITP.indexOf(first)+1?doing:first, wk=weekOfTopic(id), t=topicById(id);
  if(p.week<1) return {t,mode:"lead",p};
  if(wk<p.week) return {t,mode:"catchup",p};
  if(wk===p.week) return {t,mode:"week",p};
  if(p.road.rev) return {t:null,mode:"review",set:reviewSet(),next:t,p};
  return {t,mode:"ahead",p};
}
/* İngilizce: programda haftanın teması + haftanın gramer odağı (en01–en12) */
function enToday(){const p=progInfo(); if(p&&p.week>=1&&p.week<=PROG_WEEKS) return {theme:SPEAK_EN[p.week-1],t:SYL.en[p.week-1],weekly:true};
  if(p&&p.week<1) return {theme:SPEAK_EN[0],t:SYL.en[0],weekly:true};
  return {theme:SPEAK_EN[dayIdx()%SPEAK_EN.length],t:curTopic("en"),weekly:false};}
const progEnTopicId=()=>{const p=progInfo();return p&&p.week>=0&&p.week<=PROG_WEEKS?SYL.en[Math.max(0,p.week-1)][1]:null;};
/* Pazar türü: normal tekrar / checkpoint / final */
function sundayKind(){const p=progInfo(); if(!p||p.week<1||p.finished||!p.isSunday) return {kind:"normal",p};
  const cp=p.road.cp; return cp?{kind:cp.tur,cp,p}:{kind:"normal",p};}
function examFor(w,tur){return S.exams.find(e=>+e.hafta===w&&(e.tur||"")===tur)||null;}
/* İstatistikler: haftalık dakika / yeni İtalyanca kelime / konu */
function weekStats(p,w){const [a,b]=weekRange(p,w), r=ROADMAP[w-1];
  const mins=S.sessions.filter(s=>s.date>=a&&s.date<=b).reduce((x,s)=>x+(+s.total||0),0);
  const words=S.cards.filter(c=>c.lang==="it"&&c.added).filter(c=>{const k=trKey(c.added);return k>=a&&k<=b;}).length;
  const topics=r.it.filter(id=>stOf(id)==="done").length;
  const listen=Object.keys(S.habits).filter(k=>k>=a&&k<=b&&S.habits[k]&&S.habits[k].dinleme).length;
  return {a,b,mins,words,topics,listen,r};}
function weekStatus(p,w){const r=ROADMAP[w-1], allDone=r.it.length?r.it.every(id=>stOf(id)==="done"):false;
  if(!p) return "plan";
  if(w===PROG_WEEKS&&!r.it.length){const ex=examFor(12,"final"); if(ex) return "done"; return p.week===12?"now":p.week>12?"late":"future";}
  if(p.week<1) return allDone?"done":"future";
  if(w<p.week) return allDone?"done":"late";
  if(w===p.week) return allDone?"donenow":"now";
  return allDone?"done":"future";}
const ST_LABEL={done:"Tamam",donenow:"Bu hafta · konular tamam",now:"Bu hafta",late:"Geride",future:"Gelecek",plan:"Plan"};
/* Doğal dil: sayı → kelime (blok başlığı) */
const NUMW=["sıfır","bir","iki","üç","dört","beş","altı"];

/* ---------- ÇİZİM ---------- */
function progVerdict(p,it){
  if(p.finished) return {cls:"good",short:"Program bitti",long:"12 hafta tamam. Final sınavı sonucunu İlerleme sekmesinde gör; A2 konularıyla devam edebilirsin."};
  const nm=it&&it.t?`<b>${esc(it.t[2])}</b>`:"";
  if(p.diff<0) return {cls:"bad",short:Math.abs(p.diff)+" konu gerideysin",long:`Bugün ${nm||"sıradaki konuyu"} bitir. Gramer bloğunu bu konuya ver; konu %80 doğrulukla kapanınca plana yaklaşırsın.`};
  if(p.diff>0) return {cls:"good",short:"Programın önündesin · +"+p.diff+" konu",long:it&&it.mode==="review"?"Konular önde. Bugün tekrar günü: gramer bloğunda eski konuları pekiştir.":`Önde gidiyorsun. ${nm?"Sıradaki: "+nm+". ":""}Acele etme; kelime ve sesli tekrar bloklarını atlama.`};
  return {cls:"ok",short:p.week<1?"Isınmadasın":"Plandasın",long:it&&it.mode==="review"?"Bugün tekrar günü: gramer bloğu eski konuları pekiştirir.":nm?`Bugünün konusu ${nm}.`:"Bugünün planına devam."};
}
function renderProgStrip(){
  const el=$("#progStrip"); if(!el) return; const p=progInfo(); const om=$("#onbMini"); if(om) om.hidden=!!p||!db;
  if(!p){const can=!!db;
    el.className="card progCta"; el.setAttribute("aria-labelledby","progCtaTitle");
    el.innerHTML=`<div class="pcHead"><span class="pcIco">${ICON("target")}</span><div><p class="eyebrow">12 hafta · günde 60 dk</p><h2 id="progCtaTitle">12 haftalık yoğun program</h2></div></div>
      <p class="pcLead">${can?"Program başlatılmadı. Üç adım, 30 saniye.":"Program kaydedilemiyor: cihaz depolaması açılamadı."}</p>
      ${can?`<div class="btnRow"><button type="button" class="btn btn-primary btn-sm" data-onb-open>${ICON("play")}Programı kur</button></div>`:""}`;
    return;}
  const it=itToday(), v=progVerdict(p,it);
  el.className="card progStrip "+v.cls; el.setAttribute("aria-labelledby","progTitle");
  const title=p.finished?"Program tamamlandı":p.week<1?`Isınma · Hafta 1'e ${p.lead} gün`:`Hafta ${p.week} / ${PROG_WEEKS} · Gün ${p.day}`;
  const sub=p.finished?"12 hafta · "+fmtShort(p.anchor)+" – "+fmtShort(p.finalDate):p.week<1?"Hafta 1 "+fmtDay(p.anchor,{day:"numeric",month:"long",weekday:"long"})+" başlıyor":p.road.t+" · "+fmtRange(...weekRange(p,p.week));
  const pPct=Math.round(p.elapsed/PROG_DAYS*100), dPct=Math.round(p.doneN/ITP.length*100), ePct=Math.round(p.expected/ITP.length*100);
  const a1=p.finished?"":p.a1Days<=0?"A1 sınav simülasyonu bugün":`A1 sınav simülasyonuna ${p.a1Days} gün`;
  el.innerHTML=`<div class="psTop"><div><p class="eyebrow">Yoğun program · ${esc(sub)}</p><h2 id="progTitle">${esc(title)}</h2></div><div class="psSide">${vRepeats(title,v.short)?"":`<span class="verdict ${v.cls}">${esc(v.short)}</span>`}${a1?`<span class="psA1">${esc(a1)}</span>`:""}</div></div>
    <div class="psBars">
      <div class="gbar"><div class="gl">Program<span>${p.elapsed} / ${PROG_DAYS} gün</span></div><div class="pbar blue" role="img" aria-label="Programın ${PROG_DAYS} gününden ${p.elapsed} günü geçti"><span style="width:${pPct}%"></span></div></div>
      <div class="gbar"><div class="gl">Performans<span>${p.doneN} konu tamam · plan ${p.expected}</span></div><div class="pbar perf ${v.cls}" role="img" aria-label="${ITP.length} konudan ${p.doneN} tamam, bugüne kadar planlanan ${p.expected}"><span style="width:${dPct}%"></span>${p.expected?`<b class="mark" style="left:${ePct}%"></b>`:""}</div></div>
    </div>
    <p class="psMsg">${v.long}</p>`;
}
function renderHabit(){const el=$("#habit"); if(!el) return; const k=today(), on=!!(S.habits[k]&&S.habits[k].dinleme);
  el.innerHTML=`<button type="button" class="habit ${on?"on":""}" id="habitBtn" aria-pressed="${on}" ${db?"":"disabled"}><span class="hb">${on?ICON("check"):""}</span>
    <span class="ht"><b>Yolda dinle · 15–20 dk <span class="opt">isteğe bağlı</span></b><small>${on?"Bugün dinledin. Kaldırmak için tekrar dokun.":"İşe giderken İtalyanca podcast (öneri: Coffee Break Italian, 1. sezon, baştan sırayla). 60 dakikaya dahil değil; dinlediysen işaretle."}</small></span></button>`;}
function renderWeekGoals(){
  const el=$("#weekGoals"); if(!el) return; const p=progInfo();
  if(!p){el.innerHTML=`<div class="chead"><div><h2>Haftalık hedefler</h2><p class="lead">Yoğun programı başlatınca bu haftanın dakika, kelime ve konu hedefleri burada görünür.</p></div>
    <button class="btn btn-soft btn-sm" data-go="learn">${ICON("play")}Programı başlat</button></div>`;return;}
  const w=Math.min(PROG_WEEKS,Math.max(1,p.week)), s=weekStats(p,w), r=s.r, totalW=S.cards.filter(c=>c.lang==="it").length;
  const wordsTo=ROADMAP.filter(x=>x.w<=w).reduce((a,x)=>a+x.words,0);
  const bar=(lbl,v,tgt,cls,unit)=>`<div class="gbar"><div class="gl">${lbl}<span>${v} / ${tgt}${unit||""}${v>=tgt?" · tamam":""}</span></div><div class="pbar ${cls||""}" role="img" aria-label="${lbl}: ${v} / ${tgt}"><span style="width:${Math.min(100,Math.round(v/Math.max(1,tgt)*100))}%"></span></div></div>`;
  const nTopic=r.it.length||0;
  el.innerHTML=`<div class="goalTop"><h2>${p.week<1?"Isınma · Hafta 1 hedefleri":"Hafta "+w+" hedefleri"}<small>${esc(r.t)} · ${esc(fmtRange(s.a,s.b))}</small></h2></div>
    ${bar("Dakika",s.mins,WEEK_MIN,"blue"," dk")}
    ${bar("Yeni İtalyanca kelime",s.words,r.words,"green")}
    ${nTopic?bar("Konu",s.topics,nTopic,""):`<div class="gbar"><div class="gl">Konu<span>Bu hafta yeni konu yok · genel tekrar ve final</span></div></div>`}
    <p class="wgFoot"><span>Toplam İtalyanca kelime: <b>${totalW}</b> · hafta ${w} sonu hedefi ${wordsTo}, program hedefi ${WORDS_TOTAL}</span><span>Yolda dinleme: <b>${s.listen} / 7 gün</b> (sayılmaz, alışkanlık)</span></p>`;
}
function renderRoadmap(){
  const el=$("#roadmap"); if(!el) return; const p=progInfo();
  $("#roadLead").textContent=p?(p.finished?"Program tamamlandı. Haftalar ve sonuçlar aşağıda.":`Hafta 1: ${fmtDay(p.anchor,{day:"numeric",month:"long"})} · Final: ${fmtDay(p.finalDate,{day:"numeric",month:"long"})}. Her hafta 420 dk; A1 konuları 9. haftada biter.`)
    :"Program başlamadı; tarihler ve durumlar başlatınca görünür. A1 konuları ilk 9 haftada, son 3 hafta passato prossimo ve tekrar.";
  el.innerHTML=ROADMAP.map(r=>{const st=weekStatus(p,r.w), s=p&&(p.week>=r.w||st==="done")&&p.week>=1?weekStats(p,r.w):null;
    const chips=r.it.length?r.it.map(id=>{const t=topicById(id), x=stOf(id);return `<span class="tp ${x}">${x==="done"?ICON("check"):""}${esc(t[2])}</span>`;}).join(""):`<span class="tp rev"><b>Tüm A1 konuları</b> · genel tekrar</span>`;
    const cp=r.cp?(()=>{const ex=examFor(r.w,r.cp.tur);return `<span class="cpm ${ex?"has":""}">${ICON("target")}${esc(r.cp.name)} · ${esc(r.cp.what)}${ex?` · <b>${ex.puan}/${ex.toplam}</b>`:p?" · "+esc(fmtShort(cpDate(p,r.w))):""}</span>`;})():"";
    const meta=s?`<span class="wm">${s.mins}/${WEEK_MIN} dk · ${s.words}/${r.words} kelime</span>`:p?`<span class="wm">${esc(fmtRange(...weekRange(p,r.w)))}</span>`:"";
    return `<li class="wk ${st}" ${st==="now"||st==="donenow"?'aria-current="step"':""}><span class="wn"><small>Hafta</small>${r.w}</span>
      <div class="wb"><div class="wt"><b>${esc(r.t)}</b><span class="st ${st==="done"?"done":st==="now"||st==="donenow"?"next":st==="late"?"late":""}">${ST_LABEL[st]}</span></div><div class="tps">${chips}</div>${cp}${meta}</div></li>`;}).join("");
}
function renderExams(){
  const el=$("#exams"); if(!el) return; const p=progInfo();
  const rows=ROADMAP.filter(r=>r.cp).map(r=>{const ex=examFor(r.w,r.cp.tur), pct=ex?Math.round(ex.puan/Math.max(1,ex.toplam)*100):0;
    const verdict=!ex?"":pct>=80?"Sağlam":pct>=60?"Geçti · zayıf konuları tekrar et":"Tekrar gerekli";
    const when=p?fmtDay(cpDate(p,r.w),{day:"numeric",month:"long",weekday:"long"}):"Hafta "+r.w+" Pazar";
    return `<div class="exItem ${ex?(pct>=60?"pass":"fail"):""}"><div class="exh"><b>${esc(r.cp.name)}</b><span>${esc(r.cp.what)} · Hafta ${r.w}</span></div>
      ${ex?`<div class="exs"><span class="exp">%${pct}</span><span>${ex.puan} / ${ex.toplam} · ${esc(verdict)}${ex.tarih?" · "+esc(fmtShort(ex.tarih)):""}</span></div><div class="pbar ${pct>=60?"green":""}"><span style="width:${pct}%"></span></div>${ex.notlar?`<p class="exn">${esc(noId(ex.notlar))}</p>`:""}`
        :`<p class="exn">Henüz yapılmadı · ${esc(when)}. Chiara o gün sınavı yürütür ve sonucu buraya kaydeder.</p>`}</div>`;}).join("");
  const weekly=S.exams.filter(e=>e.tur==="haftalik").sort((a,b)=>a.hafta-b.hafta);
  el.innerHTML=rows+`<div class="exw"><b>Pazar mini sınavları</b>${weekly.length?`<div class="exchips">${weekly.map(e=>`<span>H${e.hafta} · ${e.puan}/${e.toplam}</span>`).join("")}</div>`:`<span class="exn">Her Pazar 10 soruluk mini sınavın puanı burada birikir.</span>`}</div>
    <p class="exn">Dinleme bölümü sayfada yapılamaz: sayfa ses çalıp cevabını değerlendiremez. Dinlemeyi yolda podcast ile çalış.</p>`;
}
let progConfirm=null;
function renderProgSetup(){
  const el=$("#progSetup"); if(!el) return; const p=progInfo();
  const expl=`<p class="lead">Günde 60 dk: <b>İtalyanca 45</b> (kelime 10 · gramer 20 · okuma-yazma 10 · sesli tekrar 5) + <b>İngilizce 15</b> konuşma. Pazar 60 dk tekrar: İtalyanca 40 (haftanın kartları + 10 soruluk mini sınav), İngilizce 20 serbest konuşma. 4. ve 8. hafta Pazar ara sınav, 12. hafta Pazar A1 sınav simülasyonu. Yolda 15–20 dk podcast önerilir; 60 dakikaya dahil değil.</p>`;
  if(!p){el.innerHTML=`<h2 id="progSetupTitle">Yoğun program</h2>${expl}<div class="msg info">Program başlatılmadı.</div><div class="btnRow"><button class="btn btn-soft" data-go="learn">${ICON("play")}Öğren sekmesinde başlat</button></div><div id="progSetupMsg"></div>`;return;}
  const c=progConfirm;
  el.innerHTML=`<h2 id="progSetupTitle">Yoğun program</h2>${expl}
    <dl class="pkv"><div><dt>Başlangıç</dt><dd>${esc(fmtDay(p.start,{day:"numeric",month:"long",year:"numeric"}))}</dd></div><div><dt>Hafta 1</dt><dd>${esc(fmtDay(p.anchor,{day:"numeric",month:"long"}))}</dd></div><div><dt>Final</dt><dd>${esc(fmtDay(p.finalDate,{day:"numeric",month:"long"}))}</dd></div></dl>
    <div class="pcForm"><label for="progNewStart">Yeni başlangıç tarihi</label><input type="date" id="progNewStart" value="${esc(c&&c.kind==="date"?c.date:p.start)}">
      <button class="btn btn-soft" id="btnProgDate">Tarihi değiştir</button></div>
    ${c?`<div class="confirm" role="alertdialog" aria-labelledby="cfT"><p id="cfT"><b>${c.kind==="reset"?"Program sıfırlansın mı?":"Başlangıç "+esc(fmtDay(c.date,{day:"numeric",month:"long"}))+" olsun mu?"}</b> ${c.kind==="reset"?"Program kaydı silinir; konuların, kartların ve ders geçmişin olduğu gibi kalır. Sonra Öğren sekmesinden yeniden başlatabilirsin.":"Hafta ve gün sayısı yeni tarihe göre yeniden hesaplanır. Konu, kart ve ders kayıtların değişmez."}</p>
      <div class="btnRow"><button class="btn ${c.kind==="reset"?"btn-danger":"btn-primary"}" id="btnCfYes">${c.kind==="reset"?"Evet, sıfırla":"Evet, değiştir"}</button><button class="btn btn-ghost" id="btnCfNo">Vazgeç</button></div></div>`
      :`<div class="btnRow"><button class="btn btn-ghost" id="btnProgReset">Programı sıfırla</button></div>`}
    <div id="progSetupMsg"></div>`;
}
function renderProg(){renderProgStrip();renderHabit();renderWeekGoals();renderRoadmap();renderExams();renderProgSetup();}

/* ---------- OLAYLAR ---------- */
let progWriting=false;
document.addEventListener("click",async e=>{
  const b=e.target.closest("button"); if(!b) return;
  if(b.id==="btnProgStart"){const m=$("#progStartMsg");
    if(!db){msg(m,"err","Kayıt yapılamıyor: cihaz depolaması açılamadı.");return;}
    if(progWriting||S.program) return; const start=($("#progStart")||{}).value||today();
    if(!validDay(start)){msg(m,"err","Geçerli bir tarih seç.");return;}
    if(daysBetween(today(),start)>30){msg(m,"err","Başlangıç en fazla 30 gün sonrası olabilir.");return;}
    if(daysBetween(start,today())>83){msg(m,"err","Bu tarihle program çoktan bitmiş olurdu. Daha yakın bir tarih seç.");return;}
    progWriting=true; b.disabled=true;
    const doc={start,weeks:PROG_WEEKS,dailyMin:60,mode:"yogun",created:new Date().toISOString()};
    try{/* Başka cihazda / geç gelen kayıtta program zaten varsa ezme, onu benimse */
      let ex=null; try{ex=await db.collection("program").doc("main").get();}catch(e){ex=null;}
      if(ex&&ex.exists){S.program=ex.data(); progLoaded=true; onbSkip=false; renderAll(); if(typeof fNotice==="function") fNotice("Program zaten başlatılmış."); return;}
      await db.collection("program").doc("main").set(doc); S.program=doc; onbSkip=false; renderAll(); if(typeof dersGate==="function"&&dersGate()) dersOpen();}
    catch(err){b.disabled=false; msg(m,"err",dbErrText(err,"Program kaydedilemedi"));}
    finally{progWriting=false;} return;}
  if(b.id==="habitBtn"){if(!db||b.dataset.busy)return; const k=today(), on=!(S.habits[k]&&S.habits[k].dinleme); b.dataset.busy="1";
    try{await db.collection("habits").doc(k).set({dinleme:on,updated:new Date().toISOString()}); S.habits[k]={dinleme:on}; renderHabit(); renderWeekGoals();}
    catch(err){delete b.dataset.busy; b.insertAdjacentHTML("afterend",`<div class="msg err">${esc(dbErrText(err,"Kaydedilemedi"))}</div>`);} return;}
  if(b.id==="btnProgReset"){progConfirm={kind:"reset"};renderProgSetup();const y=$("#btnCfNo");if(y)y.focus();return;}
  if(b.id==="btnProgDate"){const v=($("#progNewStart")||{}).value; if(!validDay(v)){msg($("#progSetupMsg"),"err","Geçerli bir tarih seç.");return;}
    if(S.program&&v===S.program.start){msg($("#progSetupMsg"),"info","Başlangıç zaten bu tarih.");return;}
    if(daysBetween(today(),v)>30||daysBetween(v,today())>83){msg($("#progSetupMsg"),"err","Tarih bugünden en fazla 30 gün sonra, en fazla 83 gün önce olabilir.");return;}
    progConfirm={kind:"date",date:v};renderProgSetup();const y=$("#btnCfNo");if(y)y.focus();return;}
  if(b.id==="btnCfNo"){progConfirm=null;renderProgSetup();return;}
  if(b.id==="btnCfYes"){const c=progConfirm; if(!c||!db) return; b.disabled=true;
    try{ if(c.kind==="reset"){await db.collection("program").doc("main").delete(); S.program=null;}
         else {const d=Object.assign({},S.program,{start:c.date,updated:new Date().toISOString()}); await db.collection("program").doc("main").set(d); S.program=d;}
         progConfirm=null; renderAll(); msg($("#progSetupMsg"),"ok",c.kind==="reset"?"Program sıfırlandı.":"Başlangıç tarihi değişti.");}
    catch(err){b.disabled=false; msg($("#progSetupMsg"),"err",dbErrText(err,"Kaydedilemedi"));} return;}
});
