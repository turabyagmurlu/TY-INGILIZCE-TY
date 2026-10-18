/* ---------- CANLI SES (Google Gemini Live, WebSocket · ücretsiz katman) ----------
   Gemini anahtarı varsa Konuş görüşmesi doğrudan sesten sese: mikrofon (16 kHz PCM) → Gemini Live → hoparlör (24 kHz PCM). Söz kesme sunucuda
   (konuşmaya başlayınca "interrupted" gelir, çalan ses anında susar). İki tarafın yazılı dökümü c.turns'e yazılır; özet, Türkçesi? ve kayıt aynı akışla.
   Model sırası: ilki açılmazsa (bulunamadı) sıradakine geçer. Bağlanamazsa normal (Claude) görüşmeye döner. */
const GM_WS="wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent", GM_MODELS=["gemini-3.1-flash-live-preview","gemini-3.8-live"];
const kRtOn=()=>!!(window.TYRT&&TYRT.hasGem&&TYRT.hasGem()&&window.WebSocket&&(window.AudioContext||window.webkitAudioContext)&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
function kRtSys(c){const o=c.o; let sys=C.speakRules(c.lang,{topic:o.topic,goal:o.goal,vocab:o.vocab,structures:o.structures,opener:o.opener,level:o.level});
  if(Array.isArray(sys))sys=sys.map(b=>typeof b==="string"?b:(b&&b.text)||"").join("\n");
  return sys+"\n\n"+(c.lang==="it"?"CANLI SESLİ GÖRÜŞME: doğal, sıcak bir sesle ve yavaş konuş. Görüşme başlayınca Türab'ı selamla ve ilk soruyu sor.":"LIVE VOICE CALL: speak naturally and warmly, at a relaxed pace. When the call starts, greet Türab and ask the first question.");}
const b64=u8=>{let s=""; for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s);};
const unb64=s=>{const b=atob(s), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i); return u;};
/* float32 (cihaz hızı) → 16 kHz int16 */
function kDown(f,rate){const r=rate/16000, n=Math.floor(f.length/r), o=new Int16Array(n); for(let i=0;i<n;i++){const v=Math.max(-1,Math.min(1,f[Math.floor(i*r)]||0)); o[i]=v<0?v*0x8000:v*0x7fff;} return o;}
function kRtOpen(c,model){return new Promise((res,rej)=>{let ws, ok=false; try{ws=new WebSocket(GM_WS+"?key="+encodeURIComponent(TYRT.getGem()));}catch(e){return rej(e);}
  const to=setTimeout(()=>{if(!ok){try{ws.close();}catch(e){} rej(Object.assign(new Error("zaman aşımı"),{code:"timeout"}));}},12000);
  ws.onopen=()=>ws.send(JSON.stringify({setup:{model:"models/"+model,generationConfig:{responseModalities:["AUDIO"],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:c.lang==="it"?"Aoede":"Puck"}}}},
    systemInstruction:{parts:[{text:kRtSys(c)}]},inputAudioTranscription:{},outputAudioTranscription:{},
    realtimeInputConfig:{automaticActivityDetection:{startOfSpeechSensitivity:"START_SENSITIVITY_LOW",endOfSpeechSensitivity:"END_SENSITIVITY_HIGH",prefixPaddingMs:200,silenceDurationMs:550}}}}));
  ws.onmessage=async e=>{const j=await kRtParse(e.data); if(!j)return; if(!ok&&j.setupComplete){ok=true; clearTimeout(to); res(ws); return;} if(ok)kRtEvent(c,j);};
  ws.onclose=e=>{clearTimeout(to); if(!ok){const m=String(e.reason||""); rej(Object.assign(new Error(m||("bağlantı kapandı ("+e.code+")")),{code:/not found|not supported|unsupported model/i.test(m)?"model":/API key|permission|denied|invalid/i.test(m)?"key":/quota|exhaust|rate/i.test(m)?"quota":"net"}));} else kRtClosed(c,e);};
  ws.onerror=()=>{};});}
