/* Ses modu: taklit SpeechRecognition + speechSynthesis ile mikrofon düğmesi, ara/son metin, otomatik gönderim, Konuşma modu döngüsü,
   izin hatası, boş sonuçta yeniden başlatma, Esc/çıkış/gizlenme ile durma, ayar kalıcılığı, voiceScore, okuma parçaları, 375 yerleşimi.
   NODE_PATH=$(npm root -g) node tests/voice_test.js */
const H=require('./_h.js');const {ok,sleep,AT}=H;const fs=require('fs');const path=require('path');
const sysTxt=b=>Array.isArray(b.system)?b.system.map(x=>x.text||'').join('\n'):(b.system||'');
const THU=AT(2026,10,8,9);
const PROG={program:{main:{start:'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}}};
/* Taklit ses API'leri: __sr (tanıma örnekleri + senaryo), __tts (okunanlar) */
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
   await p.addInitScript(H.clockScript(THU));await p.addInitScript(MOCK);
   if(o.key!==null)await p.addInitScript(k=>localStorage.setItem('tydil.apiKey',k),'sk-ant-test');
   await p.addInitScript(()=>{try{localStorage.setItem('tydil-tip-pin','1');}catch(e){}});
   if(o.voice)await p.addInitScript(v=>localStorage.setItem('tydil.voice',JSON.stringify(v)),o.voice);
   await H.mockApi(p,st,o.handler);await p.goto(srv.base+'/index.html'+(o.q||''));
   if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
   await p.waitForTimeout(500);return {p,ctx,st};};
 const idle=p=>p.waitForFunction(()=>!document.querySelector('.cc-row.live')&&document.querySelector('#ccStop').hidden,null,{timeout:10000});
 const hscroll=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 const shot=(p,n)=>p.screenshot({path:path.join(H.SHOTS,n)});
 const vstate=p=>p.evaluate(()=>TYDIL.voice.state.state);
 const say=async(p,text,final)=>{await p.evaluate(([t,f])=>{const r=__sr.cur;r._result(t,false);if(f){r._result(t,true);r._end();}},[text,!!final]);await p.waitForTimeout(60);};
 const waitState=(p,s,ms)=>p.waitForFunction(x=>TYDIL.voice.state.state===x,s,{timeout:ms||4000});
 const userRows=p=>p.$$eval('#ccLog .cc-row.me',e=>e.map(x=>x.textContent.replace(/^Sen:\s*/,'').trim()));
 const box=(p,sel)=>p.$eval(sel,e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,x:r.x,r:r.right};});

 // 1) Saf fonksiyonlar: voiceScore + okuma parçaları
 {const {p,ctx}=await open({seed:PROG});
  const sc=await p.evaluate(()=>{const s=TYDIL.voice.score;return {
    exact:s('il quadro elettrico','il quadro elettrico','it'), typo:s('il quadro elettrico','il quadro eletrico','it'), unrelated:s('buongiorno a tutti','ciao mamma guarda','it'),
    num:s('ho 24 anni','ho ventiquattro anni','it'), numEn:s('I have 3 crews','I have three crews','en'), art:s('la chiave','chiave','it'), artEn:s('the cable','cable','en'),
    contr:s("I'm working on site","I am working on site",'en'), empty:s('la chiave','','it'), punct:s('Come stai?','come stai','it'), alt:s('ciao / salve','salve','it')};});
  ok(sc.exact===1&&sc.punct===1&&sc.contr===1,'voiceScore: exact / punctuation / contraction = 1 '+JSON.stringify(sc));
  ok(sc.typo>0.75&&sc.typo<1,'voiceScore: one-letter typo ≈0.8–0.95 ('+sc.typo.toFixed(2)+')');
  ok(sc.unrelated<0.4&&sc.empty===0,'voiceScore: unrelated <0.4, empty = 0 ('+sc.unrelated.toFixed(2)+')');
  ok(sc.num===1&&sc.numEn===1,'voiceScore: numbers normalized (24 → ventiquattro, 3 → three)');
  ok(sc.art>=0.7&&sc.artEn>=0.7&&sc.alt===1,'voiceScore: missing article weighted lightly (≥0.7), "a / b" alternatives');
  const info=await p.evaluate(()=>TYDIL.voice.scoreInfo('il cantiere è grande','il cantiere e grande','it'));ok(info.grade==='good'&&info.bad.length===0,'scoreInfo: accents ignored → good');
  const seg=await p.evaluate(()=>TYDIL.voice.segments('**1/4 · Kelime · 10 dk**\n\n| İtalyanca | Okunuş | Türkçe |\n|---|---|---|\n| [[it: il cavo]] | il KA-vo | kablo |\n| [[it: la luce]] | la LU-çe | ışık |\n\nBak: https://example.com/x `kod` \n```\nTYDIL {"a":1}\n```\n- Madde **kalın** [[en: Tell me more.]]\n\n**Il cavo** ne demek?'));
  const langs=seg.map(s=>s.lang+':'+s.t);
  ok(!langs.some(x=>/example\.com|kod|TYDIL|\*|\|/.test(x)),'segments: no URL/code/markdown left '+JSON.stringify(langs));
  ok(langs.includes('it:il cavo')&&langs.includes('tr:il KA-vo – kablo')&&langs.includes('en:Tell me more.')&&langs.includes('tr:Madde kalın')&&langs.includes('tr:Il cavo ne demek?'),'segments: table rows read as "cell – cell", [[it]]/[[en]] split by language, header row skipped '+JSON.stringify(langs));
  ok(!langs.some(x=>/İtalyanca – Okunuş/.test(x)),'segments: table header not read');
  await ctx.close();}

 // 2) Mikrofon düğmesi: var / yok (desteksiz tarayıcı)
 {const {p,ctx}=await open({seed:PROG});await H.tab(p,'practice');await p.waitForTimeout(200);
  ok(await p.isVisible('#ccMic')&&await p.isVisible('#vcHands')&&await p.isVisible('#vcBar'),'mic button + Konuşma modu toggle visible when SpeechRecognition exists');
  const m=await box(p,'#ccMic'),ta=await box(p,'#ccIn'),sd=await box(p,'#ccSend');
  ok(m.w>=44&&m.h>=44&&sd.w>=44&&sd.h>=44&&m.r<=ta.x&&ta.r<=sd.x&&ta.w>=150&&await hscroll(p),'375: mic | textarea | send in a row, ≥44px, textarea ≥150px, no h-scroll '+JSON.stringify([m.w,ta.w,sd.w]));
  const hb=await box(p,'#vcHands');ok(hb.w>=44&&hb.h>=44,'Konuşma modu toggle ≥44px');
  ok(/Mikrofon düğmesine bas/.test(await p.evaluate(()=>{document.querySelector('[data-agent=en]').click();return new Promise(r=>setTimeout(()=>r(document.querySelector('#ccLog').textContent),300));})),'Oliver empty card tells about mic + Konuşma modu');
  await H.tab(p,'setup');await p.waitForTimeout(100);
  ok(await p.isVisible('#voiceCard')&&await p.isChecked('#vcAutoSpeak')&&await p.isChecked('#vcHandsAuto')&&await p.inputValue('#vcAutoSend')==='auto'&&await p.inputValue('#vcRate')==='0.9','Ayarlar → Ses card: defaults (Koçu sesli oku ON, otomatik dinle ON, gönder auto, hız 0.9)');
  const vo=await p.$$eval('#vcVoices select',e=>e.map(s=>[s.dataset.voice,[...s.options].map(o=>o.textContent)]));
  ok(vo.length===3&&vo[1][1].includes('Google italiano')&&vo[1][1].includes('Microsoft Elsa')&&vo[2][1].includes('Bad News')&&vo[2][1].includes('Google UK English Male')&&!vo[0][1].includes('Google italiano'),'voice lists filtered by language '+JSON.stringify(vo.map(x=>x[1].length)));
  ok((await p.$$eval('[data-mic]',e=>e.map(s=>s.id+'='+s.value))).join()==='vcMic-it=it-IT,vcMic-en=en-GB,vcMic-db=tr-TR','mic language per coach defaults it-IT / en-GB / tr-TR');
  await ctx.close();}
 {const {p,ctx}=await open({seed:PROG,q:'?unsupported=1'});await H.tab(p,'practice');await p.waitForTimeout(200);
  ok(!(await p.$('#ccMic'))&&!(await p.$('#vcHands'))&&/Bu tarayıcıda sesli giriş yok; Chrome kullan/.test(await p.textContent('#ccFoot')),'unsupported browser: mic hidden, one-time note shown');
  await p.click('#vcNote .vc-x');await p.waitForTimeout(100);ok(!(await p.$('#vcNote'))&&JSON.parse(await p.evaluate(()=>localStorage.getItem('tydil.voice'))).noted===1,'note dismissed and remembered');
  await p.reload();await p.waitForTimeout(500);await H.tab(p,'practice');ok(!(await p.$('#vcNote')),'note not shown again after reload');
  ok(await p.evaluate(()=>TYDIL.voice.state.tts===true&&TYDIL.voice.state.mic===false),'TTS stays available without mic');
  await ctx.close();}

 // 3) Pratik: bas-konuş, ara metin gri, son metin kutuda, Pratik'te otomatik gönderim YOK; koç yanıtı okunur ve dil parçalarına bölünür
 {const {p,ctx,st}=await open({seed:PROG});await H.tab(p,'practice');await p.click('[data-agent=en]');await p.waitForTimeout(300);
  await shot(p,'voice_chat_idle.png');
  await p.click('#ccMic');await waitState(p,'listening');
  ok(await p.evaluate(()=>__sr.cur.lang==='en-GB'&&__sr.cur.interimResults===true&&__sr.cur.continuous===false),'recognition started with en-GB, interim on, continuous off');
  ok(await p.evaluate(()=>document.querySelector('#ccMic').classList.contains('on')&&document.querySelector('#ccMic').getAttribute('aria-pressed')==='true')&&/Dinliyorum/.test(await p.textContent('#vcSt')),'listening state: mic .on + status');
  await shot(p,'voice_chat_listening.png');
  await say(p,'I manage three',false);
  ok(await p.inputValue('#ccIn')==='I manage three'&&await p.evaluate(()=>document.querySelector('#ccIn').classList.contains('vc-interim')),'interim text shown grey in textarea');
  await say(p,'I manage three crews on site',true);await waitState(p,'idle');
  ok(await p.inputValue('#ccIn')==='I manage three crews on site'&&!(await p.evaluate(()=>document.querySelector('#ccIn').classList.contains('vc-interim'))),'final text fills textarea (not grey)');
  await p.waitForTimeout(1500);ok(st.calls.length===0&&(await userRows(p)).length===0,'Pratik: no auto-send (default auto = Ders modu only)');
  await p.click('#ccSend');await idle(p);await p.waitForTimeout(300);
  const req=st.reqs[st.reqs.length-1];const um=req.messages.filter(m=>m.role==='user').pop();
  ok(/mikrofonla konuşuldu/.test(um.content)&&/SES: mikrofon var/.test(sysTxt(req))&&/sesli OKUNUYOR/.test(sysTxt(req)),'sent turn carries voice note; system prompt says mic available + replies read aloud');
  const sp=await p.evaluate(()=>__tts.spoken);
  ok(sp.length>=1&&sp.every(x=>x.lang==='en-GB')&&sp[0].voice==='g-en'&&Math.abs(sp[0].rate-0.9)<1e-9&&/Tell me about your crew/.test(sp.map(x=>x.text).join(' ')),'coach reply auto-spoken: [[en]] segment in en-GB voice, rate 0.9 '+JSON.stringify(sp));
  ok(!(await p.evaluate(()=>__sr.log.filter(x=>/^start/.test(x)).length>1)),'no auto-listen after reply when Konuşma modu off');
  // karışık dil: Türkçe + [[en]] parçaları ayrı seslerle
  await p.evaluate(()=>{__tts.spoken=[];});
  st.calls=[];await p.evaluate(()=>{__sr.log=[];});
  const sp2=await p.evaluate(async()=>{await TYDIL.voice.speak('**Daha doğal:** [[en: I have been here since 2024.]] — Türkçe açıklama.\n\n| İfade | Ne zaman |\n|---|---|\n| [[en: sort out]] | halletmek |');return __tts.spoken;});
  ok(sp2.map(x=>x.lang).join()==='tr-TR,en-GB,tr-TR,en-GB,tr-TR'&&sp2[0].voice==='g-tr'&&sp2[1].text==='I have been here since 2024.',"TTS splits Turkish/English segments with language voices: "+sp2.map(x=>x.lang+':'+x.text).join(' | '));
  // Durdur: okuma sırasında
  await p.evaluate(()=>{__tts.delay=4000;});
  const pr=p.evaluate(()=>TYDIL.voice.speak('Uzun bir Türkçe cümle burada. [[en: And an English one.]]'));await waitState(p,'speaking');
  ok(await p.isVisible('#vcStop')&&/okuyor/.test(await p.textContent('#vcSt')),'Durdur control visible while speaking');
  await shot(p,'voice_chat_speaking.png');
  await p.click('#vcStop');const r=await pr;ok(r.cancelled===true&&(await vstate(p))==='idle'&&await p.isHidden('#vcStop'),'Durdur cancels speech');
  await p.evaluate(()=>{__tts.delay=40;});
  // mikrofona basınca okuma durur; gönderince okuma durur
  await p.evaluate(()=>{__tts.delay=3000;});const pr2=p.evaluate(()=>TYDIL.voice.speak('Bir daha okuyorum.'));await waitState(p,'speaking');await p.click('#ccMic');const r2=await pr2;await p.waitForTimeout(100);
  ok(r2.cancelled===true&&(await vstate(p))==='listening','mic tap stops speech and starts listening '+JSON.stringify([r2,await vstate(p)]));
  await p.evaluate(()=>{__tts.delay=40;});await p.keyboard.press('Escape');await waitState(p,'idle');ok(await p.evaluate(()=>__sr.log[__sr.log.length-1]==='abort'),'Esc aborts listening');
  await ctx.close();}

 // 4) Ders modu: Konuşma bloğunda Konuşma modu kendiliğinden açık, döngü 3 tur (oku → dinle → gönder → oku), çift gönderim yok; Esc/çıkış durdurur
 {const {p,ctx,st}=await open({seed:PROG});
  await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!TYDIL.voice.state.hands)&&await p.isVisible('#dersHands')&&await p.getAttribute('#dersHands','aria-pressed')==='false','Gramer block: push-to-talk only (hands-free off), header indicator present');
  // Ders modunda otomatik gönder açık (bas-konuş)
  await p.click('#ccMic');await waitState(p,'listening');ok(await p.evaluate(()=>__sr.cur.lang==='it-IT'),'Chiara → it-IT recognition');
  const n0=st.calls.length;await say(p,'il cavo',true);await waitState(p,'processing');ok(/Gönderiliyor/.test(await p.textContent('#vcSt')),'processing state after final result (1.2 s grace)');
  await p.waitForFunction(n=>document.querySelectorAll('#ccLog .cc-row.me').length===n+1,n0,{timeout:4000});await idle(p);await p.waitForTimeout(200);
  const rows=await userRows(p);ok(rows[rows.length-1].startsWith('il cavo')&&st.calls.length===n0+1,'Ders modu: auto-send after grace → one request '+JSON.stringify(rows));
  ok(/Telaffuz: %100/.test(rows[rows.length-1]),'Chiara target [[it: il cavo]] matched → "Telaffuz: %100" badge on the bubble');
  const lastReq=st.reqs[st.reqs.length-1].messages.filter(m=>m.role==='user').pop().content;ok(/telaffuz eşleşmesi %100 \(hedef: il cavo\)/.test(lastReq),'model sees pronunciation match note');
  // Konuşma bloğuna geç: Chiara bloklarını kapat
  for(let i=0;i<4;i++){await p.waitForTimeout(1250);await p.click('#dersNext');await p.waitForFunction(()=>!!document.querySelector('.cc-row.live')||document.querySelector('#dersNext').hidden||document.querySelector('#dersNext').disabled,null,{timeout:3000}).catch(()=>{});await idle(p);await p.waitForTimeout(250);
    if(await p.isVisible('#dersTrans'))break;}
  ok(await p.isVisible('#dersGoEn'),'transition card reached');
  await p.evaluate(()=>{__sr.log=[];__tts.spoken=[];__sr.script=rec=>setTimeout(()=>{rec._result('I have been running the crew since 2024',true);rec._end();},80);});
  const c0=st.calls.length;await p.click('#dersGoEn');await idle(p);
  await p.waitForFunction(()=>TYDIL.voice.state.hands===true,null,{timeout:3000});
  ok(await p.getAttribute('#dersHands','aria-pressed')==='true'&&await p.getAttribute('#vcHands','aria-pressed')==='true'&&await p.isHidden('#vcHands')&&await p.isVisible('#dersHands'),'Konuşmaya başla → Oliver + Konuşma modu ON; in Ders modu only the header toggle is visible');
  ok(await p.$$eval('#ders .cc-mic, #ders .vc-hands, #ders .dHands',e=>e.filter(x=>x.offsetParent).map(x=>x.id).sort().join())==='ccMic,dersHands','Ders modu: one mic (#ccMic) + one Konuşma modu toggle (#dersHands)');
  await shot(p,'voice_ders_hands.png');
  // 3 döngü: her turda okuma → dinleme → gönderim
  await p.waitForFunction(n=>document.querySelectorAll('#ccLog .cc-row.me').length>=n,4,{timeout:20000});
  await idle(p);await p.waitForTimeout(400);
  const rows2=(await userRows(p)).filter(r=>/since 2024/.test(r)),spk=await p.evaluate(()=>__tts.spoken.length),starts=await p.evaluate(()=>__sr.log.filter(x=>/^start/.test(x)));
  const reqs=st.calls.slice(c0).map(c=>c.last);
  ok(rows2.length>=3&&rows2.every(r=>/since 2024/.test(r))&&reqs.filter(x=>/since 2024/.test(x)).length>=3,'hands-free loop ran ≥3 cycles (speak → listen → send → speak): '+rows2.length+' sends, '+JSON.stringify(reqs));
  ok(reqs.filter(x=>/since 2024/.test(x)).length===rows2.length&&reqs.length===rows2.length+1,'no duplicate sends (one request per spoken answer + the start message)');
  ok(spk>=3&&starts.every(s=>s==='start:en-GB'),'each coach reply spoken; recognition in en-GB '+JSON.stringify(starts.length));
  // Esc: döngü durur (dinlerken), ders açık kalır
  await p.evaluate(()=>{__sr.script=null;});await waitState(p,'listening',6000);await p.keyboard.press('Escape');await p.waitForTimeout(300);
  ok(await p.isVisible('#ders')&&(await vstate(p))==='idle'&&await p.evaluate(()=>!TYDIL.voice.state.hands),'Esc while listening: stops loop, Konuşma modu off, lesson stays open');
  await p.click('#dersHands');await p.waitForFunction(()=>TYDIL.voice.state.hands===true);await p.waitForTimeout(150);
  ok((await vstate(p))==='listening','toggle back on while coach waits → listening starts');
  // gizlenince dinleme durur
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{get:()=>true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(200);
  ok((await vstate(p))==='idle'&&await p.evaluate(()=>__sr.log[__sr.log.length-1]==='abort'),'visibilitychange → listening stops');
  await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  ok(await p.evaluate(()=>TYDIL.voice.state.hands===true),'Konuşma modu stays on after hiding (resumes with next reply)');
  // çıkış: her şey durur, Konuşma modu kapanır
  await p.click('#ccMic');await waitState(p,'listening');await p.click('#dersExit');await p.waitForTimeout(250);
  ok(await p.isHidden('#ders')&&(await vstate(p))==='idle'&&await p.evaluate(()=>!TYDIL.voice.state.hands),'exit lesson → voice stopped, Konuşma modu off');
  ok(await hscroll(p),'no h-scroll');
  await ctx.close();}

 // 5) Hatalar: not-allowed kartı · boş erken bitişte ≤2 yeniden başlatma · no-speech ipucu
 {const {p,ctx}=await open({seed:PROG});await H.tab(p,'practice');await p.click('[data-agent=en]');await p.waitForTimeout(300);
  await p.evaluate(()=>{__sr.script=rec=>{rec._error('not-allowed');rec._end();};});
  await p.click('#ccMic');await p.waitForSelector('#ccLog .cc-err.vc-err',{timeout:3000});
  ok(/Mikrofon izni ver \(tarayıcı adres çubuğu/.test(await p.textContent('#ccLog .cc-err.vc-err'))&&(await vstate(p))==='idle','not-allowed → in-page permission card');
  await p.evaluate(()=>{__sr.log=[];__sr.script=rec=>rec._end();});   /* hiç sonuç vermeden hemen kapanıyor (Edge) */
  await p.click('#ccLog [data-vc-retry]');await p.waitForTimeout(1500);
  const starts=await p.evaluate(()=>__sr.log.filter(x=>/^start/.test(x)).length);
  ok(starts===3&&(await vstate(p))==='idle'&&/Sesini duyamadım/.test(await p.textContent('#vcSt')),'empty early end: restarted twice (3 starts), then hint '+starts);
  await p.evaluate(()=>{__sr.log=[];__sr.script=rec=>setTimeout(()=>{rec._error('no-speech');rec._end();},50);});
  await p.click('#ccMic');await p.waitForTimeout(1200);
  ok(/Sesini duyamadım/.test(await p.textContent('#vcSt'))&&!(await p.$('#ccLog .cc-err.vc-err')),'no-speech → hint (no error card)');
  await ctx.close();}

 // 6) Ayarlar kalıcı: sesli okuma kapalı, hız, ses seçimi, mikrofon dili; "Mikrofonu dene"
 {const {p,ctx,st}=await open({seed:PROG});await H.tab(p,'setup');await p.waitForTimeout(100);
  await p.click('#vcAutoSpeak');await p.selectOption('#vcAutoSend','on');await p.$eval('#vcRate',e=>{e.value='1.1';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
  await p.selectOption('#vcVoices select[data-voice=it]','ms-it');await p.selectOption('#vcMic-en','en-US');
  await p.evaluate(()=>{__sr.script=rec=>setTimeout(()=>{rec._result('merhaba dünya',true);rec._end();},50);});
  await p.click('#vcTest');await p.waitForFunction(()=>/Anlaşılan/.test(document.querySelector('#vcTestOut').textContent),null,{timeout:3000});
  ok(/merhaba dünya/.test(await p.textContent('#vcTestOut'))&&await p.evaluate(()=>__sr.cur.lang==='it-IT'),'Mikrofonu dene shows recognized text (uses current coach language)');
  await p.reload();await p.waitForTimeout(500);await H.tab(p,'setup');
  const v=JSON.parse(await p.evaluate(()=>localStorage.getItem('tydil.voice')));
  ok(v.autoSpeak===false&&v.autoSend==='on'&&Math.abs(v.rate-1.1)<1e-9&&v.voices.it==='ms-it'&&v.micLang.en==='en-US','settings persisted in tydil.voice '+JSON.stringify(v));
  ok(!(await p.isChecked('#vcAutoSpeak'))&&await p.inputValue('#vcAutoSend')==='on'&&await p.inputValue('#vcRate')==='1.1'&&await p.inputValue('#vcVoices select[data-voice=it]')==='ms-it'&&await p.inputValue('#vcMic-en')==='en-US','settings UI reflects stored values after reload');
  await H.tab(p,'practice');await p.click('[data-agent=en]');await p.waitForTimeout(300);
  await p.evaluate(()=>{__sr.script=rec=>setTimeout(()=>{rec._result('hello there',true);rec._end();},50);});
  await p.click('#ccMic');await p.waitForFunction(()=>document.querySelectorAll('#ccLog .cc-row.me').length===1,null,{timeout:4000});await idle(p);await p.waitForTimeout(200);
  ok(await p.evaluate(()=>__sr.list[__sr.list.length-1].lang==='en-US'&&__tts.spoken.length===0),'mic override en-US used; auto-send "Her zaman" sends in Pratik; auto-speak off → nothing spoken');
  const sys=sysTxt(st.reqs[st.reqs.length-1]);ok(/SES: mikrofon var/.test(sys)&&/sesli okuma kapalı/.test(sys),'system prompt reflects speak-off');
  // Dinle düğmesi hâlâ çalışır ve seçili sesi kullanır
  await p.evaluate(()=>{__tts.spoken=[];});await p.evaluate(async()=>{await TYDIL.voice.speak('[[it: la chiave]]');});
  ok(await p.evaluate(()=>__tts.spoken[0]&&__tts.spoken[0].voice==='ms-it'&&Math.abs(__tts.spoken[0].rate-1.1)<1e-9),'manual speak uses chosen Italian voice + rate');
  await ctx.close();}

 await b.close();srv.close();console.log('errors',errs);ok(!errs.length,'no console errors / dialogs');console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
