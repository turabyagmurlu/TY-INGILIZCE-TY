/* QA: dilOgren_v4 cross-compat — state written by new Dersler tab read by legacy page and vice versa; quizSave resume; handwriting offline.
   NODE_PATH=$(npm root -g) node review/qa/qa_units_legacy.js */
const H=require('../../tests/_h.js');const {ok,sleep,AT}=H;
const THU=AT(2026,10,8,9);
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const ctxOpen=async()=>{const ctx=await b.newContext({viewport:{width:375,height:812},timezoneId:'Europe/Istanbul'});return ctx;};
 const page=async(ctx,url,init)=>{const p=await ctx.newPage();p.on('pageerror',x=>errs.push('pageerror '+url.split('/').pop()+' '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>d.dismiss());
   await p.addInitScript(H.clockScript(THU));await p.addInitScript(()=>localStorage.setItem('tydil.apiKey','k'));if(init)await p.addInitScript(init);await p.goto(srv.base+url);await sleep(400);return p;};
 const LS=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('dilOgren_v4')||'null'));

 /* A) new app: complete vocab 1-1 flash+quiz partially (quizSave) → legacy reads it */
 {const ctx=await ctxOpen();let p=await page(ctx,'/index.html');
  await p.click('[data-tab=units]');await sleep(400);
  await p.click('[data-act=lang][data-lang=en]').catch(()=>{});await sleep(200);
  await p.click('[data-act=openUnit][data-uid="1-1"]').catch(async()=>{await p.evaluate(()=>location.hash='#dersler/en/1-1/lesson');});await sleep(300);
  await p.evaluate(()=>location.hash='#dersler/en/1-1/quiz');await sleep(300);
  await p.click('[data-act=startQuiz]');await sleep(150);
  for(let i=0;i<2;i++){await p.click('#uOpts .u-opt[data-i="0"]');await sleep(60);await p.click('[data-act=nextQuiz]');await sleep(80);}
  // also a note + unlock + settings change
  await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dilOgren_v4'));s.langStore.en.notes={'1-1':{text:'Not: ünite 1-1 — çğışöü',updatedAt:Date.now()}};s.settings.fontScale=1.25;s.settings.hwLang='en';localStorage.setItem('dilOgren_v4',JSON.stringify(s));});
  const s1=await LS(p);ok(s1&&s1.lang==='en'&&s1.langStore.en.quizSave&&s1.langStore.en.quizSave.qIndex===2,'new app wrote quizSave qIndex 2 for en 1-1');
  await p.close();
  // legacy page with the same localStorage (same origin)
  p=await page(ctx,'/legacy/ty-ingilizce.html');
  const leg=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dilOgren_v4'));return {lang:s.lang,q:s.langStore.en.quizSave&&s.langStore.en.quizSave.qIndex,fs:s.settings.fontScale,body:document.body.innerText.slice(0,3000)};});
  ok(leg.q===2&&leg.fs===1.25,'legacy loaded state intact (quizSave kept, fontScale kept): '+JSON.stringify({lang:leg.lang,q:leg.q,fs:leg.fs}));
  // navigate legacy to the unit → resume offered?
  await p.evaluate(()=>{location.hash='#unit/1-1';});await sleep(300);
  const txt=await p.evaluate(()=>document.body.innerText);
  console.log('  legacy page shows resume?',/yarıda|devam et|Kaldığın/i.test(txt),' | legacy hash routing:',await p.evaluate(()=>location.hash));
  // legacy writes: complete something via direct state mutation through its own saveState if exposed; else simulate legacy-format write (identical structure)
  const legWrite=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dilOgren_v4'));s.langStore.en.completedLessons=['1-1'];s.langStore.en.bestScores={'1-1':5};s.langStore.en.quizSave=null;s.langStore.en.unitProgress={'1-1':{attempts:1,last:{score:5,total:6,passed:true,at:Date.now()}}};s.lang='it';s.langStore.it.reviewWords=[{en:'la casa',tr:'ev'}];localStorage.setItem('dilOgren_v4',JSON.stringify(s));return 1;});
  const s2=await LS(p);await p.close();
  p=await page(ctx,'/index.html');await p.click('[data-tab=units]');await sleep(500);
  const s3=await LS(p);
  ok(s3.lang==='it'&&s3.langStore.en.completedLessons.includes('1-1')&&s3.langStore.en.bestScores['1-1']===5&&s3.langStore.it.reviewWords.length===1,'new app re-read legacy-written state: lang it, en 1-1 done, it reviewWords kept');
  ok(JSON.stringify(Object.keys(s3).sort())===JSON.stringify(Object.keys(s2).sort()),'top-level keys unchanged after new app saveState');
  const done=await p.evaluate(()=>document.body.innerText);ok(/1\s*\/\s*\d+|tamam|✓/i.test(done),'units UI reflects completion');
  // reviewWords entry from legacy with unexpected shape (string) → no crash
  await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('dilOgren_v4'));s.langStore.it.reviewWords=['garbage',null,{en:'x'}];s.langStore.it.unitProgress='bad';s.langStore.it.quizSave={key:'x'};localStorage.setItem('dilOgren_v4',JSON.stringify(s));});
  await p.reload();await sleep(400);await p.click('[data-tab=units]');await sleep(400);
  const ok2=await p.evaluate(()=>!!document.querySelector('#uView') && document.querySelector('#uView').innerText.length>50);
  ok(ok2,'malformed legacy fields (reviewWords strings, unitProgress string, quizSave partial) do not crash Dersler');
  await ctx.close();}

 /* B) handwriting offline: fetch to inputtools fails → friendly message, no uncaught */
 {const ctx=await ctxOpen();const p=await page(ctx,'/index.html');
  await p.route('https://inputtools.google.com/**',r=>r.abort('internetdisconnected'));
  await p.click('[data-tab=units]');await sleep(400);
  const hw=await p.evaluate(async()=>{const fab=document.getElementById('uFab');if(fab)fab.click();await new Promise(r=>setTimeout(r,300));
    const canvas=document.querySelector('canvas');const convert=[...document.querySelectorAll('button')].find(b=>/Yazıya çevir/.test(b.textContent));return {canvas:!!canvas,convert:!!convert};});
  console.log('  handwriting UI:',JSON.stringify(hw));
  if(hw.canvas){await p.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const ev=(t,x,y)=>c.dispatchEvent(new PointerEvent(t,{clientX:r.left+x,clientY:r.top+y,pointerId:1,bubbles:true,isPrimary:true,pointerType:'touch'}));ev('pointerdown',20,20);ev('pointermove',60,60);ev('pointerup',60,60);});
    await sleep(100);await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>/Yazıya çevir/.test(b.textContent));b&&b.click();});await sleep(800);
    const msg=await p.evaluate(()=>document.body.innerText);ok(/İnternet yok|çevrilemedi/.test(msg),'handwriting offline shows HW_OFFLINE message');}
  await ctx.close();}
 await b.close();srv.close();console.log('errors',errs);ok(!errs.length,'no page errors');console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
