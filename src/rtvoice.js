/* ---------- CANLI SES (Google Gemini Live, WebSocket · ücretsiz katman) ----------
   Akış:  mikrofon ─(48 kHz float)→ yankı kapısı → 16 kHz PCM (~100 ms parça) ─WS→ Gemini Live (sunucu VAD + model + ses)
          ←WS─ 24 kHz PCM parçaları → oynatma kuyruğu (120 ms tampon) → hoparlör ; döküm: inputTranscription / outputTranscription → c.turns
   Sıra cihazda yönetilir (sunucu VAD kapalı): yerel ses seviyesi + gürültü tabanı → activityStart / activityEnd. 0,9 sn sessizlikte ya da "Konuşmam bitti" ile sıra koça geçer;
   koç konuşurken yüksek sesle girersen koç anında susar (söz kesme). Hiç algılanmayan alçak konuşma da "bitti" ile son 15 sn'lik tampondan gönderilir.
   Oturum: contextWindowCompression (süre sınırı kalkar) + sessionResumption tanıtıcısı; bağlantı ~10 dk'da ya da koparsa aynı konuşmaya kendiliğinden bağlanır.
   Tanı: içerik kaydetmeden yalnızca zaman/olay sayıları (c.rt.d) → arama ekranında "Tanı". Ses ve metin kaydedilmez. */
const GM_WS="wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent", GM_MODELS=["gemini-3.1-flash-live-preview","gemini-3.8-live"];
const GM_RC=[500,1000,2000,4000], GM_END=900, GM_RING=16000*15;
const kRtOn=()=>!!(window.TYRT&&TYRT.hasGem&&TYRT.hasGem()&&window.WebSocket&&(window.AudioContext||window.webkitAudioContext)&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
function kRtSys(c){const o=c.o; let sys=C.speakRules(c.lang,{topic:o.topic,goal:o.goal,vocab:o.vocab,structures:o.structures,opener:o.opener,level:o.level});
  if(Array.isArray(sys))sys=sys.map(b=>typeof b==="string"?b:(b&&b.text)||"").join("\n");
  return sys+"\n"+kCoachExtra(c,true)+"\n"+(c.lang==="it"?"CANLI SESLİ GÖRÜŞME: doğal, sıcak bir sesle ve yavaş konuş. Görüşme başlayınca Türab'ı selamla ve ilk soruyu sor.":"LIVE VOICE CALL: speak naturally and warmly, at a relaxed pace. When the call starts, greet Türab and ask the first question.");}
const b64=u8=>{let s=""; for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s);};
const unb64=s=>{const b=atob(s), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i); return u;};
const pnow=()=>(window.performance&&performance.now)?performance.now():Date.now();
/* float32 (cihaz hızı) → 16 kHz int16 */
function kDown(f,rate){const r=rate/16000, n=Math.floor(f.length/r), o=new Int16Array(n); for(let i=0;i<n;i++){const v=Math.max(-1,Math.min(1,f[Math.floor(i*r)]||0)); o[i]=v<0?v*0x8000:v*0x7fff;} return o;}
function kRtErrCode(m){return /not found|not supported|unsupported model/i.test(m)?"model":/API key|permission|denied|invalid|unauthori/i.test(m)?"key":/quota|exhaust|rate/i.test(m)?"quota":"net";}
function kRtOpen(c,model,handle){return new Promise((res,rej)=>{let ws, ok=false; const t0=pnow(); try{ws=new WebSocket(GM_WS+"?key="+encodeURIComponent(TYRT.getGem()));}catch(e){return rej(e);}
  const to=setTimeout(()=>{if(!ok){try{ws.close();}catch(e){} rej(Object.assign(new Error("zaman aşımı"),{code:"timeout"}));}},12000);
  ws.onopen=()=>ws.send(JSON.stringify({setup:{model:"models/"+model,generationConfig:{responseModalities:["AUDIO"],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:c.lang==="it"?"Aoede":"Puck"}}}},
    systemInstruction:{parts:[{text:kRtSys(c)}]},inputAudioTranscription:{},outputAudioTranscription:{},
    realtimeInputConfig:{automaticActivityDetection:{disabled:true}},
    contextWindowCompression:{slidingWindow:{}},sessionResumption:handle?{handle}:{}}}));
  ws.onmessage=async e=>{const j=await kRtParse(e.data); if(!j)return; if(!ok&&j.setupComplete){ok=true; clearTimeout(to); ws.setupMs=Math.round(pnow()-t0); res(ws); return;} if(ok&&c.rt&&c.rt.ws===ws)kRtEvent(c,j);};
  ws.onclose=e=>{clearTimeout(to); if(!ok){const m=String(e.reason||""); rej(Object.assign(new Error(m||("bağlantı kapandı ("+e.code+")")),{code:kRtErrCode(m)}));} else if(c.rt&&c.rt.ws===ws)kRtClosed(c,e);};
  ws.onerror=()=>{};});}
