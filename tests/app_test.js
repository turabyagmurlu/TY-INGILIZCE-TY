/* Uygulama akışı (gerçek rt.js + taklit Anthropic API): ilk kurulum → Ders modu → bloklar → geçiş → Oliver → bitti; çift tıklama, devam, kalıcılık, hata/yeniden deneme, anahtar kilidi
   NODE_PATH=$(npm root -g) node tests/app_test.js */
const H=require('./_h.js');const {ok,sleep,AT}=H;const path=require('path');
const THU=AT(2026,10,8,9), SUN=AT(2026,10,11,9);
const PROG=s=>({program:{main:{start:s||'2026-09-22',weeks:12,dailyMin:60,mode:'yogun'}}});
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 const open=async(o,at,ctxo)=>{o=o||{};const st={};const ctx=await b.newContext(Object.assign({viewport:{width:375,height:812},timezoneId:'Europe/Istanbul'},ctxo||{}));const p=await ctx.newPage();
   p.on('pageerror',x=>errs.push('pageerror '+x.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push('console '+m.text());});p.on('dialog',d=>{errs.push('DIALOG '+d.type());d.dismiss();});
   if(at!=null)await p.addInitScript(H.clockScript(at));
   if(o.key!==null)await p.addInitScript(k=>localStorage.setItem('tydil.apiKey',k),o.key||'sk-ant-test');
   await H.mockApi(p,st,o.handler);
   await p.goto(srv.base+'/index.html');
   if(o.seed){await p.evaluate(s=>rtImport({app:'TY-DIL',format:1,collections:s}),o.seed);await p.reload();}
   await p.waitForTimeout(500);return {p,ctx,st};};
 const idle=p=>p.waitForFunction(()=>!document.querySelector('.cc-row.live')&&document.querySelector('#ccStop').hidden,null,{timeout:10000});
 const steps=p=>p.$$eval('#dersSteps .dStep',e=>e.map(x=>(x.classList.contains('done')?'+':x.classList.contains('cur')?'>':'-')+x.querySelector('.dsl').textContent));
 const last=st=>st.calls[st.calls.length-1];
 const hscroll=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 const store=(p,c)=>p.evaluate(c=>rtExport().collections[c]||{},c);
 const next=async(p,st)=>{await p.waitForTimeout(1250);const n=st.calls.length;await p.click('#dersNext');await p.waitForFunction(()=>!!document.querySelector('.cc-row.live')||document.querySelector('#dersNext').hidden||document.querySelector('#dersNext').disabled,null,{timeout:3000}).catch(()=>{});await idle(p);await p.waitForTimeout(250);};

 // A) İlk kurulum → Ders modu → bloklar → geçiş → Oliver → çıkış/geri dönüş → bitti
 {const {p,ctx,st}=await open({},THU);
  ok(await p.isVisible('#onb')&&!(await p.isVisible('#learnMain')),'first run: onboarding replaces dashboard');
  ok(/Programın: 12 hafta, günde 60 dk/.test(await p.textContent('#onb .onbStep[data-step="1"]'))&&await p.inputValue('#progStart')==='2026-10-08','step 1: program + start date defaults to today');
  ok(await p.evaluate(()=>!!document.querySelector('[data-tab=units]').offsetParent&&document.querySelector('#tab-units').hidden&&document.querySelector('#tyUnitsMount').innerHTML===''),'Dersler tab registered (units.js) but panel hidden + unmounted until opened');
  ok((await p.$$eval('.tabs button',e=>e.filter(x=>!x.hidden).map(x=>x.querySelector('.tl').textContent))).join()==='Öğren,Pratik,İlerleme,Dersler,Ayarlar','tabs: Öğren, Pratik, İlerleme, Dersler, Ayarlar (Kurulum renamed)');
  await p.click('[data-onb="2"]');await p.click('.onbStep[data-step="2"] [data-onb="3"]');ok(await p.isVisible('#btnProgStart')&&/12 Ekim Pazartesi/.test(await p.textContent('#progStartHint')),'step 3: Başla + week-1 date hint');
  ok(Object.keys(await store(p,'program')).length===0,'no program written before Başla');
  await p.evaluate(()=>{const x=document.querySelector('#btnProgStart');x.click();x.click();});
  await p.waitForSelector('#ders:not([hidden])',{timeout:4000});
  const pw=await store(p,'program');ok(Object.keys(pw).length===1&&pw.main.start==='2026-10-08','program written once (main) '+JSON.stringify(pw));
  ok(await p.evaluate(()=>document.querySelector('#coachChat').parentElement.id)==='dersChat'&&!(await p.isVisible('.app')),'Ders modu: chat moved in, dashboard hidden');
  await idle(p);await p.waitForTimeout(300);
  let s=await steps(p);ok(s.join(' ')==='>Gramer -Kelime -Okuma-yazma -Sesli tekrar -Konuşma','stepper 5 blocks, it01 day starts with sounds: '+s.join(' '));
  let c=last(st);ok(c&&/AJAN: CHIARA/.test(c.first)&&c.last==='Bugünkü İtalyanca dersini başlat.','Chiara started the lesson (system prompt carries agent)');
  ok(c.tools.includes('seans_kaydet')&&c.tools.includes('kelime_ekle'),'tools sent to API: '+c.tools.join(','));
  ok(/\[\[it: il cavo\]\]/.test(await p.evaluate(()=>[...document.querySelectorAll('#ccLog .cc-row')].pop().innerText))||/il cavo/.test(await p.textContent('#ccLog')),'coach reply rendered (table after kelime_ekle round)');
  ok(/2 İtalyanca kelime kartlara eklendi/.test(await p.textContent('#ccLog')),'kelime_ekle tool executed in page → act line');
  const cards=await store(p,'cards');ok(Object.values(cards).filter(x=>x.lang==='it').length===2&&Object.values(cards).every(x=>x.due==='2026-10-09'),'cards persisted via db shim, due tomorrow');
  ok(/Sıradaki: Kelime/.test(await p.textContent('#dersNext')),'primary: "Bloğu bitirdim → Sıradaki: Kelime"');
  // çift tıklama koruması
  await p.waitForTimeout(1250);const n0=st.calls.length;await p.evaluate(()=>{const x=document.querySelector('#dersNext');x.click();x.click();});await idle(p);await p.waitForTimeout(300);
  c=last(st);s=await steps(p);
  ok(st.calls.length===n0+1&&/^Bu bloğu \(Gramer\) bitiriyorum\. seans_kaydet ile gerçek dakikayı kaydet/.test(c.last)&&s[0]==='+Gramer'&&s[1]==='>Kelime','dblclick → one wrap-up, advanced to block 2: '+s.join(' '));
  const pill=await p.$$eval('#ccLog .cc-row.sys',e=>e.map(x=>x.textContent.trim().replace(/^Sen:\s*/,'')));ok(pill.length===1&&/^Gramer bitti → Kelime$/.test(pill[0]),'wrap-up shown as system pill: '+pill);
  const sess=await store(p,'sessions');ok(Object.values(sess).some(x=>x.lang==='it'&&x.mins&&x.mins.gramer===20),'seans_kaydet → sessions doc (gramer 20)');
  await next(p,st);await next(p,st);await next(p,st);await p.waitForSelector('#dersTrans:not([hidden])',{timeout:4000});
  const tr=(await p.textContent('#dersTrans')).replace(/\s+/g,' ');ok(/İtalyanca bitti · 45 dk · 2 yeni kelime/.test(tr)&&/15 dk İngilizce konuşma/.test(tr),'transition card: '+tr);
  await p.click('#dersGoEn');await idle(p);await p.waitForTimeout(300);c=last(st);
  ok(await p.getAttribute('[data-agent=en]','aria-selected')==='true'&&/AJAN: OLIVER/.test(c.first)&&c.last==='Bugünkü konuşmayı başlat.','switched to Oliver + started');
  // Esc → çık, yeniden gir → aynı blok, yeni mesaj yok
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  ok(await p.isHidden('#ders')&&await p.isVisible('.app')&&/Derse devam et/.test(await p.textContent('#btnGo')),'Esc exits, hero offers continue');
  const n1=st.calls.length;await p.click('#btnGo');await p.waitForTimeout(700);s=await steps(p);
  ok(await p.isVisible('#ders')&&s[4]==='>Konuşma'&&st.calls.length===n1&&(await p.inputValue('#ccIn'))===''&&/Kaldığın yer: Konuşma/.test(await p.textContent('#dersAlt')),'re-enter resumes block 5, no new send, "Kaldığın yer" note');
  // sayfa yenile: ders işaretleri (days) + sohbet geçmişi IndexedDB'den geri gelir
  await p.reload();await p.waitForTimeout(700);
  ok(await p.isHidden('#ders')&&/Derse devam et/.test(await p.textContent('#btnGo'))&&/45 \/ 60 dk/.test(await p.textContent('#meter')),'after reload: progress kept (45 / 60 dk logged from sessions), Ders modu closed');
  await p.click('[data-tab=practice]');await p.waitForTimeout(400);
  ok((await p.$$eval('#ccLog .cc-row',e=>e.length))>=2&&/Tell me about your crew/.test(await p.textContent('#ccLog')),'chat history (chats collection) restored after reload');
  await p.click('#btnGo').catch(()=>{});await p.click('[data-tab=learn]');await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await p.waitForTimeout(500);
  await next(p,st);await p.waitForSelector('#dersDone:not([hidden])',{timeout:4000});
  const dn=(await p.textContent('#dersDone')).replace(/\s+/g,' ');
  ok(/Toplam ?60 dk/.test(dn)&&/Blok ?5 \/ 5/.test(dn)&&/Kelime ?3/.test(dn)&&/Seri ?1 gün ?\+1/.test(dn),'done screen numbers (60 dk, 5/5, 3 words, streak 1 +1): '+dn.slice(0,160));
  ok(/il\/lo artikel/.test(dn)&&/since\/for/.test(dn)&&/Yarın ?İtalyanca: Selamlaşma/.test(dn)&&!/\b(it|en)\d\d\b/i.test(dn),'done screen: mistakes + tomorrow, no topic codes');
  ok(/Daha doğal/.test(await p.evaluate(()=>{const r=[...document.querySelectorAll('#ccLog .cc-row')].pop();return r?r.textContent:'';})),"done keeps Oliver's closing visible");
  ok(await p.isHidden('#ccForm')&&await p.isVisible('#dersChatOpen')&&await p.evaluate(()=>document.activeElement&&document.activeElement.id!=='ccIn'),'done screen: chat input collapsed, not focused; "Koça cevap yaz" offered');
  await p.click('#dersChatOpen');await p.waitForTimeout(150);ok(await p.isVisible('#ccForm')&&await p.evaluate(()=>document.activeElement&&document.activeElement.id==='ccIn')&&await p.isHidden('#dersChatOpen'),'Koça cevap yaz → input back and focused');
  await p.click('#dersBack');await p.waitForTimeout(250);ok(/Bugün tamam/.test(await p.textContent('#heroTitle')),'today complete');
  ok(await hscroll(p),'no h-scroll 375');
  await ctx.close();}

 // B) Anahtar yok: koçlar kilitli, kart Ayarlar'a götürür; anahtar girilince açılır; program/kartlar çalışır
 {const {p,ctx,st}=await open({key:null,seed:PROG()},THU);
  ok(await p.isVisible('#learnMain')&&/Bugünkü dersi başlat/.test(await p.textContent('#btnGo')),'no key: dashboard + program work');
  ok(/API anahtarı gir/.test(await p.textContent('#heroHint'))&&await p.isHidden('#keyGate'),'no key: hero hint points to Ayarlar → Anahtar; gate card hidden until Başla');
  await p.click('[data-tab=practice]');await p.waitForTimeout(300);
  ok(/API anahtarı gerekli/.test(await p.textContent('#ccLog'))&&await p.isDisabled('#ccIn')&&await p.isHidden('#pracBanner'),'no key: chat shows key card, input disabled');
  await p.click('#ccLog [data-go=key]');await p.waitForTimeout(400);ok(await p.isVisible('#keyCard')&&/Anahtar yok/.test(await p.textContent('#keyState')),'key card button → Ayarlar / Claude bağlantısı');
  await p.click('[data-tab=learn]');await p.click('#btnGo');await p.waitForTimeout(400);
  ok(await p.isVisible('#tab-learn')&&await p.isHidden('#ders')&&await p.isVisible('#keyGate')&&/Koçlar için API anahtarı gerekli/.test(await p.textContent('#keyGate'))&&/Anahtarsız devam/.test(await p.textContent('#keyGate')),'no key: hero button shows key gate card (no Ders modu, no coachless lesson)');
  ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id==='keyGateT'),'key gate: focus moves to card title');
  await p.click('#keyGateUnits');await p.waitForTimeout(200);ok(await p.isVisible('#tab-units'),'key gate: "Dersler\'e geç" opens Dersler');
  await p.click('[data-tab=learn]');await p.click('#keyGate [data-go=key]');await p.waitForTimeout(400);ok(await p.isVisible('#keyCard'),'key gate: "Ayarlar → Anahtar" opens key card');
  await p.fill('#apiKey','yanlış');await p.click('#btnKeySave');ok(/Anahtar sk-ant- ile başlamalı/.test(await p.textContent('#keyMsg'))&&await p.getAttribute('#apiKey','aria-invalid')==='true'&&!(await p.evaluate(()=>localStorage.getItem('tydil.apiKey'))),'key validation: inline "Anahtar sk-ant- ile başlamalı", nothing stored');
  await p.fill('#apiKey','sk-ant-api03-kisa');await p.click('#btnKeySave');ok(/en az 40 karakter/.test(await p.textContent('#keyMsg'))&&!(await p.evaluate(()=>localStorage.getItem('tydil.apiKey'))),'key validation: too short (<40) rejected inline');
  const LONGKEY='sk-ant-api03-'+'T'.repeat(60);
  await p.fill('#apiKey',LONGKEY);await p.click('#btnKeyTest');await p.waitForTimeout(400);ok(/Bağlantı tamam/.test(await p.textContent('#keyMsg')),'test connection ✓ (mock)');
  await p.fill('#apiKey',LONGKEY);await p.click('#btnKeySave');await p.waitForTimeout(50);
  ok(/doğrulanıyor/.test(await p.textContent('#keyMsg'))||/Bağlı/.test(await p.textContent('#keyMsg')),'save → "doğrulanıyor…" then auto test');
  await p.waitForFunction(()=>/Bağlı/.test(document.querySelector('#keyState').textContent),null,{timeout:4000});
  ok(/Bağlı/.test(await p.textContent('#keyState'))&&await p.evaluate(()=>localStorage.getItem('tydil.apiKey'))===LONGKEY&&await p.isVisible('#btnKeyGo'),'key saved + verified: keyState Bağlı, "Dersi başlat" action in #keyMsg');
  await p.click('#btnKeyGo');await p.waitForSelector('#ders:not([hidden])',{timeout:4000});ok(await p.isVisible('#ders'),'Dersi başlat → Ders modu opens');await p.keyboard.press('Escape');await p.waitForTimeout(300);
  await p.click('[data-tab=practice]');await p.waitForTimeout(300);ok(await p.isEnabled('#ccIn')&&/Chiara/.test(await p.textContent('#ccLog'))&&await p.isVisible('#pracBanner'),'after key: coaches unlocked without reload');
  ok(await p.$$eval('#tab-practice .cc-start, #pracGo',e=>e.filter(x=>x.offsetParent).length)===1,'Pratik: exactly one start CTA (banner) while lesson pending');
  await p.click('[data-tab=learn]');await p.waitForTimeout(100);ok(await p.isHidden('#keyGate'),'after key: gate card gone');
  await p.click('[data-tab=setup]');await p.selectOption('#modelSel','claude-haiku-5-5');await p.click('[data-tab=learn]');await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);await p.fill('#ccIn','ciao');await p.press('#ccIn','Enter');await idle(p);
  ok(st.reqs.length>0&&st.reqs[st.reqs.length-1].model==='claude-haiku-5-5','model choice from Ayarlar used in requests');
  // geçersiz anahtar: 401 → mesaj
  st.fail=()=>true;st.failStatus=401;await p.fill('#ccIn','ciao');await p.press('#ccIn','Enter');await idle(p);await p.waitForTimeout(200);
  ok(/API anahtarı geçersiz; Ayarlar'dan kontrol et/.test(await p.textContent('#ccLog')),'401 → "API anahtarı geçersiz; Ayarlar\'dan kontrol et"');
  await ctx.close();}

 // C) Kayıt hatası: başarısız kapanış bloğu açık tutar, Tekrar dene / Kaydetmeden geç; yedek dışa/içe aktarma UI
 {const {p,ctx,st}=await open({seed:PROG()},THU);await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);
  st.fail=req=>/bitiriyorum/.test(req.lastText)&&!req.cont;st.failStatus=500;
  await next(p,st);await p.waitForTimeout(300);
  ok((await steps(p))[0]==='>Gramer'&&await p.isVisible('#dersRetry')&&/Kaydetmeden geç/.test(await p.textContent('#dersSkip'))&&await p.isHidden('#dersNext'),'failed wrap-up keeps block, offers Tekrar dene / Kaydetmeden geç');
  st.fail=null;await p.click('#dersRetry');await idle(p);await p.waitForTimeout(300);
  const s=await steps(p);ok(s[0]==='+Gramer'&&s[1]==='>Kelime'&&/Gramer bitti → Kelime/.test(await p.textContent('#ccLog .cc-row.sys')),'retry → logged + advanced + pill restored');
  st.fail=req=>/bitiriyorum/.test(req.lastText)&&!req.cont;await next(p,st);await p.waitForTimeout(300);await p.click('#dersSkip');await p.waitForTimeout(400);st.fail=null;
  const s2=await steps(p),days=await store(p,'days');ok(s2[1]==='+Kelime'&&s2[2]==='>Okuma-yazma'&&days['2026-10-08']&&days['2026-10-08'].fin.includes('it-kelime'),'Kaydetmeden geç → advances, fin persisted to days/2026-10-08 '+JSON.stringify(days['2026-10-08']&&days['2026-10-08'].fin));
  await p.reload();await p.waitForTimeout(600);await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await p.waitForTimeout(600);
  ok((await steps(p))[2]==='>Okuma-yazma','after reload: skipped block still done (days + localStorage)');
  await p.keyboard.press('Escape');await p.click('[data-tab=setup]');await p.waitForTimeout(200);
  const dl=p.waitForEvent('download');await p.click('#btnBkDl');const d=await dl;const fp=path.join(H.SHOTS,'yedek.json');await d.saveAs(fp);
  const j=JSON.parse(require('fs').readFileSync(fp,'utf8'));ok(/^ty-dil-yedek-2026-10-08\.json$/.test(d.suggestedFilename())&&j.app==='TY-DIL'&&j.collections.program.main&&Object.keys(j.collections.sessions).length===1,'backup download: ty-dil-yedek-<date>.json with data');
  await p.click('#bkRestore summary');await p.fill('#bkPaste','{"app":"TY-DIL","format":1,"created":"2026-10-01T10:00:00Z","collections":{"program":{"main":{"start":"2026-09-01","weeks":12,"dailyMin":60,"mode":"yogun"}},"cards":{"k1":{"lang":"it","f":"la casa","tr":"ev","box":2,"due":"2026-10-08"}}}}');
  await p.click('#btnBkRestore');await p.waitForTimeout(200);ok(/geri yüklensin mi/.test(await p.textContent('#bkConfirm'))&&/1 kart/.test(await p.textContent('#bkConfirm'))&&await p.evaluate(()=>document.activeElement.id==='btnBkNo'),'restore asks in-page confirm (no dialog), focus on Vazgeç');
  await p.click('#btnBkNo');ok((await p.textContent('#bkConfirm')).trim()===''&&(await store(p,'cards'))['k1']===undefined,'Vazgeç → nothing changed');
  await p.click('#btnBkRestore');await p.click('#btnBkYes');await p.waitForTimeout(1500);
  const cards=await store(p,'cards'),prog=await store(p,'program');ok(cards.k1&&cards.k1.f==='la casa'&&prog.main.start==='2026-09-01'&&Object.keys(cards).length===1,'restore replaced store + reloaded '+JSON.stringify(prog.main));
  await p.click('[data-tab=setup]');await p.click('#bkRestore summary');await p.fill('#bkPaste','{"app":"X"}');await p.click('#btnBkRestore');ok(/TY Dil yedeği değil/.test(await p.textContent('#bkMsg')),'bad backup rejected');
  await ctx.close();}

 // D) Var olan program ezilmez; Pazar varyantı; Dersler sekmesi kancası
 {const {p,ctx,st}=await open({seed:PROG()},SUN);await p.click('#btnGo');await p.waitForSelector('#ders:not([hidden])');await idle(p);
  const s=await steps(p);ok(s.join(' ')==='>Kelime tekrarı -Mini sınav -Konuşma','Sunday variant: '+s.join(' '));
  await p.keyboard.press('Escape');
  const r=await p.evaluate(()=>{TYDIL.registerUnits(m=>{m.innerHTML='<article class="card" id="uOk"><h2>Üniteler</h2></article>';});return {tab:!!document.querySelector('[data-tab=units]').offsetParent,mount:!document.querySelector('#tyUnitsMount').hidden};});
  await p.click('[data-tab=units]');await p.waitForTimeout(200);
  ok(r.tab&&r.mount&&await p.isVisible('#uOk')&&await p.isVisible('#tab-units'),'TYDIL.registerUnits shows Dersler tab, renders into #tyUnitsMount on open');
  ok((await p.$$eval('.tabs button',e=>e.filter(x=>!x.hidden).length))===5&&await hscroll(p),'5 tabs fit at 375, no h-scroll');
  await ctx.close();}
 await b.close();srv.close();console.log('errors',errs);ok(!errs.length,'no console errors / dialogs');console.log(H.fails()?'FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1);});
