/* QA: rt.js stress — SSE split chunks / partial JSON / unicode split across bytes, concurrent sample(), abort mid-tool,
   key whitespace, 401 vs bad format, rate-limit behaviour, max_tokens, tool loop cap, IDB quota/corruption, private mode.
   NODE_PATH=$(npm root -g) node review/qa/qa_rt.js */
const H=require('../../tests/_h.js');const {ok,sleep}=H;
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const open=async(o)=>{o=o||{};const ctx=await b.newContext();const p=await ctx.newPage();
   p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text());});
   if(o.init)await p.addInitScript(o.init);
   await p.addInitScript(k=>localStorage.setItem('tydil.apiKey',k),o.key===undefined?'sk-ant-test':o.key);
   await p.goto(srv.base+'/tests/rt_page.html');return {p,ctx};};

 /* ---- A) fetch monkeypatch: controlled byte chunking ---- */
 {const {p,ctx}=await open();
  // install a fake fetch that streams the given UTF-8 bytes in given chunk sizes
  await p.evaluate(()=>{window.__reqs=[];window.__fakeFetch=(bytesList,opt)=>{opt=opt||{};window.fetch=async(url,init)=>{window.__reqs.push({url,body:init&&init.body?JSON.parse(init.body):null,headers:init&&init.headers});
      if(opt.status)return new Response(opt.body||'{}',{status:opt.status});
      let i=0;const sig=init&&init.signal;const rs=new ReadableStream({async pull(c){ if(sig&&sig.aborted){c.error(new DOMException('x','AbortError'));return;} if(i>=bytesList.length){c.close();return;} await new Promise(r=>setTimeout(r,opt.delay||1)); c.enqueue(bytesList[i++]);}});
      return new Response(rs,{status:200,headers:{'content-type':'text/event-stream'}});};};
    window.__sseBytes=(txt,size)=>{const u=new TextEncoder().encode(txt);const out=[];for(let i=0;i<u.length;i+=size)out.push(u.slice(i,i+size));return out;};});
  const sseText=H.sse([{text:'Ciao Türab! Şöyle: 𝔘𝔫𝔦𝔠𝔬𝔡𝔢 ünlü çğışö — [[it: la chiave]] (la KYA-ve)'}]);
  for(const size of [1,3,7,64,100000]){
    const r=await p.evaluate(async([t,sz])=>{window.__fakeFetch(window.__sseBytes(t,sz));const s=await claude.use('sample');try{const r=await s([{role:'user','content':'S'},{role:'user',content:'hi'}],{});return r;}catch(e){return {err:e.code,m:e.message};}},[sseText,size]);
    ok(r.text==='Ciao Türab! Şöyle: 𝔘𝔫𝔦𝔠𝔬𝔡𝔢 ünlü çğışö — [[it: la chiave]] (la KYA-ve)','SSE byte-chunk size '+size+' → text intact (unicode split OK) '+JSON.stringify(r).slice(0,80));}
  // CRLF line endings + data: without space + comment lines + unknown event + event without type
  {const raw=sseText.replace(/\n/g,'\r\n').replace(/data: /g,'data:')+': keepalive\r\n\r\nevent: ping\r\ndata: {"type":"ping"}\r\n\r\n';
   const r=await p.evaluate(async t=>{window.__fakeFetch(window.__sseBytes(t,5));const s=await claude.use('sample');try{return await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{});}catch(e){return {err:e.code};}},raw);
   ok(r.text&&r.text.startsWith('Ciao Türab'),'CRLF + "data:" no-space + comments + ping tolerated');}
  // partial / broken JSON line in the middle is skipped, rest kept
  {const raw=sseText.replace('event: content_block_delta','data: {broken\n\nevent: content_block_delta');
   const r=await p.evaluate(async t=>{window.__fakeFetch(window.__sseBytes(t,9));const s=await claude.use('sample');try{return await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{});}catch(e){return {err:e.code};}},raw);
   ok(r.text&&r.text.startsWith('Ciao Türab'),'broken JSON data line skipped, stream continues');}
  // stream that ends without message_delta/message_stop (connection cut) → returns partial text, no exception?
  {const raw=sseText.slice(0,sseText.indexOf('event: message_delta'));
   const r=await p.evaluate(async t=>{window.__fakeFetch(window.__sseBytes(t,50));const s=await claude.use('sample');try{return await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{});}catch(e){return {err:e.code,text:e.text};}},raw);
   console.log('  cut stream →',JSON.stringify(r).slice(0,120));
   ok(r.err||r.text,'cut stream (no message_stop): '+(r.err?'error '+r.err+' with partial text':'RESOLVES OK with stop=null (silently treated as complete)'));}
  // SSE "error" event mid-stream (overloaded) → rate_limited with partial text
  {const raw=sseText.replace('event: message_delta','event: error\ndata: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\n\nevent: message_delta');
   const r=await p.evaluate(async t=>{window.__fakeFetch(window.__sseBytes(t,50));const s=await claude.use('sample');try{return await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{});}catch(e){return {err:e.code,text:e.text};}},raw);
   ok(r.err==='rate_limited'&&/Ciao/.test(r.text||''),'SSE error event overloaded → rate_limited + partial text');}
  // tool input JSON split across many deltas incl unicode; and empty partial_json
  {const tool=H.sse([{text:'Kaydediyorum'},{tool:{id:'t1',name:'kelime_ekle',input:{lang:'it',items:[{f:'la chiave',tr:'anahtar — çğış 𝔘'}]}}}]);
   const done=H.sse([{text:'Tamam.'}]);
   const r=await p.evaluate(async([a,b])=>{let n=0;const A=window.__sseBytes(a,2),B=window.__sseBytes(b,2);window.fetch=async(url,init)=>{n++;const list=n===1?A:B;let i=0;return new Response(new ReadableStream({pull(c){if(i>=list.length)c.close();else c.enqueue(list[i++]);}}),{status:200});};
     const s=await claude.use('sample');const got=[];const r=await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{tools:[{name:'kelime_ekle',description:'x',inputSchema:{type:'object'},execute:async i=>{got.push(i);return {ok:1};}}]});return {r,got,n};},[tool,done]);
   ok(r.got.length===1&&r.got[0].items[0].tr==='anahtar — çğış 𝔘'&&r.r.text==='Kaydediyorum\n\nTamam.','tool input_json_delta split 2-byte chunks → parsed input intact');}
  // key with whitespace / newline → trimmed in header
  {await p.evaluate(()=>localStorage.setItem('tydil.apiKey','  sk-ant-abc\n'));
   const r=await p.evaluate(async t=>{window.__fakeFetch(window.__sseBytes(t,50));const s=await claude.use('sample');await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{});return window.__reqs[window.__reqs.length-1].headers['x-api-key'];},sseText);
   ok(r==='sk-ant-abc','key with surrounding whitespace is trimmed before use: '+JSON.stringify(r));
   const k2=await p.evaluate(()=>{TYRT.setKey('  sk-ant-abc  ');return localStorage.getItem('tydil.apiKey');});ok(k2==='sk-ant-abc','setKey trims');
   const fmt=await p.evaluate(()=>{let err='';try{TYRT.setKey('hello world');}catch(e){err=e.code;}return {err,key:localStorage.getItem('tydil.apiKey'),valid:[TYRT.validKey('sk-ant-api03-'+'x'.repeat(60)),TYRT.validKey('hello'),TYRT.validKey('sk-ant-xyz')]};});ok(fmt.err==='invalid_key'&&fmt.key==='sk-ant-abc'&&fmt.valid.join()==='true,false,false','setKey rejects non sk-ant- key (invalid_key), stored key untouched; validKey() '+JSON.stringify(fmt));}
  // 401 with non-JSON body, 403, 404, 500 html body
  for(const [st,body,exp] of [[401,'<html>nope</html>','session_expired'],[403,'{}','permission_denied'],[404,'{"error":{"type":"not_found_error","message":"model: x"}}','upstream_error'],[500,'<html>500</html>','upstream_error'],[429,'','rate_limited'],[529,'<html>','rate_limited'],[413,'payload too large','upstream_error']]){
    const r=await p.evaluate(async([st,body])=>{window.__fakeFetch([],{status:st,body});const s=await claude.use('sample');try{await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{});return 'ok';}catch(e){return e.code+'|'+e.message.slice(0,40);}},[st,body]);
    ok(r.startsWith(exp),'HTTP '+st+' body '+JSON.stringify(body).slice(0,20)+' → '+r);}
  // rate limit: is there any backoff/retry? count fetches
  {const r=await p.evaluate(async()=>{window.__reqs=[];window.__fakeFetch([],{status:429,body:'{"error":{"type":"rate_limit_error","message":"slow"}}'});const s=await claude.use('sample');const t0=Date.now();try{await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{});}catch(e){}return {n:window.__reqs.length,ms:Date.now()-t0};});
   ok(r.n===1,'429: no automatic retry/backoff in rt.js (fetch count '+r.n+', '+r.ms+'ms) — app layer must handle');}
  // concurrent sample() calls do not share state
  {const a=H.sse([{text:'AAAA'}]),bb=H.sse([{text:'BBBB'}]);
   const r=await p.evaluate(async([a,b])=>{let n=0;window.fetch=async()=>{const t=(n++%2===0)?a:b;const list=window.__sseBytes(t,7);let i=0;return new Response(new ReadableStream({async pull(c){await new Promise(r=>setTimeout(r,2));if(i>=list.length)c.close();else c.enqueue(list[i++]);}}),{status:200});};
     const s=await claude.use('sample');const [x,y]=await Promise.all([s([{role:'user',content:'S'},{role:'user',content:'1'}],{}),s([{role:'user',content:'S'},{role:'user',content:'2'}],{})]);return [x.text,y.text];},[a,bb]);
   ok(r.sort().join()==='AAAA,BBBB','two concurrent sample() calls isolated: '+r.join('|'));}
  // abort mid-tool execution: execute() receives signal; sample rejects cancelled; messages not mutated afterwards
  {const tool=H.sse([{tool:{id:'t1',name:'slow',input:{}}}]);
   const r=await p.evaluate(async t=>{window.__reqs=[];window.__fakeFetch(window.__sseBytes(t,200));const s=await claude.use('sample');const ctl=new AbortController();let sawSignal=false,ranToEnd=false;
     const pr=s([{role:'user',content:'S'},{role:'user',content:'hi'}],{signal:ctl.signal,tools:[{name:'slow',description:'x',inputSchema:{type:'object'},execute:async(i,c)=>{sawSignal=!!(c&&c.signal);await new Promise(r=>setTimeout(r,400));ranToEnd=true;return 'late';}}]});
     setTimeout(()=>ctl.abort(),100);const t0=Date.now();try{await pr;return {ok:true};}catch(e){return {code:e.code,ms:Date.now()-t0,sawSignal,ranToEnd,reqs:window.__reqs.length};}},tool);
   console.log('  abort mid-tool →',JSON.stringify(r));
   ok(r.code==='cancelled'&&r.reqs===1,'abort during tool.execute → cancelled, no 2nd request ('+r.ms+'ms; tool waited to finish: '+r.ranToEnd+')');}
  // tool loop cap: MAX_ROUNDS=6 → how many requests, and what is returned
  {const tool=H.sse([{text:'x'},{tool:{id:'t1',name:'k',input:{}}}]);
   const r=await p.evaluate(async t=>{window.__reqs=[];window.__fakeFetch(window.__sseBytes(t,500));const s=await claude.use('sample');let n=0;const r=await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{tools:[{name:'k',description:'x',inputSchema:{type:'object'},execute:async()=>{n++;return 'ok';}}]});return {reqs:window.__reqs.length,execs:n,text:r.text,trunc:r.truncated,lastBody:window.__reqs[window.__reqs.length-1].body.messages.length};},tool);
   console.log('  loop cap →',JSON.stringify(r).slice(0,200));
   ok(r.reqs===7&&r.execs===6,'infinite tool loop capped: '+r.reqs+' requests, '+r.execs+' executes; result.truncated='+r.trunc+' (NOTE: caller cannot tell loop was cut)');}
  // non-streaming body: resp.body null path (older WebView) — simulate
  {const r=await p.evaluate(async()=>{window.fetch=async()=>({ok:true,status:200,body:null,json:async()=>({content:[{type:'text',text:'düz'}],stop_reason:'end_turn'})});const s=await claude.use('sample');return await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{});});
   ok(r.text==='düz','non-stream fallback (resp.body null) works');}
  // max_tokens then "devam" — does rt provide continuation? only flag
  {const r=await p.evaluate(async t=>{window.__fakeFetch(window.__sseBytes(t,500));const s=await claude.use('sample');return await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{});},H.sse([{text:'yarım kaldı'},{stop:'max_tokens'}]));
   ok(r.truncated===true,'max_tokens → truncated flag (no auto-continue; UI appends hint)');}
  // max_tokens WITH pending tool_use: tool not executed? (stop=max_tokens, not tool_use)
  {const raw=H.sse([{tool:{id:'t1',name:'k',input:{a:1}}},{stop:'max_tokens'}]);
   const r=await p.evaluate(async t=>{window.__fakeFetch(window.__sseBytes(t,500));const s=await claude.use('sample');let n=0;const r=await s([{role:'user',content:'S'},{role:'user',content:'hi'}],{tools:[{name:'k',description:'x',inputSchema:{type:'object'},execute:async()=>{n++;return 'ok';}}]});return {n,r};},raw);
   ok(r.n===0&&r.r.truncated,'max_tokens while emitting tool_use → tool NOT executed (safe), truncated=true');}
  // splitTurns: empty content turns dropped; only-assistant turns; huge system
  {const r=await p.evaluate(async()=>{window.__reqs=[];window.__fakeFetch(window.__sseBytes('event: message_stop\ndata: {"type":"message_stop"}\n\n',50));const s=await claude.use('sample');
     await s([{role:'user',content:[{type:'text',text:'SYS',cache:true}]},{role:'assistant',content:'A'},{role:'assistant',content:'B'},{role:'user',content:''},{role:'user',content:'u'}],{});return window.__reqs[0].body;});
   console.log('  splitTurns →',JSON.stringify(r));
   ok(Array.isArray(r.system)&&r.system[0].text==='SYS'&&r.system[0].cache_control&&r.system[0].cache_control.type==='ephemeral'&&r.messages.length===3&&r.messages[0].role==='user'&&r.messages[1].content==='A\n\nB'&&r.messages[2].content==='u','splitTurns: block context → system (cached) even before an assistant turn; merges consecutive assistant turns, drops empty');}
  await ctx.close();}

 /* ---- B) IndexedDB edge cases ---- */
 // B1: two tabs writing cards concurrently → second tab's in-memory cache is stale (no cross-tab sync)
 {const ctx=await b.newContext();const p1=await ctx.newPage(),p2=await ctx.newPage();
  for(const p of [p1,p2]){p.on('pageerror',e=>errs.push('pageerror '+e.message));await p.addInitScript(()=>localStorage.setItem('tydil.apiKey','k'));await p.goto(srv.base+'/tests/rt_page.html');}
  await p1.evaluate(async()=>{await claude.use('db');});await p2.evaluate(async()=>{await claude.use('db');});
  await p1.evaluate(async()=>{const db=await claude.use('db');await db.collection('cards').doc('a').set({f:'tab1',x:1});});
  await p2.evaluate(async()=>{const db=await claude.use('db');await db.collection('cards').doc('b').set({f:'tab2'});});
  const seen2=await p2.evaluate(async()=>{const db=await claude.use('db');const g=await db.collection('cards').doc('a').get();return g.exists;});
  await p2.evaluate(async()=>{const db=await claude.use('db');await db.collection('cards').doc('a').update({f:'tab2-overwrite'});});
  const p3=await ctx.newPage();await p3.goto(srv.base+'/tests/rt_page.html');
  const fin=await p3.evaluate(async()=>{const db=await claude.use('db');const a=await db.collection('cards').doc('a').get(),bb=await db.collection('cards').doc('b').get();return {a:a.data(),b:bb.data()};});
  console.log('  two tabs →',JSON.stringify({seen2,fin}));
  ok(seen2===true,'two tabs: tab2 sees tab1 write (BroadcastChannel "tydil" invalidation)');
  ok(fin.a&&fin.a.f==='tab2-overwrite'&&fin.a.x===1,'two tabs: tab2 update() re-reads before merge → tab1 field x kept');
  await ctx.close();}
 // B2: private mode / IDB open rejects asynchronously (Firefox PB throws InvalidStateError at open) → falls back to LS
 {const {p,ctx}=await open({init:()=>{const o=indexedDB.open.bind(indexedDB);indexedDB.open=function(){const r={};setTimeout(()=>{r.error=new DOMException('x','InvalidStateError');r.onerror&&r.onerror({target:r});},5);return r;};}});
  const r=await p.evaluate(async()=>{const db=await claude.use('db');await db.collection('cards').doc('a').set({f:1});return {mode:TYRT.mode,ls:!!localStorage.getItem('tydil.db')};});
  ok(r.mode==='local'&&r.ls,'IDB open onerror → localStorage fallback '+JSON.stringify(r));await ctx.close();}
 // B3: IDB put fails (quota) mid-session → fallback to LS flush silently; data preserved in LS
 {const {p,ctx}=await open();
  const r=await p.evaluate(async()=>{const db=await claude.use('db');await db.collection('cards').doc('a').set({f:1});
    const proto=IDBObjectStore.prototype;const orig=proto.put;proto.put=function(){throw new DOMException('QuotaExceededError','QuotaExceededError');};
    await db.collection('cards').doc('b').set({f:2});proto.put=orig;return {mode:TYRT.mode,ls:JSON.parse(localStorage.getItem('tydil.db')||'null')};});
  ok(r.mode==='local'&&r.ls&&r.ls.collections.cards.b,'IDB quota error on put → switches to LS, doc kept '+r.mode);
  // after reload: IDB has 'a' only, LS has a+b → load(): rows.length>0 so LS is IGNORED → 'b' lost?
  await p.reload();const r2=await p.evaluate(async()=>{const db=await claude.use('db');const bb=await db.collection('cards').doc('b').get();return {mode:TYRT.mode,b:bb.exists,ls:!!localStorage.getItem('tydil.db')};});
  console.log('  after quota fallback+reload →',JSON.stringify(r2));
  ok(r2.b===true,'docs written during LS-fallback survive reload when IDB recovers (merge) — '+(r2.b?'OK':'LOST: load() ignores LS when IDB has rows'));
  await ctx.close();}
 // B4: corrupted store record (missing coll/id) and corrupted LS db JSON
 {const {p,ctx}=await open({init:()=>localStorage.setItem('tydil.db','{not json')});
  const r=await p.evaluate(async()=>{const db=await claude.use('db');const req=indexedDB.open('tydil',1);await new Promise(r=>req.onsuccess=r);const d=req.result;await new Promise((res,rej)=>{const t=d.transaction('docs','readwrite');t.objectStore('docs').put({key:'junk'});t.objectStore('docs').put({key:'cards/x',coll:'cards',id:'x',data:'string-not-object'});t.oncomplete=res;t.onerror=rej;});return 1;});
  await p.reload();const r2=await p.evaluate(async()=>{try{const db=await claude.use('db');const s=await new Promise(r=>db.collection('cards').onSnapshot(q=>r(q.docs.map(d=>[d.id,d.data()]))));return {ok:true,s,mode:TYRT.mode,undef:Object.keys(rtExport().collections)};}catch(e){return {err:String(e)}; }});
  console.log('  corrupted →',JSON.stringify(r2).slice(0,200));
  ok(r2.ok,'corrupted IDB rows + bad LS json do not crash load '+(r2.undef||[]).join());
  ok(!(r2.undef||[]).includes('undefined'),'junk row without coll does not create "undefined" collection');await ctx.close();}
 // B5: export never includes api key; import of huge unicode roundtrip; import with __proto__ keys
 {const {p,ctx}=await open();
  const r=await p.evaluate(async()=>{const db=await claude.use('db');const big='ş'.repeat(50000)+'𝔘 "quotes" \\ back \u0000 nul';await db.collection('cards').doc('u').set({f:big,n:{deep:[1,{x:'ö'}]}});
    const ex=rtExport();const s=JSON.stringify(ex);const hasKey=/sk-ant-test/.test(s);await rtImport(s);const g=await db.collection('cards').doc('u').get();
    let proto='n/a';try{await rtImport({app:'TY-DIL',format:1,collections:{"__proto__":{polluted:{a:1}},cards:{"__proto__":{a:1}}}});proto=({}).polluted===undefined?'safe':'POLLUTED';}catch(e){proto='threw '+e.message;}
    return {hasKey,same:g.data().f===big&&g.data().n.deep[1].x==='ö',proto,keys:Object.keys(ex)};});
  ok(!r.hasKey,'export does not contain API key (keys: '+r.keys.join()+')');
  ok(r.same,'export/import unicode + control chars round-trip');
  ok(r.proto==='safe','import with __proto__ keys does not pollute prototype: '+r.proto);await ctx.close();}
 // B6: onSnapshot fan-out after import: N subscribers × collections → each called once per emit
 {const {p,ctx}=await open();
  const r=await p.evaluate(async()=>{const db=await claude.use('db');let n=0;for(let i=0;i<5;i++)db.collection('cards').onSnapshot(()=>n++);await new Promise(r=>setTimeout(r,10));const before=n;const coll={};for(let i=0;i<300;i++)coll['c'+i]={f:'x'+i};
    const t0=performance.now();await rtImport({app:'TY-DIL',format:1,collections:{cards:coll}});return {before,after:n,ms:Math.round(performance.now()-t0)};});
  ok(r.after-r.before===5,'import emits once per subscriber ('+(r.after-r.before)+'), 300 docs in '+r.ms+'ms (sequential idbPut per doc)');await ctx.close();}
 // B7: large set() throughput — 200 sequential doc writes (one txn each)
 {const {p,ctx}=await open();
  const r=await p.evaluate(async()=>{const db=await claude.use('db');const t0=performance.now();for(let i=0;i<200;i++)await db.collection('days').doc('d'+i).set({i});return Math.round(performance.now()-t0);});
  ok(r<4000,'200 sequential set() = '+r+'ms');await ctx.close();}
 await b.close();srv.close();console.log('errors',errs);console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
