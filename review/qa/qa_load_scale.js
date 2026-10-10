/* QA: startup cost with 12 weeks of chat history (252 chat docs × ~50KB) + 1500 cards in IndexedDB. */
const H=require('../../tests/_h.js');const {ok}=H;
(async()=>{const srv=await H.serve();const b=await H.browser();const ctx=await b.newContext({viewport:{width:375,height:812}});const p=await ctx.newPage();
 await p.addInitScript(()=>localStorage.setItem('tydil.apiKey','k'));await p.goto(srv.base+'/tests/rt_page.html');
 const w=await p.evaluate(async()=>{const db=await claude.use('db');const t0=performance.now();const turn=i=>({r:i%2?'a':'u',c:'Mesaj '+i+' '+'çok uzun bir koç yanıtı '.repeat(12),t:Date.now()});
   for(let d=0;d<84;d++)for(const a of ['it-koc','en-koc','dilbilgisi']){const turns=[];for(let i=0;i<60;i++)turns.push(turn(i));await db.collection('chats').doc('2026-0'+d+'_'+a).set({date:'x',agent:a,turns});}
   for(let i=0;i<1500;i++)await db.collection('cards').doc('c'+i).set({lang:'it',f:'parola '+i,tr:'kelime '+i,box:2,due:'2026-10-01'});
   return Math.round(performance.now()-t0);});
 console.log('  seeded in',w,'ms; export size',await p.evaluate(()=>JSON.stringify(rtExport()).length),'bytes');
 const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await p.reload({waitUntil:'load'});
 const r=await p.evaluate(async()=>{const t0=performance.now();await claude.use('db');const ms=Math.round(performance.now()-t0);return {ms,heapMB:Math.round(performance.memory.usedJSHeapSize/1048576)};});
 console.log('  @4x CPU: db load (idb getAll + hydrate) =',r.ms,'ms; heap',r.heapMB,'MB');
 // full app with that data
 const t1=Date.now();await p.goto(srv.base+'/index.html',{waitUntil:'load'});await p.waitForSelector('#learnMain, #onb',{timeout:15000}).catch(()=>{});
 const m=await p.evaluate(()=>({heapMB:Math.round(performance.memory.usedJSHeapSize/1048576),dcl:Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd)}));
 console.log('  @4x CPU: full app with 12-week data: wall',Date.now()-t1,'ms, DCL',m.dcl,'ms, heap',m.heapMB,'MB');
 ok(r.ms<1500,'db load under 1.5s @4x with 12 weeks of chats');
 await b.close();srv.close();console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
