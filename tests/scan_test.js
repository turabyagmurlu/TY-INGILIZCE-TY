/* Uygulama içi QR okuyucu: sahte kamera (y4m) ile bilgisayardaki aktarım QR'ı okunur → anahtar bu uygulamaya kaydedilir.
   iPhone/iPad ana ekran uygulaması senaryosu (Safari'den ayrı depolama) için. */
const H=require('./_h.js');const path=require('path');const os=require('os');const fs=require('fs');const {execFileSync}=require('child_process');const {chromium}=require('playwright');
const KEY='sk-ant-api03-'+'Ab9_-'.repeat(19)+'XyZ0';
const okHandler=async()=>({status:200,body:JSON.stringify({id:'m',type:'message',role:'assistant',model:'claude-sonnet-5-5',content:[{type:'text',text:'OK'}],stop_reason:'end_turn'})});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tyscan-'));
function vid(text,name){const f=path.join(tmp,name);execFileSync('python3',[path.join(__dirname,'mk_qr_y4m.py'),text,f]);return f;}
async function launch(file){return chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+file]});}
(async()=>{const srv=await H.serve();const errs=[];
 try{
  /* 1) Anahtar yok → Öğren'de "Başla" sonrası kapı: QR okut → kamera → anahtar kaydedilir, Bağlandı */
  {const b=await launch(vid('https://turabyagmurlu.github.io/TY-INGILIZCE-TY/#k='+KEY,'k.y4m'));
   const ctx=await b.newContext({viewport:{width:820,height:1180},permissions:['camera']});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
   await H.mockApi(p,{},okHandler);await p.goto(srv.base+'/index.html');await H.sleep(300);
   await p.click('[data-tab="practice"]');await H.sleep(300);
   H.ok(await p.isVisible('#tab-practice [data-go="scan"]'),'Pratik kilit kartında "QR okut" düğmesi');
   await p.screenshot({path:path.join(H.SHOTS,'scan_gate_ipad.png')});
   await p.click('#tab-practice [data-go="scan"]');
   H.ok(await p.isVisible('#kxScan'),'kamera ekranı açıldı');
   await p.waitForFunction(()=>!document.querySelector('#kxScan'),null,{timeout:15000}).catch(()=>{});
   const k=await p.evaluate(()=>localStorage.getItem('tydil.apiKey'));H.ok(k===KEY,'QR okundu, anahtar BU uygulamaya kaydedildi');
   await H.sleep(500);const t=await p.textContent('#kxToast').catch(()=>'');H.ok(/Bağlandı/.test(t),'bildirim: Bağlandı ('+t.trim().slice(0,30)+')');
   await p.click('[data-tab="practice"]');await H.sleep(300);
   H.ok(await p.isHidden('#tab-practice [data-go="scan"]').catch(()=>true),'kilit kartı kalktı');
   await ctx.close();await b.close();}
  /* 2) Ayarlar'daki "QR okut (kamera)" + yabancı QR uyarısı + İptal */
  {const b=await launch(vid('https://example.com/baska-bir-qr','x.y4m'));
   const ctx=await b.newContext({viewport:{width:375,height:800},permissions:['camera']});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
   await p.goto(srv.base+'/index.html');await p.click('[data-tab="setup"]');await H.sleep(200);
   H.ok(await p.isVisible('#btnScan'),'Ayarlar: "QR okut (kamera)" görünür');
   await p.click('#btnScan');await p.waitForFunction(()=>/TY Dil QR/.test((document.querySelector('#kxScanMsg')||{}).textContent||''),null,{timeout:12000}).catch(()=>{});
   H.ok(/TY Dil QR/.test(await p.textContent('#kxScanMsg')),'yabancı QR: "Bu TY Dil QR\'ı değil" uyarısı');
   await p.screenshot({path:path.join(H.SHOTS,'scan_overlay_375.png')});
   await p.click('#kxScanX');H.ok(!(await p.$('#kxScan')),'İptal kamerayı kapatır');
   H.ok(!(await p.evaluate(()=>localStorage.getItem('tydil.apiKey'))),'yabancı QR anahtar yazmaz');
   await ctx.close();await b.close();}
  /* 3) Kamera izni yok → Türkçe hata, çökme yok */
  {const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:375,height:800}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
   await p.addInitScript(()=>{if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>Promise.reject(Object.assign(new Error('x'),{name:'NotAllowedError'}));});
   await p.goto(srv.base+'/index.html');await p.click('[data-tab="setup"]');await p.click('#btnScan');await H.sleep(800);
   H.ok(/izni verilmedi/.test(await p.textContent('#kxScanMsg')),'izin yok: Türkçe açıklama');await ctx.close();await b.close();}
  /* 4) Kamera API'si olmayan tarayıcı → QR okut gizli, Anahtarı gir kalır */
  {const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:375,height:800}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
   await p.addInitScript(()=>{try{Object.defineProperty(navigator,'mediaDevices',{value:undefined});}catch(e){}});
   await p.goto(srv.base+'/index.html');await p.click('[data-tab="setup"]');await H.sleep(200);
   H.ok(await p.isHidden('#scanRow'),'kamera yoksa Ayarlar\'da QR okut gizli');
   await p.click('[data-tab="practice"]');await H.sleep(200);
   H.ok(await p.isVisible('#tab-practice [data-go="key"]')&&await p.isHidden('#tab-practice [data-go="scan"]').catch(()=>true),'kamera yoksa yalnız "Anahtarı gir"');
   await ctx.close();await b.close();}
 }catch(e){errs.push('TEST: '+e.message);}
 console.log('errors',JSON.stringify(errs));H.ok(!errs.length,'no page errors');
 srv.close();const f=H.fails();console.log(f?'FAILED '+f:'ALL PASS');process.exit(f?1:0);})();
