/* QA: voice — hands-free with permanent no-speech / aborted / not-allowed must not loop forever; TTS queue and SR instances after 30 toggles.
   Reuses the SR/TTS mock from tests/voice_test.js.  NODE_PATH=$(npm root -g) node review/qa/qa_voice_loops.js */
const H=require('../../tests/_h.js');const {ok,sleep,AT}=H;const fs=require('fs');const path=require('path');
const src=fs.readFileSync(path.join(H.ROOT,'tests/voice_test.js'),'utf8');const MOCK=/const MOCK=`([\s\S]*?)`;\n\(async/.exec(src)[1];
const THU=AT(2026,10,8,9);const PROG={program:{main:{start:'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}}};
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const open=async(o)=>{o=o||{};const st={};const ctx=await b.newContext({viewport:{width:375,height:812},timezoneId:'Europe/Istanbul',reducedMotion:'reduce'});const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});
   await p.addInitScript(H.clockScript(THU));await p.addInitScript(MOCK);await p.addInitScript(()=>{localStorage.setItem('tydil.apiKey','sk-ant-test');localStorage.setItem('tydil-tip-pin','1');});
   await H.mockApi(p,st,o.handler);await p.goto(srv.base+'/index.html');
   await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),PROG);await p.reload();await sleep(500);return {p,ctx,st};};
 const idle=p=>p.waitForFunction(()=>!document.querySelector('.cc-row.live')&&document.querySelector('#ccStop').hidden,null,{timeout:10000});
 for(const scenario of ['no-speech','aborted','not-allowed','network']){
  const {p,ctx,st}=await open({handler:()=>({sse:[{text:'[[en: Tell me about your day.]]'}]})});
  await p.evaluate(sc=>{__sr.script=r=>{setTimeout(()=>r._error(sc),20);setTimeout(()=>r._end(),40);};},scenario);
  await p.click('[data-tab=practice]');await sleep(200);await p.click('[data-agent=en]');await sleep(200);
  await p.click('#vcHands');await sleep(200);
  await p.fill('#ccIn','hello');await p.press('#ccIn','Enter');await idle(p);await sleep(4000);
  const r=await p.evaluate(()=>({starts:__sr.log.filter(x=>/^start/.test(x)).length,instances:__sr.list.length,hands:TYDIL.voice.state.hands,state:TYDIL.voice.state.state,spoken:__tts.spoken.length,q:__tts.q.length,errCards:document.querySelectorAll('.vc-err').length}));
  console.log('  hands-free + permanent',scenario,'→',JSON.stringify(r));
  ok(r.starts<=6,scenario+': SR restarts bounded ('+r.starts+')');
  if(scenario==='not-allowed')ok(r.hands===false&&r.errCards===1,'not-allowed: hands-free turned off + one error card');
  await ctx.close();}
 // 30× hands toggle + 30× mic tap while speaking: no TTS queue growth, SR instances bounded, listeners sane
 {const {p,ctx}=await open({handler:()=>({sse:[{text:'[[en: A long reply to be read aloud by the speaker so that the queue has items.]]'}]})});
  await p.evaluate(()=>{__sr.script=r=>{setTimeout(()=>r._result('I am fine thanks',true),30);setTimeout(()=>r._end(),60);};__tts.delay=400;});
  await p.click('[data-tab=practice]');await sleep(200);await p.click('[data-agent=en]');await sleep(200);
  for(let i=0;i<30;i++){await p.click('#vcHands');await sleep(30);}
  await p.fill('#ccIn','hi');await p.press('#ccIn','Enter');await idle(p);await sleep(200);
  for(let i=0;i<30;i++){await p.click('#ccMic');await sleep(40);}
  await sleep(1500);
  const r=await p.evaluate(()=>({q:__tts.q.length,speaking:__tts.speaking,instances:__sr.list.length,sess:!!TYDIL.voice.state.sess,state:TYDIL.voice.state.state,heap:Math.round(performance.memory.usedJSHeapSize/1048576)}));
  console.log('  after 30 toggles + 30 mic taps →',JSON.stringify(r));
  ok(r.q<=1,'TTS queue not leaking ('+r.q+')');ok(r.instances<40,'SR instances bounded ('+r.instances+')');
  await ctx.close();}
 await b.close();srv.close();console.log('errors',errs);ok(!errs.length,'no page errors');console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