async function kRtParse(d){try{if(typeof d!=="string")d=d.text?await d.text():new TextDecoder().decode(d); return JSON.parse(d);}catch(e){return null;}}
async function kRtStart(c){c.rt={ws:null,mic:null,ac:null,src:null,proc:null,out:null,next:0,srcs:[],uin:null,uout:"",model:"",handle:null,rc:0,
    d:{turns:[],gated:0,under:0,inter:0,rc:0,manual:0,setupMs:0,model:""},lastVoice:0,voiced:false,cur:null,manualAt:0}; const R=c.rt; kState("thinking"); kHint("");
  /* ses bağlamları dokunuş anında (await'ten önce) açılır: tarayıcı sonradan açılanı susturabiliyor */
  const AC0=window.AudioContext||window.webkitAudioContext; try{R.ac=new AC0(); try{R.out=new AC0({sampleRate:24000});}catch(e){R.out=new AC0();} R.ac.resume&&R.ac.resume(); R.out.resume&&R.out.resume();}catch(e){}
  try{R.mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});}
  catch(e){kHint(e&&e.name==="NotFoundError"?"Mikrofon bulunamadı.":"Mikrofon izni verilmedi. Tarayıcı ayarından mikrofona izin ver."); kRtFallback(c); return;}
  if(c.ended||K.call!==c){kRtStop(c); return;}
  let err=null; for(const m of GM_MODELS){try{R.ws=await kRtOpen(c,m,null); R.model=m; break;}catch(e){err=e; if(e.code!=="model")break;}}
  if(!R.ws){kRtStop(c); const k=err&&err.code; kHint(k==="key"?"Gemini anahtarı reddedildi. Ayarlar › Canlı ses'ten kontrol et.":k==="quota"?"Gemini'nin ücretsiz günlük limiti doldu. Bugün normal görüşmeyle devam; yarın yine canlı.":k==="timeout"?"Canlı ses zamanında bağlanamadı (ağ yavaş). Normal görüşmeyle devam.":"Canlı sese bağlanılamadı ("+String((err&&err.message)||"ağ").slice(0,80)+"). Normal görüşmeyle devam."); kRtFallback(c); return;}
  if(c.ended||K.call!==c){kRtStop(c); return;}
  R.d.setupMs=R.ws.setupMs; R.d.model=R.model;
  /* mikrofon → yerel sıra yönetimi → 16 kHz PCM parçaları (~100 ms) */
  try{R.src=R.ac.createMediaStreamSource(R.mic); R.proc=R.ac.createScriptProcessor(2048,1,1); const rate=R.ac.sampleRate; R.noise=0.01; R.loudN=0; R.S=false; R.ring=[]; R.ringLen=0; R.pend=[]; R.pendLen=0;
    R.proc.onaudioprocess=e=>{if(!R.ws||R.ws.readyState!==1||c.paused)return; const f=e.inputBuffer.getChannelData(0); let q=0; for(let i=0;i<f.length;i+=4)q+=f[i]*f[i]; const rms=Math.sqrt(q/(f.length/4)), now=pnow();
      const playing=R.srcs.length>0||(R.out&&R.next>R.out.currentTime+0.05), pcm=kDown(f,rate);
      if(!R.S&&!playing)R.noise=R.noise*0.97+Math.min(rms,0.05)*0.03;                               /* gürültü tabanı yalnızca sessizlikte öğrenilir */
      const thr=playing?Math.max(0.09,R.noise*5):Math.max(0.018,R.noise*3);                           /* koç konuşurken yalnızca yüksek ses (yankı geçmez) */
      if(!R.S){ if(!playing){R.ring.push(pcm); R.ringLen+=pcm.length; while(R.ringLen>GM_RING){R.ringLen-=R.ring.shift().length;}} else R.d.gated++;
        R.loudN=rms>thr?R.loudN+1:0; if(R.loudN>=3)kRtBegin(c,playing); return;}
      if(rms>Math.max(0.012,R.noise*2))R.lastLoud=now;
      R.pend.push(pcm); R.pendLen+=pcm.length; if(R.pendLen>=1600)kRtFlush(c);
      if(now-R.lastLoud>GM_END)kRtEnd(c,false);};
    const mute=R.ac.createGain(); mute.gain.value=0; R.src.connect(R.proc); R.proc.connect(mute); mute.connect(R.ac.destination);}catch(e){}
  kRtSend(c,{clientContent:{turns:[{role:"user",parts:[{text:c.lang==="it"?"(Görüşme başladı. Merhaba!)":"(The call has started. Hi!)"}]}],turnComplete:true}});}
