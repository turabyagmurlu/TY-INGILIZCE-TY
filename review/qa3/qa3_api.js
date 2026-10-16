/* QA3: Messages API request validity (strict), error → Turkish UI + lesson block does not advance, key containment.
   NODE_PATH=$(npm root -g) node review/qa3/qa3_api.js */
const H=require('../../tests/_h.js');const {ok,sleep,AT}=H;
const THU=AT(2026,10,8,9);
const PROG=s=>({program:{main:{start:s||'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}}});
const KEY='sk-ant-api03-QA3SECRETKEY_abcdefghijklmnopqrstuvwxyz0123456789';
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const open=async(o,at)=>{o=o||{};const st={};const ctx=await b.newContext({viewport:{width:375,height:812},timezoneId:'Europe/Istanbul'});const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG');d.dismiss();});
   if(at!=null)await p.addInitScript(H.clockScript(at));
   await p.addInitScript(k=>localStorage.setItem('tydil.apiKey',k),o.key||KEY);
   await H.mockApi(p,st,o.handler);
   await p.goto(srv.base+'/index.html');
   if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
   await p.waitForTimeout(500);return {p,ctx,st};};
 const idle=p=>p.waitForFunction(()=>!document.querySelector('.cc-row.live')&&document.querySelector('#ccStop').hidden,null,{timeout:10000});
 const steps=p=>p.$$eval('#dersSteps .dStep',e=>e.map(x=>(x.classList.contains('done')?'+':x.classList.contains('cur')?'>':'-')+x.querySelector('.dsl').textContent));
 const next=async(p)=>{await p.waitForTimeout(1250);await p.click('#dersNext');await p.waitForFunction(()=>!!document.querySelector('.cc-row.live')||document.querySelector('#dersNext').hidden||document.querySelector('#dersNext').disabled,null,{timeout:3000}).catch(()=>{});await idle(p);await p.waitForTimeout(250);};

 /* ---- 1) strict request validation over a real lesson flow (start + wrap-up with tool loop) ---- */
 {const {p,ctx,st}=await open({seed:PROG()},THU);const reqMeta=[];
  p.on('request',r=>{if(/api\.anthropic\.com/.test(r.url()))reqMeta.push({url:r.url(),method:r.method(),headers:r.headers()});});
  await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);
  await next(p);  // Gramer wrap → seans_kaydet tool_use → tool_result → continuation
  await p.fill('#ccIn','il cavo = kablo');await p.press('#ccIn','Enter');await idle(p);
  ok(reqMeta.length>=3&&reqMeta.every(r=>r.url==='https://api.anthropic.com/v1/messages'&&r.method==='POST'),'URL https://api.anthropic.com/v1/messages POST ('+reqMeta.length+' requests)');
  ok(reqMeta.every(r=>r.headers['x-api-key']===KEY&&r.headers['anthropic-version']==='2023-06-01'&&r.headers['anthropic-dangerous-direct-browser-access']==='true'&&/^application\/json/.test(r.headers['content-type'])),'headers: x-api-key, anthropic-version 2023-06-01, dangerous-direct-browser-access true, content-type json');
  ok(reqMeta.every(r=>!r.headers['authorization']),'no Authorization header (x-api-key only)');
  const problems=[];
  st.reqs.forEach((bd,n)=>{
    if(typeof bd.model!=='string'||!/^claude-/.test(bd.model))problems.push(n+': model '+bd.model);
    if(!(Number.isInteger(bd.max_tokens)&&bd.max_tokens>0))problems.push(n+': max_tokens');
    if(bd.stream!==true)problems.push(n+': stream');
    const allowed=new Set(['model','max_tokens','messages','stream','system','tools']);Object.keys(bd).forEach(k=>{if(!allowed.has(k))problems.push(n+': unknown top-level '+k);});
    if(bd.system!==undefined){ if(typeof bd.system==='string'){if(!bd.system)problems.push(n+': empty system');} else if(!Array.isArray(bd.system)||!bd.system.length||!bd.system.every(x=>x.type==='text'&&typeof x.text==='string'&&x.text.length&&(!x.cache_control||x.cache_control.type==='ephemeral')))problems.push(n+': system blocks');}
    let cc=0;(Array.isArray(bd.system)?bd.system:[]).forEach(x=>{if(x.cache_control)cc++;});(bd.tools||[]).forEach(t=>{if(t.cache_control)cc++;});if(cc>4)problems.push(n+': cache_control breakpoints '+cc+' > 4');
    if(bd.tools){ if(!Array.isArray(bd.tools)||!bd.tools.length)problems.push(n+': tools empty array');
      bd.tools.forEach(t=>{if(!/^[a-zA-Z0-9_-]{1,64}$/.test(t.name))problems.push(n+': tool name '+t.name); if(!t.input_schema||t.input_schema.type!=='object')problems.push(n+': input_schema '+t.name); const ks=Object.keys(t);ks.forEach(k=>{if(!['name','description','input_schema','cache_control'].includes(k))problems.push(n+': tool key '+k);});
        if(t.input_schema.required&&!t.input_schema.required.every(r=>t.input_schema.properties&&t.input_schema.properties[r]))problems.push(n+': required not in properties '+t.name);});}
    const M=bd.messages; if(!Array.isArray(M)||!M.length){problems.push(n+': messages empty');return;}
    if(M[0].role!=='user')problems.push(n+': first role '+M[0].role);
    for(let i=1;i<M.length;i++)if(M[i].role===M[i-1].role)problems.push(n+': roles not alternating at '+i);
    M.forEach((m,i)=>{ if(typeof m.content==='string'){if(!m.content.trim())problems.push(n+': empty string content at '+i);return;}
      if(!Array.isArray(m.content)||!m.content.length){problems.push(n+': empty content array at '+i);return;}
      m.content.forEach(bk=>{ if(bk.type==='text'){if(!bk.text||!bk.text.trim())problems.push(n+': empty text block at '+i);}
        else if(bk.type==='tool_use'){if(m.role!=='assistant'||!bk.id||!bk.name||typeof bk.input!=='object')problems.push(n+': bad tool_use at '+i);}
        else if(bk.type==='tool_result'){if(m.role!=='user'||!bk.tool_use_id||typeof bk.content!=='string')problems.push(n+': bad tool_result at '+i);}
        else problems.push(n+': unknown block type '+bk.type+' at '+i);});});
    // tool_result ids must match previous assistant tool_use ids, 1:1
    for(let i=1;i<M.length;i++){const m=M[i];if(Array.isArray(m.content)&&m.content.some(x=>x.type==='tool_result')){const prev=M[i-1];const ids=(Array.isArray(prev.content)?prev.content:[]).filter(x=>x.type==='tool_use').map(x=>x.id).sort();const rids=m.content.filter(x=>x.type==='tool_result').map(x=>x.tool_use_id).sort();if(JSON.stringify(ids)!==JSON.stringify(rids))problems.push(n+': tool_result ids mismatch at '+i+' '+ids+' vs '+rids);}}
  });
  ok(!problems.length,'all '+st.reqs.length+' request bodies valid for Messages API (model, max_tokens, system blocks, tools, alternation, tool loop) '+problems.slice(0,6).join(' | '));
  const withTR=st.reqs.find(bd=>bd.messages.some(m=>Array.isArray(m.content)&&m.content.some(x=>x.type==='tool_result')));
  ok(!!withTR,'tool_use → tool_result continuation request observed');
  console.log('  sample body sizes (bytes):',st.reqs.map(b=>JSON.stringify(b).length).join(', '));
  await ctx.close();}

 /* ---- 2) errors during lesson wrap-up: Turkish message, block stays, retry offered ---- */
 const cases=[
  ['529 overloaded',{status:529,body:JSON.stringify({type:'error',error:{type:'overloaded_error',message:'Overloaded'}})},/Çok sık istek gitti ya da kullanım limitine takıldın/],
  ['429 rate_limit',{status:429,body:JSON.stringify({type:'error',error:{type:'rate_limit_error',message:'Rate limited'}})},/Çok sık istek gitti/],
  ['403 permission',{status:403,body:JSON.stringify({type:'error',error:{type:'permission_error',message:'nope'}})},/Bu anahtar bu modele erişemiyor \/ izin yok/],
  ['401 auth',{status:401,body:JSON.stringify({type:'error',error:{type:'authentication_error',message:'invalid x-api-key'}})},/API anahtarı geçersiz/],
  ['500 api_error',{status:500,body:JSON.stringify({type:'error',error:{type:'api_error',message:'boom'}})},/Bağlantı koptu ya da Claude geçici olarak yanıt vermedi/],
  ['network abort',{abort:true},/Bağlantı koptu/],
  ['SSE error overloaded mid-stream',{status:200,body:H.sse([{text:'Kaydediyorum… '}]).replace('event: message_delta','event: error\ndata: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\n\nevent: message_delta')},/Çok sık istek gitti/],
  ['400 prompt too long',{status:400,body:JSON.stringify({type:'error',error:{type:'invalid_request_error',message:'prompt is too long: 210000 tokens > 200000 maximum'}})},/Sohbet çok uzadı/],
 ];
 for(const [name,fail,re] of cases){
  const {p,ctx,st}=await open({seed:PROG()},THU);
  await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);
  const s0=await steps(p);
  st.fail=()=>true;st.failStatus=fail.status;
  // override handler result for the failure shape
  const h=H.coachReply;await H.mockApi(p,st,(req,st2)=>fail.abort?{abort:true}:fail.status===200?{status:200,body:fail.body}:{status:fail.status,body:fail.body});
  await next(p);
  const log=await p.textContent('#ccLog');const s1=await steps(p);
  const locked=/401|403/.test(name);
  ok(re.test(log),name+': Turkish message shown');
  ok(s1[0]===s0[0]&&s0[0]==='>Gramer'&&!s1[0].startsWith('+'),name+': block not advanced ('+s1[0]+')');
  if(locked){ok(await p.isDisabled('#ccIn')&&/Sohbet kapalı/.test(await p.textContent('#dersAlt'))&&/Kayıtsız bitir/.test(await p.textContent('#dersNext'))&&await p.isHidden('#dersRetry'),name+': chat locked (input disabled, "Sohbet kapalı", Kayıtsız bitir) until key re-entered');
    await p.evaluate(k=>TYRT.setKey(k),KEY);await p.waitForFunction(()=>!TYDIL.chat.state.locked,null,{timeout:3000});await p.waitForTimeout(1200);}
  ok(await p.isVisible('#dersRetry')&&await p.isVisible('#dersSkip'),name+': Tekrar dene + Kaydetmeden geç offered'+(locked?' after key re-entry (tydil:key unlocks)':''));
  const sess=await p.evaluate(()=>rtExport().collections.sessions||{});ok(!Object.keys(sess).length,name+': no session recorded');
  { // retry succeeds → advance
    await H.mockApi(p,st,null);st.fail=null;await p.click('#dersRetry');await idle(p);await p.waitForTimeout(300);
    const s2=await steps(p);ok(s2[0]==='+Gramer'&&s2[1]==='>Kelime',name+': retry → advanced '+s2.slice(0,2).join(' '));}
  await ctx.close();}

 /* ---- 3) key containment ---- */
 {const {p,ctx,st}=await open({seed:PROG()},THU);const seen=[];const logs=[];
  p.on('console',m=>logs.push(m.text()));
  p.on('request',r=>{const h=r.headers();const pd=r.postData()||'';const where=[];if(r.url().includes(KEY))where.push('url');if(pd.includes(KEY))where.push('body');Object.entries(h).forEach(([k,v])=>{if(String(v).includes(KEY))where.push('header:'+k);});if(where.length)seen.push({url:r.url().slice(0,60),where});});
  await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);await next(p);
  await p.click('#dersExit');await p.waitForTimeout(300);await H.tab(p,'setup');await p.waitForTimeout(300);
  const bad=seen.filter(s=>!(s.url.startsWith('https://api.anthropic.com')&&s.where.length===1&&s.where[0]==='header:x-api-key'));
  ok(seen.length>0&&!bad.length,'key appears only in x-api-key header to api.anthropic.com ('+seen.length+' reqs) '+JSON.stringify(bad).slice(0,200));
  ok(!logs.some(l=>l.includes(KEY)),'key never printed to console');
  const exp=await p.evaluate(()=>JSON.stringify(rtExport()));ok(!exp.includes(KEY)&&!exp.includes('QA3SECRET'),'backup export excludes key');
  const dom=await p.evaluate(()=>document.documentElement.outerHTML);ok(!dom.includes(KEY),'full key not present in DOM (masked in Ayarlar)');
  const stor=await p.evaluate(async()=>{const o={ss:Object.keys(sessionStorage).map(k=>sessionStorage.getItem(k)).join(''),ls:Object.keys(localStorage).filter(k=>k!=='tydil.apiKey').map(k=>localStorage.getItem(k)).join('')};
    const d=await new Promise((res,rej)=>{const r=indexedDB.open('tydil',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
    const rows=await new Promise((res,rej)=>{const q=d.transaction('docs').objectStore('docs').getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});o.idb=JSON.stringify(rows);return o;});
  ok(!stor.ss.includes(KEY)&&!stor.ls.includes(KEY)&&!stor.idb.includes(KEY),'key not in sessionStorage / other LS keys / IndexedDB');
  const sysHasKey=st.reqs.some(b=>JSON.stringify(b).includes(KEY));ok(!sysHasKey,'key not inside request body (system/messages)');
  const inp=await p.evaluate(()=>{const i=document.querySelector('#apiKey');return {type:i.type,ac:i.getAttribute('autocomplete'),val:i.value};});
  ok(inp.type==='password'&&inp.val==='','Ayarlar key input is type=password and not prefilled with the key (autocomplete='+inp.ac+')');
  await ctx.close();}

 ok(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
 await b.close();srv.close();console.log('errors',JSON.stringify(errs.slice(0,5)));console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
