/* ---------- TY DİL · ÇALIŞMA ZAMANI (rt.js) ----------
   Dil Defteri kodu artifact çalışma zamanını bekler: window.claude.use("db" | "sample" | "user").
   Bu dosya aynı sözleşmeyi cihazda kurar:
     db     → IndexedDB (yoksa localStorage) üzerinde koleksiyon/belge deposu; onSnapshot yükleme bitince anında tetiklenir
     sample → kullanıcının kendi Anthropic API anahtarıyla doğrudan tarayıcıdan Messages API (akış + araç döngüsü)
     user   → {name}
   Ayrıca: TYRT (anahtar, ayarlar, bağlantı testi), rtExport()/rtImport() (yedek).
   Uygulama kodundan ÖNCE yüklenir. */
(function(){
"use strict";
const LS_KEY="tydil.apiKey", LS_SET="tydil.settings", LS_DB="tydil.db", LS_LEGACY="dilOgren_v4";
const COLLS=["sessions","topics","program","habits","exams","days","cards","chats","highlights"];
const MODELS=[
  {id:"claude-sonnet-5-5",name:"Claude Sonnet 5.5",note:"önerilen · hız ve kalite dengesi"},
  {id:"claude-opus-5-5",name:"Claude Opus 5.5",note:"daha güçlü · yaklaşık 2× pahalı"},
  {id:"claude-haiku-5-5",name:"Claude Haiku 5.5",note:"en ucuz ve en hızlı · basit işler"}
];
const DEFAULT_MODEL=MODELS[0].id, API_URL="https://api.anthropic.com/v1/messages", MAX_TOKENS=2048, MAX_ROUNDS=6;
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const lsGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch(e){return false;}};
const lsDel=k=>{try{localStorage.removeItem(k);}catch(e){}};

/* ===== ayarlar / anahtar ===== */
function getKey(){return (lsGet(LS_KEY)||"").trim();}
/* Anahtar biçimi: Anthropic anahtarları "sk-ant-" ile başlar; başka bir şey kaydedilmez (boş = sil) */
const KEY_RE=/^sk-ant-[A-Za-z0-9_-]+$/, KEY_MIN=40;
/* validKey: biçim + uzunluk (gerçek anahtarlar 100+ karakter; 40'tan kısası eksik yapıştırmadır) */
const validKey=k=>{k=String(k||"").trim(); return KEY_RE.test(k)&&k.length>=KEY_MIN;};
/* Anahtar durumu: none · ok (kayıtlı, doğrulandı ya da elle yüklendi) · pending (kaydedildi, bağlantı testi sürüyor) · bad (test başarısız; neden keyErr) */
let keyStatus="", keyErr=null;
function setKeyStatus(st,err){keyStatus=st; keyErr=err||null; fire("tydil:key",{has:!!getKey(),status:st,error:err?{code:err.code,message:err.message}:null});}
/* setKey(k,{verify:true}) → kaydeder, durumu pending yapar ve bağlantı testini başlatır (sonuç tydil:key ile duyurulur) */
function setKey(k,opt){k=String(k||"").trim(); if(k&&!KEY_RE.test(k)){const e=new Error("Anahtar sk-ant- ile başlamalı"); e.code="invalid_key"; throw e;} if(k)lsSet(LS_KEY,k); else lsDel(LS_KEY);
  if(!k){setKeyStatus("none"); return false;}
  if(!(opt&&opt.verify)){setKeyStatus("ok"); return true;}
  setKeyStatus("pending"); const mine=k;
  testKey(mine).then(r=>{if(getKey()===mine)setKeyStatus("ok");}).catch(e=>{if(getKey()===mine)setKeyStatus("bad",e);});
  return true;}
function getSettings(){let o={}; try{o=JSON.parse(lsGet(LS_SET)||"{}")||{};}catch(e){o={};} if(!MODELS.some(m=>m.id===o.model))o.model=DEFAULT_MODEL; return o;}
function setSettings(p){const o=Object.assign(getSettings(),p||{}); if(!MODELS.some(m=>m.id===o.model))o.model=DEFAULT_MODEL; lsSet(LS_SET,JSON.stringify(o)); fire("tydil:settings",o); return o;}
function fire(name,detail){try{document.dispatchEvent(new CustomEvent(name,{detail}));}catch(e){}}

/* ===== DB ===== */
const mem={}; COLLS.forEach(c=>mem[c]=new Map());
const subs={}; let idb=null, mode="idb", loadP=null;
function openIdb(){return new Promise((res,rej)=>{
  if(typeof indexedDB==="undefined")return rej(new Error("no idb"));
  let r; try{r=indexedDB.open("tydil",1);}catch(e){return rej(e);}
  r.onupgradeneeded=()=>{const d=r.result; if(!d.objectStoreNames.contains("docs"))d.createObjectStore("docs",{keyPath:"key"});};
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error||new Error("idb open")); r.onblocked=()=>rej(new Error("idb blocked"));});}
function idbAll(d){return new Promise((res,rej)=>{try{const t=d.transaction("docs","readonly"), q=t.objectStore("docs").getAll(); q.onsuccess=()=>res(q.result||[]); q.onerror=()=>rej(q.error);}catch(e){rej(e);}});}
function idbPut(rec){return new Promise((res,rej)=>{try{const t=idb.transaction("docs","readwrite"); t.objectStore("docs").put(rec); t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error||new Error("abort"));}catch(e){rej(e);}});}
function idbDel(key){return new Promise((res,rej)=>{try{const t=idb.transaction("docs","readwrite"); t.objectStore("docs").delete(key); t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error||new Error("abort"));}catch(e){rej(e);}});}
function idbClear(){return new Promise((res,rej)=>{try{const t=idb.transaction("docs","readwrite"); t.objectStore("docs").clear(); t.oncomplete=()=>res(); t.onerror=()=>rej(t.error);}catch(e){rej(e);}});}
function lsLoad(){let o=null; try{o=JSON.parse(lsGet(LS_DB)||"null");}catch(e){o=null;} if(o&&o.collections)Object.keys(o.collections).forEach(c=>{if(!mem[c])mem[c]=new Map(); Object.entries(o.collections[c]||{}).forEach(([id,v])=>mem[c].set(id,v));});}
function lsFlush(){const collections={}; Object.keys(mem).forEach(c=>{collections[c]={}; mem[c].forEach((v,id)=>collections[c][id]=v);}); return lsSet(LS_DB,JSON.stringify({format:1,collections}));}
function load(){ if(loadP)return loadP;
  loadP=(async()=>{ try{ idb=await openIdb(); const rows=await idbAll(idb);
      /* bozuk satır (coll/id yok) atlanır: "undefined" koleksiyonu oluşmasın */
      rows.forEach(r=>{if(!r||typeof r.coll!=="string"||!r.coll||r.id==null)return; if(!mem[r.coll])mem[r.coll]=new Map(); mem[r.coll].set(String(r.id),r.data);}); mode="idb";
      /* localStorage'da yedek varsa (IndexedDB'nin düştüğü dönemden; o dönemin yazımları yalnızca orada) belgeleri IndexedDB'ye taşı: LS sürümü kazanır, sonra LS silinir */
      const had=lsGet(LS_DB); if(had){ let o=null; try{o=JSON.parse(had);}catch(e){o=null;}
        if(o&&o.collections&&typeof o.collections==="object"){ for(const c of Object.keys(o.collections)){ const rowsC=o.collections[c]; if(!rowsC||typeof rowsC!=="object")continue; ensure(c);
            for(const [id,data] of Object.entries(rowsC)){ if(data===null||typeof data!=="object")continue; mem[c].set(String(id),data); try{await idbPut({key:c+"/"+id,coll:c,id:String(id),data});}catch(e){} } } }
        lsDel(LS_DB); } }
    catch(e){ idb=null; mode="local"; lsLoad(); } })();
  return loadP;}