function kRtFallback(c){if(K.call!==c||c.ended)return; c.rt=null; c.rtWanted=false; ["kcDone","kcTip"].forEach(id=>{const e=document.getElementById(id); if(e)e.hidden=true;}); c.srOff=!C.srOk(); const f=document.getElementById("kcType"); if(f)f.hidden=!c.srOff; kSend(null);}
function kRtFlush(c){const R=c.rt; if(!R||!R.pendLen)return; const all=new Int16Array(R.pendLen); let o=0; R.pend.forEach(p=>{all.set(p,o); o+=p.length;}); R.pend=[]; R.pendLen=0; kRtSend(c,{realtimeInput:{audio:{data:b64(new Uint8Array(all.buffer)),mimeType:"audio/pcm;rate=16000"}}});}
/* konuşma başladı: koç konuşuyorsa sus (söz kesme), activityStart + son ~0,3 sn ön tampon (ilk hece kaybolmasın) */
function kRtBegin(c,barge){const R=c.rt; R.S=true; R.loudN=0; R.lastLoud=pnow();
  if(barge||R.srcs.length){R.d.inter++; kRtHush(c); if(R.uout){c.turns.push({role:"assistant",content:R.uout.trim()+" —"}); c.last=R.uout.trim(); R.uout="";}}
  kRtSend(c,{realtimeInput:{activityStart:{}}}); const pre=[]; let n=0; for(let i=R.ring.length-1;i>=0&&n<4800;i--){pre.unshift(R.ring[i]); n+=R.ring[i].length;} R.ring=[]; R.ringLen=0; R.pend=pre; R.pendLen=n;
  c.you=""; kState("listening"); kCaps(); kDiag();}
