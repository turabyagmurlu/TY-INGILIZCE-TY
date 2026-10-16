/* Dersler sekmesi (üniteler): kanca ile sekme, gezinme + hash geri, kelime akışı (Ezberle→Kartlar→Telaffuz→Test), 2/3 geçme, yarım kalan test,
   gramer akışı, anlatım blokları (temizleyici), dilOgren_v4 yapısı, v3 göçü, TY1 yedek, kart köprüsü, notlar, el yazısı, yazı boyutu, görsel.
   NODE_PATH=$(npm root -g) node tests/units_test.js */
const H=require('./_h.js');const {ok,sleep,AT}=H;const fs=require('fs');const path=require('path');
const THU=AT(2026,10,8,9);
/* Taklit ses API'leri (tests/voice_test.js ile aynı): __sr.script(rec) ile sonuç verilir */
const MOCK=`(()=>{
  const S=window.__sr={list:[],cur:null,log:[],script:null,unsupported:false};
  class MockSR{constructor(){this.lang="";this.interimResults=false;this.continuous=false;this.maxAlternatives=1;this._on=false;S.list.push(this);}
    start(){ if(this._on) throw new Error("InvalidStateError"); this._on=true; S.cur=this; S.log.push("start:"+this.lang);
      setTimeout(()=>{ if(!this._on) return; if(this.onstart) this.onstart({}); if(S.script) S.script(this); },10); }
    stop(){ S.log.push("stop"); this._end(); }
    abort(){ S.log.push("abort"); this._end(); }
    _end(){ if(!this._on) return; this._on=false; setTimeout(()=>{ if(this.onend) this.onend({}); },10); }
    _result(text,final){ if(!this._on) return; const alt={transcript:text,confidence:.9}; const r=[alt]; r.isFinal=!!final; if(this.onresult) this.onresult({resultIndex:0,results:[r]}); }
    _error(code){ if(!this._on) return; if(this.onerror) this.onerror({error:code}); } }
  if(!/unsupported=1/.test(location.search)){ window.SpeechRecognition=MockSR; window.webkitSpeechRecognition=MockSR; }
  else { window.SpeechRecognition=undefined; window.webkitSpeechRecognition=undefined; }
  const T=window.__tts={spoken:[],speaking:false,delay:40,q:[],voices:[{name:"Google italiano",lang:"it-IT",voiceURI:"g-it"},{name:"Microsoft Elsa",lang:"it-IT",voiceURI:"ms-it"},{name:"Google UK English Male",lang:"en-GB",voiceURI:"g-en"},{name:"Google Türkçe",lang:"tr-TR",voiceURI:"g-tr"},{name:"Bad News",lang:"en-US",voiceURI:"novelty"}]};
  class U{constructor(t){this.text=t||"";this.lang="";this.rate=1;this.voice=null;this.onend=null;this.onerror=null;this.onstart=null;}}
  function next(){ const u=T.q[0]; if(!u){T.speaking=false;return;} T.speaking=true; if(u.onstart)u.onstart({}); setTimeout(()=>{ if(T.q[0]!==u)return; T.q.shift(); if(u.onend)u.onend({}); next(); },T.delay); }
  const syn={get speaking(){return T.speaking;},pending:false,paused:false,onvoiceschanged:null,getVoices(){return T.voices;},addEventListener(){},removeEventListener(){},
    speak(u){ T.q.push(u); T.spoken.push({text:u.text,lang:u.lang,voice:u.voice&&u.voice.voiceURI,rate:u.rate}); if(!T.speaking) next(); },
    cancel(){ const q=T.q.splice(0); T.speaking=false; q.forEach(u=>{ try{ if(u.onerror) u.onerror({error:"interrupted"}); }catch(e){} }); }, pause(){}, resume(){} };
  Object.defineProperty(window,"speechSynthesis",{value:syn,configurable:true,writable:true}); window.SpeechSynthesisUtterance=U;
})()`;
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];fs.mkdirSync(H.SHOTS,{recursive:true});
 const open=async(o,ctxo)=>{o=o||{};const st={};const ctx=await b.newContext(Object.assign({viewport:{width:375,height:812},timezoneId:'Europe/Istanbul',reducedMotion:'reduce'},ctxo||{}));const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   await p.addInitScript(H.clockScript(THU));await p.addInitScript(()=>{try{localStorage.setItem('tydil-tip-pin','1');localStorage.setItem('tydil.apiKey','sk-ant-test');}catch(e){}});
   await p.addInitScript(MOCK);   /* voice_test ile aynı taklit SR + speechSynthesis; ?unsupported=1 → mikrofon yok */
   if(o.init)await p.addInitScript(o.init);
   await H.mockApi(p,st);await p.route('https://inputtools.google.com/**',r=>r.abort('failed'));
   await p.goto(srv.base+'/index.html'+(o.nomic?'?unsupported=1':'')+(o.hash||''));await p.waitForTimeout(400);return {p,ctx,st};};
 const hscroll=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 const shot=(p,n,full)=>p.screenshot({path:path.join(H.SHOTS,n),fullPage:!!full});
 const hash=p=>p.evaluate(()=>location.hash);
 const SAY=(p,txt)=>p.evaluate(x=>{window.__sr.script=r=>r._result(x,true);},txt);
 const LS=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('dilOgren_v4')));
 const answerAll=async(p,correct)=>{for(let i=0;i<12;i++){const q=await p.evaluate(()=>{const c=TYDIL.units.ctx;const q=c.questions[c.qIndex];return {i:q.options.indexOf(q.answer),n:c.questions.length,k:c.qIndex};});
   const pick=correct===true||(Array.isArray(correct)&&correct[q.k])?q.i:(q.i+1)%3;await p.click(`#uOpts .u-opt[data-i="${pick}"]`);await p.waitForTimeout(60);await p.click('[data-act=nextQuiz]');await p.waitForTimeout(80);if(q.k>=q.n-1)break;}};
 const KEYS_TOP='completedLessons,wordsLearned,grammarLearned,reviewWords,bestScores,unlocks,dictLearned,earnedBadges,perfectQuiz,unitProgress,lastUid,quizSave,notes,lang,langStore,studyDates,streak,settings';
 const KEYS_LANG='completedLessons,wordsLearned,grammarLearned,reviewWords,bestScores,unlocks,dictLearned,earnedBadges,perfectQuiz,unitProgress,lastUid,quizSave,notes';

 // A) sekme kanca ile görünür; gezinme dil → seviye → ünite → adımlar; hash + geri tuşu
 {const {p,ctx}=await open({nomic:true});
  ok(await p.evaluate(()=>!!document.querySelector('[data-tab=units]').offsetParent),'Dersler tab button visible (registerUnits hook)');
  ok(await p.evaluate(()=>document.querySelector('#tab-units').hidden&&document.querySelector('#tyUnitsMount').innerHTML===''),'panel hidden + not mounted before first open');
  await p.click('[data-tab=units]');await p.waitForTimeout(250);
  ok(await hash(p)==='#dersler/it'&&await p.$$eval('.u-lv',e=>e.length)===4&&await p.$$eval('.u-ucard',e=>e.length)===14,'first open: İtalyanca home, 4 levels (A1 open → 14 unit cards)');
  ok((await p.$$eval('.u-lv .cefr',e=>e.map(x=>x.textContent))).join()==='A1,A1+,A2,B1','level list A1, A1+, A2, B1');
  ok(await p.$$eval('.u-lv',e=>e.filter(x=>/Kilitli/.test(x.textContent)).length)===3,'levels 2–4 locked');
  await p.click('[data-act=lang][data-lang=en]');await p.waitForTimeout(200);
  ok(await hash(p)==='#dersler/en'&&await p.$$eval('.u-ucard',e=>e.length)===16&&(await LS(p)).lang==='en','segmented → İngilizce (16 units in A1), state.lang=en');
  await p.click('.u-lv[data-lv="en:2"] summary');await p.waitForTimeout(150);ok(await p.isVisible('.u-lv[data-lv="en:2"] .lock')&&await p.isVisible('[data-act=unlock][data-id="2"]'),'locked level shows unlock note');
  await p.click('.u-ucard[data-uid="1-1"]');await p.waitForTimeout(250);
  ok(await hash(p)==='#dersler/en/1-1/lesson'&&/Adım 1 \/ 4: Ezberle/.test(await p.textContent('.u-pos')),'unit opens on Ezberle, hash #dersler/en/1-1/lesson');
  ok((await p.$$eval('.u-step',e=>e.map(x=>x.textContent.trim().replace(/^\d/,''))))+''==='Ezberle,Kartlar,Telaffuz,Test','vocab stepper: Ezberle → Kartlar → Telaffuz → Test');
  await p.click('[data-act=reveal][data-i="0"]');ok(await p.isVisible('#rev0')&&/Merhaba/.test(await p.textContent('#rev0')),'Göster reveals Turkish');
  await p.click('[data-act=step][data-k=flash]');await p.waitForTimeout(200);ok(await hash(p)==='#dersler/en/1-1/flash'&&/Kart 1 \/ 11/.test(await p.textContent('.u-counter')),'step → Kartlar (hash replaced)');
  await p.goBack();await p.waitForTimeout(300);
  ok(await hash(p)==='#dersler/en'&&await p.$$eval('.u-ucard',e=>e.length)===16,'phone back from unit → unit grid');
  ok(/Devam: 2\/4 Kartlar/.test(await p.textContent('.u-ucard[data-uid="1-1"]'))&&/25%/.test(await p.textContent('.u-ucard[data-uid="1-1"] .u-ring')),'grid shows resume step + progress ring 25%');
  await p.click('[data-tab=learn]');await p.waitForTimeout(150);ok(await hash(p)===''&&await p.isHidden('#uView'),'other tab: hash cleared, Dersler view hidden');
  await p.click('[data-tab=units]');await p.waitForTimeout(200);ok(await hash(p)==='#dersler/en'&&await p.$$eval('.u-ucard',e=>e.length)===16&&await p.isVisible('#uView'),'Dersler tab again: hash restored, same screen');
  await p.evaluate(()=>TYDIL.units.go('en/1-1'));await p.waitForTimeout(200);await p.click('[data-tab=learn]');await p.waitForTimeout(100);await p.goBack();await p.waitForTimeout(300);
  ok(await hash(p)==='#dersler/en/1-1/flash'&&!(await p.evaluate(()=>document.querySelector('#tab-units').hidden))&&/Kart 1 \/ 11/.test(await p.textContent('.u-counter')),'back from another tab returns to the unit screen (resumed step)');
  await ctx.close();}

 // B) kelime akışı: Kartlar → Telaffuz (mikrofon yok → atla) → Test geç/kal, 2/3 eşiği, kart köprüsü, kayıt yapısı
 {const {p,ctx}=await open({nomic:true,hash:'#dersler/en/1-1/flash'});
  ok(await hash(p)==='#dersler/en/1-1/flash'&&!(await p.evaluate(()=>document.querySelector('#tab-units').hidden)),'deep link opens Dersler tab on the step');
  await p.click('.u-fc');await p.waitForTimeout(100);ok(await p.$eval('.u-fc',e=>e.classList.contains('flip')),'card flips');
  await p.click('[data-act=fcRepeat]');await p.waitForTimeout(100);ok((await LS(p)).langStore.en.reviewWords.length===1&&/Kart 2 \/ 11/.test(await p.textContent('.u-counter')),'Tekrar et → review list + next card');
  for(let i=0;i<10;i++){await p.click('[data-act=fcKnow]');await p.waitForTimeout(60);}
  ok(await hash(p)==='#dersler/en/1-1/practice'&&/Kartlar bitti/.test(await p.textContent('.u-note')),'after last card → Telaffuz with note');
  ok(await p.evaluate(()=>TYDIL.voice.state.mic===false)&&/Bu cihazda sesli kontrol yok/.test(await p.textContent('#noMic'))&&!(await p.$('#prMicBtn')),'voice reports mic unsupported → message, no mic button');
  await p.click('[data-act=prSkip]');await p.waitForTimeout(200);
  ok(await hash(p)==='#dersler/en/1-1/quiz'&&/Mini test/.test(await p.textContent('#uView h2'))&&/en az <b>5<\/b> doğru/.test(await p.innerHTML('#uView')),'skip → Test intro, 6 questions, pass mark 5 (ceil(6*0.67))');
  const st1=await LS(p);ok(JSON.stringify(st1.langStore.en.unitProgress['1-1'].done)==='{"lesson":1,"flash":1,"practice":1}'&&st1.langStore.en.unitProgress['1-1'].cur==='quiz','unitProgress done {lesson,flash,practice}, cur quiz');
  await p.click('[data-act=startQuiz]');await p.waitForTimeout(150);ok(await p.$$eval('#uOpts .u-opt',e=>e.length)===3&&(await LS(p)).langStore.en.quizSave.key==='vocab:1-1','quiz started: 3 options, quizSave key vocab:1-1');
  await shot(p,'units_quiz_question_375_light.png');
  await answerAll(p,[true,true,true,true,false,false]);await p.waitForTimeout(200);
  ok(/Biraz daha çalışalım/.test(await p.textContent('#uView h2'))&&/4 \/ 6/.test(await p.textContent('.u-score'))&&await p.$$eval('.u-wrong .wi',e=>e.length)===2,'4/6 → fail (needs 5), 2 wrong answers listed with explanations');
  let s=await LS(p);ok(!s.langStore.en.completedLessons.includes('1-1')&&s.langStore.en.bestScores['1-1']===4&&s.langStore.en.unitProgress['1-1'].last.passed===false&&s.langStore.en.quizSave===null,'fail: not completed, bestScores 4, last.passed false, quizSave cleared');
  await p.click('[data-act=startQuiz][data-fresh="1"]');await p.waitForTimeout(150);await answerAll(p,[true,true,true,true,true,false]);await p.waitForTimeout(200);
  ok(/Üniteyi tamamladın/.test(await p.textContent('#uView h2'))&&/5 \/ 6/.test(await p.textContent('.u-score')),'5/6 → pass');
  s=await LS(p);ok(s.langStore.en.completedLessons.includes('1-1')&&s.langStore.en.wordsLearned===11&&s.langStore.en.bestScores['1-1']===5&&s.studyDates.includes('2026-10-08')&&s.streak===1&&s.langStore.en.earnedBadges.includes('first'),'pass: completedLessons, wordsLearned 11, bestScores 5, studyDates today, streak 1, badge first');
  ok(Object.keys(s).join()===KEYS_TOP&&Object.keys(s.langStore.en).join()===KEYS_LANG&&Object.keys(s.langStore.it).join()===KEYS_LANG&&Object.keys(s.settings).sort().join()==='fontScale,hwLang,rate,voiceURI','dilOgren_v4 keeps the legacy key structure exactly');
  ok(await p.isVisible('[data-act=openUnit][data-uid="1-2"]')&&await p.isVisible('[data-act=startQuiz][data-fresh="1"]'),'result: Sonraki ünite + Tekrar');
  await shot(p,'units_quiz_result_375_light.png');
  // kart köprüsü: 1 kelime zaten destede → eklenmez
  await p.evaluate(()=>TYDIL.db.collection('cards').add({lang:'en',f:'hello',tr:'merhaba',box:1,due:'2026-10-09',added:'2026-10-01T00:00:00Z'}));await p.waitForTimeout(100);
  await p.click('[data-act=toCards]');await p.waitForTimeout(400);
  const cards=await p.evaluate(()=>Object.values(rtExport().collections.cards||{}));
  ok(cards.length===11&&cards.filter(c=>c.f.toLowerCase()==='hello').length===1&&cards.every(c=>c.lang==='en'&&c.box===1&&c.due==='2026-10-09'&&c.tr&&c.added)&&/10 kelime kartlara eklendi \(1 zaten vardı\)/.test(await p.textContent('#uCardsMsg')),'cards bridge: 10 added, duplicate skipped, box 1 / due tomorrow');
  ok(await p.$eval('[data-act=toCards]',e=>e.disabled),'bridge button disabled after use (no double add)');
  await ctx.close();}

 // C) yarım kalan test: 2 soru cevapla, yenile → kaldığın yerden devam
 {const {p,ctx}=await open({nomic:true,hash:'#dersler/en/1-1/quiz'});
  await p.click('[data-act=startQuiz]');await p.waitForTimeout(150);
  for(let i=0;i<2;i++){await p.click('#uOpts .u-opt[data-i="0"]');await p.waitForTimeout(60);await p.click('[data-act=nextQuiz]');await p.waitForTimeout(80);}
  ok(/Soru 3 \/ 6/.test(await p.textContent('.u-counter')),'at question 3');
  await p.reload();await p.waitForTimeout(500);
  ok(/yarıda bırakmıştın: <b>2 \/ 6<\/b>/.test(await p.innerHTML('#uView'))&&await p.isVisible('[data-act=startQuiz]:not([data-fresh])'),'after reload: intro offers resume 2/6');
  await p.click('[data-act=startQuiz]:not([data-fresh])');await p.waitForTimeout(200);
  ok(/Soru 3 \/ 6/.test(await p.textContent('.u-counter'))&&await p.isVisible('[data-act=restartQuiz]'),'resume → question 3, restart offered');
  await ctx.close();}

 // D) gramer akışı: Kural → Örnekler → Alıştırma (puanlama), mikrofon taklidi ile telaffuz
 {const {p,ctx}=await open({hash:'#dersler/en/1-2'});
  ok(await p.evaluate(()=>TYDIL.voice&&TYDIL.voice.state.mic===true),'TYDIL.voice present, mic supported (mock SR)');
  ok(await hash(p)==='#dersler/en/1-2/rule'&&(await p.$$eval('.u-step',e=>e.map(x=>x.textContent.trim().replace(/^\d/,''))))+''==='Kural,Örnekler,Alıştırma'&&await p.isVisible('#ruleBox')&&await p.$$eval('.u-tbl tr',e=>e.length)===5,'grammar opens on Kural with rule box + structure table');
  ok(await p.$eval('#ruleBox',e=>e.querySelectorAll('b').length>0),'rule HTML keeps <b>');
  await p.click('[data-act=step][data-k=examples]');await p.waitForTimeout(200);
  ok(await hash(p)==='#dersler/en/1-2/examples'&&await p.$$eval('.u-wrow',e=>e.length)===5&&await p.$$eval('[data-act=exMic]',e=>e.length)===5,'Örnekler: 5 examples with mic buttons (fake SR)');
  await SAY(p,'I am Deniz');await p.click('[data-act=exMic][data-i="0"]');await p.waitForTimeout(600);
  ok(/Çok iyi/.test(await p.textContent('#exMic0'))&&(await LS(p)).langStore.en.unitProgress['1-2'].pron['I am Deniz.']>=0.85,'example pronunciation: good → pron score saved');
  await SAY(p,'you are my enemy');await p.click('[data-act=exMic][data-i="1"]');await p.waitForTimeout(600);
  ok(/Neredeyse|Tekrar dene/.test(await p.textContent('#exMic1'))&&/<mark>/.test(await p.innerHTML('#exMic1')),'wrong word → near/bad with marked target');
  await p.click('[data-act=step][data-k=quiz]');await p.waitForTimeout(200);
  ok(/Alıştırma/.test(await p.textContent('#uView h2'))&&/8 kısa soru/.test(await p.textContent('#uView'))&&/en az <b>6<\/b>/.test(await p.innerHTML('#uView')),'grammar quiz: 8 exercises, pass mark 6');
  await p.click('[data-act=startQuiz]');await p.waitForTimeout(150);
  const q0=await p.evaluate(()=>TYDIL.units.ctx.questions[0]);ok(q0.options.length===3&&q0.options.includes(q0.answer)&&q0.explain.length>0,'exercise has 3 options, answer, explanation');
  await p.click(`#uOpts .u-opt[data-i="${(q0.options.indexOf(q0.answer)+1)%3}"]`);await p.waitForTimeout(80);
  ok(/Doğru cevap: <b>/.test(await p.innerHTML('#uFb'))&&await p.$$eval('#uOpts .u-opt.correct',e=>e.length)===1&&await p.$$eval('#uOpts .u-opt.wrong',e=>e.length)===1,'wrong pick → explanation, correct highlighted');
  await p.click('[data-act=nextQuiz]');await p.waitForTimeout(80);await answerAll(p,true);await p.waitForTimeout(200);
  const s=await LS(p);ok(/Üniteyi tamamladın/.test(await p.textContent('#uView h2'))&&/7 \/ 8/.test(await p.textContent('.u-score'))&&s.langStore.en.completedLessons.includes('1-2')&&s.langStore.en.grammarLearned===1&&!(await p.$('[data-act=toCards]')),'7/8 → grammar unit passed, grammarLearned 1, no cards bridge for grammar');
  // telaffuz adımı (mikrofon var)
  await p.evaluate(()=>TYDIL.units.go('en/1-1/practice'));await p.waitForTimeout(200);
  ok(await p.isVisible('#prMicBtn')&&await p.$$eval('.u-chip',e=>e.length)===11,'practice with mic: button + word chips');
  await p.click('[data-act=speakPractice]');await p.waitForTimeout(150);const sp=await p.evaluate(()=>window.__tts.spoken.slice(-1)[0]);ok(sp&&sp.text==='Hello'&&sp.lang==='en-GB'&&sp.rate===0.9,'Dinle goes through TYDIL.voice.speak (lang en-GB, rate from Ayarlar → Ses): '+JSON.stringify(sp));
  await SAY(p,'hello');await p.click('#prMicBtn');await p.waitForTimeout(600);
  ok(/Çok iyi/.test(await p.textContent('#micState'))&&await p.$eval('.u-chip[data-i="0"]',e=>e.classList.contains('ok'))&&(await LS(p)).langStore.en.unitProgress['1-1'].pron.Hello>=0.85,'practice: good pronunciation → chip ✓ + saved');
  await ctx.close();}

 // E) anlatım blokları (temizleyici), notlar, el yazısı, yazı boyutu, sözlük
 {const {p,ctx}=await open({nomic:true,hash:'#dersler/en'});
  await p.evaluate(()=>{const lv=TYDIL.units.data.en.levels[0];lv.units.push({uid:'9-9',type:'vocab',icon:'🧪',title:'Test anlatım',desc:'d',words:[{en:'Apple',tr:'Elma',ex:'An apple.',exTr:'Bir elma.'},{en:'Pear',tr:'Armut',ex:'A pear.',exTr:'Bir armut.'},{en:'Plum',tr:'Erik',ex:'A plum.',exTr:'Bir erik.'},{en:'Fig',tr:'İncir',ex:'A fig.',exTr:'Bir incir.'}],
    lesson:[{t:'h',text:'Sesler'},{t:'p',html:'Bu <b>kalın</b> ve <span class="hl">vurgulu</span> <script>alert(1)</script><img src=x onerror="alert(2)"> metin.'},{t:'sounds',items:[{w:'th',say:'ts',note:'dil dişler arasında'}]},{t:'h',text:'Kur'},{t:'build',parts:[{x:'I',r:'ben'},{x:'am',r:'-im'}],tr:'Ben…im'},{t:'table',caption:'Tablo',head:['A','B'],rows:[['1','2']]},{t:'compare',left:{title:'Sol',items:['a']},right:{title:'Sağ',items:['b']}},{t:'note',kind:'warn',text:'dikkat'},{t:'h',text:'Örnek'},{t:'ex',items:[{f:'I am.',tr:'Benim.'}]},{t:'check',q:'I ___ happy.',options:['am','is'],answer:'am',explain:'I → am'}]});
    TYDIL.units.reindex();TYDIL.units.go('en/9-9');});await p.waitForTimeout(250);
  ok(await hash(p)==='#dersler/en/9-9/teach'&&(await p.$$eval('.u-step',e=>e.map(x=>x.textContent.trim().replace(/^\d/,''))))+''==='Anlatım,Ezberle,Kartlar,Telaffuz,Test','unit with lesson blocks opens on Anlatım (5 steps)');
  const html=await p.innerHTML('#uView');
  ok(await p.$$eval('.ls-sec',e=>e.length)===3&&await p.$$eval('.ls-toc button',e=>e.length)===3&&/<b>kalın<\/b>/.test(html)&&/<span class="hl">vurgulu<\/span>/.test(html)&&!/<script|<img/.test(html)&&await p.evaluate(()=>!document.querySelector('#uView script,#uView img'))&&/&lt;script&gt;/.test(html),'lesson blocks render in 3 sections with TOC; <b>/.hl kept, <script>/<img> escaped');
  ok(await p.$$eval('.ls-snd,.ls-build,.ls-tbl,.ls-cmp,.ls-note.warn,.ls-chk',e=>e.length)===6,'sounds/build/table/compare/note/check blocks all rendered');
  await p.click('.ls-chk .u-opt[data-i="1"]');await p.waitForTimeout(100);ok(/Doğrusu: <b>am<\/b>/.test(await p.innerHTML('.ls-chk'))&&await p.$$eval('.ls-chk .u-opt:disabled',e=>e.length)===2,'check block: wrong → shows answer, locks');
  await p.click('[data-act=teachDone]');await p.waitForTimeout(200);
  ok(await hash(p)==='#dersler/en/9-9/lesson'&&/Konu anlatımı bitti/.test(await p.textContent('.u-note'))&&(await LS(p)).langStore.en.unitProgress['9-9'].done.teach===1,'Anladım → Ezberle, teach marked done');
  await shot(p,'units_grammar_lesson_375_light.png',true);
  // notlar (ünite notu, otomatik kayıt)
  await p.fill('#uNotesText','elma = apple');await p.waitForTimeout(700);
  let s=await LS(p);ok(s.langStore.en.notes['9-9']&&s.langStore.en.notes['9-9'].text==='elma = apple'&&s.langStore.en.notes['9-9'].updatedAt>0&&/Kaydedildi/.test(await p.textContent('.notes-status')),'unit note autosaved to notes[uid]');
  // el yazısı: çizgi + çevrimdışı çevirme
  await p.click('[data-act=hwToggle]');await p.waitForTimeout(200);ok(await p.isVisible('#uHwPad canvas')&&await p.isVisible('.hw-ph'),'handwriting pad opens with placeholder');
  const box=await p.$eval('#uHwPad canvas',e=>{const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};});
  await p.mouse.move(box.x+20,box.y+40);await p.mouse.down();for(let i=1;i<=8;i++){await p.mouse.move(box.x+20+i*12,box.y+40+(i%2)*20);}await p.mouse.up();await p.waitForTimeout(100);
  ok(await p.isHidden('.hw-ph')&&await p.evaluate(()=>{const c=document.querySelector('#uHwPad canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n>50;}),'pointer stroke drawn on canvas (ink pixels)');
  await p.click('[data-act=hwConvert]');await p.waitForTimeout(1200);
  ok(/İnternet yok, el yazısı çevrilemedi/.test(await p.textContent('.hw-msg'))&&await p.$eval('.hw-msg',e=>e.classList.contains('bad')),'recognizer offline (Chrome API absent, inputtools blocked) → graceful message');
  await p.click('[data-act=hwUndo]');await p.waitForTimeout(100);ok(await p.isVisible('.hw-ph'),'undo stroke → placeholder back');
  await p.click('[data-act=hwFull]');await p.waitForTimeout(150);ok(await p.isVisible('#uNpFull')&&await p.$eval('html',e=>e.classList.contains('np-lock')),'Büyük defter full screen');
  await p.keyboard.press('Escape');await p.waitForTimeout(150);ok(await p.isHidden('#uNpFull')&&await p.isVisible('#uHwPad canvas'),'Esc closes full notebook, pad back in panel');
  // satır içi Not düğmesi (ünite başlığında) → ünitenin notu; sabit FAB yok
  ok(await p.evaluate(()=>{const b=document.querySelector('.u-ubar .u-notebtn');return !!b&&b.offsetParent&&getComputedStyle(b).position!=='fixed'&&!document.querySelector('.u-fab')&&b.classList.contains('has');}),'unit bar has inline Not button (marked dolu), no fixed FAB');
  ok(await p.evaluate(()=>![...document.querySelectorAll('#tyUnitsMount *')].some(e=>getComputedStyle(e).position==='fixed'&&e.offsetParent!==null&&!e.closest('.np-sheet,.np-full'))),'no fixed-position element over the unit page');
  await p.click('.u-ubar .u-notebtn');await p.waitForTimeout(200);ok(await p.isVisible('#uNpSheet')&&/Test anlatım/.test(await p.textContent('#uNpSheetTitle'))&&await p.inputValue('#uNotesText')==='elma = apple','inline Not → unit note sheet with its text');
  await p.click('.np-sheet-head .btn');await p.waitForTimeout(150);
  // ana ekran: araç çubuğu Sözlük · Notlar · Yazı boyutu (Ünite yedeği Ayarlar → Gelişmiş'te, "Not al" Notlar içinde)
  await p.click('[data-act=back]');await p.waitForTimeout(200);
  ok((await p.$$eval('.u-tools .btn',e=>e.map(x=>x.textContent.trim()))).join()==='Sözlük,Notlar,Yazı boyutu','home toolbar: Sözlük · Notlar · Yazı boyutu only');
  await p.click('[data-act=notes]');await p.waitForTimeout(200);await p.click('[data-act=noteEdit][data-key=general]');await p.waitForTimeout(200);
  await p.fill('#uNotesText','genel');await p.waitForTimeout(700);
  s=await LS(p);ok(s.langStore.en.notes.general.text==='genel'&&s.langStore.en.notes['9-9'].text==='elma = apple','general note (Notlar → Genel not yaz) saved separately');
  await p.click('[data-act=goto][data-to=notlar]');await p.waitForTimeout(200);ok(await p.$$eval('.u-ni',e=>e.length)===2&&/Test anlatım/.test(await p.textContent('#uView')),'Notlar list shows general + unit note');
  // yazı boyutu (yalnızca Dersler)
  await p.evaluate(()=>TYDIL.units.go('en',true));await p.waitForTimeout(200);await p.click('[data-act=fsToggle]');await p.click('[data-act=setFont][data-v="1.3"]');await p.waitForTimeout(150);
  ok(await p.evaluate(()=>getComputedStyle(document.querySelector('#tyUnitsMount')).getPropertyValue('--uk').trim()==='1.3'&&document.querySelector('#tyUnitsMount').classList.contains('u-xl')&&getComputedStyle(document.body).fontSize==='17px')&&(await LS(p)).settings.fontScale===1.3,'font scale 1.3 applies to Dersler only, persisted in settings.fontScale');
  ok(await hscroll(p),'no h-scroll at 375 with big font');
  // büyük yazıda kelime ortadan bölünmez: kelime kutusu ve ünite başlığı tek parça, düğmeler kelime kelime sarar
  await p.evaluate(()=>TYDIL.units.go('en/9-9/lesson'));await p.waitForTimeout(250);
  const wrap=await p.evaluate(()=>{const r=document.createRange();/* her kelime tek satırda mı (kelime içi bölünme yok) */const one=el=>{const t=el.firstChild;if(!t||t.nodeType!==3)return 1;const s=t.textContent;let bad=0,i=0;for(const w of s.split(/(\s+)/)){if(w.trim()){r.setStart(t,i);r.setEnd(t,i+w.length);if(r.getClientRects().length>1)bad++;}i+=w.length;}return bad?2:1;};
    const words=[...document.querySelectorAll('.u-ez .w')].map(one), ttl=one(document.querySelector('.u-ubar .ttl .tt')), ov=[...document.querySelectorAll('#uView *')].some(e=>e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX!=='auto'&&getComputedStyle(e).overflowX!=='scroll');
    const bb=[...document.querySelectorAll('#uView .btn')].filter(b=>b.offsetParent).every(b=>getComputedStyle(b).whiteSpace!=='nowrap'&&getComputedStyle(b).wordBreak!=='break-all');return {words,ttl,ov,bb};});
  ok(wrap.words.every(n=>n===1)&&wrap.ttl===1&&!wrap.ov&&wrap.bb,'font 1.3 @375: single-line words (Apple/Pear) and title not split mid-word, no clipped overflow, buttons wrap by words '+JSON.stringify(wrap));
  await p.evaluate(()=>TYDIL.units.go('en'));await p.waitForTimeout(200);await p.click('[data-act=fsToggle]');await p.waitForTimeout(100);
  await p.click('[data-act=setFont][data-v="1"]');await p.waitForTimeout(100);
  // dil seçicide dil başına ilerleme (tamam/toplam)
  const lp=await p.$$eval('.u-top .seg .u-lp',e=>e.map(x=>x.textContent.trim()));ok(lp.length===2&&/^\d+\/\d+$/.test(lp[0])&&/^\d+\/\d+$/.test(lp[1]),'language segment shows done/total per language: '+lp.join(' '));
  // başka sekme/eski uygulama dilOgren_v4'e yazdı → sekmeye dönünce yeniden okunur, ezilmez
  await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dilOgren_v4'));s.langStore.en.completedLessons=['1-1','1-2'];s.langStore.en.bestScores={'1-1':6,'1-2':6};localStorage.setItem('dilOgren_v4',JSON.stringify(s));});
  await p.click('[data-tab=learn]');await p.waitForTimeout(100);await p.click('[data-tab=units]');await p.waitForTimeout(250);
  const ext=await LS(p);ok(ext.langStore.en.completedLessons.length===2&&/Geçtin/.test(await p.textContent('.u-ucard[data-uid="1-2"]'))&&(await p.$$eval('.u-top .seg .u-lp',e=>e.map(x=>x.textContent.trim())))[1].startsWith('2/'),'external write to dilOgren_v4 re-read on tab return (1-2 Geçtin, counter 2/…), not overwritten '+JSON.stringify([ext.langStore.en.completedLessons,await p.textContent('.u-ucard[data-uid="1-2"]'),await p.$$eval('.u-top .seg .u-lp',e=>e.map(x=>x.textContent.trim())),await hash(p)]));
  // sözlük (Türkçe katlama)
  await p.click('[data-act=dict]');await p.waitForTimeout(200);ok(await p.$$eval('.u-di',e=>e.length)>100&&/Toplam \d+ kelime/.test(await p.textContent('#uDictCount')),'dictionary lists all words');
  await p.fill('#uDictSearch','GUNAYDIN');await p.waitForTimeout(100);ok(await p.$$eval('.u-di',e=>e.length)===1&&/Good morning/.test(await p.textContent('#uDictList')),'search folds Turkish chars/case (GUNAYDIN → Günaydın)');
  await p.click('[data-act=dictLearned]');await p.waitForTimeout(100);ok((await LS(p)).langStore.en.dictLearned.includes('Good morning'),'Öğrendim → dictLearned');
  await p.fill('#uDictSearch','');await p.click('[data-act=dictCat][data-cat="Aile"]');await p.waitForTimeout(100);ok(await p.$$eval('.u-di',e=>e.length)>3&&await p.$$eval('.u-di',e=>e.length)<40,'category chip filters');
  await ctx.close();}

 // F) v3 göçü + TY1 yedek kodu
 {const OLD={completedLessons:['1-1','1-2'],wordsLearned:11,grammarLearned:1,reviewWords:[{en:'Hi',tr:'Selam'}],bestScores:{'1-1':6},unlocks:{},dictLearned:['Hello'],earnedBadges:['first'],perfectQuiz:true,studyDates:['2026-10-07'],streak:1,settings:{fontScale:1.15}};
  const {p,ctx}=await open({nomic:true,init:`localStorage.setItem('ingilizceOgren_v3',${JSON.stringify(JSON.stringify(OLD))})`});
  const s=await LS(p);ok(s&&s.lang==='en'&&s.langStore.en.completedLessons.join()==='1-1,1-2'&&s.langStore.en.wordsLearned===11&&s.langStore.en.perfectQuiz===true&&s.settings.fontScale===1.15&&s.studyDates.join()==='2026-10-07'&&Object.keys(s).join()===KEYS_TOP,'ingilizceOgren_v3 migrated into dilOgren_v4 (en store, settings, dates)');
  await p.click('[data-tab=units]');await p.waitForTimeout(250);
  ok(await hash(p)==='#dersler/en'&&await p.$$eval('.u-ucard .u-ring.done',e=>e.length)===2&&/Geçtin · 6\/6/.test(await p.textContent('.u-ucard[data-uid="1-1"]')),'migrated progress shows 2 done units with scores');
  const code=await p.evaluate(()=>TYDIL.units.bkMakeCode());ok(/^TY1:[0-9a-f]{8}:[A-Za-z0-9+/=]+$/.test(code),'TY1 backup code generated');
  const parsed=await p.evaluate(c=>{const r=TYDIL.units.bkParse(c);return {units:r.state.langStore.en.completedLessons.length,created:!!r.created};},code);ok(parsed.units===2&&parsed.created,'bkParse decodes the code');
  await ctx.close();
  // taze cihazda kodu geri yükle
  const f=await open({nomic:true,hash:'#dersler/it/yedek'});const p2=f.p;
  ok(await p2.isVisible('#uBkInput')&&await p2.isVisible('[data-act=bkMake]'),'Ünite yedeği screen');
  await H.tab(p2,'setup');await p2.waitForTimeout(150);await p2.click('#advMore summary');await p2.click('#btnUnitsBk');await p2.waitForTimeout(250);
  ok(await hash(p2)==='#dersler/it/yedek'&&await p2.isVisible('#uBkInput'),'Ayarlar → Gelişmiş → Ünite yedeğini aç → Dersler yedek screen');
  await p2.fill('#uBkInput','TY1:bozuk');await p2.click('[data-act=bkCheck]');await p2.waitForTimeout(150);ok(/bozuk görünüyor/.test(await p2.textContent('#uBkMsg')),'broken code → clear error');
  await p2.fill('#uBkInput',code);await p2.click('[data-act=bkCheck]');await p2.waitForTimeout(150);
  ok(/emin misin/i.test(await p2.textContent('#uBkBox'))&&/Bitirilen ünite/.test(await p2.textContent('.u-cmp'))&&await p2.isVisible('[data-act=bkConfirm]'),'valid code → comparison + confirm');
  await p2.click('[data-act=bkConfirm]');await p2.waitForTimeout(300);
  const s2=await LS(p2);ok(await hash(p2)==='#dersler/en'&&s2.langStore.en.completedLessons.join()==='1-1,1-2'&&s2.langStore.en.dictLearned.includes('Hello')&&await p2.$$eval('.u-ucard .u-ring.done',e=>e.length)===2,'restored: progress back, language en, grid shows done units');
  // ana yedek (rtExport) dilOgren_v4 blobunu taşır
  const ex=await p2.evaluate(()=>rtExport());ok(ex.ty&&ex.ty.langStore&&ex.ty.langStore.en.completedLessons.length===2,'Ayarlar backup (rtExport) includes dilOgren_v4 as ty');
  await f.ctx.close();}

 // G) görsel: 375/1280 × açık/koyu, yatay kaydırma yok, ≥44px hedefler
 for(const [w,scheme] of [[375,'light'],[375,'dark'],[1280,'light'],[1280,'dark']]){const vp={viewport:{width:w,height:w<500?812:900},colorScheme:scheme};const tag=`${w} ${scheme}`;
  const {p,ctx}=await open({nomic:true,hash:'#dersler/it'},vp);
  ok(await hscroll(p),`home no h-scroll ${tag}`);
  const small=await p.evaluate(()=>[...document.querySelectorAll('#tyUnitsMount button,#tyUnitsMount input,#tyUnitsMount textarea')].filter(e=>e.offsetParent).map(e=>[e.className||e.id,Math.round(e.getBoundingClientRect().height),Math.round(e.getBoundingClientRect().width)]).filter(x=>x[1]<44||x[2]<44));
  ok(!small.length,`tap targets ≥44 ${tag} `+JSON.stringify(small));
  if(w===375&&scheme==='light')await shot(p,'units_levels_375_light.png',true); if(w===1280&&scheme==='dark')await shot(p,'units_grid_1280_dark.png');
  await p.click('.u-ucard[data-uid="it1-1"]');await p.waitForTimeout(250);ok(await hscroll(p),`unit vocab no h-scroll ${tag}`);
  if(w===375&&scheme==='light')await shot(p,'units_unit_vocab_375_light.png',true);
  await p.click('[data-act=step][data-k=flash]');await p.waitForTimeout(150);ok(await hscroll(p),`flash no h-scroll ${tag}`);
  await p.click('[data-act=step][data-k=quiz]');await p.click('[data-act=startQuiz]');await p.waitForTimeout(150);ok(await hscroll(p),`quiz no h-scroll ${tag}`);
  await ctx.close();}
 await b.close();srv.close();console.log('errors',errs);ok(!errs.length,'no console errors / dialogs');console.log('shots →',H.SHOTS);console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
