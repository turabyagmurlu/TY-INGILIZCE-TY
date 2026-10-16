/* Cihazlar arası senkron (GitHub Gist): taklit api.github.com (bellekte gist deposu: liste/sayfalama, oluştur, oku, güncelle, truncated+raw_url, 401/403/422, çevrimdışı).
   Senaryo: PC (eski, meta'sız kayıtlar) bağlanır → tablet (kazara kurulum yapmış) aynı Gist'i bulur → QR (k+s+g) ile telefon tek okutmada anahtar + senkron + ilerleme
   → canlı yenileme, eşzamanlı düzenleme, silme, program koruması/tarih değişikliği, Dersler (dilOgren_v4), güvenlik, hatalar, gizlenince gönderim, bağlantıyı kesme.
   NODE_PATH=$(npm root -g) node tests/sync_test.js */
const H=require('./_h.js');const {ok,sleep}=H;const fs=require('fs');const path=require('path');const {execFileSync}=require('child_process');
const KEY='sk-ant-api03-'+'Ab9_-'.repeat(19)+'XyZ0';
const TOKEN='github_pat_11ABCDEFG0'+'aZ09_'.repeat(16)+'Qw';
const DESC='TY Dil senkron · otomatik, silme', FILE='tydil-sync.json';
/* Gerçek saat (cihazlar aynı saati paylaşır; sahte saat her sayfada farklı kayardı): tarihler bugüne göre */
const D=n=>{const t=new Date(Date.now()+n*864e5);return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(t);};
const D0=D(0),D1=D(1),M1=D(-1),M2=D(-2),M3=D(-3),M7=D(-7);
const SHOTS7=path.join(H.ROOT,'review','shots_v7');fs.mkdirSync(SHOTS7,{recursive:true});fs.mkdirSync(H.SHOTS,{recursive:true});
const okHandler=async()=>({status:200,body:JSON.stringify({id:'m',type:'message',role:'assistant',model:'claude-sonnet-5-5',content:[{type:'text',text:'OK'}],stop_reason:'end_turn'})});
/* ---- taklit GitHub ---- */
const G={gists:[],reqs:[],raw:0,truncAt:Infinity,force:null,seq:0};
for(let i=0;i<120;i++)G.gists.push({id:'d'+String(i).padStart(31,'0'),description:'başka gist '+i,public:true,files:{'a.txt':{content:'x'}}});
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
const J=(route,status,obj)=>route.fulfill({status,headers:Object.assign({'content-type':'application/json'},CORS),body:JSON.stringify(obj)});
const fileView=(g,full)=>{const o={};Object.entries(g.files).forEach(([n,f])=>{const c=f.content||'';const tr=!full&&c.length>G.truncAt;o[n]={filename:n,size:c.length,truncated:tr,content:tr?c.slice(0,G.truncAt):c,raw_url:'https://gist.githubusercontent.com/u/'+g.id+'/raw/'+n};});return o;};
async function mockGh(page){
  await page.route('https://api.github.com/**',async route=>{const r=route.request();const u=new URL(r.url());const m=r.method();
    if(m==='OPTIONS')return route.fulfill({status:204,headers:CORS});
    const h=r.headers();const body=r.postData()||'';G.reqs.push({m,path:u.pathname+u.search,body,auth:h.authorization||'',acc:h.accept,ver:h['x-github-api-version'],keepalive:false});
    if(h.authorization!=='Bearer '+TOKEN)return J(route,401,{message:'Bad credentials'});
    if(G.force){const f=G.force;if(!f.method||f.method===m){if(f.once)G.force=null;return J(route,f.status,{message:'taklit '+f.status});}}
    if(m==='GET'&&u.pathname==='/gists'){const per=+u.searchParams.get('per_page')||30, page=+u.searchParams.get('page')||1;
      return J(route,200,G.gists.slice((page-1)*per,page*per).map(g=>({id:g.id,description:g.description,public:g.public,files:Object.fromEntries(Object.keys(g.files).map(n=>[n,{filename:n,raw_url:'x'}]))})));}
    if(m==='POST'&&u.pathname==='/gists'){const b=JSON.parse(body);const id=(++G.seq).toString(16).padStart(32,'a');const g={id,description:b.description,public:b.public,files:{}};
      Object.entries(b.files).forEach(([n,f])=>g.files[n]={content:f.content});G.gists.push(g);return J(route,201,{id,description:g.description,public:g.public,files:fileView(g)});}
    const mm=/^\/gists\/([0-9a-f]+)$/.exec(u.pathname);const g=mm&&G.gists.find(x=>x.id===mm[1]);
    if(!g)return J(route,404,{message:'Not Found'});
    if(m==='GET')return J(route,200,{id:g.id,description:g.description,public:g.public,files:fileView(g)});
    if(m==='PATCH'){const b=JSON.parse(body);Object.entries(b.files).forEach(([n,f])=>g.files[n]={content:f.content});return J(route,200,{id:g.id,files:fileView(g)});}
    return J(route,405,{message:'?'});});
  await page.route('https://gist.githubusercontent.com/**',async route=>{G.raw++;const u=new URL(route.request().url());const id=u.pathname.split('/')[2];const g=G.gists.find(x=>x.id===id);
    if(!g)return route.fulfill({status:404,headers:CORS,body:'nf'});return route.fulfill({status:200,headers:Object.assign({'content-type':'text/plain'},CORS),body:g.files[FILE].content});});}
