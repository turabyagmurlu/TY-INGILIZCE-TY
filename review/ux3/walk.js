/* UX3 final acceptance walk: first-week journey. NODE_PATH=$(npm root -g) node review/ux3/walk.js */
const H=require('../../tests/_h.js');const fs=require('fs');const path=require('path');
const OUT=path.join(__dirname,'shots');fs.mkdirSync(OUT,{recursive:true});
const DAY1=H.AT(2026,10,8,9), DAY2=H.AT(2026,10,9,9);
const MOCK=fs.readFileSync(path.join(__dirname,'../../tests/voice_test.js'),'utf8').match(/const MOCK=`([\s\S]*?)`;/)[1];
const KEY='sk-ant-api03-'+'A'.repeat(80);
const notes=[];const note=(k,m)=>{notes.push('['+k+'] '+m);console.log('['+k+'] '+m);};
const txt=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return e?e.innerText:'(none)';},sel);
const save=(n,t)=>fs.writeFileSync(path.join(OUT,n+'.txt'),t);
(async()=>{const srv=await H.serve();const b=await H.browser();
 const newPage=async(ctx,st,at,errs)=>{const p=await ctx.newPage();p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.message());d.dismiss();});
   await p.addInitScript(H.clockScript(at));await p.addInitScript(MOCK);await H.mockApi(p,st);await p.route('https://inputtools.google.com/**',r=>r.abort('failed'));return p;};
 const mkctx=(w,dark)=>b.newContext({viewport:w===1280?{width:1280,height:800}:{width:375,height:812},timezoneId:'Europe/Istanbul',colorScheme:dark?'dark':'light',hasTouch:w!==1280,isMobile:w!==1280,deviceScaleFactor:1});
 const shot=(p,n,full)=>p.screenshot({path:path.join(OUT,n+'.png'),fullPage:!!full});
 const metrics=async(p,label)=>{const r=await p.evaluate(()=>{
   const hs=document.documentElement.scrollWidth>innerWidth;
   const vis=e=>{const r=e.getBoundingClientRect();if(!r.width||!r.height)return false;const s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none';};
   const small=[...document.querySelectorAll('button,a,[role=button],input[type=checkbox],input[type=radio],select,summary')].filter(vis).map(e=>{const r=e.getBoundingClientRect();return {t:(e.textContent||e.getAttribute('aria-label')||e.id||e.className).trim().slice(0,30),w:Math.round(r.width),h:Math.round(r.height),sel:e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+[...e.classList].join('.')};}).filter(x=>x.w<40||x.h<40);
   const trunc=[...document.querySelectorAll('*')].filter(vis).filter(e=>{const s=getComputedStyle(e);return (s.overflow==='hidden'||s.overflowX==='hidden')&&s.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1;}).map(e=>(e.id?'#'+e.id:e.className)+': '+(e.textContent||'').trim().slice(0,40));
   const overflow=[...document.querySelectorAll('*')].filter(vis).filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&getComputedStyle(e).position!=='fixed';}).slice(0,5).map(e=>(e.id?'#'+e.id:e.tagName+'.'+e.className));
   const fs=[...document.querySelectorAll('p,span,li,button,td,small,label')].filter(vis).filter(e=>e.children.length===0&&(e.textContent||'').trim().length>3).map(e=>parseFloat(getComputedStyle(e).fontSize)).filter(x=>x<12);
   return {hs,small,trunc,overflow,tiny:fs.length};});
   if(r.hs)note(label,'H-SCROLL');if(r.small.length)note(label,'small targets(<40): '+JSON.stringify(r.small));if(r.trunc.length)note(label,'truncation: '+JSON.stringify(r.trunc));if(r.overflow.length)note(label,'overflow right: '+JSON.stringify(r.overflow));if(r.tiny)note(label,'text <12px count: '+r.tiny);return r;};
 const contrast=async(p,label)=>{const r=await p.evaluate(()=>{
   const L=c=>{const m=c.match(/\d+(\.\d+)?/g)||[0,0,0];const [r,g,b]=m.slice(0,3).map(x=>{x=x/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b;};
   const bg=e=>{while(e&&e!==document.documentElement){const c=getComputedStyle(e).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c;e=e.parentElement;}return getComputedStyle(document.body).backgroundColor;};
   const out=[];[...document.querySelectorAll('p,span,small,button,a,h1,h2,h3,li,td,label,b,i,em,div,dt,dd')].forEach(e=>{if(e.children.length)return;const t=(e.textContent||'').trim();if(t.length<2)return;const r=e.getBoundingClientRect();if(!r.width||!r.height)return;const s=getComputedStyle(e);if(s.visibility==='hidden'||s.opacity==='0')return;const fg=s.color,bgc=bg(e);if(/rgba\([^)]*, 0(\.\d+)?\)$/.test(bgc)&&!/, 1\)$/.test(bgc))return;const l1=L(fg),l2=L(bgc);const cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);const big=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&+s.fontWeight>=700);if(cr<(big?3:4.5))out.push({t:t.slice(0,30),cr:+cr.toFixed(2),fg,bg:bgc,fs:s.fontSize,sel:e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+[...e.classList].join('.')});});return out.slice(0,15);});
   if(r.length)note(label,'contrast<4.5: '+JSON.stringify(r));return r;};

 for(const [w,dark] of [[375,false],[375,true],[1280,false]]){
  const tag=w+'_'+(dark?'dark':'light');const ctx=await mkctx(w,dark);const st={};const errs=[];
  let p=await newPage(ctx,st,DAY1,errs);await p.goto(srv.base+'/index.html');await p.waitForTimeout(700);
  // A. first open, no key
  await shot(p,'A1_first_open_'+tag,true);await metrics(p,tag+' A1 first');await contrast(p,tag+' A1 first');save('A1_first_open_'+tag,await txt(p,'#tab-learn'));
  note(tag,'first open: onb visible='+await p.isVisible('#onb')+' hero visible='+await p.isVisible('#hero')+' units tab visible='+await p.isVisible('[data-tab=units]'));
  // walk onboarding without key
  if(await p.isVisible('#onb')){await p.click('[data-onb="2"]');await p.waitForTimeout(150);await shot(p,'A2_onb2_'+tag,true);await metrics(p,tag+' A2 onb2');
    await p.click('.onbStep[data-step="2"] [data-onb="3"]');await p.waitForTimeout(150);await shot(p,'A3_onb3_'+tag,true);save('A3_onb3_'+tag,await txt(p,'#onb'));
    await p.click('#btnProgStart');await p.waitForTimeout(900);}
  await shot(p,'A4_after_basla_nokey_'+tag,true);await metrics(p,tag+' A4 nokey after basla');await contrast(p,tag+' A4');save('A4_after_basla_nokey_'+tag,await txt(p,'#tab-learn'));
  note(tag,'after Başla (no key): ders open='+await p.isVisible('#ders')+' keyGate='+await p.isVisible('#keyGate')+' hash='+await p.evaluate(()=>location.hash)+' progStartMsg='+JSON.stringify(await txt(p,'#progStartMsg')));
  if(await p.isHidden('#keyGate')){await p.click('#btnGo');await p.waitForTimeout(600);await shot(p,'A5_btnGo_nokey_'+tag,true);note(tag,'btnGo no key: keyGate='+await p.isVisible('#keyGate')+' ders='+await p.isVisible('#ders'));}
  save('A5_keygate_'+tag,await txt(p,'#keyGate'));
  // B. go to key via gate CTA
  const kg=await p.$('#keyGate [data-go=key]');if(kg){await kg.click();await p.waitForTimeout(600);}else{await H.tab(p,'setup');await p.waitForTimeout(300);}
  await shot(p,'B1_settings_nokey_'+tag,true);await metrics(p,tag+' B1 settings nokey');await contrast(p,tag+' B1');save('B1_settings_nokey_'+tag,await txt(p,'#tab-setup'));
  note(tag,'settings scroll y='+await p.evaluate(()=>scrollY)+' apiKey focused='+await p.evaluate(()=>document.activeElement&&document.activeElement.id));
  await p.fill('#apiKey','sk-ant-abc');await p.click('#btnKeySave');await p.waitForTimeout(200);note(tag,'bad key msg: '+await txt(p,'#keyMsg'));
  await p.fill('#apiKey',KEY);await p.click('#btnKeySave');await p.waitForTimeout(400);await shot(p,'B2_key_saved_'+tag);note(tag,'key saved msg: '+await txt(p,'#keyMsg')+' | state: '+await txt(p,'#keyState')+' | tab now='+await p.evaluate(()=>[...document.querySelectorAll('.panel')].find(x=>!x.hidden).id));
  await p.click('#btnKeyTest');await p.waitForTimeout(800);note(tag,'test msg: '+await txt(p,'#keyMsg'));
  // back to learn
  await p.click('[data-tab=learn]');await p.waitForTimeout(500);await shot(p,'B3_learn_with_key_'+tag,true);await metrics(p,tag+' B3 learn key');await contrast(p,tag+' B3');save('B3_learn_with_key_'+tag,await txt(p,'#tab-learn'));
  note(tag,'learn with key: keyGate='+await p.isVisible('#keyGate')+' btnGo="'+await txt(p,'#btnGo')+'" hint="'+await txt(p,'#heroHint')+'"');
  // C. lesson
  await p.click('#btnGo');await p.waitForTimeout(1500);await shot(p,'C1_ders_'+tag);await metrics(p,tag+' C1 ders');await contrast(p,tag+' C1');save('C1_ders_'+tag,await txt(p,'#ders'));
  note(tag,'ders open='+await p.isVisible('#ders')+' mics visible='+await p.evaluate(()=>[...document.querySelectorAll('#ders button')].filter(b=>b.offsetParent&&/konuş|mikro/i.test((b.textContent||'')+(b.getAttribute('aria-label')||'')+(b.title||''))).map(b=>'#'+b.id+':'+(b.textContent.trim()||b.getAttribute('aria-label'))).join(', ')));
  const hv=await p.$('#dersHands');
  if(hv&&await hv.isVisible()){await hv.click();await p.waitForTimeout(500);await shot(p,'C2_ders_hands_on_'+tag);await metrics(p,tag+' C2 hands');save('C2_ders_hands_'+tag,await txt(p,'#ders'));
    note(tag,'hands on: state='+await p.evaluate(()=>JSON.stringify(TYDIL.voice.state))+' vcSt="'+await txt(p,'#vcSt')+'"');
    await p.evaluate(()=>{const r=__sr.cur;if(r){r._result('il cavo',false);r._result('il cavo',true);r._end();}});await p.waitForTimeout(900);await shot(p,'C3_ders_hands_sent_'+tag);
    await hv.click();await p.waitForTimeout(300);note(tag,'hands off: state='+await p.evaluate(()=>JSON.stringify(TYDIL.voice.state)));}
  else note(tag,'NO dersHands visible');
  // mic push to talk
  const mic=await p.$('#ccMic');if(mic&&await mic.isVisible()){await mic.click();await p.waitForTimeout(300);await shot(p,'C4_mic_listening_'+tag);note(tag,'mic tap: state='+await p.evaluate(()=>TYDIL.voice.state.state)+' placeholder="'+await p.evaluate(()=>document.querySelector('#ccIn').placeholder)+'"');
    await p.evaluate(()=>{const r=__sr.cur;if(r){r._result('la luce',true);r._end();}});await p.waitForTimeout(900);await shot(p,'C5_mic_sent_'+tag);note(tag,'after mic result: ccIn="'+await p.evaluate(()=>document.querySelector('#ccIn').value)+'" state='+await p.evaluate(()=>TYDIL.voice.state.state));}
  // exit & resume
  await p.click('#dersExit');await p.waitForTimeout(500);await shot(p,'C6_after_exit_'+tag,true);save('C6_after_exit_'+tag,await txt(p,'#tab-learn'));
  note(tag,'after exit: ders hidden='+await p.isHidden('#ders')+' btnGo="'+await txt(p,'#btnGo')+'" meter="'+await txt(p,'#meter')+'" hint="'+await txt(p,'#heroHint')+'"');
  await H.tab(p,'practice');await p.waitForTimeout(500);await shot(p,'C7_practice_mid_lesson_'+tag,true);await metrics(p,tag+' C7 practice');await contrast(p,tag+' C7');save('C7_practice_'+tag,await txt(p,'#tab-practice'));
  await p.click('[data-tab=learn]');await p.waitForTimeout(200);await p.click('#btnGo');await p.waitForTimeout(1200);await shot(p,'C8_resume_'+tag);save('C8_resume_'+tag,await txt(p,'#ders'));note(tag,'resume: note='+await p.evaluate(()=>TYDIL.ders.state.note));
  // language menu
  await p.click('#dersMode');await p.waitForTimeout(200);await shot(p,'C9_lang_menu_'+tag);await metrics(p,tag+' C9 menu');save('C9_lang_menu_'+tag,await txt(p,'#dersModeM'));await p.keyboard.press('Escape');await p.waitForTimeout(200);
  // pause
  await p.click('#dersPause');await p.waitForTimeout(200);await shot(p,'C10_paused_'+tag);await p.click('#dersPause');
  // complete blocks
  for(let i=0;i<6;i++){const nx=await p.$('#dersNext');if(!nx||await nx.isHidden())break;await nx.dblclick();await p.waitForTimeout(800);const tr=await p.$('#dersTrans');if(tr&&!(await tr.isHidden())){await shot(p,'C11_ders_trans_'+tag);save('C11_trans_'+tag,await txt(p,'#dersTrans'));try{await p.click('#dersTrans button',{timeout:2000});}catch(e){} await p.waitForTimeout(700);}}
  await p.waitForTimeout(600);await shot(p,'C12_done_'+tag,true);await metrics(p,tag+' C12 done');await contrast(p,tag+' C12');save('C12_done_'+tag,await txt(p,'#ders'));
  note(tag,'done phase='+await p.evaluate(()=>TYDIL.ders.state.phase)+' ccIn visible='+await p.isVisible('#ccIn')+' dersHands visible='+await p.isVisible('#dersHands'));
  const back=await p.$('#dersBack');if(back)await back.click();await p.waitForTimeout(500);await shot(p,'C13_hub_done_'+tag,true);save('C13_hub_done_'+tag,await txt(p,'#tab-learn'));await metrics(p,tag+' C13 hub done');
  note(tag,'hub done: btnGo="'+await txt(p,'#btnGo')+'" kicker="'+await txt(p,'#heroKicker')+'" title="'+await txt(p,'#heroTitle')+'" sub="'+await txt(p,'#heroSub')+'" tipPin='+await p.isVisible('#tipPin')+' streak="'+await txt(p,'#streakChip')+'"');
  await H.tab(p,'progress');await p.waitForTimeout(500);await shot(p,'C14_progress_'+tag,true);await metrics(p,tag+' C14 progress');await contrast(p,tag+' C14');save('C14_progress_'+tag,await txt(p,'#tab-progress'));
  if(errs.length)note(tag,'ERRORS day1: '+errs.join(' | '));
  // D. next day (same storage)
  await p.close();p=await newPage(ctx,st,DAY2,errs);await p.goto(srv.base+'/index.html');await p.waitForTimeout(800);
  await shot(p,'D1_day2_learn_'+tag,true);save('D1_day2_'+tag,await txt(p,'#tab-learn'));await metrics(p,tag+' D1 day2');await contrast(p,tag+' D1');
  note(tag,'day2: btnGo="'+await txt(p,'#btnGo')+'" title="'+await txt(p,'#heroTitle')+'" streak="'+await txt(p,'#streakChip')+'" week="'+await txt(p,'#weekStrip')+'" tabDue='+await txt(p,'#tabDue'));
  await p.click('#btnGo');await p.waitForTimeout(1500);await shot(p,'D2_day2_ders_'+tag);save('D2_day2_ders_'+tag,await txt(p,'#ders'));note(tag,'day2 ders open='+await p.isVisible('#ders')+' chat turns='+await p.evaluate(()=>TYDIL.chat.state.turns.length));
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  // E. Dersler (mother)
  await p.click('[data-tab=units]');await p.waitForTimeout(600);await shot(p,'E1_units_home_'+tag,true);await metrics(p,tag+' E1 units');await contrast(p,tag+' E1');save('E1_units_home_'+tag,await txt(p,'#tab-units'));
  const fsBtn=await p.$$eval('#tab-units button',e=>e.filter(x=>x.offsetParent&&/yazı|boyut|A\+|büyük|aa/i.test(x.textContent+' '+(x.getAttribute('aria-label')||'')+' '+(x.title||''))).map(x=>({t:x.textContent.trim(),a:x.getAttribute('aria-label'),id:x.id,cls:x.className})));note(tag,'font controls: '+JSON.stringify(fsBtn));
  const fb=await p.$('#tab-units [data-act=fsToggle]');
  if(fb){await fb.click();await p.waitForTimeout(200);await shot(p,'E2a_units_fs_panel_'+tag);await p.click('#tab-units [data-act=setFont][data-v="1.3"]');await p.waitForTimeout(300);await shot(p,'E2_units_bigfont_'+tag,true);await metrics(p,tag+' E2 bigfont');note(tag,'big font root fs='+await p.evaluate(()=>getComputedStyle(document.querySelector('#tyUnitsMount')).fontSize)+' body fs='+await p.evaluate(()=>getComputedStyle(document.documentElement).fontSize));}
  await p.click('.u-ucard[data-uid="it1-1"]');await p.waitForTimeout(500);await shot(p,'E3_unit_lesson_'+tag,true);await metrics(p,tag+' E3 unit');await contrast(p,tag+' E3');save('E3_unit_'+tag,await txt(p,'#tab-units'));
  note(tag,'unit: back controls='+JSON.stringify(await p.$$eval('#tab-units button',e=>e.filter(x=>x.offsetParent&&/geri|←|ana|üniteler|liste/i.test(x.textContent+(x.getAttribute('aria-label')||''))).map(x=>x.textContent.trim()||x.getAttribute('aria-label'))))+' steps='+JSON.stringify(await p.$$eval('.u-step',e=>e.map(x=>x.textContent.trim()))));
  const stepN=async n=>{const s=await p.$$('.u-step');if(s[n])await s[n].click();};const steps=[1,1,1,1];if(steps[1]){await stepN(1);await p.waitForTimeout(400);await shot(p,'E4_unit_flash_'+tag,true);await metrics(p,tag+' E4 flash');save('E4_flash_'+tag,await txt(p,'#tab-units'));
    const spk=await p.$$eval('#tab-units button',e=>e.filter(x=>x.offsetParent&&/dinle|oku|ses|🔊|telaffuz/i.test(x.textContent+(x.getAttribute('aria-label')||'')+(x.title||''))).map(x=>x.textContent.trim()||x.getAttribute('aria-label')));note(tag,'flash speak controls: '+JSON.stringify(spk));}
  if(steps[2]){await stepN(2);await p.waitForTimeout(400);await shot(p,'E5_unit_step3_'+tag,true);await metrics(p,tag+' E5');save('E5_step3_'+tag,await txt(p,'#tab-units'));}
  if(steps[3]){await stepN(3);await p.waitForTimeout(400);await shot(p,'E6_unit_quiz_'+tag,true);await metrics(p,tag+' E6 quiz');await contrast(p,tag+' E6');save('E6_quiz_'+tag,await txt(p,'#tab-units'));
    const q=await p.evaluate(()=>{const c=TYDIL.units.ctx;if(!c||!c.questions)return null;const q=c.questions[c.qIndex];return q.options.indexOf(q.answer);});
    if(q!=null){const wrong=(q+1)%4;await p.click(`#uOpts .u-opt[data-i="${wrong}"]`);await p.waitForTimeout(300);await shot(p,'E7_quiz_wrong_'+tag);save('E7_quiz_wrong_'+tag,await txt(p,'#tab-units'));}}
  // mother: tap target sizes in unit
  note(tag,'unit button sizes: '+JSON.stringify(await p.$$eval('#tab-units button',e=>e.filter(x=>x.offsetParent).map(x=>{const r=x.getBoundingClientRect();return [x.textContent.trim().slice(0,14)||x.getAttribute('aria-label'),Math.round(r.w||r.width),Math.round(r.height),Math.round(parseFloat(getComputedStyle(x).fontSize))];}))));
  // F. Ayarlar comprehension
  await H.tab(p,'setup');await p.waitForTimeout(400);await shot(p,'F1_settings_'+tag,true);await metrics(p,tag+' F1 settings');await contrast(p,tag+' F1');save('F1_settings_'+tag,await txt(p,'#tab-setup'));
  await p.click('#bkRestore summary');await p.click('#advMore summary');await p.waitForTimeout(200);await shot(p,'F2_settings_open_'+tag,true);await metrics(p,tag+' F2 settings open');save('F2_settings_open_'+tag,await txt(p,'#tab-setup'));
  note(tag,'settings headings: '+JSON.stringify(await p.$$eval('#tab-setup h2, #tab-setup h3, #tab-setup summary',e=>e.filter(x=>x.offsetParent).map(x=>x.textContent.trim().slice(0,40)))));
  if(errs.length)note(tag,'ERRORS day2: '+errs.join(' | '));
  await ctx.close();}
 fs.writeFileSync(path.join(__dirname,'notes.txt'),notes.join('\n'));
 await b.close();srv.close();console.log('DONE');})().catch(e=>{console.error(e);process.exit(1);});