async function persistSet(coll,id,data){ if(idb){try{await idbPut({key:coll+"/"+id,coll,id,data});return;}catch(e){idb=null;mode="local";}} lsFlush(); }
async function persistDel(coll,id){ if(idb){try{await idbDel(coll+"/"+id);return;}catch(e){idb=null;mode="local";}} lsFlush(); }
function snap(coll){return {docs:[...mem[coll].entries()].map(([id,v])=>({id,exists:true,data:()=>clone(v)}))};}
function emit(coll){const L=subs[coll]||[]; L.slice().forEach(f=>{try{f(snap(coll));}catch(e){}});}
function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function ensure(coll){if(!mem[coll])mem[coll]=new Map(); return mem[coll];}
function collection(name){ const coll=String(name); ensure(coll);
  return {
    onSnapshot(cb,errCb){ (subs[coll]=subs[coll]||[]).push(cb); let live=true; Promise.resolve().then(()=>{if(live){try{cb(snap(coll));}catch(e){if(errCb)errCb(e);}}});
      return ()=>{live=false; const L=subs[coll]||[]; const i=L.indexOf(cb); if(i>=0)L.splice(i,1);}; },
    doc(id){ id=String(id); return {
      id,
      async get(){ const v=mem[coll].get(id); return {id,exists:v!==undefined,data:()=>clone(v)}; },
      async set(obj){ const v=clone(obj===undefined?{}:obj); mem[coll].set(id,v); emit(coll); await persistSet(coll,id,v); bcPost(coll,id); },
      /* update: önce depodaki güncel belge (başka sekme yazmış olabilir), sonra birleştir */
      async update(partial){ if(bc){ try{ await rereadDoc(coll,id); }catch(e){} } const cur=mem[coll].get(id); const v=Object.assign({},cur||{},clone(partial||{})); mem[coll].set(id,v); emit(coll); await persistSet(coll,id,v); bcPost(coll,id); },
      async delete(){ if(!mem[coll].has(id))return; mem[coll].delete(id); emit(coll); await persistDel(coll,id); bcPost(coll,id,true); } }; },
    async add(obj){ const id=genId(); const v=clone(obj===undefined?{}:obj); mem[coll].set(id,v); emit(coll); await persistSet(coll,id,v); bcPost(coll,id); return {id}; }
  }; }
