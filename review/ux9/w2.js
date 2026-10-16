const {H,SH,mk,audit,path}=require('./common.js');
(async()=>{const srv=await H.serve();const b=await H.browser();
 const {p,errs,st}=await mk(b,srv,{});
 await p.click('[data-onb="2"]');await p.click('[data-onb="3"]');await p.waitForTimeout(200);
 await p.screenshot({path:path.join(SH,'x_onb3_390.png')});
 console.log((await p.textContent('#onb')).replace(/\s+/g,' '));
 await p.click('#btnProgStart');await p.waitForTimeout(1200);
 console.log('lesson open?',await p.isVisible('#lsn'), 'cls',await p.evaluate(()=>document.documentElement.className));
 await p.screenshot({path:path.join(SH,'x_afterstart_390.png')});
 if(await p.isVisible('#lsn')){console.log('LSN',(await p.textContent('#lsnT')),'|',(await p.evaluate(()=>document.querySelector('#lsn').innerText.slice(0,900))));await p.click('#lsnX');await p.waitForTimeout(300);}
 // seed due cards
 await p.evaluate(()=>{const c={};[['il cavo','kablo'],['la luce','ışık'],['il cantiere','şantiye'],['uscita','çıkış']].forEach(([f,tr],i)=>c['s'+i]={lang:'it',f,tr,box:1,due:'2026-10-13',added:'2026-10-10T10:00:00Z'});c.e1={lang:'en',f:'to sort out',tr:'halletmek',box:2,due:'2026-10-12',added:'2026-10-05T10:00:00Z'};return rtImport({app:'TY-DIL',format:1,collections:Object.assign({},rtExport().collections,{cards:c})});});
 await p.reload();await p.waitForTimeout(900);
 await p.screenshot({path:path.join(SH,'a1_today_390.png'),fullPage:true});
 console.log('TODAY:',(await p.evaluate(()=>document.querySelector('#tab-learn').innerText)).replace(/\n+/g,' | '));
 console.log(JSON.stringify(await audit(p,'today')));
 console.log('errs',errs);await b.close();srv.close();})();
