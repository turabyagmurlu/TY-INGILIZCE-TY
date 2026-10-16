const H=require('../../tests/_h.js');const fs=require('fs');const path=require('path');
const MOCK=fs.readFileSync(path.join(H.ROOT,'tests/voice_test.js'),'utf8').match(/const MOCK=`([\s\S]*?)`;/)[1];
const SH=path.join(__dirname,'shots');
function handler(req,st){const s=req.system;st.sys=st.sys||[];st.sys.push(s);
  if(/KOÇA SOR/.test(s))return {sse:[{text:'Kısa ipucu: **ce/ci** yumuşar → ç. Örnek: [[it: cena]] = ÇE-na.'}]};
  if(/Türkçesini TEK satırda/.test(s)||/Türkçesini TEK satırda/.test(req.lastText))return {sse:[{text:'Merhaba Türab! Ekibini ne zamandır yönetiyorsun?'}]};
  if(/KONUŞMA MODU|SPEAKING MODE/.test(s)){if(/GÖRÜŞME BİTTİ|CALL IS OVER/.test(req.lastText))return {sse:[{text:JSON.stringify({duzeltmeler:[{sen:'I am running it since 2024',dogal:"I've been running it since 2024"}],ifadeler:[{x:'a tight deadline',tr:'sıkışık teslim'},{x:'to sort it out',tr:'halletmek'}],ipucu:'Süre için have been + -ing.'})}]};
    if(/The call has started|Görüşme başladı/.test(req.lastText))return {sse:[{text:/CHIARA|Chiara/.test(s)?'Ciao Türab! Sono Chiara. Leggi questa parola: USCITA.':'Hi Türab! I\'m Oliver. How long have you been running your crew?'}]};
    return {sse:[{text:'Nice, since 2024! What is the hardest part of the job right now?'}]};}
  return {sse:[{text:'Tamam. [[it: il cavo]] = kablo.'}]};}
async function mk(b,srv,o){o=o||{};const st={content:true};const errs=o.errs||[];
  const ctx=await b.newContext({viewport:o.vp||{width:390,height:844},timezoneId:'Europe/Istanbul',serviceWorkers:'block',colorScheme:o.dark?'dark':'light',reducedMotion:'reduce',hasTouch:!!o.touch});
  const p=await ctx.newPage();p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.type()+' '+d.message());d.dismiss();});
  await p.addInitScript(H.clockScript(o.at||H.AT(2026,10,14,9)));await p.addInitScript(MOCK);
  await p.addInitScript(()=>{localStorage.setItem('tydil.apiKey','sk-ant-api03-'+'x'.repeat(95));});
  await H.mockApi(p,st,o.handler||handler);await p.goto(srv.base+'/index.html'+(o.q||''));
  if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
  await p.waitForTimeout(900);return {p,ctx,st,errs};}
async function audit(p,tag){return p.evaluate((tag)=>{const out={tag,hscroll:document.documentElement.scrollWidth>innerWidth,sw:document.documentElement.scrollWidth};
  const vis=e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&r.bottom>0&&r.top<innerHeight;};
  const small=[];const tiny=[];
  for(const e of document.querySelectorAll('button,a,[role=button],input,select,.opt,.oW')){if(!vis(e))continue;const r=e.getBoundingClientRect();if(r.height<36||r.width<36)small.push((e.id?'#'+e.id:e.className.toString().slice(0,20))+':'+(e.textContent||e.value||e.getAttribute('aria-label')||'').trim().slice(0,20)+' '+Math.round(r.width)+'x'+Math.round(r.height));}
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.textContent.trim())continue;const e=n.parentElement;if(!e||!vis(e))continue;const fs=parseFloat(getComputedStyle(e).fontSize);if(fs<12)tiny.push(n.textContent.trim().slice(0,25)+'@'+fs);}
  out.small=small.slice(0,15);out.tiny=[...new Set(tiny)].slice(0,15);
  // overflowing elements
  const ov=[];for(const e of document.querySelectorAll('body *')){if(!vis(e))continue;const r=e.getBoundingClientRect();if(r.right>innerWidth+1&&getComputedStyle(e).position!=='fixed'){ov.push((e.id||e.className.toString()).slice(0,30)+' r='+Math.round(r.right));}}
  out.overflowR=ov.slice(0,8);return out;},tag);}
module.exports={H,MOCK,SH,handler,mk,audit,path,fs};
