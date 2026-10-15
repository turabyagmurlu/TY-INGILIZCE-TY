/* Görsel + PWA + eski uygulama: 375/1280 × açık/koyu ekran görüntüleri (tests/shots/), yatay kaydırma yok, konsol hatası yok, Ayarlar anahtar kartı,
   manifest geçerli JSON, service worker kaydı (localhost), legacy/ty-ingilizce.html hatasız açılır.
   NODE_PATH=$(npm root -g) node tests/visual_test.js */
const H=require('./_h.js');const {ok,AT}=H;const fs=require('fs');const path=require('path');
const THU=AT(2026,10,8,9);
const PROG={program:{main:{start:'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}},topics:{it01:{status:'done'},it02:{status:'done'},it03:{status:'done'},it04:{status:'done'},it05:{status:'doing'}},
  cards:Object.fromEntries(Array.from({length:8},(_,i)=>['c'+i,{lang:'it',f:'parola'+i,tr:'kelime'+i,box:1,due:'2026-10-08',added:'2026-10-01T08:00:00Z'}])),
  sessions:{a:{date:'2026-10-07',lang:'it',mins:{kelime:10,gramer:20,okuma:10,sesli:5},total:45,mistakes:['essere/avere karışıklığı']},b:{date:'2026-10-07',lang:'en',mins:{speaking:15},total:15}}};
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];fs.mkdirSync(H.SHOTS,{recursive:true});
 const open=async(o,ctxo)=>{o=o||{};const st={};const ctx=await b.newContext(Object.assign({viewport:{width:375,height:812},timezoneId:'Europe/Istanbul',reducedMotion:'reduce'},ctxo||{}));const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text())&&!(o.url&&/legacy/.test(o.url)&&/fetching the script/.test(m.text())))errs.push('console '+m.text());});   /* legacy sayfa kendi sw.js'ini (legacy/sw.js yok) kaydetmeye çalışır: beklenen 404 */p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   await p.addInitScript(H.clockScript(THU));if(o.key!==null)await p.addInitScript(k=>localStorage.setItem('tydil.apiKey',k),'sk-ant-test');
   await p.addInitScript(()=>{try{localStorage.setItem('tydil-tip-pin','1');}catch(e){}});
   await H.mockApi(p,st);await p.goto(srv.base+(o.url||'/index.html'));
   if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
   await p.waitForTimeout(500);return {p,ctx,st};};
 const hscroll=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 const shot=(p,n,full)=>p.screenshot({path:path.join(H.SHOTS,n),fullPage:!!full});
 const idle=p=>p.waitForFunction(()=>!document.querySelector('.cc-row.live')&&document.querySelector('#ccStop').hidden,null,{timeout:10000});

 // PWA
 {const man=JSON.parse(fs.readFileSync(path.join(H.ROOT,'manifest.webmanifest'),'utf8'));
  ok(man.name==='TY Dil'&&man.short_name==='TY Dil'&&man.display==='standalone'&&man.icons.length===3&&man.theme_color==='#44709E','manifest: TY Dil, standalone, 3 icons, theme');
  const sw=fs.readFileSync(path.join(H.ROOT,'sw.js'),'utf8');ok(/ty-dil-v6/.test(sw)&&/skipWaiting/.test(sw)&&/clients\.claim/.test(sw)&&/legacy\/ty-ingilizce\.html/.test(sw),'sw.js: cache ty-dil-v6, skipWaiting/claim, precaches legacy');
  const html=fs.readFileSync(path.join(H.ROOT,'index.html'),'utf8');
  ok(/^<!doctype html>\n<html lang="tr">/.test(html)&&/<meta charset="utf-8">/.test(html)&&/name="viewport"/.test(html)&&/name="theme-color"/.test(html)&&/rel="manifest"/.test(html)&&/apple-touch-icon/.test(html)&&/<title>TY Dil<\/title>/.test(html),'index.html: full document skeleton');
  ok(!/claude\.ai'de|claude\.ai’de|giriş yapmış olarak/.test(html)&&(html.match(/claude\.ai/g)||[]).length===1,'no "open in claude.ai" dependency texts (only the billing note mentions claude.ai)');
  ok(!/\bKurulum\b/.test(html.replace(/\/\*[\s\S]*?\*\//g,'')),'"Kurulum" renamed to "Ayarlar" everywhere (outside CSS comments)');
  ok(!/\b(alert|confirm|prompt)\(/.test(html.replace(/\/\*[\s\S]*?\*\//g,'')),'no alert/confirm/prompt');
  const {p,ctx}=await open({});await p.waitForTimeout(800);
  const reg=await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await navigator.serviceWorker.ready;return r?{scope:r.scope,active:!!(r.active||r.installing||r.waiting)}:null;});
  ok(reg&&reg.active&&/127\.0\.0\.1/.test(reg.scope),'service worker registers on localhost '+JSON.stringify(reg));
  const cached=await p.evaluate(async()=>{const ks=await caches.keys();const c=await caches.open('ty-dil-v6');const m=await c.match('./index.html');return {ks,idx:!!m};});
  ok(cached.ks.includes('ty-dil-v6')&&cached.idx,'cache ty-dil-v6 holds index.html');
  await ctx.close();}

 // Görseller
 for(const [w,scheme] of [[375,'light'],[375,'dark'],[1280,'light'],[1280,'dark']]){const vp={viewport:{width:w,height:w<500?812:900},colorScheme:scheme};const tag=`${w} ${scheme}`;
  {const {p,ctx}=await open({key:null},vp);await shot(p,`onb_${w}_${scheme}.png`);ok(await hscroll(p),`onboarding no h-scroll ${tag}`);
   await p.click('[data-tab=setup]');await p.waitForTimeout(150);ok(await p.isVisible('#keyCard')&&await p.isVisible('#apiKey')&&await p.isVisible('#btnKeyTest')&&await p.isVisible('#modelSel')&&await p.isVisible('#btnBkDl'),`Ayarlar: key card + backup visible ${tag}`);
   await shot(p,`ayarlar_${w}_${scheme}.png`,true);ok(await hscroll(p),`Ayarlar no h-scroll ${tag}`);
   await p.click('[data-tab=practice]');await p.waitForTimeout(150);await shot(p,`nokey_${w}_${scheme}.png`);ok(/API anahtarı gerekli/.test(await p.textContent('#ccLog')),`no-key chat card ${tag}`);
   await ctx.close();}
  const {p,ctx,st}=await open({seed:PROG},vp);
  await shot(p,`learn_${w}_${scheme}.png`);ok(await hscroll(p),`learn no h-scroll ${tag}`);
  ok(await p.evaluate(()=>document.querySelector('#btnGo').getBoundingClientRect().bottom<=innerHeight),`primary button above the fold ${tag}`);
  await p.click('[data-tab=practice]');await p.waitForTimeout(150);await shot(p,`practice_${w}_${scheme}.png`);ok(await hscroll(p),`practice no h-scroll ${tag}`);
  await p.click('[data-tab=progress]');await p.waitForTimeout(150);await shot(p,`progress_${w}_${scheme}.png`,true);ok(await hscroll(p),`progress no h-scroll ${tag}`);
  await p.click('[data-tab=learn]');await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);await p.waitForTimeout(200);
  await p.fill('#ccIn','Il cavo è kablo.');await p.press('#ccIn','Enter');await idle(p);await p.waitForTimeout(200);
  await shot(p,`ders_${w}_${scheme}.png`);ok(await hscroll(p),`Ders modu no h-scroll ${tag}`);
  const small=await p.evaluate(()=>[...document.querySelectorAll('#ders button,#ders textarea')].filter(e=>e.offsetParent&&!e.classList.contains('cc-say')).map(e=>[e.id||e.className,Math.round(e.getBoundingClientRect().height),Math.round(e.getBoundingClientRect().width)]).filter(x=>x[1]<44||x[2]<44));
  ok(!small.length,`Ders modu tap targets ≥44 ${tag} `+JSON.stringify(small));
  await ctx.close();}

 // Eski uygulama (legacy) duman testi
 {const {p,ctx}=await open({url:'/legacy/ty-ingilizce.html'});await p.waitForTimeout(800);
  const t=await p.title();ok(/TY İngilizce/.test(t)&&await p.evaluate(()=>document.body.innerText.length>200),'legacy/ty-ingilizce.html loads (title "'+t+'")');
  await shot(p,'legacy_375.png');ok(await hscroll(p),'legacy no h-scroll');await ctx.close();}
 await b.close();srv.close();console.log('errors',errs);ok(!errs.length,'no console errors / dialogs');console.log('shots →',H.SHOTS);console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
