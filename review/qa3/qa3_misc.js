/* QA3: no SpeechRecognition (iOS-Safari-ish) · no speechSynthesis · IndexedDB absent / open throws · midnight rollover ·
   double-click guards · extra XSS vectors · page size + load time at 3G (Fast/Slow) with and without gzip.
   NODE_PATH=$(npm root -g) node review/qa3/qa3_misc.js */
const H=require('../../tests/_h.js');const {ok,sleep,AT}=H;const fs=require('fs');const path=require('path');const zlib=require('zlib');const http=require('http');
const PROG=s=>({program:{main:{start:s||'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}}});
const THU=AT(2026,10,8,9);
/* clock with a runtime-adjustable shift (window.__shift ms) */
const clock=t=>`(()=>{const R=Date,off=${t}-R.now();window.__shift=0;class FD extends R{constructor(...a){super(...(a.length?a:[R.now()+off+window.__shift]))}static now(){return R.now()+off+window.__shift}};window.Date=FD;})()`;
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const open=async(o,at)=>{o=o||{};const st={};const ctx=await b.newContext({viewport:{width:375,height:812},timezoneId:'Europe/Istanbul'});const p=await ctx.newPage();const myErrs=[];
   p.on('pageerror',x=>{errs.push('pageerror '+x.message);myErrs.push(x.message);});p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text())){errs.push('console '+m.text());myErrs.push(m.text());}});p.on('dialog',d=>{errs.push('DIALOG');d.dismiss();});
   if(at!=null)await p.addInitScript(clock(at));
   if(o.init)await p.addInitScript(o.init);
   if(o.key!==null)await p.addInitScript(k=>localStorage.setItem('tydil.apiKey',k),o.key||'sk-ant-test');
   await H.mockApi(p,st,o.handler);
   await p.goto(srv.base+'/index.html');
   if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
   await p.waitForTimeout(500);return {p,ctx,st,myErrs};};
 const idle=p=>p.waitForFunction(()=>!document.querySelector('.cc-row.live')&&document.querySelector('#ccStop').hidden,null,{timeout:10000});
 const steps=p=>p.$$eval('#dersSteps .dStep',e=>e.map(x=>(x.classList.contains('done')?'+':x.classList.contains('cur')?'>':'-')+x.querySelector('.dsl').textContent));
 const startLesson=async p=>{await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);};

 /* ---- 6) no SpeechRecognition (iOS Safari / Firefox) ---- */
 {const {p,ctx,st,myErrs}=await open({seed:PROG(),init:`delete window.SpeechRecognition;delete window.webkitSpeechRecognition;Object.defineProperty(window,'SpeechRecognition',{value:undefined,configurable:true});Object.defineProperty(window,'webkitSpeechRecognition',{value:undefined,configurable:true});`},THU);
  await startLesson(p);
  const v=await p.evaluate(()=>({mic:!!document.querySelector('#ccMic'),hands:!!document.querySelector('#vcHands'),note:(document.querySelector('#vcNote')||{}).textContent||'',bar:!!document.querySelector('#vcBar'),tts:!!document.querySelector('.cc-say')}));
  ok(!v.mic&&!v.hands&&/sesli giriş yok; Chrome kullan/.test(v.note),'no SR: mic + hands-free hidden, hint shown: '+JSON.stringify(v));
  ok(await p.isVisible('#dersNoMic')&&/sesli giriş yok; Chrome kullan/.test(await p.textContent('#dersNoMic')),'no SR: hint visible inside Ders mode (#dersNoMic in footer)');
  await p.fill('#ccIn','ciao');await p.press('#ccIn','Enter');await idle(p);
  await p.click('#dersExit');await H.tab(p,'practice');await p.waitForTimeout(300);
  ok(await p.isVisible('#vcNote'),'no SR: hint visible in Pratik chat');
  await p.click('#vcNote .vc-x');ok(!(await p.$('#vcNote'))&&await p.evaluate(()=>/noted/.test(localStorage.getItem('tydil.voice')||'')),'no SR: hint dismissable + remembered');
  await p.click('[data-tab=learn]');await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');ok(!(await p.$('#dersNoMic')),'no SR: Ders hint gone too after dismiss');await p.keyboard.press('Escape');await p.waitForTimeout(200);
  // Ayarlar → Ses card says why
  await H.tab(p,'setup');await p.waitForTimeout(300);
  const setTxt=await p.textContent('#tab-setup');ok(/sesli giriş yok; Chrome kullan/.test(setTxt),'no SR: Ayarlar → Ses explains (hint text present)');
  ok(!myErrs.length,'no SR: no page errors');await ctx.close();}
 /* no speechSynthesis either (very old WebView) */
 {const {p,ctx,myErrs}=await open({seed:PROG(),init:`Object.defineProperty(window,'SpeechRecognition',{value:undefined});Object.defineProperty(window,'webkitSpeechRecognition',{value:undefined});Object.defineProperty(window,'speechSynthesis',{value:undefined});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:undefined});`},THU);
  await startLesson(p);const v=await p.evaluate(()=>({bar:!!document.querySelector('#vcBar'),say:document.querarySelectorAll?0:document.querySelectorAll('.cc-say').length}));
  ok(!v.bar&&v.say===0&&!myErrs.length,'no SR + no TTS: no voice bar, no say buttons, no errors '+JSON.stringify(v));await ctx.close();}

 /* ---- 8) IndexedDB absent / open throws ---- */
 for(const [name,init] of [['indexedDB undefined',`Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});`],['indexedDB.open throws (FF private)',`const o=indexedDB.open.bind(indexedDB);indexedDB.open=()=>{throw new DOMException('A mutation operation was attempted on a database that did not allow mutations.','InvalidStateError');};`]]){
  const {p,ctx,st,myErrs}=await open({seed:PROG(),init},THU);
  const mode=await p.evaluate(()=>TYRT.mode);ok(mode==='local',name+': mode=local');
  await startLesson(p);await p.fill('#ccIn','il cavo');await p.press('#ccIn','Enter');await idle(p);
  const n1=await p.evaluate(()=>Object.keys(rtExport().collections.cards).length);
  await p.reload();await p.waitForTimeout(600);
  const n2=await p.evaluate(()=>Object.keys(rtExport().collections.cards).length);const prog=await p.evaluate(()=>!!rtExport().collections.program.main);
  ok(n1>0&&n2===n1&&prog,name+': docs persist via localStorage across reload ('+n1+' cards)');
  ok(!myErrs.length,name+': no page errors');await ctx.close();}

 /* ---- 9) midnight rollover ---- */
 {const T=Date.UTC(2026,9,8,20,59,30); // 23:59:30 Istanbul (UTC+3), Thursday
  const {p,ctx,st,myErrs}=await open({seed:PROG()},T);
  const TD=()=>p.evaluate(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
  await startLesson(p);const d0=await TD();
  const key0=Object.keys(await p.evaluate(()=>rtExport().collections.chats||{}));
  await p.evaluate(()=>{window.__shift=45000;});   // → 00:00:15 Friday
  await p.waitForTimeout(2500);
  const d1=await TD();
  const closed=await p.isHidden('#ders');
  ok(d0==='2026-10-08'&&d1==='2026-10-09'&&closed,'midnight: lesson screen closed by tick ('+d0+' → '+d1+')');
  // start a new lesson on the new day → first block fresh, new chat
  await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);
  const key1=Object.keys(await p.evaluate(()=>rtExport().collections.chats||{}));
  ok(key0.some(k=>/2026-10-08/.test(k))&&key1.some(k=>/2026-10-09/.test(k)),'midnight: chat docs per day '+key0.join(',')+' → '+key1.join(','));
  const s=await steps(p);ok(s.every(x=>!x.startsWith('+'))&&st.calls.length>=2,'midnight: next day lesson starts fresh (no blocks done) '+s.join(' '));
  const me=await p.$$eval('#ccLog .cc-row',e=>e.length);ok(me<=3,'midnight: new day chat log does not carry yesterday turns ('+me+' rows)');
  // rollover while a wrap-up click arrives after midnight (second scenario): open at 23:59:58, click Bloğu bitirdim after midnight
  await ctx.close();
  const T2=Date.UTC(2026,9,8,20,59,57);const o2=await open({seed:PROG()},T2);
  await startLesson(o2.p);await o2.p.waitForTimeout(1300);const n0=o2.st.calls.length;
  await o2.p.evaluate(()=>{window.__shift=5000;});await o2.p.click('#dersNext').catch(()=>{});await o2.p.waitForTimeout(800);
  ok(await o2.p.isHidden('#ders')&&o2.st.calls.length===n0,'midnight click: Bloğu bitirdim after day change → rollover, no wrap-up request sent');
  ok(!myErrs.length&&!o2.myErrs.length,'midnight: no page errors');await o2.ctx.close();}

 /* ---- 9b) double-click guards ---- */
 {const {p,ctx,st,myErrs}=await open({seed:PROG()},THU);
  await startLesson(p);await p.waitForTimeout(1300);const n0=st.calls.length;
  await p.evaluate(()=>{const x=document.querySelector('#dersNext');x.click();x.click();x.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:2}));});
  await idle(p);await p.waitForTimeout(300);
  const s=await steps(p);ok(st.calls.length===n0+1&&s[0]==='+Gramer'&&s[1]==='>Kelime','double/triple click Bloğu bitirdim → one wrap-up request, one block advanced '+s.slice(0,3).join(' '));
  // Kaydetmeden geç double click after a failure
  st.fail=()=>true;st.failStatus=529;await p.waitForTimeout(1300);await p.click('#dersNext');await idle(p);await p.waitForTimeout(300);
  ok(await p.isVisible('#dersSkip'),'failure → Kaydetmeden geç visible');
  await p.evaluate(()=>{const x=document.querySelector('#dersSkip');x.click();x.click();});await p.waitForTimeout(600);
  const s2=await steps(p);ok(s2[1]==='+Kelime'&&s2[2]==='>Okuma-yazma'&&s2[3]!=='+Sesli tekrar','double click Kaydetmeden geç → exactly one block skipped '+s2.join(' '));
  st.fail=null;
  // Enter twice quickly on chat input → one message
  await p.fill('#ccIn','merhaba');const n1=st.calls.length;await p.press('#ccIn','Enter');await p.press('#ccIn','Enter');await idle(p);
  ok(st.calls.length===n1+1,'Enter twice → one request');
  // Dersi bitir / start double-click: btnGo twice
  await p.click('#dersExit');await p.waitForTimeout(300);const n2=st.calls.length;
  await p.evaluate(()=>{const x=document.querySelector('#btnGo');x.click();x.click();});await p.waitForSelector('#ders:not([hidden])');await idle(p);await p.waitForTimeout(300);
  ok(st.calls.length===n2&&(await p.$$('#ccLog .cc-row.me')).length>=1,'resume lesson double click → no duplicate start message ('+(st.calls.length-n2)+' new requests)');
  ok(!myErrs.length,'double-click: no page errors');await ctx.close();}

 /* ---- 7) XSS: extra vectors (tool inputs to every tool, done screen, progress tab) ---- */
 {const X='<img src=x onerror="window.__xss=1">';const S='<svg onload="window.__xss=1"></svg>';
  const handler=(req,st)=>{const {lastText,cont}=req;
    if(cont)return {sse:[{text:'Tamam '+X}]};
    if(/bitiriyorum/.test(lastText))return {sse:[{text:'Kayıt '+X},{tool:{name:'seans_kaydet',input:{lang:'it',dk:{gramer:20},hatalar:[X,S],not:X,sonraki:S,konu:'it01'}}},{tool:{name:'konu_durumu',input:{id:'it01',durum:'done',not:X}}},{tool:{name:'sinav_kaydet',input:{hafta:3,puan:7,toplam:10,tur:'haftalik',notlar:X}}}]};
    return {sse:[{text:'[[it: '+X+']] [[en: "><svg onload=window.__xss=1>]] `'+X+'`\n\n> '+X+'\n\n- '+X+'\n\n# '+X+'\n\n| a | b |\n|---|---|\n| '+X+' | '+S+' |'},{tool:{name:'kelime_ekle',input:{lang:'it',items:[{f:X,tr:S,ex:'"'+X,ipucu:X}]}}}]};};
  const {p,ctx,st,myErrs}=await open({seed:PROG(),handler},THU);
  await p.evaluate(()=>window.__xss=0);await startLesson(p);
  for(let i=0;i<5;i++){await p.waitForTimeout(1300);if(await p.isVisible('#dersNext'))await p.click('#dersNext');else if(await p.isVisible('#dersGoEn'))await p.click('#dersGoEn');await idle(p).catch(()=>{});}
  await p.waitForTimeout(500);
  const raw1=await p.evaluate(()=>document.body.innerHTML);
  const x1=await p.evaluate(()=>window.__xss);
  ok(!x1,'XSS via all tool inputs (seans_kaydet hatalar/not/sonraki, konu_durumu not, sinav_kaydet notlar, kelime_ekle ex) + done screen: __xss='+x1);
  ok(!/<img src=x onerror=/.test(raw1)&&!/<svg onload=/.test(raw1),'no raw payload tags in DOM after lesson');
  await p.click('#dersExit').catch(()=>{});await p.waitForTimeout(200);
  for(const t of ['progress','practice','learn','setup']){await H.tab(p,t);await p.waitForTimeout(300);}
  // open card practice if available
  const x2=await p.evaluate(()=>window.__xss);const raw2=await p.evaluate(()=>document.body.innerHTML);
  ok(!x2&&!/<img src=x onerror=/.test(raw2)&&!/<svg onload=/.test(raw2),'XSS: progress/practice/setup tabs render stored payloads escaped');
  await p.reload();await p.waitForTimeout(800);await p.evaluate(()=>window.__xss=0);await p.waitForTimeout(300);
  ok(!(await p.evaluate(()=>window.__xss)),'XSS: after reload (chat log + dashboard re-rendered from storage) still inert');
  ok(!myErrs.length,'XSS: no page errors');await ctx.close();}

 /* ---- 10) size + load time at 3G ---- */
 {const html=fs.readFileSync(path.join(H.ROOT,'index.html'));const gz=zlib.gzipSync(html,{level:6}).length;const br=zlib.brotliCompressSync(html).length;
  console.log(`  index.html raw ${(html.length/1024).toFixed(0)} KB · gzip ${(gz/1024).toFixed(0)} KB · brotli ${(br/1024).toFixed(0)} KB`);
  // gz-capable server variant
  const gzsrv=await new Promise(res=>{const s=http.createServer((req,r)=>{const fp=path.join(H.ROOT,decodeURIComponent(new URL(req.url,'http://x').pathname));if(!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){r.writeHead(404);return r.end();}const body=fs.readFileSync(fp);const ct=/\.html$/.test(fp)?'text/html; charset=utf-8':/\.js$/.test(fp)?'application/javascript':/\.png$/.test(fp)?'image/png':'application/octet-stream';if(/gzip/.test(req.headers['accept-encoding']||'')&&/\.(html|js|webmanifest)$/.test(fp)){r.writeHead(200,{'content-type':ct,'content-encoding':'gzip'});r.end(zlib.gzipSync(body));}else{r.writeHead(200,{'content-type':ct});r.end(body);}});s.listen(0,'127.0.0.1',()=>res({base:'http://127.0.0.1:'+s.address().port,close:()=>s.close()}));});
  const profiles={'Fast 3G':{downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8,latency:150},'Slow 3G':{downloadThroughput:400*1024/8,uploadThroughput:400*1024/8,latency:400}};
  for(const [nm,cond] of Object.entries(profiles))for(const [srvNm,base] of [['plain',srv.base],['gzip',gzsrv.base]]){
    const ctx=await b.newContext({viewport:{width:375,height:812}});const p=await ctx.newPage();await p.addInitScript(k=>localStorage.setItem('tydil.apiKey',k),'sk-ant-test');
    const cdp=await ctx.newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',Object.assign({offline:false},cond));
    const t0=Date.now();await p.goto(base+'/index.html',{waitUntil:'domcontentloaded'});const tDcl=Date.now()-t0;
    await p.waitForSelector('#btnGo,#onb',{state:'visible',timeout:60000}).catch(()=>{});const tUi=Date.now()-t0;
    const perf=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {transfer:n&&n.transferSize,dcl:n&&Math.round(n.domContentLoadedEventEnd),fp:(performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint')||{}).startTime};});
    console.log(`  ${nm} ${srvNm}: DCL ${tDcl} ms · UI visible ${tUi} ms · transfer ${perf.transfer} B · FCP ${perf.fp&&Math.round(perf.fp)} ms`);
    ok(tUi<(nm==='Slow 3G'?20000:6000),`${nm} ${srvNm}: first screen within budget (${tUi} ms)`);
    await ctx.close();}
  gzsrv.close();
  ok(gz<250*1024,'gzip size '+(gz/1024).toFixed(0)+' KB (GitHub Pages serves gzip) under 250 KB');}

 ok(!errs.length,'no page errors overall '+errs.slice(0,3).join(' | '));
 await b.close();srv.close();console.log('errors',JSON.stringify(errs.slice(0,5)));console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
