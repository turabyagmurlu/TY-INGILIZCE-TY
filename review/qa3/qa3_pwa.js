/* QA3: PWA under GitHub Pages sub-path /TY-INGILIZCE-TY/ — manifest validity, SW precache (ty-dil-v4), offline reload,
   update flow (old cache deleted, new SW takes over), legacy page offline, icon dimensions.
   NODE_PATH=$(npm root -g) node review/qa3/qa3_pwa.js */
const H=require('../../tests/_h.js');const {ok,sleep}=H;const http=require('http');const fs=require('fs');const path=require('path');const net=require('net');
const PFX='/TY-INGILIZCE-TY';const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.css':'text/css'};
let swVer=null, paused=false; // swVer: sw.js served with CACHE renamed → simulates an app update; paused: every request's socket destroyed → real offline for page AND service worker
function serve(){return new Promise(res=>{const s=http.createServer((req,r)=>{const u=new URL(req.url,'http://x');
  if(u.pathname==='/__swver'){swVer=u.searchParams.get('v')||null;r.writeHead(200);return r.end('ok');}
  if(u.pathname==='/__pause'){paused=u.searchParams.get('on')==='1';r.writeHead(200);return r.end('ok');}
  if(paused){req.socket.destroy();return;}
  if(u.pathname===PFX){r.writeHead(301,{Location:PFX+'/'});return r.end();}
  if(!u.pathname.startsWith(PFX+'/')){r.writeHead(404);return r.end('nf');}
  let rel=decodeURIComponent(u.pathname.slice(PFX.length+1));if(rel===''||rel.endsWith('/'))rel+='index.html';
  const fp=path.join(H.ROOT,rel);if(!fp.startsWith(H.ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){r.writeHead(404);return r.end('nf');}
  let body=fs.readFileSync(fp);if(rel==='sw.js'&&swVer)body=Buffer.from(body.toString().replace('"ty-dil-v4"','"ty-dil-v'+swVer+'"'));
  r.writeHead(200,{'content-type':MIME[path.extname(fp)]||'application/octet-stream','cache-control':'max-age=600'});r.end(body);});
  s.listen(0,'127.0.0.1',()=>res({base:'http://127.0.0.1:'+s.address().port,close:()=>s.close()}));});}
const offline=async(srv,on)=>{await H.get(srv.base+'/__pause?on='+(on?1:0)).catch(()=>{});};
const png=b=>({w:b.readUInt32BE(16),h:b.readUInt32BE(20)});
(async()=>{const srv=await serve();const b=await H.browser();const errs=[];const APP=srv.base+PFX+'/';
 const ctx=await b.newContext({viewport:{width:375,height:812}});const p=await ctx.newPage();
 p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});

 /* manifest */
 {const r=await H.get(APP+'manifest.webmanifest');let m=null;try{m=JSON.parse(r.body);}catch(e){}
  ok(r.status===200&&m&&m.name&&m.short_name&&m.start_url&&m.display&&Array.isArray(m.icons)&&m.icons.length>=2,'manifest parses; required fields present');
  ok(m.start_url==='./'&&m.scope==='./','manifest start_url/scope relative (./) → resolves under /TY-INGILIZCE-TY/');
  ok(m.icons.some(i=>i.sizes==='192x192')&&m.icons.some(i=>i.sizes==='512x512')&&m.icons.some(i=>i.purpose==='maskable'),'icons 192 + 512 + maskable');
  for(const i of m.icons){const buf=fs.readFileSync(path.join(H.ROOT,i.src));const d=png(buf);const [w,h]=i.sizes.split('x').map(Number);ok(d.w===w&&d.h===h,'icon '+i.src+' real size '+d.w+'x'+d.h+' matches declared '+i.sizes);
    const rr=await H.get(APP+i.src);ok(rr.status===200,'icon '+i.src+' served under sub-path');}
  const html=fs.readFileSync(path.join(H.ROOT,'index.html'),'utf8');
  ok(/href="manifest\.webmanifest"/.test(html)&&/href="icon-192\.png"/.test(html)&&/href="apple-touch-icon\.png"/.test(html)&&/register\("\.\/sw\.js"\)/.test(html)&&!/href="\/|src="\//.test(html),'index.html uses only relative URLs (no leading-slash paths)');
  ok(/apple-mobile-web-app-capable/.test(html)&&/theme-color/.test(html),'iOS meta + theme-color present');}

 /* first load under sub-path: SW registers, scope correct, precache */
 // seed an old-version cache from a same-origin page that does not register a SW (legacy page), then open the app
 await p.goto(APP+'tests/rt_page.html');
 await p.evaluate(async()=>{const c=await caches.open('ty-dil-v1');await c.put('./old.txt',new Response('old'));});
 ok(await p.evaluate(async()=>!(await navigator.serviceWorker.getRegistration())),'pre-seed state clean (no SW yet)');
 await p.goto(APP);
 await p.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return !!(r&&r.active)&&(await caches.keys()).length===1;},null,{timeout:15000}).catch(()=>{});
 await p.reload();await p.waitForTimeout(800);
 const sw=await p.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();const keys=await caches.keys();const c=await caches.open('ty-dil-v4');const ks=(await c.keys()).map(r=>new URL(r.url).pathname);return {scope:reg&&reg.scope,active:!!(reg&&reg.active),ctrl:!!navigator.serviceWorker.controller,keys,ks};});
 ok(sw.active&&sw.ctrl&&/\/TY-INGILIZCE-TY\/$/.test(sw.scope),'SW active + controlling, scope '+sw.scope);
 ok(JSON.stringify(sw.keys)===JSON.stringify(['ty-dil-v4']),'caches after activate: '+JSON.stringify(sw.keys)+' (old ty-dil-v1 deleted)');
 const need=['/TY-INGILIZCE-TY/','/TY-INGILIZCE-TY/index.html','/TY-INGILIZCE-TY/manifest.webmanifest','/TY-INGILIZCE-TY/icon-192.png','/TY-INGILIZCE-TY/legacy/ty-ingilizce.html','/TY-INGILIZCE-TY/apple-touch-icon.png','/TY-INGILIZCE-TY/icon-512.png','/TY-INGILIZCE-TY/icon-maskable-512.png'];
 ok(need.every(n=>sw.ks.includes(n)),'precache has all FILES under sub-path: missing '+need.filter(n=>!sw.ks.includes(n)).join(','));

 /* offline: reload + start_url + legacy */
 await offline(srv,true);
 await p.reload({waitUntil:'load'}).catch(e=>errs.push('offline reload '+e.message));await p.waitForTimeout(600);
 ok(await p.evaluate(()=>!!document.querySelector('.tabs')&&document.title==='TY Dil'),'offline reload: app rendered from cache');
 const nav=await p.evaluate(async()=>{const r=await fetch('./');return r.status;}).catch(e=>String(e));ok(nav===200,'offline fetch start_url ./ → 200 from cache');
 const p2=await ctx.newPage();await p2.goto(APP+'legacy/ty-ingilizce.html').catch(e=>errs.push('legacy offline '+e.message));
 ok(await p2.evaluate(()=>document.body&&document.body.innerHTML.length>1000),'offline legacy page served');
 // unknown page offline → navigation fallback to index.html
 const p3=await ctx.newPage();await p3.goto(APP+'nope.html').catch(e=>errs.push('fallback '+e.message));
 const t3=await p3.evaluate(()=>({title:document.title,len:document.body?document.body.innerHTML.length:0,txt:(document.body&&document.body.innerText||'').slice(0,80)}));
 ok(t3.title==='TY Dil','offline unknown navigation → falls back to cached index.html '+JSON.stringify(t3));
 await p2.close();await p3.close();await offline(srv,false);

 /* update flow: new sw.js (CACHE v3) deployed → old cache ty-dil-v4 deleted, new SW controls after reload */
 await H.get(srv.base+'/__swver?v=4');
 await p.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
 await p.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();const ks=await caches.keys();return ks.includes('ty-dil-v4')&&!r.installing&&!r.waiting;},null,{timeout:15000}).catch(()=>{});
 {const tl=[];for(let i=0;i<10;i++){tl.push((await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return (await caches.keys()).join('+')+' act='+(r.active&&r.active.state)+' inst='+(r.installing&&r.installing.state)+' wait='+(r.waiting&&r.waiting.state)+' ctrl='+(navigator.serviceWorker.controller?'y':'n');})));await sleep(300);}console.log('  update timeline:',tl.join(' | '));}
 const up=await p.evaluate(async()=>{const o={keys:await caches.keys()};if(o.keys.includes('ty-dil-v4')){const c=await caches.open('ty-dil-v4');o.v2=(await c.keys()).map(r=>new URL(r.url).pathname);}return o;});
 if(up.v2)console.log('  v2 leftover entries:',JSON.stringify(up.v2));
 ok(JSON.stringify(up.keys)===JSON.stringify(['ty-dil-v4']),'after SW update: caches '+JSON.stringify(up.keys)+' (v2 removed by activate)');
 await p.reload();await p.waitForTimeout(500);
 const up2=await p.evaluate(async()=>{const c=await caches.open('ty-dil-v4');return {n:(await c.keys()).length,ok:!!navigator.serviceWorker.controller};});
 ok(up2.ok&&up2.n>=8,'new SW controls + repopulated precache ('+up2.n+' entries)');
 await offline(srv,true);await p.reload().catch(e=>errs.push('offline after update '+e.message));await p.waitForTimeout(400);
 ok(await p.evaluate(()=>document.title==='TY Dil'),'offline still works after update');
 await offline(srv,false);

 /* NOTE: network-first with default HTTP cache; GitHub Pages Cache-Control max-age=600 */
 const swSrc=fs.readFileSync(path.join(H.ROOT,'sw.js'),'utf8');
 ok(/cache: "no-cache"/.test(swSrc)&&/mode === "navigate"/.test(swSrc),'sw.js: stale-while-revalidate with fetch(req,{cache:"no-cache"}) (bypasses GitHub Pages 10-min HTTP cache)');
 ok(!errs.length,'no page errors '+errs.slice(0,3).join(' | '));
 await b.close();srv.close();console.log('errors',JSON.stringify(errs.slice(0,5)));console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
