/* Sınav motoru + gün planı delikleri: cp1 giriş → sorular → sonuç (geçti/kaldı, yanlışlar konu gruplarında, "Dersi aç"), exams/checkpoint-w04 kaydı (en yüksek puan kalır);
   4. hafta Pazarı sınav adımı; 10. hafta tekrar günü Pekiştir (eski "Chiara ile ders" yok); 12. hafta "Final'e hazırlık"; program bitince it21; sınavlar Benim derslerim / "Bir ders daha"da yok.
   NODE_PATH=$(npm root -g) node tests/exam_test.js */
const H=require('./_h.js');const {ok,AT}=H;const fs=require('fs');const path=require('path');
const MOCK=fs.readFileSync(path.join(__dirname,'voice_test.js'),'utf8').match(/const MOCK=`([\s\S]*?)`;/)[1];
const J=id=>JSON.parse(fs.readFileSync(path.join(H.ROOT,'content',id+'.json'),'utf8'));
const CP1=J('cp1'), IDX=JSON.parse(fs.readFileSync(path.join(H.ROOT,'content/index.json'),'utf8')), TITLE=id=>IDX.find(m=>m.id===id).title;
const PROG=start=>({main:{start,weeks:12,dailyMin:60,mode:'yogun'}});
const done=ids=>Object.fromEntries(ids.map(id=>[id,{status:'done',updated:'2026-09-01T10:00:00Z'}]));
const passed=(ids,at,pk)=>Object.fromEntries(ids.map(id=>[id,{step:4,done:[true,true,true,true,true],passed:true,passedAt:at,best:5,pk:pk||'',updated:at+'T10:00:00Z'}]));
const IT=n=>Array.from({length:n},(_,i)=>'it'+String(i+1).padStart(2,'0'));
const SHOTS=path.join(H.ROOT,'review/shots_v12');fs.mkdirSync(SHOTS,{recursive:true});
function handler(req,st){if(/KONUŞMA MODU|SPEAKING MODE/.test(req.system))return {sse:[{text:'Ciao!'}]};return {sse:[{text:'Tamam.'}]};}
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const mk=async(o)=>{o=o||{};const st={content:true};const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Istanbul',serviceWorkers:'block',colorScheme:'light',reducedMotion:'reduce'});const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   await p.addInitScript(H.clockScript(o.at||AT(2026,10,14,9)));await p.addInitScript(MOCK);await p.addInitScript(()=>{localStorage.setItem('tydil.apiKey','sk-ant-test');localStorage.setItem('tydil-tip-pin','1');});
   await H.mockApi(p,st,handler);await p.goto(srv.base+'/index.html');
   if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
   await p.waitForTimeout(800);return {p,ctx,st};};
 const store=(p,c)=>p.evaluate(c=>rtExport().collections[c]||{},c);
 const plan=p=>p.$$eval('#dayPlan li:not(.extra)',e=>e.map(x=>(x.classList.contains('done')?'+':x.classList.contains('next')?'>':'-')+x.querySelector('b').textContent));
 const stage=p=>p.evaluate(()=>document.querySelector('#lstage').innerText);
 const click=async(p,sel)=>{await p.click(sel);await p.waitForTimeout(60);};
 /* Sınavı cevapla: ilk `wrong` choice sorusu yanlış, gerisi doğru */
 const answer=async(p,d,wrong)=>{let w=wrong||0;for(const it of d.items){
     if(it.t==='choice'){const v=w>0?it.o.find(o=>o!==it.a):it.a;if(w>0)w--;await click(p,`#lstage .opt[data-ans="${v.replace(/"/g,'\\"')}"]`);}
     else if(it.t==='type'){await p.fill('#ans_x',Array.isArray(it.a)?it.a[0]:it.a);await click(p,'[data-form=x] button');}
     else{const words=await p.$$eval('#lstage .oPool .oW',e=>e.map(x=>x.textContent));const used=new Set();for(const x of String(Array.isArray(it.a)?it.a[0]:it.a).split(' ')){const i=words.findIndex((y,j)=>!used.has(j)&&y.toLowerCase()===x.toLowerCase());if(i<0)break;used.add(i);await p.click(`#lstage .oPool .oW[data-ow="${i}"]`);}await click(p,'[data-act=oCheck]');}
     await click(p,'[data-act=next][data-kind=x]');}
   await p.waitForTimeout(250);};

 // A) cp1: giriş → hepsi doğru → geçti + exams/checkpoint-w04 · sonra 7 yanlış → kaldı, konu grupları, en yüksek puan kalır, "Dersi aç"
 {const {p,ctx}=await mk({seed:{program:PROG('2026-09-28')}});
  await p.evaluate(async()=>{const s=document.createElement('script');s.src='mod/lesson.js';document.head.appendChild(s);await new Promise(r=>s.onload=r);await TYLESSON.open('cp1',{});});
  await p.waitForSelector('#lsn:not([hidden])');await p.waitForTimeout(150);
  const intro=await stage(p);
  ok(/Sınav/.test(await p.textContent('#lsnEye'))&&(await p.textContent('#lsnT'))===CP1.title,'exam opens: eyebrow "Sınav", title');
  ok(/Soru\s*20/.test(intro)&&/Geçme\s*14 doğru/.test(intro)&&/Süre\s*20 dk/.test(intro)&&await p.isVisible('[data-act=exStart]'),'intro: soru sayısı, geçme eşiği, süre, Başla: '+intro.replace(/\n/g,' ').slice(0,120));
  ok(await p.isHidden('#askFab')&&await p.isHidden('#lpath')&&await p.isVisible('#lsnLead'),'intro: Koça sor hidden, step path (Anlat/Dinle…) hidden, lead shown');
  await p.screenshot({path:path.join(SHOTS,'exam_intro_390.png')});
  await click(p,'[data-act=exStart]');ok(/Soru 1 \/ 20/.test(await stage(p))&&await p.isHidden('#askFab'),'questions: progress "Soru 1 / 20", Koça sor hidden');
  await answer(p,CP1,0);let r=await stage(p);
  ok(/geçti/.test(r)&&/20 \/ 20/.test(r)&&/%100/.test(r)&&!/Yanlışlar/.test(r),'all correct → 20/20, %100, geçti, no wrong list');
  let ex=(await store(p,'exams'))['checkpoint-w04'];
  ok(ex&&ex.hafta===4&&ex.tur==='checkpoint'&&ex.puan===20&&ex.toplam===20&&ex.tarih==='2026-10-14'&&ex.deneme===1&&typeof ex.notlar==='string','exams/checkpoint-w04 written in sinav_kaydet format '+JSON.stringify(ex));
  let ls=(await store(p,'lessons')).cp1;ok(ls&&ls.best===20&&ls.attempts===1&&ls.passed===true&&ls.passedAt==='2026-10-14','lessons/cp1: best, attempts, passed, passedAt '+JSON.stringify(ls&&{b:ls.best,a:ls.attempts,p:ls.passed,at:ls.passedAt}));
  await click(p,'[data-act=exRedo]');await answer(p,CP1,7);r=await stage(p);
  const wrong=CP1.items.filter(i=>i.t==='choice').slice(0,7), topics=[...new Set(wrong.map(i=>i.topic))];
  ok(/kaldı/.test(r)&&!/geçti/.test(r)&&/13 \/ 20/.test(r)&&/%65/.test(r)&&/en az 14 doğru/.test(r),'7 wrong → 13/20, %65, kaldı');
  const g=await p.$$eval('#lstage .xgrp',e=>e.map(x=>({t:x.querySelector('.xgh b').textContent,n:x.querySelectorAll('li').length,btn:(x.querySelector('[data-act=exLesson]')||{}).textContent||'',id:(x.querySelector('[data-act=exLesson]')||{dataset:{}}).dataset.id})));
  ok(g.length===topics.length&&g.every(x=>topics.includes(x.t))&&g.reduce((a,x)=>a+x.n,0)===7,'wrong answers grouped by topic ('+g.length+' groups, 7 items)');
  ok(g.every(x=>/Dersi aç · /.test(x.btn)&&x.btn.includes(TITLE(wrong.find(i=>i.topic===x.t).from))),'each group: "Dersi aç · <lesson title>" from item.from');
  ok(/Senin cevabın:/.test(r)&&/Doğrusu:/.test(r)&&r.includes(wrong[0].why[wrong[0].o.find(o=>o!==wrong[0].a)]),'wrong item: your answer, correct answer, why');
  ok(await p.isVisible('[data-act=exRedo]')&&await p.isVisible('#lstage [data-act=close]'),'"Tekrar dene" + "Kapat" buttons');
  await p.screenshot({path:path.join(SHOTS,'exam_result_390.png'),fullPage:false});
  ex=(await store(p,'exams'))['checkpoint-w04'];ok(ex.puan===20&&ex.deneme===2,'retake with lower score: best score kept (20), deneme 2 '+JSON.stringify({p:ex.puan,d:ex.deneme}));
  ls=(await store(p,'lessons')).cp1;ok(ls.best===20&&ls.last===13&&ls.attempts===2&&ls.passed,'lessons/cp1 after retake: best 20, last 13, attempts 2');
  const first=g[0];await click(p,`#lstage [data-act=exLesson][data-id="${first.id}"]`);await p.waitForTimeout(250);
  ok((await p.textContent('#lsnT'))===TITLE(first.id)&&/Ders/.test(await p.textContent('#lsnEye'))&&await p.isVisible('#lpath')&&await p.isVisible('#askFab'),'"Dersi aç" opens the lesson ('+first.id+') with step path + Koça sor back');
  await click(p,'#lsnX');
  await H.tab(p,'progress');await p.waitForTimeout(150);ok(/20 \/ 20/.test(await p.textContent('#exams')),'İlerleme → Sınavlar card shows cp1 result');
  await ctx.close();}

 // B) 4. haftanın Pazarı: kartlar yok → sınav adımı → Konuş; Başla sınavı açar; sınavdan sonra adım tiklenir
 {const {p,ctx}=await mk({at:AT(2026,10,25,9),seed:{program:PROG('2026-09-28'),topics:done(IT(8)),lessons:passed(IT(8),'2026-10-20','2026-10-21')}});
  let pl=await plan(p);ok(pl[0]==='>'+CP1.title&&pl[pl.length-1]==='-Oliver ile konuş'&&!pl.some(x=>/Chiara ile ders|Haftanın Pekiştir/.test(x)),'Sunday week 4: exam step then Konuş: '+pl.join('|'));
  ok(/20 soru · geçme 14/.test(await p.textContent('#dayPlan li'))&&/Başla · sınav/.test(await p.textContent('#btnGo')),'exam step subtitle "20 soru · geçme 14", Başla · sınav');
  await p.screenshot({path:path.join(SHOTS,'sunday_exam_390.png')});
  await click(p,'#btnGo');await p.waitForSelector('#lsn:not([hidden])');await p.waitForTimeout(150);
  ok((await p.textContent('#lsnT'))===CP1.title&&await p.isVisible('[data-act=exStart]'),'Başla opens the exam intro');
  await click(p,'[data-act=exStart]');await answer(p,CP1,2);ok(/18 \/ 20/.test(await stage(p))&&/geçti/.test(await stage(p)),'exam passed 18/20');
  ok(/Sıradaki: Oliver ile konuş/.test(await p.textContent('#lstage')),'result offers next plan step (Oliver)');
  await click(p,'#lstage [data-act=close]');pl=await plan(p);ok(pl[0]==='+'+CP1.title&&pl[1]==='>Oliver ile konuş','after exam: step ticked, Oliver next: '+pl.join('|'));
  await ctx.close();}

 // C) 10. hafta tekrar günü (Pzt, set it01–it04): Pekiştir adımı, eski "Chiara ile ders" yok · 12. hafta: "Final'e hazırlık"
 {const {p,ctx}=await mk({at:AT(2026,11,30,9),seed:{program:PROG('2026-09-28'),topics:done(IT(19)),lessons:passed(IT(19),'2026-11-20','2026-11-21')}});
  const pl=await plan(p), s=await p.textContent('#dayPlan li');
  ok(pl[0]==='>Tekrar günü: Pekiştir'&&pl[pl.length-1]==='-Oliver ile konuş'&&!pl.some(x=>/Chiara ile ders|İtalyanca ·/.test(x)),'week 10 review day: pkweek + Konuş, no legacy step: '+pl.join('|'));
  ok(['it01','it02','it03','it04'].every(id=>s.includes(TITLE(id)))&&!/Final/.test(s),'pkweek lists the day set (it01–it04) titles');
  await click(p,'#btnGo');await p.waitForSelector('#lsn:not([hidden])');ok(/Pekiştir/.test(await p.textContent('#lsnEye'))&&/Pekiştir 1 \//.test(await stage(p)),'Başla opens Pekiştir (week mode)');
  await ctx.close();}
 {const {p,ctx}=await mk({at:AT(2026,12,15,9),seed:{program:PROG('2026-09-28'),topics:done(IT(20)),lessons:passed(IT(20),'2026-11-20','2026-11-21')}});
  const pl=await plan(p), s=await p.textContent('#dayPlan li');ok(pl[0]==='>Tekrar günü: Pekiştir'&&/Final'e hazırlık/.test(s),'week 12 review day (final not done): "Final\'e hazırlık" '+s);
  await ctx.close();}

 // D) Program bitmiş (start 14 hafta önce), it01–it20 geçilmiş: plan it21'i gösterir
 {const {p,ctx}=await mk({seed:{program:PROG('2026-07-06'),topics:done(IT(20)),lessons:passed(IT(20),'2026-09-01','2026-09-02')}});
  const pl=await plan(p);ok(pl[0]==='>'+TITLE('it21')&&pl[pl.length-1]==='-Oliver ile konuş'&&!pl.some(x=>/Chiara ile ders/.test(x)),'program finished: next lesson it21 + Konuş: '+pl.join('|'));
  await ctx.close();}

 // E) Sınavlar Benim derslerim'de yok; "Bir ders daha" sınav önermez (cp1 bugün geçilmiş olsa da)
 {const L=Object.assign(passed(['it01'],'2026-10-14'),{cp1:{passed:true,passedAt:'2026-10-14',best:20,attempts:1,updated:'2026-10-14T12:00:00Z'}});
  const {p,ctx}=await mk({seed:{lessons:L,sessions:{'konus-2026-10-14-en':{date:'2026-10-14',lang:'en',mins:{speaking:12},total:12,src:'konus'}}}});
  const pl=await plan(p), extra=await p.textContent('#dayPlan li.extra').catch(()=>'');
  ok(pl[0]==='+'+TITLE('it01')&&!pl.some(x=>x.includes('Checkpoint')),'passedToday ignores exams: today\'s lesson = it01 '+pl.join('|'));
  ok(extra.includes(TITLE('it02'))&&!/Checkpoint|Final/.test(extra)&&!/Checkpoint|Final/.test(await p.textContent('#btnGo')),'"Bir ders daha" = it02, never an exam: '+extra);
  await click(p,'[data-tab=units]');const mine=await p.$$eval('#myLessons [data-lesson]',e=>e.map(x=>x.dataset.lesson));
  ok(mine.length>30&&!mine.some(id=>['cp1','cp2','final'].includes(id)),'Benim derslerim: '+mine.length+' lessons, no exams');
  await ctx.close();}

 ok(!errs.length,'no page errors / dialogs '+errs.slice(0,4).join(' | '));
 await b.close();srv.close();console.log('errors',JSON.stringify(errs.slice(0,6)));console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
