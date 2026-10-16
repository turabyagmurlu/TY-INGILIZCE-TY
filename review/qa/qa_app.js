/* QA: app level — real request bodies (token/cost estimate), XSS probes via coach text / notes / import, perf with 4x CPU throttle,
   SW/offline, 375 layout, console errors, memory after chat open/close cycles.
   NODE_PATH=$(npm root -g) node review/qa/qa_app.js */
const H=require('../../tests/_h.js');const {ok,sleep,AT}=H;const fs=require('fs');const path=require('path');
const THU=AT(2026,10,8,9);
const PROG={program:{main:{start:'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}}};
const tok=s=>Math.round(s.length/3.2);   // Turkish-heavy text with many diacritics ≈ 3.0–3.5 chars/token on Claude tokenizer (conservative)
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const open=async(o,ctxo)=>{o=o||{};const st={};const ctx=await b.newContext(Object.assign({viewport:{width:375,height:812},timezoneId:'Europe/Istanbul'},ctxo||{}));const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   await p.addInitScript(H.clockScript(THU));
   if(o.key!==null)await p.addInitScript(k=>localStorage.setItem('tydil.apiKey',k),'sk-ant-test');
   await H.mockApi(p,st,o.handler);await p.goto(srv.base+'/index.html');
   if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
   await p.waitForTimeout(500);return {p,ctx,st};};
 const idle=p=>p.waitForFunction(()=>!document.querySelector('.cc-row.live')&&document.querySelector('#ccStop').hidden,null,{timeout:15000});

 /* ---- 1) token budget: capture real bodies during a lesson with ~60 cards + 10 sessions seeded ---- */
 {const cards={};for(let i=0;i<60;i++)cards['c'+i]={lang:i%4?'it':'en',f:'parola numero '+i,tr:'kelime '+i,ex:'Frase di esempio '+i,box:1,due:'2026-10-01',added:'2026-10-01'};
  const sessions={};for(let i=0;i<10;i++)sessions['s'+i]={lang:'it',date:'2026-10-0'+(i%9+1),mins:{kelime:10,gramer:20},note:'Nota della sessione '+i+' con alcune parole chiave e errori ripetuti artikel il/lo',next:'it05 · Articoli',created:'2026-10-0'+(i%9+1)+'T10:00:00Z',mistakes:['il/lo artikel','essere/avere']};
  const {p,ctx,st}=await open({seed:Object.assign({cards,sessions,topics:{it01:{status:'done'},it02:{status:'done'},it03:{status:'doing'}}},PROG)});
  await p.click('#btnGo').catch(()=>{});await p.waitForSelector('#ders:not([hidden])',{timeout:5000}).catch(()=>{});await idle(p);await sleep(300);
  // several student turns
  for(let i=0;i<6;i++){await p.fill('#ccIn','Il cavo è lungo e la luce è accesa. Cevabım bu: '+i+' — biraz daha uzun bir cümle yazıyorum ki gerçekçi olsun.');await p.press('#ccIn','Enter');await idle(p);await sleep(200);}
  const bodies=st.reqs;const first=bodies[0],lastB=bodies[bodies.length-1];
  const sysTxt=b=>Array.isArray(b.system)?b.system.map(x=>x.text||'').join('\n'):(b.system||'');
  const sys=sysTxt(first),tools=JSON.stringify(first.tools||[]);
  const msgsLen=b=>JSON.stringify(b.messages).length;
  console.log('  REQUESTS',bodies.length,'| system chars',sys.length,'≈',tok(sys),'tok | tools json chars',tools.length,'≈',tok(tools),'tok | first msgs',msgsLen(first),'| last msgs',msgsLen(lastB),'≈',tok(JSON.stringify(lastB.messages)),'tok');
  console.log('  system sections: INSTR_CORE..', sys.indexOf('=== SAYFA'),'| rules', sys.indexOf('=== AJAN'),'| live state', sys.indexOf('=== CANLI'),'| total',sys.length);
  const live=sys.slice(sys.indexOf('=== CANLI'));console.log('  live-state chars',live.length,'≈',tok(live),'tok');
  console.log('  tools:',(first.tools||[]).map(t=>t.name+':'+JSON.stringify(t).length).join(' '));
  const sysSame=bodies.every(b=>sysTxt(b).slice(0,sys.indexOf('=== CANLI'))===sys.slice(0,sys.indexOf('=== CANLI')));
  ok(sysSame,'static part of system prompt identical across turns ('+(sysSame?'cacheable':'varies')+') — cache_control used? '+JSON.stringify(first.system).includes('cache_control'));
  const cacheOk=Array.isArray(first.system)&&first.system.length===2&&first.system[0].cache_control&&first.system[0].cache_control.type==='ephemeral'&&!first.system[1].cache_control&&/=== CANLI/.test(first.system[1].text)&&!/=== CANLI/.test(first.system[0].text)&&(first.tools||[]).length&&first.tools[first.tools.length-1].cache_control&&first.tools[first.tools.length-1].cache_control.type==='ephemeral';
  ok(cacheOk,'prompt caching: system = [static block + cache_control, live block without], last tool has cache_control');
  ok(bodies.every(b=>Array.isArray(b.system)&&b.system[0].text===first.system[0].text),'static (cached) system block byte-identical across turns');
  const perTurn=tok(sys)+tok(tools)+tok(JSON.stringify(lastB.messages));
  console.log('  ≈ input tokens/turn (late in lesson):',perTurn,'| output ≤2048 (typ. ~250)');
  fs.writeFileSync(path.join(__dirname,'sample_request.json'),JSON.stringify(lastB,null,1).slice(0,200000));
  // does ccWindow drop tool_use/tool_result history? (it sends only text turns) — fine; check acts note size
  await ctx.close();}

 /* ---- 2) XSS probes: coach text (markdown), tool inputs (card f/tr), import data rendered in dashboard, units notes ---- */
 {let evil=0;
  const payload='<img src=x onerror="window.__xss=1"><svg onload="window.__xss=1"></svg> [[it: <b onmouseover=1>ciao</b>]] | a | b |\n|---|---|\n| <script>window.__xss=1</script> | `<i>` |\n```\n<script>window.__xss=1</script>\n```\n**<a href="javascript:window.__xss=1">x</a>**';
  const seed=Object.assign({cards:{x:{lang:'it',f:'<img src=x onerror="window.__xss=1">',tr:'<svg onload="window.__xss=1">',ex:'"><script>window.__xss=1</script>',box:1,due:'2026-10-01',added:'2026-10-01'}},
    sessions:{s:{lang:'it',date:'2026-10-07',mins:{kelime:10},note:'<img src=x onerror="window.__xss=1">',next:'<svg onload="window.__xss=1">',created:'2026-10-07T10:00:00Z',mistakes:['<img src=x onerror="window.__xss=1">']}},
    topics:{it01:{status:'done',note:'<img src=x onerror=window.__xss=1>'}}},PROG);
  const {p,ctx,st}=await open({seed,handler:(req,st)=>({sse:[{text:payload},{tool:{name:'kelime_ekle',input:{lang:'it',items:[{f:'<img src=x onerror="window.__xss=1">',tr:'<svg/onload="window.__xss=1">'}]}}}]})});
  await p.evaluate(()=>window.__xss=0);
  for(const t of ['learn','practice','progress','units','settings']){await p.click('[data-tab='+t+']').catch(()=>{});await sleep(300);}
  await p.click('[data-tab=practice]');await sleep(200);await p.fill('#ccIn','x');await p.press('#ccIn','Enter');await idle(p).catch(()=>{});await sleep(400);
  // cards tab / review
  await p.click('[data-tab=progress]').catch(()=>{});await sleep(300);
  const x1=await p.evaluate(()=>window.__xss);ok(!x1,'XSS via coach markdown / tool input / imported docs: __xss='+x1);
  const html=await p.content();ok(!/<img src=x onerror=/.test(html.replace(/&lt;/g,'')),'no raw injected tag in DOM');
  // units notes
  await p.click('[data-tab=units]');await sleep(400);
  const note=await p.evaluate(()=>{try{const s=JSON.parse(localStorage.getItem('dilOgren_v4')||'{}');s.lang='en';s.langStore=s.langStore||{};s.langStore.en=Object.assign(s.langStore.en||{},{notes:{general:{text:'<img src=x onerror="window.__xss=2">',updatedAt:Date.now()}}});localStorage.setItem('dilOgren_v4',JSON.stringify(s));return 1;}catch(e){return String(e);}});
  await p.reload();await sleep(500);await p.click('[data-tab=units]');await sleep(400);
  const btn=await p.$('[data-act=notes], [data-act=notesAll], [data-act="notes"]');if(btn)await btn.click();await sleep(300);
  await p.evaluate(()=>{try{const b=[...document.querySelectorAll('button')].find(x=>/Notlar/.test(x.textContent));b&&b.click();}catch(e){}});await sleep(300);
  const x2=await p.evaluate(()=>window.__xss);ok(!x2,'XSS via units notes: __xss='+x2);
  await ctx.close();}

 /* ---- 3) perf: parse/exec with 4x CPU throttle (mid phone), first render, memory ---- */
 {const ctx=await b.newContext({viewport:{width:375,height:812}});const p=await ctx.newPage();const cdp=await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Performance.enable');
  await p.addInitScript(()=>localStorage.setItem('tydil.apiKey','k'));
  const t0=Date.now();await p.goto(srv.base+'/index.html',{waitUntil:'load'});const load=Date.now()-t0;
  await p.waitForSelector('#onb, #learnMain',{timeout:10000}).catch(()=>{});const firstUi=Date.now()-t0;
  const m=await p.evaluate(()=>{const nav=performance.getEntriesByType('navigation')[0];const paint=performance.getEntriesByType('paint');return {domInteractive:Math.round(nav.domInteractive),domContentLoaded:Math.round(nav.domContentLoadedEventEnd),loadEnd:Math.round(nav.loadEventEnd),responseEnd:Math.round(nav.responseEnd),fcp:Math.round((paint.find(x=>x.name==='first-contentful-paint')||{}).startTime||0),heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null,scripts:[...document.scripts].map(s=>s.text.length)};});
  const met=(await cdp.send('Performance.getMetrics')).metrics.reduce((a,x)=>(a[x.name]=x.value,a),{});
  console.log('  PERF 4x:',JSON.stringify(Object.assign(m,{scriptDurationMs:Math.round(met.ScriptDuration*1000),layoutMs:Math.round(met.LayoutDuration*1000),styleMs:Math.round(met.RecalcStyleDuration*1000),taskMs:Math.round(met.TaskDuration*1000),jsHeapUsedMB:Math.round(met.JSHeapUsedSize/1048576),wallLoad:load,wallFirstUi:firstUi})));
  // script eval breakdown: evaluate parse of units_data alone
  const ud=fs.readFileSync(path.join(H.ROOT,'src/units_data.js'),'utf8');
  const pd=await p.evaluate(src=>{const t=performance.now();const f=new Function(src+'\nreturn 1;');f();return Math.round((performance.now()-t)*10)/10;},ud);
  console.log('  units_data.js ('+ud.length+' chars) parse+exec @4x ≈',pd,'ms');
  ok(met.ScriptDuration*1000<1500,'script duration @4x '+Math.round(met.ScriptDuration*1000)+'ms');
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  // memory after 30 open/close chat (Ders modu) cycles
  await ctx.close();}
 {const {p,ctx}=await open({seed:PROG});
  const h0=await p.evaluate(()=>performance.memory?performance.memory.usedJSHeapSize:0);
  for(let i=0;i<30;i++){await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])',{timeout:3000}).catch(()=>{});await sleep(60);await p.keyboard.press('Escape');await sleep(60);}
  await sleep(300);const h1=await p.evaluate(()=>performance.memory?performance.memory.usedJSHeapSize:0);
  const rows=await p.evaluate(()=>document.querySelectorAll('.cc-row').length);
  console.log('  heap before/after 30 ders open-close cycles MB:',Math.round(h0/1048576),Math.round(h1/1048576),'| chat rows',rows);
  ok(h1-h0<15*1048576,'no gross leak over 30 cycles (Δ '+Math.round((h1-h0)/1048576)+' MB)');
  // 375 layout: no horizontal scroll on every tab
  for(const t of ['learn','practice','progress','units','settings']){await p.click('[data-tab='+t+']').catch(()=>{});await sleep(250);const okw=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);ok(okw,'375: no horizontal scroll on tab '+t);}
  await ctx.close();}

 /* ---- 4) service worker: registration, precache, offline reload, update flow ---- */
 {const ctx=await b.newContext({viewport:{width:375,height:812}});const p=await ctx.newPage();await p.addInitScript(()=>localStorage.setItem('tydil.apiKey','k'));
  await p.goto(srv.base+'/index.html');await p.waitForFunction(()=>navigator.serviceWorker&&navigator.serviceWorker.controller||navigator.serviceWorker.ready.then(()=>true),null,{timeout:8000}).catch(()=>{});
  await sleep(1500);
  const sw=await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();const keys=await caches.keys();const c=keys.length?await caches.open(keys[0]):null;const ks=c?(await c.keys()).map(r=>new URL(r.url).pathname):[];return {has:!!r,active:!!(r&&r.active),ctrl:!!navigator.serviceWorker.controller,keys,cached:ks};});
  console.log('  SW:',JSON.stringify(sw));ok(sw.has&&sw.active,'SW registered+active; cache '+sw.keys.join()+' entries '+sw.cached.length);
  ok(sw.cached.some(x=>/index\.html$/.test(x))&&sw.cached.some(x=>/manifest/.test(x))&&sw.cached.some(x=>/legacy/.test(x)),'precache contains index, manifest, legacy');
  // offline reload (page must come from SW)
  await ctx.setOffline(true);let offOk=false;try{await p.reload({waitUntil:'load'});offOk=await p.evaluate(()=>!!document.querySelector('.tabs'));}catch(e){offOk=false;}
  ok(offOk,'offline reload served from SW cache');
  // offline: legacy page too
  let leg=false;try{const p2=await ctx.newPage();await p2.goto(srv.base+'/legacy/ty-ingilizce.html');leg=await p2.evaluate(()=>document.body.innerHTML.length>1000);await p2.close();}catch(e){}
  ok(leg,'offline legacy page served');
  await ctx.setOffline(false);
  // update flow: SW has skipWaiting+claim but page never reloads/prompts → new version applies on NEXT navigation only; API bypass check
  const swSrc=fs.readFileSync(path.join(H.ROOT,'sw.js'),'utf8');
  ok(/skipWaiting/.test(swSrc)&&/clients\.claim/.test(swSrc),'sw.js: skipWaiting + clients.claim');
  ok(!/controllerchange|updatefound/.test(fs.readFileSync(path.join(H.ROOT,'index.html'),'utf8')),'NOTE: no controllerchange/updatefound handling in page → no "new version" prompt/reload (stale-while-revalidate: new HTML on the next load)');
  ok(/url\.origin !== self\.location\.origin/.test(swSrc),'sw.js: cross-origin (API) requests bypass SW');
  ok(/cache: "no-cache"/.test(swSrc)&&/ty-dil-v7/.test(swSrc),'sw.js v5: stale-while-revalidate, background refresh with cache:"no-cache" (GitHub Pages 10-min max-age bypassed)');
  await ctx.close();}
 await b.close();srv.close();console.log('errors',errs);ok(!errs.length,'no page errors');console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
