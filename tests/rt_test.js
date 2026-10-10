/* rt.js sözleşme testi: db (IndexedDB + localStorage yedeği), yedek dışa/içe aktarma, sample (SSE, araç döngüsü, hata eşleme, iptal)
   NODE_PATH=$(npm root -g) node tests/rt_test.js */
const H=require('./_h.js');const {ok,sleep,sse}=H;
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const open=async(o)=>{o=o||{};const ctx=await b.newContext();const p=await ctx.newPage();
   p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push('console '+m.text());});
   if(o.noIdb)await p.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw new Error('idb kapalı');}});});
   if(o.key!==undefined)await p.addInitScript(k=>localStorage.setItem('tydil.apiKey',k),o.key);
   await p.goto(srv.base+'/tests/rt_page.html');return {p,ctx};};

 // ---- DB ----
 for(const noIdb of [false,true]){const tag=noIdb?'[localStorage]':'[IndexedDB]';
  const {p,ctx}=await open({noIdb});
  const r=await p.evaluate(async()=>{const db=await claude.use("db");const out={mode:TYRT.mode,snaps:[]};
    const c=db.collection("cards");const un=c.onSnapshot(s=>out.snaps.push(s.docs.map(d=>[d.id,d.exists,d.data()])));
    await new Promise(r=>setTimeout(r,20));out.first=out.snaps.length;                       // ilk görüntü hemen gelir (boş)
    const a=await c.add({f:"casa",tr:"ev",box:1});out.addId=a.id;
    await c.doc("x1").set({f:"luce",tr:"ışık"});await c.doc("x1").update({box:3});await c.doc("yok").update({f:"nuovo"});   // update yoksa oluşturur
    const g=await c.doc("x1").get();out.get=[g.exists,g.id,g.data()];const g2=await c.doc("hic").get();out.missing=[g2.exists,g2.data()];
    const d=g.data();d.f="DEĞİŞ";const g3=await c.doc("x1").get();out.immut=g3.data().f;          // data() kopyadır
    await c.doc("yok").delete();await new Promise(r=>setTimeout(r,20));out.n=out.snaps.length;un();await c.doc("x1").update({box:4});await new Promise(r=>setTimeout(r,20));out.afterUn=out.snaps.length;
    out.last=out.snaps[out.snaps.length-1];
    const s=db.collection("sessions");await s.doc("a").set({date:"2026-10-08",total:45});const u=await claude.use("user");out.user=u;return out;});
  ok(r.mode===(noIdb?'local':'idb'),tag+' mode '+r.mode);
  ok(r.first===1&&r.snaps[0].length===0,tag+' onSnapshot fires immediately with current (empty) docs');
  ok(r.addId&&r.get[0]===true&&r.get[1]==='x1'&&r.get[2].box===3&&r.get[2].f==='luce',tag+' add/set/update/get '+JSON.stringify(r.get));
  ok(r.missing[0]===false&&r.missing[1]===undefined,tag+' missing doc → exists:false');
  ok(r.immut==='luce',tag+' data() returns a copy');
  ok(r.n>=6&&r.afterUn===r.n,tag+' snapshot per change ('+r.n+'), unsubscribe stops it');
  ok(r.last.length===2&&r.last.every(x=>x[1]===true)&&!r.last.some(x=>x[0]==='yok'),tag+' final snapshot: 2 docs, deleted gone');
  ok(r.user&&r.user.name==='Türab',tag+' claude.use("user") → {name:"Türab"}');
  await p.reload();
  const r2=await p.evaluate(async()=>{const db=await claude.use("db");const g=await db.collection("cards").doc("x1").get();const s=await db.collection("sessions").doc("a").get();
    let snap=null;db.collection("cards").onSnapshot(q=>snap=q.docs.length);await new Promise(r=>setTimeout(r,20));return {x1:g.data(),a:s.data(),snap,mode:TYRT.mode};});
  ok(r2.x1&&r2.x1.box===4&&r2.a&&r2.a.total===45&&r2.snap===2,tag+' persists across reload '+JSON.stringify(r2));
  // yedek
  const ex=await p.evaluate(()=>{localStorage.setItem('dilOgren_v4',JSON.stringify({v:4,units:{u1:{done:true}}}));return rtExport();});
  ok(ex.app==='TY-DIL'&&ex.format===1&&ex.created&&ex.collections.cards.x1.box===4&&ex.collections.sessions.a.total===45&&ex.ty&&ex.ty.units.u1.done===true,tag+' rtExport format + legacy blob');
  const im=await p.evaluate(async e=>{localStorage.removeItem('dilOgren_v4');const db=await claude.use("db");await db.collection("cards").doc("x1").delete();await db.collection("cards").doc("z").set({f:"z"});
    const r=await rtImport(JSON.stringify(e));const g=await db.collection("cards").doc("x1").get();const z=await db.collection("cards").doc("z").get();return {r,x1:g.data(),z:z.exists,ty:localStorage.getItem('dilOgren_v4')};},ex);
  ok(im.r.docs===3&&im.x1&&im.x1.box===4&&im.z===false&&/u1/.test(im.ty||''),tag+' rtImport replaces store + restores legacy blob '+JSON.stringify(im.r));
  await p.reload();const im2=await p.evaluate(async()=>{const db=await claude.use("db");const g=await db.collection("cards").doc("x1").get();const z=await db.collection("cards").doc("z").get();return [g.data()&&g.data().box,z.exists];});
  ok(im2[0]===4&&im2[1]===false,tag+' import persisted after reload');
  const bad=await p.evaluate(async()=>{const o=[];for(const x of ['{','{"app":"X"}','{"app":"TY-DIL"}'])try{await rtImport(x);o.push('ok');}catch(e){o.push(e.message);}return o;});
  ok(bad.length===3&&bad.every(x=>x!=='ok'),tag+' bad import rejected: '+bad.join(' | '));
  await ctx.close();}

 // ---- SAMPLE ----
 {const {p,ctx}=await open({key:'sk-ant-test'});const st={};
  let mode='text';
  await H.mockApi(p,st,req=>{
    if(mode==='text')return {sse:[{text:'Ciao, Türab! '},{text:'Come stai?'}]};
    if(mode==='tools'){if(!req.cont)return {sse:[{text:'Kaydediyorum. '},{tool:{id:'t1',name:'kelime_ekle',input:{lang:'it',items:[{f:'la casa',tr:'ev'}]}}},{tool:{id:'t2',name:'bozuk',input:{}}}]};
      return {sse:[{text:'Eklendi.'}]};}
    if(mode==='max')return {sse:[{text:'Uzun uzun'},{stop:'max_tokens'}]};
    if(mode==='loop')return req.cont&&req.msgs.length>20?{sse:[{text:'son'}]}:{sse:[{tool:{name:'kelime_ekle',input:{lang:'it',items:[]}}}]};
    if(mode==='refusal')return {sse:[{text:''},{stop:'refusal'}]};
    if(mode==='401')return {status:401,body:JSON.stringify({error:{type:'authentication_error',message:'invalid x-api-key'}})};
    if(mode==='429')return {status:429,body:JSON.stringify({error:{type:'rate_limit_error',message:'slow'}})};
    if(mode==='529')return {status:529,body:JSON.stringify({error:{type:'overloaded_error',message:'busy'}})};
    if(mode==='400')return {status:400,body:JSON.stringify({error:{type:'invalid_request_error',message:'messages: bad'}})};
    if(mode==='400big')return {status:400,body:JSON.stringify({error:{type:'invalid_request_error',message:'prompt is too long: 300000 tokens'}})};
    if(mode==='net')return {abort:true};
    if(mode==='slow')return {delay:1500,sse:[{text:'geç'}]};
    if(mode==='errev')return {sse:[{text:'yarım'}],};
    return {sse:[{text:'?'}]};});
  const run=(turns,o)=>p.evaluate(async([turns,o])=>{const s=await claude.use("sample");const texts=[];const tools=[{name:'kelime_ekle',description:'ekle',inputSchema:{type:'object',properties:{lang:{type:'string'}}},execute:async(inp,ctx)=>{window.__tool=[inp,!!(ctx&&ctx.signal)];return {eklendi:(inp.items||[]).length};}}];
    try{const r=await s(turns,Object.assign({onText:({text})=>texts.push(text),tools:o&&o.tools===false?undefined:tools},o&&o.sig?{signal:(window.__ctl=new AbortController()).signal}:{}));return {ok:true,r,texts,tool:window.__tool};}
    catch(e){return {ok:false,code:e.code,message:e.message,text:e.text,texts};}},[turns,o||{}]);
  const T=[{role:'user',content:'SİSTEM BAĞLAMI'},{role:'user',content:'Ciao'}];
  let r=await run(T);
  ok(r.ok&&r.r.text==='Ciao, Türab! Come stai?'&&r.r.truncated===false,'text stream → {text,truncated:false} '+JSON.stringify(r.r));
  ok(r.texts.length>2&&r.texts[r.texts.length-1]===r.r.text&&r.texts.every((t,i)=>i===0||t.startsWith(r.texts[i-1])),'onText cumulative ('+r.texts.length+' updates)');
  let body=st.reqs[st.reqs.length-1];
  ok(body.system==='SİSTEM BAĞLAMI'&&body.messages.length===1&&body.messages[0].role==='user'&&body.messages[0].content==='Ciao'&&body.stream===true&&body.model==='claude-sonnet-5-5'&&body.max_tokens===2048,'request: first user turn → system, rest → messages, model+stream '+JSON.stringify({system:body.system,messages:body.messages,model:body.model}));
  ok(body.tools&&body.tools[0].name==='kelime_ekle'&&body.tools[0].input_schema&&body.tools[0].input_schema.type==='object'&&!body.tools[0].execute,'tools sent as {name,description,input_schema}');
  ok(body.tools[body.tools.length-1].cache_control&&body.tools[body.tools.length-1].cache_control.type==='ephemeral','prompt caching: last tool carries cache_control ephemeral');
  // blok bağlam: sabit blok önbellekli, canlı blok değil
  r=await run([{role:'user',content:[{type:'text',text:'SABİT',cache:true},{type:'text',text:'CANLI'}]},{role:'user',content:'Ciao'}]);body=st.reqs[st.reqs.length-1];
  ok(Array.isArray(body.system)&&body.system.length===2&&body.system[0].text==='SABİT'&&body.system[0].cache_control&&body.system[0].cache_control.type==='ephemeral'&&body.system[1].text==='CANLI'&&!body.system[1].cache_control&&body.messages.length===1&&body.messages[0].content==='Ciao','prompt caching: block context → system [static+cache_control, live]; headers anthropic-version 2023-06-01 + direct-browser-access (mock enforces)');
  const kv=await p.evaluate(()=>{let err='';try{TYRT.setKey('hello');}catch(e){err=e.code;}return {err,has:TYRT.hasKey(),v:[TYRT.validKey('sk-ant-api03-'+'A'.repeat(60)),TYRT.validKey(' sk-ant-'+'B'.repeat(40)+' '),TYRT.validKey('sk-ant-x'),TYRT.validKey('ant-'+'C'.repeat(60))]};});
  ok(kv.err==='invalid_key'&&kv.has===true&&kv.v.join()==='true,true,false,false','setKey rejects non sk-ant- keys (invalid_key), existing key kept; validKey: sk-ant- + ≥40 chars, trims');
  // assistant-first history (no system) keeps roles
  r=await run([{role:'user',content:'S'},{role:'assistant',content:'A'},{role:'user',content:'B'}]);body=st.reqs[st.reqs.length-1];
  ok(!body.system&&body.messages.length===3&&body.messages.map(m=>m.role).join()==='user,assistant,user','user,assistant,user history: no system, 3 messages');
  mode='tools';r=await run(T);
  ok(r.ok&&r.r.text==='Kaydediyorum. \n\nEklendi.'&&r.tool&&r.tool[0].lang==='it','tool_use round-trip: execute(input,{signal}) ran, text accumulated across rounds '+JSON.stringify(r.r));
  body=st.reqs[st.reqs.length-1];const asst=body.messages[body.messages.length-2],tr=body.messages[body.messages.length-1];
  ok(asst.role==='assistant'&&asst.content.some(x=>x.type==='tool_use'&&x.id==='t1'&&x.name==='kelime_ekle')&&asst.content.some(x=>x.type==='text')&&tr.role==='user'&&tr.content.length===2&&tr.content[0].type==='tool_result'&&tr.content[0].tool_use_id==='t1'&&/eklendi/.test(tr.content[0].content)&&tr.content[1].is_error===true,'second request carries assistant blocks + tool_result (unknown tool → is_error)');
  mode='max';r=await run(T);ok(r.ok&&r.r.truncated===true,'stop_reason max_tokens → truncated');
  mode='loop';r=await run(T);ok(r.ok&&st.reqs.length>=5,'agentic loop capped (ran '+st.reqs.length+' requests)');
  mode='tools';r=await run(T,{tools:false});ok(!r.ok&&r.code==='tools_unavailable','tool_use without tools → tools_unavailable');
  mode='refusal';r=await run(T);ok(!r.ok&&r.code==='refused','stop_reason refusal → refused');
  mode='401';r=await run(T);ok(!r.ok&&r.code==='session_expired','401 → session_expired');
  mode='429';r=await run(T);ok(!r.ok&&r.code==='rate_limited','429 → rate_limited');
  mode='529';r=await run(T);ok(!r.ok&&r.code==='rate_limited','529 → rate_limited');
  mode='400';r=await run(T);ok(!r.ok&&r.code==='upstream_error'&&/bad/.test(r.message),'400 → upstream_error with message');
  mode='400big';r=await run(T);ok(!r.ok&&r.code==='prompt_too_large','400 prompt too long → prompt_too_large');
  mode='net';r=await run(T);ok(!r.ok&&r.code==='upstream_error','network failure → upstream_error');
  mode='slow';const abortP=run(T,{sig:true});await sleep(300);await p.evaluate(()=>window.__ctl.abort());r=await abortP;
  ok(!r.ok&&r.code==='cancelled'&&typeof r.text==='string','abort → cancelled (+ partial .text)');
  // anahtar yok
  await p.evaluate(()=>TYRT.setKey(''));mode='text';r=await run(T);ok(!r.ok&&r.code==='capability_disabled','no key → capability_disabled');
  ok(await p.evaluate(()=>!TYRT.hasKey()),'TYRT.hasKey false after clearing');
  await p.evaluate(()=>TYRT.setSettings({model:'claude-opus-5-5'}));await p.evaluate(()=>TYRT.setKey('sk-ant-x'));r=await run(T);body=st.reqs[st.reqs.length-1];
  ok(r.ok&&body.model==='claude-opus-5-5','model from settings used');
  ok(await p.evaluate(()=>TYRT.setSettings({model:'yok'}).model)==='claude-sonnet-5-5','unknown model falls back to default');
  const t=await p.evaluate(async()=>{try{const r=await TYRT.testKey('sk-ant-x');return r;}catch(e){return {err:e.code};}});ok(t.ok===true,'testKey → ok');
  mode='401';const t2=await p.evaluate(async()=>{try{return await TYRT.testKey('sk-ant-bad');}catch(e){return {err:e.code};}});ok(t2.err==='session_expired','testKey bad key → session_expired');
  await ctx.close();}
 await b.close();srv.close();console.log('errors',errs);ok(!errs.length,'no page errors');console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
