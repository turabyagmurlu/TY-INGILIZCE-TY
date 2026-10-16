const {H,SH,mk,audit,path}=require('./common.js');
(async()=>{const srv=await H.serve();const b=await H.browser();
 const {p,errs}=await mk(b,srv,{});
 const txt=async()=>p.evaluate(()=>{const m=[...document.querySelectorAll('section,.card,#onb')].find(e=>e.offsetParent&&e.getBoundingClientRect().height>100);return (m||document.body).innerText.slice(0,1500);});
 for(let i=0;i<3;i++){const btn=await p.$('text=İleri')||await p.$('text=Başla');if(!btn)break;await btn.click();await p.waitForTimeout(300);await p.screenshot({path:path.join(SH,`x_onb${i+2}_390.png`)});console.log('--- step',i+2,'\n',(await p.evaluate(()=>document.body.innerText)).slice(0,1200));}
 console.log(JSON.stringify(await audit(p,'after onb')));
 await p.screenshot({path:path.join(SH,'x_today_390.png'),fullPage:true});
 console.log('errs',errs);await b.close();srv.close();})();