/* Sekmeler arası: her yazım "tydil" kanalından duyurulur; diğer sekme o belgeyi depodan yeniden okur ve abonelerine iletir */
let bc=null; try{ bc=typeof BroadcastChannel!=="undefined"?new BroadcastChannel("tydil"):null; }catch(e){ bc=null; }
const TAB=Math.random().toString(36).slice(2,10);
function bcPost(coll,id,del){ if(!bc)return; try{ bc.postMessage({tab:TAB,coll,id,del:!!del}); }catch(e){} }
async function rereadDoc(coll,id){ ensure(coll); if(idb){ try{ const v=await new Promise((res,rej)=>{const t=idb.transaction("docs","readonly"), q=t.objectStore("docs").get(coll+"/"+id); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error);});
      if(v&&v.data!==undefined) mem[coll].set(String(id),v.data); else mem[coll].delete(String(id)); return; }catch(e){} }
  let o=null; try{o=JSON.parse(lsGet(LS_DB)||"null");}catch(e){o=null;} const row=o&&o.collections&&o.collections[coll]?o.collections[coll][id]:undefined; if(row!==undefined) mem[coll].set(String(id),row); else mem[coll].delete(String(id)); }
if(bc) bc.onmessage=async ev=>{ const m=ev&&ev.data; if(!m||m.tab===TAB||typeof m.coll!=="string")return; try{ await rereadDoc(m.coll,String(m.id)); emit(m.coll); }catch(e){} };
const dbApi={collection, get mode(){return mode;}};

/* ===== yedek ===== */
function rtExport(){ const collections={}; Object.keys(mem).forEach(c=>{collections[c]={}; mem[c].forEach((v,id)=>collections[c][id]=v);});
  const out={app:"TY-DIL",format:1,created:new Date().toISOString(),collections}; const ty=lsGet(LS_LEGACY); if(ty){try{out.ty=JSON.parse(ty);}catch(e){out.ty=ty;}}
  const st=getSettings(); out.settings={model:st.model}; return out; }
/* Yedeği uygular: mevcut kayıtların yerine geçer (anahtar dokunulmaz). Döner: {collections:N, docs:N, ty:bool} */
async function rtImport(json){ let o=json; if(typeof json==="string"){try{o=JSON.parse(json);}catch(e){throw new Error("Yedek okunamadı (JSON hatası).");}}
  if(!o||typeof o!=="object"||o.app!=="TY-DIL"||!o.collections||typeof o.collections!=="object")throw new Error("Bu bir TY Dil yedeği değil.");
  await load(); let docs=0; const names=Object.keys(o.collections);
  if(idb){try{await idbClear();}catch(e){idb=null;mode="local";}}
  Object.keys(mem).forEach(c=>mem[c].clear());
  for(const c of names){const rows=o.collections[c]; if(!rows||typeof rows!=="object")continue; ensure(c);
    for(const [id,v] of Object.entries(rows)){ if(v===null||typeof v!=="object")continue; mem[c].set(String(id),clone(v)); docs++; if(idb){try{await idbPut({key:c+"/"+id,coll:c,id:String(id),data:v});}catch(e){idb=null;mode="local";}} } }
  if(!idb)lsFlush();
  if(o.ty!==undefined){lsSet(LS_LEGACY,typeof o.ty==="string"?o.ty:JSON.stringify(o.ty));}
  if(o.settings&&o.settings.model)setSettings({model:o.settings.model});
  Object.keys(mem).forEach(emit); return {collections:names.length,docs,ty:o.ty!==undefined}; }

