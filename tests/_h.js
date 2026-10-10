/* Ortak test yardımcıları: statik sunucu (python3 -m http.server, boş port), Playwright, Anthropic API için SSE taklidi.
   Çalıştırma: NODE_PATH=$(npm root -g) node tests/<x>.js */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const net=require('net');const http=require('http');const {spawn}=require('child_process');
const ROOT=path.resolve(__dirname,'..');
const SHOTS=path.join(__dirname,'shots');
let fails=0;
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c){fails++;process.exitCode=1;}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function freePort(){return new Promise((res,rej)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p));});s.on('error',rej);});}
function get(url){return new Promise((res,rej)=>{http.get(url,r=>{let d='';r.setEncoding('utf8');r.on('data',c=>d+=c);r.on('end',()=>res({status:r.statusCode,body:d}));}).on('error',rej);});}
/* Sunucu: repo kökünden servis; eski bir sunucu kalmış olmasın diye yeni port + servis edilen index.html dosya içeriğiyle karşılaştırılır */
async function serve(){const port=await freePort();const proc=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
  const base=`http://127.0.0.1:${port}`;let up=false;for(let i=0;i<50&&!up;i++){try{const r=await get(base+'/index.html');up=r.status===200;}catch(e){await sleep(100);}}
  if(!up)throw new Error('server did not start');
  const disk=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');const served=(await get(base+'/index.html')).body;
  if(served!==disk)throw new Error('served index.html differs from disk (stale server?)');
  return {base,port,close:()=>{try{proc.kill();}catch(e){}}};}
/* SSE gövdesi: parça listesi → metin. Parçalar: {text}, {tool:{id,name,input}}, {stop:"end_turn"|"tool_use"|"max_tokens"}. Metin 12 karakterlik delta'larla verilir. */
function sse(parts,opt){opt=opt||{};const ev=[];const E=(t,d)=>ev.push(`event: ${t}\ndata: ${JSON.stringify(Object.assign({type:t},d))}\n\n`);
  E('message_start',{message:{id:'msg_'+Math.random().toString(36).slice(2,8),type:'message',role:'assistant',model:opt.model||'claude-sonnet-5-5',content:[],stop_reason:null,usage:{input_tokens:10,output_tokens:1}}});
  let i=0,stop='end_turn';
  for(const p of parts){if(p.stop){stop=p.stop;continue;}
    if(p.text!=null){E('content_block_start',{index:i,content_block:{type:'text',text:''}});for(const ch of (p.text.match(/[\s\S]{1,12}/g)||[]))E('content_block_delta',{index:i,delta:{type:'text_delta',text:ch}});E('content_block_stop',{index:i});i++;}
    else if(p.tool){const js=JSON.stringify(p.tool.input||{});E('content_block_start',{index:i,content_block:{type:'tool_use',id:p.tool.id||('toolu_'+Math.random().toString(36).slice(2,10)),name:p.tool.name,input:{}}});
      for(const ch of (js.match(/[\s\S]{1,20}/g)||[]))E('content_block_delta',{index:i,delta:{type:'input_json_delta',partial_json:ch}});E('content_block_stop',{index:i});i++;stop='tool_use';}}
  E('message_delta',{delta:{stop_reason:stop,stop_sequence:null},usage:{output_tokens:20}});E('message_stop',{});
  return ev.join('');}
/* İstek gövdesinden: ajan (system), son öğrenci metni, araç sonuçları (devam turu mu) */
function parseReq(body){const b=typeof body==='string'?JSON.parse(body):body;const msgs=b.messages||[];const last=msgs[msgs.length-1]||{};
  const cont=Array.isArray(last.content);const results=cont?last.content.filter(x=>x.type==='tool_result'):[];
  let lastText='';for(let i=msgs.length-1;i>=0;i--){const m=msgs[i];if(m.role==='user'&&typeof m.content==='string'){lastText=m.content;break;}}
  const system=Array.isArray(b.system)?b.system.map(x=>x&&x.text||'').join('\n'):(b.system||'');
  const agent=/AJAN: CHIARA/.test(system)?'it':/AJAN: OLIVER/.test(system)?'en':/AJAN: SELİN/.test(system)?'db':'';
  return {b,msgs,last,cont,results,lastText,agent,system,tools:(b.tools||[]).map(t=>t.name)};}
