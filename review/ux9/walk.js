/* UX9 acceptance walk. VP env: phone|ipad|desk */
const {H,SH,mk,audit,path,fs}=require('./common.js');
const VP={phone:{vp:{width:390,height:844},dark:false},ipad:{vp:{width:820,height:1180},dark:true},desk:{vp:{width:1280,height:800},dark:false}}[process.env.VP||'phone'];
const tag=process.env.VP||'phone';
const L=(...a)=>console.log('['+tag+']',...a);
const C=id=>JSON.parse(fs.readFileSync(path.join(H.ROOT,'content',id+'.json'),'utf8'));
const SEED={program:{main:{start:'2026-10-12',weeks:12,dailyMin:60,mode:'yogun',created:'2026-10-12T08:00:00Z'}},
 cards:Object.fromEntries([['il cavo','kablo'],['la luce','ışık'],['il cantiere','şantiye'],['uscita','çıkış']].map(([f,tr],i)=>['s'+i,{lang:'it',f,tr,box:1,due:'2026-10-13',added:'2026-10-10T10:00:00Z'}]).concat([['e1',{lang:'en',f:'to sort out',tr:'halletmek',box:2,due:'2026-10-12',added:'2026-10-05T10:00:00Z'}]]))};
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const {p,st}=await mk(b,srv,Object.assign({seed:SEED,errs},VP));
 let taps=0;const click=async(sel,o)=>{taps++;await p.click(sel,o);await p.waitForTimeout(90);};
 const shot=async n=>{await p.screenshot({path:path.join(SH,`${tag}_${n}.png`)});};
 const au=async n=>{const a=await audit(p,n);if(a.hscroll||a.small.length||a.tiny.length||a.overflowR.length)L('AUDIT',JSON.stringify(a));};
 const stage=()=>p.evaluate(()=>document.querySelector('#lstage').innerText);
 const plan=()=>p.$$eval('#dayPlan li',e=>e.map(x=>(x.classList.contains('done')?'+':x.classList.contains('next')?'>':'-')+x.querySelector('b').textContent));
 const hero=async()=>(await p.evaluate(()=>document.querySelector('#hero')?document.querySelector('#hero').innerText:'')).replace(/\n+/g,' | ');
 const fit=async n=>{const r=await p.evaluate(()=>{const s=document.querySelector('#lstage');const l=document.querySelector('#lsn');const sc=[...l.querySelectorAll('*')].find(e=>e.scrollHeight>e.clientHeight+4&&/auto|scroll/.test(getComputedStyle(e).overflowY));return {sh:sc?sc.scrollHeight:0,ch:sc?sc.clientHeight:0,words:s.innerText.split(/\s+/).length,say:s.querySelectorAll('.say,[data-say]').length};});L('screen',n,JSON.stringify(r));};
 await shot('01_today');await au('today');L('PLAN',JSON.stringify(await plan()),'GO=',await p.textContent('#btnGo'));L('HERO',await hero());
 // Detaylar
 const det=await p.$('text=Detaylar');if(det){await det.click();await p.waitForTimeout(200);L('DETAILS',(await p.evaluate(()=>{const d=[...document.querySelectorAll('details')].find(x=>x.open);return d?d.innerText:'';})).replace(/\n+/g,' | ').slice(0,700));await det.click();}
 // Cards
 await click('#btnGo');L('after Başla visible cards?',await p.isVisible('#review'));await shot('02_cards');await au('cards');
 for(let i=0;i<6;i++){if(!(await p.isVisible('#cShow')))break;await click('#cShow');if(i===0)await shot('02b_card_back');await click(i===1?'#cNo':'#cYes');}
 L('cards end text:',(await p.evaluate(()=>document.querySelector('#tab-cards').innerText)).replace(/\n+/g,' | ').slice(0,400));await shot('03_cards_done');
 // what does it offer next?
 const nextBtn=await p.evaluate(()=>[...document.querySelectorAll('#tab-cards button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()).slice(0,8));L('cards-done buttons',JSON.stringify(nextBtn));
 await click('[data-tab=learn]');L('PLAN after IT cards',JSON.stringify(await plan()));await click('#btnGo');L('2nd Başla → cards again?',await p.isVisible('#tab-cards'),'which tab sel',await p.evaluate(()=>{const b=[...document.querySelectorAll('#tab-cards [aria-pressed=true],#tab-cards [aria-selected=true],#tab-cards .on')].map(x=>x.textContent.trim());return b.join(',');}));
 /* v10: kartlar İngilizceye kendiliğinden geçer, 2. Başla dersi açar (döngü yok) → ders açıldıysa kapat, değilse İngilizce kartları bitir */
 if(await p.isVisible('#lsn')){await click('#lsnX');}else{const en=await p.$('#tab-cards button:has-text("İngilizce")');await en.click();await p.waitForTimeout(150);while(await p.isVisible('#cShow')){await click('#cShow');await click('#cYes');}}
 await click('[data-tab=learn]');L('PLAN after cards',JSON.stringify(await plan()),'GO=',await p.textContent('#btnGo'));
 // Lesson it01
 await click('#btnGo');await p.waitForSelector('#lsn:not([hidden])');await p.waitForTimeout(200);
 L('lesson title',await p.textContent('#lsnT'),'| eye',await p.textContent('#lsnEye'));
 const d=C(await p.evaluate(()=>TYLESSON&&TYLESSON.cur?TYLESSON.cur.id:'it01').catch(()=>'it01'));
 await shot('04_anlat1');await au('anlat1');await fit('anlat1');L('STAGE1',(await stage()).replace(/\n+/g,' | ').slice(0,600));
 // header controls
 L('lsn header btns',JSON.stringify(await p.$$eval('#lsn button',e=>e.filter(x=>x.offsetParent).map(x=>(x.id||x.dataset.act||'')+':'+(x.textContent.trim()||x.getAttribute('aria-label')).slice(0,22)))));
 // Koça sor #1 (Anlat)
 await click('#askFab');await p.fill('#askIn','ci ile chi farkı ne?');await click('#askSend');await p.waitForTimeout(700);await shot('05_kocasor_anlat');L('askCtx',await p.textContent('#askCtx'),'| log',(await p.textContent('#askLog')).slice(0,200));
 const askSay=await p.$$eval('#askLog .say, #askLog button',e=>e.length);L('ask log audio btns',askSay);await click('#askX');
 let k=2;while(await p.$('[data-act=aNext]')){await click('[data-act=aNext]');if(await p.$('[data-act=aNext]')||true){await fit('anlat'+k);if(k<=4)await shot('06_anlat'+k);await au('anlat'+k);}k++;if(k>8)break;}
 L('now step',await p.evaluate(()=>{const b=document.querySelector('#lpath [aria-current=step]');return b?b.textContent.trim():'';}));
 await shot('07_dinle');await au('dinle');await fit('dinle');L('DINLE',(await stage()).replace(/\n+/g,' | ').slice(0,500));
 await click('[data-act=playAll]');await p.waitForTimeout(800);L('tts spoken',await p.evaluate(()=>__tts.spoken.length));
 await click('[data-act=finish][data-i="1"]');
 // Uygula
 const ans=async(kind,it,wrong,soft)=>{if(it.t==='choice'){const a=wrong?it.o.find(x=>x!==it.a):it.a;await click(`#lstage .opt[data-ans="${a.replace(/"/g,'\\"')}"]`);}
   else if(it.t==='type'){const v=wrong?'xxx':soft&&it.soft?it.soft[0]:(Array.isArray(it.a)?it.a[0]:it.a);await p.fill('#ans_'+kind,v);await click(`[data-form=${kind}] button`);}
   else{const words=await p.$$eval('#lstage .oPool .oW',e=>e.map(x=>x.textContent));const used=new Set();const target=String(Array.isArray(it.a)?it.a[0]:it.a).split(' ');if(wrong)target.reverse();for(const w of target){const i=words.findIndex((x,j)=>!used.has(j)&&x.toLowerCase()===w.toLowerCase());if(i<0)break;used.add(i);await click(`#lstage .oPool .oW[data-ow="${i}"]`);}await click('[data-act=oCheck]');}
   return (await p.textContent('#fb_'+kind)).trim();};
 for(let i=0;i<d.uygula.length;i++){const it=d.uygula[i];const wrong=i===0||i===8||it.t==='order';const fb=await ans('p',it,wrong,true);
   if(i===0){await shot('08_uygula_wrong');await au('uyg wrong');await click('[data-act=askWhy]');await click('#askSend');await p.waitForTimeout(600);await shot('09_kocasor_why');L('askWhy ctx',await p.textContent('#askCtx'));await click('#askX');}
   if(it.t==='order'){await shot('10_order_wrong');}
   if(it.soft)L('SOFT fb:',fb.slice(0,140));
   if(wrong)L('WRONG fb['+i+'] '+it.t+':',fb.replace(/\s+/g,' ').slice(0,160));
   await click('[data-act=next][data-kind=p]');}
 L('UYGULA END',(await stage()).replace(/\n+/g,' | ').slice(0,300));await shot('11_uygula_end');
 await click('[data-act=finish][data-i="2"]');L('KONUS step',(await stage()).replace(/\n+/g,' | ').slice(0,400));await shot('12_konus_step');await au('konus step');
 await click('[data-act=call]');await p.waitForSelector('#kc:not([hidden])');await p.waitForFunction(()=>__sr.cur&&__sr.cur._on,null,{timeout:6000});await shot('13_call');await au('call');
 L('call ui',(await p.evaluate(()=>document.querySelector('#kc').innerText)).replace(/\n+/g,' | ').slice(0,300));
 await p.evaluate(()=>{__sr.cur._result('u-Şİ-ta',true);});await p.waitForTimeout(2200);
 await click('#kcEnd');await p.waitForSelector('#kcSum',{timeout:6000});await shot('14_call_sum');L('SUM',(await p.textContent('#kcSum')).replace(/\s+/g,' ').slice(0,300));await click('#kcClose');
 L('after call stage',(await stage()).replace(/\n+/g,' | ').slice(0,200));
 await click('[data-act=finish][data-i="3"]');
 // Yokla fail
 for(let i=0;i<d.yokla.length;i++){await ans('q',d.yokla[i],i<2,false);await click('[data-act=next][data-kind=q]');}
 L('YOKLA FAIL',(await stage()).replace(/\n+/g,' | ').slice(0,500));await shot('15_yokla_fail');
 L('fail btns',JSON.stringify(await p.$$eval('#lstage button',e=>e.map(x=>(x.dataset.act||'')+':'+x.textContent.trim().slice(0,30)))));
 await click('[data-act=redoQ]');
 for(let i=0;i<d.yokla.length;i++){await ans('q',d.yokla[i],false,false);await click('[data-act=next][data-kind=q]');}
 await p.waitForTimeout(300);L('YOKLA PASS',(await stage()).replace(/\n+/g,' | ').slice(0,500));await shot('16_yokla_pass');await au('pass');
 L('pass btns',JSON.stringify(await p.$$eval('#lstage button',e=>e.map(x=>(x.dataset.act||'')+':'+x.textContent.trim().slice(0,30)))));
 await click('[data-act=close]');await p.waitForTimeout(300);
 L('PLAN after lesson',JSON.stringify(await plan()),'GO=',await p.textContent('#btnGo'));L('HERO2',await hero());await shot('17_today_after');
 L('streak',await p.evaluate(()=>{const e=[...document.querySelectorAll('header *')].find(x=>/Seri/.test(x.textContent)&&x.children.length<3);return e?e.textContent:'';}));
 const ss=await p.evaluate(()=>rtExport().collections.sessions||{});L('sessions',JSON.stringify(Object.fromEntries(Object.entries(ss).map(([k,v])=>[k,v.total]))));
 // Oliver via Başla
 await click('#btnGo');await p.waitForTimeout(600);L('2nd lesson opened?',await p.isVisible('#lsn'),await p.textContent('#lsnT').catch(()=>''));if(await p.isVisible('#lsn'))await click('#lsnX');
 /* v10: plan Başla'sı Oliver aramasını doğrudan açar; açılmadıysa Konuş sekmesinden */
 if(!(await p.isVisible('#kc'))){await click('[data-tab=konus]');await p.waitForTimeout(300);await click('.kco[data-kco=en]');await click('#kStart');}await p.waitForTimeout(400);L('after Başla(Oliver) kc?',await p.isVisible('#kc'),'konus tab?',await p.isVisible('#tab-konus'));await shot('18_oliver_entry');
 if(!(await p.isVisible('#kc'))){if(await p.isVisible('#kStart'))await click('#kStart');}
 await p.waitForSelector('#kc:not([hidden])');await p.waitForFunction(()=>__sr.cur&&__sr.cur._on,null,{timeout:6000});
 await p.evaluate(()=>{__sr.cur._result('I am running it since 2024',true);});await p.waitForTimeout(2300);await shot('19_oliver_call');
 await click('#kcEnd');await p.waitForSelector('#kcSum',{timeout:6000});await shot('20_oliver_sum');await click('#kcClose');await p.waitForTimeout(300);
 L('PLAN final',JSON.stringify(await plan()),'GO=',await p.textContent('#btnGo'));L('HERO3',await hero());await shot('21_today_done');
 // Pekiştir from Dersler
 await click('[data-tab=units]');await p.waitForTimeout(300);await shot('22_dersler');await au('dersler');
 L('DERSLER',(await p.evaluate(()=>document.querySelector('#tab-units').innerText)).replace(/\n+/g,' | ').slice(0,700));
 await click('#myLessons [data-lesson=it01]');await p.waitForSelector('#lsn:not([hidden])');L('reopen eye',await p.textContent('#lsnEye'),'|',(await stage()).replace(/\n+/g,' | ').slice(0,200));await shot('23_pekistir');
 await click('#lsnX');
 // it05 from Dersler
 await click('#myLessons [data-lesson=it05]');await p.waitForSelector('#lsn:not([hidden])');await p.waitForTimeout(200);L('it05 eye',await p.textContent('#lsnEye'),'locked?',await p.isDisabled('#lpath [data-step="2"]'));await shot('24_it05');await fit('it05');
 await click('#lsnX');
 // Kartlar, Ben, İlerleme, Ayarlar
 await click('[data-tab=cards]');await shot('25_kartlar');await au('kartlar');L('KARTLAR',(await p.evaluate(()=>document.querySelector('#tab-cards').innerText)).replace(/\n+/g,' | ').slice(0,400));
 await click('#btnBen');await p.waitForTimeout(250);await shot('26_ben');L('BEN',(await p.textContent('#benSheet')).replace(/\s+/g,' ').slice(0,400));
 await click('#benSheet [data-ben="progress"]');await p.waitForTimeout(300);await shot('27_progress');await au('progress');L('PROG',(await p.evaluate(()=>document.querySelector('#tab-progress').innerText)).replace(/\n+/g,' | ').slice(0,900));
 await p.screenshot({path:path.join(SH,`${tag}_27b_progress_full.png`),fullPage:true});
 await click('#btnBen');await click('#benSheet [data-ben="setup"]');await p.waitForTimeout(300);await shot('28_setup');await au('setup');L('SETUP headings',JSON.stringify(await p.$$eval('#tab-setup h2,#tab-setup h3,#tab-setup summary',e=>e.filter(x=>x.offsetParent).map(x=>x.textContent.trim().slice(0,40)))));
 await p.screenshot({path:path.join(SH,`${tag}_28b_setup_full.png`),fullPage:true});
 // Konuş tab
 await click('[data-tab=konus]');await shot('29_konus_tab');await au('konus tab');L('KONUS TAB',(await p.evaluate(()=>document.querySelector('#tab-konus').innerText)).replace(/\n+/g,' | ').slice(0,500));
 L('taps',taps,'errs',JSON.stringify(errs));await b.close();srv.close();})().catch(e=>{console.error(e);process.exit(1);});