/* konuşma bitti (0,9 sn sessizlik ya da "bitti" düğmesi): activityEnd → sıra koçta. Hiç algılanmadıysa son 15 sn tamponu gönderilir */
function kRtEnd(c,manual){const R=c.rt; if(!R)return;
  if(!R.S){if(!manual)return; if(R.ringLen<3200){kHint("Seni duyamadım; biraz daha yüksek sesle söyle."); return;} kRtSend(c,{realtimeInput:{activityStart:{}}}); R.pend=R.ring; R.pendLen=R.ringLen; R.ring=[]; R.ringLen=0; R.lastLoud=pnow();}
  kRtFlush(c); R.S=false; kRtSend(c,{realtimeInput:{activityEnd:{}}}); R.lastVoice=manual?R.lastLoud:R.lastLoud; R.voiced=true; R.cur=null; if(manual){R.manualAt=pnow(); R.d.manual++;}
  kState("thinking"); clearTimeout(R.noRes); R.noRes=setTimeout(()=>{if(c.rt===R&&c.st==="thinking"&&!R.srcs.length){kHint("Yanıt gelmedi; bir kez daha söyle."); kState("listening");}},8000); kDiag();}
function kRtSend(c,o){try{const ws=c.rt&&c.rt.ws; if(ws&&ws.readyState===1)ws.send(JSON.stringify(o));}catch(e){}}
/* koç sesi: 24 kHz PCM sırayla çalınır; söz kesilince hepsi susturulur */
function kRtPlay(c,data){const R=c.rt; if(!R||!R.out||c.paused)return; const u=unb64(data), n=u.length>>1, dv=new DataView(u.buffer), f=new Float32Array(n); for(let i=0;i<n;i++)f[i]=dv.getInt16(i*2,true)/0x8000;
  const b=R.out.createBuffer(1,n,24000); b.copyToChannel?b.copyToChannel(f,0):b.getChannelData(0).set(f); const s=R.out.createBufferSource(); s.buffer=b; s.connect(R.out.destination);
  if(R.out.state==="suspended"){try{R.out.resume();}catch(e){}}
  const now=R.out.currentTime, mid=R.srcs.length>0||R.inTurn; if(mid&&R.next>0&&R.next<now)R.d.under++;            /* cümle ortasında kuyruk boşaldı = ağdan geç gelen parça */
  const t=R.next>now?R.next:now+0.12; s.start(t); R.next=t+b.duration; R.srcs.push(s); R.inTurn=true;              /* yeni cümlenin başında 120 ms tampon */
  if(R.cur&&R.cur.aud==null)R.cur.aud=Math.round(pnow()+(t-now)*1000-R.cur.end);
  s.onended=()=>{R.srcs=R.srcs.filter(x=>x!==s); if(!R.srcs.length&&c.st==="speaking"){clearTimeout(R.drain); R.drain=setTimeout(()=>{if(c.rt===R&&!R.srcs.length&&c.st==="speaking"){R.inTurn=false; kState("listening");}},R.done?0:700);}};}
function kRtHush(c){const R=c.rt; if(!R)return; R.srcs.forEach(s=>{try{s.stop();}catch(e){}}); R.srcs=[]; R.next=0; R.inTurn=false;}
function kRtUser(c){const R=c.rt; if(!R.uin){R.uin={role:"user",content:""}; c.turns.push(R.uin);} return R.uin;}
/* Tanı: konuşman bittiği an (yerel ses seviyesi) → sunucudan ilk yanıt → ilk ses parçası → sesin hoparlörde başlaması */
function kRtMark(R,k){if(!R.voiced||R.cur&&R.cur[k]!=null)return; if(!R.cur){R.cur={end:R.lastVoice,manual:R.manualAt>R.lastVoice?Math.round(R.manualAt-R.lastVoice):null}; R.d.turns.push(R.cur); if(R.d.turns.length>40)R.d.turns.shift();}
  R.cur[k]=Math.round(pnow()-R.cur.end); kDiag();}
