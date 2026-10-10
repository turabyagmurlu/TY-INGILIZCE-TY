/* ---------- DERSLER (units.js) ----------
   Eski TY İngilizce uygulamasının ünite motoru TY Dil'in "Dersler" sekmesine taşındı:
   dil → seviye → ünite → adımlar (Anlatım? · Ezberle · Kartlar · Telaffuz · Test / Kural · Örnekler · Alıştırma),
   test motoru (2/3 geçme, yarım kalan test), telaffuz kontrolü, sesli okuma, notlar + el yazısı defteri, sözlük, TY1 yedek.
   Kayıt: aynı localStorage anahtarı (dilOgren_v4) ve aynı yapı → eski kullanıcının ilerlemesi olduğu gibi devam eder.
   Gezinme: #dersler/<dil>/<uid>/<adım> (telefonun geri tuşu ünite listesine döner).
   Çekirdek kancası: TYDIL.registerUnits(fn) → fn(mountEl) sekme ilk açıldığında bir kez çağrılır. */
(function(){
"use strict";
const STORE_KEY="dilOgren_v4", OLD_KEY_V3="ingilizceOgren_v3";
const mountRoot=()=>document.getElementById("tyUnitsMount");
let view=null, mounted=false, curScreen="", ctx={}, pendingNote="";
const uesc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SVG={back:'<path d="M15 6l-6 6 6 6"/>',speak:'<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',check:'<path d="m5 12.5 4.2 4.2L19 7"/>',note:'<path d="M5 4.5h11l3 3V19.5H5z"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',book:'<path d="M3.5 5.5h5.5A3 3 0 0 1 12 8.5v11a2.5 2.5 0 0 0-2.5-2.5h-6z"/><path d="M20.5 5.5H15a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5h6z"/>',save:'<path d="M5 4.5h11l3 3V19.5H5z"/><path d="M8 4.5v5h7v-5M8 19.5v-6h8v6"/>',font:'<path d="M4 18 9.5 5l5.5 13M6 14h7"/><path d="M15.5 18l2.5-6 2.5 6M16.5 16h3"/>',down:'<path d="m6 9 6 6 6-6"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>'};
const I=(n,cls)=>`<svg class="ico ${cls||""}" viewBox="0 0 24 24" aria-hidden="true">${SVG[n]||""}</svg>`;
/* Ünite simgesi: emoji yerine uygulamanın çizgi simgeleri (gramer → gramer, ses/okunuş → sesli, kelime → kelime) */
function uIcon(u){ const k=u.type==="grammar"?"gramer":/okunuş|sesler|alfabe|telaffuz/i.test(u.title||"")?"sesli":"kelime"; const svg=typeof ICON==="function"?ICON(k):I("book"); return `<span class="u-emo ${u.type==="grammar"?"g":"v"}" aria-hidden="true">${svg}</span>`; }

/* ===== DURUM (legacy ile aynı yapı) ===== */
function defaultLangData(){ return {completedLessons:[], wordsLearned:0, grammarLearned:0, reviewWords:[], bestScores:{}, unlocks:{}, dictLearned:[], earnedBadges:[], perfectQuiz:false, unitProgress:{}, lastUid:null, quizSave:null, notes:{}}; }
function defaultState(){ return Object.assign({}, defaultLangData(), {lang:null, langStore:{en:defaultLangData(), it:defaultLangData()}, studyDates:[], streak:0, settings:{fontScale:1, rate:0.85, voiceURI:null, hwLang:"tr"}}); }
function normalizeState(s){ const d=defaultState(); const m=Object.assign(d,s); m.settings=Object.assign(defaultState().settings, s.settings||{}); m.langStore=Object.assign({en:defaultLangData(), it:defaultLangData()}, s.langStore||{}); return m; }
function loadState(){
  try{ const raw=localStorage.getItem(STORE_KEY); if(raw) return normalizeState(JSON.parse(raw));
    const old=localStorage.getItem(OLD_KEY_V3);
    if(old){ const s=JSON.parse(old); const d=defaultState();
      d.langStore.en=Object.assign(defaultLangData(), {completedLessons:s.completedLessons||[], wordsLearned:s.wordsLearned||0, grammarLearned:s.grammarLearned||0, reviewWords:s.reviewWords||[], bestScores:s.bestScores||{}, unlocks:s.unlocks||{}, dictLearned:s.dictLearned||[], earnedBadges:s.earnedBadges||[], perfectQuiz:!!s.perfectQuiz});
      d.studyDates=s.studyDates||[]; d.streak=s.streak||0; if(s.settings) d.settings=Object.assign(d.settings, s.settings); d.lang="en"; return d; }
    return defaultState(); }catch(e){ return defaultState(); } }
function snapshotActive(){ return {completedLessons:US.completedLessons, wordsLearned:US.wordsLearned, grammarLearned:US.grammarLearned, reviewWords:US.reviewWords, bestScores:US.bestScores, unlocks:US.unlocks, dictLearned:US.dictLearned, earnedBadges:US.earnedBadges, perfectQuiz:US.perfectQuiz, unitProgress:US.unitProgress, lastUid:US.lastUid, quizSave:US.quizSave||null, notes:US.notes||{}}; }
function applyLangData(o){ o=o||defaultLangData(); US.completedLessons=o.completedLessons||[]; US.wordsLearned=o.wordsLearned||0; US.grammarLearned=o.grammarLearned||0; US.reviewWords=o.reviewWords||[]; US.bestScores=o.bestScores||{}; US.unlocks=o.unlocks||{}; US.dictLearned=o.dictLearned||[]; US.earnedBadges=o.earnedBadges||[]; US.perfectQuiz=!!o.perfectQuiz;
  const up=o.unitProgress; US.unitProgress=(up&&typeof up==="object"&&!Array.isArray(up))?up:{}; US.lastUid=typeof o.lastUid==="string"?o.lastUid:null;
  const qs=o.quizSave; US.quizSave=(qs&&typeof qs==="object"&&typeof qs.key==="string"&&Array.isArray(qs.questions)&&qs.questions.length&&qs.questions.every(q=>q&&Array.isArray(q.options)&&typeof q.answer==="string")&&qs.qIndex>=0&&qs.qIndex<qs.questions.length)?qs:null;
  const nt=o.notes, notes={}; if(nt&&typeof nt==="object"&&!Array.isArray(nt)) Object.keys(nt).forEach(k=>{ const n=nt[k]; if(n&&typeof n==="object"&&typeof n.text==="string"&&n.text.trim()) notes[k]={text:n.text, updatedAt:+n.updatedAt||0}; });
  US.notes=notes; }
let lastSaved="";
function saveState(){ try{ if(US.lang){ US.langStore[US.lang]=snapshotActive(); } lastSaved=JSON.stringify(US); localStorage.setItem(STORE_KEY, lastSaved); }catch(e){} }
/* Başka sekme/eski TY İngilizce sayfası aynı anahtara yazdıysa (annenin telefonunda iki sayfa açık): bizim kopya bayatlamasın, ezmeyelim */
function externalChanged(){ try{ const raw=localStorage.getItem(STORE_KEY); return !!raw&&raw!==lastSaved; }catch(e){ return false; } }
function reloadIfChanged(){ if(!externalChanged()) return false; if(NP.dirty) npFlush(); US=loadState(); setLanguage(US.lang||"it",{skipSaveOld:true}); US.streak=computeStreak(); applyFont(); if(mounted&&!(ctx&&ctx.questions&&!ctx.finished&&curScreen==="quiz")){ if(parseHash()) route(); else go(US.lang||"it",true); } return true; }
let LEVELS=[], DICT_EXTRA=[], SPEAK_LANG="en-US", ALL_UNITS=[], VOCAB_POOL=[], DICT=[];
function setLanguage(lang, opts){ opts=opts||{}; if(!U_LANGS[lang]) lang="en";
  if(US.lang && !opts.skipSaveOld){ US.langStore[US.lang]=snapshotActive(); }
  US.lang=lang; LEVELS=U_LANGS[lang].levels; DICT_EXTRA=U_LANGS[lang].dictExtra; SPEAK_LANG=U_LANGS[lang].speak;
  applyLangData(US.langStore[lang]); indexCurriculum(); saveState(); }
let US=loadState();

/* ===== İNDEKS ===== */
function catForUnit(t){ if(/Vücut|Sağlık/.test(t)) return "Vücut"; if(/Hava|Mevsim/.test(t)) return "Doğa & Hava"; if(/Alışveriş|Ulaşım|Mahalle|Otel/.test(t)) return "Şehir"; if(/Rutin|Ev İşleri/.test(t)) return "Fiiller"; if(/Duygu/.test(t)) return "Sıfatlar"; if(/Selam|Tanış/.test(t)) return "Selamlaşma"; if(/Sayı|Renk/.test(t)) return "Sayılar & Renkler"; if(/Aile/.test(t)) return "Aile"; if(/Yiyecek/.test(t)) return "Yiyecek"; if(/Ev/.test(t)) return "Ev"; if(/Zaman/.test(t)) return "Zaman"; if(/Seyahat/.test(t)) return "Şehir"; return "Diğer"; }
function indexCurriculum(){ ALL_UNITS=[]; VOCAB_POOL=[]; DICT=[];
  LEVELS.forEach(lv=>lv.units.forEach(u=>{ u._level=lv; ALL_UNITS.push(u); if(u.type==="vocab"&&u.words) u.words.forEach(w=>VOCAB_POOL.push(w)); }));
  const seen=new Set(); const add=w=>{ const k=w.en.toLowerCase(); if(seen.has(k)) return; seen.add(k); DICT.push(w); };
  LEVELS.forEach(lv=>lv.units.forEach(u=>{ if(u.type==="vocab"&&u.words) u.words.forEach(w=>add({en:w.en,tr:w.tr,ex:w.ex,exTr:w.exTr,cat:catForUnit(u.title)})); }));
  DICT_EXTRA.forEach(add); DICT.sort((a,b)=>a.en.toLowerCase().localeCompare(b.en.toLowerCase(),"en")); }
const findUnit=uid=>ALL_UNITS.find(u=>u.uid===uid);
const levelById=id=>LEVELS.find(l=>l.id===id);
const isDone=uid=>US.completedLessons.includes(uid);
const levelCompleted=lv=>lv.units.every(u=>isDone(u.uid));
const levelDoneById=id=>{ const lv=levelById(id); return !!lv&&levelCompleted(lv); };
const isIntroLevel=lv=>!!lv&&lv.id===0;
function levelUnlocked(idx){ const lv=LEVELS[idx]; if(!lv||isIntroLevel(lv)) return true; let p=idx-1; while(p>=0&&isIntroLevel(LEVELS[p])) p--; if(p<0) return true;
  if(US.unlocks&&US.unlocks[lv.id]) return true; if(lv.units.some(u=>isDone(u.uid))) return true; return levelCompleted(LEVELS[p]); }
function levelColor(lv){ const id=lv?+lv.id:1; return id<=0?["--muted","--muted"]:id===1?["--l1","--lb1"]:id===2?["--l2","--lb2"]:id===3?["--l3","--lb3"]:["--l4","--lb4"]; }
const hasMainProgress=()=>LEVELS.some(lv=>!isIntroLevel(lv)&&lv.units.some(u=>isDone(u.uid)||unitStarted(u)||failedAttempt(u)));
const BADGES=[{id:"first",test:s=>s.completedLessons.length>=1},{id:"ten",test:s=>s.completedLessons.length>=10},{id:"g5",test:s=>s.grammarLearned>=5},{id:"w40",test:s=>s.wordsLearned>=40},{id:"streak3",test:s=>s.streak>=3},{id:"streak7",test:s=>s.streak>=7},{id:"l1",test:()=>levelDoneById(1)},{id:"l2",test:()=>levelDoneById(2)},{id:"l3",test:()=>levelDoneById(3)},{id:"l4",test:()=>levelDoneById(4)},{id:"perfect",test:s=>s.perfectQuiz===true}];
function checkBadges(){ let n=0; BADGES.forEach(b=>{ if(b.test(US)&&!US.earnedBadges.includes(b.id)){ US.earnedBadges.push(b.id); n++; } }); if(n) saveState(); return n; }
const dayKey=()=>typeof today==="function"?today():new Date().toISOString().slice(0,10);
function shiftDay(k,n){ const d=new Date(k+"T12:00:00"); d.setDate(d.getDate()+n); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function computeStreak(dates){ const set=new Set(dates||US.studyDates); let s=0,cur=dayKey(); if(!set.has(cur)) cur=shiftDay(cur,-1); while(set.has(cur)){ s++; cur=shiftDay(cur,-1); } return s; }
function registerStudyToday(){ const t=dayKey(); if(!US.studyDates.includes(t)) US.studyDates.push(t); US.studyDates=US.studyDates.slice(-60); US.streak=computeStreak(); saveState(); }

/* ===== ADIMLAR ===== */
const STEPS={vocab:[{k:"lesson",n:"Ezberle",go:"Ezberlemeye devam et"},{k:"flash",n:"Kartlar",go:"Kartlara devam et"},{k:"practice",n:"Telaffuz",go:"Telaffuza devam et"},{k:"quiz",n:"Test",go:"Teste geç"}],
  grammar:[{k:"rule",n:"Kural",go:"Kurala devam et"},{k:"examples",n:"Örnekler",go:"Örneklere devam et"},{k:"quiz",n:"Alıştırma",go:"Alıştırmaya geç"}]};
const TEACH_STEP={k:"teach",n:"Anlatım",go:"Konu anlatımına devam et"};
const hasLesson=u=>!!(u&&Array.isArray(u.lesson)&&u.lesson.length);
const unitSteps=u=>{ const b=STEPS[u.type==="grammar"?"grammar":"vocab"]; return hasLesson(u)?[TEACH_STEP].concat(b):b; };
const stepIdx=(u,k)=>unitSteps(u).findIndex(s=>s.k===k);
const stepNo=(u,k)=>stepIdx(u,k)+1;
const stepAfter=(u,k)=>{ const st=unitSteps(u), i=stepIdx(u,k); return (i>=0&&st[i+1])?st[i+1]:null; };
const upGet=uid=>{ const r=US.unitProgress[uid]; return (r&&typeof r==="object")?r:{}; };
function upRec(uid){ let r=US.unitProgress[uid]; if(!r||typeof r!=="object"){ r=US.unitProgress[uid]={}; } if(!r.done||typeof r.done!=="object") r.done={}; return r; }
function stepDone(u,k){ if(isDone(u.uid)) return true; if(k==="quiz") return false; const r=upGet(u.uid), d=r.done; if(d&&d[k]) return true;
  if(k==="teach") return !!(r.last||(d&&unitSteps(u).some(s=>s.k!=="teach"&&s.k!=="quiz"&&d[s.k]))); return false; }
function markStep(uid,k){ const r=upRec(uid); r.done[k]=1; saveState(); }
function setCur(u,k,pos){ const r=upRec(u.uid); r.cur=k; if(pos!=null){ if(!r.pos||typeof r.pos!=="object") r.pos={}; r.pos[k]=pos; } US.lastUid=u.uid; saveState(); }
const stepPos=(u,k)=>{ const p=upGet(u.uid).pos; return (!stepDone(u,k)&&p&&typeof p==="object"&&+p[k]>0)?+p[k]:0; };
function lastAttempt(u){ const r=upGet(u.uid); if(r.last) return r.last; const b=US.bestScores[u.uid]; return b!=null?{score:b,total:quizTotal(u),passed:isDone(u.uid)}:null; }
const failedAttempt=u=>{ if(isDone(u.uid)) return false; const a=lastAttempt(u); return !!a&&!a.passed; };
const unitStarted=u=>{ const r=upGet(u.uid); return !!(r.cur||(r.done&&Object.keys(r.done).length)); };
function nextStepFor(u){ if(isDone(u.uid)) return null; if(failedAttempt(u)) return "quiz"; const r=upGet(u.uid); if(r.cur&&stepIdx(u,r.cur)>=0&&!stepDone(u,r.cur)) return r.cur; const s=unitSteps(u).find(x=>!stepDone(u,x.k)); return s?s.k:"quiz"; }
function resumeLabel(u){ const k=nextStepFor(u); if(!k) return "Dersi aç";
  const ri=resumeInfo(quizKey(u.type==="grammar"?"grammar":"vocab",u.uid)); if(ri) return `${u.type==="grammar"?"Alıştırmaya":"Teste"} devam et (${ri.done}/${ri.total})`;
  if(failedAttempt(u)) return u.type==="grammar"?"Alıştırmayı tekrar çöz":"Testi tekrar çöz";
  if(!unitStarted(u)) return "Derse başla";
  const s=unitSteps(u)[stepIdx(u,k)]; let extra=""; const ps=stepPos(u,k); if((k==="flash"||k==="practice")&&ps>0&&u.words) extra=` (${Math.min(ps+1,u.words.length)}/${u.words.length})`;
  return s.go+extra; }
const quizTotal=u=>{ if(!u) return 0; if(u.type==="grammar") return buildGrammarQuiz(u).length; const n=(u.words||[]).length; return n?Math.min(6,Math.max(4,n)):0; };
const passMark=n=>Math.max(1, Math.ceil(n*0.67));
function infoFor(u){ if(UNIT_INFO[u.uid]) return UNIT_INFO[u.uid]; return "Bu derste şu kelimeleri öğreneceksin: "+(u.words||[]).slice(0,5).map(w=>w.en).join(", ")+"."; }

/* ===== TEST MOTORU ===== */
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const sample=(a,n)=>shuffle(a).slice(0,n);
function distractors(field,answer,n,word){ const other=field==="en"?"tr":"en", low=x=>String(x||"").trim().toLowerCase(); const seen=new Set([low(answer)]); const out=[];
  for(const w of shuffle(VOCAB_POOL)){ const v=w[field]; if(!v||seen.has(low(v))) continue; if(word&&low(w[other])===low(word[other])) continue; seen.add(low(v)); out.push(v); if(out.length>=n) break; } return out; }
function buildVocabQuiz(words,count){ const n=count||Math.min(6,Math.max(4,words.length)); const chosen=sample(words,Math.min(n,words.length)); while(chosen.length<n){ chosen.push(words[Math.floor(Math.random()*words.length)]); }
  const types=["en2tr","tr2en","listen"], LN=US.lang==="it"?"İtalyancası":"İngilizcesi";
  return chosen.map(w=>{ const t=types[Math.floor(Math.random()*types.length)];
    if(t==="tr2en"){ return {kind:"text",prompt:"\""+w.tr+"\" "+LN+" nedir?",options:shuffle([w.en,...distractors("en",w.en,2,w)]),answer:w.en,explain:"\""+w.tr+"\" = \""+w.en+"\".",word:w}; }
    if(t==="listen"){ return {kind:"listen",audio:w.en,prompt:"Dinle ve Türkçesini seç:",options:shuffle([w.tr,...distractors("tr",w.tr,2,w)]),answer:w.tr,explain:"Duyduğun: \""+w.en+"\" = \""+w.tr+"\".",word:w}; }
    return {kind:"text",prompt:"\""+w.en+"\" ne demek?",options:shuffle([w.tr,...distractors("tr",w.tr,2,w)]),answer:w.tr,explain:"\""+w.en+"\" = \""+w.tr+"\".",word:w}; }); }
const buildGrammarQuiz=u=>(u.exercises||[]).filter(e=>e&&e.options&&e.options.length).map(e=>({kind:"text",prompt:e.q,options:shuffle(e.options.slice()),answer:e.answer,explain:e.explain||""}));
function buildLevelTest(lv){ let qs=[]; lv.units.forEach(u=>{ if(u.type==="grammar"){ const g=buildGrammarQuiz(u); if(g.length) qs.push(g[Math.floor(Math.random()*g.length)]); } else if(u.words&&u.words.length){ qs=qs.concat(buildVocabQuiz(u.words,2)); } }); return shuffle(qs).slice(0,Math.min(10,qs.length)); }

/* ===== SESLİ OKUMA ===== */
let VOICES=[]; const TTS=typeof window!=="undefined"&&"speechSynthesis" in window;
function refreshVoices(){ if(TTS){ try{ VOICES=window.speechSynthesis.getVoices()||[]; }catch(e){ VOICES=[]; } } }
if(TTS){ refreshVoices(); try{ window.speechSynthesis.addEventListener("voiceschanged",refreshVoices); }catch(e){} [300,1000,2500].forEach(t=>setTimeout(refreshVoices,t)); }
const NOVELTY=/^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Pipe Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Deranged|Hysterical|Junior|Ralph|Fred|Kathy|Princess|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;
function langVoices(){ const p=SPEAK_LANG.slice(0,2); return VOICES.filter(v=>new RegExp("^"+p,"i").test(v.lang||"")&&!NOVELTY.test(v.name||"")); }
function pickVoice(){ const vs=langVoices(); if(US.settings.voiceURI){ const v=vs.find(x=>x.voiceURI===US.settings.voiceURI); if(v) return v; }
  const exact=vs.filter(v=>v.lang&&v.lang.replace("_","-").toLowerCase()===SPEAK_LANG.toLowerCase()); const pool=exact.length?exact:vs;
  return pool.find(v=>/enhanced|premium|natural/i.test(v.name))||pool.find(v=>v.default)||pool.find(v=>/google|samantha|alice|federica/i.test(v.name))||pool[0]||null; }
function speakSeq(texts){ texts=(texts||[]).map(t=>t==null?"":String(t).trim()).filter(Boolean); prAbort();
  const ext=voiceExt(); if(ext&&typeof ext.speak==="function"){ const st=voiceSt(); if(st&&st.tts===false){ toast("Bu cihazda sesli okuma yok."); return; }
    /* voice.js: dil başına seçilen ses + okuma hızı Ayarlar → Ses'ten (tek ses ayarı) */
    try{ ext.speak(texts.map(t=>({t,lang:prLang()}))); return; }catch(e){} }
  if(!TTS){ toast("Bu cihazda sesli okuma yok."); return; }
  const ss=window.speechSynthesis; if(!VOICES.length) refreshVoices(); try{ ss.cancel(); if(ss.paused) ss.resume(); }catch(e){}
  const v=pickVoice(); texts.forEach(t=>{ const u=new SpeechSynthesisUtterance(t); u.lang=SPEAK_LANG; u.rate=US.settings.rate||0.85; if(v) u.voice=v; try{ ss.speak(u); }catch(e){} }); }
const speak=t=>speakSeq([t]);
const speakWord=w=>{ if(!w) return; speakSeq(w.ex&&w.ex!==w.en?[w.en,w.ex]:[w.en]); };

/* ===== TELAFFUZ: puanlama (saf) ===== */
const PR_NUM={en:{ones:["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"],tens:["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"]},
  it:{ones:["zero","uno","due","tre","quattro","cinque","sei","sette","otto","nove","dieci","undici","dodici","tredici","quattordici","quindici","sedici","diciassette","diciotto","diciannove"],tens:["","","venti","trenta","quaranta","cinquanta","sessanta","settanta","ottanta","novanta"]}};
function prNumWord(n,lang){ const L=PR_NUM[lang==="it"?"it":"en"]; if(n<20) return L.ones[n];
  if(n<100){ const t=L.tens[Math.floor(n/10)], o=n%10; if(!o) return t; if(lang==="it") return ((o===1||o===8)?t.slice(0,-1):t)+L.ones[o]; return t+" "+L.ones[o]; }
  if(n===100) return lang==="it"?"cento":"one hundred"; if(lang!=="it"&&n<1000){ const h=Math.floor(n/100), r=n%100; return L.ones[h]+" hundred"+(r?" "+prNumWord(r,lang):""); } return String(n); }
const PR_ART={en:new Set(["a","an","the"]),it:new Set(["il","lo","la","l","i","gli","le","un","una","uno"])};
const PR_FILLERS=new Set(["uh","um","umm","eh","ehm","ah","hmm","mm"]);
const PR_ABBR={en:{mr:"mister",mrs:"missus",dr:"doctor",okay:"ok"},it:{}};
function prNorm(s,lang){ lang=lang==="it"?"it":"en";
  let t=String(s==null?"":s).normalize("NFC").toLowerCase().replace(/[’‘`´ʼ]/g,"'").replace(/\([^)]*\)/g," ").replace(/(\d)[:.]00\b/g,"$1").replace(/&/g,lang==="it"?" e ":" and ");
  if(lang==="en"){ t=t.replace(/\bwon't\b/g,"will not").replace(/\bcan't\b/g,"can not").replace(/\bcannot\b/g,"can not").replace(/\bshan't\b/g,"shall not").replace(/\bain't\b/g,"is not").replace(/\blet's\b/g,"let us")
      .replace(/n't\b/g," not").replace(/'re\b/g," are").replace(/'m\b/g," am").replace(/'ll\b/g," will").replace(/'ve\b/g," have").replace(/'d\b/g," would").replace(/'s\b/g," is").replace(/'/g,""); }
  else { t=t.replace(/'/g," "); }
  t=t.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const out=[]; t.split(" ").forEach(w=>{ if(!w||PR_FILLERS.has(w)) return; if(/^\d+$/.test(w)){ const n=parseInt(w,10); if(n<=999) prNumWord(n,lang).split(" ").forEach(x=>out.push(x)); else out.push(w); return; }
    const m=w.match(/^(\d+)(st|nd|rd|th)$/); if(m){ out.push(m[1]); return; } out.push(PR_ABBR[lang][w]||w); }); return out; }
function prLev(a,b){ if(a===b) return 0; const m=a.length,n=b.length; if(!m) return n; if(!n) return m; let p=new Array(n+1), c=new Array(n+1); for(let j=0;j<=n;j++) p[j]=j;
  for(let i=1;i<=m;i++){ c[0]=i; for(let j=1;j<=n;j++){ c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); } const x=p; p=c; c=x; } return p[n]; }
const prSim=(a,b)=>{ if(a===b) return 1; const L=Math.max(a.length,b.length); return L?1-prLev(a,b)/L:1; };
function prScoreOne(target,heard,lang){ const ART=PR_ART[lang==="it"?"it":"en"], open=/\.\.\.|…/.test(target); const T=prNorm(target,lang), H=prNorm(heard,lang);
  if(!T.length) return {score:0,bad:[]}; if(!H.length) return {score:0,bad:T.filter(w=>!ART.has(w))};
  const m=T.length,n=H.length, wt=w=>ART.has(w)?0.4:1, dp=[]; for(let i=0;i<=m;i++) dp.push(new Array(n+1).fill(0));
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++){ const s=prSim(T[i-1],H[j-1]); dp[i][j]=Math.max(dp[i-1][j],dp[i][j-1], s>=0.5?dp[i-1][j-1]+s*wt(T[i-1]):0); }
  const got=new Array(m).fill(0), usedH=new Set(); let i=m,j=n;
  while(i>0&&j>0){ const s=prSim(T[i-1],H[j-1]); if(s>=0.5&&Math.abs(dp[i][j]-(dp[i-1][j-1]+s*wt(T[i-1])))<1e-9){ got[i-1]=s; usedH.add(j-1); i--; j--; } else if(dp[i-1][j]>=dp[i][j-1]) i--; else j--; }
  let tw=0,sw=0; T.forEach((w,k)=>{ tw+=wt(w); sw+=got[k]*wt(w); }); const extra=H.filter((w,k)=>!usedH.has(k)&&!ART.has(w)).length;
  let score=sw/tw-(open?0:Math.min(0.2,0.05*extra)); let bad=T.filter((w,k)=>!ART.has(w)&&got[k]<0.75);
  const J=prSim(T.join(""),H.join("")); if(T.length!==H.length&&J>=0.9&&J>score){ score=J; bad=[]; }
  return {score:Math.max(0,Math.min(1,score)),bad}; }
function pronScore(target,heardList,lang){ const tgts=String(target==null?"":target).split("/").map(s=>s.trim()).filter(Boolean);
  const hs=(Array.isArray(heardList)?heardList:[heardList]).map(h=>String(h==null?"":h).trim()).filter(Boolean);
  let best={score:0,bad:prNorm(tgts[0]||"",lang).filter(w=>!PR_ART[lang==="it"?"it":"en"].has(w)),heard:hs[0]||"",target:tgts[0]||""};
  hs.forEach(h=>tgts.forEach(t=>{ const r=prScoreOne(t,h,lang); if(r.score>best.score+1e-9) best={score:r.score,bad:r.bad,heard:h,target:t}; }));
  best.grade=(best.score>=0.85&&!best.bad.length)?"good":(best.score>=0.6?"near":"bad"); return best; }
const PR_GOOD=0.85;
const pronBest=(uid,key)=>{ const p=upGet(uid).pron; return (p&&typeof p==="object"&&+p[key]>0)?+p[key]:0; };
function pronSave(uid,key,score){ if(!uid||!key) return; const r=upRec(uid); if(!r.pron||typeof r.pron!=="object"||Array.isArray(r.pron)) r.pron={}; if(!(+r.pron[key]>=score)){ r.pron[key]=Math.round(score*100)/100; saveState(); } }

/* ===== TELAFFUZ: dinleme (TYDIL.voice varsa onu, yoksa tarayıcı ses tanıma) ===== */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let MIC_OFF=(()=>{ try{ return /iP(hone|ad|od)/.test(navigator.userAgent)&&(navigator.standalone===true||matchMedia("(display-mode: standalone)").matches); }catch(e){ return false; } })();
const MIC_OFF_LANG={};
/* Ses katmanı: src/voice.js (TYDIL.voice = {listen, stop, speak, score, scoreInfo, state}) varsa onu kullanır → tek ses ayarı (Ayarlar → Ses);
   yoksa aşağıdaki taşınan tarayıcı sarmalayıcısı (yedek). */
const voiceExt=()=>{ const v=window.TYDIL&&TYDIL.voice; return (v&&typeof v.listen==="function")?v:null; };
const voiceSt=()=>{ const v=voiceExt(); if(!v) return null; try{ return v.state||null; }catch(e){ return null; } };
const micAvailable=()=>{ const v=voiceExt(); if(v){ const st=voiceSt(); return !!(st&&st.mic)&&!MIC_OFF&&!MIC_OFF_LANG[SPEAK_LANG]; } return !!SR&&!MIC_OFF&&!MIC_OFF_LANG[SPEAK_LANG]; };
/* Dinleme dili: Ayarlar → Ses'teki mikrofon dili (it-IT / en-GB / en-US), yoksa dersin dili */
const micLangTag=()=>{ const st=voiceSt(), m=st&&st.settings&&st.settings.micLang; const t=m&&m[prLang()]; return (typeof t==="string"&&t.toLowerCase().startsWith(prLang()))?t:SPEAK_LANG; };
const prLang=()=>SPEAK_LANG.indexOf("it")===0?"it":"en";
const prLangName=()=>prLang()==="it"?"İtalyanca":"İngilizce";
let PRS=null; const PR_TIMEOUT=7000;
function prBtnIdle(s){ const b=s&&s.btn; if(b&&b.isConnected){ b.classList.remove("listening"); b.innerHTML=b.dataset.label||(I("mic")+"Söyle ve kontrol et"); } }
function prAbort(){ const s=PRS; if(!s) return; PRS=null; clearTimeout(s.timer); clearTimeout(s.killer); clearTimeout(s.startT);
  try{ if(s.rec) s.rec.abort(); }catch(e){} try{ if(s.extStop) s.extStop(); }catch(e){} prBtnIdle(s);
  if(s.box&&s.box.isConnected&&s.box.classList.contains("listening")){ s.box.className="u-mic"; s.box.textContent="Hazır olduğunda tekrar mikrofona bas."; } }
const PR_PERM_HELP=`<ul><li><b>Bilgisayar (Chrome / Edge):</b> adres çubuğunun solundaki kilit simgesi → <b>Mikrofon</b> → <b>İzin ver</b>, sonra sayfayı yenile.</li><li><b>Android:</b> Chrome ⋮ → Ayarlar → Site ayarları → Mikrofon → bu siteye izin ver.</li><li><b>iPhone:</b> Ayarlar → Safari → Mikrofon → İzin Ver.</li></ul>`;
function prErrorInfo(code){ switch(code){
  case "no-speech": return {msg:"Sesini duyamadım.", act:"Mikrofon düğmesine bastıktan sonra hemen, biraz yüksek sesle söyle. Tekrar dene."};
  case "audio-capture": return {msg:"Mikrofon bulunamadı ya da başka bir uygulama kullanıyor.", act:"Mikrofonun açık olduğunu kontrol et, görüntülü arama uygulamalarını kapat, tekrar dene."};
  case "not-allowed": return {msg:"Mikrofon izni verilmedi.", act:"Mikrofona izin vermek için:", html:PR_PERM_HELP};
  case "service-not-allowed": return {msg:"Bu cihazda ses tanıma hizmeti kapalı.", act:"Kelimeyi dinle, sesli söyle ve “Ben söyledim, devam”a bas.", fatal:true};
  case "network": return {msg:"Ses tanıma için internet gerekiyor.", act:"İnternet bağlantını kontrol edip tekrar dene."};
  case "language-not-supported": return {msg:"Bu cihaz "+prLangName()+" ses tanımayı desteklemiyor.", act:"Kelimeyi dinle, sesli söyle ve “Ben söyledim, devam”a bas.", fatal:true, lang:true};
  case "aborted": return {msg:"Dinleme yarıda kesildi.", act:"Tekrar dene."};
  case "start-failed": return {msg:"Mikrofon başlatılamadı.", act:"Birkaç saniye bekleyip tekrar dene. Olmazsa “Ben söyledim, devam”a bas."};
  default: return {msg:"Ses tanıma çalışmadı ("+code+").", act:"Tekrar dene veya “Ben söyledim, devam”a bas."}; } }
function prMarkTarget(target,bad,lang){ const badSet=new Set(bad||[]); return String(target).split(/(\s+)/).map(p=>{ if(!p.trim()) return p; return prNorm(p,lang).some(x=>badSet.has(x))?`<mark>${uesc(p)}</mark>`:uesc(p); }).join(""); }
/* opts: {target, box, btn, small, uid, key, nextHtml, onGood(res), onFatal(info)} */
function pronStart(opts){ const now=Date.now();
  if(PRS){ if(PRS.btn===opts.btn){ if(now-PRS.t0<700) return true; prStopUser(); return true; } prAbort(); }
  if(!micAvailable()||!opts.box) return false;
  const box=opts.box, btn=opts.btn; const s={opts,box,btn,lang:prLang(),t0:now,finals:null,interim:"",err:null,userStop:false,rec:null}; PRS=s;
  if(btn){ if(!btn.dataset.label) btn.dataset.label=btn.innerHTML; btn.classList.add("listening"); btn.innerHTML=opts.small?I("stop"):I("stop")+"Dinliyorum… durdur"; }
  box.className="u-mic listening"; box.innerHTML="<span class='u-pulse'>Hazırlanıyor…</span>";
  let wait=0; try{ if(TTS){ const ss=window.speechSynthesis; if(ss.speaking||ss.pending) wait=350; ss.cancel(); } }catch(e){}
  s.startT=setTimeout(()=>prBegin(s),wait); return true; }
function prBegin(s){ if(PRS!==s) return;
  const ext=voiceExt();
  if(ext){ s.begunAt=Date.now(); s.box.innerHTML="<span class='u-pulse'>Dinliyorum… şimdi söyle</span><div class='u-live'></div>";
    /* voice.js: listen({lang,onInterim}) → Promise {text, err, aborted}; boş erken bitişte kendisi yeniden dinler */
    let r; try{ r=ext.listen({lang:micLangTag(), onInterim:t=>{ if(PRS!==s) return; const lv=s.box.querySelector(".u-live"); if(lv&&t) lv.textContent="“"+t+"”"; }}); }catch(e){ prFinish(s,"start-failed"); return; }
    s.extStop=()=>{ try{ if(typeof ext.stop==="function") ext.stop(); }catch(e){} };
    Promise.resolve(r).then(res=>{ if(PRS!==s) return; const text=res&&typeof res.text==="string"?res.text.trim():"";
      if(text){ s.finals=null; s.extCands=[text]; prFinish(s); return; }
      const err=(res&&res.err)||"no-speech"; if(err==="unsupported"){ prFinish(s,"service-not-allowed"); return; } prFinish(s,res&&res.aborted?"aborted":err); },
      e=>{ if(PRS!==s) return; prFinish(s,(e&&(e.code||e.error))||"unknown"); }); return; }
  let rec; try{ rec=new SR(); }catch(e){ prFinish(s,"start-failed"); return; }
  s.rec=rec; rec.lang=SPEAK_LANG; rec.interimResults=true; rec.maxAlternatives=5; rec.continuous=false;
  rec.onstart=()=>{ if(PRS!==s) return; if(!s.box.isConnected){ prAbort(); return; } s.box.innerHTML="<span class='u-pulse'>Dinliyorum… şimdi söyle</span><div class='u-live'></div>"; };
  rec.onresult=e=>{ if(PRS!==s) return; if(!s.box.isConnected){ prAbort(); return; } const fin=[]; let interim="", allFinal=true;
    for(let i=0;i<e.results.length;i++){ const r=e.results[i]; if(!r||!r.length) continue; if(r.isFinal) fin.push(r); else { allFinal=false; interim+=((r[0]&&r[0].transcript)||"")+" "; } }
    if(fin.length) s.finals=fin; const live=(fin.map(r=>r[0].transcript).join(" ")+" "+interim).replace(/\s+/g," ").trim(); if(live) s.interim=live;
    const lv=s.box.querySelector(".u-live"); if(lv) lv.textContent=live?"“"+live+"”":""; if(fin.length&&allFinal){ try{ rec.stop(); }catch(_){} } };
  rec.onerror=ev=>{ if(PRS!==s) return; s.err=(ev&&ev.error)||"unknown"; };
  rec.onend=()=>{ if(PRS!==s) return; prFinish(s); };
  s.begunAt=Date.now(); try{ rec.start(); }catch(e){ prFinish(s,"start-failed"); return; }
  clearTimeout(s.timer); s.timer=setTimeout(()=>{ if(PRS!==s) return; s.timedOut=true; try{ rec.stop(); }catch(_){} s.killer=setTimeout(()=>{ if(PRS===s){ try{ rec.abort(); }catch(_){} prFinish(s); } },1500); },PR_TIMEOUT); }
function prStopUser(){ const s=PRS; if(!s) return; s.userStop=true; if(s.extStop){ try{ s.extStop(); }catch(e){} return; } if(!s.rec){ prAbort(); return; } try{ s.rec.stop(); }catch(_){}
  clearTimeout(s.killer); s.killer=setTimeout(()=>{ if(PRS===s){ try{ s.rec.abort(); }catch(_){} prFinish(s); } },1500); }
function prCandidates(s){ if(s.extCands) return s.extCands; const f=s.finals;
  if(f&&f.length){ const out=[], n=Math.max(...f.map(r=>r.length)); for(let j=0;j<n;j++) out.push(f.map(r=>((r[j]||r[0]).transcript)||"").join(" ").trim()); return out.filter(Boolean); }
  return s.interim?[s.interim]:[]; }
function prFinish(s,forcedErr){ if(PRS!==s) return;
  /* Edge: hiçbir şey duymadan ~1 sn içinde boş sonuçla kapanır → sessizce yeniden dinle (en çok 2 kez) */
  if(!forcedErr&&!s.userStop&&!s.timedOut&&!s.extCands&&(s.retries||0)<2&&s.begunAt&&(Date.now()-s.begunAt)<3000&&!prCandidates(s).length&&(!s.err||s.err==="no-speech"||s.err==="aborted")&&s.box&&s.box.isConnected&&!voiceExt()){
    s.retries=(s.retries||0)+1; s.err=null; s.finals=null; s.interim=""; clearTimeout(s.killer);
    try{ if(s.rec){ s.rec.onend=null; s.rec.onerror=null; s.rec.onresult=null; s.rec.onstart=null; } }catch(_){} setTimeout(()=>prBegin(s),150); return; }
  PRS=null; clearTimeout(s.timer); clearTimeout(s.killer); prBtnIdle(s); const box=s.box, o=s.opts; if(!box||!box.isConnected) return;
  const cands=forcedErr?[]:prCandidates(s);
  if(cands.length){ let res=null; const ext=voiceExt();
    if(ext&&typeof ext.scoreInfo==="function"){ try{ const r=ext.scoreInfo(o.target,cands,s.lang); if(r&&typeof r.score==="number") res=Object.assign(pronScore(o.target,cands,s.lang),r); }catch(e){ res=null; } }
    else if(ext&&typeof ext.score==="function"){ try{ const r=ext.score(o.target,cands,s.lang); if(typeof r==="number") res=Object.assign(pronScore(o.target,cands,s.lang),{score:Math.max(0,Math.min(1,r))}); }catch(e){ res=null; } }
    if(res&&!res.grade) res.grade=(res.score>=PR_GOOD&&!(res.bad||[]).length)?"good":(res.score>=0.6?"near":"bad");
    prShowResult(s,res||pronScore(o.target,cands,s.lang)); return; }
  let code=forcedErr||s.err||"no-speech"; if(code==="aborted"&&s.timedOut) code="no-speech";
  if(s.userStop&&(code==="aborted"||code==="no-speech")){ box.className="u-mic"; box.textContent="Durduruldu. Hazır olduğunda tekrar mikrofona bas."; return; }
  const info=prErrorInfo(code); if(info.fatal){ if(info.lang) MIC_OFF_LANG[SPEAK_LANG]=true; else MIC_OFF=true; if(o.onFatal){ o.onFatal(info); return; } }
  box.className="u-mic warn"; box.innerHTML=`<div class="mt">${uesc(info.msg)}</div><div>${uesc(info.act)}</div>${info.html||""}`; }
function prShowResult(s,res){ const o=s.opts, box=s.box, pct=Math.round(res.score*100), tgt=res.target||o.target; res.bad=res.bad||[];
  if(o.uid&&o.key) pronSave(o.uid,o.key,res.grade==="good"?res.score:Math.min(res.score,PR_GOOD-0.01));
  const heard=`<div class="mh">Duyduğum: <b>“${uesc(res.heard||"")}”</b> · benzerlik %${pct}</div>`;
  const badOrig=[]; String(tgt).split(/\s+/).forEach(p=>{ if(prNorm(p,s.lang).some(x=>res.bad.includes(x))) badOrig.push(p.replace(/[.,!?;:…"“”¿¡]+/g,"")); });
  if(res.grade==="good"){ box.className="u-mic good"; box.innerHTML=`<div class="mt">Çok iyi! Doğru söyledin.</div>${heard}${o.nextHtml||""}`; if(o.onGood) o.onGood(res); }
  else if(res.grade==="near"){ box.className="u-mic near"; box.innerHTML=`<div class="mt">Neredeyse${badOrig.length?" — şu kelimeye dikkat: <b>"+uesc(badOrig.join(", "))+"</b>":" — sadece hedefi söyle."}</div><div class="mh">Hedef: ${prMarkTarget(tgt,res.bad,s.lang)}</div>${heard}<div>Tekrar dinle, sonra yavaşça yeniden söyle.</div>`; }
  else { box.className="u-mic bad"; box.innerHTML=`<div class="mt">Tekrar dene</div><div class="mh">Hedef: ${prMarkTarget(tgt,res.bad,s.lang)}</div>${heard}<div>Önce Dinle'ye bas, sonra kelime kelime, yavaşça söyle.</div>`; }
  const nb=box.querySelector("[data-focus]"); if(nb){ try{ nb.focus({preventScroll:true}); }catch(_){} } }

/* ===== GEZİNME ===== */
function parseHash(){ const h=(location.hash||"").replace(/^#/,""); if(!/^dersler(\/|$)/i.test(h)) return null; return h.split("/").slice(1).map(x=>{ try{ return decodeURIComponent(x); }catch(e){ return x; } }); }
function go(path,replace){ const h="#dersler/"+path; const d=(history.state&&history.state.uDepth)||0;
  try{ if(replace) history.replaceState({uDepth:d},"",h); else history.pushState({uDepth:d+1},"",h); }catch(e){ location.hash=h; return; } route(); }
function back(){ const d=(history.state&&history.state.uDepth)||0; if(d>0){ history.back(); return; } go(US.lang||"it",true); }
function showTab(){ const t=document.getElementById("tab-units"); if(t&&t.hidden&&window.TYDIL) TYDIL.openTab("units"); }
function route(){ const p=parseHash(); if(!p) return; if(!mounted){ showTab(); return; } showTab(); prAbort(); npLeave();
  const lang=U_LANGS[p[0]]?p[0]:null; if(!lang){ go(US.lang||"it",true); return; } if(lang!==US.lang){ setLanguage(lang); }
  const a=p[1]||"";
  if(!a){ renderHome(); return; }
  if(a==="sozluk"){ renderDict(); return; } if(a==="notlar"){ renderNotes(); return; } if(a==="yedek"){ renderBackup(); return; } if(a==="tekrar"){ renderReview(); return; }
  if(a==="karisik"||a==="karisik-tekrar"){ renderQuizIntro({mode:"mix",fromReview:a==="karisik-tekrar"}); return; }
  const lm=/^seviye-(\d+)$/.exec(a); if(lm){ const lv=levelById(+lm[1]); if(!lv){ go(lang,true); return; } renderQuizIntro({mode:"leveltest",level:lv}); return; }
  const u=findUnit(a); if(!u){ go(lang,true); return; }
  const k=p[2]; if(!k||stepIdx(u,k)<0){ go(lang+"/"+u.uid+"/"+(nextStepFor(u)||"quiz"),true); return; }
  showStep(u,k); }
function setScreen(name,html){ curScreen=name; view.innerHTML=html; window.scrollTo(0,0); npFabSync(); }
const unitPath=(u,k)=>US.lang+"/"+u.uid+"/"+k;

/* ===== ANA EKRAN: dil → seviyeler → ünite ızgarası ===== */
function topHtml(){ const fs=US.settings.fontScale||1;
  return `<div class="u-top">
    <div class="seg" role="group" aria-label="Dil seç">${["it","en"].map(c=>{ const st=c===US.lang?US:(US.langStore[c]||{}), dn=(st.completedLessons||[]).length, tot=U_LANGS[c].levels.reduce((a,l)=>a+l.units.length,0);
      return `<button type="button" data-act="lang" data-lang="${c}" class="${US.lang===c?"on":""}" aria-pressed="${US.lang===c}" aria-label="${uesc(U_LANGS[c].name)}: ${dn} / ${tot} ünite tamam">${FLAG(c)} ${uesc(U_LANGS[c].name)} <span class="u-lp">${dn}/${tot}</span></button>`; }).join("")}</div>
    <div class="u-tools"><button type="button" class="btn btn-ghost" data-act="dict">${I("book")}Sözlük</button><button type="button" class="btn btn-ghost" data-act="notes">${I("note")}Notlar</button><button type="button" class="btn btn-ghost" data-act="fsToggle" aria-expanded="${!!ctx.fsOpen}" aria-controls="uFs">${I("font")}Yazı boyutu</button></div>
    <div class="u-fs" id="uFs" ${ctx.fsOpen?"":"hidden"}><span class="lbl">Yazı boyutu (yalnızca Dersler)</span><div class="seg">${[[1,"Normal"],[1.15,"Büyük"],[1.3,"Çok büyük"]].map(([v,n])=>`<button type="button" data-act="setFont" data-v="${v}" class="${fs===v?"on":""}" aria-pressed="${fs===v}">${n}</button>`).join("")}</div>
      ${voiceExt()?`<span class="lbl">Okuma hızı ve sesler: Ayarlar → Ses</span>`:`<span class="lbl">Okuma hızı</span><div class="seg">${[[0.7,"Çok yavaş"],[0.85,"Yavaş"],[1,"Normal"]].map(([v,n])=>`<button type="button" data-act="setRate" data-v="${v}" class="${(US.settings.rate||0.85)===v?"on":""}" aria-pressed="${(US.settings.rate||0.85)===v}">${n}</button>`).join("")}</div>`}</div>
  </div>`; }
function unitTag(u){ return u.type==="grammar"?`<span class="u-tag g">Gramer</span>`:`<span class="u-tag v">Kelime</span>`; }
function unitStatus(u){ if(isDone(u.uid)){ const best=US.bestScores[u.uid], tot=quizTotal(u); return `<span class="u-tag ok">Geçtin${best!=null?` · ${tot?Math.min(best,tot)+"/"+tot:best}`:""}</span>`; }
  if(failedAttempt(u)){ const a=lastAttempt(u); return `<span class="u-tag bad">Tekrar dene${a&&a.total?` · ${a.score}/${a.total}`:""}</span>`; }
  if(unitStarted(u)){ const k=nextStepFor(u), i=stepIdx(u,k), st=unitSteps(u); return `<span class="u-tag go">Devam: ${i+1}/${st.length} ${uesc(st[i].n)}</span>`; }
  return `<span class="u-tag new">Başlanmadı</span>`; }
function ringHtml(u){ if(isDone(u.uid)) return `<span class="u-ring done" aria-label="Geçti">${I("check")}</span>`;
  const st=unitSteps(u), n=st.filter(s=>stepDone(u,s.k)).length, pct=Math.round(n/st.length*100), r=19, c=2*Math.PI*r, retry=failedAttempt(u);
  return `<span class="u-ring${retry?" retry":""}" aria-label="${retry?"Tekrar gerekli":pct+"% tamam"}"><svg viewBox="0 0 46 46"><circle class="bg" cx="23" cy="23" r="${r}"/><circle class="fg" cx="23" cy="23" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c*(1-pct/100)).toFixed(1)}"/></svg>${retry?"!":pct+"%"}</span>`; }
function nextUnit(){ let nextU=null; const skipIntro=hasMainProgress();
  for(let i=0;i<LEVELS.length;i++){ const lv=LEVELS[i]; if(skipIntro&&isIntroLevel(lv)) continue; const u=lv.units.find(x=>!isDone(x.uid)); if(u){ if(levelUnlocked(i)) nextU=u; break; } }
  const lastU=US.lastUid&&findUnit(US.lastUid); if(lastU&&!isDone(lastU.uid)&&levelUnlocked(LEVELS.indexOf(lastU._level))&&(unitStarted(lastU)||failedAttempt(lastU))) nextU=lastU; return nextU; }
const lvOpen={};
function renderHome(){ const nextU=nextUnit(); const totalU=ALL_UNITS.length, doneU=ALL_UNITS.filter(u=>isDone(u.uid)).length;
  let html=topHtml();
  if(nextU){ const started=unitStarted(nextU), failed=failedAttempt(nextU), la=lastAttempt(nextU);
    html+=`<div class="u-card u-cont"><p class="u-kicker">${started||failed?"Kaldığın yerden devam et":"Sıradaki ders"} · ${uesc(nextU._level.cefr)}</p><div class="t">${uIcon(nextU)}${uesc(nextU.title)}</div>
      <p class="u-muted">${uesc(nextU._level.name)} · ${nextU.type==="grammar"?"Gramer dersi":"Kelime dersi"}${failed&&la?` · Son deneme <b>${la.score}/${la.total||quizTotal(nextU)}</b>, geçmek için en az <b>${passMark(la.total||quizTotal(nextU))}</b> doğru`:""}</p>
      <button type="button" class="btn btn-primary" data-act="resume" data-uid="${nextU.uid}">${uesc(resumeLabel(nextU))}</button></div>`; }
  else if(doneU===totalU&&totalU){ html+=`<div class="u-card"><h3>Tüm dersleri bitirdin</h3><p class="u-muted">Karışık tekrar ile bilgini taze tut.</p><div class="u-row"><button type="button" class="btn btn-accent" data-act="goto" data-to="karisik">Karışık tekrar</button></div></div>`; }
  LEVELS.forEach((lv,idx)=>{ const unlocked=levelUnlocked(idx), done=lv.units.filter(u=>isDone(u.uid)).length, [lc,lb]=levelColor(lv), key=US.lang+":"+lv.id;
    const open=lvOpen[key]!=null?lvOpen[key]:(nextU?nextU._level===lv:idx===0);
    html+=`<details class="u-lv" data-lv="${key}" style="--lc:var(${lc});--lb:var(${lb})" ${open?"open":""}><summary><span class="cefr">${uesc(lv.cefr)}</span><b>${uesc(lv.name)}</b><span class="prog">${done}/${lv.units.length} ünite${unlocked?"":" · Kilitli"}</span>${I("down","chev")}</summary>
      <div class="lv-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${lv.units.length}" aria-valuenow="${done}"><span style="width:${Math.round(done/lv.units.length*100)}%"></span></div>
      ${done===lv.units.length?`<p class="done">Bu seviye tamam.</p>`:""}<p class="desc">${uesc(lv.desc)}</p>`;
    if(!unlocked){ html+=`<div class="lock">Bu seviye, bir önceki seviyeyi bitirince açılır. Denemek istersen yine de açabilirsin.</div><button type="button" class="btn btn-ghost" data-act="unlock" data-id="${lv.id}">Bu seviyeyi yine de aç</button>`; }
    else { html+=`<ul class="u-grid">${lv.units.map(u=>`<li><button type="button" class="u-ucard${nextU===u?" next":""}" data-act="resume" data-uid="${u.uid}">${uIcon(u)}<span><span class="t">${uesc(u.title)}</span><span class="tags">${unitTag(u)}${unitStatus(u)}${nextU===u?`<span class="u-tag nx">Sıradaki</span>`:""}</span></span>${ringHtml(u)}</button></li>`).join("")}</ul>
      <button type="button" class="btn btn-soft btn-sm u-lvtest" data-act="goto" data-to="seviye-${lv.id}">${uesc(lv.cefr)} seviye testi (karışık)</button>`; }
    html+=`</details>`; });
  html+=`<div class="u-card"><h3>Bu dildeki durumun</h3><p class="u-muted">${doneU}/${totalU} ünite · ${US.wordsLearned} kelime · ${US.grammarLearned} gramer · seri ${US.streak} gün · tekrar listesinde ${US.reviewWords.length} kelime</p>
    <div class="u-row"><button type="button" class="btn btn-soft" data-act="goto" data-to="tekrar">Tekrar listesi (${US.reviewWords.length})</button></div></div>`;
  setScreen("home",html); }

/* ===== ÜNİTE EKRANLARI ===== */
function stepperHtml(u,cur){ const st=unitSteps(u), ci=stepIdx(u,cur); const note=pendingNote; pendingNote="";
  return `${note?`<div class="u-note" role="status">${uesc(note)}</div>`:""}<div class="u-pos">Adım ${ci+1} / ${st.length}: <b>${uesc(st[ci].n)}</b></div>
    <div class="u-steps" id="uSteps">${st.map((s,i)=>{ const ok=stepDone(u,s.k), c=i===ci; return `<button type="button" class="u-step${ok?" ok":""}${c?" cur":""}" data-act="step" data-uid="${u.uid}" data-k="${s.k}" ${c?'aria-current="step"':""} aria-label="Adım ${i+1}: ${uesc(s.n)}${ok?" (bitti)":""}"><span class="n">${ok?I("check"):i+1}</span>${uesc(s.n)}</button>`; }).join("")}</div>`; }
function ubarHtml(u,cur){ return `<div class="u-card u-ubar"><div class="head"><button type="button" class="u-back" data-act="back" aria-label="Ünite listesine dön">${I("back")}Üniteler</button><div><div class="ttl">${uIcon(u)}<span class="tt">${uesc(u.title)}</span></div><div class="sub">${FLAG(US.lang)} ${uesc(u._level.cefr)} · ${uesc(u._level.name)} · ${u.type==="grammar"?"Gramer":"Kelime"} dersi</div></div><button type="button" class="u-notebtn" data-act="noteFab" aria-label="Not al">${I("note")}Not</button></div>${stepperHtml(u,cur)}</div>`; }
const speakBtn=(act,i,extra)=>`<button type="button" class="u-spk" data-act="${act}" data-i="${i}" ${extra||""} title="Dinle" aria-label="Dinle">${I("speak")}</button>`;
function showStep(u,k){ const resumePos=stepPos(u,k);
  switch(k){ case "teach": renderTeach(u); break; case "lesson": renderVocab(u); break; case "rule": renderRule(u); break; case "examples": renderExamples(u); break;
    case "flash": renderFlash(u,resumePos); break; case "practice": renderPractice(u,resumePos); break;
    case "quiz": { const mode=u.type==="grammar"?"grammar":"vocab"; if(ctx.mode===mode&&ctx.unit===u&&ctx.questions&&!ctx.finished&&curScreen==="quiz") return; renderQuizIntro({mode,unit:u}); break; } } }
function goStep(u,k){ if(k==="flash"||k==="practice"){ /* dersten çıkarken ders adımını bitmiş say */ if(curScreen==="vocab") markStep(u.uid,"lesson"); }
  if(k==="quiz"&&u.type==="vocab"&&curScreen==="vocab") markStep(u.uid,"lesson");
  if((k==="quiz"||k==="examples")&&u.type==="grammar"&&curScreen==="rule") markStep(u.uid,"rule");
  if(k==="quiz"&&u.type==="grammar"&&curScreen==="examples"){ markStep(u.uid,"rule"); markStep(u.uid,"examples"); }
  go(unitPath(u,k),curScreen!=="home"); }
/* --- Anlatım (u.lesson blokları) --- */
const LS_CHECKS={};
function lsHtml(h){ return uesc(h==null?"":h).replace(/&lt;(\/?)(b|i|strong|em)&gt;/gi,"<$1$2>").replace(/&lt;br\s*\/?&gt;/gi,"<br>").replace(/&lt;span class=(?:&quot;|&#39;)hl(?:&quot;|&#39;)&gt;/gi,'<span class="hl">').replace(/&lt;\/span&gt;/gi,"</span>"); }
function lsText(h){ const d=document.createElement("div"); d.innerHTML=lsHtml(h); return (d.textContent||"").replace(/\s+/g," ").trim(); }
const lsSpeakBtn=(b,i,label)=>`<button type="button" class="u-spk" data-act="lsSpeak" data-b="${b}"${i!=null?` data-i="${i}"`:""} title="Dinle" aria-label="${uesc(label||"Dinle")}">${I("speak")}</button>`;
function lsSpeakText(u,b,i){ const x=u&&u.lesson&&u.lesson[b]; if(!x) return ""; if(x.t==="sounds") return x.items&&x.items[i]?lsText(x.items[i].w):""; if(x.t==="ex") return x.items&&x.items[i]?lsText(x.items[i].f):"";
  if(x.t==="build") return (x.parts||[]).map(p=>lsText(p.x)).filter(Boolean).join(" ").replace(/\s+([,.!?;:])/g,"$1"); return ""; }
function lsCheckHtml(u,x,b){ const key=u.uid+":"+b, pick=LS_CHECKS[key], answered=pick!=null, opts=x.options||[]; const ok=answered&&opts[pick]===x.answer;
  return `<div class="ls-chk" id="lsChk${b}"><p class="q"><small>KENDİNİ KONTROL ET</small>${lsHtml(x.q)}</p>${opts.map((o,i)=>`<button type="button" class="u-opt${answered&&o===x.answer?" correct":""}${answered&&i===pick&&o!==x.answer?" wrong":""}" data-act="lsCheck" data-b="${b}" data-i="${i}"${answered?" disabled":""}><span>${lsHtml(o)}</span></button>`).join("")}
    <div class="u-fb${answered?(ok?" good":" bad"):""}" role="status" ${answered?"":"hidden"}>${answered?(ok?"Doğru!":"Doğrusu: <b>"+lsHtml(x.answer)+"</b>")+(x.explain?"<br>"+lsHtml(x.explain):""):""}</div></div>`; }
function lsBlockHtml(u,x,b){ if(!x||typeof x!=="object") return ""; const L=prLang();
  switch(x.t){
    case "p": return `<p class="ls-p">${lsHtml(x.html!=null?x.html:x.text)}</p>`;
    case "table": { const head=x.head||[], rows=x.rows||[]; return `<div class="ls-blk">${x.caption?`<p class="ls-cap">${lsHtml(x.caption)}</p>`:""}<div class="u-tw ls-tbl" tabindex="0" role="region" aria-label="${uesc(lsText(x.caption)||"Tablo")}"><table class="u-tbl">${head.length?`<thead><tr>${head.map(h=>`<th>${lsHtml(h)}</th>`).join("")}</tr></thead>`:""}<tbody>${rows.map(r=>`<tr>${(r||[]).map(c=>`<td>${lsHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`; }
    case "sounds": return `<div class="ls-blk">${(x.items||[]).map((it,i)=>`<div class="ls-snd"><div class="m"><div class="w" lang="${L}">${lsHtml(it.w)}</div>${it.say?`<div class="say">okunuşu ≈ <b>${lsHtml(it.say)}</b></div>`:""}${it.note?`<div class="nt">${lsHtml(it.note)}</div>`:""}</div>${lsSpeakBtn(b,i,"Dinle: "+lsText(it.w))}</div>`).join("")}</div>`;
    case "build": return `<div class="ls-blk ls-build"><div class="bd-row" lang="${L}">${(x.parts||[]).map((p,i)=>`<span class="bd-part bd-c${i%5}"><span class="bd-x">${lsHtml(p.x)}</span>${p.r?`<span class="bd-r" lang="tr">${lsHtml(p.r)}</span>`:""}</span>`).join("")}</div><div class="bd-foot"><div class="bd-tr">${x.tr?"= "+lsHtml(x.tr):""}</div>${lsSpeakBtn(b,null,"Cümleyi dinle")}</div></div>`;
    case "compare": { const col=c=>`<div>${c&&c.title?`<h4>${lsHtml(c.title)}</h4>`:""}<ul>${((c&&c.items)||[]).map(t=>`<li>${lsHtml(t)}</li>`).join("")}</ul></div>`; return `<div class="ls-blk ls-cmp">${col(x.left)}${col(x.right)}</div>`; }
    case "note": return x.kind==="warn"?`<div class="ls-blk ls-note warn"><b>Dikkat:</b> ${lsHtml(x.html!=null?x.html:x.text)}</div>`:`<div class="ls-blk ls-note"><b>İpucu:</b> ${lsHtml(x.html!=null?x.html:x.text)}</div>`;
    case "ex": return `<div class="ls-blk">${(x.items||[]).map((it,i)=>`<div class="u-wrow"><div class="m"><div class="w" lang="${L}">${lsHtml(it.f)}</div>${it.tr?`<div class="u-tr">${lsHtml(it.tr)}</div>`:""}</div>${lsSpeakBtn(b,i,"Dinle: "+lsText(it.f))}</div>`).join("")}</div>`;
    case "check": return `<div class="ls-blk">${lsCheckHtml(u,x,b)}</div>`; }
  return ""; }
function lsSections(u){ const secs=[]; let cur=null; u.lesson.forEach((x,b)=>{ if(x&&x.t==="h"){ cur={title:x.text||"",items:[]}; secs.push(cur); } else { if(!cur){ cur={title:"",items:[]}; secs.push(cur); } cur.items.push(b); } }); return secs; }
function renderTeach(u){ if(!hasLesson(u)){ go(unitPath(u,unitSteps(u)[0].k),true); return; } ctx={unit:u}; setCur(u,"teach");
  const secs=lsSections(u), titled=secs.filter(s=>s.title), nxt=stepAfter(u,"teach"), done=stepDone(u,"teach"); let n=0;
  const secHtml=secs.map((s,si)=>{ const num=s.title?++n:0; return `<div class="u-card ls-sec" id="lsSec${si}">${s.title?`<h3 class="ls-h"><span class="n">${num}</span>${lsHtml(s.title)}</h3>`:""}${s.items.map(b=>lsBlockHtml(u,u.lesson[b],b)).join("")}</div>`; }).join("");
  const toc=titled.length>=3?`<div class="ls-toc" role="navigation" aria-label="Bölümler">${secs.map((s,si)=>s.title?`<button type="button" data-act="jump" data-target="lsSec${si}"><span class="n">${titled.indexOf(s)+1}.</span>${lsHtml(s.title)}</button>`:"").join("")}</div>`:"";
  setScreen("teach",`${ubarHtml(u,"teach")}<div class="u-card"><p class="u-kicker">Konu anlatımı</p><div class="u-goal">Önce konuyu oku ve örnekleri dinle. Sonra ${uesc(nxt?nxt.n:"sonraki adım")} ile pekiştir.</div>${toc}</div>${secHtml}<div id="uNotesSlot"></div>
    <div class="u-card"><h3>${done?"Konu anlatımını tamamlamıştın":"Hepsini okudun mu?"}</h3><p class="u-muted">${nxt?`Sıradaki: ${stepNo(u,nxt.k)}. adım — <b>${uesc(nxt.n)}</b>.`:""}</p><div class="u-row"><button type="button" class="btn btn-primary" data-act="teachDone" data-uid="${u.uid}">Anladım → ${uesc(nxt?nxt.n:"sonraki adım")}</button><button type="button" class="btn btn-ghost" data-act="back">Üniteler</button></div></div>`);
  notesMount(u.uid,"full"); view.querySelectorAll(".ls-tbl").forEach(t=>{ if(t.scrollWidth>t.clientWidth+2) t.insertAdjacentHTML("afterend",'<p class="ls-scroll-hint">↔ Tablonun devamı için yana kaydır</p>'); }); }
function teachDone(u){ markStep(u.uid,"teach"); const nxt=stepAfter(u,"teach"); if(!nxt){ back(); return; } pendingNote="Konu anlatımı bitti. Şimdi "+stepNo(u,nxt.k)+". adım: "+nxt.n+"."; go(unitPath(u,nxt.k),true); }
function lsCheck(b,i){ const u=ctx.unit; if(!u||!hasLesson(u)) return; const x=u.lesson[b]; if(!x||x.t!=="check") return; const key=u.uid+":"+b; if(LS_CHECKS[key]!=null) return; LS_CHECKS[key]=i;
  const box=document.getElementById("lsChk"+b); if(!box) return; const tmp=document.createElement("div"); tmp.innerHTML=lsCheckHtml(u,x,b); box.replaceWith(tmp.firstElementChild); }
/* --- Ezberle --- */
function renderVocab(u){ ctx={unit:u}; setCur(u,"lesson"); const five=u.words.slice(0,5), rest=u.words.slice(5);
  setScreen("vocab",`${ubarHtml(u,"lesson")}<div class="u-card">${u.desc?`<p>${uesc(u.desc)}</p>`:""}<div class="u-goal"><b>Hedef:</b> Bu derste ${u.words.length} kelime/ifade var. Önce aşağıdaki <b>5 kelimeyi ezberle</b>, sonra kartlar ve testle pekiştir.</div><div class="u-tip"><b>Bilgi:</b> ${uesc(infoFor(u))}</div></div>
    <div class="u-card" id="ezberCard"><h3>Ezberlenecek 5 kelime</h3><p class="u-muted">Önce Türkçesini içinden tahmin et, sonra “Göster”e bas. Hoparlörle doğru okunuşu dinle.</p>
      ${five.map((w,i)=>`<div class="u-ez"><div class="top"><div class="w">${uesc(w.en)}</div>${speakBtn("speakWord",i)}<button type="button" class="u-reveal" data-act="reveal" data-i="${i}" aria-expanded="false">Göster</button></div><div class="box" id="rev${i}" hidden><div class="u-tr">${uesc(w.tr)}</div><div class="u-ex">“${uesc(w.ex)}” — ${uesc(w.exTr)}</div></div></div>`).join("")}</div>
    ${rest.length?`<div class="u-card"><h3>Dersin diğer kelimeleri</h3>${rest.map((w,k)=>{ const i=k+5; return `<div class="u-wrow"><div class="m"><div class="w">${uesc(w.en)}</div><div class="u-tr">${uesc(w.tr)}</div><div class="u-ex">“${uesc(w.ex)}” — ${uesc(w.exTr)}</div></div>${speakBtn("speakWord",i)}</div>`; }).join("")}</div>`:""}
    <div id="uNotesSlot"></div>
    <div class="u-card"><h3>Ezberledin mi? Sıradaki: ${stepNo(u,"flash")}. adım</h3><p class="u-muted">Kartlarla tekrar et, telaffuz yap, en son mini testi çöz.</p><div class="u-row"><button type="button" class="btn btn-accent" data-act="step" data-uid="${u.uid}" data-k="flash">Kelime kartlarına geç</button><button type="button" class="btn btn-ghost" data-act="back">Üniteler</button></div></div>`);
  notesMount(u.uid,"full"); }
/* --- Gramer: Kural / Örnekler --- */
function structureHtml(u){ if(!u.structure||!u.structure.length) return ""; return `<div class="u-tw" tabindex="0" role="region" aria-label="Yapı tablosu"><table class="u-tbl"><thead><tr>${u.structure[0].map(h=>`<th>${uesc(h)}</th>`).join("")}</tr></thead><tbody>${u.structure.slice(1).map(r=>`<tr>${r.map(c=>`<td>${uesc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; }
function renderRule(u){ ctx={unit:u}; setCur(u,"rule");
  setScreen("rule",`${ubarHtml(u,"rule")}<div class="u-card"><p>${uesc(u.intro)}</p><div class="u-rule" id="ruleBox">${lsHtml(u.rule)}</div>${structureHtml(u)}</div><div id="uNotesSlot"></div>
    <div class="u-card"><h3>Kuralı anladın mı?</h3><p class="u-muted">Sıradaki: ${stepNo(u,"examples")}. adım — örnek cümleler.</p><div class="u-row"><button type="button" class="btn btn-primary" data-act="step" data-uid="${u.uid}" data-k="examples">Örneklere geç</button><button type="button" class="btn btn-ghost" data-act="back">Üniteler</button></div></div>`);
  notesMount(u.uid,"full"); }
function exMicHtml(u,i){ if(!micAvailable()) return ""; const ok=pronBest(u.uid,u.examples[i].en)>=PR_GOOD; return `<button type="button" class="u-spk mic${ok?" ok":""}" data-act="exMic" data-i="${i}" title="Söyle ve kontrol et" aria-label="Söyle ve kontrol et">${ok?I("check"):I("mic")}</button><div class="u-mic" id="exMic${i}" hidden></div>`; }
function renderExamples(u){ ctx={unit:u}; markStep(u.uid,"rule"); setCur(u,"examples");
  const exs=(u.examples||[]).map((e,i)=>`<div class="u-wrow${micAvailable()?" has-mic":""}"><div class="m"><div class="w">${uesc(e.en)}</div><div class="u-tr">${uesc(e.tr)}</div></div>${speakBtn("speakEx",i)}${exMicHtml(u,i)}</div>`).join("");
  setScreen("examples",`${ubarHtml(u,"examples")}<div class="u-card"><div class="u-rule">${lsHtml(u.rule)}</div><h3>Örnekler</h3><p class="u-muted">Dinle, tekrar et${micAvailable()?"; mikrofonla söyleyip kontrol et":""}.</p>${exs||`<p class="u-muted">Bu derste örnek cümle yok.</p>`}</div><div id="uNotesSlot"></div>
    <div class="u-card"><h3>Anladın mı?</h3><p class="u-muted">Şimdi kısa alıştırmalarla pekiştir.</p><div class="u-row"><button type="button" class="btn btn-primary" data-act="step" data-uid="${u.uid}" data-k="quiz">Alıştırmalara başla (${stepNo(u,"quiz")}. adım)</button><button type="button" class="btn btn-ghost" data-act="back">Üniteler</button></div></div>`);
  notesMount(u.uid,"full"); }
function exMic(i){ const u=ctx.unit; if(!u||!u.examples||!u.examples[i]) return; const e=u.examples[i]; const box=document.getElementById("exMic"+i), btn=view.querySelector('[data-act="exMic"][data-i="'+i+'"]'); if(!box||!btn) return; box.hidden=false;
  pronStart({target:e.en, box, btn, small:true, uid:u.uid, key:e.en, onGood:()=>{ btn.dataset.label=I("check"); btn.innerHTML=I("check"); btn.classList.add("ok"); },
    onFatal:info=>{ view.querySelectorAll('[data-act="exMic"]').forEach(b=>b.remove()); box.className="u-mic warn"; box.textContent=info.msg+" "+info.act; } }); }
/* --- Kartlar --- */
function renderFlash(u,pos){ if(!u.words||!u.words.length){ back(); return; } markStep(u.uid,"lesson"); ctx={unit:u, fcIndex:Math.min(Math.max(0,pos||0),u.words.length-1), flipped:false}; drawFlash(); }
function drawFlash(){ const u=ctx.unit, w=u.words[ctx.fcIndex], n=u.words.length; setCur(u,"flash",ctx.fcIndex);
  setScreen("flash",`${ubarHtml(u,"flash")}<div class="u-card"><div class="u-counter">Kart ${ctx.fcIndex+1} / ${n}</div>
    <div class="u-flash"><div class="u-fc${ctx.flipped?" flip":""}" data-act="flip" role="button" tabindex="0" aria-label="Kartı çevir"><div class="face front"><div class="big">${uesc(w.en)}</div><div class="sub">Türkçesi için karta dokun</div></div><div class="face back"><div class="big">${uesc(w.tr)}</div><div class="sub">“${uesc(w.ex)}”<br>${uesc(w.exTr)}</div></div></div></div>
    <div class="u-row"><button type="button" class="btn btn-accent full" data-act="speakFlash">${I("speak")}Dinle</button><button type="button" class="btn btn-primary" data-act="fcKnow">${I("check")}Biliyorum</button><button type="button" class="btn btn-soft" data-act="fcRepeat">Tekrar et</button></div></div>
    <div id="uNotesSlot"></div><div class="u-card"><div class="u-row"><button type="button" class="btn btn-soft" data-act="step" data-uid="${u.uid}" data-k="practice">Kartları atla, telaffuza geç</button><button type="button" class="btn btn-ghost" data-act="back">Üniteler</button></div></div>`);
  notesMount(u.uid,"compact"); }
function flipCard(){ ctx.flipped=!ctx.flipped; const f=view.querySelector(".u-fc"); if(f) f.classList.toggle("flip",ctx.flipped); }
function fcAdvance(){ if(ctx.fcIndex<ctx.unit.words.length-1){ ctx.fcIndex++; ctx.flipped=false; drawFlash(); } else { const u=ctx.unit; markStep(u.uid,"flash"); pendingNote="Kartlar bitti. Şimdi "+stepNo(u,"practice")+". adım: Telaffuz."; go(unitPath(u,"practice"),true); } }
function addReviewWord(w){ if(!US.reviewWords.some(x=>x.en===w.en)){ US.reviewWords.push({en:w.en,tr:w.tr,ex:w.ex,exTr:w.exTr}); saveState(); toast("Tekrar listesine eklendi: "+w.en); } else toast("Zaten listede."); }
/* --- Telaffuz --- */
function renderPractice(u,pos){ if(!u.words||!u.words.length){ back(); return; } markStep(u.uid,"lesson"); ctx={unit:u, prIndex:Math.min(Math.max(0,pos||0),u.words.length-1)}; drawPractice(); }
function drawPractice(msg){ prAbort(); const u=ctx.unit, w=u.words[ctx.prIndex], n=u.words.length, mic=micAvailable(); setCur(u,"practice",ctx.prIndex);
  const good=x=>pronBest(u.uid,x.en)>=PR_GOOD, okN=u.words.filter(good).length;
  setScreen("practice",`${ubarHtml(u,"practice")}<div class="u-card u-center"><div class="u-counter">Telaffuz ${ctx.prIndex+1} / ${n}${okN?` · ${okN} doğru`:""}</div>
    <div class="u-big" id="prWord">${uesc(w.en)}${good(w)?` <span class="u-okmark" title="Doğru söyledin">✓</span>`:""}</div><p class="u-tr">${uesc(w.tr)}</p>
    <p class="u-muted">1) Dinle · 2) Sen söyle · 3) ${mic?"Mikrofona söyleyip kontrol et":"Tekrar dinle"}</p>
    <div class="u-row"><button type="button" class="btn btn-accent full" data-act="speakPractice">${I("speak")}Dinle</button>${mic?`<button type="button" class="btn btn-primary full" id="prMicBtn" data-act="micCheck">${I("mic")}Söyle ve kontrol et</button>`:""}<button type="button" class="btn ${mic?"btn-soft":"btn-primary"} full" data-act="prNext">${mic?"Ben söyledim, devam":"Söyledim, sonraki kelime"}</button></div>
    <div id="micState" class="u-mic${msg?" warn":""}" ${mic||msg?"":"hidden"}>${msg?uesc(msg):"Hazır olduğunda “Söyle ve kontrol et”e bas."}</div>
    ${mic?"":`<div class="u-mic warn" id="noMic">Bu cihazda sesli kontrol yok. Kelimeyi dinle, sesli söyle ve devam et; istersen bu adımı atlayabilirsin.</div>`}
    ${mic?`<div class="u-chips">${u.words.map((x,i)=>`<button type="button" class="u-chip${i===ctx.prIndex?" cur":""}${good(x)?" ok":""}" data-act="prGo" data-i="${i}">${good(x)?"✓ ":""}${uesc(x.en)}</button>`).join("")}</div>`:""}</div>
    <div id="uNotesSlot"></div><div class="u-card"><div class="u-row"><button type="button" class="btn btn-soft" data-act="prSkip" data-uid="${u.uid}">${mic?"Teste geç":"Bu adımı atla, teste geç"} (${stepNo(u,"quiz")}. adım)</button><button type="button" class="btn btn-ghost" data-act="back">Üniteler</button></div></div>`);
  notesMount(u.uid,"compact"); }
function prNext(){ prAbort(); if(ctx.prIndex<ctx.unit.words.length-1){ ctx.prIndex++; drawPractice(); } else { const u=ctx.unit; markStep(u.uid,"practice"); pendingNote="Telaffuz bitti. Şimdi son adım: Test."; go(unitPath(u,"quiz"),true); } }
function prGo(i){ const n=ctx.unit.words.length; ctx.prIndex=Math.min(Math.max(0,i|0),n-1); drawPractice(); }
function micCheck(){ const u=ctx.unit, w=u.words[ctx.prIndex], box=document.getElementById("micState"), btn=document.getElementById("prMicBtn"); if(!micAvailable()||!box){ prNext(); return; } const last=ctx.prIndex>=u.words.length-1;
  pronStart({target:w.en, box, btn, uid:u.uid, key:w.en, nextHtml:`<button type="button" class="btn btn-primary" data-act="prNext" data-focus="1">${last?"Bitti — teste geç":"Sonraki kelime"}</button>`,
    onGood:()=>{ const h=document.getElementById("prWord"); if(h&&!h.querySelector(".u-okmark")) h.insertAdjacentHTML("beforeend",' <span class="u-okmark" title="Doğru söyledin">✓</span>'); const c=view.querySelector('.u-chip[data-i="'+ctx.prIndex+'"]'); if(c&&!c.classList.contains("ok")){ c.classList.add("ok"); c.textContent="✓ "+w.en; } },
    onFatal:info=>{ drawPractice(info.msg+" "+info.act); } }); }

/* ===== TEST ===== */
const quizKey=(mode,id)=>mode+":"+(id==null?"":id);
const ctxKey=()=>quizKey(ctx.mode, ctx.unit?ctx.unit.uid:(ctx.level?ctx.level.id:(ctx.fromReview?"review":"all")));
function saveQuizProgress(){ try{ if(!ctx||!ctx.questions) return; US.quizSave={key:ctxKey(), mode:ctx.mode, questions:ctx.questions, qIndex:ctx.qIndex, correct:ctx.correct, answered:!!ctx.answered, wrong:ctx.wrong||[], savedAt:Date.now()}; saveState(); }catch(e){} }
function clearQuizProgress(){ if(US.quizSave){ US.quizSave=null; saveState(); } }
const savedQuiz=key=>{ const q=US.quizSave; return (q&&q.key===key)?q:null; };
function resumeInfo(key){ const q=savedQuiz(key); if(!q) return null; return {q, done:q.qIndex+(q.answered?1:0), total:q.questions.length}; }
function quizTitle(){ return ctx.mode==="grammar"?"Alıştırma":ctx.mode==="leveltest"?uesc(ctx.level.cefr)+" seviye testi":ctx.mode==="mix"?"Karışık tekrar":"Mini test"; }
function quizHead(){ return ctx.unit?ubarHtml(ctx.unit,"quiz"):`<div class="u-card u-ubar"><div class="head"><button type="button" class="u-back" data-act="back" aria-label="Geri">${I("back")}Üniteler</button><div><div class="ttl">${quizTitle()}</div><div class="sub">${FLAG(US.lang)} ${ctx.level?uesc(ctx.level.name):uesc(U_LANGS[US.lang].name)}</div></div></div></div>`; }
function renderQuizIntro(base){ ctx=Object.assign({},base); const u=ctx.unit; if(u){ if(u.type==="vocab") markStep(u.uid,"lesson"); else { markStep(u.uid,"rule"); markStep(u.uid,"examples"); } setCur(u,"quiz"); }
  const key=ctxKey(), ri=resumeInfo(key);
  let tot, need; if(u){ tot=quizTotal(u); } else if(ctx.level){ tot=Math.min(10,ctx.level.units.reduce((a,x)=>a+(x.type==="grammar"?1:2),0)); } else tot=null; need=tot?passMark(tot):null;
  const la=u?lastAttempt(u):null, failed=u?failedAttempt(u):false;
  setScreen("quizIntro",`${quizHead()}<div class="u-card u-center"><h2>${quizTitle()}</h2><p>${u?`“${uesc(u.title)}” için ${tot} kısa soru.`:ctx.level?`Bu seviyenin bütün ünitelerinden karışık ${tot} soru.`:`Öğrendiğin kelimelerden karışık sorular.`}</p>
    ${failed&&la?`<p class="u-note warn">Son denemen: <b>${la.score}/${la.total||tot}</b>. Bu sefer en az <b>${need}</b> doğru yeter.</p>`:""}${u&&isDone(u.uid)?`<p class="u-note">Bu üniteyi zaten geçtin. İstersen tekrar çözebilirsin.</p>`:""}
    ${u?`<p class="u-muted">Yanlışta açıklama gelir; amaç öğrenmek. Üniteyi geçmek için ${tot} sorudan en az <b>${need}</b> doğru gerekli.</p>`:""}
    ${ri?`<div class="u-note info">Bu testi yarıda bırakmıştın: <b>${ri.done} / ${ri.total}</b> soru cevaplandı, <b>${ri.q.correct||0}</b> doğru.</div><div class="u-row"><button type="button" class="btn btn-primary" data-act="startQuiz">Kaldığın yerden devam et</button><button type="button" class="btn btn-soft" data-act="startQuiz" data-fresh="1">Baştan başla</button></div>`
      :`<div class="u-row"><button type="button" class="btn btn-primary full" data-act="startQuiz">Başla</button></div>`}
    ${failed?`<div class="u-row"><button type="button" class="btn btn-accent" data-act="step" data-uid="${u.uid}" data-k="${unitSteps(u)[0].k}">Önce dersi tekrar gözden geçir</button></div>`:""}</div>`); }
function tryResume(key){ const q=savedQuiz(key); if(!q) return false; Object.assign(ctx,{questions:q.questions, qIndex:q.qIndex, correct:q.correct||0, answered:false, wrong:Array.isArray(q.wrong)?q.wrong:[], resumed:true});
  if(q.answered){ if(ctx.qIndex>=ctx.questions.length-1){ finishQuiz(); return true; } ctx.qIndex++; } saveQuizProgress(); drawQuiz(); toast("Kaldığın yerden devam: Soru "+(ctx.qIndex+1)+" / "+ctx.questions.length); return true; }
function startQuiz(fresh){ const key=ctxKey(); ctx.finished=false;
  if(fresh){ if(savedQuiz(key)) clearQuizProgress(); } else if(tryResume(key)) return;
  let qs=[]; const u=ctx.unit;
  if(u) qs=ctx.mode==="grammar"?buildGrammarQuiz(u):((u.words&&u.words.length)?buildVocabQuiz(u.words):[]);
  else if(ctx.level) qs=buildLevelTest(ctx.level);
  else { let pool=[]; if(ctx.fromReview) pool=US.reviewWords.filter(w=>w&&w.en&&w.tr); else { ALL_UNITS.forEach(x=>{ if(x.type==="vocab"&&isDone(x.uid)&&x.words) pool=pool.concat(x.words); }); if(pool.length<4) pool=VOCAB_POOL; } if(pool.length) qs=buildVocabQuiz(pool,Math.min(8,Math.max(4,pool.length))); }
  if(!qs.length){ toast("Bu bölüm için soru yok."); return; }
  Object.assign(ctx,{questions:qs, qIndex:0, correct:0, answered:false, wrong:[], resumed:false}); saveQuizProgress(); drawQuiz(); }
function drawQuiz(){ const q=ctx.questions[ctx.qIndex], n=ctx.questions.length, pct=Math.round(ctx.qIndex/n*100);
  setScreen("quiz",`${quizHead()}<div class="u-card"><div class="u-counter">Soru ${ctx.qIndex+1} / ${n}</div><div class="u-pbar"><span style="width:${pct}%"></span></div><p class="u-q" id="uQ">${uesc(q.prompt)}</p>
    ${q.kind==="listen"?`<div class="u-row" style="margin:0 0 10px"><button type="button" class="btn btn-accent" data-act="replayAudio">${I("speak")}Tekrar dinle</button></div>`:""}
    <div id="uOpts">${q.options.map((o,i)=>`<button type="button" class="u-opt" data-act="answer" data-i="${i}"><span>${uesc(o)}</span></button>`).join("")}</div><div id="uFb"></div><div id="uQNext"></div></div>
    <div class="u-card"><div class="u-row"><button type="button" class="btn btn-ghost" data-act="back">Ara ver</button>${ctx.resumed?`<button type="button" class="btn btn-ghost" data-act="restartQuiz">Testi baştan başlat</button>`:""}</div><p class="u-muted" style="margin-top:8px">Cevapların kaydediliyor; döndüğünde kaldığın sorudan devam edersin.</p></div>`);
  if(q.kind==="listen"){ const myQ=q; setTimeout(()=>{ if(curScreen==="quiz"&&ctx.questions&&ctx.questions[ctx.qIndex]===myQ&&!ctx.answered) speak(myQ.audio); },350); } }
function answerQuiz(i){ if(ctx.answered) return; ctx.answered=true; const q=ctx.questions[ctx.qIndex], correct=q.options[i]===q.answer;
  view.querySelectorAll("#uOpts .u-opt").forEach((b,idx)=>{ b.disabled=true; if(q.options[idx]===q.answer) b.classList.add("correct"); else if(idx===i) b.classList.add("wrong"); });
  if(correct) ctx.correct++; else (ctx.wrong=ctx.wrong||[]).push({prompt:q.prompt,answer:q.answer,picked:q.options[i],explain:q.explain||""});
  saveQuizProgress();
  let addedRev=false; if(!correct&&q.word&&q.word.en&&!US.reviewWords.some(x=>x.en===q.word.en)){ const w=q.word; US.reviewWords.push({en:w.en,tr:w.tr,ex:w.ex,exTr:w.exTr}); saveState(); addedRev=true; }
  const fb=document.getElementById("uFb"); fb.className="u-fb "+(correct?"good":"bad"); fb.setAttribute("role","status");
  fb.innerHTML=correct?"Doğru! Aferin.":"Doğru cevap: <b>"+uesc(q.answer)+"</b>."+(q.explain?"<br>"+uesc(q.explain):"")+(addedRev?"<br><small>Bu kelime tekrar listene eklendi.</small>":"");
  const last=ctx.qIndex>=ctx.questions.length-1; const nx=document.getElementById("uQNext"); nx.innerHTML=`<div class="u-row"><button type="button" class="btn btn-primary full" data-act="nextQuiz">${last?"Sonucu gör":"Sonraki soru"}</button></div>`;
  try{ nx.scrollIntoView({block:"nearest",behavior:"smooth"}); }catch(e){} }
function nextQuiz(){ if(ctx.qIndex<ctx.questions.length-1){ ctx.qIndex++; ctx.answered=false; saveQuizProgress(); drawQuiz(); } else finishQuiz(); }
function wrongHtml(){ const w=ctx.wrong||[]; if(!w.length) return ""; return `<div class="u-card"><h3>Yanlışların (${w.length})</h3><div class="u-wrong">${w.map(x=>`<div class="wi">${uesc(x.prompt)}<br><s>${uesc(x.picked)}</s> → <b>${uesc(x.answer)}</b>${x.explain?`<small>${uesc(x.explain)}</small>`:""}</div>`).join("")}</div></div>`; }
function finishQuiz(){ const n=ctx.questions.length, score=ctx.correct, perfect=score===n; if(savedQuiz(ctxKey())) US.quizSave=null; ctx.finished=true; registerStudyToday();
  let firstTime=false, levelJustDone=false; const u=ctx.unit; const unitQuiz=(ctx.mode==="vocab"||ctx.mode==="grammar")&&!!u, need=passMark(n), passed=score>=need;
  if(unitQuiz){ const r=upRec(u.uid); r.last={score,total:n,passed}; r.cur="quiz"; US.lastUid=u.uid; }
  if(unitQuiz&&!passed){ const prevB=US.bestScores[u.uid]; if(prevB==null||score>prevB) US.bestScores[u.uid]=score; saveState();
    setScreen("result",`${ubarHtml(u,"quiz")}<div class="u-card u-center"><h2>Biraz daha çalışalım</h2><div class="u-score">${score} / ${n}</div><p class="u-muted">Üniteyi geçmek için en az <b>${need} doğru</b> gerekiyor. Dersi bir kez daha gözden geçir, sonra testi tekrar çöz.</p>${isDone(u.uid)?`<p class="u-muted">Bu üniteyi daha önce geçmiştin; tamamlanmış olarak kalıyor.</p>`:""}
      <div class="u-row"><button type="button" class="btn btn-primary" data-act="startQuiz" data-fresh="1">Tekrar</button><button type="button" class="btn btn-accent" data-act="step" data-uid="${u.uid}" data-k="${unitSteps(u)[0].k}">Dersi tekrar gözden geçir</button><button type="button" class="btn btn-ghost" data-act="back">Üniteler</button></div></div>${wrongHtml()}`); return; }
  if(unitQuiz){ firstTime=!isDone(u.uid); const lvWasDone=levelCompleted(u._level);
    if(firstTime){ US.completedLessons.push(u.uid); if(u.type==="vocab"&&u.words) US.wordsLearned+=u.words.length; if(u.type==="grammar") US.grammarLearned+=1; }
    const prev=US.bestScores[u.uid]; if(prev==null||score>prev) US.bestScores[u.uid]=score; levelJustDone=!lvWasDone&&levelCompleted(u._level); }
  if(perfect) US.perfectQuiz=true; saveState(); checkBadges();
  let nextU=null, nextLevel=null;
  if(u){ const lv=u._level, idx=lv.units.findIndex(x=>x.uid===u.uid), after=lv.units.slice(idx+1); nextU=after.find(x=>!isDone(x.uid))||lv.units.find(x=>!isDone(x.uid))||after[0]||null;
    if(!nextU){ const li=LEVELS.indexOf(lv); if(li>=0&&li<LEVELS.length-1){ nextLevel=LEVELS[li+1]; if(levelUnlocked(li+1)) nextU=nextLevel.units.find(x=>!isDone(x.uid))||nextLevel.units[0]||null; } } }
  const title=ctx.mode==="leveltest"?"Seviye testi bitti":ctx.mode==="mix"?"Karışık tekrar bitti":levelJustDone?uesc(u._level.name)+" bitti!":"Üniteyi tamamladın";
  let actions="";
  if(levelJustDone&&u) actions+=`<p class="u-note">Tebrikler! Bu seviyenin bütün derslerini bitirdin.${nextLevel?" Sıradaki seviye açıldı.":""}</p><div class="u-row"><button type="button" class="btn btn-accent full" data-act="goto" data-to="seviye-${u._level.id}">${uesc(u._level.cefr)} seviye testini çöz</button></div>`;
  if(unitQuiz&&u.type==="vocab") actions+=`<div class="u-row"><button type="button" class="btn btn-soft full" data-act="toCards" data-uid="${u.uid}">${I("check")}Kelimeleri tekrar kartlarına ekle</button></div><p class="u-muted" id="uCardsMsg">Pratik sekmesindeki aralıklı tekrar destesine eklenir; zaten olanlar atlanır.</p>`;
  actions+=`<div class="u-row">${nextU?`<button type="button" class="btn btn-primary full" data-act="openUnit" data-uid="${nextU.uid}">Sonraki ünite: ${uesc(nextU.title)}</button>`:(u&&!levelJustDone?`<p class="u-muted">Bu seviyedeki bütün dersler tamam.</p>`:"")}
    <button type="button" class="btn btn-soft" data-act="startQuiz" data-fresh="1">Tekrar</button><button type="button" class="btn btn-ghost" data-act="back">Üniteler</button></div>`;
  setScreen("result",`${unitQuiz?ubarHtml(u,"quiz"):quizHead()}<div class="u-card u-center"><h2>${title}</h2><div class="u-score">${score} / ${n}</div>${unitQuiz?`<p class="u-note">Bu ünitenin bütün adımları bitti.</p>`:""}
    <p class="u-muted">${perfect?"Mükemmel, hepsi doğru!":(score>=Math.ceil(n*0.6)?"Güzel iş! Biraz daha tekrarla harika olacak.":"Sorun değil — tekrar etmek öğrenmenin yoludur.")}${US.streak>0?` · ${US.streak} gün seri`:""}</p></div><div class="u-card">${actions}</div>${wrongHtml()}`); }
/* Kelimeleri çekirdeğin tekrar destesine ekle (kullanıcı isterse; aynı dil + kelime varsa atlanır) */
async function toCards(u){ const btn=view.querySelector('[data-act="toCards"]'), m=document.getElementById("uCardsMsg"); const db=window.TYDIL&&TYDIL.db;
  if(!db){ if(m) m.textContent="Kart destesi açılamadı: cihaz depolaması yok."; return; } if(btn) btn.disabled=true;
  const lang=US.lang, have=new Set(((window.TYDIL&&TYDIL.S&&TYDIL.S.cards)||[]).filter(c=>c.lang===lang).map(c=>String(c.f||"").toLowerCase()));
  let added=0, skipped=0; const tomorrow=typeof addDays==="function"?addDays(dayKey(),1):shiftDay(dayKey(),1);
  try{ for(const w of (u.words||[])){ const k=String(w.en||"").toLowerCase(); if(!k||have.has(k)){ skipped++; continue; } have.add(k); await db.collection("cards").add({lang,f:w.en,tr:w.tr,ex:w.ex||"",box:1,due:tomorrow,added:new Date().toISOString()}); added++; } }
  catch(e){ if(m) m.textContent="Kartlar eklenemedi: "+(e&&e.message||e); if(btn) btn.disabled=false; return; }
  if(m) m.textContent=added?`${added} kelime kartlara eklendi${skipped?` (${skipped} zaten vardı)`:""}. Yarın ilk tekrara gelir.`:"Bu kelimeler zaten destende."; if(btn) btn.innerHTML=I("check")+"Eklendi"; }

/* ===== TEKRAR LİSTESİ ===== */
function renderReview(){ let html=`${listHead("Tekrar edilecek kelimeler")}<div class="u-card">`;
  if(!US.reviewWords.length) html+=`<p class="u-empty">Liste boş. Kartlarda “Tekrar et” dediğin ve testte yanlış yaptığın kelimeler buraya gelir.</p>`;
  else html+=`<p class="u-muted">Öğrendiğin kelimeyi “Öğrendim” ile çıkar.</p>`+US.reviewWords.map((w,i)=>`<div class="u-wrow"><div class="m"><div class="w">${uesc(w.en)}</div><div class="u-tr">${uesc(w.tr)}</div></div>${speakBtn("speakReview",i)}<button type="button" class="btn btn-soft btn-sm" data-act="learned" data-en="${uesc(w.en)}">Öğrendim</button></div>`).join("")+`<div class="u-row"><button type="button" class="btn btn-accent" data-act="goto" data-to="karisik-tekrar">Bu kelimelerle test çöz</button></div>`;
  setScreen("review",html+`</div>`); }
function listHead(title){ return `<div class="u-card u-ubar"><div class="head"><button type="button" class="u-back" data-act="back" aria-label="Geri">${I("back")}Üniteler</button><div><div class="ttl">${uesc(title)}</div><div class="sub">${FLAG(US.lang)} ${uesc(U_LANGS[US.lang].name)}</div></div><button type="button" class="u-notebtn" data-act="noteFab" aria-label="Not al">${I("note")}Not</button></div></div>`; }

/* ===== SÖZLÜK ===== */
const DICT_CATS=["Selamlaşma","Sayılar & Renkler","Aile","Vücut","Hayvanlar","Doğa & Hava","Yiyecek","Ev","Zaman","Fiiller","Sıfatlar","Şehir","Diğer"];
let dictState={q:"",cat:"Tümü"};
const dictFind=en=>DICT.find(x=>x.en===en);
function fold(s){ return String(s||"").replace(/[İIı]/g,"i").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ş/g,"s").replace(/ç/g,"c").replace(/ğ/g,"g").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim(); }
function dictFiltered(){ let a=DICT.slice(); if(dictState.cat!=="Tümü") a=a.filter(w=>w.cat===dictState.cat); const q=fold(dictState.q); if(q) a=a.filter(w=>fold(w.en).includes(q)||fold(w.tr).includes(q)); return a; }
function dictListHtml(){ const a=dictFiltered(); if(!a.length) return `<p class="u-empty">Kelime bulunamadı. Aramayı veya kategoriyi değiştir.</p>`;
  return a.map(w=>{ const L=US.dictLearned.includes(w.en); return `<div class="u-di"><div><div class="w" style="font-size:calc(19px*var(--uk));font-weight:700">${uesc(w.en)}${L?" <span class='u-okmark'>✓</span>":""}</div><div class="u-tr">${uesc(w.tr)}</div>${w.ex?`<div class="u-ex">“${uesc(w.ex)}” — ${uesc(w.exTr)}</div>`:""}</div>
    <div class="acts"><button type="button" data-act="dictSpeak" data-en="${uesc(w.en)}">Dinle</button><button type="button" class="${L?"on":""}" data-act="dictLearned" data-en="${uesc(w.en)}" aria-pressed="${L}">${L?"✓ Öğrendim":"Öğrendim"}</button><button type="button" data-act="dictAddReview" data-en="${uesc(w.en)}">Tekrar</button></div></div>`; }).join(""); }
function updateDictList(){ const el=document.getElementById("uDictList"); if(el) el.innerHTML=dictListHtml(); const c=document.getElementById("uDictCount"); if(c) c.textContent=`Toplam ${DICT.length} kelime · Öğrendiğin: ${US.dictLearned.length}`; }
function renderDict(){ const cats=["Tümü"].concat(DICT_CATS.filter(c=>DICT.some(w=>w.cat===c)));
  setScreen("dict",`${listHead("Sözlük")}<div class="u-card"><p class="u-muted">Test çözmeden de kelime öğrenebilirsin. Ara, dinle, bildiklerini “Öğrendim” ile işaretle, zorlandıklarını “Tekrar” ile listene ekle.</p><p class="u-muted" id="uDictCount">Toplam ${DICT.length} kelime · Öğrendiğin: ${US.dictLearned.length}</p>
    <input id="uDictSearch" class="u-search" type="search" placeholder="Türkçe veya ${uesc(U_LANGS[US.lang].name)} ara…" value="${uesc(dictState.q)}" autocomplete="off" aria-label="Sözlükte ara">
    <div class="u-chipsrow" id="uDictChips">${cats.map(c=>`<button type="button" data-act="dictCat" data-cat="${uesc(c)}" class="${dictState.cat===c?"on":""}">${uesc(c)}</button>`).join("")}</div><div id="uDictList" class="u-dict">${dictListHtml()}</div></div>`); }

/* ===== YEDEK (TY1 kodu, eski uygulamayla aynı biçim) ===== */
const BK_PREFIX="TY1", BK_APP="TY-INGILIZCE", BK_FORMAT=1; let bk={code:"",input:"",pending:null,msg:"",msgType:""};
function bkHash(str){ let h=0x811c9dc5; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,0x01000193); } return (h>>>0).toString(16).padStart(8,"0"); }
function bkB64Enc(str){ const b=new TextEncoder().encode(str); let bin=""; for(let i=0;i<b.length;i+=0x8000) bin+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000)); return btoa(bin); }
function bkB64Dec(b64){ const bin=atob(b64); const b=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) b[i]=bin.charCodeAt(i); return new TextDecoder("utf-8",{fatal:true}).decode(b); }
function bkCurrentState(){ saveState(); return JSON.parse(JSON.stringify(US)); }
function bkMakeCode(){ const json=JSON.stringify({app:BK_APP, format:BK_FORMAT, created:new Date().toISOString(), state:bkCurrentState()}); return BK_PREFIX+":"+bkHash(json)+":"+bkB64Enc(json); }
function bkErr(m){ const e=new Error(m); e.userMsg=m; return e; }
const BK_ERR_BROKEN="Kod eksik veya bozuk görünüyor. Kodun tamamını (baştan sona) kopyalayıp tekrar yapıştır.";
function bkParse(text){ let t=String(text||"").trim(); if(!t) throw bkErr("Önce yedek kodunu yapıştır veya bir yedek dosyası seç."); let env;
  if(t.charAt(0)==="{"){ try{ env=JSON.parse(t); }catch(e){ throw bkErr("Bu dosya okunamadı. Uygulamadan indirdiğin yedek dosyasını seç."); } if(!env||env.app!==BK_APP) throw bkErr("Bu dosya bu uygulamanın ünite yedeği değil.");
    if(env.checksum&&env.state&&bkHash(JSON.stringify(env.state))!==env.checksum) throw bkErr("Yedek dosyası bozulmuş veya değiştirilmiş."); }
  else { t=t.replace(/\s+/g,""); const m=/^TY(\d+):([0-9a-f]{8}):([A-Za-z0-9+/=]+)$/i.exec(t);
    if(!m){ if(!/^TY\d+:/i.test(t)) throw bkErr("Bu bir yedek kodu değil. Yedek kodu “TY1:” ile başlar."); throw bkErr(BK_ERR_BROKEN); }
    if(+m[1]>BK_FORMAT) throw bkErr("Bu yedek uygulamanın daha yeni bir sürümünden. Önce uygulamayı güncelle.");
    let json; try{ json=bkB64Dec(m[3]); }catch(e){ throw bkErr(BK_ERR_BROKEN); } if(bkHash(json)!==m[2].toLowerCase()) throw bkErr(BK_ERR_BROKEN); try{ env=JSON.parse(json); }catch(e){ throw bkErr(BK_ERR_BROKEN); } }
  if(!env||typeof env!=="object") throw bkErr(BK_ERR_BROKEN); if((env.format||1)>BK_FORMAT) throw bkErr("Bu yedek uygulamanın daha yeni bir sürümünden. Önce uygulamayı güncelle.");
  const s=env.state, okLang=o=>o&&typeof o==="object"&&(!("completedLessons" in o)||Array.isArray(o.completedLessons));
  if(!s||typeof s!=="object"||Array.isArray(s)||!s.langStore||typeof s.langStore!=="object"||!Object.keys(s.langStore).every(k=>okLang(s.langStore[k]))||("studyDates" in s&&!Array.isArray(s.studyDates))) throw bkErr("Bu yedeğin içinde ilerleme bilgisi bulunamadı.");
  return {state:s, created:env.created||null}; }
function bkNormalize(raw){ const s=normalizeState(JSON.parse(JSON.stringify(raw))); const arr=v=>Array.isArray(v)?v:[], obj=v=>(v&&typeof v==="object"&&!Array.isArray(v))?v:{};
  Object.keys(s.langStore).forEach(k=>{ const o=Object.assign(defaultLangData(), obj(s.langStore[k])); o.completedLessons=arr(o.completedLessons); o.reviewWords=arr(o.reviewWords); o.dictLearned=arr(o.dictLearned); o.earnedBadges=arr(o.earnedBadges); o.bestScores=obj(o.bestScores); o.unlocks=obj(o.unlocks); o.wordsLearned=+o.wordsLearned||0; o.grammarLearned=+o.grammarLearned||0; o.perfectQuiz=!!o.perfectQuiz; s.langStore[k]=o; });
  s.studyDates=arr(s.studyDates).filter(d=>typeof d==="string"); if(s.lang&&!U_LANGS[s.lang]) s.lang=null; return s; }
const bkFmtDate=k=>{ if(!k) return "—"; const p=String(k).slice(0,10).split("-"); return p.length===3?p[2]+"."+p[1]+"."+p[0]:"—"; };
function bkStats(s){ const out={}; Object.keys(U_LANGS).forEach(l=>{ const o=(s.langStore&&s.langStore[l])||{}; out[l]={units:(o.completedLessons||[]).length, words:(+o.wordsLearned||0)+((o.dictLearned||[]).length)}; }); const dates=(s.studyDates||[]).slice().sort(); return {langs:out, streak:computeStreak(dates), last:dates[dates.length-1]||null}; }
function bkCompareHtml(p){ const a=bkStats(bkCurrentState()), b=bkStats(p.state); const langs=Object.keys(U_LANGS).filter(l=>a.langs[l].units||a.langs[l].words||b.langs[l].units||b.langs[l].words); if(!langs.length) langs.push("en");
  const row=(lbl,x,y)=>`<tr><td>${lbl}</td><td style="text-align:center">${x}</td><td style="text-align:center;font-weight:700">${y}</td></tr>`; let rows="";
  langs.forEach(l=>{ rows+=`<tr><td colspan="3" style="font-weight:700;padding-top:10px">${FLAG(l)} ${uesc(U_LANGS[l].name)}</td></tr>`+row("Bitirilen ünite",a.langs[l].units,b.langs[l].units)+row("Öğrenilen kelime",a.langs[l].words,b.langs[l].words); });
  rows+=row("Seri (gün)",a.streak,b.streak)+row("Son çalışma",bkFmtDate(a.last),bkFmtDate(b.last));
  return `<table class="u-cmp"><tr><th></th><th>Bu cihazda</th><th>Yedekte</th></tr>${rows}</table>`; }
function renderBackup(){ const msg=bk.msg?`<div class="u-fb ${bk.msgType==="good"?"good":"bad"}" id="uBkMsg" role="alert">${uesc(bk.msg)}</div>`:""; let body;
  if(bk.pending){ body=`<h3>Yedeği geri yükle — emin misin?</h3>${bk.pending.created?`<p class="u-muted">Yedek tarihi: ${bkFmtDate(bk.pending.created)}</p>`:""}${bkCompareHtml(bk.pending)}<div class="u-fb bad">Bu cihazdaki ünite ilerlemesi silinecek ve yerine yedektekiler gelecek.</div>
    <div class="u-row"><button type="button" class="btn btn-primary" data-act="bkConfirm">Evet, yedeği yükle</button><button type="button" class="btn btn-soft" data-act="bkCancel">Vazgeç</button></div>`; }
  else { body=`<h3>Ünite ilerlemesini yedekle / taşı</h3><p class="u-muted">Eski TY İngilizce uygulamasının <b>TY1:</b> yedek kodu burada da geçer. Ana yedek (Ayarlar → Yedek) bu ilerlemeyi zaten içerir; bu bölüm yalnızca ünite ilerlemesini kodla taşımak için.</p>
    <div class="u-row"><button type="button" class="btn btn-primary" data-act="bkMake">Yedek kodu oluştur</button><button type="button" class="btn btn-soft" data-act="bkDownload">Dosya olarak indir</button></div>
    ${bk.code?`<textarea id="uBkCode" class="u-code" readonly rows="4" aria-label="Yedek kodu">${uesc(bk.code)}</textarea><div class="u-row"><button type="button" class="btn btn-accent" data-act="bkCopy">Kopyala</button></div>`:""}
    <h3 style="margin-top:18px">Yedeği geri yükle</h3><p class="u-muted">Diğer cihazda aldığın kodu yapıştır ya da yedek dosyasını seç.</p>
    <textarea id="uBkInput" class="u-code" rows="3" placeholder="Yedek kodunu buraya yapıştır (TY1: ile başlar)" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Yedek kodu">${uesc(bk.input)}</textarea>${msg}
    <div class="u-row"><button type="button" class="btn btn-accent" data-act="bkCheck">Kodu yükle</button><label class="btn btn-ghost" style="cursor:pointer">Yedek dosyası seç<input type="file" id="uBkFile" accept=".json,application/json,text/plain" style="display:none"></label></div>`; }
  setScreen("backup",`${listHead("Ünite yedeği")}<div class="u-card" id="uBkBox">${body}</div>`); }
function bkTry(text){ const inp=document.getElementById("uBkInput"); if(inp) bk.input=inp.value; try{ bk.pending=bkParse(text); bk.msg=""; }catch(e){ bk.pending=null; bk.msg=e.userMsg||BK_ERR_BROKEN; bk.msgType="bad"; } renderBackup(); }
function bkApply(){ if(!bk.pending) return; const keep=US.settings; US=bkNormalize(bk.pending.state); US.settings=Object.assign({},keep,US.settings);
  setLanguage(US.lang||"it",{skipSaveOld:true}); US.streak=computeStreak(); saveState(); applyFont(); bk={code:"",input:"",pending:null,msg:"",msgType:""}; toast("Yedek yüklendi"); go(US.lang,true); }
function bkCopy(){ const ta=document.getElementById("uBkCode"); if(!ta) return; const manual=()=>{ ta.focus(); ta.select(); let ok=false; try{ ok=document.execCommand("copy"); }catch(e){} toast(ok?"Kod kopyalandı":"Kod seçildi; basılı tutup Kopyala'ya dokun."); };
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(()=>toast("Kod kopyalandı"),manual); else manual(); }
function bkDownload(){ const st=bkCurrentState(); const env={app:BK_APP, format:BK_FORMAT, created:new Date().toISOString(), checksum:bkHash(JSON.stringify(st)), state:st}; const name="ty-dersler-yedek-"+dayKey()+".json";
  try{ const url=URL.createObjectURL(new Blob([JSON.stringify(env,null,1)],{type:"application/json"})); const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); toast("Yedek dosyası indirildi: "+name); }
  catch(e){ toast("Dosya indirilemedi. “Yedek kodu oluştur”u kullan."); } }
function bkReadFile(input){ const f=input.files&&input.files[0]; if(!f) return; if(f.size>5*1024*1024){ bk.msg="Bu dosya çok büyük; yedek dosyası değil."; bk.msgType="bad"; renderBackup(); return; }
  const r=new FileReader(); r.onload=()=>bkTry(String(r.result||"")); r.onerror=()=>{ bk.msg="Dosya okunamadı. Tekrar dene."; bk.msgType="bad"; renderBackup(); }; r.readAsText(f); input.value=""; }

/* ===== NOTLAR + EL YAZISI =====
   Tek kalıcı panel (NP.el) her ders ekranında #uNotesSlot yerine takılır; ekran değişse de yazılmamış metin ve mürekkep kaybolmaz.
   Sağ alttaki "Not" düğmesi (yalnızca Dersler panelinde) alttan not sayfasını açar; "Büyük defter" tam ekran.
   US.notes: {uid | "general": {text, updatedAt}} — dil başına ayrı. Mürekkep: her çizgi {x:[],y:[],t:[],p:[]}. */
const HW_LANGS=[["en","English"],["it","Italiano"],["tr","Türkçe"]], HW_FLAG={en:"🇬🇧",it:"🇮🇹",tr:"🇹🇷"};
const HW_OFFLINE="İnternet yok, el yazısı çevrilemedi. İnternet gelince 'Yazıya çevir'e bas.", HW_URL="https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8";
const NP={el:null,pad:null,cv:null,key:null,lang:null,mode:"full",dirty:false,timer:null,compactOpen:false,padOpen:false,strokes:[],cur:null,t0:0,lastT:0,autoTimer:null,busy:false,again:false,penAt:0,sawPen:false,ptype:"touch",last:null,dpr:1,cw:0,ch:0,rect:null,raf:0,gaps:[],lastUp:0,full:false,sheet:false,homeSlot:null,homeKey:null,homeMode:"full",padHome:null};
const NP_GENERAL=new Set(["","home","dict","backup","notes","review","quizIntro","quiz","result"]);
const hwCourse=()=>(US.lang&&HW_LANGS.some(x=>x[0]===US.lang))?US.lang:"en";
const hwLang=()=>{ const m=US.settings.hwLangBy, l=(m&&typeof m==="object")?m[hwCourse()]:null; return HW_LANGS.some(x=>x[0]===l)?l:hwCourse(); };
const hwAltLang=l=>l==="tr"?hwCourse():"tr";
const hwAuto=()=>US.settings.hwAuto!==false;
function npSetLang(l){ const s=US.settings; if(!s.hwLangBy||typeof s.hwLangBy!=="object") s.hwLangBy={}; s.hwLangBy[hwCourse()]=l; saveState(); npSyncPad(); }
const npQ=sel=>(NP.el&&NP.el.querySelector(sel))||(NP.pad&&NP.pad.querySelector(sel));
const npTa=()=>NP.el.querySelector("#uNotesText");
function npEnsure(){ if(NP.el) return NP.el; const el=document.createElement("div"); el.className="u-card u-notes"; el.id="uNotesPanel";
  el.innerHTML=`<button type="button" class="btn btn-soft notes-toggle" data-act="notesToggle" aria-expanded="false" aria-controls="uNotesBody">${I("note")}Notlarım <span class="nt-cnt"></span></button>
    <div class="notes-body" id="uNotesBody"><h3 class="notes-h"><label for="uNotesText">Notlarım</label></h3>
      <textarea id="uNotesText" class="notes-ta" rows="4" placeholder="Buraya not al… (yeni kelimeler, aklına takılanlar)" spellcheck="true"></textarea><div class="notes-status" aria-live="polite"></div>
      <button type="button" class="btn btn-ghost hw-toggle" data-act="hwToggle" aria-expanded="false" aria-controls="uHwPad">El yazısıyla yaz</button>
      <div class="hw-pad" id="uHwPad" hidden><div class="hw-top"><div class="seg hw-langs" role="group" aria-label="El yazısının dili"></div><button type="button" class="btn btn-soft hw-fullbtn" data-act="hwFull" aria-pressed="false">Büyük defter</button></div>
        <div class="hw-preview" aria-live="polite"></div><div class="hw-result" aria-live="polite"></div>
        <div class="hw-wrap"><canvas aria-label="El yazısı defteri: parmakla, kalemle veya fareyle yaz"></canvas><div class="hw-ph">Parmağınla ya da kalemle buraya yaz<br><small>Bir kelime ya da kısa bir satır yaz, sonra biraz bekle.</small></div><div class="hw-bar" aria-hidden="true"></div></div>
        <div class="hw-msg" role="status"></div>
        <div class="hw-tools"><button type="button" class="btn btn-soft" data-act="hwUndo">Geri al</button><button type="button" class="btn btn-soft" data-act="hwClear">Temizle</button><button type="button" class="btn btn-soft" data-act="hwNewline">Alt satır</button><button type="button" class="btn btn-primary hw-go" data-act="hwConvert">Yazıya çevir</button></div>
        <label class="hw-auto"><input type="checkbox" class="hw-autocb"> Yazmayı bırakınca kendiliğinden çevir</label></div>
      <p class="u-muted hw-note">El yazısını yazıya çevirmek için internet gerekir. Telefon klavyesinin el yazısı modu da doğrudan yukarıdaki kutuya yazar.</p></div>`;
  NP.el=el; NP.pad=el.querySelector(".hw-pad"); NP.cv=el.querySelector("canvas"); const ta=npTa();
  ta.addEventListener("input",()=>{ NP.dirty=true; npStatus("Kaydediliyor…"); clearTimeout(NP.timer); NP.timer=setTimeout(npFlush,500); if(NP.last&&!npLastValid()){ NP.last=null; npResult(); } });
  ta.addEventListener("blur",()=>{ if(NP.dirty) npFlush(); });
  const cb=el.querySelector(".hw-autocb"); cb.addEventListener("change",()=>{ US.settings.hwAuto=cb.checked; saveState(); if(cb.checked) npArm(); else npDisarm(); });
  const cv=NP.cv, o={passive:false}; cv.addEventListener("pointerdown",npDown,o); cv.addEventListener("pointermove",npMove,o); cv.addEventListener("pointerup",npUp); cv.addEventListener("pointercancel",npUp); cv.addEventListener("lostpointercapture",npUp);
  ["touchstart","touchmove"].forEach(t=>cv.addEventListener(t,e=>{ if(e.cancelable) e.preventDefault(); },o)); cv.addEventListener("contextmenu",e=>e.preventDefault());
  if("ResizeObserver" in window){ try{ new ResizeObserver(()=>npResize()).observe(cv); }catch(e){} } return el; }
function npStatus(t,ok){ const s=NP.el&&NP.el.querySelector(".notes-status"); if(s){ s.textContent=t||""; s.classList.toggle("ok",!!ok); } }
function npMsg(t,bad){ const m=npQ(".hw-msg"); if(m){ m.textContent=t||""; m.classList.toggle("bad",!!bad); } }
function noteStoreFor(lang){ if(lang===US.lang) return US.notes||(US.notes={}); const o=US.langStore[lang]; if(!o) return null; if(!o.notes||typeof o.notes!=="object") o.notes={}; return o.notes; }
function npFlush(){ clearTimeout(NP.timer); NP.timer=null; if(!NP.el||!NP.key||!NP.dirty) return; NP.dirty=false; const store=noteStoreFor(NP.lang); if(!store) return; const t=npTa().value;
  if(t.trim()) store[NP.key]={text:t, updatedAt:Date.now()}; else delete store[NP.key]; saveState(); npStatus("Kaydedildi ✓",true); npCount(); npPreview(); npFabSync(); }
function npCount(){ const c=NP.el&&NP.el.querySelector(".nt-cnt"); if(c){ c.textContent=npTa().value.trim()?"(dolu)":""; } }
function npSetKey(key){ const ta=npTa(); if(NP.key!==key||NP.lang!==US.lang){ npFlush(); NP.key=key; NP.lang=US.lang; NP.last=null; npResult(); npStatus(""); NP.dirty=false; }
  if(!NP.dirty){ const n=(US.notes||{})[key]; if(ta.value!==(n?n.text:"")) ta.value=n?n.text:""; } npCount(); npPreview(); }
function npApplyMode(mode){ NP.mode=mode; const el=NP.el; el.classList.toggle("compact",mode==="compact"); el.classList.toggle("closed",mode==="compact"&&!NP.compactOpen); el.querySelector(".notes-toggle").setAttribute("aria-expanded",String(mode!=="compact"||NP.compactOpen)); }
function notesMount(key,mode){ const slot=document.getElementById("uNotesSlot"); if(!slot) return; npEnsure();
  if(NP.sheet&&NP.el.closest(".np-sheet")){ if(slot!==NP.homeSlot){ NP.homeSlot=slot; NP.homeKey=key; NP.homeMode=mode; } return; }
  npSetKey(key); npApplyMode(mode); slot.replaceWith(NP.el); npSyncPad(); npFabSync(); }
function npLeave(){ if(NP.el&&NP.el.isConnected&&!NP.sheet){ npFlush(); npDisarm(); } }
function npToggleCompact(){ NP.compactOpen=!NP.compactOpen; NP.el.classList.toggle("closed",!NP.compactOpen); NP.el.querySelector(".notes-toggle").setAttribute("aria-expanded",String(NP.compactOpen)); if(NP.compactOpen) npSyncPad(); }
function npTogglePad(){ NP.padOpen=!NP.padOpen; npSyncPad(); if(NP.padOpen){ const w=NP.el.querySelector(".hw-wrap"); try{ w&&w.scrollIntoView({behavior:"smooth",block:"nearest"}); }catch(e){} } }
function npSyncPad(){ if(!NP.el) return; const b=NP.el.querySelector(".hw-toggle"); NP.pad.hidden=!NP.padOpen; b.setAttribute("aria-expanded",String(NP.padOpen)); b.textContent=NP.padOpen?"Defteri kapat":"El yazısıyla yaz";
  const l=hwLang(), c=hwCourse(), order=[c,"tr"].concat(HW_LANGS.map(x=>x[0]).filter(x=>x!==c&&x!=="tr")); const seg=NP.pad.querySelector(".hw-langs");
  seg.innerHTML=order.map(code=>{ const on=code===l, n=HW_LANGS.find(x=>x[0]===code)[1]; return `<button type="button" data-act="hwLang" data-lang="${code}" class="${on?"on":""}" aria-pressed="${on}">${n}</button>`; }).join("");
  const fb=NP.pad.querySelector(".hw-fullbtn"); fb.textContent=NP.full?"Küçült":"Büyük defter"; fb.setAttribute("aria-pressed",String(NP.full)); NP.pad.querySelector(".hw-autocb").checked=hwAuto(); if(NP.padOpen) npResize(); }
function npResize(){ const cv=NP.cv; if(!cv||!cv.isConnected) return; const w=cv.clientWidth, h=cv.clientHeight; if(!w||!h) return;
  if(NP.cw&&(w!==NP.cw||h!==NP.ch)&&NP.strokes.length){ let mx=0,my=0; NP.strokes.forEach(s=>{ for(let i=0;i<s.x.length;i++){ if(s.x[i]>mx) mx=s.x[i]; if(s.y[i]>my) my=s.y[i]; } });
    const f=Math.min(1,(w-6)/Math.max(1,mx),(h-6)/Math.max(1,my)); if(f<1) NP.strokes.forEach(s=>{ for(let i=0;i<s.x.length;i++){ s.x[i]=+(s.x[i]*f).toFixed(1); s.y[i]=+(s.y[i]*f).toFixed(1); } }); }
  NP.cw=w; NP.ch=h; const dpr=Math.min(3,window.devicePixelRatio||1), pw=Math.round(w*dpr), ph=Math.round(h*dpr); if(cv.width!==pw||cv.height!==ph){ cv.width=pw; cv.height=ph; } NP.dpr=dpr; npRedraw(); }
function npPen(c){ c.setTransform(NP.dpr,0,0,NP.dpr,0,0); c.lineCap="round"; c.lineJoin="round"; c.strokeStyle="#1d3557"; c.fillStyle="#1d3557"; }
const NP_W=3.4; const npW=(s,i)=>{ if(s.type!=="pen") return NP_W; const p=((s.p[i-1]||.5)+(s.p[i]||.5))/2; return NP_W*(0.55+0.9*Math.min(1,Math.max(0,p))); };
function npSeg(c,s,i){ const X=s.x, Y=s.y, n=X.length; const sx=i===1?X[0]:(X[i-1]+X[i])/2, sy=i===1?Y[0]:(Y[i-1]+Y[i])/2; c.lineWidth=npW(s,i); c.beginPath(); c.moveTo(sx,sy); if(i<n-1) c.quadraticCurveTo(X[i],Y[i],(X[i]+X[i+1])/2,(Y[i]+Y[i+1])/2); else c.lineTo(X[i],Y[i]); c.stroke(); }
function npDrawStroke(c,s){ const n=s.x.length; if(!n) return; if(n===1){ c.beginPath(); c.arc(s.x[0],s.y[0],npW(s,0)/2+0.6,0,Math.PI*2); c.fill(); return; } for(let i=1;i<n;i++) npSeg(c,s,i); }
function npRedraw(){ const cv=NP.cv; if(!cv) return; const c=cv.getContext("2d"); if(!c) return; c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,cv.width,cv.height); npPen(c); NP.strokes.forEach(s=>npDrawStroke(c,s)); if(NP.cur){ npDrawStroke(c,NP.cur); NP.cur.drawn=Math.max(0,NP.cur.x.length-2); }
  const ph=npQ(".hw-ph"); if(ph) ph.hidden=!!(NP.strokes.length||NP.cur); }
function npLive(){ NP.raf=0; const s=NP.cur; if(!s) return; const n=s.x.length, c=NP.cv.getContext("2d"); npPen(c); if(n===1){ npRedraw(); return; } const from=(s.drawn||0)+1; for(let i=from;i<=n-2;i++) npSeg(c,s,i); if(n-2>=from) s.drawn=n-2; }
function npTs(e){ const now=performance.now(); let t=e&&e.timeStamp; if(!(t>0)||Math.abs(t-now)>10000) t=now; return t; }
function npAddPt(e){ const s=NP.cur, r=NP.rect; if(!s||!r) return; const x=+((e.clientX-r.left)*r.sx).toFixed(1), y=+((e.clientY-r.top)*r.sy).toFixed(1), n=s.x.length; const t=Math.max(NP.lastT, Math.round(npTs(e)-NP.t0)); NP.lastT=t;
  if(n&&Math.abs(s.x[n-1]-x)<0.6&&Math.abs(s.y[n-1]-y)<0.6) return; s.x.push(x); s.y.push(y); s.t.push(t); s.p.push(e.pointerType==="pen"&&e.pressure>0?e.pressure:0.5); }
function npDown(e){ const now=Date.now();
  if(e.pointerType==="pen"){ NP.sawPen=true; NP.penAt=now; if(NP.cur&&NP.cur.type!=="pen"){ NP.cur=null; npRedraw(); } }
  else if(e.pointerType==="touch"&&NP.sawPen&&(now-NP.penAt<3000||(NP.cur&&NP.cur.type==="pen")||e.width>=40||e.height>=40)) return;
  if(NP.cur) return; if(e.button>0) return; e.preventDefault(); try{ NP.cv.setPointerCapture(e.pointerId); }catch(_){}
  npDisarm(); const cv=NP.cv, r=cv.getBoundingClientRect(); NP.rect={left:r.left, top:r.top, sx:r.width?cv.clientWidth/r.width:1, sy:r.height?cv.clientHeight/r.height:1};
  if(!NP.strokes.length){ NP.t0=npTs(e); NP.lastT=0; NP.gaps=NP.gaps.slice(-8); } else if(NP.lastUp){ const g=now-NP.lastUp; if(g>0&&g<4000) NP.gaps.push(g); }
  NP.ptype=e.pointerType||"touch"; NP.cur={x:[],y:[],t:[],p:[],id:e.pointerId,type:NP.ptype,drawn:0}; npAddPt(e); npRedraw(); npMsg(""); }
function npMove(e){ if(!NP.cur||e.pointerId!==NP.cur.id) return; e.preventDefault(); if(NP.cur.type==="pen") NP.penAt=Date.now(); let list=null; try{ list=e.getCoalescedEvents&&e.getCoalescedEvents(); }catch(_){} (list&&list.length?list:[e]).forEach(npAddPt); if(!NP.raf) NP.raf=requestAnimationFrame(npLive); }
function npUp(e){ if(!NP.cur||e.pointerId!==NP.cur.id) return; if(e.type==="pointerup") npAddPt(e); if(NP.raf){ cancelAnimationFrame(NP.raf); NP.raf=0; } const s=NP.cur; NP.cur=null; delete s.id; delete s.drawn; if(s.type==="pen") NP.penAt=Date.now(); if(s.x.length) NP.strokes.push(s); NP.lastUp=Date.now(); npRedraw(); npArm(); }
function npIdle(){ const g=NP.gaps.slice(-10).sort((a,b)=>a-b), med=g.length?g[g.length>>1]:0; return Math.min(3000, Math.max(1800, Math.round(med*2.5+700))); }
function npBar(ms){ const b=npQ(".hw-bar"); if(!b) return; b.style.transition="none"; b.style.width="0"; if(!ms) return; void b.offsetWidth; b.style.transition=`width ${ms}ms linear`; b.style.width="100%"; }
function npDisarm(){ clearTimeout(NP.autoTimer); NP.autoTimer=null; npBar(0); }
function npArm(){ npDisarm(); if(!hwAuto()||!NP.strokes.length||NP.cur) return; const d=npIdle(); NP.autoTimer=setTimeout(()=>npConvert(true),d); npBar(d); }
function npUndoStroke(){ npDisarm(); if(NP.strokes.length){ NP.strokes.pop(); npRedraw(); npMsg(""); npArm(); } }
function npClearPad(){ npDisarm(); NP.strokes=[]; NP.cur=null; npRedraw(); npMsg(""); }
const HWR={cache:{}}; const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),ms))]);
function npInk(strokes){ return strokes.map(s=>{ const xs=s.x.map(Math.round), ys=s.y.map(Math.round), ts=s.t.slice(); if(xs.length===1){ xs.push(xs[0]+1); ys.push(ys[0]); ts.push(ts[0]+1); } return [xs,ys,ts]; }); }
async function hwrChrome(strokes,lang,pre){ if(!navigator.createHandwritingRecognizer) return null; const c={languages:[lang]};
  if(navigator.queryHandwritingRecognizer){ const q=await navigator.queryHandwritingRecognizer(c); if(!q) return null; } else if(navigator.queryHandwritingRecognizerSupport){ const q=await navigator.queryHandwritingRecognizerSupport(c); if(!q||q.languages===false) return null; }
  if(!HWR.cache[lang]) HWR.cache[lang]=navigator.createHandwritingRecognizer(c); let rec; try{ rec=await HWR.cache[lang]; }catch(e){ delete HWR.cache[lang]; throw e; }
  const d=rec.startDrawing({recognitionType:"text", inputType:NP.ptype==="pen"?"stylus":(NP.ptype==="mouse"?"mouse":"touch"), textContext:pre||undefined, alternatives:5});
  try{ npInk(strokes).forEach(([xs,ys,ts])=>{ const st=new HandwritingStroke(); for(let i=0;i<xs.length;i++) st.addPoint({x:xs[i],y:ys[i],t:ts[i]}); d.addStroke(st); }); const p=await d.getPrediction(); const out=(p||[]).map(x=>x&&x.text).filter(Boolean); return out.length?out:null; } finally { try{ d.clear(); }catch(e){} } }
async function hwrGoogle(strokes,lang,w,h,pre){ const body={options:"enable_pre_space", requests:[{writing_guide:{writing_area_width:w, writing_area_height:h}, pre_context:pre||"", max_num_results:6, max_completions:0, ink:npInk(strokes), language:lang}]};
  const ac=("AbortController" in window)?new AbortController():null; const to=setTimeout(()=>{ try{ ac&&ac.abort(); }catch(e){} },8000);
  try{ const r=await fetch(HW_URL,{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body), signal:ac?ac.signal:undefined, cache:"no-store"}); if(!r.ok) throw new Error("http "+r.status); const j=await r.json();
    if(!Array.isArray(j)||j[0]!=="SUCCESS") throw new Error("bad response"); const c=j[1]&&j[1][0]&&j[1][0][1]; return Array.isArray(c)?c.filter(x=>typeof x==="string"&&x.trim()):[]; } finally { clearTimeout(to); } }
async function npRecognize(strokes,lang,w,h,pre){ try{ const c=await withTimeout(hwrChrome(strokes,lang,pre),6000); if(c&&c.length) return c; }catch(e){} if(navigator.onLine===false) throw new Error("offline"); return hwrGoogle(strokes,lang,w,h,pre); }
const npClean=list=>(list||[]).map(x=>String(x).replace(/\s+/g," ").trim()).filter((x,i,a)=>x&&a.indexOf(x)===i);
async function npConvert(auto){ npDisarm(); if(!NP.el) return; if(NP.cur) return; if(NP.busy){ NP.again=true; return; } if(!NP.strokes.length){ if(!auto) npMsg("Önce defterin içine bir şey yaz."); return; }
  const batch=NP.strokes.slice(), lang=hwLang(), alt=hwAltLang(lang), w=Math.max(1,NP.cw||NP.cv.clientWidth), h=Math.max(1,NP.ch||NP.cv.clientHeight), pre=npTa().value.slice(-20);
  NP.busy=true; npMsg("Çevriliyor…"); const wrap=p=>p.then(v=>({ok:true,v:npClean(v)}),()=>({ok:false,v:[]}));
  const [a,b]=await Promise.all([wrap(npRecognize(batch,lang,w,h,pre)), wrap(npRecognize(batch,alt,w,h,pre))]); NP.busy=false;
  const main=a.v.slice(0,5), other=b.v.filter(x=>!main.includes(x)).slice(0,3);
  if(!a.ok&&!b.ok){ npMsg(HW_OFFLINE,true); } else if(!main.length&&!other.length){ npMsg("Yazı okunamadı. Biraz daha büyük ve düzgün yazıp tekrar dene.",true); }
  else { NP.strokes=NP.strokes.filter(s=>!batch.includes(s)); npRedraw(); const cands=main.map(t=>({t,l:lang})).concat(other.map(t=>({t,l:alt}))); npInsert(cands[0].t,cands); npMsg(""); }
  if(NP.again){ NP.again=false; if(NP.strokes.length&&!NP.cur&&a.ok) npArm(); } }
function npInsert(text,cands){ const ta=npTa(), v=ta.value; const sep=(!v||/\s$/.test(v)||/^[.,!?;:)]/.test(text))?"":" "; const start=v.length+sep.length; ta.value=v+sep+text; NP.last={prev:v, start, text, cands}; NP.dirty=true; npFlush(); npResult(); try{ ta.scrollTop=ta.scrollHeight; }catch(e){} }
function npResult(){ const box=npQ(".hw-result"); if(!box) return; const L=NP.last; if(!L){ box.innerHTML=""; return; }
  const chip=(c,i)=>`<button type="button" class="hw-chip${c.t===L.text?" on":""}" data-act="hwAlt" data-i="${i}" aria-pressed="${c.t===L.text}">${uesc(c.t)}</button>`; const langs=[]; L.cands.forEach(c=>{ if(!langs.includes(c.l)) langs.push(c.l); });
  box.innerHTML=`<span class="lbl">Eklendi: <b>${uesc(L.text)}</b> — yanlışsa doğrusuna dokun:</span>`+langs.map(l=>`<div class="hw-row"><span class="hw-lg">${HW_FLAG[l]||""}<span class="hw-lgn"> ${uesc((HW_LANGS.find(x=>x[0]===l)||[l,l])[1])}</span></span>${L.cands.map((c,i)=>c.l===l?chip(c,i):"").join("")}</div>`).join("")+`<button type="button" class="hw-chip undo" data-act="hwUndoInsert">Eklenen yazıyı geri al</button>`; }
function npLastValid(){ const L=NP.last; if(!L) return false; const v=npTa().value; return v.substr(L.start,L.text.length)===L.text&&v.length===L.start+L.text.length; }
function npPickAlt(i){ const L=NP.last; if(!L||!L.cands[i]) return; if(!npLastValid()){ toast("Metin değişti; seçenek uygulanamadı."); NP.last=null; npResult(); return; } const ta=npTa(); ta.value=ta.value.slice(0,L.start)+L.cands[i].t; L.text=L.cands[i].t; NP.dirty=true; npFlush(); npResult(); }
function npUndoInsert(){ const L=NP.last; if(!L) return; const ta=npTa(); if(npLastValid()){ ta.value=L.prev; NP.dirty=true; npFlush(); toast("Geri alındı."); } else toast("Metin değişti; geri alınamadı."); NP.last=null; npResult(); }
function npNewline(){ const ta=npTa(); if(ta.value&&!/\n$/.test(ta.value)){ ta.value=ta.value.replace(/[ \t]+$/,"")+"\n"; NP.dirty=true; npFlush(); } NP.last=null; npResult(); }
function npPreview(){ const p=npQ(".hw-preview"); if(!p) return; const t=npTa().value.replace(/\s+$/,""); p.textContent=t?(t.length>140?"…"+t.slice(-140):t):"Notun burada görünecek."; p.classList.toggle("empty",!t); }
function npLockSync(){ document.documentElement.classList.toggle("np-lock", NP.full||NP.sheet); }
function npFull(on){ npEnsure(); on=(on==null)?!NP.full:!!on; if(on===NP.full) return; let ov=document.getElementById("uNpFull");
  if(on){ if(!ov){ ov=document.createElement("div"); ov.id="uNpFull"; ov.className="np-full"; ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label","Büyük defter"); mountRoot().appendChild(ov); }
    NP.padOpen=true; const ph=document.createElement("div"); ph.className="hw-pad-home"; NP.pad.replaceWith(ph); NP.padHome=ph; ov.appendChild(NP.pad); NP.pad.classList.add("full"); NP.pad.hidden=false; ov.classList.add("open"); NP.full=true; }
  else { NP.pad.classList.remove("full"); if(NP.padHome&&NP.el.contains(NP.padHome)) NP.padHome.replaceWith(NP.pad); else NP.el.querySelector(".hw-toggle").after(NP.pad); NP.padHome=null; if(ov) ov.classList.remove("open"); NP.full=false; }
  npLockSync(); npSyncPad(); npPreview(); npResult(); npFabSync(); if(on){ try{ NP.pad.querySelector(".hw-fullbtn").focus({preventScroll:true}); }catch(e){} } }
function npFabKey(){ const u=ctx&&ctx.unit; return (u&&u.uid&&!NP_GENERAL.has(curScreen))?u.uid:"general"; }
/* Satır içi "Not" düğmeleri (ünite başlığı, liste başlığı, ana ekran araçları): sabit FAB yok, alt düğmeleri örtmez */
function npFabSync(){ const bs=mountRoot()?mountRoot().querySelectorAll('[data-act="noteFab"]'):[]; if(!bs.length) return; const hide=curScreen==="noteEdit"; const k=npFabKey(), has=!!(US.notes&&US.notes[k]);
  bs.forEach(b=>{ b.hidden=hide; b.classList.toggle("has",has); b.setAttribute("aria-label",(k==="general"?"Genel not":"Bu dersin notu")+(has?" (dolu)":"")); }); }
function npSheetOpen(){ npEnsure(); const key=npFabKey(); let sh=document.getElementById("uNpSheet");
  if(!sh){ sh=document.createElement("div"); sh.id="uNpSheet"; sh.className="np-sheet"; sh.innerHTML=`<div class="np-sheet-bg" data-act="noteSheetClose"></div><div class="np-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="uNpSheetTitle"><div class="np-sheet-head"><div class="np-sheet-title" id="uNpSheetTitle"></div><button type="button" class="btn btn-soft btn-sm" data-act="noteSheetClose">Kapat</button></div><div class="np-sheet-body"></div></div>`; mountRoot().appendChild(sh); }
  if(!NP.sheet){ if(NP.el.isConnected){ const ph=document.createElement("div"); ph.id="uNotesSlot"; NP.el.replaceWith(ph); NP.homeSlot=ph; NP.homeKey=NP.key; NP.homeMode=NP.mode; } else NP.homeSlot=null; }
  const u=key==="general"?null:findUnit(key); sh.querySelector(".np-sheet-title").innerHTML=u?`${uIcon(u)} ${uesc(u.title)}`:"Genel not";
  npSetKey(key); NP.el.classList.remove("compact","closed"); sh.querySelector(".np-sheet-body").appendChild(NP.el); NP.sheet=true; NP.padOpen=true; sh.classList.add("open"); npLockSync(); npSyncPad(); npFabSync(); try{ sh.querySelector(".np-sheet-head .btn").focus({preventScroll:true}); }catch(e){} }
function npSheetClose(){ if(!NP.sheet) return; if(NP.full) npFull(false); npFlush(); const sh=document.getElementById("uNpSheet"); if(sh) sh.classList.remove("open"); NP.sheet=false;
  if(NP.homeSlot&&NP.homeSlot.isConnected){ const s=NP.homeSlot; s.replaceWith(NP.el); npSetKey(NP.homeKey); npApplyMode(NP.homeMode); npSyncPad(); } else NP.el.remove(); NP.homeSlot=null; npLockSync(); npFabSync(); }
/* Notlarım listesi */
let notesDelKey=null;
const fmtNoteDate=ts=>{ if(!ts) return ""; const d=new Date(ts); return String(d.getDate()).padStart(2,"0")+"."+String(d.getMonth()+1).padStart(2,"0")+"."+d.getFullYear()+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); };
function noteItemHtml(key,title){ const n=US.notes[key], txt=n.text.trim(), snip=txt.length>140?txt.slice(0,140)+"…":txt, ask=notesDelKey===key;
  return `<div class="u-ni"><div class="t">${title}</div><div class="s">${uesc(snip)}</div><div class="d">Son değişiklik: ${fmtNoteDate(n.updatedAt)}</div>${ask?`<div class="u-note warn" role="alert">Bu not silinsin mi? Geri alınamaz.</div><div class="u-row"><button type="button" class="btn btn-ghost" data-act="noteDelYes" data-key="${uesc(key)}">Evet, sil</button><button type="button" class="btn btn-soft" data-act="noteDelNo">Vazgeç</button></div>`
    :`<div class="u-row"><button type="button" class="btn btn-soft" data-act="noteEdit" data-key="${uesc(key)}">Düzenle</button><button type="button" class="btn btn-ghost" data-act="noteDel" data-key="${uesc(key)}">Sil</button></div>`}</div>`; }
function renderNotes(){ npFlush(); const notes=US.notes||{}; let html=`${listHead("Notlarım")}<div class="u-card"><p class="u-muted">${uesc(U_LANGS[US.lang].name)} derslerinde aldığın notlar. Her ders sayfasının altında not kutusu var; sağ alttaki Not düğmesi her yerden açar.</p><h3>Genel not</h3>`;
  html+=notes.general?noteItemHtml("general","Genel not"):`<div class="u-ni"><div class="s u-muted">Henüz genel not yok.</div><div class="u-row"><button type="button" class="btn btn-accent" data-act="noteEdit" data-key="general">Genel not yaz</button></div></div>`;
  const seen=new Set(["general"]); let any=false;
  LEVELS.forEach(lv=>{ const items=lv.units.filter(u=>notes[u.uid]); if(!items.length) return; any=true; html+=`<h3 style="margin-top:14px">${uesc(lv.cefr)} · ${uesc(lv.name)}</h3>`+items.map(u=>{ seen.add(u.uid); return noteItemHtml(u.uid,`${uIcon(u)} ${uesc(u.title)}`); }).join(""); });
  const other=Object.keys(notes).filter(k=>!seen.has(k)); if(other.length){ any=true; html+=`<h3 style="margin-top:14px">Diğer</h3>`+other.map(k=>noteItemHtml(k,uesc(k))).join(""); }
  if(!any) html+=`<p class="u-empty">Ders notun yok. Bir derse girip sayfanın altındaki Notlarım kutusuna yazabilirsin.</p>`;
  setScreen("notes",html+`</div>`); }
function renderNoteEdit(key){ const u=key==="general"?null:findUnit(key); ctx={unit:u||null};
  setScreen("noteEdit",`${listHead(u?u.title:"Genel not")}<div class="u-card"><p class="u-muted">Yazdıkların kendiliğinden kaydedilir.</p></div><div id="uNotesSlot"></div><div class="u-card"><div class="u-row">${u?`<button type="button" class="btn btn-accent" data-act="openUnit" data-uid="${u.uid}">Derse git</button>`:""}<button type="button" class="btn btn-soft" data-act="goto" data-to="notlar">Tüm notlarım</button></div></div>`);
  notesMount(key,"full"); }
function noteDelete(key){ if(US.notes) delete US.notes[key]; saveState(); if(NP.el&&NP.key===key&&NP.lang===US.lang){ clearTimeout(NP.timer); NP.dirty=false; npTa().value=""; NP.last=null; npResult(); npStatus(""); npCount(); } }

/* ===== KÜÇÜK YARDIMCILAR ===== */
let toastTimer=null;
function toast(m){ const t=document.getElementById("uToast"); if(!t) return; t.textContent=m; t.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),2300); }
function applyFont(){ const m=mountRoot(); if(!m) return; const k=US.settings.fontScale||1; m.style.setProperty("--uk",String(k)); m.classList.toggle("u-xl",k>=1.25); m.classList.toggle("u-lg",k>1&&k<1.25); }
function openUnit(uid){ const u=findUnit(uid); if(!u) return; const k=nextStepFor(u)||(hasLesson(u)?"teach":unitSteps(u)[0].k); go(unitPath(u,k)); }

/* ===== OLAYLAR ===== */
function onClick(e){ const el=e.target.closest("[data-act]"); if(!el||!mountRoot().contains(el)) return; const a=el.dataset.act, d=el.dataset; const u=ctx.unit;
  switch(a){
    case "lang": if(d.lang!==US.lang){ go(d.lang,true); } break;
    case "dict": go(US.lang+"/sozluk"); break; case "notes": notesDelKey=null; go(US.lang+"/notlar"); break; case "backup": bk.pending=null; bk.msg=""; go(US.lang+"/yedek"); break;
    case "goto": go(US.lang+"/"+d.to); break;
    case "fsToggle": ctx.fsOpen=!ctx.fsOpen; { const f=document.getElementById("uFs"); if(f){ f.hidden=!ctx.fsOpen; el.setAttribute("aria-expanded",String(ctx.fsOpen)); } } break;
    case "setFont": US.settings.fontScale=+d.v; saveState(); applyFont(); renderHome(); break;
    case "setRate": US.settings.rate=+d.v; saveState(); renderHome(); speak(US.lang==="it"?"Ciao, come stai?":"Hello, how are you?"); break;
    case "unlock": US.unlocks[+d.id]=true; saveState(); toast("Seviye açıldı."); renderHome(); break;
    case "resume": { const x=findUnit(d.uid); if(!x) break; const k=nextStepFor(x); if(!k){ go(unitPath(x,hasLesson(x)?"teach":unitSteps(x)[0].k)); } else go(unitPath(x,k)); break; }
    case "openUnit": openUnit(d.uid); break;
    case "step": { const x=findUnit(d.uid); if(x) goStep(x,d.k); break; }
    case "back": back(); break;
    case "teachDone": if(u) teachDone(u); break;
    case "lsCheck": lsCheck(+d.b,+d.i); break;
    case "lsSpeak": { const t=lsSpeakText(u,+d.b,d.i!=null?+d.i:null); if(t) speak(t); break; }
    case "jump": { const t=document.getElementById(d.target); if(t){ try{ t.scrollIntoView({behavior:"smooth",block:"start"}); }catch(_){ t.scrollIntoView(); } } break; }
    case "reveal": { const box=document.getElementById("rev"+d.i); if(box){ box.hidden=!box.hidden; el.textContent=box.hidden?"Göster":"Gizle"; el.setAttribute("aria-expanded",String(!box.hidden)); } break; }
    case "speakWord": if(u) speakWord(u.words[+d.i]); break;
    case "speakEx": if(u) speak(u.examples[+d.i].en); break;
    case "speakFlash": if(u) speakWord(u.words[ctx.fcIndex]); break;
    case "speakPractice": if(u) speak(u.words[ctx.prIndex].en); break;
    case "speakReview": { const w=US.reviewWords[+d.i]; if(w) speakWord(w); break; }
    case "replayAudio": if(ctx.questions) speak(ctx.questions[ctx.qIndex].audio); break;
    case "flip": flipCard(); break;
    case "fcKnow": fcAdvance(); break;
    case "fcRepeat": addReviewWord(u.words[ctx.fcIndex]); fcAdvance(); break;
    case "prNext": prNext(); break; case "micCheck": micCheck(); break; case "prGo": prGo(+d.i); break; case "exMic": exMic(+d.i); break;
    case "prSkip": { prAbort(); const x=findUnit(d.uid); if(x){ markStep(x.uid,"practice"); go(unitPath(x,"quiz"),true); } break; }
    case "startQuiz": startQuiz(d.fresh==="1"); break;
    case "restartQuiz": clearQuizProgress(); startQuiz(true); break;
    case "answer": answerQuiz(+d.i); break; case "nextQuiz": nextQuiz(); break;
    case "toCards": { const x=findUnit(d.uid); if(x) toCards(x); break; }
    case "learned": US.reviewWords=US.reviewWords.filter(x=>x.en!==d.en); saveState(); toast("Tebrikler! Öğrendin: "+d.en); renderReview(); break;
    case "dictCat": dictState.cat=d.cat; view.querySelectorAll("#uDictChips button").forEach(b=>b.classList.toggle("on",b.dataset.cat===d.cat)); updateDictList(); break;
    case "dictSpeak": { const w=dictFind(d.en); if(w) speakWord(w); break; }
    case "dictAddReview": { const w=dictFind(d.en); if(w) addReviewWord(w); break; }
    case "dictLearned": { const i=US.dictLearned.indexOf(d.en); if(i>=0) US.dictLearned.splice(i,1); else { US.dictLearned.push(d.en); toast("Öğrendin: "+d.en); } saveState(); updateDictList(); break; }
    case "bkMake": bk.input=(document.getElementById("uBkInput")||{}).value||bk.input; bk.code=bkMakeCode(); bk.msg=""; renderBackup(); break;
    case "bkCopy": bkCopy(); break; case "bkDownload": bkDownload(); break;
    case "bkCheck": { const inp=document.getElementById("uBkInput"); bkTry(inp?inp.value:""); break; }
    case "bkConfirm": bkApply(); break; case "bkCancel": bk.pending=null; bk.msg=""; renderBackup(); break;
    case "noteEdit": renderNoteEdit(d.key); break; case "noteDel": notesDelKey=d.key; renderNotes(); break; case "noteDelNo": notesDelKey=null; renderNotes(); break;
    case "noteDelYes": noteDelete(d.key); notesDelKey=null; renderNotes(); toast("Not silindi."); break;
    case "notesToggle": npToggleCompact(); break; case "hwToggle": npTogglePad(); break; case "hwLang": npSetLang(d.lang); break; case "hwUndo": npUndoStroke(); break; case "hwClear": npClearPad(); break;
    case "hwNewline": npNewline(); break; case "hwConvert": npConvert(false); break; case "hwAlt": npPickAlt(+d.i); break; case "hwUndoInsert": npUndoInsert(); break; case "hwFull": npFull(); break;
    case "noteFab": npSheetOpen(); break; case "noteSheetClose": npSheetClose(); break;
  } }

/* ===== KURULUM ===== */
function mountUnits(el){ mounted=true; reloadIfChanged(); el.innerHTML=`<div id="uView"></div><div class="u-toast" id="uToast" role="status" aria-live="polite"></div>`;
  view=el.querySelector("#uView"); applyFont();
  el.addEventListener("click",onClick);
  el.addEventListener("toggle",e=>{ const d=e.target; if(d&&d.classList&&d.classList.contains("u-lv")) lvOpen[d.dataset.lv]=d.open; },true);
  el.addEventListener("input",e=>{ if(e.target&&e.target.id==="uDictSearch"){ dictState.q=e.target.value; updateDictList(); } });
  el.addEventListener("change",e=>{ if(e.target&&e.target.id==="uBkFile") bkReadFile(e.target); });
  el.addEventListener("keydown",e=>{ if((e.key==="Enter"||e.key===" ")&&e.target&&e.target.matches&&e.target.matches('[role="button"][data-act]')){ e.preventDefault(); e.target.click(); } });
  if(parseHash()) route(); else go(US.lang,true); }
setLanguage(US.lang||"it",{skipSaveOld:true}); US.streak=computeStreak(); saveState();
window.addEventListener("hashchange",()=>{ if(parseHash()) route(); });
window.addEventListener("storage",e=>{ if(e&&e.key===STORE_KEY) reloadIfChanged(); });
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") reloadIfChanged(); });
window.addEventListener("popstate",()=>{ if(NP.full) npFull(false); if(NP.sheet) npSheetClose(); });
document.addEventListener("keydown",e=>{ if(e.key!=="Escape") return; if(NP.full){ npFull(false); e.preventDefault(); } else if(NP.sheet){ npSheetClose(); e.preventDefault(); } });
addEventListener("pagehide",()=>npFlush()); document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden") npFlush(); });
addEventListener("resize",()=>{ if(NP.padOpen) npResize(); }); addEventListener("orientationchange",()=>setTimeout(()=>{ if(NP.padOpen) npResize(); },250));
/* Başka sekmeye geçince adres çubuğundaki #dersler/… kalmasın; geri tuşu Dersler.de kaldığın ekrana döner */
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>{ if(b.dataset.tab!=="units"&&parseHash()){ prAbort(); npLeave(); try{ history.pushState(null,"",location.pathname+location.search); }catch(e){} }
  else if(b.dataset.tab==="units"&&mounted){ if(!reloadIfChanged()&&!parseHash()) go(US.lang||"it",true); } }));
if(window.TYDIL&&typeof TYDIL.registerUnits==="function"){ TYDIL.registerUnits(mountUnits,{label:"Dersler"}); if(parseHash()) showTab(); }
window.TYDIL=window.TYDIL||{}; TYDIL.units={get state(){ return US; }, save:saveState, reload(){ US=loadState(); setLanguage(US.lang||"it",{skipSaveOld:true}); applyFont(); if(mounted) route(); }, data:U_LANGS, reindex:indexCurriculum, setLanguage, findUnit, unitSteps, nextStepFor, passMark, pronScore, prNorm, bkMakeCode, bkParse, go, get ctx(){ return ctx; }, micAvailable, speak};
})();
