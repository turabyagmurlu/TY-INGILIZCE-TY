/* Canlı ses (Gemini Live, WebSocket + ses taklidi): Ayarlar anahtarı, bağlantı akışı, olaylar → durum/altyazı/döküm, söz kesme, düşüş */
const H=require('./_h.js');const {ok,sleep,AT}=H;const fs=require('fs');const path=require('path');
const MOCK=fs.readFileSync(path.join(__dirname,'voice_test.js'),'utf8').match(/const MOCK=`([\s\S]*?)`;/)[1];
const WED=AT(2026,10,14,9);
const SEED={program:{main:{start:'2026-09-28',weeks:12,dailyMin:60,mode:'yogun'}},sessions:{'konus-2026-10-12-en':{date:'2026-10-12',lang:'en',src:'konus',mins:{speaking:10},total:10,mistakes:['We was late → We were late'],note:'Konuş'}}};
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
   class AC{constructor(o){this.sampleRate=(o&&o.sampleRate)||48000;this.t0=performance.now();this.destination={};}get currentTime(){return (performance.now()-this.t0)/1000;}resume(){}close(){this.closed=true;}
     createMediaStreamSource(){return {connect(){},disconnect(){}};}createScriptProcessor(){const p={connect(){},disconnect(){}};__rt.proc=p;return p;}createGain(){return {gain:{value:1},connect(){}};}
     createBuffer(ch,n,r){const d=new Float32Array(n);return {duration:n/r,copyToChannel(f){d.set(f);},getChannelData(){return d;}};}
     createBufferSource(){const s={connect(){},start(){__rt.played++;setTimeout(()=>{s.onended&&s.onended();},__rt.playMs||30);},stop(){__rt.stopped++;}};return s;}}
   window.AudioContext=AC;window.webkitAudioContext=AC;
   window.WebSocket=class{constructor(u){this.url=u;this.readyState=0;__rt.ws.push(this);setTimeout(()=>{if(__rt.failModel&&!this._f){}this.readyState=1;this.onopen&&this.onopen();},10);}
     send(x){const j=JSON.parse(x);__rt.sent.push(j);if(j.setup){const m=j.setup.model;setTimeout(()=>{if(__rt.badKey){this.readyState=3;this.onclose&&this.onclose({code:1008,reason:'API key not valid. Please pass a valid API key.'});return;}
         if(__rt.failModel&&/3\.1-flash/.test(m)){this.readyState=3;this.onclose&&this.onclose({code:1008,reason:'models/gemini-3.1-flash-live-preview is not found for API version v1beta'});return;}
         this.onmessage&&this.onmessage({data:JSON.stringify({setupComplete:{}})});},10);}}
     close(){this.readyState=3;this.closedByApp=true;}};
   window.__ev=o=>{const w=__rt.ws[__rt.ws.length-1];w.onmessage({data:__rt.blob?new Blob([JSON.stringify(o)]):JSON.stringify(o)});};
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
  await p.click('[data-tab=konus]');await p.waitForSelector('[data-kfix=akici]');await p.click('[data-kfix=akici]');
  ok(await p.evaluate(()=>localStorage.getItem('tydil.kfix'))==='akici'&&await p.getAttribute('[data-kfix=akici]','aria-checked')==='true','Düzeltme modu: Akıcı seçildi ve hatırlanıyor');
  await p.evaluate(()=>localStorage.removeItem('tydil.kfix'));
  await p.evaluate(()=>TYRT.setGem(''));await H.tab(p,'konus');await p.waitForSelector('#kGemIn');ok(await p.isVisible('#kGemIn')&&await p.isVisible('#konusMount [data-go=scan]'),'Konuş: anahtar yoksa alan + QR okut orada (telefon/tablet)');
  await p.fill('#kGemIn',G);await p.click('#kGemSave');await p.waitForFunction(()=>/Canlı ses açık/.test(document.querySelector('#konusMount').textContent),null,{timeout:4000}).catch(()=>{});
  ok(/Canlı ses açık/.test(await p.textContent('#konusMount'))&&await p.evaluate(()=>localStorage.getItem('tydil.geminiKey'))===G,'Konuş içinden anahtar kaydedildi → Canlı ses açık');
  await ctx.close();}
 // B) Canlı görüşme
 {const {p,ctx,st}=await mk({gem:G});
  await p.click('[data-tab=konus]');await p.waitForSelector('#kStart');ok(/Canlı ses açık/.test(await p.textContent('#konusMount')),'Konuş: Canlı ses açık notu');
  await p.click('#kStart');await p.waitForSelector('#kc:not([hidden])');
  await p.waitForFunction(()=>__rt.sent.some(x=>x.clientContent),null,{timeout:5000});
  const su=await p.evaluate(()=>__rt.sent.find(x=>x.setup).setup);const url=await p.evaluate(()=>__rt.ws[0].url);
  ok(/BidiGenerateContent\?key=AIza/.test(url)&&/live/.test(su.model)&&su.generationConfig.responseModalities[0]==='AUDIO'&&/SPEAKING MODE/.test(su.systemInstruction.parts[0].text)&&su.inputAudioTranscription&&su.outputAudioTranscription,'setup: '+su.model+', ses yanıtı, koç talimatı, iki yönlü döküm');
  ok(!st.reqs.length,'canlı modda Anthropic isteği yok');
  ok(su.realtimeInputConfig.automaticActivityDetection.disabled===true,'sıra cihazda: sunucu VAD kapalı');
  await p.evaluate(()=>{for(let k=0;k<4;k++)__rt.proc.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(4800).fill(0.1)}});});
  ok(await p.evaluate(()=>{const s=__rt.sent.filter(x=>x.realtimeInput);return s.some(x=>x.realtimeInput.activityStart)&&s.some(x=>x.realtimeInput.audio&&x.realtimeInput.audio.mimeType==='audio/pcm;rate=16000');}),'konuşma başladı: activityStart + 16 kHz PCM');
  await sleep(1000);await p.evaluate(()=>__rt.proc.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(4800).fill(0.002)}}));
  ok(await p.evaluate(()=>__rt.sent.some(x=>x.realtimeInput&&x.realtimeInput.activityEnd))&&(await kst(p))==='thinking','0,9 sn sessizlik → activityEnd, sıra koçta');
  await p.evaluate(()=>{__rt.playMs=400;__ev({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:__aud()}}]},outputTranscription:{text:'Hi Türab! How long'}}});});
  ok((await kst(p))==='speaking'&&await p.evaluate(()=>__rt.played)>=1,'koç sesi çalıyor');
  const gate=await p.evaluate(()=>{const n0=__rt.sent.length;__rt.proc.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(4800).fill(0.01)}});return __rt.sent.slice(n0).filter(x=>x.realtimeInput).length===0;});
  ok(gate,'yankı kapısı: koç konuşurken alçak ses (hoparlör yankısı) hiç gönderilmez, koçu kesmez');
  await p.evaluate(()=>{__ev({serverContent:{outputTranscription:{text:' have you run your crew?'}}});__ev({serverContent:{turnComplete:true}});});await sleep(600);
  ok((await kst(p))==='listening','koç bitti → dinliyor');
  await p.evaluate(()=>{__ev({serverContent:{inputTranscription:{text:'I am running it '}}});__ev({serverContent:{inputTranscription:{text:'since 2024'}}});});
  ok(/since 2024/.test(await p.textContent('#kcCap')),'konuşman altyazıda');
  await p.evaluate(()=>{__rt.playMs=3000;__ev({serverContent:{modelTurn:{parts:[{inlineData:{data:__aud()}}]},outputTranscription:{text:'Oh nice, so'}}});});await sleep(100);
  await p.evaluate(()=>{const n=__rt.sent.length;for(let k=0;k<3;k++)__rt.proc.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(4800).fill(0.25)}});window.__bi=__rt.sent.slice(n).some(x=>x.realtimeInput&&x.realtimeInput.activityStart);});
  ok((await kst(p))==='listening'&&await p.evaluate(()=>__rt.stopped)>=1&&await p.evaluate(()=>__bi),'söz kesme: yüksek sesle girince koç anında susar, activityStart gider');
  await sleep(1000);await p.evaluate(()=>__rt.proc.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(4800).fill(0.002)}}));
  await p.click('#kcMic');ok((await kst(p))==='idle','Duraklat');await p.click('#kcMic');ok((await kst(p))==='listening','Devam');
  const turns=await p.evaluate(()=>TYLESSON.state().K.call.turns.map(t=>t.role+':'+t.content));ok(/assistant:Hi Türab! How long have you run your crew\?/.test(turns.join('|'))&&/user:I am running it since 2024/.test(turns.join('|'))&&/Oh nice, so —/.test(turns.join('|')),'döküm: '+JSON.stringify(turns));
  await p.evaluate(()=>{__rt.blob=true;__ev({serverContent:{outputTranscription:{text:' BLOBTEST'}}});__rt.blob=false;});await sleep(200);
  ok(/BLOBTEST/.test(await p.textContent('#kcCap')),'ikili (Blob) çerçeveler de çözülüyor');
  // konuşmam bitti düğmesi: konuşurken bas → hemen activityEnd
  await p.evaluate(()=>__ev({serverContent:{turnComplete:true}}));await sleep(100);await p.evaluate(()=>{for(let k=0;k<4;k++)__rt.proc.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(4800).fill(0.1)}});});ok(await p.isVisible('#kcDone'),'"Konuşmam bitti" düğmesi görünür');const nb=await p.evaluate(()=>__rt.sent.length);await p.click('#kcDone');
  ok(await p.evaluate(n=>__rt.sent.slice(n).some(x=>x.realtimeInput&&x.realtimeInput.activityEnd),nb)&&(await kst(p))==='thinking','"Konuşmam bitti": beklemeden activityEnd, sıra koçta');
  // tanı: yerel ses → sunucu yanıtı → ses parçası süreleri (içerik yok)
  await p.evaluate(()=>{__rt.playMs=30;});await sleep(250);
  await p.evaluate(()=>{__ev({serverContent:{outputTranscription:{text:'Sure.'}}});__ev({serverContent:{modelTurn:{parts:[{inlineData:{data:__aud()}}]}}});__ev({serverContent:{turnComplete:true}});});await sleep(200);
  await p.click('#kcDiagT');const dg=await p.textContent('#kcDiag');
  ok(/Son tur/.test(dg)&&/sesi duyma \d/.test(dg)&&!/Sure/.test(dg),'Tanı paneli: son tur süreleri, içerik yok ('+dg.replace(/\s+/g,' ').slice(0,120)+')');
  const dj=await p.evaluate(()=>{const d=TYLESSON.state().K.call.rt.d;return {n:d.turns.length,first:d.turns[d.turns.length-1].first,aud:d.turns[d.turns.length-1].aud};});
  ok(dj.n>=1&&dj.first>=200&&dj.aud>=dj.first,'süreler mantıklı (yanıt '+dj.first+' ms, duyma '+dj.aud+' ms)');
  await sleep(200);await p.evaluate(()=>{for(let k=0;k<20;k++)__rt.proc.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(4800).fill(0.01)}});});const nq=await p.evaluate(()=>__rt.sent.length);ok((await kst(p))==='listening','alçak ses algılanmadı (dinliyor)');await p.click('#kcDone');
  ok(await p.evaluate(n=>{const s=__rt.sent.slice(n).filter(x=>x.realtimeInput);return s.length>=3&&s[0].realtimeInput.activityStart&&s[s.length-1].realtimeInput.activityEnd;},nq),'algılanmayan alçak konuşma "bitti" ile tampondan gönderilir');
  // oturum sürdürme: tanıtıcı gelir, bağlantı koparsa aynı konuşmaya yeniden bağlanır, açılış tekrar gönderilmez
  const su0=await p.evaluate(()=>__rt.sent.find(x=>x.setup).setup);ok(su0.contextWindowCompression&&su0.contextWindowCompression.slidingWindow&&su0.sessionResumption&&!su0.sessionResumption.handle,'setup: bağlam sıkıştırma + oturum sürdürme açık');
  await p.evaluate(()=>__ev({sessionResumptionUpdate:{newHandle:'h-123',resumable:true}}));await sleep(100);await p.evaluate(()=>{const w=__rt.ws[__rt.ws.length-1];w.readyState=3;w.onclose({code:1011,reason:''});});
  await p.waitForFunction(()=>__rt.sent.filter(x=>x.setup).length>=2,null,{timeout:4000}).catch(async()=>console.log('DBG',JSON.stringify(await p.evaluate(()=>{const R=TYLESSON.state().K.call.rt;return {has:!!R,h:R&&R.handle,rc:R&&R.rc,ws:__rt.ws.length,same:R&&R.ws===__rt.ws[__rt.ws.length-1],hint:document.querySelector('#kcHint').textContent};}))));await sleep(150);
  const rc=await p.evaluate(()=>{const S=__rt.sent.filter(x=>x.setup);const last=S[S.length-1].setup;const opens=__rt.sent.filter(x=>x.clientContent&&/call has started/.test(JSON.stringify(x))).length;return {h:last.sessionResumption.handle,opens,ws:__rt.ws.length};});
  ok(rc.h==='h-123'&&rc.opens===1,'kopma → tanıtıcıyla yeniden bağlandı, açılış iki kez gönderilmedi '+JSON.stringify(rc));
  const sys=su0.systemInstruction.parts[0].text;ok(/PARTNER RULES/.test(sys)&&/CORRECTION MODE: BALANCED/.test(sys)&&/do not give pronunciation scores/.test(sys)&&/RECURRING MISTAKES/.test(sys)&&/We was late → We were late/.test(sys),'koç talimatı: partner kuralları, Dengeli mod, telaffuz dürüstlüğü, önceki hatalar');
  await p.click('#kcEnd');await sleep(800);ok(await p.evaluate(()=>__rt.ws[__rt.ws.length-1].closedByApp),'Bitir: bağlantı kapandı');
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