function kRtEvent(c,j){if(K.call!==c||c.ended)return; const R=c.rt; if(!R)return;
  if(j.sessionResumptionUpdate){const u=j.sessionResumptionUpdate; if(u.resumable&&u.newHandle)R.handle=u.newHandle; return;}
  if(j.goAway){R.goAway=true; return;}
  const sc=j.serverContent; if(!sc)return;
  if(sc.inputTranscription&&sc.inputTranscription.text){const u=kRtUser(c); u.content+=sc.inputTranscription.text; c.you=u.content.trim(); if(c.st!=="listening"&&!R.srcs.length)kState("listening"); kCaps();}
  if(sc.interrupted){R.d.inter++; kRtHush(c); if(R.uout){c.turns.push({role:"assistant",content:R.uout.trim()+" —"}); c.last=R.uout.trim(); R.uout="";} kState("listening"); kDiag(); return;}
  const parts=sc.modelTurn&&sc.modelTurn.parts||[];
  if(parts.length||sc.outputTranscription)kRtMark(R,"first");
  parts.forEach(p=>{if(p.inlineData&&p.inlineData.data){clearTimeout(R.noRes); kHint(""); kRtMark(R,"chunk"); if(R.uin){if(R.uin.content.trim()&&!R.uin.n){R.uin.n=1; c.userTurns++;} R.uin=null;} R.done=false; if(c.st!=="speaking")kState("speaking"); kRtPlay(c,p.inlineData.data);}});
  if(sc.outputTranscription&&sc.outputTranscription.text){R.uout+=sc.outputTranscription.text; c.last=R.uout.trim(); kCaps();}
  if(sc.turnComplete||sc.generationComplete){if(sc.turnComplete){if(R.uout.trim()){c.turns.push({role:"assistant",content:R.uout.trim()}); c.last=R.uout.trim();} R.uout=""; R.voiced=false; R.cur=null;} R.done=true; if(!R.srcs.length&&c.st==="speaking"){R.inTurn=false; kState("listening");}}}
/* Bağlantı kapandı: tanıtıcı varsa aynı konuşmaya sessizce yeniden bağlan (geri çekilerek); yoksa duraklat */
async function kRtClosed(c,e){if(K.call!==c||c.ended||!c.rt)return; const R=c.rt;
  if(R.handle&&R.rc<GM_RC.length){const wait=GM_RC[R.rc++]; R.d.rc++; kHint("Bağlantı yenileniyor…"); kDiag(); await new Promise(r=>setTimeout(r,R.goAway?50:wait)); R.goAway=false;
    if(K.call!==c||c.ended||c.rt!==R)return;
    try{const ws=await kRtOpen(c,R.model,R.handle); if(c.rt!==R||c.ended){try{ws.close();}catch(_){} return;} R.ws=ws; R.rc=0; kHint(""); kDiag(); return;}
    catch(er){if(c.rt!==R)return; if(er.code==="key"||er.code==="quota"){kRtFail(c,er); return;} return kRtClosed(c,e);}}
  kRtStop(c); c.paused=true; c.pauseAt=Date.now(); kState("idle"); kHint("Canlı bağlantı koptu. Devam etmek için mikrofona dokun.");}
function kRtFail(c,er){kRtStop(c); c.paused=true; c.pauseAt=Date.now(); kState("idle"); kHint(er.code==="quota"?"Gemini'nin ücretsiz günlük limiti doldu.":"Gemini anahtarı reddedildi.");}
/* Küre: koç konuşuyorsa susturur; sen konuşuyorsan "bitti" der (beklemeden sıra koça geçer) */
function kRtOrb(c){const R=c.rt; if(c.st==="speaking"||c.st==="thinking"&&R.srcs.length){R.d.inter++; kRtHush(c); kState("listening");}
  else if(c.st==="listening")kRtEnd(c,true);
  else if(c.st==="idle")kRtPause(c,false);}
function kRtPause(c,on){const R=c.rt; if(!R)return; c.paused=on; if(on){c.pauseAt=Date.now(); kRtHush(c); if(R.S){R.S=false; R.pend=[]; R.pendLen=0; kRtSend(c,{realtimeInput:{activityEnd:{}}});}} else if(c.pauseAt){c.pausedMs+=Date.now()-c.pauseAt; c.pauseAt=0;}
  try{R.mic.getTracks().forEach(t=>t.enabled=!on);}catch(e){} kState(on?"idle":"listening");}
