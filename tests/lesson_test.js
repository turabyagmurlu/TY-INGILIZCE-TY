/* Ders motoru: fikstür (tests/fixtures/lesson_it05.json) ile 5 adım (Anlat · Dinle · Uygula · Konuş · Yokla), yanlış cevap açıklaması, aksan toleransı,
   sıralama sorusu, Koça sor bağlamı, Yokla geç/kal, ilerleme kalıcılığı, konu tamam + seans dakikası, Pekiştir, günün planı tikleri;
   sonra content/*.json'daki her ders: şema denetimi + bütün adımlar hatasız çizilir ve doğru cevaplarla geçilir.
   NODE_PATH=$(npm root -g) node tests/lesson_test.js */
const H=require('./_h.js');const {ok,sleep,AT}=H;const fs=require('fs');const path=require('path');
const MOCK=fs.readFileSync(path.join(__dirname,'voice_test.js'),'utf8').match(/const MOCK=`([\s\S]*?)`;/)[1];
const FIX=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/lesson_it05.json'),'utf8'));
const WED=AT(2026,10,14,9), THU=AT(2026,10,15,9);
const SEED={program:{main:{start:'2026-09-28',weeks:12,dailyMin:60,mode:'yogun'}},topics:Object.fromEntries(['it01','it02','it03','it04'].map(id=>[id,{status:'done',updated:'2026-10-01T10:00:00Z'}])),
  cards:{c1:{lang:'it',f:'il cavo',tr:'kablo',box:1,due:'2026-10-13',added:'2026-10-10T10:00:00Z'}}};
