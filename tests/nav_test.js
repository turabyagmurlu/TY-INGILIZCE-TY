/* Gezinme: ≤1024 alt sekme çubuğu (390, 820), >1024 üst çubuk (1280); "Ben" sayfası (İlerleme · Ayarlar · Yazışma); eski adresler;
   çakışma yok (alt çubuk ↔ Başla / kalem / Koça sor), yatay kaydırma yok, ≥44 px hedefler, iPad okuma genişliği ≤760, Kartlar ayrı ekran.
   NODE_PATH=$(npm root -g) node tests/nav_test.js */
const H=require('./_h.js');const {ok,AT}=H;const fs=require('fs');const path=require('path');
const SEED={program:{main:{start:'2026-09-28',weeks:12,dailyMin:60,mode:'yogun'}},cards:{c1:{lang:'it',f:'il cavo',tr:'kablo',box:1,due:'2026-10-13',added:'2026-10-10T10:00:00Z'}}};
const SHOTS=path.join(H.ROOT,'review/shots_v9');fs.mkdirSync(SHOTS,{recursive:true});
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const mk=async(w,h,o)=>{o=o||{};const ctx=await b.newContext({viewport:{width:w,height:h},timezoneId:'Europe/Istanbul',serviceWorkers:'block',colorScheme:o.dark?'dark':'light',hasTouch:w<1025,isMobile:w<1025});const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('dialog',d=>{errs.push('DIALOG');d.dismiss();});
   await p.addInitScript(H.clockScript(AT(2026,10,14,9)));await p.addInitScript(()=>{localStorage.setItem('tydil.apiKey','sk-ant-test');localStorage.setItem('tydil-tip-pin','1');});
   await H.mockApi(p,{content:true});await p.goto(srv.base+'/index.html'+(o.hash||''));
   await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),SEED);await p.reload();await p.waitForTimeout(600);return {p,ctx};};
 const rect=(p,s)=>p.$eval(s,e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,r:r.right};});
 const hs=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 const panel=p=>p.evaluate(()=>[...document.querySelectorAll('.panel')].filter(x=>!x.hidden).map(x=>x.id.replace('tab-','')).join());
 const navInfo=p=>p.evaluate(()=>{const n=document.querySelector('.tabs');const r=n.getBoundingClientRect();const bs=[...n.querySelectorAll('button')].filter(x=>!x.hidden);
   return {pos:getComputedStyle(n).position,top:r.top,bottom:r.bottom,ih:innerHeight,labels:bs.map(x=>x.querySelector('.tl').textContent),icons:bs.every(x=>!!x.querySelector('svg')),sizes:bs.map(x=>{const q=x.getBoundingClientRect();return [Math.round(q.width),Math.round(q.height)];})};});
 const overlap=(a,c)=>!(a.r<=c.x||c.r<=a.x||a.b<=c.y||c.b<=a.y);
 for(const [w,h] of [[390,844],[820,1180]]){const {p,ctx}=await mk(w,h,{dark:w===820});
  const n=await navInfo(p);
  ok(n.pos==='fixed'&&Math.abs(n.bottom-n.ih)<1&&n.labels.join()==='Bugün,Konuş,Kartlar,Dersler'&&n.icons,w+': fixed bottom tab bar with icon + label: '+n.labels.join());
  ok(n.sizes.every(([a,c])=>a>=44&&c>=44),w+': tab targets ≥44 px '+JSON.stringify(n.sizes));
  const ben=await rect(p,'#btnBen');ok(ben.w>=44&&ben.h>=44&&ben.y<80,w+': header "Ben" button ≥44 px');
  ok(await hs(p),w+': no horizontal scroll on Bugün');
  // Bugün: Başla görünür ve alt çubukla çakışmaz (en alta kaydırınca da)
  const go=await rect(p,'#btnGo');ok(go.b<=n.top,w+': Başla above the fold and above the tab bar (btn bottom '+Math.round(go.b)+' ≤ nav top '+Math.round(n.top)+')');
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(100);
  const last=await p.evaluate(()=>{const els=[...document.querySelectorAll('#tab-learn .card,#tab-learn details')].filter(e=>e.checkVisibility());const e=els[els.length-1];return Math.round(e.getBoundingClientRect().bottom)+' '+(e.id||e.className)+' sy='+scrollY+' sh='+document.documentElement.scrollHeight;});
  ok(parseFloat(last)<=n.top+1,w+': page end not hidden behind the tab bar ('+last+' ≤ '+Math.round(n.top)+')');
  ok(!(await p.isVisible('#penFab').catch(()=>false)),w+': pen FAB hidden on Bugün (no highlightable text there)');
  if(w===820){const tl=await rect(p,'#tab-learn');ok(tl.w<=760,'820 (iPad): Bugün reading width ≤760 ('+Math.round(tl.w)+')');await p.screenshot({path:path.join(SHOTS,'today_820_dark.png')});}
  // Kartlar ayrı ekran
  await p.click('[data-tab=cards]');ok((await panel(p))==='cards'&&await p.isVisible('#review .fcard'),w+': Kartlar tab = flashcard review screen');
  if(w===820)await p.screenshot({path:path.join(SHOTS,'kartlar_820.png')});
  ok(await hs(p),w+': no h-scroll on Kartlar');
  // Konuş + Yazışma
  await p.click('[data-tab=konus]');await p.waitForSelector('#kStart');ok((await panel(p))==='konus'&&await hs(p),w+': Konuş tab');
  await p.click('#konusMount [data-go=coach]');await p.waitForTimeout(150);ok((await panel(p))==='practice'&&await p.isVisible('#coachChat')&&await p.getAttribute('[data-tab=konus]','aria-selected')==='true',w+': "Yazarak çalış" → Yazışma (text chat), Konuş stays highlighted');
  ok(await p.isHidden('#penFab')&&await p.isVisible('#penPrac'),w+': Yazışma: floating pen hidden, inline Vurgula toggle instead');
  {const pr=await rect(p,'#penPrac'),sd=await rect(p,'#ccSend'),ci=await rect(p,'#ccIn');ok(!overlap(pr,sd)&&!overlap(pr,ci),w+': pen toggle not on Gönder / input '+JSON.stringify([pr,sd,ci].map(r=>[r.x,r.y,r.r,r.b].map(Math.round))));}
  // Dersler
  await p.click('[data-tab=units]');await p.waitForTimeout(200);ok((await panel(p))==='units'&&await hs(p),w+': Dersler tab');
  // Ben sayfası
  await p.click('#btnBen');ok(await p.isVisible('#benSheet')&&(await p.$$eval('#benSheet .benItem b',e=>e.map(x=>x.textContent))).join()==='İlerleme,Ayarlar,Yazarak çalış',w+': Ben sheet: İlerleme · Ayarlar · Yazarak çalış');
  const its=await p.$$eval('#benSheet .benItem',e=>e.map(x=>x.getBoundingClientRect().height));ok(its.every(x=>x>=44),w+': sheet items ≥44 px');
  if(w===390)await p.screenshot({path:path.join(SHOTS,'ben_sheet_390.png')});
  await p.keyboard.press('Escape');ok(await p.isHidden('#benSheet'),w+': Esc closes sheet');
  await p.click('#btnBen');await p.click('#benSheet [data-ben=progress]');ok((await panel(p))==='progress'&&await p.isHidden('#benSheet')&&await p.evaluate(()=>document.querySelector('#btnBen').classList.contains('on')),w+': Ben → İlerleme (Ben highlighted)');
  ok(await hs(p),w+': no h-scroll on İlerleme');
  await p.click('#btnBen');await p.click('#benSheet [data-ben=setup]');ok((await panel(p))==='setup'&&await p.isVisible('#keyCard'),w+': Ben → Ayarlar');
  ok(await hs(p),w+': no h-scroll on Ayarlar');
  await p.click('#btnBen');await p.click('#benSheet .benBack',{position:{x:10,y:10}});ok(await p.isHidden('#benSheet'),w+': backdrop closes sheet');
  await ctx.close();}
 // 1280: üst çubuk
 {const {p,ctx}=await mk(1280,800);const n=await navInfo(p);
  ok(n.pos!=='fixed'&&n.top<80&&n.labels.join()==='Bugün,Konuş,Kartlar,Dersler','1280: same 4 items in the top bar ('+n.pos+', top '+Math.round(n.top)+')');
  ok(n.sizes.every(([a,c])=>a>=44&&c>=44)&&await hs(p),'1280: targets ≥44 px, no h-scroll');
  const ben=await rect(p,'#btnBen');ok(ben.y<80,'1280: Ben in top bar');
  await p.click('#btnBen');const bx=await rect(p,'#benSheet .benBox');ok(bx.y<150&&bx.w<=400,'1280: Ben sheet as top-right popover');await p.keyboard.press('Escape');
  const tl=await rect(p,'#tab-learn');ok(tl.w<=760,'1280: Bugün reading column ≤760');
  await ctx.close();}
 // eski adresler
 {const map={'#pratik':'konus','#practice':'konus','#kartlar':'cards','#ayarlar':'setup','#ilerleme':'progress','#yazisma':'practice','#dersler':'units','#ogren':'learn','#kurulum':'setup'};
  for(const [hs_,want] of Object.entries(map)){const {p,ctx}=await mk(390,844,{hash:hs_});await p.goto(srv.base+'/index.html'+hs_);await p.waitForTimeout(700);const got=await panel(p);ok(got===want,'old hash '+hs_+' → '+want+' (got '+got+')');await ctx.close();}}
 // kurulum kartı: bir kez ertelenince Bugün'de yok
 {const {p,ctx}=await mk(390,844);await p.evaluate(()=>localStorage.setItem('tydil-inst-later',String(Date.now()-30*864e5)));await p.reload();await p.waitForTimeout(400);
  ok(await p.isHidden('#instCard'),'install card stays off Bugün once dismissed (even after 30 days)');await ctx.close();}
 ok(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
 await b.close();srv.close();console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
