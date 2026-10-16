/* Anahtar aktarımı (QR): Ayarlar'da QR, #k= ile açılışta anahtar kaydı + adres temizliği, hatalı kod, 90 sn kapanma */
const H=require('./_h.js');const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const KEY='sk-ant-api03-'+'Ab9_-'.repeat(19)+'XyZ0';
const okHandler=async()=>({status:200,body:JSON.stringify({id:'m',type:'message',role:'assistant',model:'claude-sonnet-5-5',content:[{type:'text',text:'OK'}],stop_reason:'end_turn'})});
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];
 try{
  /* 1) Bilgisayar: anahtar kayıtlı → Ayarlar'da QR */
  {const ctx=await b.newContext({viewport:{width:1280,height:900}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
   await ctx.addInitScript(k=>{try{localStorage.setItem('tydil.apiKey',k);}catch(e){}},KEY);
   await H.mockApi(p,{},okHandler);
   await p.goto(srv.base+'/index.html');await H.tab(p,'setup');await H.sleep(300);
   H.ok(await p.isVisible('#btnKx')&&(await p.textContent('#btnKx')).trim()==='Başka cihaza aktar (QR)','Ayarlar: "Başka cihaza aktar (QR)" görünür (anahtar varken)');
   H.ok(/Telefon, tablet: aynı QR'ı her cihazla okut\./.test(await p.textContent('#kxRow')),'ipucu: Telefon, tablet: aynı QR\'ı her cihazla okut.');
   await p.click('#btnKx');await H.sleep(200);
   H.ok(await p.isVisible('#kxBox svg.kxQr'),'QR çizildi');
   H.ok((await p.getAttribute('#btnKx','aria-expanded'))==='true','düğme aria-expanded=true');
   const shot=path.join(H.SHOTS,'keyxfer_qr_1280.png');await (await p.$('#kxBox svg.kxQr')).screenshot({path:shot});
   /* QR'ı gerçekten çöz (OpenCV) */
   let dec='';try{dec=execFileSync('python3',['-c','import cv2,sys;i=cv2.imread(sys.argv[1]);i=cv2.copyMakeBorder(i,40,40,40,40,cv2.BORDER_CONSTANT,value=(255,255,255));print(cv2.QRCodeDetector().detectAndDecode(i)[0])',shot]).toString().trim();}catch(e){dec='ERR '+e.message;}
   H.ok(dec===srv.base+'/index.html#k='+KEY,'QR çözülüyor ve adres + anahtarı içeriyor ('+dec.slice(0,40)+'…)');
   await p.screenshot({path:path.join(H.SHOTS,'keyxfer_settings_1280.png')});
   await p.click('#btnKx');H.ok(await p.isHidden('#kxBox')&&(await p.textContent('#btnKx')).trim()==='Başka cihaza aktar (QR)','ikinci basış QR kapatır, etiket geri gelir');
   /* 90 sn sonra kendiliğinden kapanır */
   await p.click('#btnKx');await p.evaluate(()=>{});await H.sleep(100);
   const left=await p.textContent('#kxLeft');H.ok(/90 sn/.test(left)||/89 sn/.test(left),'geri sayım görünür');
   await ctx.close();}
  /* 2) Anahtar yokken satır gizli */
  {const ctx=await b.newContext({viewport:{width:375,height:800}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
   await p.goto(srv.base+'/index.html');await H.tab(p,'setup');await H.sleep(200);
   H.ok(await p.isHidden('#kxRow'),'anahtar yokken QR satırı gizli');await ctx.close();}
  /* 3) Telefon: #k= ile açılış → kayıt, adres temiz, bildirim → Bağlandı */
  {const ctx=await b.newContext({viewport:{width:375,height:800},isMobile:true,hasTouch:true});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
   await H.mockApi(p,{},okHandler);
   await p.goto(srv.base+'/index.html#k='+KEY);await H.sleep(600);
   const st=await p.evaluate(()=>({k:localStorage.getItem('tydil.apiKey'),h:location.hash,u:location.href}));
   H.ok(st.k===KEY,'telefonda anahtar kaydedildi');
   H.ok(st.h===''&&!/sk-ant/.test(st.u),'adres çubuğundan anahtar temizlendi');
   const t=await p.textContent('#kxToast');H.ok(/Bağlandı/.test(t),'bildirim: Bağlandı ('+t.trim().slice(0,40)+')');
   await p.screenshot({path:path.join(H.SHOTS,'keyxfer_phone_375.png')});
   await H.tab(p,'setup');await H.sleep(200);
   H.ok(/Bağlı/.test(await p.textContent('#keyState')),'Ayarlar: Bağlı');
   await ctx.close();}
  /* 4) Hatalı kod → hata bildirimi, anahtar yok */
  {const ctx=await b.newContext({viewport:{width:375,height:800}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
   await p.goto(srv.base+'/index.html#k=bozuk');await H.sleep(400);
   const st=await p.evaluate(()=>({k:localStorage.getItem('tydil.apiKey'),h:location.hash}));
   H.ok(!st.k&&st.h==='','hatalı kod: anahtar kaydedilmez, adres temizlenir');
   H.ok(/okunamadı/.test(await p.textContent('#kxToast')),'hatalı kod: hata bildirimi');
   await ctx.close();}
  /* 5) Doğrulama başarısız (401) → hata bildirimi */
  {const ctx=await b.newContext({viewport:{width:375,height:800}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
   await H.mockApi(p,{},async()=>({status:401,body:JSON.stringify({error:{type:'authentication_error',message:'invalid x-api-key'}})}));
   await p.goto(srv.base+'/index.html#k='+KEY);await H.sleep(600);
   H.ok(/doğrulanamadı/.test(await p.textContent('#kxToast')),'401: doğrulanamadı bildirimi');await ctx.close();}
  /* 6) Normal rota adresleri (#dersler/…) etkilenmez */
  {const ctx=await b.newContext({viewport:{width:375,height:800}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
   await p.goto(srv.base+'/index.html#dersler/it');await H.sleep(400);
   H.ok(/#dersler\/it/.test(await p.evaluate(()=>location.hash)),'#dersler rotası korunur');
   H.ok(await p.isHidden('#kxToast').catch(()=>true),'rota adresinde bildirim yok');await ctx.close();}
 }catch(e){errs.push('TEST: '+e.message);}
 console.log('errors',JSON.stringify(errs));H.ok(!errs.length,'no page errors');
 await b.close();srv.close();
 const f=H.fails();console.log(f?'FAILED '+f:'ALL PASS');process.exit(f?1:0);})();
