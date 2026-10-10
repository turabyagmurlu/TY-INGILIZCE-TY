function parseSummary(raw){
  const i=raw.indexOf("TYDIL"); const src=i>=0?raw.slice(i+5):raw; const a=src.indexOf("{"), b=src.lastIndexOf("}");
  if(a<0||b<=a) throw new Error("Kodda { … } bulunamadı. Claude'un verdiği TYDIL kodunun tamamını yapıştır.");
  let j; try{ j=JSON.parse(src.slice(a,b+1)); }catch(e){ throw new Error("Kod okunamadı (JSON hatası). Kodu baştan sona eksiksiz kopyaladığından emin ol."); }
  const date=/^\d{4}-\d{2}-\d{2}$/.test(j.tarih||"")?j.tarih:today();
  const list=Array.isArray(j.oturumlar)?j.oturumlar:[j];
  const out=list.map(o=>{const lang=o.dil==="en"?"en":(o.dil==="it"?"it":null); if(!lang) throw new Error("Her oturumda \"dil\" alanı \"it\" ya da \"en\" olmalı.");
    const dk=o.dk&&typeof o.dk==="object"?o.dk:{}; const mins={}; let total=0; MIN_KEYS.forEach(k=>{const v=Math.max(0,Math.min(240,+dk[k]||0));mins[k]=v;total+=v;});
    const words=(Array.isArray(o.kelimeler)?o.kelimeler:[]).filter(w=>w&&w.f&&w.tr).slice(0,60).map(w=>({f:String(w.f).slice(0,120),tr:String(w.tr).slice(0,160),ex:String(w.ex||"").slice(0,240)}));
    const mistakes=(Array.isArray(o.hatalar)?o.hatalar:[]).map(x=>String(x).slice(0,160)).filter(Boolean).slice(0,15);
    return {lang,mins,total,words,mistakes,topic:String(o.konu||""),topicStatus:o.konu_durum==="tamam"?"done":(o.konu?"doing":""),note:String(o.not||"").slice(0,400)};});
  return {date,sessions:out,next:String(j.sonraki||"").slice(0,400)};
}
/* Aynı içerik iki kez işlenirse (çift tıklama, aynı kodu tekrar yapıştırma) tek kayıt kalsın: belge kimliği içerikten türetilir */
function hashStr(t){let h=5381;for(let i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))|0;return (h>>>0).toString(36);}
/* Aynı gün + aynı ajan + aynı dil için tek seans satırı: dakikalar blok blok en büyüğüyle birleşir (geri düşmez, iki kez sayılmaz), hatalar birleşir, boş not/sonraki eskisini silmez */
async function upsertSession(id,rec){
  const prev=S.sessions.find(s=>s.id===id); const mins={}; let total=0;
  MIN_KEYS.forEach(k=>{const v=Math.max(+(prev&&prev.mins||{})[k]||0,+(rec.mins||{})[k]||0);mins[k]=v;total+=v;});
  const out=Object.assign({},rec,{mins,total,
    mistakes:[...new Set([...(prev&&prev.mistakes||[]),...(rec.mistakes||[])])].slice(0,15),
    note:rec.note||(prev&&prev.note)||"",next:rec.next||(prev&&prev.next)||"",topic:rec.topic||(prev&&prev.topic)||"",
    created:(prev&&prev.created)||rec.created,words:Math.max(prev&&prev.words||0,rec.words||0)});
  await db.collection("sessions").doc(id).set(out);
  const i=S.sessions.findIndex(s=>s.id===id); if(i>=0)S.sessions[i]=Object.assign({id},out); else S.sessions.push(Object.assign({id},out));
  return {prev:!!prev,rec:out};
}
/* Konu durumu: "tamam" olan konu "devam"a geri düşmez (elle Müfredat sekmesinden değiştirilebilir) */
async function setTopic(id,status){const cur=(S.topics[id]||{}).status; if(cur==="done"&&status!=="done") return false;
  const updated=new Date().toISOString(); await db.collection("topics").doc(id).set({status,updated}); S.topics[id]={status,updated}; return true;}
/* opt.idFor(session, i) → sabit seans kimliği (sohbet içi TYDIL); yoksa yapıştırma: içerikten kimlik */
async function applySummary(sum,opt){
  opt=opt||{}; let addedCards=0, skipped=0; const created=new Date().toISOString();
  for(let i=0;i<sum.sessions.length;i++){const s=sum.sessions[i];
    const rec={date:sum.date,lang:s.lang,mins:s.mins,total:s.total,topic:s.topic,mistakes:s.mistakes,note:s.note,next:i===sum.sessions.length-1?sum.next:"",created,words:s.words.length,src:opt.idFor?"chat":"paste"};
    if(opt.idFor) await upsertSession(opt.idFor(s,i),rec);
    else { const id="paste-"+sum.date+"-"+s.lang+"-"+hashStr(JSON.stringify([s.mins,s.topic,s.words.map(w=>w.f),s.mistakes,s.note]));
      const prev=S.sessions.find(x=>x.id===id); if(prev) rec.created=prev.created||created;
      await db.collection("sessions").doc(id).set(rec); if(!prev) S.sessions.push(Object.assign({id},rec)); }
    if(s.topic&&SYL[s.lang].some(t=>t[1]===s.topic)&&s.topicStatus) await setTopic(s.topic,s.topicStatus);
    for(const w of s.words){ const exists=S.cards.some(c=>c.lang===s.lang&&String(c.f||"").toLowerCase()===w.f.toLowerCase()); if(exists){skipped++;continue;}
      await db.collection("cards").add({lang:s.lang,f:w.f,tr:w.tr,ex:w.ex,box:1,due:sum.date>today()?sum.date:today(),added:created}); S.cards.push({lang:s.lang,f:w.f,tr:w.tr,due:today()}); addedCards++; }
  }
  return {addedCards,skipped};
}
