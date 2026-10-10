/* Targeted checks: no-key onboarding Başla, contrast sanity, small text, fab overlap, Esc in units, tab hash/back */
const H=require('../../tests/_h.js');const {sleep,AT}=H;const fs=require('fs');const path=require('path');
const OUT=path.join(__dirname,'shots');const THU=AT(2026,10,8,9);
const MOCK=fs.readFileSync(path.join(__dirname,'../../tests/voice_test.js'),'utf8').match(/const MOCK=`([\s\S]*?)`;/)[1];
(async()=>{const srv=await H.serve();const b=await H.browser();
 const open=async(o)=>{o=o||{};const st={};const errs=[];const ctx=await b.newContext({viewport:o.w===1280?{width:1280,height:800}:{width:375,height:812},timezoneId:'Europe/Istanbul',colorScheme:o.dark?'dark':'light'});const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});
   await p.addInitScript(H.clockScript(THU));await p.addInitScript(MOCK);if(o.key)await p.addInitScript(k=>{try{localStorage.setItem('tydil.apiKey',k);}catch(e){}},'sk-ant-test');
   await H.mockApi(p,st);await p.goto(srv.base+'/index.html'+(o.q||''));await p.waitForTimeout(500);return {p,ctx,st,errs};};
 const shot=(p,n,full)=>p.screenshot({path:path.join(OUT,n+'.png'),fullPage:!!full});
 // A) no key: onboarding → Başla
 {const {p,ctx,errs}=await open({});
  await p.click('[data-onb="2"]');await p.click('.onbStep[data-step="2"] [data-onb="3"]');await p.click('#btnProgStart');await p.waitForTimeout(800);
  console.log('A nokey Başla → ders visible',await p.isVisible('#ders'),'setup visible',await p.isVisible('#tab-setup'),'learn visible',await p.isVisible('#tab-learn'));
  await shot(p,'A_nokey_after_basla',true);console.log(await p.evaluate(()=>document.querySelector('#tab-learn, #tab-setup').innerText.slice(0,600)));
  console.log('hero hint:',await p.textContent('#heroHint').catch(()=>''),'| btnGo:',await p.textContent('#btnGo').catch(()=>''));
  await ctx.close();}
 // B) no key: "Programsız göz at"
 {const {p,ctx}=await open({});await p.click('text=Programsız göz at');await p.waitForTimeout(500);await shot(p,'B_nokey_noprog',true);console.log('B noprog:',(await p.evaluate(()=>document.querySelector('#tab-learn').innerText)).slice(0,700));await ctx.close();}
 // C) contrast sanity: check specific tokens
 {const {p,ctx}=await open({key:true});
  const r=await p.evaluate(()=>{const L=c=>{const m=c.match(/[\d.]+/g).slice(0,3).map(x=>{x=x/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*m[0]+.7152*m[1]+.0722*m[2];};
    const cr=(a,b)=>{const l1=L(a),l2=L(b);return ((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2);};const cs=getComputedStyle(document.documentElement);const v=n=>cs.getPropertyValue(n).trim();
    const d=document.createElement('div');document.body.appendChild(d);const rgb=c=>{d.style.color=c;return getComputedStyle(d).color;};
    const pairs=[['--muted','--bg'],['--muted','--card'],['--muted','--sand'],['--primary-ink','--card'],['--on-primary','--primary'],['--on-accent','--accent'],['--accent-ink','--accent-bg'],['--good-ink','--good-bg'],['--it-ink','--it-bg'],['--en-ink','--en-bg'],['--gold-ink','--gold-bg'],['--text','--soft'],['--on-primary','--primary-h']];
    return pairs.map(([f,g])=>f+'/'+g+'='+cr(rgb(v(f)),rgb(v(g))));});console.log('C light contrast',r.join(' '));
  await ctx.close();}
 {const {p,ctx}=await open({key:true,dark:true});
  const r=await p.evaluate(()=>{const L=c=>{const m=c.match(/[\d.]+/g).slice(0,3).map(x=>{x=x/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*m[0]+.7152*m[1]+.0722*m[2];};
    const cr=(a,b)=>{const l1=L(a),l2=L(b);return ((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2);};const cs=getComputedStyle(document.documentElement);const v=n=>cs.getPropertyValue(n).trim();
    const d=document.createElement('div');document.body.appendChild(d);const rgb=c=>{d.style.color=c;return getComputedStyle(d).color;};
    const pairs=[['--muted','--bg'],['--muted','--card'],['--muted','--sand'],['--primary-ink','--card'],['--on-primary','--primary'],['--on-accent','--accent'],['--accent-ink','--accent-bg'],['--good-ink','--good-bg'],['--it-ink','--it-bg'],['--en-ink','--en-bg'],['--gold-ink','--gold-bg'],['--text','--soft'],['--on-primary','--primary-h']];
    return pairs.map(([f,g])=>f+'/'+g+'='+cr(rgb(v(f)),rgb(v(g))));});console.log('C dark contrast',r.join(' '));
  // small text in progress
  await p.click('[data-tab=progress]');await p.waitForTimeout(300);
  console.log('small text progress:',JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('#tab-progress *')].filter(e=>e.children.length===0&&e.offsetParent&&(e.textContent||'').trim().length>2&&parseFloat(getComputedStyle(e).fontSize)<12).map(e=>(e.className||e.tagName)+':'+e.textContent.trim().slice(0,20)+':'+getComputedStyle(e).fontSize).slice(0,10))));
  // chat small text
  await p.click('[data-tab=practice]');await p.waitForTimeout(300);await p.fill('#ccIn','ciao');await p.click('#ccSend');await p.waitForTimeout(1000);
  console.log('small text practice:',JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('#tab-practice *')].filter(e=>e.children.length===0&&e.offsetParent&&(e.textContent||'').trim().length>2&&parseFloat(getComputedStyle(e).fontSize)<12).map(e=>(e.className||e.tagName)+':'+e.textContent.trim().slice(0,20)+':'+getComputedStyle(e).fontSize).slice(0,10))));
  console.log('cc-say size',JSON.stringify(await p.$eval('.cc-say',e=>{const r=e.getBoundingClientRect();return [r.width,r.height]}).catch(()=>null)));
  // chat textarea placeholder clipping at 375
  await ctx.close();}
 // D) fab overlap with CTA in units; Esc in units; unit while key missing; mother flow with big font
 {const {p,ctx}=await open({});
  await p.click('[data-tab=units]');await p.waitForTimeout(300);
  const fab=await p.$eval('[data-act=noteFab]',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}});console.log('fab',JSON.stringify(fab));
  await p.click('[data-act=fsToggle]');await p.waitForTimeout(200);await shot(p,'D_units_fontsize',false);console.log('fs options:',await p.evaluate(()=>document.querySelector('#uFs')?document.querySelector('#uFs').innerText:'none'));
  const big=await p.$('#uFs button:last-child, #uFs [data-act=fs]:last-of-type');if(big){await big.click();await p.waitForTimeout(200);}
  await p.click('.u-ucard[data-uid="it1-1"]');await p.waitForTimeout(300);await shot(p,'D_unit_bigfont',true);
  const ov=await p.evaluate(()=>{const f=document.querySelector('[data-act=noteFab]').getBoundingClientRect();const hits=[];document.querySelectorAll('#uView button,#uView a,#uView textarea').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width)return;const ax=Math.max(0,Math.min(f.right,r.right)-Math.max(f.left,r.left)),ay=Math.max(0,Math.min(f.bottom,r.bottom)-Math.max(f.top,r.top));if(ax*ay>0)hits.push(e.textContent.trim().slice(0,30)||e.tagName);});return hits;});console.log('fab overlaps (viewport at top):',JSON.stringify(ov));
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(200);
  const ov2=await p.evaluate(()=>{const f=document.querySelector('[data-act=noteFab]').getBoundingClientRect();const hits=[];document.querySelectorAll('#uView button,#uView a,#uView textarea').forEach(e=>{const r=e.getBoundingClientRect();if(!r.width)return;const ax=Math.max(0,Math.min(f.right,r.right)-Math.max(f.left,r.left)),ay=Math.max(0,Math.min(f.bottom,r.bottom)-Math.max(f.top,r.top));if(ax*ay>0)hits.push(e.textContent.trim().slice(0,30)||e.tagName);});return hits;});console.log('fab overlaps (scrolled bottom):',JSON.stringify(ov2));
  await shot(p,'D_unit_bottom_fab',false);
  // pron step without key / mic: 'Söyle ve kontrol et'
  await p.click('[data-act=step][data-k=practice]');await p.waitForTimeout(300);console.log('pron text:',(await p.evaluate(()=>document.querySelector('#uView').innerText)).slice(0,400).replace(/\n/g,' | '));
  await p.click('[data-tab=learn]');await p.waitForTimeout(200);console.log('fab visible on learn tab:',await p.isVisible('#uFab'));
  await ctx.close();}
 // E) terminology scan
 {const s=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');const terms=['Derse başla','Dersi başlat','Ders modu','Dersten çık','Bugünkü ders','Dersler','Ünite','Koç','Sohbet','Konuşma modu','Kelime kartları','Kartlar','Tekrar listesi','Sözlük','Notlar','Notlarım','Yazı boyutu','Ünite yedeği','Yedek'];
  console.log('E term counts:',terms.map(t=>t+'='+(s.match(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length).join(', '));}
 await b.close();srv.close();})().catch(e=>{console.error(e);process.exit(1);});
