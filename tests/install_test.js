/* Telefona kur (PWA): beforeinstallprompt taklidi → Öğren kartı + Ayarlar satırı → Kur → prompt() çağrılır → appinstalled → kart gizli, satır "Kuruldu ✓";
   standalone'da hiçbiri yok; iOS Safari'de 2 adımlı ipucu; masaüstünde "Bilgisayara kur"; eski "ana ekrana ekle" ipucu yok; konsol hatası yok.
   NODE_PATH=$(npm root -g) node tests/install_test.js */
const H=require('./_h.js');const {ok,AT}=H;const fs=require('fs');const path=require('path');
const THU=AT(2026,10,8,9);
const PROG={program:{main:{start:'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}},topics:{it01:{status:'done'}}};
const SHOTS=path.join(H.ROOT,'review','shots_v5');
const ANDROID={userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',hasTouch:true,isMobile:true};
const BIP=`(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});window.__prompted=0;e.prompt=()=>{window.__prompted++;return Promise.resolve();};e.userChoice=new Promise(r=>{window.__choose=r;});window.dispatchEvent(e);})()`;
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];fs.mkdirSync(SHOTS,{recursive:true});
 const open=async(o,ctxo)=>{o=o||{};const st={};const ctx=await b.newContext(Object.assign({viewport:{width:375,height:812},timezoneId:'Europe/Istanbul',reducedMotion:'reduce'},ctxo||{}));const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   await p.addInitScript(H.clockScript(THU));await p.addInitScript(k=>localStorage.setItem('tydil.apiKey',k),'sk-ant-test');
   if(o.init)await p.addInitScript(o.init);
   await H.mockApi(p,st);await p.goto(srv.base+'/index.html');
   if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
   await p.waitForTimeout(500);return {p,ctx,st};};
 const vis=(p,s)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e||e.hidden)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;},s);
 const html=fs.readFileSync(path.join(H.ROOT,'index.html'),'utf8');
 ok(!/Telefonda ana ekrana ekle/.test(html),'old "Telefonda ana ekrana ekle" tip text removed');
 ok(!/\b(alert|confirm|prompt)\(/.test(html.replace(/\/\*[\s\S]*?\*\//g,'')),'no alert/confirm/prompt calls (install uses d["prompt"]())');

 /* ---- A. Android/Chrome: beforeinstallprompt → kart + satır → Kur → appinstalled ---- */
 {const {p,ctx}=await open({seed:PROG},ANDROID);
  ok(!(await vis(p,'#instCard'))&&!(await vis(p,'#instRow')),'without beforeinstallprompt (non-iOS): card and row hidden');
  await p.evaluate(BIP);await p.waitForTimeout(100);
  ok(await vis(p,'#instCard'),'beforeinstallprompt → install card visible on Öğren');
  const pos=await p.evaluate(()=>{const c=document.querySelector('#instCard').getBoundingClientRect(),h=document.querySelector('#hero').getBoundingClientRect(),d=document.querySelector('#learnMore').getBoundingClientRect();return c.top>=h.bottom&&c.bottom<=d.top;});
  ok(pos,'card sits below the hero and above Detaylar');
  const t=await p.textContent('#instCard');ok(/Telefona kur/.test(t)&&/ana ekrana simge ekler, tam ekran açılır/i.test(t)&&/Kur/.test(t)&&/Şimdi değil/.test(t),'card copy: Telefona kur · simge · tam ekran · Kur · Şimdi değil');
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no h-scroll with card at 375');
  await p.screenshot({path:path.join(SHOTS,'learn_install_375.png')});
  await p.click('[data-tab=setup]');await p.waitForTimeout(150);
  const rt=await p.textContent('#instRow');ok(await vis(p,'#instRow')&&/Telefona kur/.test(rt)&&/ana ekrana simge ekler, tam ekran açılır/i.test(rt)&&/Kur/.test(rt),'Ayarlar row: "Telefona kur — ana ekrana simge ekler, tam ekran açılır" + Kur');
  await p.click('#instRow [data-inst=go]');await p.waitForTimeout(150);
  ok((await p.evaluate(()=>window.__prompted))===1,'Kur → prompt() called once');
  await p.evaluate(()=>window.__choose({outcome:'accepted'}));await p.waitForTimeout(100);
  await p.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));await p.waitForTimeout(150);
  ok(/Kuruldu ✓/.test(await p.textContent('#instRow'))&&!(await p.$('#instRow [data-inst=go]')),'appinstalled → row shows "Kuruldu ✓", no Kur button');
  await p.click('[data-tab=learn]');await p.waitForTimeout(100);ok(!(await vis(p,'#instCard')),'appinstalled → Öğren card hidden');
  await p.reload();await p.waitForTimeout(500);await p.evaluate(BIP);await p.waitForTimeout(100);
  ok(!(await vis(p,'#instCard'))&&/Kuruldu ✓/.test(await p.textContent('#instRow')),'installed flag persists across reload (card hidden, row Kuruldu)');
  await ctx.close();}
 /* ---- B. Şimdi değil: kart ertelenir, Ayarlar satırı kalır ---- */
 {const {p,ctx}=await open({seed:PROG},ANDROID);await p.evaluate(BIP);await p.waitForTimeout(100);
  await p.click('#instCard [data-inst=later]');await p.waitForTimeout(100);
  ok(!(await vis(p,'#instCard')),'Şimdi değil hides the Öğren card');await p.click('[data-tab=setup]');await p.waitForTimeout(100);ok(await vis(p,'#instRow')&&!!(await p.$('#instRow [data-inst=go]')),'Ayarlar row still offers Kur');
  await p.click('#instRow [data-inst=go]');await p.waitForTimeout(100);await p.evaluate(()=>window.__choose({outcome:'dismissed'}));await p.waitForTimeout(150);
  ok(!!(await p.$('#instRow [data-inst=go]:not([disabled])')),'dismissed prompt → Kur usable again');
  await ctx.close();}
 /* ---- C. standalone (kurulu açılış): hiçbir kurulum öğesi yok ---- */
 {const {p,ctx}=await open({seed:PROG,init:`(()=>{const mm=window.matchMedia;window.matchMedia=q=>/display-mode: standalone/.test(q)?{matches:true,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}:mm.call(window,q);})()`});
  await p.evaluate(BIP);await p.waitForTimeout(100);
  ok(!(await vis(p,'#instCard')),'standalone: card hidden even with beforeinstallprompt');await p.click('[data-tab=setup]');await p.waitForTimeout(100);ok(!(await vis(p,'#instRow')),'standalone: Ayarlar row hidden');
  await ctx.close();}
 /* ---- D. iOS Safari: 2 adımlı ipucu ---- */
 {const {p,ctx}=await open({seed:PROG},{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',hasTouch:true,isMobile:true});
  const t=await p.textContent('#instCard');
  ok(await vis(p,'#instCard')&&/Paylaş/.test(t)&&/Ana Ekrana Ekle/.test(t)&&/1/.test(t)&&/2/.test(t)&&!/\bKur\b/.test(t),'iOS: 2-step hint "Paylaş → Ana Ekrana Ekle", no Kur button');
  ok((await p.$$('#instCard .instSteps svg')).length===2,'iOS hint shows share + add icons');
  await p.click('[data-tab=setup]');await p.waitForTimeout(100);const r=await p.textContent('#instRow');ok(await vis(p,'#instRow')&&/Paylaş/.test(r)&&/Ana Ekrana Ekle/.test(r),'iOS: Ayarlar row shows the same 2 steps');
  await ctx.close();}
 /* ---- E. Masaüstü Chrome: "Bilgisayara kur" ---- */
 {const {p,ctx}=await open({seed:PROG},{viewport:{width:1280,height:900},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'});
  await p.evaluate(BIP);await p.waitForTimeout(100);
  ok(await vis(p,'#instCard')&&/Bilgisayara kur/.test(await p.textContent('#instCard')),'desktop: card says "Bilgisayara kur"');
  await p.click('#instCard [data-inst=go]');await p.waitForTimeout(100);ok((await p.evaluate(()=>window.__prompted))===1,'desktop Kur → prompt() called');
  await ctx.close();}
 await b.close();srv.close();console.log('errors',errs);ok(!errs.length,'no console errors / dialogs');console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
