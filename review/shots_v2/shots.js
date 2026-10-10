/* Ekran görüntüleri (v2): NODE_PATH=$(npm root -g) node review/shots_v2/shots.js */
const H=require('../../tests/_h.js');const {AT,sleep}=H;const path=require('path');const fs=require('fs');
const OUT=__dirname;const THU=AT(2026,10,8,9);const PROG={program:{main:{start:'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}}};
const MOCK=fs.readFileSync(path.join(__dirname,'../../tests/voice_test.js'),'utf8').match(/const MOCK=`([\s\S]*?)`;/)[1];
(async()=>{const srv=await H.serve();const b=await H.browser();
 const open=async(o)=>{const st={};const ctx=await b.newContext({viewport:o.w===1280?{width:1280,height:800}:{width:375,height:812},timezoneId:'Europe/Istanbul',colorScheme:o.dark?'dark':'light',hasTouch:o.w!==1280,isMobile:o.w!==1280});
   const p=await ctx.newPage();await p.addInitScript(H.clockScript(THU));await p.addInitScript(MOCK);await p.addInitScript(()=>{try{localStorage.setItem('tydil.apiKey','sk-ant-test');}catch(e){}});
   await H.mockApi(p,st);await p.goto(srv.base+'/index.html');await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),PROG);await p.reload();await sleep(500);return {p,ctx,st};};
 const shot=(p,n,full)=>p.screenshot({path:path.join(OUT,n+'.png'),fullPage:!!full});
 {const {p,ctx}=await open({w:375});await shot(p,'learn_375_light',true);
  await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await sleep(1500);await shot(p,'ders_375_light');
  await p.click('[data-tab=setup]').catch(()=>{});await ctx.close();}
 {const {p,ctx}=await open({w:375});await p.click('[data-tab=setup]');await sleep(300);await shot(p,'settings_375_light',true);await ctx.close();}
 {const {p,ctx}=await open({w:375});await p.click('[data-tab=units]');await sleep(300);await p.click('.u-ucard[data-uid="it1-1"]');await sleep(300);
  await p.evaluate(()=>location.hash='#dersler/it/it1-1/quiz');await sleep(300);await p.click('[data-act=startQuiz]');await sleep(150);
  for(let i=0;i<14;i++){const q=await p.evaluate(()=>{const c=TYDIL.units.ctx;if(!c.questions)return null;const q=c.questions[c.qIndex];return {i:q.options.indexOf(q.answer),n:c.questions.length,k:c.qIndex};});if(!q)break;await p.click(`#uOpts .u-opt[data-i="${q.i}"]`);await sleep(60);await p.click('[data-act=nextQuiz]');await sleep(80);if(q.k>=q.n-1)break;}
  await sleep(300);await shot(p,'units_done_375_light',true);await ctx.close();}
 {const {p,ctx}=await open({w:1280,dark:true});await shot(p,'learn_1280_dark',true);await ctx.close();}
 await b.close();srv.close();console.log('DONE');})().catch(e=>{console.error(e);process.exit(1);});
