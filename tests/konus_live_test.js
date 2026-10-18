/* Konuş canlı mod: mikrofon hep açık, söz kesme (barge-in), yankı süzgeci, 0,7 sn sıra geçişi */
const H=require('./_h.js');const {ok,sleep,AT}=H;const fs=require('fs');const path=require('path');
const MOCK=fs.readFileSync(path.join(__dirname,'voice_test.js'),'utf8').match(/const MOCK=`([\s\S]*?)`;/)[1];
const WED=AT(2026,10,14,9);
const SEED={program:{main:{start:'2026-09-28',weeks:12,dailyMin:60,mode:'yogun'}}};
const SHOTS=path.join(H.ROOT,'review/shots_v9');fs.mkdirSync(SHOTS,{recursive:true});
const OPEN='**Hi Türab!** 😀 I\'m Oliver from the site office. | How long have you # been running your crew?';
const REPLY='Oh, you\'ve been running it since 2024, that\'s a while! What\'s the hardest part of the job right now?';
const SUM={duzeltmeler:[{sen:'I am running it since 2024',dogal:'I\'ve been running it since 2024'},{sen:'We was late',dogal:'We were late'}],ifadeler:[{x:'to keep things on track',tr:'işleri yolunda tutmak'},{x:'a tight deadline',tr:'sıkışık teslim tarihi'},{x:'to sort it out',tr:'halletmek'}],ipucu:'Süre anlatırken have been + -ing kullan.'};
function handler(req,st){const s=req.system;st.log=st.log||[];
  if(/Türkçesini TEK satırda/.test(s)||/Türkçesini TEK satırda/.test(req.lastText)){st.log.push('tr');return {sse:[{text:'Merhaba Türab! Ben Oliver. Ekibini ne zamandır yönetiyorsun?'}]};}
  if(/SPEAKING MODE|KONUŞMA MODU/.test(s)){
    if(/CALL IS OVER|GÖRÜŞME BİTTİ/.test(req.lastText)){st.log.push('sum');return {sse:[{text:'Here you go:\n'+JSON.stringify(SUM)}]};}
    const users=req.msgs.filter(m=>m.role==='user').length; st.log.push('turn:'+req.lastText);
    if(/The call has started|Görüşme başladı/.test(req.lastText))return {sse:[{text:OPEN}]};
    return {delay:st.delay||0,sse:[{text:REPLY}]};}
  return {sse:[{text:'ok'}]};}
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const mk=async(o)=>{o=o||{};const st={};const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Istanbul',serviceWorkers:'block',colorScheme:o.dark?'dark':'light',reducedMotion:'reduce'});const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   await p.addInitScript(H.clockScript(WED));await p.addInitScript(MOCK);await p.addInitScript(()=>{localStorage.setItem('tydil.apiKey','sk-ant-test');localStorage.setItem('tydil-tip-pin','1');});
   await H.mockApi(p,st,handler);await p.goto(srv.base+'/index.html'+(o.q||''));
   await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),SEED);await p.reload();await p.waitForTimeout(600);return {p,ctx,st};};
 const kst=p=>p.evaluate(()=>{const o=document.querySelector('#kcOrb');return o?o.dataset.st:'';});
 const waitSt=(p,s,ms)=>p.waitForFunction(x=>{const o=document.querySelector('#kcOrb');return o&&o.dataset.st===x;},s,{timeout:ms||5000});
 const spoken=p=>p.evaluate(()=>__tts.spoken.map(x=>x.text).filter(t=>t.trim()));


 {const {p,ctx,st}=await mk();
  await p.click('[data-tab=konus]');await p.click('#kStart');await p.waitForSelector('#kc:not([hidden])');
  await p.waitForFunction(()=>__sr.cur&&__sr.cur._on&&document.querySelector('#kcOrb').dataset.st==='listening',null,{timeout:5000});
  await p.evaluate(()=>{__tts.delay=1500;});st.delay=0;
  await p.evaluate(()=>{__sr.cur._result('We were late yesterday',true);});
  await waitSt(p,'thinking',3000).catch(()=>{});ok(await p.evaluate(()=>__sr.cur&&__sr.cur._on),'mic stays on while coach thinks');
  await waitSt(p,'speaking',5000);
  /* yankı: koçun kendi sözleri (hoparlörden) kesmez */
  await p.evaluate(()=>{__sr.cur._result('the hardest part of the job',false);});await sleep(150);
  ok((await kst(p))==='speaking','echo of coach words does not interrupt');
  /* gerçek söz kesme */
  await p.evaluate(()=>{__sr.cur._result('sorry can I ask something',false);});await sleep(150);
  ok((await kst(p))==='listening'&&await p.evaluate(()=>!__tts.speaking),'barge-in: user speech stops coach instantly → listening');
  await p.evaluate(()=>{__tts.delay=40;__sr.cur._result('sorry can I ask something',true);});
  await p.waitForFunction(()=>true,null);await sleep(1200);
  ok(st.log.some(x=>/turn:.*sorry can I ask something/.test(x)),'after 0.7 s silence the interruption is sent as next turn: '+JSON.stringify(st.log.slice(-2)));
  const t=await p.evaluate(()=>TYLESSON.state().K.call.turns.map(x=>x.role));ok(t.join(',').indexOf('user,user')<0,'turn order stays user/assistant ('+t.join(',')+')');
  await ctx.close();}
 console.log('errors',JSON.stringify(errs));ok(!errs.length,'no page errors / dialogs');
 await b.close();srv.close();const f=H.fails();console.log(f?'FAILED '+f:'ALL PASS');process.exit(f?1:0);})();