/* Taklit koç: focus_test'in mantığı, Messages API üzerinden. state: {itDk, calls[], res[]} */
const PLAN={'Kelime':['kelime',10],'Gramer':['gramer',20],'Okuma-yazma':['okuma',10],'Sesli tekrar':['sesli',5],'Kelime tekrarı':['kelime',15],'Mini sınav':['gramer',25],'Sınav':['gramer',30]};
function coachReply(req,st){const {agent,lastText,cont,results}=req;
  if(cont){st.res.push(...results.map(r=>[r.tool_use_id,r.content,!!r.is_error]));}
  else st.calls.push({first:req.system,last:lastText,n:req.msgs.filter(m=>typeof m.content==='string').length+1,tools:req.tools});
  const fin=/bitiriyorum/.test(lastText), blk=(/\(([^)]+)\)/.exec(lastText)||[])[1];
  if(st.fail&&st.fail(req))return {status:st.failStatus||500,body:JSON.stringify({type:'error',error:{type:'api_error',message:'taklit hata'}})};
  if(agent==='it'){
    if(fin&&PLAN[blk]){const [k,v]=PLAN[blk];
      if(!cont){st.itDk[k]=v;return {sse:[{text:'Tamam, kaydediyorum. '},{tool:{name:'seans_kaydet',input:{lang:'it',dk:Object.assign({},st.itDk),hatalar:k==='gramer'||k==='kelime'?['il/lo artikel']:[],sonraki:'it02 · Selamlaşma'}}}]};}
      return {sse:[{text:'**Özet:** '+blk+' bitti.'}]};}
    if(/başlat/.test(lastText)&&!cont)return {sse:[{text:'**1/4 · Kelime · 10 dk**\n\n'},{tool:{name:'kelime_ekle',input:{lang:'it',items:[{f:'il cavo',tr:'kablo'},{f:'la luce',tr:'ışık'}]}}}]};
    return {sse:[{text:(cont?'':'**1/4 · Kelime · 10 dk**\n\n')+'| İtalyanca | Okunuş | Türkçe |\n|---|---|---|\n| [[it: il cavo]] | il KA-vo | kablo |\n| [[it: la luce]] | la LU-çe | ışık |\n\n**Il cavo** ne demek?'}]};}
  if(agent==='en'){
    if(fin){if(!cont)return {sse:[{text:'Good work. '},{tool:{name:'kelime_ekle',input:{lang:'en',items:[{f:'to sort out',tr:'halletmek'}]}}},{tool:{name:'seans_kaydet',input:{lang:'en',dk:{speaking:15},hatalar:['since/for'],sonraki:'it02 · Selamlaşma'}}}]};
      return {sse:[{text:'**Daha doğal:** [[en: I have been working here since 2024.]]'}]};}
    return {sse:[{text:'[[en: Tell me about your crew. How long have you been running it?]]'}]};}
  return {sse:[{text:'**Ne?** Kısa açıklama.'}]};}
/* Sayfaya API taklidi bağla. handler(req,st) → {sse:[...]} | {status,body} | {delay} */
async function mockApi(page,st,handler){st.calls=st.calls||[];st.res=st.res||[];st.itDk=st.itDk||{};st.reqs=st.reqs||[];
  await page.route('https://api.anthropic.com/**',async route=>{const r=route.request();const req=parseReq(r.postData()||'{}');st.reqs.push(req.b);
    const h=r.headers();if(!h['x-api-key']||h['anthropic-version']!=='2023-06-01'||h['anthropic-dangerous-direct-browser-access']!=='true'){return route.fulfill({status:400,body:JSON.stringify({error:{type:'invalid_request_error',message:'başlık eksik'}})});}
    let out;try{out=await (handler||coachReply)(req,st);}catch(e){out={status:500,body:String(e)};}
    if(out.delay)await sleep(out.delay);
    if(out.abort)return route.abort('failed');
    if(out.status)return route.fulfill({status:out.status,contentType:'application/json',body:out.body||'{}'});
    return route.fulfill({status:200,contentType:'text/event-stream',body:sse(out.sse,out)});});}
/* Sabit başlangıç anı, saat akar */
const AT=(y,m,d,h,mi)=>Date.UTC(y,m-1,d,h,mi||0);
const clockScript=t=>`(()=>{const R=Date,off=${t}-R.now();class FD extends R{constructor(...a){super(...(a.length?a:[R.now()+off]))}static now(){return R.now()+off}};window.Date=FD;})()`;
async function browser(){return chromium.launch();}
module.exports={ROOT,SHOTS,ok,sleep,serve,sse,parseReq,coachReply,mockApi,AT,clockScript,browser,get,fails:()=>fails,PLAN};
