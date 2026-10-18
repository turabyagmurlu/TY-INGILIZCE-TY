/* Konuş: "Claude ile canlı sesli konuş" bağlantısı (claude.ai/new?q=koç talimatı), konu değişince güncellenir; tıklayınca dönüşte seans yazılır. */
const H=require('./_h.js');const path=require('path');
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('tydil.apiKey','sk-ant-test');localStorage.setItem('tydil-tip-pin','1');window.open=()=>null;});
 await p.goto(srv.base+'/index.html');await H.sleep(700);await H.tab(p,'konus');await p.waitForSelector('#kClaude',{timeout:8000});
 const href=await p.getAttribute('#kClaude','href');const q=decodeURIComponent(href.split('?q=')[1]||'');
 H.ok(/^https:\/\/claude\.ai\/new\?q=/.test(href),'bağlantı claude.ai/new?q=');
 H.ok(/Oliver/.test(q)&&/Konu:/.test(q)&&/Bitir/.test(q),'talimat: Oliver + konu + Bitir özeti');
 await p.click('[data-kco="it"]');await H.sleep(200);const q2=decodeURIComponent((await p.getAttribute('#kClaude','href')).split('?q=')[1]);
 H.ok(/Chiara/.test(q2)&&/A1/.test(q2),'Chiara seçilince talimat İtalyanca A1');
 await p.screenshot({path:path.join(H.ROOT,'review/shots_v12/konus_claude_390.png')});
 await p.evaluate(()=>{document.getElementById('kClaude').addEventListener('click',e=>e.preventDefault(),{once:true});});await p.click('#kClaude');
 await p.evaluate(()=>{const s=TYLESSON.state().K; s.ext.t0-=6*60000;Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await H.sleep(800);
 const ss=await p.evaluate(()=>Object.values(rtExport().collections.sessions||{}).filter(s=>s.src==='konus'));
 H.ok(ss.length===1&&ss[0].lang==='it'&&ss[0].total===6,'dönüşte 6 dk Konuş seansı yazıldı ('+JSON.stringify(ss.map(s=>s.total))+')');
 H.ok(await p.evaluate(()=>!document.getElementById('kc')||document.getElementById('kc').hidden),'uygulama içi arama kendiliğinden açılmadı');
 console.log('errors',JSON.stringify(errs));H.ok(!errs.length,'no page errors');
 await b.close();srv.close();const f=H.fails();console.log(f?'FAILED '+f:'ALL PASS');process.exit(f?1:0);})();
