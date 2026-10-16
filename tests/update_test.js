/* Güncelleme bandı: yeni service worker kurulunca "Yeni sürüm hazır · Yenile" görünür; Yenile → sayfa yeniden yüklenir, kayıtlar kaybolmaz;
   uygulamaya dönünce (focus/visibilitychange) güncelleme denetimi yapılır. İlk kurulumda band çıkmaz.
   NODE_PATH=$(npm root -g) node tests/update_test.js */
const H=require('./_h.js');const {ok,sleep}=H;const http=require('http');const fs=require('fs');const path=require('path');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
let ver=null, swHits=0;
function serve(){return new Promise(res=>{const s=http.createServer((req,r)=>{const u=new URL(req.url,'http://x');
  if(u.pathname==='/__ver'){ver=u.searchParams.get('v');r.writeHead(200);return r.end('ok');}
  let rel=decodeURIComponent(u.pathname.slice(1));if(rel===''||rel.endsWith('/'))rel+='index.html';const fp=path.join(H.ROOT,rel);
  if(!fp.startsWith(H.ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){r.writeHead(404);return r.end('nf');}
  let body=fs.readFileSync(fp);if(rel==='sw.js'){swHits++;if(ver)body=Buffer.from(body.toString().replace(/const BUILD = "[^"]*";/,'const BUILD = "'+ver+'";'));}
  r.writeHead(200,{'content-type':MIME[path.extname(fp)]||'application/octet-stream','cache-control':'no-cache'});r.end(body);});
  s.listen(0,'127.0.0.1',()=>res({base:'http://127.0.0.1:'+s.address().port,close:()=>s.close()}));});}
(async()=>{const srv=await serve();const b=await H.browser();const errs=[];const SHOTS=path.join(H.ROOT,'review/shots_v9');fs.mkdirSync(SHOTS,{recursive:true});
 const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Istanbul'});const p=await ctx.newPage();
 p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('dialog',d=>{errs.push('DIALOG');d.dismiss();});
 await p.addInitScript(()=>{localStorage.setItem('tydil-tip-pin','1');});
 await p.goto(srv.base+'/index.html');
 await p.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active&&navigator.serviceWorker.controller);},null,{timeout:15000}).catch(()=>{});
 await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!!navigator.serviceWorker.controller),'SW installed + controlling on first visit');
 ok(await p.isHidden('#updBar'),'first install: no update banner');
 await p.evaluate(()=>rtImport({app:'TY-DIL',format:1,collections:{cards:{k1:{lang:'it',f:'la luce',tr:'ışık',box:2,due:'2099-01-01'}}}}));
 await p.reload();await p.waitForTimeout(600);ok(await p.isHidden('#updBar'),'normal reload: no banner');
 // uygulamaya dönünce denetim
 const h0=swHits;await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForTimeout(800);ok(swHits>h0,'focus → registration.update() fetched sw.js ('+(swHits-h0)+')');
 // yeni sürüm yayımlandı → bekleyen/kurulan SW → band
 await H.get(srv.base+'/__ver?v=next1');
 await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
 await p.waitForSelector('#updBar:not([hidden])',{timeout:15000}).catch(()=>{});
 ok(await p.isVisible('#updBar')&&/Yeni sürüm hazır/.test(await p.textContent('#updBar'))&&/Yenile/.test(await p.textContent('#updGo')),'new SW installed → banner "Yeni sürüm hazır · Yenile"');
 const bb=await p.$eval('#updBar',e=>{const r=e.getBoundingClientRect();const n=document.querySelector('.tabs').getBoundingClientRect();return {b:r.bottom,nt:n.top,l:r.left,r:r.right,w:innerWidth};});
 ok(bb.b<=bb.nt&&bb.l>=0&&bb.r<=bb.w,'banner sits above the tab bar, inside viewport');
 const g=await p.$eval('#updGo',e=>{const r=e.getBoundingClientRect();return r.height;});ok(g>=44,'Yenile ≥44 px');
 await p.screenshot({path:path.join(SHOTS,'update_banner_390.png')});
 await p.evaluate(()=>{window.__marker=1;});
 await Promise.all([p.waitForNavigation({timeout:10000}).catch(()=>{}),p.click('#updGo')]);await p.waitForTimeout(800);
 ok(await p.evaluate(()=>window.__marker===undefined),'Yenile → page reloaded');
 ok(await p.isHidden('#updBar'),'after reload banner gone');
 ok(await p.evaluate(()=>!!(rtExport().collections.cards||{}).k1),'data kept after update reload');
 ok(await p.evaluate(async()=>{const c=await caches.keys();return c.length===1&&c[0]==='ty-dil-v9';}),'single cache ty-dil-v9');
 const swSrc=fs.readFileSync(path.join(H.ROOT,'sw.js'),'utf8');ok(/SKIP_WAITING/.test(swSrc)&&/"\.\/mod\/lesson\.js"/.test(swSrc)&&/"\.\/content\/index\.json"/.test(swSrc),'sw.js: SKIP_WAITING handler; precaches lesson module + content (generated from content/index.json)');
 ok(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
 await b.close();srv.close();console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
