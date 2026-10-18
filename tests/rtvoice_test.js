/* Canlı ses (Gemini Live, WebSocket + ses taklidi): Ayarlar anahtarı, bağlantı akışı, olaylar → durum/altyazı/döküm, söz kesme, düşüş */
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

 const RTMOCK=()=>{window.__rt={sent:[],ws:[],played:0,stopped:0};
   navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[{enabled:true,stop(){this.stopped=true;}}]});
   class AC{constructor(o){this.sampleRate=(o&&o.sampleRate)||48000;this.currentTime=0;this.destination={};}resume(){}close(){this.closed=true;}
     createMediaStreamSource(){return {connect(){},disconnect(){}};}createScriptProcessor(){const p={connect(){},disconnect(){}};__rt.proc=p;return p;}createGain(){return {gain:{value:1},connect(){}};}
     createBuffer(ch,n,r){const d=new Float32Array(n);return {duration:n/r,copyToChannel(f){d.set(f);},getChannelData(){return d;}};}
     createBufferSource(){const s={connect(){},start(){__rt.played++;setTimeout(()=>{s.onended&&s.onended();},__rt.playMs||30);},stop(){__rt.stopped++;}};return s;}}
   window.AudioContext=AC;window.webkitAudioContext=AC;
   window.WebSocket=class{constructor(u){this.url=u;this.readyState=0;__rt.ws.push(this);setTimeout(()=>{if(__rt.failModel&&!this._f){}this.readyState=1;this.onopen&&this.onopen();},10);}
     send(x){const j=JSON.parse(x);__rt.sent.push(j);if(j.setup){const m=j.setup.model;setTimeout(()=>{if(__rt.badKey){this.readyState=3;this.onclose&&this.onclose({code:1008,reason:'API key not valid. Please pass a valid API key.'});return;}
         if(__rt.failModel&&/3\.1-flash/.test(m)){this.readyState=3;this.onclose&&this.onclose({code:1008,reason:'models/gemini-3.1-flash-live-preview is not found for API version v1beta'});return;}
         this.onmessage&&this.onmessage({data:JSON.stringify({setupComplete:{}})});},10);}}
     close(){this.readyState=3;this.closedByApp=true;}};
   window.__ev=o=>{const w=__rt.ws[__rt.ws.length-1];w.onmessage({data:new Blob([JSON.stringify(o)])});};
   window.__aud=()=>btoa(String.fromCharCode(...new Uint8Array(480)));};
 const mk=async(o)=>{o=o||{};const st={oai:[]};const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Istanbul',serviceWorkers:'block'});const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   await p.addInitScript(H.clockScript(WED));await p.addInitScript(MOCK);await p.addInitScript(RTMOCK);if(o.badKey)await p.addInitScript(()=>{__rt.badKey=true;});if(o.failModel)await p.addInitScript(()=>{__rt.failModel=true;});
   await p.addInitScript(k=>{localStorage.setItem('tydil.apiKey','sk-ant-test');localStorage.setItem('tydil-tip-pin','1');if(k)localStorage.setItem('tydil.geminiKey',k);},o.gem||'');
   await p.route('https://generativelanguage.googleapis.com/**',route=>{st.oai.push({u:route.request().url()});route.fulfill({status:o.bad?400:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:o.bad?'{"error":{"message":"API key not valid"}}':'{"models":[]}'});});
   await H.mockApi(p,st,handler);await p.goto(srv.base+'/index.html');
   await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),SEED);await p.reload();await p.waitForTimeout(600);return {p,ctx,st};};
 const kst=p=>p.evaluate(()=>{const o=document.querySelector('#kcOrb');return o?o.dataset.st:'';});
 const G='AIzaSyAbcdefghijklmnopqrstuvwxyz0123456';
 // A) Ayarlar: Gemini anahtarı
 {const {p,ctx,st}=await mk();await H.tab(p,'setup');await sleep(200);
  ok(await p.isVisible('#gemCard')&&/Kapalı/.test(await p.textContent('#gemState'))&&/ücretsiz/.test(await p.textContent('#gemTitle')),'Ayarlar: Canlı ses (Gemini · ücretsiz) kartı, Kapalı');
  await p.fill('#gemKey','sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxx');await p.click('#btnGemSave');ok(/Gemini anahtarı değil/.test(await p.textContent('#gemMsg')),'yanlış anahtar biçimi reddedilir');
  await p.fill('#gemKey',G);await p.click('#btnGemSave');await sleep(300);
  ok(/Açık/.test(await p.textContent('#gemState'))&&await p.evaluate(()=>localStorage.getItem('tydil.geminiKey'))===G,'geçerli anahtar test edilip kaydedildi');
  ok(st.oai.some(x=>/v1beta\/models/.test(x.u)&&x.u.includes(G)),'kayıt öncesi models ile test');
  const N='AQ.Ab8RN6Lk'+'x9_Yq-Zt3W'.repeat(5);await p.click('#btnGemDel');await p.fill('#gemKey','  '+N+'\n');await p.click('#btnGemSave');await sleep(300);
  ok(await p.evaluate(()=>localStorage.getItem('tydil.geminiKey'))===N,'yeni (uzun, AIza olmayan) anahtar biçimi de kabul edilir, boşluk temizlenir');
  await ctx.close();}
 // B) Canlı görüşme
 {const {p,ctx,st}=await mk({gem:G});
  await p.click('[data-tab=konus]');await p.waitForSelector('#kStart');ok(/Canlı ses açık/.test(await p.textContent('#konusMount')),'Konuş: Canlı ses açık notu');
  await p.click('#kStart');await p.waitForSelector('#kc:not([hidden])');
  await p.waitForFunction(()=>__rt.sent.some(x=>x.clientContent),null,{timeout:5000});
  const su=await p.evaluate(()=>__rt.sent.find(x=>x.setup).setup);const url=await p.evaluate(()=>__rt.ws[0].url);
  ok(/BidiGenerateContent\?key=AIza/.test(url)&&/live/.test(su.model)&&su.generationConfig.responseModalities[0]==='AUDIO'&&/SPEAKING MODE/.test(su.systemInstruction.parts[0].text)&&su.inputAudioTranscription&&su.outputAudioTranscription,'setup: '+su.model+', ses yanıtı, koç talimatı, iki yönlü döküm');
  ok(!st.reqs.length,'canlı modda Anthropic isteği yok');
  await p.evaluate(()=>__rt.proc.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(4800).fill(0.1)}}));
  ok(await p.evaluate(()=>{const a=__rt.sent.find(x=>x.realtimeInput);return a&&a.realtimeInput.audio.mimeType==='audio/pcm;rate=16000'&&a.realtimeInput.audio.data.length>100;}),'mikrofon: 16 kHz PCM parçaları gönderiliyor');
  await p.evaluate(()=>{__rt.playMs=400;__ev({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:__aud()}}]},outputTranscription:{text:'Hi Türab! How long'}}});});
  ok((await kst(p))==='speaking'&&await p.evaluate(()=>__rt.played)>=1,'koç sesi çalıyor');
  const gate=await p.evaluate(()=>{const n0=__rt.sent.length;__rt.proc.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(4800).fill(0.01)}});const q=__rt.sent.slice(n0).filter(x=>x.realtimeInput).pop();return q&&/^A+=*$/.test(q.realtimeInput.audio.data);});
  ok(gate,'yankı kapısı: koç konuşurken hoparlör sesi (düşük seviye) sessizlik olarak gider, koçu kesmez');
  await p.evaluate(()=>{__ev({serverContent:{outputTranscription:{text:' have you run your crew?'}}});__ev({serverContent:{turnComplete:true}});});await sleep(600);
  ok((await kst(p))==='listening','koç bitti → dinliyor');
  await p.evaluate(()=>{__ev({serverContent:{inputTranscription:{text:'I am running it '}}});__ev({serverContent:{inputTranscription:{text:'since 2024'}}});});
  ok(/since 2024/.test(await p.textContent('#kcCap')),'konuşman altyazıda');
  await p.evaluate(()=>{__ev({serverContent:{modelTurn:{parts:[{inlineData:{data:__aud()}}]},outputTranscription:{text:'Oh nice, so'}}});});
  await p.evaluate(()=>__ev({serverContent:{interrupted:true}}));
  ok((await kst(p))==='listening'&&await p.evaluate(()=>__rt.stopped)>=1,'söz kesme: koç sesi anında susar');
  await p.click('#kcMic');ok((await kst(p))==='idle','Duraklat');await p.click('#kcMic');ok((await kst(p))==='listening','Devam');
  const turns=await p.evaluate(()=>TYLESSON.state().K.call.turns.map(t=>t.role+':'+t.content));ok(/assistant:Hi Türab! How long have you run your crew\?/.test(turns.join('|'))&&/user:I am running it since 2024/.test(turns.join('|'))&&/Oh nice, so —/.test(turns.join('|')),'döküm: '+JSON.stringify(turns));
  await p.click('#kcEnd');await sleep(800);ok(await p.evaluate(()=>__rt.ws[0].closedByApp),'Bitir: bağlantı kapandı');
  await ctx.close();}
 // C) İlk model yoksa sıradakine geçer
 {const {p,ctx}=await mk({gem:G,failModel:true});await p.click('[data-tab=konus]');await p.click('#kStart');
  await p.waitForFunction(()=>__rt.sent.some(x=>x.clientContent),null,{timeout:5000});
  ok(await p.evaluate(()=>__rt.ws.length===2&&/3\.8-live/.test(__rt.sent.filter(x=>x.setup)[1].setup.model)),'model bulunamadı → sıradaki modelle bağlandı');await ctx.close();}
 // D) Anahtar reddedilirse normal görüşmeye düşer
 {const {p,ctx,st}=await mk({gem:G,badKey:true});await p.click('[data-tab=konus]');await p.click('#kStart');await sleep(1200);
  ok(/reddedildi/.test(await p.textContent('#kcHint'))&&st.reqs.length>=1,'anahtar geçersiz → uyarı + normal (Claude) görüşme');await ctx.close();}
 // E) QR aktarım Gemini anahtarını da taşır
 {const {p,ctx}=await mk();const K='sk-ant-api03-'+'Ab9_-'.repeat(19)+'XyZ0';
  const r=await p.evaluate(([k,g])=>TYRT.applyTransfer('https://x/#k='+k+'&gm='+g),[K,G]);
  ok(r.key==='ok'&&await p.evaluate(()=>localStorage.getItem('tydil.geminiKey'))===G,'QR: &gm= ile Gemini anahtarı da geldi');await ctx.close();}
 console.log('errors',JSON.stringify(errs));ok(!errs.length,'no page errors / dialogs');
 await b.close();srv.close();const f=H.fails();console.log(f?'FAILED '+f:'ALL PASS');process.exit(f?1:0);})();
