const {H,SH,mk,path}=require('./common.js');
(async()=>{const srv=await H.serve();const b=await H.browser();
 const {p}=await mk(b,srv,{seed:{program:{main:{start:'2026-10-12',weeks:12,dailyMin:60,mode:'yogun'}},lessons:{it01:{step:4,done:[true,true,true,true,true],passed:true,passedAt:'2026-10-14',best:5}},topics:{it01:{status:'done',updated:'2026-10-14T10:00:00Z'}},sessions:{'konus-2026-10-14-en':{date:'2026-10-14',lang:'en',src:'konus',mins:{speaking:15},total:15},'lesson-2026-10-14-it01':{date:'2026-10-14',lang:'it',src:'lesson',topic:'it01',mins:{gramer:20,okuma:5},total:25}}}});
 console.log(await p.evaluate(()=>{const d=document.querySelector('#dueChip');return d?{vis:!!d.offsetParent,t:d.textContent}:null;}));
 console.log((await p.evaluate(()=>document.querySelector('#hero').innerText)).replace(/\n+/g,' | ').slice(0,300),'| streak',await p.evaluate(()=>[...document.querySelectorAll('header *')].find(e=>/Seri/.test(e.textContent)&&!e.children.length)?.textContent));
 await p.screenshot({path:path.join(SH,'v10_done_40min_390.png')});await b.close();srv.close();})();