function kRtText(c,v){c.turns.push({role:"user",content:v}); c.userTurns++; c.you=v; kCaps(); kRtSend(c,{clientContent:{turns:[{role:"user",parts:[{text:v}]}],turnComplete:true}});}
function kRtRepeat(c){kRtHush(c); kRtSend(c,{clientContent:{turns:[{role:"user",parts:[{text:c.lang==="it"?"(Ripeti la tua ultima frase molto lentamente.)":"(Please repeat your last sentence slowly.)"}]}],turnComplete:true}});}
function kRtStop(c){const R=c&&c.rt; if(!R)return; c.rt=null; c.rtDiag=R.d; try{R.ws&&R.ws.close();}catch(e){} try{R.proc&&R.proc.disconnect(); R.src&&R.src.disconnect();}catch(e){} kRtHushR(R);
  try{R.mic&&R.mic.getTracks().forEach(t=>t.stop());}catch(e){} try{R.ac&&R.ac.close();}catch(e){} try{R.out&&R.out.close();}catch(e){}}
function kRtHushR(R){(R.srcs||[]).forEach(s=>{try{s.stop();}catch(e){}}); R.srcs=[];}
/* ---- Tanı paneli (arama ekranında "Tanı"): yalnızca süreler ve sayılar ---- */
const kMed=a=>{a=a.filter(x=>x!=null).sort((x,y)=>x-y); return a.length?a[Math.floor(a.length/2)]:null;};
function kDiagData(c){const d=(c.rt&&c.rt.d)||c.rtDiag; if(!d)return null; const T=d.turns, L=T[T.length-1]||{};
  return {model:d.model,baglanma_ms:d.setupMs,tur:T.length,son:{ilk_yanit_ms:L.first,ilk_ses_paketi_ms:L.chunk,duyulma_ms:L.aud,elle_bitti_ms:L.manual},
    ortanca:{ilk_yanit_ms:kMed(T.map(t=>t.first)),ilk_ses_paketi_ms:kMed(T.map(t=>t.chunk)),duyulma_ms:kMed(T.map(t=>t.aud))},soz_kesme:d.inter,yanki_kapisi_parca:d.gated,ses_boslugu:d.under,yeniden_baglanma:d.rc,elle_bitti:d.manual};}
function kDiag(){const c=K.call, el=document.getElementById("kcDiag"); if(!c||!el||el.hidden)return; const x=kDiagData(c);
  if(!x){el.innerHTML=`<p>Canlı ses kapalı: tanı yalnızca Gemini canlı görüşmede çalışır.</p>`; return;}
  const ms=v=>v==null?"—":(v/1000).toFixed(2)+" sn";
  el.innerHTML=`<p><b>Son tur</b> · sustuktan sonra: ilk yanıt ${ms(x.son.ilk_yanit_ms)} · ilk ses parçası ${ms(x.son.ilk_ses_paketi_ms)} · <b>sesi duyma ${ms(x.son.duyulma_ms)}</b></p>
   <p><b>Ortanca (${x.tur} tur)</b> · ilk yanıt ${ms(x.ortanca.ilk_yanit_ms)} · sesi duyma ${ms(x.ortanca.duyulma_ms)}</p>
   <p>Söz kesme ${x.soz_kesme} · yankı engeli ${x.yanki_kapisi_parca} parça · ses boşluğu ${x.ses_boslugu} · yeniden bağlanma ${x.yeniden_baglanma} · "bitti" dokunuşu ${x.elle_bitti} · bağlanma ${ms(x.baglanma_ms)} · ${esc(x.model||"")}</p>
   <button type="button" class="btn btn-soft btn-sm" id="kcDiagCopy">Tanıyı kopyala</button>`;}
