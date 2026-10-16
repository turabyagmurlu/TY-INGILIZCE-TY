/* Doğal ses seçimi: Natural/Online > Premium/Enhanced/Siri > Google; Compact/eSpeak/yenilik sesleri cezalı; voiceschanged ile yeniden; elle seçim önce.
   Doğal ses yoksa platforma göre tek satır ipucu (iPhone/iPad · Windows Chrome · Android), kapatılabilir; API/ücret sözü yok.
   NODE_PATH=$(npm root -g) node tests/voice_quality_test.js */
const H=require('./_h.js');const {ok,AT}=H;
const UA={ios:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipad:'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  win:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  edge:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
  android:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'};
const V=(name,lang,local)=>({name,lang,voiceURI:name,localService:local!==false,default:false});
const SETS={
  rich:[V('Alice (Compact)','it-IT'),V('Fred','en-US'),V('Bad News','en-US'),V('Google italiano','it-IT',false),V('Federica (Enhanced)','it-IT'),V('Microsoft Elsa Online (Natural) - Italian (Italy)','it-IT',false),V('Bells','it-IT'),V('eSpeak Italian','it'),
    V('Daniel','en-GB'),V('Google UK English Female','en-GB',false),V('Microsoft Libby Online (Natural) - English (United Kingdom)','en-GB',false),V('Zarvox','en-US'),V('Yelda','tr-TR'),V('Microsoft Emel Online (Natural) - Turkish (Turkey)','tr-TR',false)],
  apple:[V('Alice (Compact)','it-IT'),V('Alice (Premium)','it-IT'),V('Federica','it-IT'),V('Trinoids','en-US'),V('Albert','en-US'),V('Whisper','en-US'),V('Serena (Enhanced)','en-GB'),V('Daniel','en-GB'),V('Yelda','tr-TR')],
  plain:[V('Alice (Compact)','it-IT'),V('Google italiano','it-IT',false),V('Google UK English Female','en-GB',false),V('Daniel','en-GB'),V('Yelda','tr-TR')],
  bare:[V('Alice','it-IT'),V('Daniel','en-GB'),V('Yelda','tr-TR')]};
const MOCK=set=>`(()=>{const L={};const T=window.__tts={voices:${JSON.stringify(set)},spoken:[]};
  const syn={speaking:false,pending:false,paused:false,getVoices(){return T.voices;},addEventListener(n,f){(L[n]=L[n]||[]).push(f);},removeEventListener(){},speak(u){T.spoken.push({text:u.text,voice:u.voice&&u.voice.name});setTimeout(()=>{u.onstart&&u.onstart({});u.onend&&u.onend({});},5);},cancel(){},pause(){},resume(){}};
  window.__voicesChanged=v=>{T.voices=v;(L.voiceschanged||[]).forEach(f=>f());};
  Object.defineProperty(window,"speechSynthesis",{value:syn,configurable:true});window.SpeechSynthesisUtterance=class{constructor(t){this.text=t;}};})()`;
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const mk=async(set,ua,o)=>{o=o||{};const ctx=await b.newContext(Object.assign({viewport:{width:390,height:844},timezoneId:'Europe/Istanbul',serviceWorkers:'block'},ua?{userAgent:ua}:{}));const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));
   await p.addInitScript(H.clockScript(AT(2026,10,14,9)));await p.addInitScript(MOCK(set));await p.addInitScript(()=>{localStorage.setItem('tydil.apiKey','sk-ant-test');localStorage.setItem('tydil-tip-pin','1');});
   if(o.voice)await p.addInitScript(v=>localStorage.setItem('tydil.voice',JSON.stringify(v)),o.voice);
   await H.mockApi(p,{});await p.goto(srv.base+'/index.html');await p.waitForTimeout(500);return {p,ctx};};
 const best=(p,l)=>p.evaluate(l=>{const v=TYDIL.core.voiceFor(l);return v?v.name:null;},l);
 const tip=(p,l,w)=>p.evaluate(([l,w])=>{const h=TYDIL.core.tipHtml(l,w);const d=document.createElement('div');d.innerHTML=h;return d.textContent.replace('×','').trim();},[l,w||'t']);
 {const {p,ctx}=await mk(SETS.rich,UA.win);
  ok(await best(p,'it')==='Microsoft Elsa Online (Natural) - Italian (Italy)','it: "Microsoft Elsa Online (Natural)" beats Enhanced / Google / Compact / Bells / eSpeak');
  ok(await best(p,'en')==='Microsoft Libby Online (Natural) - English (United Kingdom)'&&await best(p,'tr')==='Microsoft Emel Online (Natural) - Turkish (Turkey)','en/tr: Online (Natural) voices win');
  ok(await tip(p,['it','en'])==='','natural voices present → no tip');
  await p.evaluate(s=>__voicesChanged(s),SETS.rich.filter(v=>!/Natural/.test(v.name)));
  ok(await best(p,'it')==='Federica (Enhanced)'&&await best(p,'en')==='Google UK English Female','voiceschanged → re-ranked: Enhanced > Google; Google > plain Daniel');
  await p.evaluate(s=>__voicesChanged(s),SETS.rich.filter(v=>!/Natural|Enhanced|Google/.test(v.name)));
  ok(await best(p,'it')==='Alice (Compact)'||await best(p,'it')!=='Bells','fallback avoids novelty Bells when a normal voice exists ('+await best(p,'it')+')');
  ok(await best(p,'en')==='Daniel','en: Daniel over Fred/Bad News/Zarvox');
  await ctx.close();}
 {const {p,ctx}=await mk(SETS.apple,UA.ios);
  ok(await best(p,'it')==='Alice (Premium)'&&await best(p,'en')==='Serena (Enhanced)','Apple: "Alice (Premium)" > Alice (Compact) / Federica; "Serena (Enhanced)" > Daniel and Trinoids/Albert/Whisper');
  ok(await tip(p,['it'])==='','premium Italian voice → no tip');
  const t=await tip(p,['it','en']);ok(t==='','Enhanced/Premium count as natural → no tip ('+t+')');
  await ctx.close();}
 {const {p,ctx}=await mk(SETS.plain,UA.win,{voice:{voices:{it:'Alice (Compact)'}}});
  ok(await best(p,'it')==='Alice (Compact)','manual override (Ayarlar → Ses) wins over ranking');await ctx.close();}
 const tips={};
 for(const [k,ua] of Object.entries({ios:UA.ios,ipad:UA.ipad,win:UA.win,android:UA.android,edge:UA.edge})){const {p,ctx}=await mk(SETS.bare,ua);tips[k]={it:await tip(p,['it']),en:await tip(p,['en'])};
   if(k==='ios'){
     await p.click('[data-tab=konus]');await p.waitForSelector('#kStart');ok(await p.isVisible('#konusMount .vTip'),'Konuş screen shows the tip line');
     await p.evaluate(()=>TYDIL.openTab('setup'));await p.waitForTimeout(150);const st=await p.textContent('#vcTip');ok(/İtalyanca \/ İngilizce/.test(st)&&(await p.$$('#vcTip .vTip')).length===1,'Ayarlar → Ses: ONE line naming both languages: '+st.trim());
     await p.click('#vcTip [data-vtip-x]');await p.reload();await p.waitForTimeout(400);await p.evaluate(()=>TYDIL.openTab('setup'));await p.waitForTimeout(150);
     ok((await p.textContent('#vcTip')).trim()==='','tip dismissed → stays hidden after reload');}
   await ctx.close();}
 ok(tips.ios.it==="Daha doğal ses: Ayarlar → Erişilebilirlik → Seslendirilen İçerik → Sesler → İtalyanca → 'Gelişmiş' ya da 'Premium' yazan sesi indir."&&/Sesler → İngilizce → 'Gelişmiş'/.test(tips.ios.en),'iPhone tip text (İtalyanca / İngilizce): '+tips.ios.it);
 ok(tips.ipad.it===tips.ios.it,'iPad gets the same iOS tip');
 ok(tips.win.it==="Daha doğal ses için uygulamayı Microsoft Edge'de aç.",'Windows/Chrome tip: '+tips.win.it);
 ok(tips.android.it==='Daha doğal ses: Ayarlar → Google Konuşma Hizmetleri → ses verilerini yükle.','Android tip: '+tips.android.it);
 ok(tips.edge.it==='','already in Edge → no Edge tip');
 ok(!Object.values(tips).some(t=>/API|anahtar|ücret|para|abonelik/i.test(t.it+t.en)),'tips never mention API keys or paid services');
 ok(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
 await b.close();srv.close();console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