async function kRtParse(d){try{if(typeof d!=="string")d=d.text?await d.text():new TextDecoder().decode(d); return JSON.parse(d);}catch(e){return null;}}
async function kRtStart(c){c.rt={ws:null,mic:null,ac:null,src:null,proc:null,out:null,next:0,srcs:[],uin:null,uout:"",model:""}; const R=c.rt; kState("thinking"); kHint("");
  /* ses bağlamları dokunuş anında (await'ten önce) açılır: tarayıcı sonradan açılanı susturabiliyor */
  const AC0=window.AudioContext||window.webkitAudioContext; try{R.ac=new AC0(); try{R.out=new AC0({sampleRate:24000});}catch(e){R.out=new AC0();} R.ac.resume&&R.ac.resume(); R.out.resume&&R.out.resume();}catch(e){}
  try{R.mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});}
  catch(e){kHint("Mikrofon izni verilmedi. Tarayıcı ayarından mikrofona izin ver."); kRtFallback(c); return;}
  if(c.ended||K.call!==c){kRtStop(c); return;}
  let err=null; for(const m of GM_MODELS){try{R.ws=await kRtOpen(c,m); R.model=m; break;}catch(e){err=e; if(e.code!=="model")break;}}
  if(!R.ws){kRtStop(c); const k=err&&err.code; kHint(k==="key"?"Gemini anahtarı reddedildi. Ayarlar › Canlı ses'ten kontrol et.":k==="quota"?"Gemini'nin ücretsiz günlük limiti doldu. Bugün normal görüşmeyle devam; yarın yine canlı.":"Canlı sese bağlanılamadı ("+String((err&&err.message)||"ağ").slice(0,80)+"). Normal görüşmeyle devam."); kRtFallback(c); return;}
  if(c.ended||K.call!==c){kRtStop(c); return;}
  /* mikrofon → 16 kHz PCM parçaları (~100 ms) */
  try{R.src=R.ac.createMediaStreamSource(R.mic); R.proc=R.ac.createScriptProcessor(2048,1,1); const rate=R.ac.sampleRate; let buf=[], len=0;
    R.proc.onaudioprocess=e=>{if(!R.ws||R.ws.readyState!==1||c.paused)return; const f=e.inputBuffer.getChannelData(0); let q=0; for(let i=0;i<f.length;i+=4)q+=f[i]*f[i]; const rms=Math.sqrt(q/(f.length/4));
      /* yankı kapısı: koç konuşurken hoparlör sesi mikrofona döner ve koçu keser. O sırada yalnızca yüksek sesli konuşma (söz kesme) geçer, gerisi sessizlik olarak gider */
      const playing=R.srcs.length>0||(R.out&&R.next>R.out.currentTime); if(playing&&rms<0.06){R.gate=(R.gate||0)+1;} else R.gate=0;
      const pcm=R.gate?new Int16Array(Math.floor(f.length/(rate/16000))):kDown(f,rate); buf.push(pcm); len+=pcm.length;
      if(len>=1600){const all=new Int16Array(len); let o=0; buf.forEach(p=>{all.set(p,o); o+=p.length;}); buf=[]; len=0; kRtSend(c,{realtimeInput:{audio:{data:b64(new Uint8Array(all.buffer)),mimeType:"audio/pcm;rate=16000"}}});}};
    const mute=R.ac.createGain(); mute.gain.value=0; R.src.connect(R.proc); R.proc.connect(mute); mute.connect(R.ac.destination);}catch(e){}
  kRtSend(c,{clientContent:{turns:[{role:"user",parts:[{text:c.lang==="it"?"(Görüşme başladı. Merhaba!)":"(The call has started. Hi!)"}]}],turnComplete:true}});}
function kRtFallback(c){if(K.call!==c||c.ended)return; c.rt=null; c.rtWanted=false; c.srOff=!C.srOk(); const f=document.getElementById("kcType"); if(f)f.hidden=!c.srOff; kSend(null);}
function kRtSend(c,o){try{const ws=c.rt&&c.rt.ws; if(ws&&ws.readyState===1)ws.send(JSON.stringify(o));}catch(e){}}
/* koç sesi: 24 kHz PCM sırayla çalınır; söz kesilince hepsi susturulur */
function kRtPlay(c,data){const R=c.rt; if(!R||!R.out||c.paused)return; const u=unb64(data), n=u.length>>1, dv=new DataView(u.buffer), f=new Float32Array(n); for(let i=0;i<n;i++)f[i]=dv.getInt16(i*2,true)/0x8000;
  const b=R.out.createBuffer(1,n,24000); b.copyToChannel?b.copyToChannel(f,0):b.getChannelData(0).set(f); const s=R.out.createBufferSource(); s.buffer=b; s.connect(R.out.destination);
  if(R.out.state==="suspended"){try{R.out.resume();}catch(e){}}
  const now=R.out.currentTime, t=R.next>now?R.next:now+0.12; s.start(t);   /* yeni cümlenin başında 120 ms tampon: ağ dalgalanmasında ses kesik kesik olmaz */ R.next=t+b.duration; R.srcs.push(s); s.onended=()=>{R.srcs=R.srcs.filter(x=>x!==s); if(!R.srcs.length&&c.st==="speaking"&&R.done)kState("listening");};}