/* ===== örnekleme (Messages API) ===== */
function rtErr(code,message,text){const e=new Error(message||code); e.code=code; if(text!=null)e.text=text; return e;}
function httpErr(status,body){ let msg="", type=""; try{const j=JSON.parse(body); msg=(j.error&&j.error.message)||""; type=(j.error&&j.error.type)||"";}catch(e){msg=String(body||"").slice(0,200);}
  if(status===401)return rtErr("session_expired",msg||"Anahtar reddedildi");
  if(status===403)return rtErr("permission_denied",msg||"İzin yok");
  if(status===429||status===529||type==="overloaded_error"||type==="rate_limit_error")return rtErr("rate_limited",msg||"Limit");
  if(status===400&&/prompt is too long|too many tokens|exceeds the maximum/i.test(msg))return rtErr("prompt_too_large",msg);
  if(status===400)return rtErr("upstream_error",msg||"İstek reddedildi (400)");
  return rtErr("upstream_error",msg||("HTTP "+status)); }
function toolSchema(t){return t.input_schema||t.inputSchema||{type:"object",properties:{}};}
/* turns → system + messages. İlk tur öğrenci (user) ve koç bağlamıysa (ccWindow her zaman ccContext'i başa koyar) system alanına taşınır.
   Bağlam metin (string) ya da blok listesi [{type:"text",text,cache:true}] olabilir: blok listesi system dizisine çevrilir,
   cache:true olan (sabit talimat) bloklara cache_control {type:"ephemeral"} konur → istem önbelleği (prompt caching); CANLI DURUM bloğu önbelleksiz kalır. */
const CACHE={type:"ephemeral"};
function sysBlocks(c){ if(typeof c==="string") return c; const out=[]; (Array.isArray(c)?c:[]).forEach(b=>{ if(!b)return; const text=typeof b==="string"?b:String(b.text||""); if(!text)return; const o={type:"text",text}; if(b&&b.cache)o.cache_control=CACHE; out.push(o); }); return out; }
function splitTurns(turns){ const T=(Array.isArray(turns)?turns:[]).filter(t=>t&&((typeof t.content==="string"&&t.content.length)||(Array.isArray(t.content)&&t.content.length))).map(t=>({role:t.role==="assistant"?"assistant":"user",content:t.content}));
  let system=""; if(T.length&&T[0].role==="user"&&(Array.isArray(T[0].content)||T.length===1||T[1].role==="user")){system=sysBlocks(T.shift().content);}
  for(let i=0;i<T.length;i++) if(typeof T[i].content!=="string") T[i].content=(Array.isArray(T[i].content)?T[i].content:[]).map(b=>typeof b==="string"?b:(b&&b.text)||"").filter(Boolean).join("\n\n");
  T.splice(0,T.length,...T.filter(t=>t.content.length));
  /* ardışık aynı rol birleşir (API sırayla user/assistant ister) */
  const M=[]; T.forEach(t=>{const l=M[M.length-1]; if(l&&l.role===t.role)l.content+="\n\n"+t.content; else M.push({role:t.role,content:t.content});});
  if(!M.length)M.push({role:"user",content:typeof system==="string"&&system?system:"Merhaba"}); if(M[0].role==="assistant")M.unshift({role:"user",content:"(devam)"});
  return {system,messages:M}; }
async function* sseLines(resp,signal){ const reader=resp.body.getReader(), dec=new TextDecoder(); let buf="";
  for(;;){ if(signal&&signal.aborted)throw rtErr("cancelled","İptal"); const {value,done}=await reader.read(); if(done)break; buf+=dec.decode(value,{stream:true});
    let i; while((i=buf.indexOf("\n"))>=0){ const line=buf.slice(0,i).replace(/\r$/,""); buf=buf.slice(i+1); yield line; } }
  if(buf.trim())yield buf; }
