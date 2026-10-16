const {H,SH,mk,audit,path}=require('./common.js');
(async()=>{const srv=await H.serve();const b=await H.browser();
 const {p,errs}=await mk(b,srv,{});
 await p.screenshot({path:path.join(SH,'x_first_390.png'),fullPage:true});
 console.log(await p.evaluate(()=>document.querySelector('main, #app, body').innerText.slice(0,2500)));
 console.log(JSON.stringify(await audit(p,'first')));
 console.log('errs',errs);await b.close();srv.close();})();
