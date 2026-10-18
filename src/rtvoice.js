/* ---------- CANLI SES (OpenAI Realtime, WebRTC) ----------
   OpenAI anahtarı varsa Konuş görüşmesi doğrudan sesten sese çalışır: mikrofon → OpenAI (ses tanıma + model + ses) → hoparlör; gecikme ~0,5 sn,
   söz kesme sunucuda (semantic VAD). Metin dökümü (iki taraf) c.turns'e yazılır; özet, Türkçesi? ve kayıt mevcut Konuş akışıyla aynı.
   Bağlantı: tarayıcı → /v1/realtime/client_secrets (geçici anahtar) → /v1/realtime/calls (SDP). Geçici anahtar alınamazsa çok parçalı form ile doğrudan. */
const RT_API="https://api.openai.com/v1/realtime", RT_MODELS=["gpt-realtime-2.1-mini","gpt-realtime-mini","gpt-realtime"];
const kRtOn=()=>!!(window.TYRT&&TYRT.hasOai&&TYRT.hasOai()&&window.RTCPeerConnection&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
function kRtSession(c,model){const o=c.o; let sys=C.speakRules(c.lang,{topic:o.topic,goal:o.goal,vocab:o.vocab,structures:o.structures,opener:o.opener,level:o.level});
  if(Array.isArray(sys))sys=sys.map(b=>typeof b==="string"?b:(b&&b.text)||"").join("\n");
  sys+="\n\n"+(c.lang==="it"?"CANLI SESLİ GÖRÜŞME: doğal, sıcak bir sesle ve yavaş konuş. Görüşme başlayınca Türab'ı selamla ve ilk soruyu sor.":"LIVE VOICE CALL: speak naturally and warmly, at a relaxed pace. When the call starts, greet Türab and ask the first question.");
  return {type:"realtime",model,instructions:sys,audio:{input:{transcription:{model:"gpt-4o-mini-transcribe",language:c.lang},turn_detection:{type:"semantic_vad",eagerness:"high"},noise_reduction:{type:"near_field"}},output:{voice:c.lang==="it"?"marin":"cedar"}}};}
async function kRtErr(r){let m=""; try{const j=await r.json(); m=(j.error&&j.error.message)||"";}catch(e){} const e=new Error(m||("HTTP "+r.status)); e.status=r.status; return e;}
async function kRtConnect(c,model,offer){const key=TYRT.getOai(), session=kRtSession(c,model);
  let eph=null; try{const r=await fetch(RT_API+"/client_secrets",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({session})});
    if(r.ok){const j=await r.json(); eph=j.value||(j.client_secret&&j.client_secret.value)||null;} else if(r.status===401||r.status===429)throw await kRtErr(r);}catch(e){if(e.status)throw e;}
  let r; if(eph) r=await fetch(RT_API+"/calls",{method:"POST",headers:{"Authorization":"Bearer "+eph,"Content-Type":"application/sdp"},body:offer.sdp});
  else{const fd=new FormData(); fd.set("sdp",offer.sdp); fd.set("session",JSON.stringify(session)); r=await fetch(RT_API+"/calls",{method:"POST",headers:{"Authorization":"Bearer "+key},body:fd});}
  if(!r.ok)throw await kRtErr(r); return r.text();}
async function kRtStart(c){c.rt={pc:null,dc:null,mic:null,au:null,items:{},cap:""}; const R=c.rt; kState("thinking"); kHint("");
  try{R.mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});}
  catch(e){kHint("Mikrofon izni verilmedi. Tarayıcı ayarından mikrofona izin ver."); kRtFallback(c); return;}
  if(c.ended||K.call!==c){kRtStop(c); return;}
  const pc=new RTCPeerConnection(); R.pc=pc; const au=document.createElement("audio"); au.autoplay=true; au.setAttribute("playsinline",""); R.au=au;
  pc.ontrack=e=>{au.srcObject=e.streams[0]; try{au.play().catch(()=>{});}catch(_){}};
  R.mic.getTracks().forEach(t=>pc.addTrack(t,R.mic));
  const dc=pc.createDataChannel("oai-events"); R.dc=dc; dc.onmessage=e=>{let j; try{j=JSON.parse(e.data);}catch(_){return;} kRtEvent(c,j);};
  dc.onopen=()=>{kRtSend(c,{type:"conversation.item.create",item:{type:"message",role:"user",content:[{type:"input_text",text:c.lang==="it"?"(Görüşme başladı. Merhaba!)":"(The call has started. Hi!)"}]}}); kRtSend(c,{type:"response.create"});};
  pc.onconnectionstatechange=()=>{if(K.call!==c||c.ended)return; if(pc.connectionState==="failed"||pc.connectionState==="disconnected"){kHint("Canlı ses bağlantısı koptu. Mikrofona dokun, yeniden bağlanayım."); c.paused=true; c.pauseAt=Date.now(); kState("idle"); kRtStop(c,true);}};
  const offer=await pc.createOffer(); await pc.setLocalDescription(offer);
  let ans=null, err=null; for(const m of RT_MODELS){try{ans=await kRtConnect(c,m,offer); R.model=m; break;}catch(e){err=e; if(e.status!==400&&e.status!==404)break;}}
  if(!ans){kRtStop(c); const st=err&&err.status; kHint(st===401?"OpenAI anahtarı reddedildi. Ayarlar › Canlı ses'ten kontrol et.":st===429?"OpenAI kredisi bitti ya da limit doldu (platform.openai.com › Billing). Şimdilik normal görüşmeyle devam.":"Canlı sese bağlanılamadı ("+((err&&err.message)||"ağ").slice(0,80)+"). Normal görüşmeyle devam."); kRtFallback(c); return;}
  if(c.ended||K.call!==c){kRtStop(c); return;}
  await pc.setRemoteDescription({type:"answer",sdp:ans});}
