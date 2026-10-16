/* Konuş (telefon görüşmesi gibi): taklit SpeechRecognition + speechSynthesis ile sıra alma (koç konuşur → otomatik dinleme → 1,2 sn sessizlik → yanıt),
   küreye dokunarak kesme, Tekrar et (yavaş), Türkçesi?, Bitir özeti (düzeltme/ifade/ipucu) + seans kaydı + Kartlara ekle, sınırlı yeniden başlatma,
   ses tanıma yok / izin yok → yazı kutusu, okunan metinde | * # emoji yok. NODE_PATH=$(npm root -g) node tests/konus_test.js */
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
 const mk=async(o)=>{o=o||{};const st={};const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Istanbul',serviceWorkers:'block',colorScheme:o.dark?'dark':'light',reducedMotion:'reduce'});const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   await p.addInitScript(H.clockScript(WED));await p.addInitScript(MOCK);await p.addInitScript(()=>{localStorage.setItem('tydil.apiKey','sk-ant-test');localStorage.setItem('tydil-tip-pin','1');});
   await H.mockApi(p,st,handler);await p.goto(srv.base+'/index.html'+(o.q||''));
   await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),SEED);await p.reload();await p.waitForTimeout(600);return {p,ctx,st};};
 const kst=p=>p.evaluate(()=>{const o=document.querySelector('#kcOrb');return o?o.dataset.st:'';});
 const waitSt=(p,s,ms)=>p.waitForFunction(x=>{const o=document.querySelector('#kcOrb');return o&&o.dataset.st===x;},s,{timeout:ms||5000});
 const spoken=p=>p.evaluate(()=>__tts.spoken.map(x=>x.text).filter(t=>t.trim()));

 // A) Konuş sekmesi → arama → sıra alma → kesme → Türkçesi → Tekrar et → Bitir
 {const {p,ctx,st}=await mk({dark:true});
  await p.click('[data-tab=konus]');await p.waitForSelector('#kStart');
  ok(await p.isVisible('.kco[data-kco=en]')&&await p.isVisible('.kco[data-kco=it]'),'Konuş tab: Oliver / Chiara choice');
  const chips=await p.$$eval('.kchip',e=>e.map(x=>x.textContent));ok(chips.length===5&&/İlerleme raporu/.test(chips[0])&&chips[4]==='Serbest','topics: this week\'s SPEAK_EN theme first, 3 alternatives, Serbest: '+chips.map(c=>c.slice(0,18)).join(' | '));
  ok(await p.isVisible('#konusMount [data-go=coach]'),'"Yazarak çalış" link to text chat');
  await p.click('.kco[data-kco=it]');ok((await p.$$eval('.kchip',e=>e.map(x=>x.textContent))).includes('Kendini tanıt: adın, şehrin, işin'),'Chiara topics A1-level');
  await p.click('.kco[data-kco=en]');
  await p.click('#kStart');await p.waitForSelector('#kc:not([hidden])');
  ok(await p.evaluate(()=>document.documentElement.classList.contains('kc-on')),'call screen opens full screen');
  const sys=(st.reqs[0]&&H.parseReq(st.reqs[0]).system)||'';ok(/SPEAKING MODE/.test(sys)&&/exactly ONE question/.test(sys)&&/recasting/.test(sys)&&/İlerleme raporu/.test(sys)&&!st.reqs[0].tools,'speaking prompt: spoken register, ≤2 sentences + one question, recasts, topic, no tools');
  await p.waitForFunction(()=>__sr.cur&&__sr.cur._on,null,{timeout:5000});
  const sp=await spoken(p);ok(sp.length>=2&&sp.every(t=>!/[|*#]/.test(t)&&!/\p{Extended_Pictographic}/u.test(t)),'coach opener spoken sentence by sentence, no | * # emoji: '+JSON.stringify(sp));
  ok(await p.evaluate(()=>__tts.spoken.filter(x=>x.text.trim()).every(x=>x.lang==='en-GB'&&x.voice==='g-en')),'spoken in en-GB with best voice');
  ok(sp[0]==='Hi Türab!'&&sp.length===3,'sentences intact: '+JSON.stringify(sp));
  ok((await kst(p))==='listening'&&await p.evaluate(()=>__sr.cur.continuous===true&&__sr.cur.lang==='en-GB'),'when TTS ends → mic listens automatically (continuous, en-GB)');
  ok(/Dinliyorum/.test(await p.textContent('#kcSt'))&&/Oliver/.test(await p.textContent('#kcCap')),'state label Dinliyorum + caption of coach line');
  await p.screenshot({path:path.join(SHOTS,'konus_call_390_dark.png')});
  // konuşma: ara sonuç → son sonuç → 1,2 sn sessizlik → gönder
  await p.evaluate(()=>{__sr.cur._result('I am running it',false);});await sleep(700);
  ok(!st.log.some(x=>/turn:I am/.test(x)),'no send before silence');
  await p.evaluate(()=>{__sr.cur._result('I am running it since 2024',true);});await sleep(400);ok(!st.log.some(x=>/turn:I am/.test(x)),'still waiting (<1.2 s silence)');
  await p.waitForFunction(()=>/hardest part/.test(document.querySelector('#kcCap').textContent),null,{timeout:5000}).catch(async e=>{console.log('DBG',JSON.stringify(st.log),await p.evaluate(()=>({cap:document.querySelector('#kcCap').textContent,st:document.querySelector('#kcOrb').dataset.st,hint:document.querySelector('#kcHint').textContent,sr:__sr.log})));});
  ok(st.log.includes('turn:I am running it since 2024'),'turn ended after ~1.2 s silence → reply requested with your words');
  ok(/Sen/.test(await p.textContent('#kcCap'))&&/since 2024/.test(await p.textContent('#kcCap')),'captions: your last line shown');
  // kesme: konuşurken küreye dokun
  await p.waitForFunction(()=>__sr.cur&&__sr.cur._on,null,{timeout:5000});
  await p.evaluate(()=>{__tts.delay=1500;});
  st.delay=0;await p.evaluate(()=>{__sr.cur._result('We was late yesterday',true);});
  await waitSt(p,'speaking',5000);const before=await p.evaluate(()=>__sr.list.length);
  await p.click('#kcOrb');await p.waitForTimeout(200);
  ok((await kst(p))==='listening'&&await p.evaluate(()=>!__tts.speaking)&&await p.evaluate(b=>__sr.list.length>b,before),'tap orb while speaking → speech cut, listening');
  await p.evaluate(()=>{__tts.delay=40;});
  // Türkçesi?
  await p.click('#kcTr');await p.waitForFunction(()=>/Türkçesi: Merhaba Türab/.test(document.querySelector('#kcHint').textContent),null,{timeout:4000});
  ok(await p.isVisible('#kcHint'),'Türkçesi? → one-line Turkish hint');
  // Tekrar et (yavaş)
  await p.evaluate(()=>{__tts.spoken=[];});await p.click('#kcRep');await p.waitForTimeout(400);
  const rp=await p.evaluate(()=>__tts.spoken);ok(rp.length>=1&&rp[0].rate<0.8&&/hardest part|while/.test(rp.map(x=>x.text).join(' ')),'Tekrar et → last coach line, slower ('+(rp[0]&&rp[0].rate)+')');
  await p.waitForFunction(()=>__sr.cur&&__sr.cur._on,null,{timeout:5000});
  // altyazı kapat/aç
  await p.click('#kcCapT');ok(await p.isHidden('#kcCap'),'caption toggle hides captions');await p.click('#kcCapT');
  // duraklat
  await p.click('#kcMic');ok((await kst(p))==='idle'&&/Duraklatıldı/.test(await p.textContent('#kcSt'))&&await p.evaluate(()=>!__sr.cur._on),'Duraklat: mic off, idle');
  await p.click('#kcMic');ok((await kst(p))==='listening','Devam et: listening again');
  const ctl=await p.$$eval('.kcCtl button',e=>e.map(x=>{const r=x.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)];}));ok(ctl.length===5&&ctl.every(([w,h])=>w>=44&&h>=44),'5 controls ≥44 px '+JSON.stringify(ctl));
  // Bitir → özet + kayıt
  await p.click('#kcEnd');await p.waitForSelector('#kcSum',{timeout:5000});const sm=await p.textContent('#kcSum');
  ok(/Konuşma tamam/.test(sm)&&/1 dk/.test(sm)&&/I am running it since 2024/.test(sm)&&/I've been running it since 2024/.test(sm)&&/a tight deadline/.test(sm)&&/have been \+ -ing/.test(sm),'summary: duration, corrections "senin → doğal", phrases, tip');
  ok(await p.$$eval('#kcSum [data-kph]',e=>e.length)===3&&await p.$$eval('#kcSum [data-kadd]',e=>e.length)===3,'3 phrases with Dinle + Kartlara ekle');
  await p.screenshot({path:path.join(SHOTS,'konus_summary_390.png')});
  await p.evaluate(()=>{__tts.spoken=[];});await p.click('#kcSum [data-kph="1"]');await p.waitForTimeout(150);ok((await spoken(p))[0]==='a tight deadline','Dinle reads phrase');
  await p.click('#kcSum [data-kadd="0"]');await p.waitForTimeout(300);const cards=await p.evaluate(()=>Object.values(rtExport().collections.cards||{}));
  ok(cards.some(c=>c.lang==='en'&&c.f==='to keep things on track'&&c.tr==='işleri yolunda tutmak')&&/Eklendi/.test(await p.textContent('#kcSum [data-kadd="0"]')),'Kartlara ekle → card saved');
  const ss=await p.evaluate(()=>rtExport().collections.sessions||{});const k=ss['konus-2026-10-14-en'];
  ok(k&&k.lang==='en'&&k.mins.speaking>=1&&k.total===k.mins.speaking&&k.src==='konus','session saved: EN speaking minutes '+JSON.stringify(k&&k.mins));
  await p.click('#kcClose');ok(await p.isHidden('#kc')&&!(await p.evaluate(()=>document.documentElement.classList.contains('kc-on'))),'Kapat closes call screen');
  ok(await p.evaluate(()=>[...TYDIL.ders.state.fin].includes('en-speaking')),'EN speaking block marked done');
  await ctx.close();}

 // B) Sınırlı yeniden başlatma: hiç ses yok → 2 yeniden başlatma, sonra duraklat + ipucu
 {const {p,ctx}=await mk();await p.click('[data-tab=konus]');await p.click('#kStart');await p.waitForFunction(()=>__sr.cur&&__sr.cur._on,null,{timeout:5000});
  const n0=await p.evaluate(()=>__sr.log.filter(x=>/^start/.test(x)).length);
  for(let i=0;i<3;i++){await p.evaluate(()=>__sr.cur._end());await p.waitForTimeout(260);}
  const n1=await p.evaluate(()=>__sr.log.filter(x=>/^start/.test(x)).length);
  ok(n1-n0===2&&(await kst(p))==='idle'&&/duyamadım/.test(await p.textContent('#kcHint')),'empty endings: exactly 2 restarts, then idle + "Seni duyamadım" ('+(n1-n0)+')');
  await p.click('#kcEnd');await p.waitForTimeout(200);ok(await p.isHidden('#kc'),'Bitir without any answer closes directly (nothing saved)');
  ok(!(await p.evaluate(()=>rtExport().collections.sessions||{}))['konus-2026-10-14-en'],'no session for empty call');
  await ctx.close();}

 // C) Ses tanıma yok → yazı kutusu (dikte ipucu), koç yine konuşur
 {const {p,ctx,st}=await mk({q:'?unsupported=1'});await p.click('[data-tab=konus]');await p.click('#kStart');await p.waitForSelector('#kcType:not([hidden])');
  await p.waitForFunction(()=>__tts.spoken.filter(x=>x.text.trim()).length>=2,null,{timeout:5000});
  ok(/Klavyedeki mikrofon tuşuyla dikte et/.test(await p.textContent('#kcType'))&&await p.isVisible('#kcIn'),'SR unavailable: text box + dictation hint');
  ok((await spoken(p)).length>=2,'coach still speaks');
  await p.fill('#kcIn','I am running it since 2024');await p.click('#kcType button[type=submit]');await p.waitForFunction(()=>/hardest part/.test(document.querySelector('#kcCap').textContent),null,{timeout:4000});
  ok(st.log.includes('turn:I am running it since 2024'),'typed answer sent as turn');
  await ctx.close();}
 // D) İzin verilmedi → yazı kutusu
 {const {p,ctx}=await mk();await p.click('[data-tab=konus]');await p.click('#kStart');await p.waitForFunction(()=>__sr.cur&&__sr.cur._on,null,{timeout:5000});
  await p.evaluate(()=>{__sr.cur._error('not-allowed');__sr.cur._end();});await p.waitForTimeout(200);
  ok(await p.isVisible('#kcType')&&/yaz ya da dikte et/.test(await p.textContent('#kcSt')),'not-allowed → fallback text box');
  await ctx.close();}
 // E) Anahtar yok → Konuş kilitli, Ayarlar'a yönlendirir
 {const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();p.on('pageerror',x=>errs.push('pageerror '+x.message));
  await p.addInitScript(MOCK);await p.goto(srv.base+'/index.html');await p.waitForTimeout(500);await p.click('[data-tab=konus]');await p.waitForSelector('#kStart');
  ok(await p.isDisabled('#kStart')&&await p.isVisible('#konusMount [data-go=key]'),'no key: Aramayı başlat disabled + Ayarlar link');
  await ctx.close();}

 ok(!errs.length,'no page errors / dialogs '+errs.slice(0,4).join(' | '));
 await b.close();srv.close();console.log('errors',JSON.stringify(errs.slice(0,6)));console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
