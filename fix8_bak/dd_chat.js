/* ---------- KOÇ SOHBETİ (sayfa içi, üç ajan) ----------
   Bağlar: <section id="coachChat"> (yoksa kapağın altına kendisi açar).
   Kullandıkları: S, db, SYL, SPEAK_EN, INSTR, planFor, planState, startMessage, curTopic, dueCards, topMistakes, lastNext, doneToday, today, esc, parseSummary, applySummary.
   Ajanlar: it (Chiara · İtalyanca Koç) · en (Oliver · İngilizce Koç) · db (Selin · Dil Bilgisi Uzmanı)
   Sınıf öneki: cc-  ·  db: chats/<tarih>_<it-koc|en-koc|dilbilgisi>  ·  seans satırı: sessions/chat-<tarih>-<ajan>-<dil>
   Kapak düğmesi "dd:start" olayını yollar → sıradaki bloğun ajanına geçilir, ders başlar. */
const CC={sample:null,ready:false,locked:"",tools:true,agent:"it",turns:[],key:"",busy:false,ctl:null,live:null,stick:true,mem:{},saveWarned:false,saving:Promise.resolve(),loading:false,loadP:Promise.resolve()};
/* Ders modu köprüsü (focus_logic doldurur; bu dosya önce yüklendiği için burada varsayılan) */
const ccDers={open:()=>false,head:()=>"",afterInit:null,unfinished:()=>false,done:()=>false};
/* Ses köprüsü (voice.js doldurur): afterRun(reply,ok) yanıt bitince · onSend(o) gönderimde · meta(text)→{voice,pron} mikrofon kaynaklı mesaj
   · beforeTts() Dinle düğmesi · voiceURI(lang)/rate() ses seçimi · voiceOn()→{mic,tts,speak,hands,lang} · paint() · onAgent() · dersBlock(b) · dersClose() */
const ccHooks={afterRun:null,onSend:null,meta:null,beforeTts:null,voiceURI:null,rate:null,voiceOn:null,paint:null,onAgent:null,dersBlock:null,dersClose:null};
const ccVoice=()=>ccHooks.voiceOn?ccHooks.voiceOn():{mic:false,tts:false,speak:false,hands:false,lang:""};
/* Ders modu açıkken gizlenen gezinme/bitirme çipleri (blok geçişi yalnızca "Bloğu bitirdim" ile) */
const CC_NAV_CHIPS=["Sonraki blok","Sesli tekrar","Bugünü bitir ve kaydet","Bitir · 3 ifade + kaydet"];
const CC_MAX_STORE=40, CC_MAX_SEND=28, CC_SEND_BYTES=90000;
const CC_AGENTS={
  it:{id:"it-koc",name:"Chiara",to:"Chiara'ya",kind:"İtalyanca Koç",mono:"İT",cls:"it",langs:["it"],tier:"default",tools:["kelime_ekle","kart_sonuc","konu_durumu","seans_kaydet","sinav_kaydet","durum_oku"],
    role:"12 haftada temel A1 · kelime, gramer, okuma-yazma bloklarını yürütür",short:"İtalyanca",
    start:"Bugünkü İtalyanca dersini başlat.",cont:"Kaldığımız yerden devam edelim.",ph:"Cevabını yaz…",
    chips:[["Sonraki blok","Bu bloğu kapatalım; kaydet ve sıradaki bloğa geç."],["Tekrar açıkla","Son anlattığını farklı bir yoldan, daha basit tekrar açıkla; Türkçeyle karşılaştır."],["Örnek ver","Bununla ilgili 3 yeni örnek ver; şantiye/iş hayatından olsun."],["Beni test et","Şu ana kadar işlediklerimizden beni kısa bir testle sına; soruları tek tek sor."],["Okunuşu","Son kelimelerin okunuşunu hece hece, vurgulu heceyi göstererek tekrar ver."],["Sesli tekrar","Sesli tekrar bloğuna geçelim: bugünün malzemesinden 5–8 cümle ver; dinleyip 3 kez sesli tekrar edeceğim."],["Bugünü bitir ve kaydet","Bugünlük bu kadar. Seansı araçlarla kaydet ve kısa bir özet ver: ne çalıştık, hatalarım, yarın neye odaklanacağız.",1]]},
  en:{id:"en-koc",name:"Oliver",to:"Oliver'a",kind:"İngilizce Koç",mono:"EN",cls:"en",langs:["en"],tier:"default",tools:["kelime_ekle","kart_sonuc","seans_kaydet","durum_oku","konu_durumu"],
    role:"B1+ → B2 · günün konusunda gerçek konuşma, akıcılık ve doğallık",short:"İngilizce",
    start:"Bugünkü konuşmayı başlat.",cont:"Let's pick up where we left off.",ph:"Write in English…",
    chips:[["Daha zor soru","Ask me a harder follow-up question that pushes me to use today's grammar focus."],["Konu değiştir","Let's switch to another work-related topic. Ask me the first question."],["Nasıl derim","Bunu İngilizce nasıl doğal söylerim: ",0,1],["Hatalarımı özetle","Şu ana kadarki hatalarımı kısa bir tabloda özetle: yanlış → daha doğal → neden."],["Bitir · 3 ifade + kaydet","Let's wrap up. Bana 3 daha doğal ifade öğret, en sık 2 hatamı söyle ve seansı araçlarla kaydet.",1]]},
  db:{id:"dilbilgisi",name:"Selin",to:"Selin'e",kind:"Dil Bilgisi Uzmanı",mono:"DB",cls:"db",langs:["it","en"],tier:"default",tools:["konu_durumu","kelime_ekle","sinav_kaydet","durum_oku"],
    role:"İtalyanca + İngilizce · kural, form tablosu, cümle çözümleme, metin düzeltme",short:"Dil bilgisi",
    ph:"Soru sor ya da metin yapıştır…",
    chips:[["Tabloyla göster","Bunu tek bir özet form tablosunda göster."],["Türkçeyle karşılaştır","Bu yapıyı Türkçeyle adım adım karşılaştır; Türklerin en sık yaptığı hataları yanlış → doğru ver."],["Alıştırma ver","Bu konuda kolaydan zora 5 alıştırma ver; cevapları verme, ben yazınca tek tek değerlendir."],["Cümle çözümle","Şu cümleyi öğe öğe çözümle (işlev, zaman/kip, neden bu yapı, Türkçesi):\n",0,1],["Metnimi düzelt","Şu metni düzelt; önce düzeltilmiş hali, sonra yanlış | doğru | kural tablosu:\n",0,1],["Kartlara ekle","Bu cevaptaki önemli kalıp ve kelimeleri kartlarıma ekle.",1]]}
};
const CC_ORDER=["it","en","db"];
const ccA=()=>CC_AGENTS[CC.agent];
const CC_LANGN={it:"İtalyanca",en:"İngilizce"};
/* Anahtar yokken koçlar kilitli; bu metin Ayarlar'a götüren kartla gösterilir */
const CC_NOKEY="Koçlar için Ayarlar'dan API anahtarı gir.";
const CC_PENDING="Anahtar doğrulanıyor…";
const CC_KEYBAD="Anahtar doğrulanamadı: ";
const CC_ERR={
  not_granted:["Koçlara bağlanılamadı. Ayarlar'dan API anahtarını kontrol et.",true],
  sampling_disabled:["Bu anahtarla Claude kullanılamıyor. Ayarlar'dan anahtarı ve planını kontrol et.",true],
  not_declared:["Sohbet bu sayfa sürümünde kapalı. Sayfayı yenile.",true],
  capability_disabled:[CC_NOKEY,true],
  capability_removed:["Bu tarayıcı sohbeti desteklemiyor. Tarayıcıyı güncelle.",true],
  rate_limited:["Çok sık istek gitti ya da kullanım limitine takıldın. Biraz bekleyip tekrar dene.",false],
  session_expired:["API anahtarı geçersiz; Ayarlar'dan kontrol et.",true],
  permission_denied:["Bu anahtar bu modele erişemiyor / izin yok. Ayarlar'dan anahtarı ya da modeli değiştir.",true],
  refused:["Bu mesaja yanıt gelmedi. Farklı ifade edip tekrar dene.",false],
  empty_completion:["Boş yanıt döndü. Mesajı kısaltıp ya da netleştirip tekrar dene.",false],
  prompt_too_large:["Sohbet çok uzadı. Alttaki Yeni sohbet düğmesiyle baştan başla; kayıtların silinmez.",false],
  tools_unavailable:["Pano araçları bu modelde çalışmadı. Tekrar dene.",false],
  incomplete:["Yanıt yarıda kesildi (bağlantı koptu). Tekrar dene.",false],
  upstream_error:["Bağlantı koptu ya da Claude geçici olarak yanıt vermedi. Tekrar dene.",false]
};
const CC_SVG={
  say:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  send:'<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13"/><path d="M13 6l6 6-6 6"/></svg>',
  stop:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/></svg>',
  down:'<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M6 13l6 6 6-6"/></svg>',
  ok:'<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
  mic:'<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>'
};
const ccq=s=>CC.root?CC.root.querySelector(s):null;
const ccAv=(a,sm)=>`<span class="cc-av ${a.cls}${sm?" sm":""}" aria-hidden="true">${a.mono}</span>`;

