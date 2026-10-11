/* Vurgu kalemi: seçim → Vurgula çipi / kalem açıkken anında vurgu; yeniden çizim ve yenileme sonrası yerinde; renk, not, kaldır;
   Dersler ünite adımında kalıcı (adıma özel); kalem düğmesi 375'te ana eylemlerle çakışmaz; yedek al/geri yükle; konsol hatası yok.
   NODE_PATH=$(npm root -g) node tests/pen_test.js */
const H=require('./_h.js');const {ok,AT}=H;const fs=require('fs');const path=require('path');
const THU=AT(2026,10,8,9);
const PROG={program:{main:{start:'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}},topics:{it01:{status:'done'}},
  sessions:{a:{date:'2026-10-07',lang:'it',mins:{kelime:10,gramer:20,okuma:10,sesli:5},total:45,mistakes:['essere/avere karışıklığı','il/lo artikel']},b:{date:'2026-10-07',lang:'en',mins:{speaking:15},total:15,mistakes:['since/for']}}};
const SHOTS=path.join(H.ROOT,'review','shots_v5');
/* sayfa içinde metin seç: sel(selector, aranan metin) → o metni içeren ilk metin düğümünde aralık */
const SELECT=`((sel,needle,len)=>{const root=document.querySelector(sel);if(!root)return 'noroot';const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const i=n.data.indexOf(needle);if(i>=0){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+(len||needle.length));const s=getSelection();s.removeAllRanges();s.addRange(r);return String(r);}}return 'notfound';})`;
const marks=(p,root)=>p.evaluate(r=>[...document.querySelectorAll((r||'')+' mark.hl[data-hid]')].map(m=>({t:m.textContent,c:[...m.classList].find(x=>/^hl-/.test(x)),hid:m.dataset.hid,note:m.title||'',lbl:m.getAttribute('aria-label'),tab:m.tabIndex})),root);
const rect=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e||e.hidden)return null;const r=e.getBoundingClientRect();if(!r.width)return null;return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height};},sel);
const overlap=(a,b)=>!!(a&&b)&&a.l<b.r&&b.l<a.r&&a.t<b.b&&b.t<a.b;
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];fs.mkdirSync(SHOTS,{recursive:true});
 const open=async(o,ctxo)=>{o=o||{};const st={};const ctx=await b.newContext(Object.assign({viewport:{width:375,height:812},timezoneId:'Europe/Istanbul',reducedMotion:'reduce'},ctxo||{}));const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   await p.addInitScript(H.clockScript(THU));await p.addInitScript(k=>localStorage.setItem('tydil.apiKey',k),'sk-ant-test');
   await H.mockApi(p,st);await p.goto(srv.base+'/index.html');
   if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
   await p.waitForTimeout(500);return {p,ctx,st};};
 const idle=p=>p.waitForFunction(()=>!document.querySelector('.cc-row.live')&&document.querySelector('#ccStop').hidden,null,{timeout:10000});
 const shot=(p,n)=>p.screenshot({path:path.join(SHOTS,n+'.png')});

 /* ---- A. Ders modunda koç mesajı: çip, kalem, renk, not, kaldır, yeniden çizim, yenileme ---- */
 {const {p,ctx}=await open({seed:PROG});
  ok(await p.isVisible('#penFab')&&await p.evaluate(()=>document.querySelector('#penFab').getAttribute('aria-pressed')==='false'),'pen FAB visible on Öğren, aria-pressed=false');
  /* FAB ana eylemle çakışmaz (Öğren #btnGo, Pratik #ccSend sayfa sonunda) */
  ok(!overlap(await rect(p,'#penFab'),await rect(p,'#btnGo')),'FAB does not overlap #btnGo at 375');
  await p.click('[data-tab=practice]');await p.waitForTimeout(200);await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(100);
  ok(!overlap(await rect(p,'#penFab'),await rect(p,'#ccSend'))&&!overlap(await rect(p,'#penFab'),await rect(p,'#ccNew')),'FAB does not overlap chat send / Yeni sohbet when scrolled to bottom');
  await p.click('[data-tab=learn]');await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);await p.waitForTimeout(200);
  ok(await p.evaluate(()=>getComputedStyle(document.querySelector('#penFab')).display==='none'),'FAB hidden in Ders modu');
  const pd=await rect(p,'#penDers'), nx=await rect(p,'#dersNext'), send=await rect(p,'#ccSend'), ta=await rect(p,'#ccIn');
  ok(pd&&pd.w>=44&&pd.h>=44,'Ders pen toggle visible, ≥44px '+JSON.stringify(pd));
  ok(!overlap(pd,nx)&&!overlap(pd,send)&&!overlap(pd,ta)&&nx&&nx.w>200,'Ders pen toggle does not overlap Bloğu bitirdim / send / textarea; Bloğu bitirdim still wide '+JSON.stringify(nx));
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no h-scroll in Ders with pen toggle');
  /* seçim → çip (kalem kapalı) */
  const got=await p.evaluate(SELECT+`('#ccLog .cc-row[data-i]:not(.me) .cc-md','il cavo')`);
  await p.waitForTimeout(450);
  ok(got==='il cavo'&&await p.isVisible('#penChip'),'selecting coach text shows "Vurgula" chip (pen not armed) got='+got);
  await p.click('#penChip');await p.waitForTimeout(300);
  let ms=await marks(p,'#ccLog');
  ok(ms.length===1&&ms[0].t==='il cavo'&&ms[0].c==='hl-yellow'&&ms[0].lbl==='vurgu: Sarı'&&ms[0].tab===0,'chip → yellow mark created, focusable, aria-label '+JSON.stringify(ms));
  ok(await p.evaluate(()=>getSelection().isCollapsed)&&!(await p.isVisible('#penChip')),'selection cleared and chip hidden after highlight');
  const table=await p.evaluate(()=>{const t=document.querySelector('#ccLog table');return t?{rows:t.querySelectorAll('tr').length,cells:t.querySelectorAll('td').length}:null;});
  ok(table&&table.rows===3&&table.cells===6,'table markup intact after wrapping inside a cell '+JSON.stringify(table));
  /* kalem aç → araç çubuğu; seçim anında vurgu, seçili renk */
  await p.click('#penDers');await p.waitForTimeout(150);
  ok(await p.evaluate(()=>document.querySelector('#penDers').getAttribute('aria-pressed')==='true')&&await p.isVisible('#penBar'),'pen armed: aria-pressed=true, toolbar open');
  const bar=await p.evaluate(()=>[...document.querySelectorAll('#penBar button')].map(b=>b.getAttribute('aria-label')||b.textContent.trim()));
  ok(bar.join('|')==='Sarı|Yeşil|Pembe|Not ekle|Sil|Kapat|Kaydet','toolbar: 3 colours, Not ekle, Sil, Kapat '+bar.join('|'));
  ok(!overlap(await rect(p,'#penBar'),await rect(p,'#dersNext')),'toolbar does not cover Bloğu bitirdim');
  await shot(p,'ders_pen_toolbar_375');
  await p.click('#penBar [data-pc=green]');
  const got2=await p.evaluate(SELECT+`('#ccLog .cc-row[data-i]:not(.me) .cc-md','la luce')`);await p.waitForTimeout(350);
  ms=await marks(p,'#ccLog');
  ok(got2==='la luce'&&ms.length===2&&ms.some(m=>m.t==='la luce'&&m.c==='hl-green'),'armed pen: selection highlighted immediately in green '+JSON.stringify(ms.map(m=>[m.t,m.c])));
  /* bir vurguya dokun → renk değiştir, not ekle */
  await p.click('#ccLog mark.hl[data-hid]');await p.waitForTimeout(150);
  ok(await p.isVisible('#penBar')&&await p.evaluate(()=>!document.querySelector('#penBar [data-pa=note]').disabled),'tap on mark opens popover with Not ekle enabled');
  await p.click('#penBar [data-pc=pink]');await p.waitForTimeout(150);
  ms=await marks(p,'#ccLog');ok(ms.some(m=>m.t==='il cavo'&&m.c==='hl-pink'),'colour changed to pink '+JSON.stringify(ms.map(m=>[m.t,m.c])));
  await p.click('#penBar [data-pa=note]');await p.fill('#penNoteIn','artikel il + cavo');await p.press('#penNoteIn','Enter');await p.waitForTimeout(200);
  ms=await marks(p,'#ccLog');const noted=ms.find(m=>m.t==='il cavo');
  ok(noted&&noted.note==='artikel il + cavo'&&/not: artikel/.test(noted.lbl)&&await p.evaluate(()=>!!document.querySelector('#ccLog mark.hl.has-note')),'note saved: title, aria-label, dot '+JSON.stringify(noted));
  await p.click('#penBar [data-pa=close]');await p.waitForTimeout(100);
  /* yeniden çizim (ccRender) → vurgular yerinde, ikilenmez */
  await p.evaluate(()=>TYDIL.chat.render());await p.waitForTimeout(250);
  ms=await marks(p,'#ccLog');
  ok(ms.length===2&&ms.filter(m=>m.t==='il cavo').length===1&&ms.find(m=>m.t==='il cavo').c==='hl-pink'&&ms.find(m=>m.t==='la luce').c==='hl-green','after ccRender: both marks re-applied once, colours kept');
  await p.evaluate(()=>{TYDIL.chat.render();TYDIL.chat.render();});await p.waitForTimeout(250);ok((await marks(p,'#ccLog')).length===2,'idempotent: repeated renders do not duplicate marks');
  /* yeni mesaj gönder → eski vurgular kalır */
  await p.fill('#ccIn','Il cavo è kablo.');await p.press('#ccIn','Enter');await idle(p);await p.waitForTimeout(300);
  ms=await marks(p,'#ccLog');ok(ms.length===2,'marks survive a new coach turn (streaming + replace) '+ms.length);
  const dark=await ctx.newPage();await dark.emulateMedia({colorScheme:'dark'});await p.emulateMedia({colorScheme:'dark'});await p.waitForTimeout(150);
  const col=await p.evaluate(()=>{const m=document.querySelector('#ccLog mark.hl');const s=getComputedStyle(m);return {bg:s.backgroundColor,color:s.color,txt:getComputedStyle(m.parentElement).color};});
  ok(/rgba\(/.test(col.bg)&&col.color===col.txt,'dark mode: translucent background, text colour unchanged '+JSON.stringify(col));
  await p.evaluate(()=>document.querySelector('#ccLog mark.hl').scrollIntoView({block:'center'}));await p.waitForTimeout(150);await shot(p,'ders_highlight_375_dark');await p.emulateMedia({colorScheme:'light'});await dark.close();
  /* kaldır */
  await p.click('#ccLog mark.hl.hl-green');await p.waitForTimeout(120);await p.click('#penBar [data-pa=del]');await p.waitForTimeout(200);
  ms=await marks(p,'#ccLog');ok(ms.length===1&&ms[0].t==='il cavo','Kaldır removes the green mark, pink stays');
  const thread=await p.evaluate(()=>TYDIL.chat.state.key);
  /* yenileme → vurgu yerinde (db'den) */
  await p.reload();await p.waitForTimeout(700);await p.click('[data-tab=practice]');await p.waitForTimeout(600);
  ms=await marks(p,'#ccLog');ok(ms.length===1&&ms[0].t==='il cavo'&&ms[0].c==='hl-pink'&&ms[0].note==='artikel il + cavo','after reload (Pratik): highlight re-attached with colour and note '+JSON.stringify(ms));
  const rec=await p.evaluate(()=>TYPEN.state.items.map(h=>({k:h.kind,thread:h.thread,turn:h.turn,q:h.quote,pre:h.prefix.length>0,suf:h.suffix.length>0})));
  ok(rec.length===1&&rec[0].k==='chat'&&rec[0].thread===thread&&typeof rec[0].turn==='number'&&rec[0].pre&&rec[0].suf,'record: chat anchor thread+turn with prefix/suffix '+JSON.stringify(rec));
  /* offset kayması: tur dizini değişse bile alıntı ile bulunur */
  await p.evaluate(()=>{TYDIL.chat.state.turns.unshift({r:'u',c:'(eklenen eski mesaj)',t:Date.now()-99999});TYDIL.chat.render();});await p.waitForTimeout(250);
  ms=await marks(p,'#ccLog');ok(ms.length===1&&ms[0].t==='il cavo','turn index shifted → quote/prefix fallback still re-attaches');
  /* İlerleme → Vurgularım */
  await p.click('[data-tab=progress]');await p.waitForTimeout(200);
  const list=await p.evaluate(()=>({n:document.querySelectorAll('#hlList .hlItem').length,txt:document.querySelector('#hlList').innerText,cnt:document.querySelector('#hlCount').textContent}));
  ok(list.n===1&&/Bugün/.test(list.txt)&&/Chiara/.test(list.txt)&&/il cavo/.test(list.txt)&&/artikel il \+ cavo/.test(list.txt)&&/Git/.test(list.txt)&&list.cnt==='1 vurgu','Vurgularım lists the highlight grouped by day with source, quote, note, Git');
  await p.click('#hlList [data-hgo]');await p.waitForTimeout(700);
  ok(!(await p.evaluate(()=>document.querySelector('#tab-practice').hidden))&&await p.evaluate(()=>{const m=document.querySelector('#ccLog mark.hl');const r=m.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'Git opens Pratik and scrolls the mark into view');
  /* hatalar listesi (İlerleme) de vurgulanır */
  await p.click('[data-tab=progress]');await p.waitForTimeout(200);await p.evaluate(()=>document.querySelector('#mistakes').scrollIntoView({block:'center'}));await p.waitForTimeout(100);
  const gm=await p.evaluate(SELECT+`('#mistakes','essere/avere')`);await p.waitForTimeout(450);await p.click('#penChip');await p.waitForTimeout(250);
  ok(gm==='essere/avere'&&(await marks(p,'#mistakes')).length===1,'İlerleme mistakes list highlightable');
  await p.evaluate(()=>TYDIL.db.collection('sessions').doc('a').update({}));await p.waitForTimeout(250);ok((await marks(p,'#mistakes')).length===1,'mistakes highlight re-applied after renderLog');
  await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(100);await p.evaluate(()=>window.scrollTo(0,document.querySelector('#hlCard').getBoundingClientRect().top+scrollY-150));await p.waitForTimeout(150);await shot(p,'highlights_list_375');
  /* yedek: dışa aktar → içe aktar → vurgular var; anahtar yok */
  const exp=await p.evaluate(()=>rtExport());
  ok(exp.collections.highlights&&Object.keys(exp.collections.highlights).length===2&&!JSON.stringify(exp).includes('sk-ant'),'export contains highlights collection and no API key');
  await p.evaluate(async()=>{await rtImport({app:'TY-DIL',format:1,collections:{}});});await p.waitForTimeout(300);
  ok((await p.evaluate(()=>TYPEN.state.items.length))===0&&(await marks(p,'')).length===0,'import of empty backup clears highlights and unwraps marks');
  await p.evaluate(async e=>{await rtImport(e);},exp);await p.waitForTimeout(400);
  ok((await p.evaluate(()=>TYPEN.state.items.length))===2&&(await marks(p,'#mistakes')).length===1,'import restores highlights and re-applies marks');
  /* iki adımlı silme */
  await p.click('#hlList [data-hdel]');await p.waitForTimeout(100);ok((await p.textContent('#hlList [data-hdel]')).trim()==='Emin misin?'&&(await p.evaluate(()=>TYPEN.state.items.length))===2,'list Sil asks "Emin misin?" first');
  await p.click('#hlList [data-hdel]');await p.waitForTimeout(200);ok((await p.evaluate(()=>TYPEN.state.items.length))===1,'second tap deletes');
  await ctx.close();}

 /* ---- B. Dersler ünite adımı: vurgu adıma özel kalır ---- */
 {const {p,ctx}=await open({seed:PROG});await p.waitForSelector('[data-tab=units]:not([hidden])');
  await p.evaluate(()=>{TYDIL.openTab('units');TYDIL.units.go('it/it1-2/rule');});await p.waitForTimeout(500);
  let hash=await p.evaluate(()=>location.hash);
  
  const txt=await p.evaluate(()=>{const c=document.querySelector('#uView .u-card:not(.u-ubar) p, #uView .u-card:not(.u-ubar) li, #uView .u-card:not(.u-ubar) .u-rule');return c?c.textContent.trim().slice(0,12).trim():'';});
  ok(txt.length>=6,'unit step has text to highlight: "'+txt+'" '+hash);
  const g=await p.evaluate(SELECT+`('#uView .u-card:not(.u-ubar)',${JSON.stringify(txt)})`);await p.waitForTimeout(450);
  ok(g===txt&&await p.isVisible('#penChip'),'unit text selection shows chip');await p.click('#penChip');await p.waitForTimeout(300);
  let um=await marks(p,'#uView');ok(um.length===1&&um[0].t===txt,'unit highlight created '+JSON.stringify(um));
  const rec=await p.evaluate(()=>TYPEN.state.items.map(h=>({k:h.kind,lang:h.lang,uid:h.uid,step:h.step,title:h.title})));
  ok(rec.length===1&&rec[0].k==='unit'&&rec[0].lang==='it'&&rec[0].uid&&rec[0].step&&/·/.test(rec[0].title),'unit record anchored by lang+uid+step with title '+JSON.stringify(rec));
  await shot(p,'units_highlight_375');
  /* başka adıma geç → yok; geri gel → var; yenile → var */
  const step=rec[0].step, uid=rec[0].uid;
  await p.evaluate(()=>TYDIL.units.go('it/it1-2/examples'));await p.waitForTimeout(400);
  const hash2=await p.evaluate(()=>location.hash);
  ok(hash2!==hash&&(await marks(p,'#uView')).length===0,'other step: no marks '+hash2);
  await p.evaluate((a)=>TYDIL.units.go(a),'it/'+uid+'/'+step);await p.waitForTimeout(400);
  um=await marks(p,'#uView');ok(um.length===1&&um[0].t===txt,'back to the step: mark re-applied');
  await p.reload();await p.waitForTimeout(600);await p.evaluate((a)=>{TYDIL.openTab('units');TYDIL.units.go(a);},'it/'+uid+'/'+step);await p.waitForTimeout(500);
  um=await marks(p,'#uView');ok(um.length===1&&um[0].t===txt,'after reload: unit mark persists');
  /* Vurgularım → Git ünite adımını açar */
  await p.click('[data-tab=progress]');await p.waitForTimeout(200);const lt=await p.textContent('#hlList');
  ok(/Git/.test(lt)&&new RegExp(rec[0].title.split(' · ')[1]).test(lt),'list shows unit title · step');
  await p.click('#hlList [data-hgo]');await p.waitForTimeout(700);
  ok(/dersler\//.test(await p.evaluate(()=>location.hash))&&(await marks(p,'#uView')).length===1,'Git opens the unit step with the mark');
  /* FAB ünitede alt düğmelerle çakışmaz (sayfa sonu) */
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(150);
  const fab=await rect(p,'#penFab');const hit=await p.evaluate(f=>[...document.querySelectorAll('#uView button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&r.left<f.r&&f.l<r.right&&r.top<f.b&&f.t<r.bottom;}).map(b=>b.textContent.trim()),fab);
  ok(!hit.length,'FAB does not overlap unit buttons at page end '+JSON.stringify(hit));
  await ctx.close();}

 /* ---- C. Bitti ekranı + klavye ---- */
 {const {p,ctx}=await open({seed:PROG});await p.evaluate(()=>{localStorage.setItem('tydil-mode',JSON.stringify({date:'2026-10-08',mode:'it',at:Date.now()}));localStorage.setItem('tydil-ders',JSON.stringify({date:'2026-10-08',fin:['it-kelime','it-gramer','it-okuma'],t:{}}));});
  await p.reload();await p.waitForTimeout(600);await p.click('[data-tab=learn]');await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);await p.waitForTimeout(300);
  await p.click('#dersNext');await idle(p);await p.waitForFunction(()=>!document.querySelector('#dersDone').hidden,null,{timeout:8000}).catch(()=>{});await p.waitForTimeout(300);
  const done=await p.evaluate(()=>!document.querySelector('#dersDone').hidden);
  if(done){const g=await p.evaluate(SELECT+`('#dersDone','Bugün tamam')`);await p.waitForTimeout(450);await p.click('#penChip');await p.waitForTimeout(300);
    ok(g==='Bugün tamam'&&(await marks(p,'#dersDone')).length===1,'done screen highlightable');
    await p.evaluate(()=>TYDIL.ders.render());await p.waitForTimeout(250);ok((await marks(p,'#dersDone')).length===1,'done screen highlight re-applied after render');
    await p.focus('#dersDone mark.hl');await p.keyboard.press('Enter');await p.waitForTimeout(150);ok(await p.isVisible('#penBar'),'keyboard: Enter on focused mark opens popover');
    await p.keyboard.press('Escape');await p.waitForTimeout(100);ok(!(await p.isVisible('#penBar'))&&await p.evaluate(()=>!document.querySelector('#ders').hidden),'Escape closes popover without leaving Ders modu');}
  else ok(false,'done screen reached');
  await ctx.close();}

 await b.close();srv.close();console.log('errors',errs);ok(!errs.length,'no console errors / dialogs');console.log('shots →',SHOTS);console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