async function streamOnce(body,key,signal,onEvent){ let resp;
  try{ resp=await fetch(API_URL,{method:"POST",signal,headers:{"x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true","content-type":"application/json"},body:JSON.stringify(body)}); }
  catch(e){ if(signal&&signal.aborted||(e&&e.name==="AbortError"))throw rtErr("cancelled","İptal"); throw rtErr("upstream_error","Ağ hatası: "+(e&&e.message||e)); }
  if(!resp.ok){ let t=""; try{t=await resp.text();}catch(e){} throw httpErr(resp.status,t); }
  if(!resp.body){ /* akışsız yanıt */ const j=await resp.json(); onEvent({type:"message_start",message:j}); (j.content||[]).forEach((b,i)=>{onEvent({type:"content_block_start",index:i,content_block:b}); onEvent({type:"content_block_stop",index:i});}); onEvent({type:"message_delta",delta:{stop_reason:j.stop_reason}}); return; }
  let ev="", stopped=false; for await(const line of sseLines(resp,signal)){
    if(line.startsWith("event:")){ev=line.slice(6).trim();continue;}
    if(line.startsWith("data:")){ const d=line.slice(5).trim(); if(!d)continue; let j; try{j=JSON.parse(d);}catch(e){continue;} if(!j.type&&ev)j.type=ev; if(j.type==="message_stop")stopped=true; onEvent(j); }
    else if(!line.trim())ev=""; }
  /* akış message_stop gelmeden bitti (bağlantı koptu): yarım yanıt */
  if(!stopped) onEvent({type:"__incomplete"}); }
async function sample(turns,opts){ opts=opts||{}; const key=getKey(); const signal=opts.signal;
  if(!key)throw rtErr("capability_disabled","API anahtarı yok");
  const tools=(Array.isArray(opts.tools)?opts.tools:[]).filter(t=>t&&t.name), byName={}; tools.forEach(t=>byName[t.name]=t);
  const {system,messages}=splitTurns(turns); const model=getSettings().model||DEFAULT_MODEL;
  let text="", truncated=false, rounds=0; const onText=typeof opts.onText==="function"?opts.onText:null;
  const push=s=>{ if(!s)return; text+=s; if(onText){try{onText({text,delta:s});}catch(e){}} };
  for(;;){ if(signal&&signal.aborted)throw rtErr("cancelled","İptal",text);
    const body={model,max_tokens:MAX_TOKENS,messages,stream:true}; if(system&&system.length)body.system=system;
    if(tools.length){body.tools=tools.map(t=>({name:t.name,description:String(t.description||""),input_schema:toolSchema(t)})); body.tools[body.tools.length-1].cache_control=CACHE;}   /* araç tanımları sabit: son araca önbellek işareti */
    const blocks=[]; let stop=null, sep=text?"\n\n":"", apiErr=null, incomplete=false;
    try{ await streamOnce(body,key,signal,j=>{
      if(j.type==="content_block_start"){const b=j.content_block||{}; blocks[j.index]=b.type==="tool_use"?{type:"tool_use",id:b.id,name:b.name,json:"",input:b.input||{}}:{type:"text",text:b.text||""}; if(b.type==="text"&&b.text){push(sep+b.text);sep="";}}
      else if(j.type==="content_block_delta"){const b=blocks[j.index]; if(!b)return; const d=j.delta||{};
        if(d.type==="text_delta"&&b.type==="text"){b.text+=d.text||""; if(d.text){push(sep+d.text);sep="";}}
        else if(d.type==="input_json_delta"&&b.type==="tool_use")b.json+=d.partial_json||"";}
      else if(j.type==="content_block_stop"){const b=blocks[j.index]; if(b&&b.type==="tool_use"){try{b.input=b.json?JSON.parse(b.json):(b.input||{});}catch(e){b.input={};} delete b.json; if(blocks.some(x=>x&&x.type==="text"&&x.text))sep="\n\n";}}
      else if(j.type==="message_delta"){stop=(j.delta&&j.delta.stop_reason)||stop;}
      else if(j.type==="error"){apiErr=j.error||{};}
      else if(j.type==="__incomplete"){incomplete=true;} }); }
    catch(e){ if(e&&e.code==="cancelled")throw rtErr("cancelled","İptal",text); if(e&&e.code){e.text=text;throw e;} throw rtErr("upstream_error",String(e&&e.message||e),text); }
    if(apiErr){ const t=apiErr.type||""; const err=t==="overloaded_error"||t==="rate_limit_error"?rtErr("rate_limited",apiErr.message):t==="authentication_error"?rtErr("session_expired",apiErr.message):t==="permission_error"?rtErr("permission_denied",apiErr.message):rtErr("upstream_error",apiErr.message||"Akış hatası"); err.text=text; throw err; }
    if(incomplete&&stop!=="end_turn"&&stop!=="tool_use"){const err=rtErr("incomplete","Yanıt yarıda kesildi"); err.text=text; throw err;}
    if(stop==="max_tokens")truncated=true;
    if(stop==="refusal"){throw rtErr("refused","Yanıt verilmedi",text);}
    const uses=blocks.filter(b=>b&&b.type==="tool_use");
    if(stop!=="tool_use"||!uses.length)break;
    if(!tools.length)throw rtErr("tools_unavailable","Araç yok",text);
    rounds++; if(rounds>MAX_ROUNDS){break;}
    const content=blocks.filter(Boolean).map(b=>b.type==="text"?{type:"text",text:b.text||" "}:{type:"tool_use",id:b.id,name:b.name,input:b.input||{}}).filter(b=>b.type!=="text"||b.text.trim());
    messages.push({role:"assistant",content:content.length?content:[{type:"text",text:"…"}]});
    const results=[];
    for(const u of uses){ if(signal&&signal.aborted)throw rtErr("cancelled","İptal",text); const t=byName[u.name]; let out, isErr=false;
      if(!t||typeof t.execute!=="function"){out="Bilinmeyen araç: "+u.name; isErr=true;}
      else { try{ const r=await t.execute(u.input||{},{signal}); out=typeof r==="string"?r:JSON.stringify(r===undefined?{ok:true}:r); } catch(e){ out=String(e&&e.message||e); isErr=true; } }
      const tr={type:"tool_result",tool_use_id:u.id,content:String(out).slice(0,20000)}; if(isErr)tr.is_error=true; results.push(tr); }
    messages.push({role:"user",content:results}); }
  return {text,truncated}; }