/* ---- güvenli markdown ---- */
function ccInline(s,live){
  const keep=[]; const hold=h=>"\u0000"+(keep.push(h)-1)+"\u0000";
  s=esc(s);
  s=s.replace(/`([^`\n]+)`/g,(m,c)=>hold("<code>"+c+"</code>"));
  s=s.replace(/\[\[(it|en):\s*([^\]\n]+?)\s*\]\]/g,(m,l,t)=>hold(`<span class="cc-tl ${l}" lang="${l}"><span class="cc-tx">${t}</span>${ccSayBtn(l)}</span>`));
  if(live) s=s.replace(/\[\[(it|en):\s*([^\]\n]*)$/,(m,l,t)=>hold(`<span class="cc-tl ${l}" lang="${l}"><span class="cc-tx">${t}</span></span>`));
  s=s.replace(/\*\*([^*\n]+?)\*\*/g,"<strong>$1</strong>").replace(/__([^_\n]+?)__/g,"<strong>$1</strong>");
  s=s.replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\w)/g,"$1<em>$2</em>").replace(/(^|[^\w])_([^_\s][^_\n]*?)_(?!\w)/g,"$1<em>$2</em>");
  s=s.replace(/~~([^~\n]+?)~~/g,"<del>$1</del>");
  return s.replace(/\u0000(\d+)\u0000/g,(m,i)=>keep[+i]);
}
function ccSayBtn(l){return CC_TTS?`<button type="button" class="cc-say" data-say="${l}" aria-label="Sesli oku (${CC_LANGN[l]})" title="Sesli oku">${CC_SVG.say}</button>`:"";}
function ccCells(l){let t=l.trim();if(t.startsWith("|"))t=t.slice(1);if(t.endsWith("|"))t=t.slice(0,-1);return t.split("|").map(c=>c.trim());}
function ccMd(src,live){
  const L=String(src||"").replace(/\r\n?/g,"\n").split("\n"), out=[]; let i=0;
  const isList=l=>/^\s*([-*+•]|\d{1,3}[.)])\s+/.test(l), isSep=l=>/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const isBlock=(l,n)=>/^\s*```/.test(l)||/^#{1,4}\s/.test(l)||/^\s*>/.test(l)||isList(l)||(/\|/.test(l)&&n!=null&&isSep(n));
  while(i<L.length){const l=L[i];
    if(!l.trim()){i++;continue;}
    if(/^\s*```/.test(l)){const b=[];i++;while(i<L.length&&!/^\s*```/.test(L[i]))b.push(L[i++]);i++;const body=b.join("\n");
      out.push(`<pre class="cc-pre"><code>${esc(body)}</code></pre>`+(/TYDIL\s*\{/.test(body)?`<button type="button" class="cc-mini" data-tydil>Panoya işle</button>`:""));continue;}
    if(/\|/.test(l)&&i+1<L.length&&isSep(L[i+1])){const h=ccCells(l);i+=2;const rows=[];while(i<L.length&&/\|/.test(L[i])&&L[i].trim())rows.push(ccCells(L[i++]));
      out.push(`<div class="cc-tw"><table><thead><tr>${h.map(c=>`<th>${ccInline(c,live)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${h.map((_,k)=>`<td>${ccInline(r[k]||"",live)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);continue;}
    let m=/^(#{1,4})\s+(.*)$/.exec(l); if(m){out.push(`<p class="cc-h">${ccInline(m[2],live)}</p>`);i++;continue;}
    if(/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)){out.push("<hr>");i++;continue;}
    if(/^\s*>/.test(l)){const b=[];while(i<L.length&&/^\s*>/.test(L[i]))b.push(L[i++].replace(/^\s*>\s?/,""));out.push(`<blockquote>${ccMd(b.join("\n"),live)}</blockquote>`);continue;}
    if(isList(l)){const ord=/^\s*\d/.test(l), items=[];
      while(i<L.length&&(isList(L[i])||(L[i].trim()&&/^\s{2,}\S/.test(L[i])&&items.length))){const x=L[i++];
        if(isList(x)){const sub=/^\s{2,}/.test(x);items.push({sub,t:x.replace(/^\s*([-*+•]|\d{1,3}[.)])\s+/,"")});} else items[items.length-1].t+="\n"+x.trim();}
      out.push(`<${ord?"ol":"ul"}>${items.map(it=>`<li${it.sub?' class="sub"':""}>${it.t.split("\n").map(z=>ccInline(z,live)).join("<br>")}</li>`).join("")}</${ord?"ol":"ul"}>`);continue;}
    const p=[];while(i<L.length&&L[i].trim()&&!(p.length&&isBlock(L[i],L[i+1])))p.push(L[i++]);
    out.push(`<p>${p.map(z=>ccInline(z,live)).join("<br>")}</p>`);
  }
  return out.join("");
}

/* ---- sesli okuma ---- */
const CC_TTS=typeof window!=="undefined"&&"speechSynthesis" in window&&typeof SpeechSynthesisUtterance!=="undefined";
let ccSpeaking=null;
const CC_LANGTAG={it:"it-IT",en:"en-GB",tr:"tr-TR"};
const CC_NOVELTY=/novelty|whisper|bells|bad news|bubbles|cellos|zarvox|trinoids|boing|deranged|hysterical|albert|fred|junior|kathy|ralph|wobble|organ|jester|good news|superstar|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i;
/* Dil için ses: Ayarlar'daki seçim → "google/natural/enhanced/neural" → ilk normal ses (yenilik sesleri atlanır) */
function ccPickVoice(lang){
  try{const vs=window.speechSynthesis.getVoices()||[]; const pref=ccHooks.voiceURI?ccHooks.voiceURI(lang):"";
    if(pref){const v=vs.find(v=>v.voiceURI===pref); if(v)return v;}
    const L=vs.filter(v=>(v.lang||"").toLowerCase().replace("_","-").startsWith(lang)), ok=L.filter(v=>!CC_NOVELTY.test(v.name));
    return ok.find(v=>/google|natural|premium|enhanced|neural/i.test(v.name))||ok[0]||L[0]||null;}
  catch(e){return null;}
}
function ccSpeak(text,lang,btn){
  if(!CC_TTS||!text)return; const syn=window.speechSynthesis;
  if(ccHooks.beforeTts)ccHooks.beforeTts();   /* mikrofon açıksa kapat: sayfa sesi dökülmesin */
  if(ccSpeaking){const was=ccSpeaking;syn.cancel();was.classList.remove("on");ccSpeaking=null;if(was===btn)return;}
  const u=new SpeechSynthesisUtterance(text.replace(/\s+/g," ").trim()); u.lang=CC_LANGTAG[lang]||"en-GB"; u.rate=ccHooks.rate?ccHooks.rate():(lang==="it"?.9:.95);
  const v=ccPickVoice(lang); if(v)u.voice=v;
  if(btn){btn.classList.add("on");ccSpeaking=btn;u.onend=u.onerror=()=>{btn.classList.remove("on");if(ccSpeaking===btn)ccSpeaking=null;};}
  syn.speak(u);
}

/* ---- gün durumu (plan + kayıt) ---- */
function ccDay(){
  let ps=[]; try{ps=dayBlocks();}catch(e){try{ps=planState();}catch(e2){ps=[];}}
  const it=ps.filter(b=>b.l==="it"), en=ps.filter(b=>b.l==="en");
  const itDone=it.length>0&&it.every(b=>b.st==="done"), enDone=en.length>0&&en.every(b=>b.st==="done");
  const nx=ps.find(b=>b.st!=="done");
  return {ps,it,en,itDone,enDone,next:nx?(nx.l==="it"?"it":"en"):null};
}
function ccAgentStatus(k,d){
  if(k==="it"){const left=d.it.filter(b=>b.st!=="done"), n=d.it.length-left.length;
    if(!d.it.length) return {t:"Bugün yok"}; return d.itDone?{t:"Bugün tamam",done:1}:{t:"İtalyanca · "+left.reduce((a,b)=>a+b.dk,0)+" dk kaldı"};}
  if(k==="en"){if(!d.en.length) return {t:"Bugün yok"}; const left=d.en.filter(b=>b.st!=="done").reduce((a,b)=>a+b.dk,0); return d.enDone?{t:"Bugün tamam",done:1}:{t:"İngilizce · "+left+" dk kaldı"};}
  const t=curTopic("it"); return {t:t?"Konu: "+t[2]:"Her iki dil"};
}

/* ---- arayüz ---- */
function ccMount(){
  if(CC.root)return;
  let el=document.getElementById("coachChat"), own=false;
  if(!el){own=true;el=document.createElement("section");el.id="coachChat";const hero=document.getElementById("hero"),wrap=document.querySelector(".wrap");
    if(hero&&hero.parentNode)hero.insertAdjacentElement("afterend",el); else if(wrap)wrap.prepend(el); else document.body.prepend(el);}
  el.classList.add("cc");if(own)el.classList.add("cc-own"); el.setAttribute("aria-label","Koçla sohbet"); CC.root=el;
  try{const a=localStorage.getItem("tydil-ccagent");if(CC_AGENTS[a])CC.agent=a;}catch(e){}
  el.innerHTML=(own?`<div class="cc-head"><div class="cc-ttl"><div><h2 class="cc-h2">Koçla çalış</h2><p class="cc-sub">Üç ajan: İtalyanca koç, İngilizce koç ve dil bilgisi uzmanı.</p></div></div></div>`:"")+`
    <div class="cc-agents" role="tablist" aria-label="Ajan seç">${CC_ORDER.map(k=>{const a=CC_AGENTS[k];
      return `<button type="button" class="cc-ag ${a.cls}" role="tab" id="ccTab-${k}" data-agent="${k}" aria-selected="false" aria-controls="ccLog" tabindex="-1">
        ${ccAv(a)}<span class="cc-agt"><span class="cc-agk">${esc(a.kind)}</span><span class="cc-agn">${esc(a.name)}</span><span class="cc-agr">${esc(a.role)}</span>
        <span class="cc-ags" data-agst></span></span><span class="cc-agnx" data-agnx title="Plana göre sırada" hidden>Sırada</span></button>`;}).join("")}</div>
    <p class="cc-cap" id="ccCap"></p>
    <div class="cc-logw"><div class="cc-log" id="ccLog" role="log" aria-live="polite" aria-relevant="additions text" tabindex="0" aria-label="Sohbet geçmişi"></div>
      <button type="button" class="cc-jump" id="ccJump" hidden>${CC_SVG.down}Son mesaja in</button></div>
    <div class="cc-hand" id="ccHand" hidden><span><b>İtalyanca blokları bugün tamam.</b> Sıra <span data-endk>15</span> dakikalık İngilizce konuşmada.</span><button type="button" class="cc-handb" data-agent-go="en">${ccAv(CC_AGENTS.en,1)}Oliver'a geç${CC_SVG.arrow}</button></div>
    <div class="cc-chips" id="ccChips" role="group" aria-label="Hızlı yanıtlar"></div>
    <form class="cc-form" id="ccForm" autocomplete="off">
      <label class="cc-vh" for="ccIn" id="ccInL">Mesaj yaz</label>
      <textarea class="cc-in" id="ccIn" rows="1" placeholder="Hazırlanıyor…" disabled enterkeyhint="send"></textarea>
      <button type="submit" class="cc-send" id="ccSend" aria-label="Gönder" disabled>${CC_SVG.send}</button>
      <button type="button" class="cc-stop" id="ccStop" aria-label="Durdur" hidden>${CC_SVG.stop}<span>Durdur</span></button>
    </form>
    <div class="cc-foot" id="ccFoot"><span class="cc-kb">Enter gönderir · Shift+Enter yeni satır</span><button type="button" class="cc-ghost" id="ccNew" title="Bu ajanla bugünkü sohbeti sil ve baştan başla">Yeni sohbet</button></div>`;
  const tabs=[...el.querySelectorAll("[data-agent]")];
  tabs.forEach(b=>b.addEventListener("click",()=>ccSetAgent(b.dataset.agent)));
  el.querySelector(".cc-agents").addEventListener("keydown",e=>{const i=tabs.indexOf(document.activeElement); if(i<0)return;
    let j=e.key==="ArrowRight"||e.key==="ArrowDown"?i+1:e.key==="ArrowLeft"||e.key==="ArrowUp"?i-1:e.key==="Home"?0:e.key==="End"?tabs.length-1:null;
    if(j==null)return; e.preventDefault(); j=(j+tabs.length)%tabs.length; tabs[j].focus(); ccSetAgent(tabs[j].dataset.agent);});
  el.querySelector("[data-agent-go]").addEventListener("click",e=>ccSetAgent(e.currentTarget.dataset.agentGo,true));
  const ta=ccq("#ccIn"), log=ccq("#ccLog");
  ta.addEventListener("input",ccGrow);
  ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();ccSubmit();}});
  ccq("#ccForm").addEventListener("submit",e=>{e.preventDefault();ccSubmit();});
  ccq("#ccStop").addEventListener("click",()=>{if(CC.ctl)CC.ctl.abort();});
  log.addEventListener("scroll",()=>{CC.stick=log.scrollHeight-log.scrollTop-log.clientHeight<60;if(CC.stick)ccq("#ccJump").hidden=true;},{passive:true});
  ccq("#ccJump").addEventListener("click",()=>{CC.stick=true;ccScroll(true);ccq("#ccJump").hidden=true;});
  log.addEventListener("click",ccLogClick);
  ccq("#ccChips").addEventListener("click",e=>{const b=e.target.closest("[data-chip],[data-fill]");if(!b||b.disabled)return; if(b.dataset.fill!=null)ccFill(b.dataset.fill); else ccSend(b.dataset.chip);});
  let armed=0; ccq("#ccNew").addEventListener("click",async e=>{const b=e.currentTarget;
    if(CC.busy)return; if(!CC.turns.length)return;
    if(Date.now()-armed>3500){armed=Date.now();b.textContent="Silinsin mi? Tekrar bas";b.classList.add("warn");setTimeout(()=>{if(Date.now()-armed>=3400){b.textContent="Yeni sohbet";b.classList.remove("warn");}},3600);return;}
    armed=0;b.textContent="Yeni sohbet";b.classList.remove("warn");CC.turns=[];await ccSave(true);ccRender();ta.focus();});
  /* Pano kaydı değişince (kapak/plan yeniden çizilir) ajan durumlarını tazele */
  const plan=document.getElementById("plan");
  if(plan&&typeof MutationObserver!=="undefined") new MutationObserver(()=>{clearTimeout(CC._mo);CC._mo=setTimeout(ccRefreshDay,60);}).observe(plan,{childList:true});
  document.addEventListener("dd:start",e=>{ccStartToday(e&&e.detail);});
  /* Öğrenme yolundaki "Selin'e bu konuyu sor": ajana geç, soruyu kutuya yaz (göndermez, öğrenci düzenleyip yollar) */
  document.addEventListener("dd:ask",e=>{ccAsk(e&&e.detail||{});});
  ccPaintBar(); ccRender();
}
/* Ders başlangıç mesajı: Sadece İngilizce gününde Oliver tam dersi (4 blok) başlatır */
function ccStartText(k){const a=CC_AGENTS[k]; return k==="en"&&dayMode()==="en"?"Bugünkü İngilizce dersini başlat.":a.start;}
function ccGrow(){const ta=ccq("#ccIn");if(!ta)return;ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight,200)+"px";}
function ccFill(t){const ta=ccq("#ccIn");if(!ta||ta.disabled)return;ta.value=t;ccGrow();ta.focus();try{ta.setSelectionRange(t.length,t.length);}catch(e){}}
function ccRefreshDay(){ if(!CC.root)return; ccPaintAgents(); if(!CC.turns.length&&!CC.busy){const log=ccq("#ccLog");if(log&&log.querySelector(".cc-empty"))log.innerHTML=ccEmpty();} }
function ccPaintAgents(){
  if(!CC.root)return; const d=ccDay(), a=ccA();
  CC.root.querySelectorAll("[data-agent]").forEach(b=>{const k=b.dataset.agent, on=k===CC.agent, st=ccAgentStatus(k,d);
    b.setAttribute("aria-selected",String(on)); b.tabIndex=on?0:-1; b.classList.toggle("on",on); b.disabled=CC.busy&&!on;
    const s=b.querySelector("[data-agst]"); s.textContent=st.t; s.classList.toggle("done",!!st.done);
    b.querySelector("[data-agnx]").hidden=!(d.next===k&&!on);});
  CC.root.dataset.ag=CC.agent; CC.root.classList.toggle("is-empty",!CC.turns.length);
  ccq("#ccCap").innerHTML=`<b>${esc(a.name)}</b> · ${esc(a.kind)} — ${esc(a.role)}`;
  const hand=ccq("#ccHand"); hand.hidden=!(CC.agent==="it"&&d.itDone&&d.en.length&&!d.enDone&&CC.turns.length>0);
  const ek=hand.querySelector("[data-endk]"); if(ek) ek.textContent=String(d.en.reduce((a,b)=>a+b.dk,0)||15);
}
function ccPaintBar(){
  if(!CC.root)return; const a=ccA();
  ccPaintAgents();
  const ta=ccq("#ccIn"), on=CC.ready&&!CC.locked;
  /* geçmiş yüklenirken yazma kapalı: sıradaki mesaj yanlış ajana/eski sohbetin üstüne gitmesin */
  ta.disabled=!on||CC.loading; ccq("#ccSend").disabled=!on||CC.busy||CC.loading; ccq("#ccSend").hidden=CC.busy; ccq("#ccStop").hidden=!CC.busy;
  ta.placeholder=CC.ready&&!CC.locked&&CC.loading?"Sohbet yükleniyor…":!CC.ready?(CC.locked?"Sohbet kapalı":"Hazırlanıyor…"):CC.locked?"Sohbet kapalı":CC.turns.length?a.ph:(CC.agent==="db"?a.ph:"Ya da kendi mesajını yaz…");
  ccq("#ccInL").textContent=a.to+" mesaj yaz";
  /* Bugünkü ders bitmeden ders koçunun sohbeti silinmez (Ders modu aynı sohbeti kullanır) */
  const d=ccDay(), lessonLock=(CC.agent==="it"&&d.it.length&&!d.itDone)||(CC.agent==="en"&&d.en.length&&!d.enDone), nb=ccq("#ccNew");
  nb.disabled=CC.busy||!CC.turns.length||!!lessonLock; nb.title=lessonLock?"Bugünkü ders bitince açılır; ders bu sohbetle yürüyor":"Bu ajanla bugünkü sohbeti sil ve baştan başla";
  /* Ders modu açıkken ya da bugünkü ders bitmemişken (Pratik bandı) blok geçiren/bitiren çipler yok: geçiş yalnızca Ders modunda */
  const hideNav=ccDers.open()||ccDers.unfinished();
  ccq("#ccChips").innerHTML=on&&CC.turns.length?a.chips.filter(c=>!(hideNav&&CC_NAV_CHIPS.includes(c[0]))).map(c=>c[3]?`<button type="button" class="cc-chip fill" data-fill="${esc(c[1])}" ${CC.busy?"disabled":""}>${esc(c[0])}…</button>`
    :`<button type="button" class="cc-chip${c[2]?" end":""}" data-chip="${esc(c[1])}" ${CC.busy?"disabled":""}>${esc(c[0])}</button>`).join(""):"";
  if(ccHooks.paint)ccHooks.paint();
}
function ccScroll(force){const log=ccq("#ccLog");if(!log)return;if(CC.stick||force){log.scrollTop=log.scrollHeight;}else ccq("#ccJump").hidden=false;}
function ccActHtml(a){return `<div class="cc-act ${a.err?"err":""}">${a.err?"":CC_SVG.ok}<span>${esc(a.t)}</span></div>`;}
function ccWho(){const a=ccA();return `<div class="cc-who">${ccAv(a,1)}<span class="cc-whon">${esc(a.name)}</span><span class="cc-whok">${esc(a.kind)}</span></div>`;}
function ccMsgHtml(t,i){
  if(t.r==="u"&&t.sys){const plain=t.sf||/^↻/.test(t.sys); return `<div class="cc-row sys"><p class="cc-pill${t.sf?" fail":""}"><span class="cc-vh">Sen: </span>${plain?"":CC_SVG.ok}<span>${esc(t.sys)}</span></p></div>`;}
  if(t.r==="u") return `<div class="cc-row me"${i!=null?` data-i="${i}"`:""}><div class="cc-b me"><span class="cc-vh">Sen: </span>${esc(t.c).replace(/\n/g,"<br>")}${t.pron?`<br><span class="cc-pron" title="Hedef: ${esc(t.pron.target)}">Telaffuz: %${t.pron.pct}</span>`:""}</div></div>`;
  const canListen=CC_TTS&&/\[\[(it|en):/.test(t.c);
  return `<div class="cc-row" data-i="${i}">${ccWho()}<div class="cc-b"><span class="cc-vh">${esc(ccA().name)}: </span><div class="cc-md">${ccMd(t.c)}</div>${t.stopped?`<div class="cc-note">Durduruldu.</div>`:""}</div>
    ${(t.acts||[]).map(ccActHtml).join("")}${canListen?`<div class="cc-tools"><button type="button" class="cc-mini" data-listen>${CC_SVG.say}Dinle</button></div>`:""}</div>`;
}
function ccBlocks(list){
  const lbl={done:"Tamam",next:"Sırada",wait:"Bekliyor"};
  return `<ol class="cc-plan">${list.map((b,i)=>`<li class="${b.st}"><span class="cc-pn">${b.st==="done"?CC_SVG.ok:String(i+1).padStart(2,"0")}</span><b>${esc(b.t)} <span class="cc-pdk">· ${b.dk} dk</span></b><span class="cc-pst">${lbl[b.st]||""}</span><span class="cc-ps">${esc(noId(b.s))}</span></li>`).join("")}</ol>`;
}
function ccEmpty(){
  if(CC.locked===CC_NOKEY||CC.locked===CC_PENDING||(CC.locked||"").startsWith(CC_KEYBAD)){const pend=CC.locked===CC_PENDING, bad=!pend&&CC.locked!==CC_NOKEY;
    return `<div class="cc-empty cc-key"><div class="cc-eh"><span class="cc-keyIco" aria-hidden="true">${ICON("setup")}</span><div><p class="cc-ek">Koçlar kilitli</p><p class="cc-et">${pend?"Anahtar doğrulanıyor…":bad?"Anahtar doğrulanamadı":"API anahtarı gerekli"}</p></div></div>
      <p>${bad?esc(CC.locked.slice(CC_KEYBAD.length)):"Chiara, Oliver ve Selin senin Anthropic API anahtarınla çalışır. Anahtar yalnızca bu cihazda saklanır. Dersler ve kelime kartları anahtarsız da çalışır."}</p>
      ${pend?"":`<div class="cc-cta"><button type="button" class="cc-start" data-go="key">Anahtarı gir${CC_SVG.arrow}</button></div>`}</div>`;}
  if(CC.locked) return `<div class="cc-empty"><p class="cc-et">Sohbet kapalı</p><p>${esc(CC.locked)}</p><div class="cc-cta"><button type="button" class="cc-start ghost" data-go="key">Ayarlar'ı aç${CC_SVG.arrow}</button></div><p class="cc-mutedp">Dersi uygulama dışında yaptıysan koçun verdiği TYDIL kodunu Ayarlar → Gelişmiş → Elle kayıt kutusuna yapıştırabilirsin.</p></div>`;
  if(!CC.ready) return `<div class="cc-empty"><p class="cc-et">Hazırlanıyor…</p><p class="cc-mutedp">Koçlar birkaç saniye içinde hazır olur.</p></div>`;
  if(CC.loading) return `<div class="cc-empty"><p class="cc-et">Sohbet geçmişi yükleniyor…</p></div>`;
  const a=ccA(), d=ccDay(), intro=`<div class="cc-eh">${ccAv(a)}<div><p class="cc-ek">${esc(a.kind)}</p><p class="cc-et">${esc(a.name)}</p></div></div>`;
  /* Pratik'te üstte "Derse başla" bandı varken ikinci bir başlat düğmesi yok: ders Ders modunda yürür */
  const banner=!ccDers.open()&&ccDers.unfinished();
  const startCta=(cls,chip,label)=>banner?`<p class="cc-mutedp">Dersi başlatmak için üstteki <b>Derse başla</b> düğmesine bas; burada istersen soru da sorabilirsin.</p>`:`<div class="cc-cta"><button type="button" class="cc-start ${cls}" data-chip="${esc(chip)}">${label}${CC_SVG.arrow}</button></div>`;
  if(CC.agent==="it"){const x=itToday(), t=x.t;
    if(d.itDone&&d.en.length&&!d.enDone) return `<div class="cc-empty">${intro}<p><b>Bugünün İtalyanca blokları tamam.</b> İstersen kısa bir tekrar yap ya da soru sor; asıl sıra İngilizce konuşmada.</p>${ccBlocks(d.it)}
      <div class="cc-cta"><button type="button" class="cc-start en" data-agent-go="en">Sıra İngilizce konuşmada${CC_SVG.arrow}</button><button type="button" class="cc-start ghost" data-chip="Bugün öğrendiklerimden kısa bir tekrar testi yap; soruları tek tek sor.">Kısa tekrar</button></div></div>`;
    return `<div class="cc-empty">${intro}<p>Bugünün İtalyanca bloklarını sırayla yürütür. Yeni kelimeyi artikeli ve okunuşuyla verir; kelimeleri kartlara, konu durumunu müfredata, süreyi kayda kendisi işler.</p>
      ${t?`<p class="cc-topic"><span>Konu · ${esc(t[0])}${x.p&&x.p.week>=1&&!x.p.finished?" · Hafta "+x.p.week:""}</span>${esc(t[2])}</p>`:x.mode==="review"?`<p class="cc-topic"><span>Hafta ${x.p.week} · tekrar günü</span>${esc(x.set.map(id=>topicById(id)[2]).join(", "))}</p>`:""}${ccBlocks(d.it)}
      ${startCta("it",a.start,(()=>{const nx=d.it.find(b=>b.st!=="done");return nx&&d.it.some(b=>b.st==="done")?esc(nx.t)+" bloğuyla devam et":"Bugünkü İtalyanca dersini başlat";})())}<p class="cc-mutedp">Koç yazarken Durdur ile kesebilirsin; kayıtlar koçun araçlarıyla kendiliğinden tutulur.</p></div>`;}
  if(CC.agent==="en"){const en=enToday().t, b=d.en[0];
    return `<div class="cc-empty">${intro}<p>Günün konusunda gerçek bir sohbet yürütür. Sen çok yazarsın, o kısa konuşur. 2–3 cevapta bir en önemli hatanı düzeltir, sonda 3 doğal ifade öğretir ve seansı kaydeder.</p>
      <div class="cc-brief"><div><span>${enToday().weekly?"Haftanın konusu":"Bugünün konusu"}</span><b>${esc(enToday().theme||SPEAK_EN[0])}</b></div>${en?`<div><span>Gramer odağı</span><b>${esc(en[2])}</b></div>`:""}</div>
      <p class="cc-tip">${CC_SVG.mic}<span>${ccVoice().mic?"Mikrofon düğmesine bas, İngilizce konuş; dökümü düzeltmeden gönder (döküm hatası telaffuz ipucudur). Konuşma modunda Oliver okur, sen cevaplarsın; eller serbest.":"Bu tarayıcıda mikrofon yok; cevabını telefon klavyesinin mikrofonuyla İngilizce dikte et, düzeltmeden gönder. Hoparlör düğmesi cümleleri sesli okur."}</span></p>
      ${!d.itDone&&d.next==="it"?`<p class="cc-mutedp">Plana göre önce İtalyanca blokları sırada; istersen yine de şimdi konuşabilirsin.</p>`:""}
      ${d.enDone?`<div class="cc-cta"><button type="button" class="cc-start en" data-chip="${esc(ccStartText("en"))}">Serbest konuşma başlat${CC_SVG.arrow}</button></div>`:startCta("en",ccStartText("en"),d.en.length>1?"Bugünkü İngilizce dersini başlat":"Bugünkü konuşmayı başlat")}</div>`;}
  const ti=curTopic("it"), te=curTopic("en");
  const ex=[ti?ti[2]+" konusunu baştan, derinlemesine anlat (İtalyanca).":"essere ile avere farkı ne?","il, lo, la, l' — hangisi ne zaman?",te?te[2]+" — kurallar ve tipik hatalar (İngilizce).":"Present perfect mi past simple mı?","‘Make’ ile ‘do’ farkı ne?"];
  return `<div class="cc-empty">${intro}<p>Kuralı teoriyle verir: ne, neden, form tablosu, Türkçeyle karşılaştırma, istisnalar, tipik hatalar, örnekler ve değerlendirmeli alıştırmalar. Yapıştırdığın cümleyi çözümler, metnini gerekçeleriyle düzeltir.</p>
    <div class="cc-exs">${ex.map(x=>`<button type="button" class="cc-chip" data-chip="${esc(x)}">${esc(x)}</button>`).join("")}</div>
    <div class="cc-exs two"><button type="button" class="cc-chip fill" data-fill="Şu cümleyi öğe öğe çözümle (işlev, zaman/kip, neden bu yapı, Türkçesi):&#10;">Cümle çözümlet…</button><button type="button" class="cc-chip fill" data-fill="Şu metni düzelt; önce düzeltilmiş hali, sonra yanlış | doğru | kural tablosu:&#10;">Metin düzelttir…</button></div></div>`;
}
function ccRender(){
  const log=ccq("#ccLog"); if(!log)return;
  log.innerHTML=CC.turns.length?CC.turns.map(ccMsgHtml).join(""):ccEmpty();
  CC.live=null; CC.stick=true; if(CC.turns.length)ccScroll(true); else log.scrollTop=0; ccPaintBar();
}
function ccLogClick(e){
  const s=e.target.closest(".cc-say"); if(s){const tx=s.parentElement.querySelector(".cc-tx");ccSpeak(tx?tx.textContent:"",s.dataset.say,s);return;}
  const go=e.target.closest("[data-agent-go]"); if(go){ccSetAgent(go.dataset.agentGo,true);return;}
  const fl=e.target.closest("[data-fill]"); if(fl&&!fl.disabled){ccFill(fl.dataset.fill);return;}
  const st=e.target.closest(".cc-start[data-chip],[data-chip]"); if(st&&!st.disabled){ccSend(st.dataset.chip);return;}
  const li=e.target.closest("[data-listen]"); if(li){const row=li.closest(".cc-row"),spans=[...row.querySelectorAll(".cc-tl")];
    if(spans.length){const pref=ccA().langs.length===1?ccA().langs[0]:null, has=l=>spans.some(x=>x.classList.contains(l));
      const l=pref&&has(pref)?pref:spans[0].classList.contains("en")?"en":"it";
      ccSpeak(spans.filter(x=>x.classList.contains(l)).map(x=>x.querySelector(".cc-tx").textContent).join(". "),l,li);} return;}
  const ty=e.target.closest("[data-tydil]"); if(ty){ccApplyTydil(ty);return;}
  const rt=e.target.closest("[data-retry]"); if(rt){rt.closest(".cc-err").remove();ccRetry();return;}
}
async function ccApplyTydil(btn){
  const pre=btn.previousElementSibling; if(!db){btn.insertAdjacentHTML("afterend",ccActHtml({t:"Kayıt tutulamıyor: cihaz depolaması açılamadı.",err:true}));return;}
  btn.disabled=true;
  const ag=ccA();
  try{const sum=parseSummary(pre.textContent); sum.date=today(); sum.sessions=sum.sessions.filter(x=>ag.langs.includes(x.lang)); if(!sum.sessions.length)throw new Error("Bu kodda "+ag.short+" oturumu yok.");
    const r=await applySummary(sum,{idFor:x=>"chat-"+today()+"-"+ag.id+"-"+x.lang});btn.outerHTML=ccActHtml({t:"Panoya işlendi: "+sum.sessions.map(x=>CC_LANGN[x.lang]+" "+x.total+" dk").join(", ")+" · "+r.addedCards+" yeni kart"});}
  catch(e){btn.disabled=false;btn.insertAdjacentHTML("afterend",ccActHtml({t:e&&e.code?dbErrText(e,"Kaydedilemedi"):(e.message||String(e)),err:true}));}
}

/* ---- ajan / geçmiş ---- */
function ccKey(){return today()+"_"+ccA().id;}
async function ccSetAgent(k,focus){
  if(CC.busy||!CC_AGENTS[k])return; const changed=k!==CC.agent;
  CC.agent=k; try{localStorage.setItem("tydil-ccagent",k);}catch(e){}
  if(changed&&ccHooks.onAgent)ccHooks.onAgent();
  if(changed||!CC.key) await ccLoad(); else ccPaintBar();
  if(focus){const ta=ccq("#ccIn"); if(ta&&!ta.disabled)ta.focus({preventScroll:true});}
}
/* Kapak düğmesi: sıradaki bloğun ajanına geç, boşsa dersi başlat, doluysa devam mesajını hazırla */
/* det.agent: Ders modu hangi koçun bloğunda olduğunu söyler; det.auto: blok geçişinde dolu sohbete devam mesajını kendisi yollar */
/* Döner: "sent" (ilk mesaj/devam yollandı) · "rerun" (son mesaj öğrencinindi, yanıt yeniden istendi) · "resumed" (dolu sohbet, kutu boş) · "" */
async function ccStartToday(det){
  const d=ccDay(), k=det&&CC_AGENTS[det.agent]?det.agent:(d.next||"en");
  if(!CC.busy&&(k!==CC.agent||!CC.key)) await ccSetAgent(k);
  if(CC.loading) await CC.loadP;
  const ta=ccq("#ccIn"); if(!ta)return ""; let r="";
  if(CC.ready&&!CC.locked&&!CC.busy&&CC.agent===k){const a=ccA();
    if(!CC.turns.length){ccSend(d.next||(det&&det.agent)?ccStartText(k):"Bugünkü bloklar tamam; serbest konuşalım. Bir konu aç ve ilk soruyu sor.");r="sent";}
    else if(det&&det.auto){ccSend(a.cont);r="sent";}
    else {const lt=CC.turns[CC.turns.length-1]; if(lt.r==="u"&&!lt.sys){ccRun();r="rerun";} else r="resumed";}}
  setTimeout(()=>{if(!ta.disabled)ta.focus({preventScroll:true});},380);
  return r;
}
async function ccAsk(d){
  const k=CC_AGENTS[d.agent]?d.agent:"db"; if(!CC.busy&&(k!==CC.agent||!CC.key)) await ccSetAgent(k);
  const ta=ccq("#ccIn"); if(!ta||CC.agent!==k)return;
  if(!ta.disabled&&d.text) setTimeout(()=>ccFill(String(d.text)),380);
}
function ccClean(arr){return (Array.isArray(arr)?arr:[]).filter(t=>t&&(t.r==="u"||t.r==="a")&&typeof t.c==="string"&&t.c.trim()).slice(-CC_MAX_STORE)
  .map(t=>{const o={r:t.r,c:t.c.slice(0,24000)};if(t.r==="u"&&typeof t.t==="number")o.t=t.t;if(t.r==="u"&&typeof t.sys==="string"&&t.sys){o.sys=t.sys.slice(0,120);if(t.sf)o.sf=1;}if(t.r==="u"&&t.voice)o.voice=1;if(t.r==="u"&&t.pron&&typeof t.pron==="object")o.pron={pct:Math.round(+t.pron.pct||0),target:String(t.pron.target||"").slice(0,200)};if(t.r==="a"){if(Array.isArray(t.acts)&&t.acts.length)o.acts=t.acts.slice(0,12).map(a=>({t:String(a&&a.t||"").slice(0,200),err:!!(a&&a.err)}));if(t.stopped)o.stopped=true;}return o;});}
/* Geçmiş yüklenirken CC.loading: gönderimler sıraya girer, yüklenen geçmiş yerel mesajlarla BİRLEŞTİRİLİR (ezilmez) */
function ccLoad(){
  const key=ccKey(); CC.key=key;
  if(CC.mem[key]){CC.turns=CC.mem[key]; CC.loading=false; ccRender(); return Promise.resolve();}
  CC.turns=[]; CC.loading=true; ccRender();
  CC.loadP=(async()=>{let got=[];
    if(db){try{const d=await db.collection("chats").doc(key).get(); if(d&&d.exists){const v=d.data()||{};got=ccClean(v.turns);}}catch(e){}}
    if(CC.key!==key)return;
    const local=CC.turns.filter(t=>!got.some(g=>g.r===t.r&&g.c===t.c&&g.t===t.t));
    CC.turns=got.concat(local); CC.mem[key]=CC.turns; CC.loading=false; ccRender();})();
  return CC.loadP;
}
/* Aynı belgeye üst üste yazma olmasın: kayıtlar sıraya girer */
function ccSave(force){const job=()=>ccSaveNow(force); CC.saving=CC.saving.then(job,job); return CC.saving;}
async function ccSaveNow(force){
  CC.turns=ccClean(CC.turns); CC.mem[CC.key]=CC.turns; if(!db)return;
  let turns=CC.turns; while(turns.length>2&&JSON.stringify(turns).length>200000) turns=turns.slice(2);
  const key=CC.key, date=key.split("_")[0], a=ccA();
  try{ if(!turns.length&&force) await db.collection("chats").doc(key).delete();
       else await db.collection("chats").doc(key).set({date,agent:a.id,mode:a.id,lang:a.langs.join("+"),turns,updated:new Date().toISOString()}); }
  catch(e){ if(!CC.saveWarned){CC.saveWarned=true;const f=ccq("#ccFoot");if(f)f.insertAdjacentHTML("beforeend",`<span class="cc-warn">Sohbet geçmişi kaydedilemiyor; sayfa açık kaldıkça durur.</span>`);} }
}

/* ---- bağlam (her çağrıda S'den yeniden) ---- */
function ccNextFor(lang){const s=S.sessions.filter(x=>x.lang===lang&&x.next).sort((a,b)=>((b.date||"")+(b.created||"")).localeCompare((a.date||"")+(a.created||"")));return s.length?s[0].next:"";}
function ccTopicLine(l){
  if(l==="it"){const x=itToday(); if(x.mode==="review") return "TEKRAR GÜNÜ (hafta "+x.p.week+"): yeni konu açma; gramer bloğunda karışık alıştırmayla pekiştir: "+x.set.map(id=>id+" "+topicById(id)[2]).join(", ");
    const t=x.t; if(!t)return "müfredat bitti — tekrar ve serbest pratik"; const st=(S.topics[t[1]]||{}).status;
    return t[1]+" · "+t[0]+" · "+t[2]+" ("+t[3]+")"+(st==="doing"?" — ÇALIŞILIYOR (devam)":" — YENİ KONU")+({catchup:" · TELAFİ: program gerisinde, bugün bitirmeyi hedefle",ahead:" · ÖNDEN: haftanın konuları tamam"}[x.mode]||"");}
  const t=l==="en"?enToday().t:curTopic(l);if(!t)return "müfredat bitti — tekrar ve serbest pratik";const st=(S.topics[t[1]]||{}).status;
  return t[1]+" · "+t[0]+" · "+t[2]+" ("+t[3]+")"+(st==="done"?" — tamam (pekiştir)":st==="doing"?" — ÇALIŞILIYOR (devam)":" — YENİ KONU");}
/* Program özeti (her ajan): hafta/gün, haftanın konuları ve hedefi, önde/geride, blok dakikaları, sınav */
function ccProg(k){
  const p=progInfo(), wd=weekday();
  const blocks="Bugünkü plan ("+MODES[dayMode()]+(wd===0?", Pazar":"")+"): "+planFor().map(b=>(b.l==="it"?"İT ":"EN ")+b.t+" "+b.dk).join(" · ")+" dk.";
  if(!p) return ["PROGRAM: başlatılmadı (öğrenci Öğren sekmesinden başlatır). Günlük 60 dk plan geçerli."].concat(k==="it"?[]:[blocks]);
  if(p.finished) return ["PROGRAM: 12 haftalık yoğun program bitti ("+p.finalDate+"). A2 konularıyla serbest devam.",blocks];
  const L=[], w=Math.max(1,p.week), r=ROADMAP[w-1], ws=weekStats(p,w);
  L.push("PROGRAM: yoğun 12 hafta, 60 dk/gün · "+(p.week<1?"ISINMA: Hafta 1 "+p.anchor+" Pazartesi başlıyor ("+p.lead+" gün); şimdilik Hafta 1 konuları":"Hafta "+p.week+"/12 · Gün "+p.day+"/84 · haftanın günü "+p.dw+"/7")+" · A1 final sınavına "+Math.max(0,p.a1Days)+" gün.");
  if(k!=="en") L.push("Bu hafta (İT): "+(r.it.length?r.it.map(id=>id+(stOf(id)==="done"?"✓":stOf(id)==="doing"?"▶":"")+" "+topicById(id)[2]).join(", "):"yeni konu yok, genel A1 tekrarı")+(r.rev&&r.it.length?" + tekrar günleri":"")+" · hedef "+r.it.length+" konu, "+r.words+" yeni kelime (şu an "+ws.words+"), "+WEEK_MIN+" dk (şu an "+ws.mins+").");
  L.push("Durum: "+(p.diff<0?(-p.diff)+" konu GERİDE ("+p.doneN+" tamam, plan "+p.expected+") → önce telafi konusunu bitir, kelime bloğunu kısaltma":p.diff>0?p.diff+" konu ÖNDE ("+p.doneN+"/"+p.expected+") → pekiştirmeye ağırlık ver":"planda ("+p.doneN+"/"+p.expected+" konu)")+".");
  if(k==="en"){const e=enToday(); L.push("İngilizce hafta "+w+": tema \""+e.theme+"\", gramer odağı "+e.t[1]+" "+e.t[2]+". Her gün temaya farklı bir açıdan gir.");}
  if(k!=="it") L.push(blocks);
  if(k!=="en"){const sk=sundayKind();
    if(sk.kind!=="normal") L.push("BUGÜN SINAV GÜNÜ: "+sk.cp.name+" — "+sk.cp.what+" ("+(Array.isArray(sk.cp.scope)?sk.cp.scope[0]+"–"+sk.cp.scope[sk.cp.scope.length-1]:sk.cp.scope)+", "+sk.cp.q+(sk.kind==="final"?" puan":" soru")+"). "+(examFor(p.week,sk.cp.tur)?"Bu sınav zaten kayıtlı; tekrar isterse yeniden yap ve sinav_kaydet ile güncelle.":"SINAV prosedürünü uygula, sonunda sinav_kaydet."));
    else {const nx=ROADMAP.find(x=>x.cp&&x.w>=w); if(nx){const d=cpDate(p,nx.w), n=daysBetween(today(),d), ex=examFor(nx.w,nx.cp.tur);
      if(!ex&&n>=0&&n<=7) L.push("Yaklaşan sınav: "+nx.cp.name+" ("+nx.cp.what+") — "+d+" Pazar, "+n+" gün sonra.");}
      const miss=ROADMAP.filter(x=>x.cp&&cpDate(p,x.w)<today()&&!examFor(x.w,x.cp.tur)); if(miss.length) L.push("Yapılmamış sınav: "+miss.map(x=>x.cp.name+" (hafta "+x.w+")").join(", ")+" — öğrenci isterse bugün yap.");}}
  return L;
}
/* Sınav prosedürü yalnızca sınav haftasında / bekleyen sınav varken eklenir (ilk mesaj kısa kalsın) */
function ccExamRelevant(){const p=progInfo(); if(!p||p.week<1) return false; if(p.finished) return false;
  return [4,8,12].includes(p.week)||ROADMAP.some(x=>x.cp&&cpDate(p,x.w)<today()&&!examFor(x.w,x.cp.tur));}
/* Koçlar için: biten konular + sıradaki + 3 sonraki (okuma metni ✓ konularla sınırlı); Selin tam listeyi görür */
function ccSylWin(l){const fi=SYL[l].findIndex(t=>(S.topics[t[1]]||{}).status!=="done"), end=fi<0?SYL[l].length:fi+4, rest=SYL[l].length-end;
  return SYL[l].slice(0,end).map(t=>{const st=(S.topics[t[1]]||{}).status;return t[1]+(st==="done"?"✓":st==="doing"?"▶":"")+" "+t[2];}).join(" · ")+(rest>0?" · … (+"+rest+" konu)":"");}
function ccSylLine(l){return SYL[l].map(t=>{const st=(S.topics[t[1]]||{}).status;return t[1]+(st==="done"?"✓":st==="doing"?"▶":"")+" "+t[2];}).join(" · ");}
function ccRecent(langs,n){return S.sessions.filter(s=>s.date&&s.note&&langs.includes(s.lang)).sort((a,b)=>((b.date||"")+(b.created||"")).localeCompare((a.date||"")+(a.created||""))).slice(0,n)
  .map(s=>s.date+" "+s.lang+": "+String(s.note).slice(0,140)).join(" | ");}
function ccElapsed(){const t=(CC.turns.find(x=>x.r==="u"&&x.t)||{}).t; if(!t)return null; return Math.max(1,Math.min(240,Math.round((Date.now()-t)/60000)));}
/* Aktif süre: öğrenci mesajları arasındaki boşluklar en fazla 3 dk sayılır (mola/telefon kırpılır). from: bu indeksten sonraki mesajlar */
const CC_GAP=180000;
function ccActive(from){const ts=CC.turns.slice(from||0).filter(x=>x.r==="u"&&typeof x.t==="number").map(x=>x.t); if(!ts.length)return null;
  let ms=0; for(let i=1;i<ts.length;i++) ms+=Math.min(CC_GAP,Math.max(0,ts[i]-ts[i-1])); ms+=Math.min(CC_GAP,Math.max(0,Date.now()-ts[ts.length-1]));
  return Math.max(1,Math.min(240,Math.round(ms/60000)));}
/* Son başarılı seans_kaydet'ten beri (= şu anki bloğun) aktif süresi */
function ccBlockActive(){let i=CC.turns.length-1; for(;i>=0;i--){const t=CC.turns[i]; if(t.r==="a"&&(t.acts||[]).some(a=>!a.err&&/^Seans (kaydedildi|güncellendi)/.test(a.t)))break;} return ccActive(i+1);}
function ccState(){
  const k=CC.agent, d=ccDay(), done=doneToday(), wd=weekday();
  const L=["Bugün: "+today()+" ("+fmtDay(today(),{weekday:"long"})+", İstanbul saati)"+(wd===0?" — PAZAR: haftalık tekrar günü, yeni konu yok.":""),
    "BUGÜNÜN DİL SEÇİMİ (öğrenci seçti): "+MODES[dayMode()]+({both:" — 45 dk İtalyanca + 15 dk İngilizce.",it:" — 60 dk yalnızca İtalyanca; İngilizce yok.",en:" — 60 dk yalnızca İngilizce (Oliver); İtalyanca yok."}[dayMode()])].concat(ccProg(k));
  const el=ccElapsed(); if(el!=null){const ac=ccActive(0);
    L.push("Bu sohbetin süresi: ilk mesajdan beri yaklaşık "+el+" dk; aktif "+ac+" dk (3 dk'yı aşan boşluklar sayılmadı)."+(k==="db"?"":" Son seans kaydından beri aktif: "+ccBlockActive()+" dk = şu anki bloğun GERÇEK süresi."));}
  /* Numaralar ekrandaki Ders modu başlığıyla aynı: günün tüm blokları (ör. 2/5 · Gramer · 20 dk) */
  const bn=b=>{try{return blockName(b);}catch(e){return b.t;}};
  const blk=list=>list.map(b=>{const j=d.ps.indexOf(b);return "- "+(j+1)+"/"+d.ps.length+" · "+bn(b)+" · "+b.dk+" dk ["+(b.st==="done"?"tamam":b.st==="next"?"SIRADA":"bekliyor")+"] — "+b.s+" (bugün kayıtlı: "+(done[b.l][b.k]||0)+" dk)";}).join("\n");
  if(ccDers.open()&&k!=="db") L.push("DERS MODU AÇIK — ekranda şu an: \""+ccDers.head()+"\". Blok geçişini öğrenci 'Bloğu bitirdim' düğmesiyle yapar; blok başlığında bu numarayı kullan, sıradaki bloğa kendin geçme.");
  const mins=l=>{const x=Object.entries(done[l]).filter(v=>v[1]).map(v=>v[0]+" "+v[1]).join(", ");return x||"0";};
  if(k==="it"){
    L.push("Bugünkü İtalyanca blokları ("+(d.itDone?"hepsi tamam":"ilk bekleyen bloktan başla")+"):",blk(d.it));
    L.push("İtalyanca gramer konusu: "+ccTopicLine("it"));
    const ct=itToday().t; if(ct&&ct[1]==="it01"&&wd!==0&&!d.itDone) L.push("BUGÜNE ÖZEL (it01 · ilk ders): sıra Gramer(sesler) → Kelime → Okuma → Sesli tekrar. Önce sesleri öğret; yeni kelimeleri o sesleri örnekleyecek şekilde seç; okuma = kelime/isim listesi okuma + sesten yazım dikte (cümle kurdurma yok); sesli tekrar = bugünün kelimeleri.");
    const due=dueCards("it"); L.push("Tekrar bekleyen İtalyanca kartlar ("+due.length+(due.length>8?"; 5'erli numaralı partilerle sor":"")+(due.length>15?"; derste en çok 15, kalan "+(due.length-15)+" kart için 'Kalanı Kartlar sekmesinde bitir' de":"")+"): "+(due.length?due.slice(0,20).map(c=>c.f+" ("+c.tr+")").join(", "):"yok — açılış tekrarını atla, yeni kelimeyle başla"));
    const kb=d.it.find(b=>b.k==="kelime"&&b.nw!=null); if(kb) L.push("Bugünkü yeni kelime sayısı: "+kb.nw+(kb.nw?"":" (tekrar yükü yüksek: bugün yeni kelime YOK, yalnızca tekrar)")+".");
    if(wd===0){const ws=weekStart(), wk=S.cards.filter(c=>c.lang==="it"&&c.added&&trKey(c.added)>=ws); if(wk.length) L.push("Bu hafta eklenen İtalyanca kelimeler ("+wk.length+"; Pazar kelime turu için): "+wk.slice(-40).map(c=>c.f+" ("+c.tr+")").join(", "));}
    const known=S.cards.filter(c=>c.lang==="it"); if(known.length) L.push("Destede zaten olan İtalyanca kelimeler ("+known.length+", yeniden 'yeni' diye öğretme): "+known.slice(-40).map(c=>c.f).join(", "));
    const m=topMistakes("it",6).map(x=>x[0]+" ×"+x[1]); if(m.length) L.push("İtalyancada tekrarlayan hatalar: "+m.join("; "));
    const nx=ccNextFor("it"); if(nx) L.push("Geçen İtalyanca seanstan not: "+nx);
    L.push("Bugün kayda geçen İtalyanca dakikalar: "+mins("it"));
    const r=ccRecent(["it"],3); if(r) L.push("Son İtalyanca seans notları: "+r);
    L.push("","İtalyanca müfredat (✓ tamam = okuma metninde kullanılabilir, ▶ çalışılıyor):",ccSylWin("it"));
  } else if(k==="en"){
    L.push("Bugünkü İngilizce blokları"+(d.en.length>1?" (SADECE İNGİLİZCE günü: 4 bloğu sırayla yürüt)":"")+":",d.en.length?blk(d.en):"yok");
    L.push("Gramer odağı: "+ccTopicLine("en"));
    L.push("İtalyanca blokları bugün: "+(!d.it.length?"yok (Sadece İngilizce günü)":d.itDone?"tamam":"henüz bitmedi"));
    const due=dueCards("en"); if(due.length) L.push("Tekrar bekleyen İngilizce kalıplar (ısınmada 2'sini kullandır, sonra sohbete serpiştir): "+due.slice(0,12).map(c=>c.f+" ("+c.tr+")").join(", "));
    const m=topMistakes("en",6).map(x=>x[0]+" ×"+x[1]); if(m.length) L.push("İngilizcede tekrarlayan hatalar (bunları özellikle yakala): "+m.join("; "));
    const nx=ccNextFor("en"); if(nx) L.push("Geçen İngilizce seanstan not: "+nx);
    L.push("Bugün kayda geçen İngilizce dakikalar: "+mins("en"));
    const r=ccRecent(["en"],3); if(r) L.push("Son İngilizce seans notları: "+r);
    L.push("","İngilizce müfredat (✓ tamam, ▶ çalışılıyor):",ccSylWin("en"));
  } else {
    L.push("İtalyanca sıradaki konu: "+ccTopicLine("it"),"İngilizce sıradaki konu: "+ccTopicLine("en"));
    ["it","en"].forEach(l=>{const m=topMistakes(l,6).map(x=>x[0]+" ×"+x[1]);if(m.length)L.push(CC_LANGN[l]+" tekrarlayan hatalar: "+m.join("; "));});
    const r=ccRecent(["it","en"],3); if(r) L.push("Son seans notları: "+r);
    L.push("","Müfredat kodları (✓ tamam, ▶ çalışılıyor):","İT: "+ccSylLine("it"),"EN: "+ccSylLine("en"));
  }
  return L.join("\n");
}
const CC_RULES={
it:`=== AJAN: CHIARA — İTALYANCA KOÇ ===
- Adın Chiara; yalnızca İtalyanca çalıştırırsın (İngilizce → Oliver, uzun gramer analizi → Selin). Ders içi kısa soruya 1–2 cümle; sırası gelmemiş konuysa "bunu ileride, <konu adı> konusunda göreceğiz" (öğrenciye konu kodu söyleme). Görülmemiş bir yapı gerekiyorsa (ör. tanışmada ho 24 anni) hazır kalıp olarak ver, çözümleme yapma.
- Hedef: 12 haftada temel A1 (günlük dinlemeyle sağlam A1). Abartma, "akıcı" vaat etme.
- Açıklama Türkçe; her İtalyanca cümlenin ardından Türkçesi. Kendinden dişil (sono pronta), Türab'a eril (sei pronto?). İsim hep artikeliyle; artikel/sıfat/ortaç uyumu kusursuz, öğrencinin uyum hatasını yakala.
- OKUNUŞ: Türkçe harf, tireli hece, vurgulu hece BÜYÜK: [[it: il quadro elettrico]] (il KUA-dro e-LET-tri-ko). ci/gi/chi/ghi/sci + ünlüdeki i ayrı hece DEĞİL: cantiere kan-TYE-re, chiave KYA-ve, ghiaccio GYAÇ-ço, giallo CAL-lo, lasciare la-ŞA-re; vurgulu i ayrı hecedir: farmacia far-ma-Çİ-a. gn = ny (bagno BA-nyo); gli ≈ ly (figlio Fİ-lyo, hoparlörden dinlet); sc+e/i = ş, sc+a/o/u = sk; ch = k, gh = g; z = ts/dz; çift ünsüz uzun (sette ≠ sete). Vurgudan emin değilsen o kelimeyi kullanma.
- BİÇİM: mesajda tek kavram (kural + mini tablo ya da 2–3 örnek), sonunda onu yoklayan TEK soru; düzelt, sonra sıradaki. Sıra: ne/neden → form → Türkçeyle fark → tipik Türk hatası. İstisna en çok 2.
- GERİ ÇAĞIRMA: iki yönlü (TR→İT yazdır, İT→TR), artikeliyle; eski kelimeleri karıştır; yanlış kelimeyi 2–3 soru sonra yeniden sor.
- AKIŞ: CANLI DURUM'daki blokları sırayla yürüt ("tamam" olanı atla; BUGÜNE ÖZEL varsa onun sırası). Blok başlığı tek satır ve numarası CANLI DURUM'daki gibi (ekrandakiyle aynı, günün tüm blokları): **2/5 · Gramer · 20 dk**. Program "geride" diyorsa telafi konusunu bitir, "önde" diyorsa pekiştir.
- DERS MODU: blok geçişini öğrenci "Bloğu bitirdim" düğmesiyle yapar. Bloğun içeriği bitince ya da süre dolunca "Bu blok tamam — Bloğu bitirdim'e bas" de ve bekle; sıradaki bloğa kendin geçme. "Bu bloğu (…) bitiriyorum" mesajı gelince istenen kaydı yap ve yalnızca o mesajın söylediği sonraki adımı başlat.
  0) AÇILIŞ: tekrar kartlarından 2–3 hızlı soru (TR→İT, İT→TR, mini cümle), kart_sonuc. Kart yoksa atla.
  1) KELİME 10: ÖNCE tekrar bekleyen kartlar (kart_sonuc, en çok 15; kalan varsa "Kalanı Kartlar sekmesinde bitir" de), SONRA yeni kelime: sayısı CANLI DURUM'daki "Bugünkü yeni kelime sayısı" kadar (0 ise yeni kelime yok). 4'lük partiler (| İtalyanca | Okunuş | Türkçe |; konuya ve işe bağlı), her partide kelime_ekle + 2 kontrol (bir önceki partiden bir kelime kat). Hafta 1–4: her gün 2 fiil kalıbı hazır kalıp olarak (lavoro a…, abito a…, mi piace…), çekim tablosu yok. Haftalık hedef ~50 (Kartlar sekmesi her gün bitirilirse).
  2) GRAMER 20: hafta 2'den itibaren ilk 2 dk önceki haftaların konularından 2 karışık soru; sonra konu_durumu "doing"; adım adım anlat; sonra 8–10 alıştırma TEK TEK: seçme → boşluk/dönüştürme → Türkçeden çeviri → öğrenilmiş yapılarla kendi cümlesi; yanlışta aynı tipte bir soru daha. TEKRAR GÜNÜ: listedeki konulardan karışık alıştırma, yeni konu yok.
  3) OKUMA-YAZMA 10: ÖNCE DİNLE: metni her cümle ayrı [[it:]] olacak şekilde ver; öğrenci önce metne bakmadan hoparlörle dinler, sonra okur. Uzunluk haftaya göre: hafta 1–3 5–8 cümle · hafta 4–8 60–100 kelime · hafta 9–12 100–150 kelime. YALNIZCA ✓ yapılar + bugünkü; en çok 2 yeni kelime, Türkçesiyle. 3 anlama sorusu; sonra 4–6 cümle yazdır (iş hayatından), düzelt.
  4) SESLİ TEKRAR 5: CANLI DURUM'da "SES: mikrofon var" yazıyorsa mikrofonla: her turda TEK kısa cümle ver — [[it: …]] + okunuş + Türkçe — ve "dinle, sonra mikrofona söyle" de. Öğrencinin cevabı [Sayfa notu] ile döküm + telaffuz eşleşme yüzdesiyle gelir: dökümü hedefle karşılaştır, yanlış dökülen kelimenin sesini/vurgusunu TEK ipucuyla düzelt (yanlışsa aynı cümleyi bir kez daha söylet), %85+ ise sıradaki cümle. Toplam 5–8 cümle, sonda en zor 2 ses. Mikrofon yoksa öz-pratik: 5–8 cümle listesi ([[it: …]] + okunuş + Türkçe), hoparlörle dinle → 3 kez sesli söyle → kendine 1–5 puan, düşük puana ses ipucu. Kayıt dk.sesli.
  5) ÇIKIŞ: 3 kelime (karışık yön) + konudan 1 soru; kısa özet (yeni kelimeler, konu durumu, 1–2 hata). Son satır (yalnızca İkisi gününde): "Sıra İngilizce konuşmada — Oliver seni bekliyor."
- seans_kaydet (lang "it"; GERÇEK dakikalar kelime/gramer/okuma/sesli; hatalar kısa etiket; son blokta sonraki): DERS MODU AÇIKSA yalnızca "Bu bloğu (…) bitiriyorum" mesajı gelince — kendiliğinden ASLA; ders modu kapalıysa her blok bitince.
- Pazar (İT 40): kelime = önce tekrar bekleyen kartlar (kart_sonuc), sonra bu hafta eklenenlerden 15'i karışık (kart_sonuc ÇAĞIRMA; yanlış yapılanları hatalar'a yaz); gramer = haftanın konularından 10 soruluk mini sınav (tek tek, sonda puan + hata tekrarı; program varsa sinav_kaydet tur "haftalik"); yeni konu yok. SINAV GÜNÜ yazıyorsa SINAV prosedürü.`,
en:`=== AJAN: OLIVER — İNGİLİZCE KOÇ ===
- Adın Oliver; Türab'ın İngilizce konuşma koçusun. B1+ → B2; eksik: akıcılık, doğallık, temel zaman doğruluğu. İtalyanca → Chiara, derin gramer → Selin.
- Sohbet İngilizce; düzeltme açıklaması Türkçe, tek cümle. Yazılı ama konuşma dili: kısa, doğal cümleler.
- SES: CANLI DURUM'daki "SES" satırına bak. Mikrofon varsa seans başında bir kez "cevabını mikrofona söyle" de; cevaplar konuşmadan yazıya çevrilerek gelir ([Sayfa notu] ile işaretli): küçük döküm hataları (noktalama, büyük harf, benzer sesli kelime) normaldir, onları düzeltme; anlam ve gramer hatasını düzelt. Aynı kelime art arda yanlış dökülüyorsa olası telaffuz sorunu olarak işaretle ve doğru sesi tek satırda ver ("Try: [[en: …]]"). Mikrofon yoksa: telefon klavyesinin mikrofonuyla İngilizce dikte etmesini iste, düzeltmeden göndersin.
- DERS MODU: konuşmayı öğrenci "Dersi bitir" düğmesiyle kapatır. Süre dolunca "Süre doldu — hazırsan Dersi bitir'e bas" de ve sohbeti sürdür; KAPANIŞ'ı "Konuşmayı bitiriyorum" mesajı gelince yap.
- KONU: CANLI DURUM'daki günün/haftanın teması, bir görev olarak (programda tema bütün hafta aynı; her gün farklı bir açı seç) (anlat, karşılaştır, kararını savun). Her soru gramer odağını zorlasın (present perfect → "How long have you…?", koşul → "What would you do if…?").
- ÜÇ EVRE:
  1) ISINMA (1–2 tur): tekrar bekleyen kalıplardan ya da geçen seansın hatalarından 2'sini kullanmasını gerektiren bir soru; kullandıysa kart_sonuc true, kullanamadıysa false + örnek cümle.
  2) GÖREV (~10 dk): sen 1–2 cümle + TEK soru (iki soruyu birleştirme). Takip: why / how / what happened next / an example from your site. Kısa cevapta ayrıntı iste ve iskele ver: Try: [[en: …]].
  3) KAPANIŞ (aşağıda).
- DÜZELTME: gramer odağındaki ya da CANLI DURUM'daki tekrarlayan hatalardan biri → HEMEN düzelt, bekletme. Diğerleri: 2–3 cevapta bir, en önemli 1 hata; küçükleri geç; profesyonel olmayan kelime seçimini de düzelt. Biçim en çok 3 satır: **Daha doğal:** [[en: …]] — Türkçe tek cümle neden. Sonra UPTAKE zorunlu: ya "Şimdi sen yaz:" ile düzeltilmiş cümleyi ona yeniden yazdır ya da sıradaki soruyu aynı yapıyı kullanmak zorunda kalacağı şekilde sor; yine yanlışsa bir kez daha model ver. Seansta tekrar eden hatayı sayıyla işaretle ("3. kez: was + fiil").
- PAY: konuşmanın en az %60–70'i onun; düzeltme bloklarını kısa tut, açıklamayı kapanışa sakla.
- KAPANIŞ (DERS MODU'nda yalnızca "Konuşmayı bitiriyorum" mesajı gelince; ders modu kapalıysa süre dolunca — hafta içi 15, Pazar 20 — ya da öğrenci isteyince): bugünkü hatalarından 3 doğal ifade (tablo | İfade | Ne zaman | Örnek |), en sık 2 hata (sayıyla), bu ifadeler için kelime_ekle (lang "en"), seans_kaydet (lang "en", speaking = CANLI DURUM'daki aktif süre, en çok planlanan+5; konu = gramer odağı kodu; hatalar; sonraki). Son olarak bir ifadeyle tek cümle yazdır.`,
db:`=== AJAN: SELİN — DİL BİLGİSİ UZMANI ===
- Adın Selin; İtalyanca ve İngilizce dil bilgisi uzmanısın. Ders akışı yürütmez, sohbet etmezsin: selam, övgü, dolgu cümlesi yok; doğrudan konuya gir. Açıklama Türkçe. Ders ya da konuşma pratiği istenirse Chiara'ya veya Oliver'a yönlendir.
- KONU AÇIKLAMASI — teori önce, bu başlıklarla: **Ne?** (1–2 cümle) → **Ne zaman / neden?** → **Form** (markdown tablo) → **Türkçeyle karşılaştırma** → **İstisnalar** → **Türklerin tipik hataları** (yanlış → doğru + neden) → **Örnekler** (iş/şantiye hayatından, Türkçesiyle) → **Alıştırma** (3–5 soru, kolaydan zora, numaralı; cevapları VERME).
- SEVİYE: İtalyanca A1–A2 konusunda istisna en çok 2, tipik hata en çok 3, örnek 4; İngilizcede B2 nüansı. Öğrenci "kısa/özet" derse SIKIŞTIRILMIŞ MOD: Ne? + Form tablosu + 1 tipik hata + 2 örnek + 3 soru, ≤150 kelime.
- ÖNKOŞUL: konu henüz işlenmemiş bir bilgiye dayanıyorsa (ör. artikeller cinsiyete) önce tek satır özet ver: -o çoğunlukla eril, -a dişil, -e ikisi de olabilir (artikelle ezberle), -ma ile biten Yunanca kökenliler eril (il problema).
- Değerlendirme: tek tek, doğru / yanlış → doğru + kural; sonda puan (x/y) ve zayıf nokta; gerekirse 2–3 ek soru.
- CÜMLE ÇÖZÜMLEME: tablo | Öğe | İşlev | Açıklama |; sonra zaman/kip, neden bu yapı, alternatifler, Türkçesi.
- METİN DÜZELTME: önce düzeltilmiş tam metin; sonra tablo | Yanlış | Doğru | Kural |; en sonda en önemli 1–2 genel öneri. Uzun metni cümle cümle [[en:]]/[[it:]] ile sar.
- Uzunluk kuralı sende yalnızca alıştırma değerlendirmesinde geçerli; konu açıklaması, çözümleme ve düzeltme tek mesajda verilir.
- Doğruluk her şeyden önce: kural uydurma, emin olmadığını söyle; kayıt/bölge farklarını belirt (resmî/gündelik, BrE/AmE, kuzey/güney).
- konu_durumu yalnızca CANLI DURUM'daki sıradaki konu için (ileri konuların sorusu cevaplanır ama işaretlenmez). Seans kaydı tutmazsın.
- Program haftasını bil: açıklamada örnekleri bu haftanın ve önceki haftaların konularıyla sınırla. Öğrenci sınav isterse SINAV prosedürünü sen de yürütürsün; kayıtlı sınavın hata analizini yaparsın.`
};
const CC_EXAM=`=== SINAV PROSEDÜRÜ (hafta 4/8/12 Pazar ya da öğrenci isterse) ===
- Başta tek mesajda: bölümler, soru sayısı, puanlama, süre (~30 dk; final 40). Sonra soruları TEK TEK sor; cevap gelmeden ipucu/doğru verme, ders anlatma. Her cevaptan sonra yalnızca "✓" ya da "✗ doğrusu: …" (tek satır), sonra sıradaki soru.
- Checkpoint 1 (it01–it08) ve Checkpoint 2 (it09–it16): 20 soru = Kelime 5 (TR→İT, artikeliyle) · Gramer 8 · Okuma 4 (6–8 cümlelik metin + 4 soru) · Yazma 3 (kısa cümle görevi; kısmi 0,5).
- Final A1 simülasyonu (it01–it20): Okuma 8 · Gramer 10 · Kelime 6 · Yazma 2 görev (25–35 kelimelik mesaj + kendini tanıtma; her biri 3 puan) = 30 puan. Dinleme bölümü YOK: sayfa ses çalıp anladığını ölçemez; bunu başta söyle, dinlemeyi podcast ile çalışmasını öner.
- Sonuç: | Bölüm | Puan | Zayıf nokta | tablosu, toplam ve yüzde. ≥%80 sağlam · %60–79 geçti (zayıf konuları tekrar listesine al) · <%60 tekrar gerekli (konu kodlarını say). Sonra sinav_kaydet (hafta, puan, toplam, tur, notlar = bölüm puanları + zayıf konu kodları).`;
function ccToolRules(a){const has=n=>a.tools.includes(n), coach=has("seans_kaydet"), L=["- ARAÇLAR (tek kural seti; dil: "+a.langs.join("/")+"). Araçtan sonra öğrenciye tek cümle; TYDIL kodu verme."];
  if(has("kelime_ekle")) L.push(coach?"  · kelime_ekle: yeni kelime/kalıbı öğrettiğin mesajda hemen ("+(a.langs[0]==="it"?"artikeliyle; ":"")+"f, tr, kısa ex). Destede olanı ekleme."+(a.langs[0]==="en"?" Ders içi düzeltmeden çıkan, tekrar kullanılabilir kalıp da kart olabilir (seansta en çok 5).":""):"  · kelime_ekle: yalnızca öğrenci isterse.");
  if(has("kart_sonuc")) L.push("  · kart_sonuc: tekrar bekleyen bir kartı sorup cevabı alınca işle (bildi true/false); toplu da gönderebilirsin. Bugün eklenen kartlara uygulama.");
  if(has("konu_durumu")) L.push("  · konu_durumu: yalnızca CANLI DURUM'daki sıradaki konu. Başlayınca \"doing\"; \"done\" = o konuda en az 5 alıştırmanın ya da odak yapı kullanımının %80'i doğru (5/5, 4/5, 7/8, 8/10). Altındaysa \"doing\" kalır.");
  if(coach) L.push("  · seans_kaydet: ders modunda yalnızca öğrencinin \"…bitiriyorum\" mesajı gelince, ders modu kapalıysa blok ya da konuşma bitince; \"sonraki\" alanına kod değil konu adı (panoda görünür). dk = o dilde bugün biten blokların TOPLAMI, blok blok (tekrar çağırmak aynı kaydı günceller, dakika düşmez). Dakika GERÇEK süredir: bu bloğa CANLI DURUM'daki \"son seans kaydından beri aktif\" değeri, en çok planlanan+5; hedef dakikayı ezbere yazma.");
  if(has("sinav_kaydet")) L.push("  · sinav_kaydet: Pazar mini sınavı (tur \"haftalik\") ya da checkpoint/final bitince bir kez; puan = doğru sayısı, toplam = soru/puan sayısı. Program yoksa çağırma.");
  if(has("durum_oku")) L.push("  · durum_oku: güncel plan, süre, kartlar.");
  return L.join("\n");}
/* Sesin durumu modele: mikrofon/okuma/Konuşma modu (voice.js) */
function ccVoiceLine(){const v=ccVoice(), L=[];
  if(!v.mic&&!v.speak) return "- Her şey yazılı; bu tarayıcıda sayfa mikrofonu dinleyemez. Öğrenci hoparlör düğmesiyle dinleyip sesli tekrar eder; okunuşu Türkçe harflerle ver.";
  L.push("- SES: "+(v.mic?"mikrofon var — öğrenci cevabını konuşarak verebilir (tarayıcı yazıya çevirir, [Sayfa notu] ile işaretlenir; döküm hataları telaffuz ipucudur)":"mikrofon yok — her şey yazılı")+
    (v.speak?"; yanıtların sesli OKUNUYOR: Türkçe kısımlar Türkçe sesle, [[it:]]/[[en:]] içi kendi diliyle. Sesli okunabilir yaz: tablo ve uzun liste yerine kısa cümleler, okunuş parantezlerini kısa tut.":"; sesli okuma kapalı, öğrenci hoparlör düğmesiyle dinler.")+" Okunuşu yine Türkçe harflerle ver.");
  if(v.hands) L.push("- KONUŞMA MODU AÇIK (eller serbest): sen okursun, öğrenci konuşur, döngü sürer. Yanıt ≤ 80 kelime, tek adım, sonda TEK soru; tablo yok; düzeltme en çok 2 satır.");
  return L.join("\n");}
function ccContext(){
  const a=ccA();
  const R=["","=== SAYFA İÇİ SOHBET ===",
  "- Sohbet Türab'ın Dil Defteri panosunun İÇİNDE; üç ajan var (Chiara İtalyanca, Oliver İngilizce, Selin dil bilgisi), geçmişleri ayrı. Yalnızca aşağıdaki ajan olarak konuş.",
  ccVoiceLine(),
  "- [[it: …]] / [[en: …]] işaretini YALNIZCA hedef dildeki metne koy; Türkçe kelime, okunuş ve açıklama asla içine girmez (sayfa içini o dilde seslendirir). Örnek: [[it: la chiave]] (la KYA-ve) — anahtar. Tablo hücrelerinde de aynı kural.",
  "- Ekranda okunuyor: mesaj ≤ ~120 kelime, tek adım, sonunda tek soru ya da görev; cevabı bekle. Ajan kuralındaki istisnalar hariç. Markdown serbest (kalın, liste, tablo). Emoji yok.",
  CC.tools?ccToolRules(a):
  (a.tools.includes("seans_kaydet")?"- Bu görünümde pano araçları yok; araç çağırma (araç geçen adımları araçsız yap). Ders ya da sohbet bitince (her blok sonunda değil, yalnızca en sonda bir kez) aşağıdaki formatta tek bir kod bloğu ver; sayfa onu tek tuşla işler. Yalnızca bu ajanın dilindeki oturumu yaz.\n"+INSTR_TYDIL:"- Bu görünümde pano araçları yok; araç çağırma. Konu durumunu öğrenci İlerleme → Öğrenme yolu'ndan kendisi işaretler; TYDIL kodu verme.")];
  return "Sen Türab'ın dil öğretmenisin; aşağıda hangi ajan olduğun yazıyor.\n\n"+INSTR_CORE+"\n"+R.join("\n")+"\n\n"+CC_RULES[CC.agent]+(CC.agent!=="en"&&ccExamRelevant()?"\n\n"+CC_EXAM:"")+"\n\n=== CANLI DURUM (sayfadan; her mesajda yenilenir, şu an) ===\n"+ccState();
}
/* İstem önbelleği: sabit talimat (ajan kuralları) ayrı blok + cache:true; CANLI DURUM her mesajda değişir, önbelleksiz */
function ccContextBlocks(){const s=ccContext(), i=s.indexOf("\n\n=== CANLI DURUM"); if(i<0) return [{type:"text",text:s}];
  return [{type:"text",text:s.slice(0,i),cache:true},{type:"text",text:s.slice(i+2)}];}
function ccWindow(){
  const out=[]; let bytes=0;
  for(let i=CC.turns.length-1;i>=0&&out.length<CC_MAX_SEND;i--){const t=CC.turns[i];
    let c=t.c; if(t.r==="a"){if(t.acts&&t.acts.length)c+="\n\n[Sayfa notu — araçlar çalıştı: "+t.acts.map(a=>a.t).join("; ")+"]"; if(t.stopped)c+="\n\n[Öğrenci yanıtı burada durdurdu.]";}
    if(t.r==="u"&&t.voice)c+="\n\n[Sayfa notu — bu cevap mikrofonla konuşuldu, yazıya tarayıcı çevirdi"+(t.pron?"; telaffuz eşleşmesi %"+t.pron.pct+" (hedef: "+t.pron.target+")":"")+"]";
    bytes+=c.length*2; if(bytes>CC_SEND_BYTES&&out.length)break; out.unshift({role:t.r==="u"?"user":"assistant",content:c});}
  return [{role:"user",content:ccContextBlocks()},...out];
}
/* ---- araçlar ---- */
const ccStr=(v,n)=>String(v==null?"":v).replace(/\s+/g," ").trim().slice(0,n);
const ccLang=(v,al)=>{const l=String(v||"").toLowerCase();if((l==="it"||l==="en")&&(!al||al.includes(l)))return l;throw new Error(al&&al.length===1?'lang "'+al[0]+'" olmalı; bu ajan yalnızca '+CC_LANGN[al[0]]+' çalışır.':'lang "it" ya da "en" olmalı.');};
function ccTools(act,a){
  return [
  {name:"kelime_ekle",description:"Öğrettiğin yeni kelime/kalıpları öğrencinin tekrar kartlarına ekler (aynısı varsa atlar). Yeni kelimeleri öğrettiğin anda çağır. Döner: eklenen sayısı, zaten olanlar, toplam kart.",
   inputSchema:{type:"object",properties:{lang:{type:"string",enum:a.langs},items:{type:"array",maxItems:20,items:{type:"object",properties:{f:{type:"string",description:"Kelime/kalıp; İtalyancada artikeliyle (la casa)"},tr:{type:"string",description:"Türkçesi"},ex:{type:"string",description:"Kısa örnek cümle"}},required:["f","tr"]}}},required:["lang","items"]},
   execute:async(inp,ctx)=>{const lang=ccLang(inp.lang,a.langs); if(!db)throw new Error("Kayıt kapalı (cihaz depolaması açılamadı).");
     const items=(Array.isArray(inp.items)?inp.items:[]).slice(0,20).map(w=>({f:ccStr(w&&w.f,120),tr:ccStr(w&&w.tr,160),ex:ccStr(w&&w.ex,240)})).filter(w=>w.f&&w.tr);
     if(!items.length)throw new Error("items boş ya da f/tr eksik.");
     const created=new Date().toISOString(), added=[], skipped=[];
     for(const w of items){ if(ctx&&ctx.signal&&ctx.signal.aborted)break;
       if(S.cards.some(c=>c.lang===lang&&String(c.f||"").toLowerCase()===w.f.toLowerCase())){skipped.push(w.f);continue;}
       /* yeni kart yarın ilk tekrara gelir (aynı gün tekrar birikmeyi şişirmesin) */
       const due1=addDays(today(),1); S.cards.push({lang,f:w.f,tr:w.tr,due:due1,added:created}); await db.collection("cards").add({lang,f:w.f,tr:w.tr,ex:w.ex,box:1,due:due1,added:created}); added.push(w.f);}
     CC_SESSW[lang]=(CC_SESSW[lang]||0)+added.length;
     act(added.length?added.length+" "+(lang==="it"?"İtalyanca":"İngilizce")+" kelime kartlara eklendi"+(skipped.length?" · "+skipped.length+" zaten vardı":""):"Kelimeler zaten kartlarda vardı ("+skipped.length+")");
     return {eklendi:added.length,zaten_vardi:skipped,toplam_kart:S.cards.filter(c=>c.lang===lang).length};}},
  {name:"konu_durumu",description:"Müfredat konusunun durumunu işaretler: sıradaki konuya başlayınca \"doing\", o konuda en az 5 alıştırmanın %80'i doğruysa \"done\". topic_id müfredat kodudur (it01–it34, en01–en20); sıradaki konudan en fazla bir sonrakine kadar kabul edilir (İngilizcede programın haftalık gramer odağı da kabul edilir). Döner: konu adı ve yeni durum.",
   inputSchema:{type:"object",properties:{lang:{type:"string",enum:a.langs},topic_id:{type:"string"},status:{type:"string",enum:["doing","done"]}},required:["lang","topic_id","status"]},
   execute:async inp=>{const lang=ccLang(inp.lang,a.langs), id=ccStr(inp.topic_id,8).toLowerCase(), st=inp.status==="done"?"done":inp.status==="doing"?"doing":null;
     if(!st)throw new Error('status "doing" ya da "done" olmalı.'); const t=SYL[lang].find(x=>x[1]===id);
     if(!t)throw new Error("Böyle bir konu kodu yok: "+id+". Geçerli: "+SYL[lang][0][1]+"–"+SYL[lang][SYL[lang].length-1][1]+".");
     const fi=SYL[lang].findIndex(x=>(S.topics[x[1]]||{}).status!=="done"), ti=SYL[lang].indexOf(t);
     if(fi>=0&&ti>fi+1&&!(lang==="en"&&id===progEnTopicId()))throw new Error("Sıra dışı konu: "+id+". Sıradaki konu "+SYL[lang][fi][1]+"; ileri konular işaretlenmez (öğrenci isterse İlerleme → Öğrenme yolu'ndan kendisi işaretler).");
     if(!db)throw new Error("Kayıt kapalı.");
     const changed=await setTopic(id,st); if(!changed) return {konu:id,ad:t[2],durum:"done",not:"Konu zaten tamamlanmış; durum değişmedi."};
     act((st==="done"?"Konu tamamlandı: ":"Konu çalışılıyor: ")+t[2]); return {konu:id,ad:t[2],durum:st};}},
  {name:"kart_sonuc",description:"Sohbette sorduğun tekrar kartlarının sonucunu Leitner kutusuna işler (kartlar sekmesiyle aynı kural: bildi → bir üst kutu, bilemedi → kutu 1, yarın). Yalnızca bugün tekrarı bekleyen kartlar; bugün eklenen ya da bugün zaten işlenen kart atlanır. Döner: işlenen ve atlanan kartlar.",
   inputSchema:{type:"object",properties:{lang:{type:"string",enum:a.langs},items:{type:"array",maxItems:30,items:{type:"object",properties:{f:{type:"string",description:"Kartın ön yüzü, destede yazdığı gibi (ör. il cavo)"},bildi:{type:"boolean"}},required:["f","bildi"]}}},required:["lang","items"]},
   execute:async(inp,ctx)=>{const lang=ccLang(inp.lang,a.langs); if(!db)throw new Error("Kayıt kapalı.");
     const items=(Array.isArray(inp.items)?inp.items:[]).slice(0,30), t=today(), done=[], skipped=[];
     for(const w of items){ if(ctx&&ctx.signal&&ctx.signal.aborted)break; const f=ccStr(w&&w.f,120).toLowerCase(); if(!f)continue;
       const c=S.cards.find(x=>x.lang===lang&&String(x.f||"").toLowerCase()===f);
       if(!c||!c.id||(c.due||"")>t||c.last===t||String(c.added||"").startsWith(t)){skipped.push(w.f);continue;}
       const box=w.bildi===true?Math.min(6,(c.box||1)+1):1, due=addDays(t,INTERVAL[box]);
       await db.collection("cards").doc(c.id).update({box,due,last:t}); Object.assign(c,{box,due,last:t}); done.push(c.f+(w.bildi===true?" ✓":" ✗"));}
     if(done.length) act(done.length+" kart tekrarı işlendi"+(skipped.length?" · "+skipped.length+" atlandı":""));
     return {islendi:done,atlandi:skipped};}},
  {name:"seans_kaydet",description:"Bugünkü çalışmayı panonun kaydına yazar (seri, dakika, hata listesi buradan beslenir). Ders modunda yalnızca öğrencinin '…bitiriyorum' mesajı gelince, ders modu kapalıysa bir dil bloğu ya da ders bitince çağır. dk: o dilde bugün yapılan TOPLAM GERÇEK dakikalar, blok blok (ör. kelime 12, gramer 22, sesli 5 sürdüyse {kelime:12,gramer:22,sesli:5}; blok başına en çok planlanan+5). Tekrar çağırmak aynı kaydı günceller; her blokta büyük olan dakika kalır. Döner: kaydedilen toplam dakika.",
   inputSchema:{type:"object",properties:{lang:{type:"string",enum:a.langs},dk:{type:"object",properties:{kelime:{type:"number"},gramer:{type:"number"},okuma:{type:"number"},sesli:{type:"number",description:"Sesli tekrar bloğu (dinle + 3 kez sesli söyle)"},speaking:{type:"number"}}},konu:{type:"string",description:"Müfredat kodu, ör. it05"},hatalar:{type:"array",items:{type:"string"},description:"Kısa, tekrar edilebilir hata etiketleri"},not:{type:"string"},sonraki:{type:"string",description:"Bir sonraki derste neye odaklanılacak; panoda gösterilir: konu kodunu (it05) değil konunun adını yaz"}},required:["lang","dk"]},
   execute:async inp=>{const lang=ccLang(inp.lang,a.langs); if(!db)throw new Error("Kayıt kapalı.");
     const dk=inp.dk&&typeof inp.dk==="object"?inp.dk:{}, mins={}; let total=0; MIN_KEYS.forEach(k=>{const v=Math.round(Math.max(0,Math.min(240,+dk[k]||0)));mins[k]=v;total+=v;});
     if(!total)throw new Error("dk toplamı 0; en az bir bloğun dakikasını yaz.");
     let topic=ccStr(inp.konu,8).toLowerCase(); if(topic&&!SYL[lang].some(t=>t[1]===topic))topic="";
     const id="chat-"+today()+"-"+a.id+"-"+lang;
     const mistakes=(Array.isArray(inp.hatalar)?inp.hatalar:[]).map(x=>ccStr(x,160)).filter(Boolean).slice(0,15);
     const r=await upsertSession(id,{date:today(),lang,mins,total,topic,mistakes,note:ccStr(inp.not,400),next:ccStr(inp.sonraki,400),created:new Date().toISOString(),words:CC_SESSW[lang]||0,src:"chat"});
     act((r.prev?"Seans güncellendi: ":"Seans kaydedildi: ")+CC_LANGN[lang]+" "+r.rec.total+" dk"+(r.rec.mistakes.length?" · "+r.rec.mistakes.length+" hata etiketi":""));
     return {kaydedildi:true,toplam_dk:r.rec.total,dk:r.rec.mins,guncelleme:r.prev};}},
  {name:"sinav_kaydet",description:"Program sınavının sonucunu kaydeder (İlerleme sekmesindeki Sınavlar kartında görünür). Pazar mini sınavı: tur \"haftalik\" (10 soru). Hafta 4/8: tur \"checkpoint\" (20 soru). Hafta 12: tur \"final\" (30 puan). Aynı hafta+tur tekrar kaydedilirse sonuç güncellenir. Döner: yüzde ve kayıt.",
   inputSchema:{type:"object",properties:{hafta:{type:"integer",minimum:1,maximum:12,description:"Program haftası (CANLI DURUM'daki Hafta)"},puan:{type:"number",description:"Doğru sayısı / alınan puan"},toplam:{type:"number",description:"Soru ya da puan toplamı"},tur:{type:"string",enum:["haftalik","checkpoint","final"]},notlar:{type:"string",description:"Bölüm puanları ve zayıf konu kodları, kısa"}},required:["hafta","puan","toplam"]},
   execute:async inp=>{if(!db)throw new Error("Kayıt kapalı."); const p=progInfo(); if(!p)throw new Error("Program başlatılmamış; sınav kaydı program haftasına bağlı. Sonucu öğrenciye söyle, kaydetme.");
     const w=Math.round(+inp.hafta); if(!(w>=1&&w<=12))throw new Error("hafta 1–12 arasında olmalı.");
     const toplam=Math.round((+inp.toplam||0)*2)/2, puan=Math.round((+inp.puan||0)*2)/2; if(!(toplam>0&&toplam<=100))throw new Error("toplam 1–100 arasında olmalı."); if(!(puan>=0&&puan<=toplam))throw new Error("puan 0 ile toplam arasında olmalı.");
     const cp=ROADMAP[w-1].cp; let tur=["haftalik","checkpoint","final"].includes(inp.tur)?inp.tur:(cp?cp.tur:"haftalik");
     if(tur!=="haftalik"&&(!cp||cp.tur!==tur))throw new Error(tur+" sınavı hafta "+(tur==="final"?"12":"4 ya da 8")+" içindir; bu hafta için tur \"haftalik\" kullan.");
     const id=tur+"-w"+String(w).padStart(2,"0"), prev=S.exams.find(e=>e.id===id);
     const rec={hafta:w,puan,toplam,tur,notlar:ccStr(inp.notlar,400),tarih:today(),ajan:a.id,deneme:(prev&&prev.deneme||0)+1,updated:new Date().toISOString()};
     await db.collection("exams").doc(id).set(rec); const i=S.exams.findIndex(e=>e.id===id); if(i>=0)S.exams[i]=Object.assign({id},rec); else S.exams.push(Object.assign({id},rec));
     if(typeof renderProg==="function")renderProg(); const pct=Math.round(puan/toplam*100);
     act("Sınav kaydedildi: "+(tur==="haftalik"?"Hafta "+w+" mini sınavı":cp.name)+" · "+puan+"/"+toplam+" (%"+pct+")");
     return {kaydedildi:true,yuzde:pct,tur,hafta:w,guncelleme:!!prev};}},
  {name:"durum_oku",description:"Panonun güncel durumunu okur: program haftası ve durumu, bugünkü plan, sıradaki konular, tekrar bekleyen kartlar, tekrarlayan hatalar, bugün kaydedilen dakikalar, bu sohbetin ve şu anki bloğun aktif dakikası. Argüman almaz.",
   inputSchema:{type:"object",properties:{}},
   execute:async()=>{const d=doneToday(); return {tarih:today(),plan:planFor().map(b=>b.l+" "+b.k+" "+b.dk+"dk: "+b.s),
     konu:{it:(curTopic("it")||[])[1]||null,en:(curTopic("en")||[])[1]||null},kart:{it:S.cards.filter(c=>c.lang==="it").length,en:S.cards.filter(c=>c.lang==="en").length},
     tekrar:{it:dueCards("it").slice(0,15).map(c=>c.f),en:dueCards("en").slice(0,10).map(c=>c.f)},hatalar:topMistakes(null,6).map(x=>x[0]+" ×"+x[1]),bugun_dk:d,program:ccProg(CC.agent).join(" "),sohbet_aktif_dk:ccActive(0),blok_aktif_dk:ccBlockActive(),sonraki_not:lastNext()};}}
  ].filter(t=>a.tools.includes(t.name));
}
const CC_SESSW={it:0,en:0};
/* ---- gönder / akış ---- */
function ccSubmit(){const ta=ccq("#ccIn");const v=ta.value.trim();if(!v||CC.loading)return;
  /* Ders modunda boş sohbet: önce ders başlangıç mesajı gider, yazılan mesaj ardından (başlangıcın yerini almaz) */
  if(ccDers.open()&&!CC.turns.length&&!CC.busy&&ccA().start){const r=ccSend(ccStartText(CC.agent)); if(r){ta.value="";ccGrow(); Promise.resolve(r).then(()=>ccSend(v));} return;}
  const o=ccHooks.meta?ccHooks.meta(v):null;
  if(ccSend(v,o)){ta.value="";ta.classList.remove("vc-interim");ccGrow();}}
/* Döner: false (gönderilemedi) ya da ccRun'ın sözü → {ok, acts}. o.sys: sohbette balon yerine kısa sistem notu (modele tam metin gider) */
function ccSend(text,o){
  if(!CC.ready||CC.locked||CC.busy||!text)return false;
  if(CC.loading){const ag=CC.agent; return CC.loadP.then(()=>CC.agent===ag?(ccSend(text,o)||{ok:false,acts:[]}):{ok:false,acts:[]});}  /* ajan değiştiyse düşür */
  if(CC.key!==ccKey()){CC.mem={};return ccLoad().then(()=>ccSend(text,o)||{ok:false,acts:[]});}
  if(!CC.turns.length)ccq("#ccLog").innerHTML="";
  const turn={r:"u",c:String(text).slice(0,8000),t:Date.now()}; if(o&&o.sys) turn.sys=String(o.sys).slice(0,120);
  if(o&&o.voice){turn.voice=1; if(o.pron)turn.pron={pct:Math.round(+o.pron.pct||0),target:String(o.pron.target||"").slice(0,200)};}
  if(ccHooks.onSend)ccHooks.onSend(o);
  CC.turns.push(turn);
  ccq("#ccLog").insertAdjacentHTML("beforeend",ccMsgHtml(turn,CC.turns.length-1));
  CC.stick=true; ccScroll(true); ccSave(); return ccRun();
}
/* Başarısız yanıtı yeniden iste: yarım kalan yanıtı at, son öğrenci mesajıyla tekrar çalıştır */
/* Araç çalıştıysa (kayıt yapıldıysa) aynı turu yeniden çalıştırma: kayıtları tekrarlamadan tamamlamasını iste */
function ccRetry(){if(CC.busy||!CC.ready||CC.locked)return Promise.resolve({ok:false,acts:[]});
  const lt=CC.turns[CC.turns.length-1]; CC.root.querySelectorAll("#ccLog .cc-err").forEach(e=>e.remove());   /* eski hata satırı ve düğmesi kalmasın */
  if(lt&&lt.r==="a"&&lt.stopped&&!(lt.acts&&lt.acts.length)) CC.turns.pop();
  else if(lt&&lt.r==="a") return Promise.resolve(ccSend("Yanıtın yarıda kesildi. Yaptığın kayıtları tekrarlamadan kaldığın yerden tamamla.",{sys:"↻ Yeniden denendi"})||{ok:false,acts:[]});
  if(!CC.turns.length||CC.turns[CC.turns.length-1].r!=="u") return Promise.resolve({ok:false,acts:[]});
  ccRender(); return ccRun();}
async function ccRun(){
  if(CC.busy)return {ok:false,acts:[]}; const key=CC.key, log=ccq("#ccLog");
  CC.busy=true; CC.ctl=new AbortController(); ccPaintBar();
  log.insertAdjacentHTML("beforeend",`<div class="cc-row live">${ccWho()}<div class="cc-b" aria-busy="true"><span class="cc-vh">${esc(ccA().name)}: </span><div class="cc-md"></div><div class="cc-think" aria-label="Düşünüyor"><i></i><i></i><i></i><span>Düşünüyor…</span></div></div><div class="cc-acts"></div></div>`);
  const row=log.lastElementChild, md=row.querySelector(".cc-md"), think=row.querySelector(".cc-think"), acts=[]; CC.live=row; ccScroll();
  let last="", raf=0;
  const paint=()=>{raf=0;md.innerHTML=ccMd(last,true);ccScroll();};
  const act=(t,err)=>{const a={t,err:!!err};acts.push(a);row.querySelector(".cc-acts").insertAdjacentHTML("beforeend",ccActHtml(a));think.querySelector("span").textContent="Düşünüyor…";think.hidden=false;ccScroll();};
  const tools=CC.tools?ccTools(act,ccA()).map(t=>Object.assign({},t,{execute:async(i,c)=>{think.hidden=false;think.querySelector("span").textContent="Panoyu güncelliyor…";
    try{return await t.execute(i||{},c);}catch(e){const what={kelime_ekle:"Kelimeler eklenemedi",kart_sonuc:"Kart tekrarı işlenemedi",konu_durumu:"Konu işaretlenemedi",seans_kaydet:"Seans kaydedilemedi",sinav_kaydet:"Sınav kaydedilemedi",durum_oku:"Durum okunamadı"}[t.name]||t.name;
      if(e&&e.code){const m=dbErrText(e,what);act(m,true);throw new Error(m);} act(what+": "+(e&&e.message||e),true);throw e;}}})):undefined;
  const opts={cache:false,signal:CC.ctl.signal,modelTier:ccA().tier,onText:({text})=>{last=text;think.hidden=true;if(!raf)raf=requestAnimationFrame(paint);}};
  if(tools)opts.tools=tools;
  let reply=null;
  try{const r=await CC.sample(ccWindow(),opts); reply={r:"a",c:r.text}; if(r.truncated)reply.c+="\n\n*(Yanıt uzunluk sınırında kesildi; \"devam et\" yazabilirsin.)*";}
  catch(e){const code=e&&e.code||"upstream_error";
    if(code==="cancelled"){ if(e.text&&e.text.trim())reply={r:"a",c:e.text,stopped:true}; }
    else if(code==="tools_unavailable"){ if(e.text&&e.text.trim())reply={r:"a",c:e.text,stopped:true}; ccErr(CC_ERR.tools_unavailable[0],true); }
    else { if(code!=="refused"&&e.text&&e.text.trim())reply={r:"a",c:e.text,stopped:true};
      const m=CC_ERR[code]||(/^(invalid_request|transform_error|queue_overflow)$/.test(code)?["Sayfada bir hata oldu ("+code+"). Tekrar dene; sürerse sayfayı yenile.",false]:CC_ERR.upstream_error);
      if(m[1]){CC.locked=m[0]; if(typeof renderHero==="function")renderHero();} ccErr(m[0],!m[1]); }
  }
  finally{ if(raf)cancelAnimationFrame(raf); CC.busy=false; CC.ctl=null; }
  if(reply){reply.acts=acts; if(CC.key===key){CC.turns.push(reply);}}
  else if(acts.length&&CC.key===key){CC.turns.push({r:"a",c:"*(Pano güncellendi.)*",acts});}
  const errEl=log.querySelector(".cc-err:last-child");
  if(CC.key===key){ const i=reply||acts.length?CC.turns.length-1:-1;
    if(i>=0){const tmp=document.createElement("div");tmp.innerHTML=ccMsgHtml(CC.turns[i],i);row.replaceWith(tmp.firstElementChild);} else row.remove();
    if(errEl)log.appendChild(errEl); ccScroll(); await ccSave(); }
  ccPaintBar(); if(!CC.locked&&!(ccDers.open()&&ccDers.done())){const ta=ccq("#ccIn"); if(document.activeElement===document.body||document.activeElement===ccq("#ccStop"))ta.focus();}
  const okRun=!!reply&&!reply.stopped;
  if(ccHooks.afterRun&&CC.key===key){try{ccHooks.afterRun(reply,okRun);}catch(e){}}
  return {ok:okRun,acts};
}
function ccErr(text,retry){const log=ccq("#ccLog");log.insertAdjacentHTML("beforeend",`<div class="cc-err" role="alert"><span>${esc(text)}</span>${retry?`<button type="button" class="cc-mini" data-retry>Tekrar dene</button>`:""}</div>`);ccScroll(true);}

/* ---- başlat (dd_events db'den sonra çağırır) ---- */
async function initChat(){
  ccMount();
  let s=null; try{ s=window.claude&&typeof claude.use==="function"?await claude.use("sample"):null; }catch(e){ s=null; }
  if(!s){CC.locked="Bu tarayıcıda koçlara bağlanılamıyor. Sayfayı yenile; sürerse tarayıcıyı güncelle.";CC.ready=false;ccRender();if(typeof renderHero==="function")renderHero();return;}
  CC.sample=s;
  try{ if(typeof s.limits==="function"){const lim=await s.limits(); if(lim&&typeof lim==="object"&&!lim.tools)CC.tools=false;} }catch(e){}
  CC.ready=true; ccKeyState(); if(CC.locked){if(typeof renderHero==="function")renderHero(); if(typeof renderTop==="function")renderTop();} await ccLoad();
  if(typeof ccDers.afterInit==="function") ccDers.afterInit();   /* örnekleme geç hazırlandıysa bekleyen ders başlangıcı */
}
/* Anahtar durumu: yokken koçlar kilitli (CC_NOKEY), girilince kilit açılır; geçersiz anahtar kilidi de anahtar değişince kalkar */
const ccHasKey=()=>!!(window.TYRT&&typeof TYRT.hasKey==="function"&&TYRT.hasKey());
/* Anahtara bağlı kilitler: anahtar değişince (tydil:key) kalkar; diğer kilitler (tarayıcı desteği) kalır */
const ccKeyLock=t=>!!t&&(t===CC_NOKEY||t===CC_PENDING||t.startsWith(CC_KEYBAD)||[CC_ERR.session_expired,CC_ERR.permission_denied,CC_ERR.not_granted,CC_ERR.sampling_disabled].some(x=>x[0]===t));
function ccKeyState(){const has=ccHasKey(), ks=window.TYRT&&TYRT.keyStatus?TYRT.keyStatus():(has?"ok":"none");
  if(CC.locked&&!ccKeyLock(CC.locked)) return;                       /* tarayıcı kilidi anahtarla açılmaz */
  if(!has) CC.locked=CC_NOKEY;
  else if(ks==="pending") CC.locked=CC_PENDING;
  else if(ks==="bad"){const e=TYRT.keyError&&TYRT.keyError(); CC.locked=CC_KEYBAD+((CC_ERR[e&&e.code]||CC_ERR.upstream_error)[0]);}
  else CC.locked="";}
document.addEventListener("tydil:key",()=>{const was=CC.locked; ccKeyState(); if(was!==CC.locked||!CC.turns.length){ccRender(); if(typeof renderHero==="function")renderHero(); if(typeof renderTop==="function")renderTop(); if(typeof ccDers.afterInit==="function"&&CC.ready&&!CC.locked)ccDers.afterInit();}});
ccMount();
if(!(window.claude&&typeof window.claude.use==="function")){CC.locked="Bu tarayıcıda koçlara bağlanılamıyor. Sayfayı yenile.";ccRender();}