const SHOTS=path.join(H.ROOT,'review/shots_v9');fs.mkdirSync(SHOTS,{recursive:true});const SHOTS10=path.join(H.ROOT,'review/shots_v10');fs.mkdirSync(SHOTS10,{recursive:true});
const sysOf=b=>Array.isArray(b.system)?b.system.map(x=>x.text||'').join('\n'):(b.system||'');
function handler(req,st){const s=req.system;st.sys=st.sys||[];st.sys.push(s);
  if(/KOÇA SOR/.test(s))return {sse:[{text:'Kısa ipucu: io ile sono gelir.'}]};
  if(/KONUŞMA MODU|SPEAKING MODE/.test(s)){if(/GÖRÜŞME BİTTİ|CALL IS OVER/.test(req.lastText))return {sse:[{text:'{"duzeltmeler":[],"ifadeler":[{"x":"Sono pronto.","tr":"Hazırım."}],"ipucu":"Devam."}'}]};return {sse:[{text:'Ciao! Tu sei Türab?'}]};}
  return {sse:[{text:'Tamam.'}]};}
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const mk=async(o)=>{o=o||{};const st={content:true};const ctx=await b.newContext({viewport:o.vp||{width:390,height:844},timezoneId:'Europe/Istanbul',serviceWorkers:'block',colorScheme:o.dark?'dark':'light',reducedMotion:'reduce'});const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   await p.addInitScript(H.clockScript(o.at||WED));await p.addInitScript(MOCK);await p.addInitScript(()=>{localStorage.setItem('tydil.apiKey','sk-ant-test');localStorage.setItem('tydil-tip-pin','1');});
   if(o.fixture!==false){await p.route('**/content/index.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify([{id:'it05',lang:'it',level:'A1',title:FIX.title,minutes:30}])}));
     await p.route('**/content/it05.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(FIX)}));}
   if(o.pre)await o.pre(p);
   await H.mockApi(p,st,o.handler||handler);await p.goto(srv.base+'/index.html');
   if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
   await p.waitForTimeout(700);return {p,ctx,st};};
 const store=(p,c)=>p.evaluate(c=>rtExport().collections[c]||{},c);
 const plan=p=>p.$$eval('#dayPlan li:not(.extra)',e=>e.map(x=>(x.classList.contains('done')?'+':x.classList.contains('next')?'>':'-')+x.querySelector('b').textContent));
 const stage=p=>p.evaluate(()=>document.querySelector('#lstage').innerText);
 const cur=p=>p.evaluate(()=>{const b=document.querySelector('#lpath [aria-current=step]');return b?b.lastChild.textContent.trim():'';});
 const click=async(p,sel)=>{await p.click(sel);await p.waitForTimeout(80);};

 // A) Günün planı → kartlar → ders: bütün adımlar
 {const {p,ctx,st}=await mk({seed:SEED});
  let pl=await plan(p);ok(pl.join('|')==='>Kart tekrarı|-'+FIX.title+'|-Oliver ile konuş','day plan (İkisi): cards → lesson → Oliver: '+pl.join('|'));
  ok(/önce kart tekrarı/.test(await p.textContent('#btnGo')),'one primary Başla: "Başla · önce kart tekrarı"');
  await p.screenshot({path:path.join(SHOTS,'today_390_light.png')});
  await click(p,'#btnGo');ok(await p.isVisible('#tab-cards')&&await p.isVisible('#review'),'Başla → Kartlar screen');
  await click(p,'#cShow');await click(p,'#cYes');await p.waitForTimeout(150);
  await click(p,'[data-tab=learn]');pl=await plan(p);ok(pl[0]==='+Kart tekrarı'&&pl[1]==='>'+FIX.title,'cards ticked, lesson next: '+pl.join('|'));
  ok(/Bugünkü dersi başlat/.test(await p.textContent('#btnGo')),'Başla label now "Bugünkü dersi başlat"');
  await click(p,'#btnGo');await p.waitForSelector('#lsn:not([hidden])');await p.waitForTimeout(150);
  ok(await p.evaluate(()=>document.documentElement.classList.contains('lsn-on'))&&(await cur(p))==='Anlat','lesson opens full screen at Anlat');
  ok((await p.textContent('#lsnT'))===FIX.title&&/Ders/.test(await p.textContent('#lsnEye')),'title + eyebrow');
  ok(await p.isDisabled('#lpath [data-step="2"]'),'later steps locked until previous done');
  ok(/Türkçede ek, İtalyancada fiil/.test(await stage(p))&&await p.$$eval('#lstage .blk.v',e=>e.length)===2,'Anlat card 1: compare block with highlighted blocks');
  await p.screenshot({path:path.join(SHOTS,'lesson_anlat_390.png')});
  // Koça sor: bağlam (adım + ekrandaki metin)
  await click(p,'#askFab');ok(await p.isVisible('#ask')&&/Anlat · kart 1\/3/.test(await p.textContent('#askCtx')),'Koça sor panel shows context "Anlat · kart 1/3"');
  await p.fill('#askIn','sono ile io sono farkı ne?');await click(p,'#askSend');await p.waitForFunction(()=>/Kısa ipucu/.test(document.querySelector('#askLog').textContent),null,{timeout:4000});
  const s0=st.sys[st.sys.length-1];ok(/KOÇA SOR/.test(s0)&&/it05/.test(s0)&&/Öğrenci şu an: Anlat · kart 1\/3/.test(s0)&&/Türkçede ek, İtalyancada fiil/.test(s0)&&/Yoklama \(Yokla\) sorularının cevabını ASLA verme/.test(s0),'Koça sor request: lesson id + step + visible card text + never-give-quiz-answers rule');
  ok(st.reqs[st.reqs.length-1].messages.slice(-1)[0].content==='sono ile io sono farkı ne?','question sent as user turn');
  await click(p,'#askX');ok(await p.isHidden('#ask')&&await p.isVisible('#askFab'),'Koça sor closes, button back');
  ok(await p.evaluate(()=>!!document.querySelector('.lsnSticky #askFab')),'Koça sor docked in the compact lesson header (no floating button over content)');
  await click(p,'[data-act=aNext]');ok(/Altı kişi, altı biçim/.test(await stage(p)),'Anlat card 2');
  const tb=await p.evaluate(()=>{const c=document.querySelector('#lstage .lrcs'),t=document.querySelector('#lstage .ltbl');return {cards:getComputedStyle(c).display,tbl:getComputedStyle(t).display,say:c.querySelectorAll('.say').length,n:c.querySelectorAll('.lrc').length,lsn:document.querySelector('#lsn').scrollWidth<=innerWidth,wide:[...c.querySelectorAll('.lrc')].every(x=>x.scrollWidth<=x.clientWidth+1)};});
  ok(tb.cards==='grid'&&tb.tbl==='none'&&tb.n===7&&tb.say===7&&tb.lsn&&tb.wide,'390: table rendered as stacked cards (7 rows, speaker each), no sideways scroll '+JSON.stringify(tb));
  await p.screenshot({path:path.join(SHOTS10,'lesson_table_390.png')});
  await p.click('#lstage .lrc:nth-child(5) .say');await p.waitForTimeout(150);
  let sp=await p.evaluate(()=>__tts.spoken.slice(-1)[0]);ok(sp&&sp.text==='noi siamo'&&sp.lang==='it-IT'&&sp.voice==='g-it','table speaker reads say[] text in Italian voice: '+JSON.stringify(sp));
  await click(p,'[data-act=aNext]');ok(/Üç kullanım kuralı/.test(await stage(p))&&await p.$$eval('#lstage .rules li',e=>e.length)===3,'Anlat card 3: rules');
  await click(p,'[data-act=aNext]');ok((await cur(p))==='Dinle'&&await p.$$eval('#lpath button.done',e=>e.length)===1,'Anlatım bitti → Dinle, Anlat ticked');
  // Dinle
  await p.evaluate(()=>{__tts.spoken=[];});await click(p,'[data-act=playAll]');await p.waitForTimeout(700);
  sp=await p.evaluate(()=>__tts.spoken.map(x=>x.text));ok(sp.length===8&&sp[0]==='Io sono Türab.','play all reads 8 lines in order');
  await p.evaluate(()=>{__tts.spoken=[];});await click(p,'[data-act=slow]');await p.waitForTimeout(100);
  const r=await p.evaluate(()=>__tts.spoken[0]&&__tts.spoken[0].rate);ok(r>0&&r<0.8,'slow mode lower rate ('+r+')');
  await click(p,'[data-act=finish][data-i="1"]');ok((await cur(p))==='Uygula','→ Uygula');
  // ilerleme kalıcı: çık + yeniden aç
  await click(p,'#lsnX');ok(await p.isHidden('#lsn')&&await p.isVisible('#hero'),'Çık → back to Bugün');
  ok(/Derse devam et/.test(await p.textContent('#btnGo')),'hero offers "Derse devam et"');
  let ls=(await store(p,'lessons')).it05;ok(ls&&ls.step===2&&ls.done[0]&&ls.done[1]&&!ls.done[2],'progress persisted in db lessons/it05: '+JSON.stringify(ls&&{step:ls.step,done:ls.done}));
  await p.reload();await p.waitForTimeout(700);await click(p,'#btnGo');await p.waitForSelector('#lsn:not([hidden])');ok((await cur(p))==='Uygula','after reload: resumes at Uygula');
  // Uygula: yanlış + açıklama + Koça neden
  ok(/Alıştırma 1 \/ 6/.test(await stage(p)),'Uygula 1/6');
  await click(p,'#lstage .opt[data-ans="sei"]');let fb=await p.textContent('#fb_p');
  ok(/Doğrusu: sono/.test(fb)&&/sei, tu \(sen\) içindir/.test(fb)&&await p.$eval('.opt[data-ans="sei"]',e=>e.classList.contains('wrong'))&&await p.$eval('.opt[data-ans="sono"]',e=>e.classList.contains('right')),'wrong choice: correct answer + per-option explanation, colors');
  await p.screenshot({path:path.join(SHOTS,'lesson_uygula_wrong_390.png')});
  await click(p,'[data-act=askWhy]');ok(/neden yanlış/.test(await p.inputValue('#askIn'))&&/io ___ Türab/.test(await p.inputValue('#askIn')),'"Koça neden diye sor" prefills question with the item');
  await click(p,'#askSend');await p.waitForTimeout(400);const s1=st.sys[st.sys.length-1];ok(/Uygula · alıştırma 1/.test(s1)&&/io ___ Türab|io\s+Türab/.test(s1),'ask-why request carries Uygula step + item text');
  await click(p,'#askX');
  await click(p,'[data-act=next][data-kind=p]');await click(p,'#lstage .opt[data-ans="sei"]');ok(/Doğru\./.test(await p.textContent('#fb_p')),'right choice');
  await click(p,'[data-act=next][data-kind=p]');await click(p,'#lstage .opt[data-ans="e"]');ok(/aksanlı è/.test(await p.textContent('#fb_p')),'accent explanation for e vs è');
  await click(p,'[data-act=next][data-kind=p]');await p.fill('#ans_p','Sono elettricista.');await click(p,'[data-form=p] button');ok(/Doğru\./.test(await p.textContent('#fb_p')),'type: punctuation/case-insensitive');
  await click(p,'[data-act=next][data-kind=p]');await p.fill('#ans_p','il cantiere e grande');await click(p,'[data-form=p] button');fb=await p.textContent('#fb_p');
  ok(/Doğru sayıldı/.test(fb)&&/è aksanlı/.test(fb),'soft (no accent) accepted with note: '+fb.trim().slice(0,80));
  await click(p,'[data-act=next][data-kind=p]');ok(await p.$$eval('#lstage .oPool .oW',e=>e.length)===4,'order item: 4 word chips');
  for(const w of ['noi','pronti']){await p.click(`#lstage .oPool .oW:text-is("${w}")`);}
  await p.click('#oBuilt .oW:text-is("pronti")');ok((await p.$$eval('#oBuilt .oW',e=>e.map(x=>x.textContent))).join(' ')==='noi','tap placed word removes it');
  for(const w of ['non','siamo','pronti']){await p.click(`#lstage .oPool .oW:text-is("${w}")`);}
  await click(p,'[data-act=oCheck]');ok(/Doğru\./.test(await p.textContent('#fb_p')),'order: correct sentence');
  await click(p,'[data-act=next][data-kind=p]');ok(/4 \/ 6/.test(await stage(p)),'Uygula result 4/6 (2 wrong)');
  await click(p,'[data-act=finish][data-i="2"]');ok((await cur(p))==='Konuş'&&/Chiara ile konuş/.test(await stage(p)),'→ Konuş step with Chiara');
  // Konuş: kısa görüşme (taklit SR) → adım tamam
  await click(p,'[data-act=call]');await p.waitForSelector('#kc:not([hidden])');await p.waitForFunction(()=>__sr.cur&&__sr.cur._on,null,{timeout:5000});
  const ks=st.sys.filter(x=>/KONUŞMA MODU/.test(x)).pop();ok(/essere ile kendini tanıtmak/.test(ks)&&/io sono, tu sei/.test(ks),'lesson Konuş uses lesson goal + structures in speaking prompt');
  await p.evaluate(()=>{__sr.cur._result('Sì, sono Türab.',true);});await p.waitForTimeout(1500);
  await click(p,'#kcEnd');await p.waitForSelector('#kcSum',{timeout:5000});await click(p,'#kcClose');
  ok(await p.isHidden('#kc')&&/Konuşma tamam/.test(await stage(p))&&await p.$eval('#lpath [data-step="3"]',e=>e.classList.contains('done')),'call summary closed → Konuş step done');
  await click(p,'[data-act=finish][data-i="3"]');ok((await cur(p))==='Yokla','→ Yokla');
  // Yokla: kal (2 yanlış)
  await click(p,'#askFab');await p.fill('#askIn','cevap ne?');await click(p,'#askSend');await p.waitForTimeout(400);
  ok(/ŞU AN YOKLAMA AÇIK: cevabı söyleme/.test(st.sys[st.sys.length-1]),'Koça sor during Yokla: explicit no-answer rule');await click(p,'#askX');
  const yk=async ans=>{for(const a of ans){if(a.t==='type'){await p.fill('#ans_q',a.v);await click(p,'[data-form=q] button');}else await click(p,`#lstage .opt[data-ans="${a.v}"]`);
    ok(await p.isHidden('[data-act=askWhy]'),'no "Koça neden" in Yokla');await click(p,'[data-act=next][data-kind=q]');}};
  await yk([{v:'Siete pronti.'},{v:'è'},{v:'sono'},{t:'type',v:'lei non è italiana'},{v:'Kırıkkaleliyim.'}]);
  let y=await stage(p);ok(/Henüz değil/.test(y)&&/3 \/ 5/.test(y)&&/noi siamo/.test(y)&&/è \/ e farkı/.test(y)&&!/sono = -im/.test(y),'Yokla fail 3/5: shows topics to review');
  ls=(await store(p,'lessons')).it05;ok(ls&&!ls.passed&&ls.attempts===1&&ls.last===3,'fail recorded (attempts 1, last 3)');
  ok(!(await store(p,'topics')).it05,'topic not marked on fail');
  await click(p,'[data-act=redoQ]');
  await yk([{v:'Siamo pronti.'},{v:'e'},{v:'sono'},{t:'type',v:'Lei non e italiana'},{v:'Kırıkkaleliyim.'}]);await p.waitForTimeout(300);
  y=await stage(p);ok(/Ders tamam/.test(y)&&/5 \/ 5/.test(y),'Yokla pass 5/5 (soft accent counts)');
  ok(/8 kelime kartlara eklendi/.test(y)&&/Dikkat edeceğin konular/.test(y)&&/noi siamo/.test(y)&&/\d+ dk/.test(y),'pass screen = summary: minutes, words added to cards, topics to watch');
  ok(await p.isVisible('[data-act=planNext]')&&/Sıradaki: Oliver ile konuş/.test(await p.textContent('[data-act=planNext]')),'pass screen primary: "Sıradaki: Oliver ile konuş →"');
  await p.screenshot({path:path.join(SHOTS10,'pass_summary_390.png')});
  {const cs=Object.values(await store(p,'cards'));ok(cs.filter(c=>c.src==='lesson:it05').length===8&&cs.some(c=>c.f==='Sono di Kırıkkale.'&&c.tr==='Kırıkkaleliyim.'&&c.due==='2026-10-15'),'lesson lines added as cards (due tomorrow, duplicates skipped)');
   const se=(await store(p,'sessions'))['lesson-2026-10-14-it05'];ok(se&&se.mistakes.some(m=>/noi siamo/.test(m)),'Yokla miss topics fed into mistakes list: '+JSON.stringify(se&&se.mistakes));}
  ls=(await store(p,'lessons')).it05;ok(ls.passed&&ls.passedAt==='2026-10-14'&&ls.attempts===2&&ls.best===5,'lesson passed recorded '+JSON.stringify({p:ls.passed,at:ls.passedAt,a:ls.attempts}));
  ok(((await store(p,'topics')).it05||{}).status==='done','topic it05 marked done (topics collection)');
  const ss=await store(p,'sessions');const lsess=ss['lesson-2026-10-14-it05'];
  ok(lsess&&lsess.lang==='it'&&lsess.total>=1&&lsess.mins.gramer>=1&&lsess.mins.gramer+lsess.mins.okuma===lsess.total&&lsess.topic==='it05'&&lsess.src==='lesson','session saved with real minutes (gramer/okuma) '+JSON.stringify(lsess&&lsess.mins));
  ok(Object.values(ss).some(s=>s.src==='konus'&&s.lang==='it'&&s.mins.sesli>=1),'lesson Konuş call saved as IT "sesli" minutes');
  await click(p,'[data-act=close]');pl=await plan(p);ok(pl.join('|')==='+Kart tekrarı|+'+FIX.title+'|>Oliver ile konuş','plan ticks: cards + lesson done, Oliver next: '+pl.join('|'));
  ok(/Oliver ile konuş/.test(await p.textContent('#btnGo')),'Başla now → Oliver');
  ok(await p.evaluate(()=>TYDIL.ders.state&&[...TYDIL.ders.state.fin].includes('it-gramer')),'Ders modu blocks marked finished (it-gramer) so hero/plan agree');
  // Benim derslerim
  await click(p,'[data-tab=units]');ok(await p.isVisible('#myLessons')&&/Benim derslerim/.test(await p.textContent('#myLessons'))&&/Geçti/.test(await p.textContent('#myLessons [data-lesson=it05]')),'Dersler: "Benim derslerim" lists lesson with status Geçti');
  ok(await p.isVisible('#tyUnitsMount'),'legacy units still mounted below');
  // Pekiştir (ikinci açılış)
  await click(p,'#myLessons [data-lesson=it05]');await p.waitForSelector('#lsn:not([hidden])');
  ok(/Pekiştir/.test(await p.textContent('#lsnEye'))&&/Pekiştir 1 \/ 6/.test(await stage(p)),'second open of passed lesson → Pekiştir mode (6 items)');
  await click(p,'#lstage .opt[data-ans="siete"]');await click(p,'[data-act=next][data-kind=k]');
  await click(p,'#lstage .opt[data-ans="è"]');await click(p,'[data-act=next][data-kind=k]');
  await p.fill('#ans_k','Non sono stanco');await click(p,'[data-form=k] button');await click(p,'[data-act=next][data-kind=k]');
  await p.fill('#ans_k','sei turco?');await click(p,'[data-form=k] button');await click(p,'[data-act=next][data-kind=k]');
  for(const w of ['loro','sono','qui'])await p.click(`#lstage .oPool .oW:text-is("${w}")`);await click(p,'[data-act=oCheck]');await click(p,'[data-act=next][data-kind=k]');
  await click(p,'#lstage .opt[data-ans="Biz buradayız."]');await click(p,'[data-act=next][data-kind=k]');
  ok(/6 \/ 6/.test(await stage(p)),'Pekiştir questions 6/6');await click(p,'[data-act=pkTalk]');ok(/Kısa konuşma/.test(await stage(p))&&/ekibini tanıt/.test(await stage(p)),'Pekiştir short Konuş with konus_prompt');
  await click(p,'[data-act=pkDone]');ok(await p.isHidden('#lsn')&&((await store(p,'lessons')).it05||{}).pk==='2026-10-14','Pekiştir done recorded (pk date)');
  await ctx.close();}

 // B) Ertesi gün: plan Pekiştir'i önerir (ders dün geçildi)
 {const {p,ctx}=await mk({at:THU,seed:Object.assign({},SEED,{cards:{},topics:Object.assign({},SEED.topics,{it05:{status:'done',updated:'2026-10-14T10:00:00Z'}}),lessons:{it05:{step:4,done:[true,true,true,true,true],passed:true,passedAt:'2026-10-14',best:5}}})});
  const pl=await plan(p);ok(pl[0]==='>Pekiştir: '+FIX.title&&pl[1]==='-Oliver ile konuş','day 2 plan: Pekiştir then Oliver: '+pl.join('|'));
  ok(/Başla · Pekiştir/.test(await p.textContent('#btnGo')),'Başla · Pekiştir');
  await click(p,'#btnGo');await p.waitForSelector('#lsn:not([hidden])');ok(/Pekiştir/.test(await p.textContent('#lsnEye')),'Başla opens Pekiştir');
  await ctx.close();}

 // C) Sadece İngilizce / Sadece İtalyanca planları; içerik yoksa eski Ders modu
 {const {p,ctx}=await mk({seed:Object.assign({},SEED,{cards:{}})});
  await p.click('[data-mode=it]');await p.waitForTimeout(200);let pl=await plan(p);ok(pl.join('|')==='>'+FIX.title+'|-Chiara ile konuş','Sadece İtalyanca: lesson → Chiara Konuş: '+pl.join('|'));
  await p.click('[data-mode=en]');await p.waitForTimeout(200);ok(await p.isHidden('#dayPlan'),'Sadece İngilizce without EN content → legacy Ders modu (no content plan)');
  await ctx.close();}
 {const {p,ctx}=await mk({seed:Object.assign({},SEED,{cards:{}}),fixture:false,handler});await p.route('**/content/**',r=>r.fulfill({status:404,body:'nf'}));await p.reload();await p.waitForTimeout(600);
  ok(await p.isHidden('#dayPlan')&&/Bugünkü dersi başlat/.test(await p.textContent('#btnGo'))&&await p.isHidden('#myLessons'),'no content → plan hidden, Başla = legacy Ders modu, no Benim derslerim');
  await ctx.close();}

 // D) İçerik dosyaları: her ders şema + bütün adımlar
 {const idx=JSON.parse(fs.readFileSync(path.join(H.ROOT,'content/index.json'),'utf8'));const bad=[];
  const {p,ctx}=await mk({fixture:false,vp:{width:820,height:1180}});
  for(const m of idx){const id=m.id;const d=JSON.parse(fs.readFileSync(path.join(H.ROOT,'content',id+'.json'),'utf8'));const e0=errs.length;
    const v=await p.evaluate(async([id,d])=>{const M=await new Promise(r=>{const t=setInterval(()=>{if(window.TYDIL&&TYDIL.core&&TYDIL.core.LX.index){clearInterval(t);r(1);}},50);});
      await (async()=>{if(!window.TYLESSON){const s=document.createElement('script');s.src='mod/lesson.js';document.head.appendChild(s);await new Promise(r=>s.onload=r);}})();return TYLESSON.validate(d);},[id,d]);
    if(v){bad.push(id+': '+v);continue;}
    await p.evaluate(id=>TYLESSON.open(id,{}),id);await p.waitForSelector('#lsn:not([hidden])');await p.waitForTimeout(100);
    let guard=0;while(guard++<10){const has=await p.$('[data-act=aNext]');if(!has)break;await p.click('[data-act=aNext]');await p.waitForTimeout(30);}
    await p.click('[data-act=finish][data-i="1"]');
    const answerAll=async(kind,items)=>{for(const it of items){if(it.t==='choice')await p.click(`#lstage .opt[data-ans="${it.a.replace(/"/g,'\\"')}"]`);
        else if(it.t==='type'){await p.fill('#ans_'+kind,(Array.isArray(it.a)?it.a[0]:it.a));await p.click(`[data-form=${kind}] button`);}
        else{const words=await p.$$eval('#lstage .oPool .oW',e=>e.map(x=>x.textContent));const used=new Set();for(const w of String(Array.isArray(it.a)?it.a[0]:it.a).split(' ')){const i=words.findIndex((x,j)=>!used.has(j)&&x.toLowerCase()===w.toLowerCase());if(i<0)break;used.add(i);await p.click(`#lstage .oPool .oW[data-ow="${i}"]`);}await p.click('[data-act=oCheck]');}
        const f=await p.textContent('#fb_'+kind);if(!/Doğru/.test(f))bad.push(id+' '+kind+': correct answer not accepted → "'+it.q+'" ('+f.trim().slice(0,60)+')');
        await p.click(`[data-act=next][data-kind=${kind}]`);await p.waitForTimeout(20);}};
    await answerAll('p',d.uygula);await p.click('[data-act=finish][data-i="2"]');await p.click('[data-act=finish][data-i="3"]');await answerAll('q',d.yokla);await p.waitForTimeout(150);
    if(!/Ders tamam/.test(await stage(p)))bad.push(id+': yokla with all-correct answers did not pass');
    if(id==='it05')await p.screenshot({path:path.join(SHOTS,'lesson_content_it05_820.png')});
    await p.click('[data-act=close]');await p.waitForTimeout(100);
    if(d.pekistir){await p.evaluate(id=>TYLESSON.open(id,{pk:true}),id);await p.waitForSelector('#lsn:not([hidden])');await answerAll('k',d.pekistir.items);await p.click('[data-act=pkTalk]');await p.click('[data-act=pkDone]');}
    if(errs.length>e0)bad.push(id+': page errors '+errs.slice(e0).join(' | '));}
  ok(!bad.length,'content files ('+idx.map(x=>x.id).join(',')+'): schema valid, every step renders, correct answers accepted, yokla passes, pekiştir runs'+(bad.length?' — FAIL: '+bad.join(' ; '):''));
  await ctx.close();}


 // F) Sonraki dersi olan dizin: geçilen ders tiklenir, Oliver sıradadır; plan bitince "Bir ders daha" isteğe bağlı
 {const IT06=JSON.parse(fs.readFileSync(path.join(H.ROOT,'content/it06.json'),'utf8'));
  const route=async p=>{await p.route('**/content/index.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify([{id:'it05',lang:'it',level:'A1',title:FIX.title,minutes:30},{id:'it06',lang:'it',level:'A1',title:IT06.title,minutes:30}])}));
    await p.route('**/content/it06.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(IT06)}));};
  const base=Object.assign({},SEED,{cards:{},topics:Object.assign({},SEED.topics,{it05:{status:'done',updated:'2026-10-14T10:00:00Z'}}),lessons:{it05:{step:4,done:[true,true,true,true,true],passed:true,passedAt:'2026-10-14',best:5}}});
  const {p,ctx}=await mk({seed:base,fixture:true,pre:route});
  let pl=await plan(p);ok(pl.join('|')==='+'+FIX.title+'|>Oliver ile konuş','after passing today: passed lesson ticked, Oliver next (next lesson it06 NOT offered as todays): '+pl.join('|'));
  ok(/Oliver ile konuş/.test(await p.textContent('#btnGo'))&&!/Bugünkü dersi başlat/.test(await p.textContent('#btnGo')),'Başla → Oliver');
  await p.evaluate(()=>rtImport(Object.assign(rtExport(),{collections:Object.assign(rtExport().collections,{sessions:{'konus-2026-10-14-en':{date:'2026-10-14',lang:'en',mins:{speaking:12},total:12,src:'konus'}}})})));await p.reload();await p.waitForTimeout(700);
  pl=await plan(p);const ex=await p.textContent('#dayPlan li.extra').catch(()=>'');
  ok(pl.join('|')==='+'+FIX.title+'|+Oliver ile konuş'&&/Bir ders daha: /.test(ex)&&ex.includes(IT06.title),'day plan done; next lesson only as optional "Bir ders daha" '+pl.join('|')+' / '+ex);
  const h=await p.evaluate(()=>({k:document.querySelector('#heroKicker').textContent,t:document.querySelector('#heroTitle').textContent,s:document.querySelector('#heroSub').textContent,m:document.querySelector('#meter').textContent,go:document.querySelector('#btnGo').textContent,more:document.querySelector('#todayTitle').textContent==='Bugünün adımları'&&!/Gramer/.test(document.querySelector('#plan').textContent),seg:document.querySelectorAll('#meter .segbar i').length,segDone:document.querySelectorAll('#meter .segbar i.done').length}));
  ok(/Bugünün planı tamam/.test(h.k)&&h.t==='Bugün tamam.'&&/2 \/ 2 adım/.test(h.m)&&/12 dk/.test(h.m)&&h.seg===2&&h.segDone===2,'hero consistent with plan: "Bugün tamam", meter 2/2 adım from plan steps '+JSON.stringify(h));
  ok(/Seriye saymak için bugün 18 dk daha/.test(h.s),'streak text honest (12 dk < 30): '+h.s);
  ok(/Bir ders daha/.test(h.go)&&h.more,'Başla offers optional next lesson; Detaylar shows the day-plan steps (old 5 blocks replaced)');
  await p.screenshot({path:path.join(SHOTS10,'today_390.png')});
  await ctx.close();}
 // G) Kart döngüsü yok: İtalyanca bitince İngilizceye geçer; bitince "Sıradaki" planı sürdürür
 {const {p,ctx}=await mk({seed:Object.assign({},SEED,{cards:{c1:SEED.cards.c1,c2:{lang:'en',f:'to sort out',tr:'halletmek',box:2,due:'2026-10-12',added:'2026-10-01T10:00:00Z'}}})});
  ok(/2 kart/.test(await p.textContent('#dayPlan li')),'plan counts IT+EN due cards');
  await click(p,'#btnGo');ok(await p.isVisible('#review .fcard.it'),'Başla → Kartlar (Italian first)');
  await click(p,'#cShow');await click(p,'#cYes');await p.waitForTimeout(150);
  ok(await p.isVisible('#review .fcard.en'),'Italian done → auto-switched to English (still due)');
  await click(p,'#cShow');await click(p,'#cYes');await p.waitForTimeout(200);
  const t=await p.textContent('#review');ok(/Bugünlük tekrar bitti/.test(t)&&await p.isVisible('#review [data-plan-next]')&&/Sıradaki: /.test(await p.textContent('#review [data-plan-next]')),'done state: primary "Sıradaki: <step>" button');
  await p.screenshot({path:path.join(SHOTS10,'cards_done_390.png')});
  await click(p,'#review [data-plan-next]');await p.waitForSelector('#lsn:not([hidden])',{timeout:4000});ok((await p.textContent('#lsnT'))===FIX.title,'Sıradaki → continues day plan (lesson opens)');
  await ctx.close();}
 // H) Pazar: haftanın Pekiştir'i (iki dersin soruları) + Konuş
 {const IT06=JSON.parse(fs.readFileSync(path.join(H.ROOT,'content/it06.json'),'utf8'));
  const route=async p=>{await p.route('**/content/index.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify([{id:'it05',lang:'it',title:FIX.title},{id:'it06',lang:'it',title:IT06.title}])}));await p.route('**/content/it06.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(IT06)}));};
  const L={it05:{passed:true,passedAt:'2026-10-14',done:[true,true,true,true,true],step:4},it06:{passed:true,passedAt:'2026-10-16',done:[true,true,true,true,true],step:4}};
  const {p,ctx}=await mk({at:AT(2026,10,18,9),seed:Object.assign({},SEED,{cards:{},lessons:L}),pre:route});
  const pl=await plan(p);ok(pl[0]===">Haftanın Pekiştir'i"&&pl[pl.length-1]==='-Oliver ile konuş','Sunday: content plan (week Pekiştir + Konuş): '+pl.join('|'));
  await click(p,'#btnGo');await p.waitForSelector('#lsn:not([hidden])');ok(/Haftanın Pekiştir/.test(await p.textContent('#lsnT'))&&/Pekiştir 1 \/ 8/.test(await stage(p)),'week Pekiştir mixes both lessons (4+4 items)');
  await ctx.close();}
 // I) İlk kurulum: tek ekran → Başla içerikli dersi açar (eski sohbet modu değil); 1. haftada "geride" yok
 {const {p,ctx}=await mk({fixture:false});
  ok(await p.isVisible('#onb')&&await p.isVisible('#btnProgStart')&&(await p.$$('.onbStep')).length===1&&await p.getAttribute('#onbModeSeg [data-mode=both]','aria-checked')==='true','onboarding: ONE screen, İkisi preselected, Başla');
  ok(/Başlangıç: bugün/.test(await p.textContent('#onb')),'start date = today (changeable)');
  await p.screenshot({path:path.join(SHOTS10,'onboarding_390.png')});
  await click(p,'#btnProgStart');await p.waitForSelector('#lsn:not([hidden])',{timeout:6000}).catch(()=>{});
  ok(await p.isVisible('#lsn')&&await p.isHidden('#ders')&&/Okunuş ve sesler/.test(await p.textContent('#lsnT')),'setup Başla → lesson engine (it01), not the old chat Ders modu');
  await click(p,'#lsnX');ok(!/geride/i.test(await p.textContent('#weekStrip')),'week 1 day 1: no "geride" warning ('+(await p.textContent('#weekStrip')).trim()+')');
  await ctx.close();}
 // J) Koça sor: **kalın** ve [[it: …]] güvenli çizilir, hoparlör düğmesi
 {const h2=(req,st)=>/KOÇA SOR/.test(req.system)?{sse:[{text:'Kısa ipucu: **ce/ci** yumuşar → ç. Örnek: [[it: cena]] = ÇE-na. <img src=x onerror=alert(1)>'}]}:handler(req,st);
  const {p,ctx}=await mk({seed:Object.assign({},SEED,{cards:{}}),handler:h2});await click(p,'#btnGo');await p.waitForSelector('#lsn:not([hidden])');
  await click(p,'#askFab');await p.fill('#askIn','ci nasıl okunur?');await click(p,'#askSend');await p.waitForFunction(()=>/ipucu/.test(document.querySelector('#askLog').textContent),null,{timeout:4000});
  const r=await p.evaluate(()=>{const m=[...document.querySelectorAll('#askLog .m.c')].pop();return {txt:m.textContent,b:!!m.querySelector('b'),say:m.querySelectorAll('.say').length,img:!!m.querySelector('img')};});
  ok(r.b&&r.say===1&&!/\*\*|\[\[/.test(r.txt)&&!r.img,'Koça sor bubble: bold + [[it:]] with speaker, no raw markers, HTML escaped '+JSON.stringify(r));
  const ov=await p.evaluate(()=>{const a=document.querySelector('#ask').getBoundingClientRect();return a.right<=innerWidth&&a.bottom<=innerHeight;});ok(ov,'390: Koça sor panel inside viewport');
  await p.screenshot({path:path.join(SHOTS10,'kocasor_390.png')});
  await p.click('#askLog .m.c .say');await p.waitForTimeout(150);ok(await p.evaluate(()=>__tts.spoken.slice(-1)[0].text==='cena'),'speaker reads the Italian example');
  await ctx.close();}
 // E) Koça sor 820 ekran görüntüsü
 {const {p,ctx}=await mk({seed:SEED,vp:{width:820,height:1180}});
  await click(p,'[data-tab=units]');await p.click('#myLessons [data-lesson=it05]');await p.waitForSelector('#lsn:not([hidden])');
  await click(p,'[data-act=aNext]');await click(p,'#askFab');await p.fill('#askIn','Lei ile lei farkı ne?');await click(p,'#askSend');await p.waitForTimeout(500);
  const ab=await p.evaluate(()=>{const a=document.querySelector('#ask').getBoundingClientRect();return {r:a.right<=innerWidth,b:a.bottom<=innerHeight,w:a.width};});ok(ab.r&&ab.b&&ab.w<=420,'820: Koça sor panel inside viewport, ≤420 px '+JSON.stringify(ab));
  await p.screenshot({path:path.join(SHOTS,'lesson_kocasor_820.png')});await ctx.close();}

 ok(!errs.length,'no page errors / dialogs '+errs.slice(0,4).join(' | '));
 await b.close();srv.close();console.log('errors',JSON.stringify(errs.slice(0,6)));console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
