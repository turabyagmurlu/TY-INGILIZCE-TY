const {H,mk}=require('./common.js');(async()=>{const srv=await H.serve();const b=await H.browser();const {p}=await mk(b,srv,{vp:{width:820,height:1180},dark:true,seed:{program:{main:{start:'2026-10-12',weeks:12,dailyMin:60,mode:'yogun'}}}});
await p.evaluate(()=>{});await p.click('[data-tab=units]');await p.click('#myLessons [data-lesson=it01]');await p.waitForSelector('#askFab');
console.log(await p.$eval('#askFab',e=>{const c=getComputedStyle(e);return c.color+' on '+c.backgroundColor;}));
await p.click('#lsnX');await p.click('[data-tab=learn]');console.log(await p.evaluate(()=>{const h=document.querySelector('header,.top');return [...document.querySelectorAll('header *')].filter(e=>/Dil|Seri/.test(e.textContent)&&!e.children.length).map(e=>e.textContent+':'+JSON.stringify(e.getBoundingClientRect()))}));
await b.close();srv.close();})();
