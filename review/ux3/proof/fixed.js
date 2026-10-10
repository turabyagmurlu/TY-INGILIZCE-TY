/* UX3 düzeltme kanıtları: NODE_PATH=$(npm root -g) node review/ux3/proof/fixed.js */
const H=require('../../../tests/_h.js');const path=require('path');const fs=require('fs');
const MOCK=fs.readFileSync(path.join(__dirname,'../../../tests/voice_test.js'),'utf8').match(/const MOCK=`([\s\S]*?)`;/)[1];
const KEY='sk-ant-api03-'+'A'.repeat(80), PROG={program:{main:{start:'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}}};
(async()=>{const srv=await H.serve();const b=await H.browser();
 const open=async(o)=>{const st={};const ctx=await b.newContext({viewport:{width:375,height:812},timezoneId:'Europe/Istanbul',hasTouch:true,isMobile:true});const p=await ctx.newPage();
   await p.addInitScript(H.clockScript(H.AT(2026,10,8,9)));await p.addInitScript(MOCK);if(o.key)await p.addInitScript(k=>{try{localStorage.setItem('tydil.apiKey',k);}catch(e){}},KEY);
   await H.mockApi(p,st);await p.goto(srv.base+'/index.html');await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),PROG);await p.reload();await p.waitForTimeout(500);return {p,ctx};};
 const shot=(p,n,full)=>p.screenshot({path:path.join(__dirname,n+'.png'),fullPage:!!full});
 {const {p,ctx}=await open({key:true});await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await p.waitForTimeout(1200);await p.click('#dersMode');await p.waitForTimeout(200);await shot(p,'fixed_p1_lang_menu_375');await ctx.close();}
 {const {p,ctx}=await open({key:true});await p.click('[data-tab=setup]');await p.click('#advMore summary');await p.waitForTimeout(200);await shot(p,'fixed_p2_ayarlar_375',true);await ctx.close();}
 {const {p,ctx}=await open({key:false});await p.click('[data-tab=units]');await p.waitForTimeout(300);await p.click('[data-act=fsToggle]');await p.click('[data-act=setFont][data-v="1.3"]');await p.waitForTimeout(200);await shot(p,'fixed_p3_dersler_toolbar_bigfont_375',true);await ctx.close();}
 {const {p,ctx}=await open({key:false});await p.click('#btnGo');await p.waitForTimeout(400);await shot(p,'fixed_p4_keygate_375',true);await ctx.close();}
 await b.close();srv.close();console.log('DONE');})().catch(e=>{console.error(e);process.exit(1);});