function kRtHush(c){const R=c.rt; if(!R)return; R.srcs.forEach(s=>{try{s.stop();}catch(e){}}); R.srcs=[]; R.next=0;}
function kRtUser(c){const R=c.rt; if(!R.uin){R.uin={role:"user",content:""}; c.turns.push(R.uin);} return R.uin;}
function kRtEvent(c,j){if(K.call!==c||c.ended)return; const R=c.rt; if(!R)return; const sc=j.serverContent;
  if(j.goAway){kHint("Canlı oturum süresi doluyor; bitince mikrofona dokunup devam edebilirsin."); return;}
  if(!sc)return;
  if(sc.inputTranscription&&sc.inputTranscription.text){const u=kRtUser(c); u.content+=sc.inputTranscription.text; c.you=u.content.trim(); if(c.st!=="listening")kState("listening"); kCaps();}
  if(sc.interrupted){kRtHush(c); if(R.uout){c.turns.push({role:"assistant",content:R.uout.trim()+" —"}); c.last=R.uout.trim(); R.uout="";} kState("listening"); return;}
  const parts=sc.modelTurn&&sc.modelTurn.parts||[]; parts.forEach(p=>{if(p.inlineData&&p.inlineData.data){if(R.uin){if(R.uin.content.trim()&&!R.uin.n){R.uin.n=1; c.userTurns++;} R.uin=null;} R.done=false; if(c.st!=="speaking")kState("speaking"); kRtPlay(c,p.inlineData.data);}});
  if(sc.outputTranscription&&sc.outputTranscription.text){R.uout+=sc.outputTranscription.text; c.last=R.uout.trim(); kCaps();}
  if(sc.turnComplete||sc.generationComplete){if(sc.turnComplete){if(R.uout.trim()){c.turns.push({role:"assistant",content:R.uout.trim()}); c.last=R.uout.trim();} R.uout="";} R.done=true; if(!R.srcs.length&&c.st==="speaking")kState("listening");}}
function kRtClosed(c,e){if(K.call!==c||c.ended)return; kRtStop(c,true); c.paused=true; c.pauseAt=Date.now(); kState("idle"); kHint("Canlı oturum kapandı. Devam etmek için mikrofona dokun.");}
/* Küre: koç konuşuyorsa susturur (söz kesme sesle de olur) */
function kRtOrb(c){if(c.st==="speaking"||c.st==="thinking"){kRtHush(c); kState("listening");} else if(c.st==="idle")kRtPause(c,false);}
function kRtPause(c,on){const R=c.rt; if(!R)return; c.paused=on; if(on){c.pauseAt=Date.now(); kRtHush(c);} else if(c.pauseAt){c.pausedMs+=Date.now()-c.pauseAt; c.pauseAt=0;}
  try{R.mic.getTracks().forEach(t=>t.enabled=!on);}catch(e){} kState(on?"idle":"listening");}
function kRtText(c,v){c.turns.push({role:"user",content:v}); c.userTurns++; c.you=v; kCaps(); kRtSend(c,{clientContent:{turns:[{role:"user",parts:[{text:v}]}],turnComplete:true}});}
function kRtRepeat(c){kRtHush(c); kRtSend(c,{clientContent:{turns:[{role:"user",parts:[{text:c.lang==="it"?"(Ripeti la tua ultima frase molto lentamente.)":"(Please repeat your last sentence slowly.)"}]}],turnComplete:true}});}
function kRtStop(c){const R=c&&c.rt; if(!R)return; c.rt=null; try{R.ws&&R.ws.close();}catch(e){} try{R.proc&&R.proc.disconnect(); R.src&&R.src.disconnect();}catch(e){} kRtHushR(R);
  try{R.mic&&R.mic.getTracks().forEach(t=>t.stop());}catch(e){} try{R.ac&&R.ac.close();}catch(e){} try{R.out&&R.out.close();}catch(e){}}
function kRtHushR(R){(R.srcs||[]).forEach(s=>{try{s.stop();}catch(e){}}); R.srcs=[];}
