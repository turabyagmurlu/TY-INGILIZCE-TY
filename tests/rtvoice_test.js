/* Canlı ses (OpenAI Realtime, WebRTC taklidi): Ayarlar anahtarı, bağlantı akışı, olaylar → durum/altyazı/döküm, söz kesme, düşüş */
const H=require('./_h.js');const {ok,sleep,AT}=H;const fs=require('fs');const path=require('path');
const MOCK=fs.readFileSync(path.join(__dirname,'voice_test.js'),'utf8').match(/const MOCK=`([\s\S]*?)`;/)[1];
const WED=AT(2026,10,14,9);
const SEED={program:{main:{start:'2026-09-28',weeks:12,dailyMin:60,mode:'yogun'}}};
const SHOTS=path.join(H.ROOT,'review/shots_v9');fs.mkdirSync(SHOTS,{recursive:true});
const OPEN='**Hi Türab!** 😀 I\'m Oliver from the site office. | How long have you # been running your crew?';
const REPLY='Oh, you\'ve been running it since 2024, that\'s a while! What\'s the hardest part of the job right now?';
const SUM={duzeltmeler:[{sen:'I am running it since 2024',dogal:'I\'ve been running it since 2024'},{sen:'We was late',dogal:'We were late'}],ifadeler:[{x:'to keep things on track',tr:'işleri yolunda tutmak'},{x:'a tight deadline',tr:'sıkışık teslim tarihi'},{x:'to sort it out',tr:'halletmek'}],ipucu:'Süre anlatırken have been + -ing kullan.'};
function handler(req,st){const s=req.system;st.log=st.log||[];
  if(/Türkçesini TEK satırda/.test(s)||/Türkçesini TEK satırda/.test(req.lastText)){st.log.push('tr');return {sse:[{text:'Merhaba Türab! Ben Oliver. Ekibini ne zamandır yönetiyorsun?'}]};}
  if(/SPEAKING MODE|KONUŞMA MODU/.test(s)){
    if(/CALL IS OVER|GÖRÜŞME BİTTİ/.test(req.lastText)){st.log.push('sum');return {sse:[{text:'Here you go:\n'+JSON.stringify(SUM)}]};}
    const users=req.msgs.filter(m=>m.role==='user').length; st.log.push('turn:'+req.lastText);
    if(/The call has started|Görüşme başladı/.test(req.lastText))return {sse:[{text:OPEN}]};
    return {delay:st.delay||0,sse:[{text:REPLY}]};}
  return {sse:[{text:'ok'}]};}
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];

 const RTMOCK=()=>{window.__rt={sent:[],pcs:[]};
   navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[{enabled:true,stop(){this.stopped=true;}}]});
   window.RTCPeerConnection=class{constructor(){__rt.pcs.push(this);this.connectionState='new';}addTrack(){}createDataChannel(n){this.dc={label:n,readyState:'connecting',send:x=>__rt.sent.push(JSON.parse(x)),close(){}};return this.dc;}
     async createOffer(){return {type:'offer',sdp:'v=0 OFFER'};}async setLocalDescription(){}async setRemoteDescription(a){this.answer=a;setTimeout(()=>{this.dc.readyState='open';this.dc.onopen&&this.dc.onopen();},10);}close(){this.closed=true;}};
   window.__rtEv=o=>{const pc=__rt.pcs[__rt.pcs.length-1];pc.dc.onmessage({data:JSON.stringify(o)});};};
 const mk=async(o)=>{o=o||{};const st={oai:[]};const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Istanbul',serviceWorkers:'block'});const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   await p.addInitScript(H.clockScript(WED));await p.addInitScript(MOCK);await p.addInitScript(RTMOCK);
   await p.addInitScript(k=>{localStorage.setItem('tydil.apiKey','sk-ant-test');localStorage.setItem('tydil-tip-pin','1');if(k)localStorage.setItem('tydil.openaiKey',k);},o.oai||'');
   await p.route('https://api.openai.com/**',async route=>{const r=route.request(),u=r.url();st.oai.push({u,auth:r.headers()['authorization'],body:r.postData()});
     const H0={'access-control-allow-origin':'*'};
     if(/\/models/.test(u))return route.fulfill({status:o.bad?401:200,headers:H0,contentType:'application/json',body:o.bad?'{"error":{"message":"Incorrect API key"}}':'{"data":[]}'});
     if(/client_secrets/.test(u))return route.fulfill({status:o.bad?401:200,headers:H0,contentType:'application/json',body:o.bad?'{"error":{"message":"bad key"}}':'{"value":"ek_eph123"}'});
     if(/\/calls/.test(u))return route.fulfill({status:200,headers:H0,contentType:'application/sdp',body:'v=0 ANSWER'});
     return route.fulfill({status:404,headers:H0,body:'{}'});});
   await H.mockApi(p,st,handler);await p.goto(srv.base+'/index.html');
   await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),SEED);await p.reload();await p.waitForTimeout(600);return {p,ctx,st};};
 const kst=p=>p.evaluate(()=>{const o=document.querySelector('#kcOrb');return o?o.dataset.st:'';});
 // A) Ayarlar: OpenAI anahtarı kaydet
 {const {p,ctx,st}=await mk();await H.tab(p,'setup');await sleep(200);
  ok(await p.isVisible('#oaiCard')&&/Kapalı/.test(await p.textContent('#oaiState')),'Ayarlar: Canlı ses kartı, Kapalı');
  await p.fill('#oaiKey','sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxx');await p.click('#btnOaiSave');ok(/OpenAI anahtarı değil/.test(await p.textContent('#oaiMsg')),'Anthropic anahtarı reddedilir');
  await p.fill('#oaiKey','sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123');await p.click('#btnOaiSave');await sleep(300);
  ok(/Açık/.test(await p.textContent('#oaiState'))&&await p.evaluate(()=>localStorage.getItem('tydil.openaiKey'))==='sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123','geçerli anahtar test edilip kaydedildi');
  ok(st.oai.some(x=>/\/models/.test(x.u)&&/Bearer sk-proj/.test(x.auth)),'kayıt öncesi /v1/models ile test');
  await ctx.close();}
 // B) Canlı görüşme
 {const {p,ctx,st}=await mk({oai:'sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123'});
  await p.click('[data-tab=konus]');await p.click('#kStart');await p.waitForSelector('#kc:not([hidden])');
  await p.waitForFunction(()=>__rt.sent.some(x=>x.type==='response.create'),null,{timeout:5000});
  const cs=st.oai.find(x=>/client_secrets/.test(x.u)), call=st.oai.find(x=>/\/calls/.test(x.u));const sess=JSON.parse(cs.body).session;
  ok(sess.type==='realtime'&&/realtime/.test(sess.model)&&/SPEAKING MODE/.test(sess.instructions)&&sess.audio.input.turn_detection.type==='semantic_vad','client_secrets: session (model '+sess.model+', koç talimatı, semantic VAD)');
  ok(call&&call.auth==='Bearer ek_eph123'&&call.body==='v=0 OFFER','SDP geçici anahtarla /v1/realtime/calls');
  ok(await p.evaluate(()=>__rt.pcs[0].answer.sdp==='v=0 ANSWER'&&__rt.pcs[0].dc.label==='oai-events'),'WebRTC cevabı uygulandı, oai-events kanalı');
  ok(!st.reqs.length,'canlı modda Anthropic isteği yok (ses doğrudan)');
  await p.evaluate(()=>{__rtEv({type:'response.output_audio_transcript.delta',delta:'Hi Türab! How long'});});ok((await kst(p))==='speaking','koç konuşuyor');
  await p.evaluate(()=>{__rtEv({type:'response.output_audio_transcript.done',transcript:'Hi Türab! How long have you run your crew?'});__rtEv({type:'output_audio_buffer.stopped'});});
  ok((await kst(p))==='listening','koç bitti → dinliyor');
  await p.evaluate(()=>{__rtEv({type:'input_audio_buffer.speech_started'});__rtEv({type:'input_audio_buffer.committed',item_id:'it1'});__rtEv({type:'conversation.item.input_audio_transcription.completed',item_id:'it1',transcript:'I am running it since 2024'});});
  ok(/since 2024/.test(await p.textContent('#kcCap')),'konuşman altyazıda');
  await p.evaluate(()=>{__rtEv({type:'response.output_audio_transcript.delta',delta:'Oh nice'});});await p.click('#kcOrb');
  ok(await p.evaluate(()=>__rt.sent.some(x=>x.type==='response.cancel')&&__rt.sent.some(x=>x.type==='output_audio_buffer.clear')),'küre: koç susturulur (response.cancel)');
  await p.click('#kcMic');ok((await kst(p))==='idle','Duraklat');await p.click('#kcMic');ok((await kst(p))==='listening','Devam');
  const turns=await p.evaluate(()=>TYLESSON.state().K.call.turns.map(t=>t.role+':'+t.content));ok(turns.length>=2&&/user:I am running it since 2024/.test(turns.join('|')),'döküm: '+JSON.stringify(turns));
  await p.click('#kcEnd').catch(async()=>{await p.keyboard.press('Escape');});await sleep(800);
  ok(await p.evaluate(()=>__rt.pcs[0].closed),'Bitir: bağlantı kapandı');
  await ctx.close();}
 // C) Anahtar reddedilirse normal görüşmeye düşer
 {const {p,ctx,st}=await mk({oai:'sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123',bad:true});
  await p.click('[data-tab=konus]');await p.click('#kStart');await p.waitForSelector('#kc:not([hidden])');await sleep(900);
  ok(/reddedildi/.test(await p.textContent('#kcHint'))&&st.reqs.length>=1,'401 → uyarı + normal (Claude) görüşmeye devam');
  await ctx.close();}
 // D) QR aktarım OpenAI anahtarını da taşır
 {const {p,ctx}=await mk();const K='sk-ant-api03-'+'Ab9_-'.repeat(19)+'XyZ0';
  const r=await p.evaluate(k=>TYRT.applyTransfer('https://x/#k='+k+'&o=sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123'),K);
  ok(r.key==='ok'&&await p.evaluate(()=>localStorage.getItem('tydil.openaiKey'))==='sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123','QR: &o= ile OpenAI anahtarı da geldi');
  await ctx.close();}
 console.log('errors',JSON.stringify(errs));ok(!errs.length,'no page errors / dialogs');
 await b.close();srv.close();const f=H.fails();console.log(f?'FAILED '+f:'ALL PASS');process.exit(f?1:0);})();
