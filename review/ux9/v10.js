const {H,SH,mk,audit,path}=require('./common.js');
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 // onboarding fresh
 {const {p}=await mk(b,srv,{errs});await p.screenshot({path:path.join(SH,'v10_onb_390.png')});console.log('ONB',(await p.textContent('#onb')).replace(/\s+/g,' ').slice(0,400));
  const bt=await p.$('#btnProgStart');await bt.click();await p.waitForTimeout(1500);
  console.log('after start: lsn',await p.isVisible('#lsn'),'cards',await p.isVisible('#tab-cards'),'ders-on',await p.evaluate(()=>document.documentElement.classList.contains('ders-on')),await p.textContent('#lsnT').catch(()=>''));
  await p.screenshot({path:path.join(SH,'v10_onb_after_390.png')});
  if(await p.isVisible('#lsn')){await p.click('#lsnX');await p.waitForTimeout(300);}
  console.log('verdict',await p.evaluate(()=>{const e=document.querySelector('#progStrip,.weekStrip');return document.body.innerText.match(/gerideysin|Plandasın|önündesin|Isınma[^\n]*/g);}));
  console.log('header',await p.evaluate(()=>[...document.querySelectorAll('header *')].filter(e=>!e.children.length&&e.offsetParent).map(e=>e.textContent.trim()+':'+Math.round(e.getBoundingClientRect().left)+'-'+Math.round(e.getBoundingClientRect().right)).join(' ')));
  await p.screenshot({path:path.join(SH,'v10_today_fresh_390.png')});}
 // Sunday
 for(const vp of [{width:390,height:844},{width:820,height:1180}]){const {p}=await mk(b,srv,{errs,vp,dark:vp.width>400,at:H.AT(2026,10,18,9),seed:{program:{main:{start:'2026-10-12',weeks:12,dailyMin:60,mode:'yogun'}},lessons:{it01:{step:4,done:[true,true,true,true,true],passed:true,passedAt:'2026-10-14',best:5}},topics:{it01:{status:'done',updated:'2026-10-14T10:00:00Z'}}}});
  console.log('SUN',vp.width,JSON.stringify(await p.$$eval('#dayPlan li',e=>e.map(x=>x.innerText.replace(/\n/g,' ')))),'GO',await p.textContent('#btnGo'),'| hidden plan?',await p.isHidden('#dayPlan'));
  console.log('SUN hero',(await p.evaluate(()=>document.querySelector('#hero').innerText)).replace(/\n+/g,' | ').slice(0,400));
  await p.screenshot({path:path.join(SH,`v10_sunday_${vp.width}.png`)});
  await p.click('#btnGo');await p.waitForTimeout(800);console.log('SUN Başla → lsn',await p.isVisible('#lsn'),await p.textContent('#lsnEye').catch(()=>''),'ders-on',await p.evaluate(()=>document.documentElement.classList.contains('ders-on')),'cards',await p.isVisible('#tab-cards'));
  if(await p.isVisible('#lsn')){await p.screenshot({path:path.join(SH,`v10_sunday_go_${vp.width}.png`)});}}
 // fab contrast & lesson header ipad dark
 {const {p}=await mk(b,srv,{errs,vp:{width:820,height:1180},dark:true,seed:{program:{main:{start:'2026-10-12',weeks:12,dailyMin:60,mode:'yogun'}}}});
  await p.click('[data-tab=units]');await p.click('#myLessons [data-lesson=it01]');await p.waitForSelector('#askFab');
  console.log('fab',await p.$eval('#askFab',e=>{const c=getComputedStyle(e);return c.color+' on '+c.backgroundColor;}));
  await p.click('[data-act=aNext]');await p.waitForTimeout(200);await p.screenshot({path:path.join(SH,'v10_ipad_anlat2.png')});console.log(JSON.stringify(await audit(p,'ipad anlat2')));}
 console.log('errs',errs);await b.close();srv.close();})();
