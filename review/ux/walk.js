/* UX review walkthrough: journeys at 375/1280, light/dark; metrics (tap targets, h-scroll, truncation, load time, console errors).
   NODE_PATH=$(npm root -g) node review/ux/walk.js */
const H=require('../../tests/_h.js');const {sleep,AT}=H;const fs=require('fs');const path=require('path');
const OUT=path.join(__dirname,'shots');fs.mkdirSync(OUT,{recursive:true});
const THU=AT(2026,10,8,9);
const PROG={program:{main:{start:'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}}};
const MOCK=fs.readFileSync(path.join(__dirname,'../../tests/voice_test.js'),'utf8').match(/const MOCK=`([\s\S]*?)`;/)[1];
const notes=[];const note=(k,m)=>{notes.push('['+k+'] '+m);console.log('['+k+'] '+m);};
(async()=>{const srv=await H.serve();const b=await H.browser();
 const open=async(o)=>{o=o||{};const st={};const errs=[];
   const ctx=await b.newContext({viewport:o.w===1280?{width:1280,height:800}:{width:375,height:812},timezoneId:'Europe/Istanbul',colorScheme:o.dark?'dark':'light',hasTouch:o.w!==1280,isMobile:o.w!==1280,deviceScaleFactor:1});
   const p=await ctx.newPage();p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.type()+' '+d.message());d.dismiss();});
   await p.addInitScript(H.clockScript(THU));await p.addInitScript(MOCK);
   if(o.key)await p.addInitScript(k=>{try{localStorage.setItem('tydil.apiKey',k);}catch(e){}},'sk-ant-test');
   if(o.ls)await p.addInitScript(ls=>{try{for(const k in ls)localStorage.setItem(k,ls[k]);}catch(e){}},o.ls);
   await H.mockApi(p,st,o.handler);await p.route('https://inputtools.google.com/**',r=>r.abort('failed'));
   const t0=Date.now();await p.goto(srv.base+'/index.html'+(o.q||''));const nav=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd),size:n.transferSize};});
   if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
   await p.waitForTimeout(500);return {p,ctx,st,errs,nav,tag:(o.w||375)+'_'+(o.dark?'dark':'light')};};
 const shot=(p,n,full)=>p.screenshot({path:path.join(OUT,n+'.png'),fullPage:!!full});
 const metrics=async(p,label)=>{const r=await p.evaluate(()=>{
   const hs=document.documentElement.scrollWidth>innerWidth;
   const vis=e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return false;const s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none';};
   const small=[...document.querySelectorAll('button,a,[role=button],input[type=checkbox],input[type=radio],select,summary')].filter(vis).map(e=>{const r=e.getBoundingClientRect();return {t:(e.textContent||e.getAttribute('aria-label')||e.id||e.className).trim().slice(0,30),w:Math.round(r.width),h:Math.round(r.height),sel:e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+[...e.classList].join('.')};}).filter(x=>x.w<44||x.h<44);
   const trunc=[...document.querySelectorAll('*')].filter(vis).filter(e=>{const s=getComputedStyle(e);return (s.overflow==='hidden'||s.overflowX==='hidden')&&s.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1;}).map(e=>(e.id?'#'+e.id:e.className)+': '+(e.textContent||'').trim().slice(0,40));
   const overflow=[...document.querySelectorAll('*')].filter(vis).filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&getComputedStyle(e).position!=='fixed';}).slice(0,5).map(e=>(e.id?'#'+e.id:e.tagName+'.'+e.className));
   const fs=[...document.querySelectorAll('p,span,li,button,td,small,label')].filter(vis).filter(e=>e.children.length===0&&(e.textContent||'').trim().length>3).map(e=>parseFloat(getComputedStyle(e).fontSize)).filter(x=>x<12);
   return {hs,small,trunc,overflow,tiny:fs.length};});
   if(r.hs)note(label,'H-SCROLL');if(r.small.length)note(label,'small targets: '+JSON.stringify(r.small));if(r.trunc.length)note(label,'truncation: '+JSON.stringify(r.trunc));if(r.overflow.length)note(label,'overflow right: '+JSON.stringify(r.overflow));if(r.tiny)note(label,'text <12px count: '+r.tiny);return r;};
 const contrast=async(p,label)=>{const r=await p.evaluate(()=>{
   const L=c=>{const m=c.match(/\d+(\.\d+)?/g)||[0,0,0];const [r,g,b]=m.slice(0,3).map(x=>{x=x/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b;};
   const bg=e=>{while(e&&e!==document.documentElement){const c=getComputedStyle(e).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;e=e.parentElement;}return getComputedStyle(document.body).backgroundColor;};
   const out=[];[...document.querySelectorAll('p,span,small,button,a,h1,h2,h3,li,td,label,b,i,em,div')].forEach(e=>{if(e.children.length)return;const t=(e.textContent||'').trim();if(t.length<2)return;const r=e.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>innerHeight)return;const s=getComputedStyle(e);if(s.visibility==='hidden')return;const fg=s.color,bgc=bg(e);const l1=L(fg),l2=L(bgc);const cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);const big=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&+s.fontWeight>=700);if(cr<(big?3:4.5))out.push({t:t.slice(0,30),cr:+cr.toFixed(2),fg,bg:bgc,fs:s.fontSize,sel:e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+[...e.classList].join('.')});});return out.slice(0,12);});
   if(r.length)note(label,'contrast<4.5: '+JSON.stringify(r));return r;};

 for(const w of [375,1280])for(const dark of [false,true]){
  // (1) first open no key
  {const {p,ctx,errs,nav,tag}=await open({w,dark});note(tag,'load dcl='+nav.dcl+'ms load='+nav.load+'ms size='+nav.size);
   await shot(p,'1_nokey_learn_'+tag);await shot(p,'1_nokey_learn_full_'+tag,true);await metrics(p,tag+' nokey learn');await contrast(p,tag+' nokey learn');
   const txt=await p.evaluate(()=>document.querySelector('#tab-learn').innerText);fs.writeFileSync(path.join(OUT,'1_nokey_learn_'+tag+'.txt'),txt);
   await p.click('[data-tab=units]');await p.waitForTimeout(300);await shot(p,'1_nokey_units_'+tag);await metrics(p,tag+' nokey units');await contrast(p,tag+' nokey units');
   await p.click('[data-tab=practice]');await p.waitForTimeout(300);await shot(p,'1_nokey_practice_'+tag,true);await metrics(p,tag+' nokey practice');
   await p.click('[data-tab=setup]');await p.waitForTimeout(300);await shot(p,'1_nokey_setup_'+tag,true);await metrics(p,tag+' nokey setup');await contrast(p,tag+' nokey setup');
   if(errs.length)note(tag,'ERRORS nokey: '+errs.join(' | '));await ctx.close();}
  // (2) key → onboarding → ders modu → hands-free
  {const {p,ctx,errs,tag,st}=await open({w,dark,key:true});
   await shot(p,'2_onb_'+tag,true);await metrics(p,tag+' onb');await contrast(p,tag+' onb');
   const onbTxt=await p.evaluate(()=>document.querySelector('#onb').innerText);fs.writeFileSync(path.join(OUT,'2_onb_'+tag+'.txt'),onbTxt);
   await p.click('[data-onb="2"]');await p.waitForTimeout(150);await shot(p,'2_onb2_'+tag,true);await metrics(p,tag+' onb2');
   await p.click('.onbStep[data-step="2"] [data-onb="3"]');await p.waitForTimeout(150);await shot(p,'2_onb3_'+tag,true);
   await p.click('#btnProgStart');await p.waitForTimeout(500);await shot(p,'2_hub_'+tag,true);await metrics(p,tag+' hub');await contrast(p,tag+' hub');
   const hub=await p.evaluate(()=>document.querySelector('#tab-learn').innerText);fs.writeFileSync(path.join(OUT,'2_hub_'+tag+'.txt'),hub);
   note(tag,'after Başla: ders open='+await p.isVisible('#ders'));if(await p.isHidden('#ders')){await p.click('#btnGo');}await p.waitForTimeout(1200);await shot(p,'2_ders_'+tag);await metrics(p,tag+' ders');await contrast(p,tag+' ders');
   const dtxt=await p.evaluate(()=>document.querySelector('#ders').innerText);fs.writeFileSync(path.join(OUT,'2_ders_'+tag+'.txt'),dtxt);
   // hands-free
   const hv=await p.$('#dersHands');if(hv&&await hv.isVisible()){await hv.click();await p.waitForTimeout(400);await shot(p,'2_ders_hands_'+tag);await metrics(p,tag+' ders hands');
     const vs=await p.evaluate(()=>TYDIL.voice.state.state);note(tag,'hands-free state after toggle: '+vs);
     await p.evaluate(()=>{const r=__sr.cur;if(r){r._result('il cavo',false);r._result('il cavo',true);r._end();}});await p.waitForTimeout(800);await shot(p,'2_ders_hands_sent_'+tag);
     await p.keyboard.press('Escape');await p.waitForTimeout(300);note(tag,'Esc in hands-free: ders hidden='+await p.isHidden('#ders')+' voice='+await p.evaluate(()=>TYDIL.voice.state.state));}
   if(await p.isHidden('#ders')){await shot(p,'2_after_esc_'+tag);await p.click('#btnGo');await p.waitForTimeout(500);}
   await p.click('#dersMode');await p.waitForTimeout(200);await shot(p,'2_ders_menu_'+tag);await metrics(p,tag+' ders menu');await p.keyboard.press('Escape');await p.waitForTimeout(200);note(tag,'Esc with menu open: menu hidden='+await p.isHidden('#dersModeM')+' ders hidden='+await p.isHidden('#ders'));
   // complete blocks via dblclick on next
   for(let i=0;i<6;i++){const nx=await p.$('#dersNext');if(!nx||await nx.isHidden())break;await nx.dblclick();await p.waitForTimeout(700);const tr=await p.$('#dersTrans');if(tr&&!(await tr.isHidden())){await shot(p,'2_ders_trans_'+tag);try{await p.click('#dersTrans button',{timeout:2000});}catch(e){} await p.waitForTimeout(600);}}
   await p.waitForTimeout(500);await shot(p,'2_ders_done_'+tag,true);await metrics(p,tag+' ders done');await contrast(p,tag+' ders done');
   const done=await p.evaluate(()=>document.querySelector('#ders').innerText);fs.writeFileSync(path.join(OUT,'2_ders_done_'+tag+'.txt'),done);
   const back=await p.$('#dersBack');if(back)await back.click();await p.waitForTimeout(400);await shot(p,'2_hub_done_'+tag,true);
   if(errs.length)note(tag,'ERRORS journey2: '+errs.join(' | '));await ctx.close();}
  // (3) Pratik free chat
  {const {p,ctx,errs,tag}=await open({w,dark,key:true,seed:PROG});
   await p.click('[data-tab=practice]');await p.waitForTimeout(400);await shot(p,'3_practice_'+tag,true);await metrics(p,tag+' practice');await contrast(p,tag+' practice');
   await p.click('[data-agent=en]');await p.waitForTimeout(300);await p.fill('#ccIn','Hello, I run a crew of 12 people.');await p.click('#ccSend');await p.waitForTimeout(1200);await shot(p,'3_practice_chat_'+tag);await metrics(p,tag+' practice chat');
   await p.click('[data-agent=db]');await p.waitForTimeout(300);await p.fill('#ccIn','since ve for farkı?');await p.keyboard.press('Enter');await p.waitForTimeout(1200);await shot(p,'3_practice_selin_'+tag);
   const ptxt=await p.evaluate(()=>document.querySelector('#tab-practice').innerText);fs.writeFileSync(path.join(OUT,'3_practice_'+tag+'.txt'),ptxt);
   if(errs.length)note(tag,'ERRORS journey3: '+errs.join(' | '));await ctx.close();}
  // (4) Dersler
  {const {p,ctx,errs,tag}=await open({w,dark,key:true,seed:PROG});
   await p.click('[data-tab=units]');await p.waitForTimeout(400);await shot(p,'4_units_home_'+tag,true);await metrics(p,tag+' units home');await contrast(p,tag+' units home');
   const utxt=await p.evaluate(()=>document.querySelector('#tab-units').innerText);fs.writeFileSync(path.join(OUT,'4_units_home_'+tag+'.txt'),utxt);
   await p.click('.u-ucard[data-uid="it1-1"]');await p.waitForTimeout(400);await shot(p,'4_unit_ezberle_'+tag,true);await metrics(p,tag+' ezberle');await contrast(p,tag+' ezberle');
   fs.writeFileSync(path.join(OUT,'4_unit_ezberle_'+tag+'.txt'),await p.evaluate(()=>document.querySelector('#tab-units').innerText));
   await p.click('[data-act=step][data-k=flash]');await p.waitForTimeout(300);await shot(p,'4_unit_flash_'+tag);await metrics(p,tag+' flash');
   const fc=await p.$('.u-flash, .u-card, [data-act=flip]');if(fc){await fc.click();await p.waitForTimeout(300);await shot(p,'4_unit_flash_flipped_'+tag);}
   const steps=await p.$$eval('.u-step',e=>e.map(x=>x.dataset.k||x.textContent.trim()));note(tag,'steps: '+steps.join(','));
   await p.click('[data-act=step][data-k=pron]').catch(async()=>{const s=await p.$$('.u-step');if(s[2])await s[2].click();});await p.waitForTimeout(300);await shot(p,'4_unit_pron_'+tag,true);await metrics(p,tag+' pron');await contrast(p,tag+' pron');
   fs.writeFileSync(path.join(OUT,'4_unit_pron_'+tag+'.txt'),await p.evaluate(()=>document.querySelector('#tab-units').innerText));
   await p.click('[data-act=step][data-k=quiz]').catch(async()=>{const s=await p.$$('.u-step');if(s[3])await s[3].click();});await p.waitForTimeout(300);await shot(p,'4_unit_quiz_'+tag,true);await metrics(p,tag+' quiz');await contrast(p,tag+' quiz');
   fs.writeFileSync(path.join(OUT,'4_unit_quiz_'+tag+'.txt'),await p.evaluate(()=>document.querySelector('#tab-units').innerText));
   // answer all correct
   for(let i=0;i<14;i++){const q=await p.evaluate(()=>{const c=TYDIL.units.ctx;if(!c.questions)return null;const q=c.questions[c.qIndex];return {i:q.options.indexOf(q.answer),n:c.questions.length,k:c.qIndex};});if(!q)break;await p.click(`#uOpts .u-opt[data-i="${q.i}"]`);await p.waitForTimeout(60);if(i===0)await shot(p,'4_unit_quiz_answered_'+tag);await p.click('[data-act=nextQuiz]');await p.waitForTimeout(80);if(q.k>=q.n-1)break;}
   await p.waitForTimeout(300);await shot(p,'4_unit_quiz_result_'+tag,true);await metrics(p,tag+' quiz result');await contrast(p,tag+' quiz result');
   fs.writeFileSync(path.join(OUT,'4_unit_quiz_result_'+tag+'.txt'),await p.evaluate(()=>document.querySelector('#tab-units').innerText));
   // grammar unit
   await p.goto(srv.base+'/index.html#dersler/it');await p.waitForTimeout(400);
   const g=await p.$$eval('.u-ucard',e=>e.map(x=>({uid:x.dataset.uid,t:x.textContent.trim().slice(0,50)})));note(tag,'it units: '+JSON.stringify(g.slice(0,6)));
   const gu=await p.$('.u-ucard[data-uid="it1-2"]');if(gu){await gu.click();await p.waitForTimeout(400);await shot(p,'4_unit_grammar_'+tag,true);await metrics(p,tag+' grammar');await contrast(p,tag+' grammar');fs.writeFileSync(path.join(OUT,'4_unit_grammar_'+tag+'.txt'),await p.evaluate(()=>document.querySelector('#tab-units').innerText));}
   // notes
   const nb=await p.$('[data-act=notes], [data-act=note], .u-notes');if(nb){await nb.click();await p.waitForTimeout(300);await shot(p,'4_notes_'+tag,true);await metrics(p,tag+' notes');}
   // back behaviour
   await p.goBack();await p.waitForTimeout(300);note(tag,'goBack from unit → hash '+await p.evaluate(()=>location.hash)+' tab visible units='+await p.isVisible('#tab-units'));
   await p.goBack();await p.waitForTimeout(300);note(tag,'goBack again → hash '+await p.evaluate(()=>location.hash)+' learn visible='+await p.isVisible('#tab-learn'));
   if(errs.length)note(tag,'ERRORS journey4: '+errs.join(' | '));await ctx.close();}
  // (5) Ayarlar
  {const {p,ctx,errs,tag}=await open({w,dark,key:true,seed:PROG});
   await p.click('[data-tab=setup]');await p.waitForTimeout(300);await shot(p,'5_setup_'+tag,true);await metrics(p,tag+' setup');await contrast(p,tag+' setup');
   fs.writeFileSync(path.join(OUT,'5_setup_'+tag+'.txt'),await p.evaluate(()=>document.querySelector('#tab-setup').innerText));
   await p.click('#bkRestore summary');await p.click('#advMore summary');await p.waitForTimeout(200);await shot(p,'5_setup_open_'+tag,true);await metrics(p,tag+' setup open');
   await p.click('#btnBkCopy');await p.waitForTimeout(300);await shot(p,'5_setup_copy_'+tag);
   if(errs.length)note(tag,'ERRORS journey5: '+errs.join(' | '));await ctx.close();}
  // (6) progress
  {const {p,ctx,errs,tag}=await open({w,dark,key:true,seed:PROG});
   await p.click('[data-tab=progress]');await p.waitForTimeout(300);await shot(p,'6_progress_'+tag,true);await metrics(p,tag+' progress');await contrast(p,tag+' progress');
   await p.click('#statMore summary');await p.click('#roadMore summary');await p.waitForTimeout(200);await shot(p,'6_progress_open_'+tag,true);await metrics(p,tag+' progress open');await contrast(p,tag+' progress open');
   if(errs.length)note(tag,'ERRORS journey6: '+errs.join(' | '));await ctx.close();}
 }
 // (6b) Esc/back behaviours at 375 light
 {const {p,ctx,errs}=await open({w:375,key:true,seed:PROG});
  await p.click('[data-tab=practice]');await p.waitForTimeout(200);note('back','after tab click hash='+await p.evaluate(()=>location.hash)+' history.length='+await p.evaluate(()=>history.length));
  await p.goBack();await p.waitForTimeout(300);note('back','goBack after tab switch: url='+await p.evaluate(()=>location.href)+' practice visible='+await p.isVisible('#tab-practice'));
  await p.goto(srv.base+'/index.html');await p.waitForTimeout(400);await p.click('#btnGo');await p.waitForTimeout(800);note('back','ders open hash='+await p.evaluate(()=>location.hash));
  await p.goBack();await p.waitForTimeout(400);note('back','goBack in Ders modu: ders hidden='+await p.isHidden('#ders')+' url='+await p.evaluate(()=>location.href));
  if(!(await p.isHidden('#ders'))){await p.keyboard.press('Escape');await p.waitForTimeout(300);}
  await p.click('[data-tab=units]');await p.waitForTimeout(300);await p.click('.u-ucard[data-uid="it1-1"]');await p.waitForTimeout(300);await p.keyboard.press('Escape');await p.waitForTimeout(300);note('back','Esc in unit: hash='+await p.evaluate(()=>location.hash));
  const bb=await p.$$eval('button',e=>e.filter(x=>x.offsetParent&&/geri|←|Geri/i.test(x.textContent)).map(x=>x.textContent.trim()));note('back','back buttons visible in unit: '+JSON.stringify(bb));
  if(errs.length)note('back','ERRORS: '+errs.join(' | '));await ctx.close();}
 // (7) mother path: big text in Dersler
 {const {p,ctx}=await open({w:375,key:false});
  await p.click('[data-tab=units]');await p.waitForTimeout(300);
  const big=await p.$$eval('button',e=>e.filter(x=>x.offsetParent&&/yazı|boyut|A\+|büyük/i.test(x.textContent+x.getAttribute('aria-label'))).map(x=>x.textContent.trim()+'|'+x.getAttribute('aria-label')));note('mother','text-size controls on units home: '+JSON.stringify(big));
  await p.click('.u-ucard[data-uid="it1-1"]');await p.waitForTimeout(300);
  const big2=await p.$$eval('button',e=>e.filter(x=>x.offsetParent&&/yazı|boyut|A\+|büyük/i.test(x.textContent+x.getAttribute('aria-label'))).map(x=>x.textContent.trim()+'|'+x.getAttribute('aria-label')));note('mother','text-size controls in unit: '+JSON.stringify(big2));
  const fsz=await p.evaluate(()=>[...document.querySelectorAll('#tab-units p, #tab-units li, #tab-units .u-word, #tab-units button')].filter(e=>e.offsetParent).map(e=>parseFloat(getComputedStyle(e).fontSize)));note('mother','unit font sizes min/max: '+Math.min(...fsz)+'/'+Math.max(...fsz));
  await ctx.close();}
 fs.writeFileSync(path.join(__dirname,'notes.txt'),notes.join('\n'));
 await b.close();srv.close();console.log('DONE');})().catch(e=>{console.error(e);process.exit(1);});