const ours=()=>G.gists.filter(g=>g.description===DESC);
const remote=()=>JSON.parse(ours()[0].files[FILE].content);
(async()=>{const srv=await H.serve();const b=await H.browser();const errs=[];const ctxs=[];
 const dev=async(name,o)=>{o=o||{};const ctx=await b.newContext(Object.assign({viewport:o.vp||{width:375,height:812},timezoneId:'Europe/Istanbul',colorScheme:'light'},o.ctx||{}));ctxs.push(ctx);
   const p=await ctx.newPage();p.on('pageerror',x=>errs.push(name+' pageerror '+x.message));p.on('dialog',d=>{errs.push(name+' DIALOG');d.dismiss();});
   p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|ERR_/.test(m.text()))errs.push(name+' console '+m.text());});
   if(o.init)await p.addInitScript(o.init[0],o.init[1]);
   await H.mockApi(p,{},okHandler);await mockGh(p);
   await p.goto(srv.base+'/index.html'+(o.hash||''));await sleep(500);return {ctx,p};};
 const run=async p=>{await p.waitForFunction(()=>window.TYSYNC&&!TYSYNC.busy,null,{timeout:8000});let r=await p.evaluate(()=>TYSYNC.run());
   if(!r){await p.waitForFunction(()=>!TYSYNC.busy,null,{timeout:8000});r=await p.evaluate(()=>TYSYNC.run());}return r;};
 const dbDo=(p,fn,arg)=>p.evaluate(async([src,arg])=>{const db=await claude.use('db');return (new Function('db','arg','return ('+src+')(db,arg)'))(db,arg);},[fn.toString(),arg]);
 const coll=(p,c)=>p.evaluate(c=>rtExport().collections[c]||{},c);
 const status=p=>p.textContent('#syncStatus');
 const setup=async p=>{await H.tab(p,'setup');await sleep(200);};
 try{
  /* ===== A) PC: eski (meta'sız) kayıtlar + Dersler verisi → token ile bağlan → gizli Gist oluşur ===== */
  const legacyDb={format:1,collections:{program:{main:{start:M3,weeks:12,dailyMin:60,mode:'yogun',created:M3+'T05:00:00.000Z'}},
    sessions:{s1:{date:D0,lang:'it',agent:'it',mins:{kelime:10,gramer:20},total:30,mistakes:[],note:'',next:'',created:D0+'T03:00:00.000Z'}}}};
  const pcUnits={lang:'it',langStore:{it:{completedLessons:['it-a1-1'],wordsLearned:12},en:{}},completedLessons:['it-a1-1'],wordsLearned:12,studyDates:[M7],streak:0,settings:{fontScale:1,rate:0.85,voiceURI:null,hwLang:'tr'}};
  const PC=await dev('pc',{vp:{width:1280,height:900},init:[([k,d,u])=>{if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('tydil.apiKey',k);localStorage.setItem('tydil.db',d);localStorage.setItem('dilOgren_v4',u);}},[KEY,JSON.stringify(legacyDb),JSON.stringify(pcUnits)]]});
  const pc=PC.p;
  await setup(pc);
  ok(await pc.isVisible('#syncCard')&&/Cihazlar arası senkron/.test(await pc.textContent('#syncTitle')),'Ayarlar: "Cihazlar arası senkron" kartı');
  ok(await pc.evaluate(()=>{const c=document.querySelector('#syncCard'),k=document.querySelector('#keyCard');return k.nextElementSibling===c;}),'kart Claude bağlantısının hemen altında');
  ok(await pc.evaluate(()=>{const i=document.querySelector('#syncToken');return i.type==='password'&&i.autocomplete==='off';}),'token alanı: password, autocomplete off');
  ok(/Kapalı/.test(await pc.textContent('#syncState'))&&await pc.isHidden('#syncOn'),'bağlı değilken: Kapalı, durum satırı gizli');
  await pc.fill('#syncToken','ghp_kısa');await pc.click('#btnSyncConnect');
  ok(/github_pat_/.test(await pc.textContent('#syncMsg'))&&G.reqs.length===0,'yanlış biçimli token: Türkçe uyarı, istek yok');
  await pc.fill('#syncToken',TOKEN);await pc.click('#btnSyncConnect');
  await pc.waitForFunction(()=>/Son senkron/.test((document.querySelector('#syncStatus')||{}).textContent||''),null,{timeout:8000}).catch(()=>{});
  ok(/Son senkron: az önce ✓/.test(await status(pc)),'PC bağlandı: "Son senkron: az önce ✓" ('+(await status(pc)).slice(0,40)+')');
  ok(/Bağlandı ✓/.test(await pc.textContent('#syncMsg')),'PC: Bağlandı mesajı');
  ok(ours().length===1&&ours()[0].public===false,'gizli Gist oluşturuldu (tek, public:false, açıklama birebir)');
  const lists=G.reqs.filter(r=>r.m==='GET'&&r.path.startsWith('/gists?'));
  ok(lists.length===2&&/per_page=100/.test(lists[0].path)&&/page=2/.test(lists[1].path),'Gist araması sayfalı (per_page=100, 2 sayfa)');
  ok(G.reqs.every(r=>r.acc==='application/vnd.github+json'&&r.ver==='2022-11-28'&&r.auth==='Bearer '+TOKEN),'başlıklar: Bearer, vnd.github+json, 2022-11-28');
  ok(await pc.evaluate(t=>localStorage.getItem('tydil.sync.token')===t&&/^[0-9a-f]+$/.test(localStorage.getItem('tydil.sync.gist')),TOKEN),'token + gist kimliği yerelde');
  let R=remote();
  ok(R.format===1&&R.docs['sessions/s1']&&R.docs['sessions/s1'].ts===0&&R.docs['program/main'].data.start===M3,'Gist: meta\'sız eski belgeler ts=0 ile yüklendi');
  ok(R.ls&&R.ls.dilOgren_v4&&JSON.parse(R.ls.dilOgren_v4.v).studyDates.includes(M7),'Gist: Dersler (dilOgren_v4) yükte');
  const gistId=ours()[0].id;

  /* ===== B) Tablet: kazara kurulum (yeni program) + kendi kartı → aynı token → aynı Gist, birleşim, PC başlangıcı korunur ===== */
  const TB=await dev('tablet',{vp:{width:768,height:1024}});const tb=TB.p;
  await dbDo(tb,async(db,a)=>{await db.collection('program').doc('main').set({start:a[0],weeks:12,dailyMin:60,mode:'yogun',created:new Date().toISOString()});
    await db.collection('cards').doc('c_tab').set({lang:'it',f:'la casa',tr:'ev',box:1,due:a[1],added:new Date().toISOString()});},[D0,D1]);
  const posts0=G.reqs.filter(r=>r.m==='POST').length;
  await setup(tb);await tb.fill('#syncToken',TOKEN);await tb.click('#btnSyncConnect');
  await tb.waitForFunction(()=>/Son senkron/.test((document.querySelector('#syncStatus')||{}).textContent||''),null,{timeout:8000}).catch(()=>{});
  ok(G.reqs.filter(r=>r.m==='POST').length===posts0&&ours().length===1&&await tb.evaluate(()=>localStorage.getItem('tydil.sync.gist'))===gistId,'ikinci cihaz aynı Gist\'i buldu (yeni Gist yok)');
  ok((await coll(tb,'program')).main.start===M3,'program/main koruması: tabletteki kazara başlangıç PC\'nin tarihini ezmedi');
  ok(!!(await coll(tb,'sessions')).s1,'tablet: PC oturumu geldi');
  ok(!!remote().docs['cards/c_tab']&&remote().docs['program/main'].data.start===M3,'Gist: tabletin kartı eklendi (birleşim, silme yok), program PC\'nin');
  ok(await tb.evaluate(d=>window.TYDIL.units.state.studyDates.includes(d),M7),'tablet: Dersler ilerlemesi (dilOgren_v4) indi');
  await run(pc);
  ok(!!(await coll(pc,'cards')).c_tab&&(await coll(pc,'program')).main.start===M3,'PC: tabletin kartı geldi, program aynı');

  /* ===== C) PC: QR = adres + #k=anahtar&s=token&g=gist ===== */
  await setup(pc);
  ok(/Başka cihaza aktar \(QR\)/.test(await pc.textContent('#btnKx'))&&/aynı QR'ı her cihazla okut/.test(await pc.textContent('#kxRow')),'QR düğmesi: "Başka cihaza aktar (QR)" + ipucu');
  await pc.click('#btnKx');await sleep(250);
  const qshot=path.join(H.SHOTS,'sync_qr_1280.png');await (await pc.$('#kxBox svg.kxQr')).screenshot({path:qshot});
  await pc.setViewportSize({width:1280,height:1800});await pc.evaluate(()=>scrollTo(0,0));await sleep(100);await (await pc.$('#keyCard')).screenshot({path:path.join(SHOTS7,'qr_with_sync_1280.png')});await pc.setViewportSize({width:1280,height:900});
  let dec='';try{dec=execFileSync('python3',['-c','import cv2,sys;i=cv2.imread(sys.argv[1]);i=cv2.copyMakeBorder(i,40,40,40,40,cv2.BORDER_CONSTANT,value=(255,255,255));print(cv2.QRCodeDetector().detectAndDecode(i)[0])',qshot]).toString().trim();}catch(e){dec='ERR '+e.message;}
  const want=srv.base+'/index.html#k='+KEY+'&s='+TOKEN+'&g='+gistId;
  ok(dec===want,'QR çözülüyor: anahtar + token + gist ('+dec.length+' karakter)');
  ok(/senkron bağlanır/.test(await pc.textContent('#kxBox')),'QR açıklaması senkronu söylüyor');
  await pc.click('#btnKx');

  /* ===== D) Telefon: QR adresiyle ilk açılış → anahtar + senkron + ilerleme ===== */
  const PH=await dev('phone',{ctx:{isMobile:true,hasTouch:true},hash:dec.slice(dec.indexOf('#'))});const ph=PH.p;
  const st=await ph.evaluate(()=>({k:localStorage.getItem('tydil.apiKey'),t:localStorage.getItem('tydil.sync.token'),g:localStorage.getItem('tydil.sync.gist'),h:location.hash,u:location.href}));
  ok(st.k===KEY&&st.t===TOKEN&&st.g===gistId,'telefon: anahtar, token, gist kaydedildi');
  ok(st.h===''&&!/sk-ant|github_pat/.test(st.u),'telefon: adres hemen temizlendi');
  await ph.waitForFunction(()=>/İlerleme indirildi/.test((document.querySelector('#kxToast')||{}).textContent||''),null,{timeout:8000}).catch(()=>{});
  ok(/İlerleme indirildi ✓/.test(await ph.textContent('#kxToast').catch(()=>'')),'telefon bildirimi: İlerleme indirildi ✓ ('+(await ph.textContent('#kxToast').catch(()=>'')).trim().slice(0,60)+')');
  await ph.waitForFunction(()=>/30/.test((document.querySelector('#meter')||{}).textContent||''),null,{timeout:5000}).catch(()=>{});
  ok(/30\s*\/\s*60 dk/.test(await ph.textContent('#meter')),'telefon Öğren: PC\'nin 30 dk\'sı görünüyor ('+(await ph.textContent('#meter')).trim().slice(0,30)+')');
  ok(await ph.isHidden('#onb'),'telefon: program geldi, kurulum ekranı yok');
  await setup(ph);
  ok(/Açık/.test(await ph.textContent('#syncState'))&&/Son senkron/.test(await status(ph)),'telefon Ayarlar: senkron Açık + son senkron');
  await ph.setViewportSize({width:375,height:2600});await ph.evaluate(()=>scrollTo(0,0));await sleep(100);await (await ph.$('#syncCard')).screenshot({path:path.join(SHOTS7,'settings_sync_375_light.png')});await ph.setViewportSize({width:375,height:812});
  ok(await ph.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'375: yatay kaydırma yok');

  /* ===== E) Canlı yenileme: PC yeni oturum → telefon senkron → sayfa yenilenmeden ekran güncellenir ===== */
  await ph.click('[data-tab="learn"]');await ph.evaluate(()=>{window.__mark=1;});
  await dbDo(pc,async(db,d)=>{await db.collection('sessions').doc('s2').set({date:d,lang:'en',agent:'en',mins:{speaking:15},total:15,mistakes:[],created:new Date().toISOString()});},D0);
  await run(pc);await run(ph);
  await ph.waitForFunction(()=>/45/.test((document.querySelector('#meter')||{}).textContent||''),null,{timeout:4000}).catch(()=>{});
  ok(/45\s*\/\s*60 dk/.test(await ph.textContent('#meter'))&&await ph.evaluate(()=>window.__mark===1),'onSnapshot: telefon 45 dk gösteriyor, sayfa yenilenmedi');

  /* ===== F) Eşzamanlı düzenleme: belge başına son yazan kazanır, farklı belgeler birleşir ===== */
  await dbDo(pc,async db=>{await db.collection('topics').doc('it01').set({status:'doing',updated:'pc'});await db.collection('cards').add({lang:'it',f:'il pane',tr:'ekmek',box:1,due:'x'});});
  await sleep(30);
  await dbDo(ph,async db=>{await db.collection('topics').doc('it01').set({status:'done',updated:'ph'});await db.collection('cards').add({lang:'it',f:'il vino',tr:'şarap',box:1,due:'x'});});
  await run(pc);await run(ph);await run(pc);
  const tPc=(await coll(pc,'topics')).it01, tPh=(await coll(ph,'topics')).it01;
  ok(tPc.status==='done'&&tPh.status==='done','aynı belge: sonra yazan (telefon) iki cihazda da kazandı');
  const words=c=>Object.values(c).map(x=>x.f).sort().join(',');
  ok(words(await coll(pc,'cards'))===words(await coll(ph,'cards'))&&/il pane/.test(words(await coll(pc,'cards')))&&/il vino/.test(words(await coll(pc,'cards'))),'farklı belgeler birleşti ('+words(await coll(pc,'cards'))+')');

  /* ===== G) Silme mezar taşıyla yayılır ===== */
  await dbDo(ph,async db=>{await db.collection('cards').doc('c_tab').delete();});
  await run(ph);ok(remote().docs['cards/c_tab']&&remote().docs['cards/c_tab'].del===true&&!remote().docs['cards/c_tab'].data,'Gist: silinen kart mezar taşı');
  await run(pc);ok(!(await coll(pc,'cards')).c_tab,'PC: silme yayıldı');
  await run(tb);ok(!(await coll(tb,'cards')).c_tab,'tablet: silme yayıldı');

  /* ===== H) Program tarihini bilerek değiştirme (resetAt) diğer cihazlara geçer ===== */
  await setup(ph);await ph.fill('#progNewStart',M2);await ph.click('#btnProgDate');await ph.click('#btnCfYes');await sleep(200);
  const phProg=(await coll(ph,'program')).main;
  ok(phProg.start===M2&&!!phProg.resetAt,'tarih değişikliği resetAt yazar');
  await run(ph);await run(pc);
  ok((await coll(pc,'program')).main.start===M2,'PC: bilerek değiştirilen başlangıç geldi (resetAt > created)');

  /* ===== I) Dersler (dilOgren_v4) değişikliği yayılır ===== */
  await pc.evaluate(d=>{TYDIL.units.state.studyDates.push(d);TYDIL.units.save();},D0);
  await run(pc);await run(ph);
  ok(await ph.evaluate(d=>{const s=JSON.parse(localStorage.getItem('dilOgren_v4'));return s.studyDates.includes(d)&&TYDIL.units.state.studyDates.includes(d);},D0),'telefon: Dersler değişikliği geldi (depo + çalışan durum)');

  /* ===== J) Büyük dosya: truncated → raw_url ===== */
  G.truncAt=300;const raw0=G.raw;await run(tb);
  ok(G.raw>raw0&&(await coll(tb,'topics')).it01.status==='done'&&(await coll(tb,'program')).main.start===M2,'truncated dosya raw_url\'den tamamen okundu');
  G.truncAt=Infinity;

  /* ===== K) Güvenlik: anahtar ve token hiçbir yükte / yedekte yok ===== */
  const bodies=G.reqs.filter(r=>r.m==='POST'||r.m==='PATCH').map(r=>r.body).join('\n');
  ok(bodies.length>0&&!bodies.includes(KEY)&&!bodies.includes(TOKEN)&&!/sk-ant-|github_pat_/.test(bodies),'Gist yüklerinde anahtar/token yok');
  ok(Object.keys(remote().ls).every(k=>['tydil-mode-last','tydil.settings','dilOgren_v4'].includes(k)),'ls yalnızca izinli anahtarlar: '+Object.keys(remote().ls).join(','));
  const ex=await ph.evaluate(()=>JSON.stringify(rtExport()));
  ok(!ex.includes(KEY)&&!ex.includes(TOKEN)&&!/tydil\.sync/.test(ex),'rtExport (yedek): anahtar/token/senkron bilgisi yok');

  /* ===== L) Hatalar Türkçe ===== */
  await setup(tb);
  G.force={status:401};await run(tb);ok(/Token geçersiz ya da süresi dolmuş/.test(await status(tb)),'401 → '+(await status(tb)).slice(0,50));
  G.force={status:403};await run(tb);ok(/İzin yok: .*Gists → Read and write/.test(await status(tb)),'403 → '+(await status(tb)).slice(0,60));
  G.force={status:404};await run(tb);ok(/İzin yok/.test(await status(tb)),'404 → izin yok');
  G.force={status:422,method:'PATCH'};await dbDo(tb,async(db,d)=>{await db.collection('habits').doc(d).set({dinleme:true});},D0);await run(tb);ok(/422/.test(await status(tb)),'422 → '+(await status(tb)).slice(0,50));
  G.force=null;
  await TB.ctx.setOffline(true);await run(tb);ok(/İnternet yok; sonra denenecek/.test(await status(tb)),'çevrimdışı → İnternet yok; sonra denenecek');
  await TB.ctx.setOffline(false);await sleep(300);await run(tb);ok(/Son senkron/.test(await status(tb))&&!!remote().docs['habits/'+D0],'tekrar çevrimiçi: senkron, bekleyen yazım gitti');
  ok(/Kapalı|Açık/.test(await tb.textContent('#syncState')),'durum rozeti');

  /* ===== M) Gizlenince (visibilitychange → hidden) bekleyen yazım gönderilir ===== */
  const patches=()=>G.reqs.filter(r=>r.m==='PATCH').length;const p0=patches();
  await dbDo(pc,async(db,d)=>{await db.collection('habits').doc(d).set({dinleme:true});},M1);
  await pc.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
  await sleep(1200);ok(patches()>p0&&!!remote().docs['habits/'+M1],'gizlenince bekleyen yazım Gist\'e gitti');
  await pc.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});});

  /* ===== N) Bağlantıyı kes: iki adımlı, yerel veri kalır, Gist silinmez ===== */
  await setup(ph);await ph.click('#btnSyncOff');
  ok(/Tekrar bas/.test(await ph.textContent('#btnSyncOff'))&&await ph.evaluate(()=>!!localStorage.getItem('tydil.sync.token')),'ilk basış: onay ister, bağlantı duruyor');
  await ph.click('#btnSyncOff');
  ok(await ph.isVisible('#syncOff')&&await ph.evaluate(()=>!localStorage.getItem('tydil.sync.token')&&!localStorage.getItem('tydil.sync.gist')),'ikinci basış: token + gist yerelden silindi');
  ok(Object.keys(await coll(ph,'sessions')).length===2&&ours().length===1,'yerel kayıtlar duruyor, Gist silinmedi');
  ok(await ph.evaluate(()=>!!localStorage.getItem('tydil.apiKey')),'Claude anahtarı etkilenmedi');
  /* QR yalnızca anahtar (senkron kapalı) */
  await ph.click('#btnKx');await sleep(200);
  ok(await ph.evaluate(()=>!document.querySelector('#kxBox').textContent.includes('senkron bağlanır')),'senkron kapalı: QR yalnızca anahtar');

  /* ===== O) Token nasıl alınır? (375) ===== */
  const FR=await dev('fresh');const fr=FR.p;await setup(fr);
  await fr.click('#syncHow summary');await sleep(150);
  const how=await fr.textContent('#syncHow');
  ok(['Developer settings','Personal access tokens','Fine-grained tokens','Generate new token','TY Dil','en uzun','Public repositories','Account permissions','Gists','Read and write'].every(s=>how.includes(s)),'Token adımları eksiksiz');
  const a=await fr.$eval('.syncLink',e=>({h:e.href,t:e.target,r:e.rel}));
  ok(a.h==='https://github.com/settings/personal-access-tokens/new'&&a.t==='_blank'&&/noopener/.test(a.r),'doğrudan bağlantı: yeni sekme, noopener');
  await fr.setViewportSize({width:375,height:2600});await fr.evaluate(()=>scrollTo(0,0));await sleep(100);await (await fr.$('#syncCard')).screenshot({path:path.join(SHOTS7,'settings_sync_howto_375.png')});await fr.setViewportSize({width:375,height:812});
  ok(await fr.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'375 (adımlar açık): yatay kaydırma yok');
  /* yanlış token → 401 bağlanırken */
  await fr.fill('#syncToken','github_pat_'+'x'.repeat(60));await fr.click('#btnSyncConnect');await sleep(500);
  ok(/Token geçersiz/.test(await fr.textContent('#syncMsg'))&&await fr.evaluate(()=>!localStorage.getItem('tydil.sync.token')),'bağlanırken 401: Türkçe hata, token kaydedilmez');
  /* ===== P) Birleştirme kuralları (doğrudan TYRT.sync.merge) ===== */
  const mr=await fr.evaluate(async d=>{const db=await claude.use('db');
    await db.collection('days').doc(d).set({fin:['en-speaking'],mode:'en',modeAt:5});
    await db.collection('program').doc('main').set({start:'2026-01-10',created:'2026-01-10T00:00:00.000Z'});
    const old=Date.now()-61*864e5, big=Date.now()+1e6;
    const remote={format:1,docs:{
      ['days/'+d]:{ts:big,dev:'zz',data:{fin:['it-kelime'],mode:'both',modeAt:9}},
      'program/main':{ts:big,dev:'zz',data:{start:'2026-01-12',created:'2026-01-12T00:00:00.000Z'}},
      'cards/eski':{ts:old,dev:'zz',del:true},
      'cards/yeni':{ts:big,dev:'zz',data:{f:'x'}}},ls:{}};
    const r=await TYRT.sync.merge(remote);const ex=rtExport().collections;
    return {fin:ex.days[d].fin.slice().sort().join(','),mode:ex.days[d].mode,dts:r.payload.docs['days/'+d].ts>big,prog:ex.program.main.start,
      oldTomb:!('cards/eski' in r.payload.docs),yeni:!!ex.cards.yeni,differs:r.differs};},D0);
  ok(mr.fin==='en-speaking,it-kelime'&&mr.mode==='both'&&mr.dts,'days: fin birleşimi, mod modeAt\'ı büyükten, ts=max+1');
  ok(mr.prog==='2026-01-10','program/main: start farklı → created\'ı eski olan kazanır (uzaktaki ts daha yeni olsa da)');
  ok(mr.oldTomb&&mr.yeni&&mr.differs,'60 günden eski mezar taşı atılır; yeni belge uygulanır; fark varsa yüklenir');
 }catch(e){errs.push('TEST: '+(e&&e.stack||e));}
 console.log('errors',JSON.stringify(errs));ok(!errs.length,'no page errors');
 for(const c of ctxs){try{await c.close();}catch(e){}}await b.close();srv.close();
 const f=H.fails();console.log(f?'FAILED '+f:'ALL PASS');process.exit(f?1:0);})();