function kRtFallback(c){if(K.call!==c||c.ended)return; c.rt=null; c.rtWanted=false; c.srOff=!C.srOk(); const f=document.getElementById("kcType"); if(f)f.hidden=!c.srOff; kSend(null);}
function kRtSend(c,o){try{c.rt&&c.rt.dc&&c.rt.dc.readyState==="open"&&c.rt.dc.send(JSON.stringify(o));}catch(e){}}
function kRtEvent(c,j){if(K.call!==c||c.ended)return; const R=c.rt; if(!R)return; const t=j.type||"";
  if(t==="input_audio_buffer.speech_started"){kState("listening"); c.you=""; kCaps(); return;}
  if(t==="input_audio_buffer.committed"){const id=j.item_id||("u"+Date.now()); if(!R.items[id]){const it={role:"user",content:""}; R.items[id]=it; c.turns.push(it);} kState("thinking"); return;}
  if(t==="conversation.item.input_audio_transcription.delta"){const it=R.items[j.item_id]; if(it){it.content+=j.delta||""; c.you=it.content.trim(); kCaps();} return;}
  if(t==="conversation.item.input_audio_transcription.completed"){let it=R.items[j.item_id]; if(!it){it={role:"user",content:""}; R.items[j.item_id]=it; c.turns.push(it);} it.content=String(j.transcript||"").trim(); if(it.content){if(!it.n){it.n=1; c.userTurns++;} c.you=it.content; kCaps();} return;}
  if(t==="response.output_audio.delta"||t==="output_audio_buffer.started"||t==="response.created"){if(c.st!=="speaking"&&t!=="response.created")kState("speaking"); return;}
  if(t==="response.output_audio_transcript.delta"||t==="response.audio_transcript.delta"){R.cap+=j.delta||""; c.last=R.cap; if(c.st!=="speaking")kState("speaking"); kCaps(); return;}
  if(t==="response.output_audio_transcript.done"||t==="response.audio_transcript.done"){const x=String(j.transcript||R.cap||"").trim(); R.cap=""; if(x){c.turns.push({role:"assistant",content:x}); c.last=x; kCaps();} return;}
  if(t==="output_audio_buffer.stopped"||t==="output_audio_buffer.cleared"||t==="response.done"){if(t==="response.done"){const s=j.response&&j.response.status; if(s==="failed"){const d=j.response.status_details&&j.response.status_details.error; kHint("Canlı ses: "+((d&&d.message)||"yanıt üretilemedi"));}} if(!c.paused&&c.st==="speaking"&&t!=="response.done")kState("listening"); return;}
  if(t==="error"){const m=(j.error&&j.error.message)||""; if(!/cancel|no active response/i.test(m))kHint("Canlı ses: "+m.slice(0,120)); return;}}
/* Küre: koç konuşuyorsa susturur (söz kesme sesle de olur) */
function kRtOrb(c){if(c.st==="speaking"||c.st==="thinking"){kRtSend(c,{type:"response.cancel"}); kRtSend(c,{type:"output_audio_buffer.clear"}); kState("listening");} else if(c.st==="idle")kRtPause(c,false);}
function kRtPause(c,on){const R=c.rt; if(!R)return kRtStart(c); c.paused=on; if(on){c.pauseAt=Date.now(); kRtSend(c,{type:"response.cancel"}); kRtSend(c,{type:"output_audio_buffer.clear"});} else if(c.pauseAt){c.pausedMs+=Date.now()-c.pauseAt; c.pauseAt=0;}
  try{R.mic.getTracks().forEach(t=>t.enabled=!on);}catch(e){} if(R.au)R.au.muted=on; kState(on?"idle":"listening");}
function kRtText(c,v){c.turns.push({role:"user",content:v}); c.userTurns++; c.you=v; kCaps(); kRtSend(c,{type:"conversation.item.create",item:{type:"message",role:"user",content:[{type:"input_text",text:v}]}}); kRtSend(c,{type:"response.create"});}
function kRtRepeat(c){kRtSend(c,{type:"response.create",response:{instructions:c.lang==="it"?"Ripeti la tua ultima frase molto lentamente, parola per parola.":"Repeat your last sentence again, slowly and clearly."}});}
function kRtStop(c,keep){const R=c&&c.rt; if(!R)return; try{R.dc&&R.dc.close();}catch(e){} try{R.pc&&R.pc.close();}catch(e){} try{R.mic&&R.mic.getTracks().forEach(t=>t.stop());}catch(e){} try{if(R.au){R.au.srcObject=null;}}catch(e){}
  if(!keep)c.rt=null; else{R.pc=null; R.dc=null; R.mic=null; c.rt=null;}}