sample.limits=async()=>({maxPromptBytes:400000,tools:{maxCount:16}});
/* Bağlantı testi: küçük bir istek. Döner {ok:true,model} ya da fırlatır (code ile) */
async function testKey(k){ const key=(k||getKey()).trim(); if(!key)throw rtErr("capability_disabled","Anahtar yok");
  let resp; try{ resp=await fetch(API_URL,{method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true","content-type":"application/json"},body:JSON.stringify({model:getSettings().model||DEFAULT_MODEL,max_tokens:8,messages:[{role:"user",content:"Say OK"}]})}); }
  catch(e){ throw rtErr("upstream_error","Ağ hatası: "+(e&&e.message||e)); }
  if(!resp.ok){ let t=""; try{t=await resp.text();}catch(e){} throw httpErr(resp.status,t); }
  let j={}; try{j=await resp.json();}catch(e){} return {ok:true,model:j.model||getSettings().model}; }
const userApi=()=>({name:(getSettings().name||"").trim()||"Türab"});

/* ===== window.claude ===== */
window.claude={ async use(name){ if(name==="db"){await load(); return dbApi;} if(name==="sample")return sample; if(name==="user")return userApi(); return null; } };
window.TYRT={MODELS,DEFAULT_MODEL,getKey,setKey,validKey,KEY_MIN,keyStatus:()=>keyStatus||(getKey()?"ok":"none"),keyError:()=>keyErr,hasKey:()=>!!getKey(),getSettings,setSettings,testKey,export:rtExport,import:rtImport,db:dbApi,get mode(){return mode;},ready:load};
window.rtExport=rtExport; window.rtImport=rtImport;
/* ===== QR ile anahtar aktarımı: adres "#k=sk-ant-…" ile açılırsa anahtar kaydedilir, adres hemen temizlenir.
   Parça (#…) sunucuya gitmez; uygulama kodu adresi okumadan önce temizlenir. Sonuç window.TYKEYIMPORT = "ok" | "bad". */
(function(){ let h=""; try{h=location.hash||"";}catch(e){} if(!/^#k=/.test(h))return; const m=/^#k=(sk-ant-[A-Za-z0-9_-]+)$/.exec(h);
  try{history.replaceState(null,"",location.pathname+location.search);}catch(e){try{location.hash="";}catch(_){}}
  if(m&&validKey(m[1])){try{setKey(m[1],{verify:true}); window.TYKEYIMPORT="ok";}catch(e){window.TYKEYIMPORT="bad";}} else window.TYKEYIMPORT="bad"; })();
})();
