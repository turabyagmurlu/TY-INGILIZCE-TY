/* Tek tek ders dosyası denetimi (yazarlar için): şema + bütün adımlar doğru cevaplarla geçilir.
   NODE_PATH=$(npm root -g) node tests/content_check.js it07 it08 …  (dosyalar content/<id>.json; index.json'a eklenmiş olması gerekmez) */
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
const IDS=process.argv.slice(2);if(!IDS.length){console.log('kullanım: node tests/content_check.js it07 …');process.exit(2);}
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

 const stage=p=>p.evaluate(()=>document.querySelector('#lstage').innerText);
 // D) İçerik dosyaları: her ders şema + bütün adımlar
 {const idx=IDS.map(id=>{const d=JSON.parse(fs.readFileSync(path.join(H.ROOT,'content',id+'.json'),'utf8'));return {id,lang:d.lang,level:d.level,title:d.title,minutes:d.minutes};});const bad=[];
  const {p,ctx}=await mk({fixture:false,vp:{width:820,height:1180},pre:async p=>{await p.route('**/content/index.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(idx)}));}});
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
    
    await p.click('[data-act=close]');await p.waitForTimeout(100);
    if(d.pekistir){await p.evaluate(id=>TYLESSON.open(id,{pk:true}),id);await p.waitForSelector('#lsn:not([hidden])');await answerAll('k',d.pekistir.items);await p.click('[data-act=pkTalk]');await p.click('[data-act=pkDone]');}
    if(errs.length>e0)bad.push(id+': page errors '+errs.slice(e0).join(' | '));}
  ok(!bad.length,'content files ('+idx.map(x=>x.id).join(',')+'): schema valid, every step renders, correct answers accepted, yokla passes, pekiştir runs'+(bad.length?' — FAIL: '+bad.join(' ; '):''));
  await ctx.close();}


 console.log('errors',JSON.stringify(errs));srv.close();await b.close();const f=H.fails();console.log(f?'FAILED '+f:'ALL PASS');process.exit(f?1:0);})();
