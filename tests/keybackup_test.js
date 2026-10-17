/* Anahtar yedeği: localStorage silinse de IndexedDB yedeğinden geri gelir; anahtar silinince yedek de silinir. */
const H=require('./_h.js');const KEY='sk-ant-api03-'+'Ab9_-'.repeat(19)+'XyZ0';
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.goto(srv.base+'/index.html');await H.sleep(500);
 await p.evaluate(k=>TYRT.setKey(k),KEY);await H.sleep(400);
 await p.evaluate(()=>localStorage.removeItem('tydil.apiKey'));await p.reload();await H.sleep(900);
 H.ok(await p.evaluate(()=>localStorage.getItem('tydil.apiKey'))===KEY,'localStorage silindi → anahtar yedekten geri geldi');
 H.ok(await p.evaluate(()=>TYRT.hasKey()),'hasKey true');
 await p.evaluate(()=>TYRT.setKey(''));await H.sleep(400);await p.reload();await H.sleep(900);
 H.ok(!(await p.evaluate(()=>localStorage.getItem('tydil.apiKey'))),'anahtar silinince yedekten geri gelmez');
 console.log('errors',JSON.stringify(errs));H.ok(!errs.length,'no page errors');
 await b.close();srv.close();const f=H.fails();console.log(f?'FAILED '+f:'ALL PASS');process.exit(f?1:0);})();
