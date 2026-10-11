/* ---------- VURGU KALEMİ (pen.js) ----------
   Metin içeren alanlarda seçimi <mark class="hl hl-<renk>" data-hid> ile sarar; vurgu db "highlights" koleksiyonunda, çapa + alıntı (TextQuoteSelector) ile saklanır:
     chat → {thread: CC.key (tarih_ajan), turn}  ·  unit → {lang, uid, step}  ·  done → {date}  ·  mist → sabit
   Yeniden çizimden sonra (ccRender, ünite ekranı, bitti ekranı, hatalar) MutationObserver tetikler, vurgular alıntı + ön/son ekle yeniden bulunur (idempotent).
   Araç: sağ altta yuvarlak kalem (Ders modunda "Bloğu bitirdim" satırının solunda) → araç çubuğu (3 renk, Not ekle, Sil, Kapat).
   Kalem kapalıyken seçimin yanında küçük "Vurgula" çipi çıkar. Bir vurguya dokununca aynı çubuk o vurgu için açılır (renk / not / kaldır).
   İlerleme → Vurgularım: gün ve kaynağa göre liste, "Git" kaynağı açar (bugünkü sohbet / ünite adımı) ya da eski sohbet turunu yerinde gösterir.
   Yedek: koleksiyon rtExport/rtImport ile otomatik taşınır (anahtar içermez). */
const PEN={items:[],byId:{},armed:false,color:"yellow",ctx:null,obs:[],t:0,applying:false,chipRange:null,selT:0,open:false,anchorEl:null,view:{}};
const PEN_COLORS={yellow:"Sarı",green:"Yeşil",pink:"Pembe"};
const PEN_SKIP="button,input,textarea,select,script,style,.cc-vh,.u-notes,.u-ubar,.np-sheet,.pen-ui,.cc-act,.cc-acts,.cc-tools,.cc-think,.u-toast,[contenteditable],[role=button]";
const PEN_CTX=32, PEN_MAXQ=2000;
const PEN_SVG={pen:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0 0-3L17 5a2.1 2.1 0 0 0-3 0L3.5 15.5V20z"/><path d="M12.5 7.5 17 12"/><path d="M4 20l4-1"/></svg>',
  dot:'<span class="pen-dot" aria-hidden="true"></span>'};
const penAgentName=t=>{const id=String(t||"").split("_")[1]||""; return id==="it-koc"?"Chiara":id==="en-koc"?"Oliver":id==="dilbilgisi"?"Selin":"Koç";};
function penUnitHash(){const h=(location.hash||"").replace(/^#/,""); if(!/^dersler\//i.test(h))return null; const p=h.split("/").slice(1).map(x=>{try{return decodeURIComponent(x);}catch(e){return x;}}); if(!p[1]||!p[2])return null; return {lang:p[0],uid:p[1],step:p[2]};}
function penUnitTitle(a){let t=a.uid, s=a.step; try{ if(typeof findUnit==="function"){const u=findUnit(a.uid); if(u){t=u.title||t; if(typeof unitSteps==="function"){const st=unitSteps(u).find(x=>x.k===a.step); if(st)s=st.n;}}} }catch(e){} return t+" · "+s;}
/* Alanlar: root (gözlenen kök) · each(root) → vurgulanabilir öğeler · anchor(el) → çapa · group(a,h) (aynı kapsayıcı) · same(a,h) (aynı öğe) */
const PEN_SCOPES=[
  {kind:"chat",root:()=>(typeof CC!=="undefined"&&CC.root)?CC.root.querySelector("#ccLog"):$("#ccLog"),
   each:r=>[...r.querySelectorAll(".cc-row[data-i]:not(.live):not(.sys) > .cc-b")],
   anchor:el=>{const row=el.closest(".cc-row"); if(!row||typeof CC==="undefined"||!CC.key)return null; return {kind:"chat",thread:CC.key,turn:+row.dataset.i};},
   group:(a,h)=>h.kind==="chat"&&h.thread===a.thread, same:(a,h)=>h.turn===a.turn,
   title:a=>penAgentName(a.thread)+" · sohbet"},
  {kind:"unit",root:()=>$("#tyUnitsMount"),each:r=>{const v=r.querySelector("#uView"); return v?[v]:[];},
   anchor:()=>{const a=penUnitHash(); return a?Object.assign({kind:"unit"},a):null;},
   group:(a,h)=>h.kind==="unit"&&h.lang===a.lang&&h.uid===a.uid&&h.step===a.step, same:()=>true, title:penUnitTitle},
  {kind:"done",root:()=>$("#dersDone"),each:r=>[r],anchor:()=>({kind:"done",date:today()}),group:(a,h)=>h.kind==="done"&&h.date===a.date,same:()=>true,title:()=>"Bitti ekranı"},
  {kind:"mist",root:()=>$("#mistakes"),each:r=>[r],anchor:()=>({kind:"mist"}),group:(a,h)=>h.kind==="mist",same:()=>true,title:()=>"Sık yaptığın hatalar"}
];
/* ---- metin haritası ---- */
function penMap(scope){const nodes=[],starts=[]; let len=0;
  const w=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement; if(!p)return NodeFilter.FILTER_REJECT; const s=p.closest(PEN_SKIP); return s&&scope.contains(s)&&s!==scope?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
  let n; while((n=w.nextNode())){nodes.push(n); starts.push(len); len+=n.data.length;}
  return {nodes,starts,text:nodes.map(x=>x.data).join("")};}
const penCommonTail=(a,b)=>{let i=0; while(i<a.length&&i<b.length&&a[a.length-1-i]===b[b.length-1-i])i++; return i;};
const penCommonHead=(a,b)=>{let i=0; while(i<a.length&&i<b.length&&a[i]===b[i])i++; return i;};
/* Alıntıyı bul: tam eşleşmeler arasından ön/son eki en çok tutanı; yoksa boşluk normalize edilmiş eşleşme */
function penFind(text,h){const q=String(h.quote||""); if(!q)return null; const pre=String(h.prefix||""), suf=String(h.suffix||"");
  const pick=(T,Q,toRaw)=>{let best=null,bs=-1,i=T.indexOf(Q); while(i>=0){const a=T.slice(Math.max(0,i-pre.length),i), b=T.slice(i+Q.length,i+Q.length+suf.length); const sc=penCommonTail(a,pre)+penCommonHead(b,suf); if(sc>bs){bs=sc;best=i;} i=T.indexOf(Q,i+1);} return best==null?null:(toRaw?toRaw(best,best+Q.length):{s:best,e:best+Q.length});};
  const r=pick(text,q); if(r)return r;
  const map=[]; let norm=""; for(let i=0;i<text.length;i++){const c=text[i]; if(/\s/.test(c)){if(norm&&norm[norm.length-1]===" ")continue; norm+=" "; map.push(i);} else {norm+=c; map.push(i);}}
  const nq=q.replace(/\s+/g," ").trim(); if(!nq)return null;
  return pick(norm,nq,(s,e)=>({s:map[s],e:map[e-1]+1}));}
function penPlace(el,h,opt){const {nodes,starts,text}=penMap(el); const r=penFind(text,h); if(!r||r.e<=r.s)return false; penWrap(nodes,starts,r.s,r.e,h,opt); return true;}
function penWrap(nodes,starts,s,e,h,opt){let first=true;
  for(let i=0;i<nodes.length;i++){let node=nodes[i]; const a=starts[i], b=a+node.data.length; if(b<=s||a>=e)continue;
    const from=Math.max(s,a)-a, to=Math.min(e,b)-a; if(to<=from)continue;
    if(to<node.data.length)node.splitText(to); if(from>0)node=node.splitText(from);
    const m=document.createElement("mark"); m.dataset.hid=h.id; penStyle(m,h); if(first&&!(opt&&opt.inert)){m.tabIndex=0;} first=false;
    node.parentNode.insertBefore(m,node); m.appendChild(node);}
  if(h.note)[...document.querySelectorAll(`mark.hl[data-hid="${h.id}"]`)].pop()?.classList.add("has-note");}
function penStyle(m,h){m.className="hl hl-"+(PEN_COLORS[h.color]?h.color:"yellow"); const lbl="vurgu: "+(PEN_COLORS[h.color]||"Sarı")+(h.note?" · not: "+h.note:""); m.setAttribute("aria-label",lbl); if(h.note)m.title=h.note; else m.removeAttribute("title"); m.classList.toggle("has-note",false);}
function penUnwrapMark(m){const p=m.parentNode; if(!p)return; while(m.firstChild)p.insertBefore(m.firstChild,m); p.removeChild(m); try{p.normalize();}catch(e){}}
function penUnwrapAll(hid){document.querySelectorAll(`mark.hl[data-hid="${hid}"]`).forEach(penUnwrapMark);}
/* ---- uygula (idempotent) ---- */
function penApplyEl(def,el){const anchor=def.anchor(el); if(!anchor)return null;
  el.querySelectorAll("mark.hl[data-hid]").forEach(m=>{const h=PEN.byId[m.dataset.hid]; if(!h||!def.group(anchor,h))penUnwrapMark(m); else penStyle(m,h);});
  const present=new Set([...el.querySelectorAll("mark.hl[data-hid]")].map(m=>m.dataset.hid));
  PEN.items.filter(h=>def.group(anchor,h)&&def.same(anchor,h)&&!present.has(h.id)).forEach(h=>{if(penPlace(el,h))present.add(h.id);});
  /* not noktası: son parçaya */
  present.forEach(id=>{const h=PEN.byId[id]; if(h&&h.note){const ms=el.querySelectorAll(`mark.hl[data-hid="${id}"]`); if(ms.length)ms[ms.length-1].classList.add("has-note");}});
  return anchor;}
function penApplyDef(def){const root=def.root(); if(!root)return; const els=def.each(root); if(!els.length)return; let a0=null;
  els.forEach(el=>{const a=penApplyEl(def,el); if(a&&!a0)a0=a;});
  if(def.kind==="chat"&&a0){const placed=new Set([...root.querySelectorAll("mark.hl[data-hid]")].map(m=>m.dataset.hid));
    PEN.items.filter(h=>def.group(a0,h)&&!placed.has(h.id)).forEach(h=>{for(const el of els){if(penPlace(el,h))break;}});}}
function penApply(){if(PEN.applying)return; PEN.applying=true; try{PEN_SCOPES.forEach(penApplyDef);}catch(e){} finally{PEN.applying=false; PEN.obs.forEach(o=>{try{o.takeRecords();}catch(e){}});}}
function penSchedule(){clearTimeout(PEN.t); PEN.t=setTimeout(penApply,60);}
function penObserve(){PEN_SCOPES.forEach(def=>{const r=def.root(); if(!r||r.__penObs)return; const o=new MutationObserver(()=>{if(!PEN.applying)penSchedule();}); o.observe(r,{childList:true,subtree:true}); r.__penObs=true; PEN.obs.push(o);});}
/* ---- kayıt ---- */
const penDb=()=>typeof db!=="undefined"&&db?db:null;
function penSet(items){PEN.items=items.filter(h=>h&&h.quote).sort((a,b)=>String(a.created||"").localeCompare(String(b.created||""))); PEN.byId={}; PEN.items.forEach(h=>PEN.byId[h.id]=h); penApply(); penRenderList();}
async function penSave(rec){const d=penDb(); if(d){try{const r=await d.collection("highlights").add(rec); return r.id;}catch(e){}}
  const id="loc"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); penSet(PEN.items.concat([Object.assign({id},rec)])); return id;}
async function penUpdate(id,patch){const h=PEN.byId[id]; if(!h)return; Object.assign(h,patch); penSet(PEN.items.slice()); const d=penDb(); if(d){try{await d.collection("highlights").doc(id).update(patch);}catch(e){}}}
async function penDelete(id){penUnwrapAll(id); penSet(PEN.items.filter(h=>h.id!==id)); const d=penDb(); if(d){try{await d.collection("highlights").doc(id).delete();}catch(e){}}}
/* ---- seçimden vurgu ---- */
function penScopeAt(node){for(const def of PEN_SCOPES){const root=def.root(); if(!root||!root.contains(node))continue; const el=def.each(root).find(x=>x.contains(node)); if(el)return {def,el};} return null;}
function penOffset(map,container,offset,end){const {nodes,starts}=map;
  if(container.nodeType===3){const i=nodes.indexOf(container); if(i<0){/* atlanan düğüm (düğme vb.): en yakın komşu */ const all=[...nodes]; const after=all.find(n=>container.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING); if(!end&&after)return starts[nodes.indexOf(after)]; const before=all.slice().reverse().find(n=>container.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_PRECEDING); if(end&&before){const j=nodes.indexOf(before);return starts[j]+before.data.length;} return -1;} return starts[i]+Math.min(offset,container.data.length);}
  const kids=container.childNodes; if(offset<kids.length){const child=kids[offset]; const i=nodes.findIndex(n=>child===n||child.contains(n)); if(i>=0)return starts[i]; const after=nodes.findIndex(n=>child.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING); return after>=0?starts[after]:(end?map.text.length:-1);}
  for(let i=nodes.length-1;i>=0;i--){if(container.contains(nodes[i]))return starts[i]+nodes[i].data.length;} return end?map.text.length:-1;}
function penCurrentSel(){let sel; try{sel=window.getSelection();}catch(e){return null;} if(!sel||!sel.rangeCount||sel.isCollapsed)return null; const r=sel.getRangeAt(0); if(!String(r).trim())return null;
  const sc=r.startContainer.nodeType===1?r.startContainer:r.startContainer.parentElement; if(!sc||sc.closest("input,textarea,[contenteditable],.pen-ui"))return null;
  const hit=penScopeAt(r.startContainer); if(!hit)return null; const range=r.cloneRange(); if(!hit.el.contains(range.endContainer))range.setEnd(hit.el,hit.el.childNodes.length); return Object.assign({range},hit);}
function penRecFromRange(hit){const map=penMap(hit.el), text=map.text; let s=penOffset(map,hit.range.startContainer,hit.range.startOffset,false), e=penOffset(map,hit.range.endContainer,hit.range.endOffset,true);
  if(s<0||e<0)return null; if(e<s)[s,e]=[e,s]; while(s<e&&/\s/.test(text[s]))s++; while(e>s&&/\s/.test(text[e-1]))e--; if(e-s<1)return null; if(e-s>PEN_MAXQ)e=s+PEN_MAXQ;
  const anchor=hit.def.anchor(hit.el); if(!anchor)return null;
  return Object.assign({},anchor,{quote:text.slice(s,e),prefix:text.slice(Math.max(0,s-PEN_CTX),s),suffix:text.slice(e,e+PEN_CTX),color:PEN.color,note:"",created:new Date().toISOString(),title:hit.def.title(anchor)});}
async function penCreateFromSel(hit){hit=hit||penCurrentSel(); if(!hit)return false; const rec=penRecFromRange(hit); if(!rec)return false;
  try{window.getSelection().removeAllRanges();}catch(e){} penChip(false); const id=await penSave(rec); penApply();
  const m=document.querySelector(`mark.hl[data-hid="${id}"]`); if(m){m.classList.add("pen-new"); setTimeout(()=>m.classList.remove("pen-new"),700);} return true;}
/* ---- "Vurgula" çipi ---- */
function penChipEl(){let c=$("#penChip"); if(!c){c=document.createElement("button"); c.type="button"; c.id="penChip"; c.className="pen-chip pen-ui"; c.hidden=true; c.innerHTML=PEN_SVG.pen+"<span>Vurgula</span>"; document.body.appendChild(c);
    c.addEventListener("pointerdown",e=>e.preventDefault()); c.addEventListener("mousedown",e=>e.preventDefault());
    c.addEventListener("click",()=>{const hit=PEN.chipRange||penCurrentSel(); PEN.chipRange=null; penCreateFromSel(hit);});} return c;}
function penChip(on,hit){const c=penChipEl(); if(!on){c.hidden=true; PEN.chipRange=null; return;}
  PEN.chipRange=hit; let r=hit.range.getBoundingClientRect(); if(!r.width&&!r.height){const rs=hit.range.getClientRects(); if(rs.length)r=rs[0];}
  c.hidden=false; const w=c.offsetWidth||110, h=c.offsetHeight||40; let top=r.top-h-10; if(top<8)top=r.bottom+10; top=Math.max(8,Math.min(innerHeight-h-8,top)); let left=r.left+r.width/2-w/2; left=Math.max(8,Math.min(innerWidth-w-8,left));
  c.style.top=Math.round(top)+"px"; c.style.left=Math.round(left)+"px";}
function penOnSel(){const hit=penCurrentSel(); if(!hit){penChip(false);return;} if(PEN.armed){penCreateFromSel(hit);return;} penChip(true,hit);}
document.addEventListener("selectionchange",()=>{clearTimeout(PEN.selT); PEN.selT=setTimeout(penOnSel,PEN.armed?120:260);});
["mouseup","touchend","keyup"].forEach(ev=>document.addEventListener(ev,e=>{if(e.target&&e.target.closest&&e.target.closest(".pen-ui"))return; clearTimeout(PEN.selT); PEN.selT=setTimeout(penOnSel,40);},{passive:true}));
window.addEventListener("scroll",()=>{if(!PEN.open)penChip(false);},{passive:true,capture:true});
/* ---- kalem düğmeleri ---- */
function penFab(){let b=$("#penFab"); if(!b){b=document.createElement("button"); b.type="button"; b.id="penFab"; b.className="pen-fab pen-ui pen-tog"; b.setAttribute("aria-pressed","false"); b.setAttribute("aria-label","Vurgu kalemi"); b.title="Vurgu kalemi"; b.innerHTML=PEN_SVG.pen; document.body.appendChild(b);} return b;}
function penDersTog(){const f=$("#dersFoot"); if(!f)return null; let b=$("#penDers"); if(!b){b=document.createElement("button"); b.type="button"; b.id="penDers"; b.className="pen-ders pen-ui pen-tog"; b.setAttribute("aria-pressed","false"); b.setAttribute("aria-label","Vurgu kalemi"); b.title="Vurgu kalemi"; b.innerHTML=PEN_SVG.pen; f.insertBefore(b,f.firstChild);} return b;}
function penPaintTog(){document.querySelectorAll(".pen-tog").forEach(b=>{b.setAttribute("aria-pressed",String(PEN.armed)); b.classList.toggle("on",PEN.armed);}); document.documentElement.classList.toggle("pen-on",PEN.armed);}
function penToggle(fromEl){PEN.armed=!PEN.armed; penPaintTog(); penChip(false); if(PEN.armed){PEN.ctx=null; penBarOpen(fromEl);} else penBarClose();}
/* ---- araç çubuğu / açılır pencere ---- */
function penBarEl(){let b=$("#penBar"); if(!b){b=document.createElement("div"); b.id="penBar"; b.className="pen-bar pen-ui"; b.setAttribute("role","dialog"); b.setAttribute("aria-label","Vurgu kalemi"); b.hidden=true; document.body.appendChild(b);} return b;}
function penBarHtml(){const h=PEN.ctx?PEN.byId[PEN.ctx]:null, cur=h?h.color:PEN.color;
  return `<div class="pen-row"><div class="pen-colors" role="group" aria-label="Renk">${Object.keys(PEN_COLORS).map(k=>`<button type="button" class="pen-c hl-${k}" data-pc="${k}" aria-pressed="${k===cur}" aria-label="${PEN_COLORS[k]}" title="${PEN_COLORS[k]}"></button>`).join("")}</div>
    <button type="button" class="pen-b" data-pa="note" ${h?"":"disabled"} title="${h?"":"Önce bir vurguya dokun"}">${h&&h.note?"Notu düzenle":"Not ekle"}</button>
    <button type="button" class="pen-b" data-pa="del" ${h?"":"disabled"} title="${h?"":"Önce bir vurguya dokun"}">${h?"Kaldır":"Sil"}</button>
    <button type="button" class="pen-b pen-x" data-pa="close" aria-label="Kapat">${ICON("x")}<span>Kapat</span></button></div>
    <div class="pen-note" id="penNote" hidden><label class="cc-vh" for="penNoteIn">Not</label><input id="penNoteIn" maxlength="200" placeholder="Kısa not…"><button type="button" class="pen-b" data-pa="noteSave">Kaydet</button></div>
    <p class="pen-hint" id="penHint">${h?(h.note?esc(h.note):"Renk seç, not ekle ya da kaldır."):PEN.armed?"Metni seç: seçtiğin anda vurgulanır.":"Metni seç, çıkan Vurgula'ya bas."}</p>`;}
function penBarOpen(anchorEl){const b=penBarEl(); b.innerHTML=penBarHtml(); b.hidden=false; PEN.open=true; PEN.anchorEl=anchorEl||null; penBarPos(); penChip(false);}
function penBarPos(){const b=$("#penBar"); if(!b||b.hidden)return; const a=PEN.anchorEl&&PEN.anchorEl.isConnected?PEN.anchorEl.getBoundingClientRect():null; const w=b.offsetWidth, h=b.offsetHeight;
  let top,left; if(a){top=a.top-h-10; if(top<8)top=a.bottom+10; left=a.left+a.width/2-w/2;} else {top=innerHeight-h-90; left=innerWidth/2-w/2;}
  left=Math.max(8,Math.min(innerWidth-w-8,left)); top=Math.max(8,Math.min(innerHeight-h-8,top)); b.style.top=Math.round(top)+"px"; b.style.left=Math.round(left)+"px";}
function penBarClose(){const b=$("#penBar"); if(b){b.hidden=true;} PEN.open=false; PEN.ctx=null;}
function penBarAct(a,btn){const h=PEN.ctx?PEN.byId[PEN.ctx]:null;
  if(a==="close"){const wasCtx=!!PEN.ctx; penBarClose(); if(!wasCtx&&PEN.armed){PEN.armed=false; penPaintTog();} return;}
  if(a==="note"){const box=$("#penNote"), inp=$("#penNoteIn"); if(!box||!h)return; box.hidden=false; inp.value=h.note||""; penBarPos(); inp.focus(); return;}
  if(a==="noteSave"){const inp=$("#penNoteIn"); if(!h||!inp)return; const v=inp.value.trim().slice(0,200); penUpdate(h.id,{note:v}); const hint=$("#penHint"); if(hint)hint.textContent=v?v:"Not silindi."; $("#penNote").hidden=true; const nb=$('#penBar [data-pa="note"]'); if(nb)nb.textContent=v?"Notu düzenle":"Not ekle"; penBarPos(); return;}
  if(a==="del"){if(!h)return; penDelete(h.id); penBarClose(); return;}}
function penMarkOpen(m){const id=m.dataset.hid; if(!PEN.byId[id])return; PEN.ctx=id; penBarOpen(m);}
document.addEventListener("click",e=>{const t=e.target; if(!t||!t.closest)return;
  const tog=t.closest(".pen-tog"); if(tog){penToggle(tog);return;}
  const pc=t.closest("#penBar [data-pc]"); if(pc){const c=pc.dataset.pc; if(PEN.ctx)penUpdate(PEN.ctx,{color:c}); else PEN.color=c; document.querySelectorAll("#penBar [data-pc]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.pc===c))); return;}
  const pa=t.closest("#penBar [data-pa]"); if(pa){penBarAct(pa.dataset.pa,pa);return;}
  const m=t.closest("mark.hl[data-hid]"); if(m){e.preventDefault(); penMarkOpen(m); return;}
  if(PEN.open&&!t.closest("#penBar")){ if(PEN.ctx)penBarClose(); }
});
document.addEventListener("keydown",e=>{const t=e.target; if(t&&t.matches&&t.matches("mark.hl[data-hid]")&&(e.key==="Enter"||e.key===" ")){e.preventDefault(); penMarkOpen(t); return;}
  if(e.key==="Escape"&&PEN.open){const inp=$("#penNoteIn"); if(inp&&document.activeElement===inp){$("#penNote").hidden=true; return;} e.stopPropagation(); penBarClose(); if(PEN.armed){PEN.armed=false; penPaintTog();}}
  if(e.key==="Enter"&&e.target&&e.target.id==="penNoteIn"){e.preventDefault(); penBarAct("noteSave");}},true);
window.addEventListener("resize",penBarPos);
/* ---- Vurgularım (İlerleme) ---- */
function penSrcLabel(h){if(h.kind==="chat")return penAgentName(h.thread)+" · sohbet"; if(h.kind==="unit")return h.title||penUnitTitle(h); if(h.kind==="done")return "Bitti ekranı"; return "Sık yaptığın hatalar";}
function penRenderList(){const box=$("#hlList"), cnt=$("#hlCount"); if(!box)return; const items=PEN.items.slice().reverse();
  if(cnt)cnt.textContent=items.length?items.length+" vurgu":"";
  if(!items.length){box.innerHTML=`<div class="empty"><b>Henüz vurgu yok</b>Koç mesajında ya da Dersler'de metni seç, çıkan <b>Vurgula</b>'ya bas. Sağ alttaki kalemle renk seçersin.</div>`;return;}
  const groups=[]; items.forEach(h=>{const d=String(h.created||"").slice(0,10); let g=groups[groups.length-1]; if(!g||g.d!==d){g={d,items:[]};groups.push(g);} g.items.push(h);});
  box.innerHTML=groups.map(g=>`<section class="hlDay"><h4 class="hlDayT">${g.d===today()?"Bugün":esc(fmtDay(g.d,{day:"numeric",month:"long",weekday:"long"}))}</h4>${g.items.map(h=>`<article class="hlItem hl-${PEN_COLORS[h.color]?h.color:"yellow"}" data-hid="${esc(h.id)}">
      <span class="hlSw" aria-hidden="true"></span><div class="hlBody"><span class="hlSrc">${esc(penSrcLabel(h))}</span><blockquote class="hlQ">${esc(h.quote.length>220?h.quote.slice(0,220)+"…":h.quote)}</blockquote>${h.note?`<p class="hlNote">${PEN_SVG.dot}${esc(h.note)}</p>`:""}<div class="hlView" hidden></div></div>
      <div class="hlAct"><button type="button" class="btn btn-soft btn-sm" data-hgo="${esc(h.id)}">${penGoLabel(h)}</button><button type="button" class="btn btn-ghost btn-sm" data-hdel="${esc(h.id)}" aria-label="Vurguyu sil">Sil</button></div></article>`).join("")}</section>`).join("");}
function penGoLabel(h){if(h.kind==="chat"&&!(typeof CC!=="undefined"&&CC.key===h.thread)&&String(h.thread||"").slice(0,10)!==today())return PEN.view[h.id]?"Gizle":"Göster"; if(h.kind==="done")return "Göster"; return "Git";}
async function penGo(h,btn){
  if(h.kind==="mist"){openTab("progress"); setTimeout(()=>penReveal(h.id,$("#mistakes")),80); return;}
  if(h.kind==="unit"){const U=window.TYDIL&&TYDIL.units; openTab("units"); if(U&&typeof U.go==="function"){try{U.go(h.lang+"/"+h.uid+"/"+h.step);}catch(e){}} setTimeout(()=>penReveal(h.id,$("#tyUnitsMount")),300); return;}
  if(h.kind==="chat"&&String(h.thread||"").slice(0,10)===today()){const id=String(h.thread).split("_")[1]; const k=typeof CC_AGENTS!=="undefined"?Object.keys(CC_AGENTS).find(x=>CC_AGENTS[x].id===id):null;
    openTab("practice"); if(k&&typeof ccSetAgent==="function"){try{await ccSetAgent(k);}catch(e){}} setTimeout(()=>penReveal(h.id,$("#ccLog")),350); return;}
  /* eski sohbet turu ya da bitti ekranı: yerinde göster */
  const item=btn.closest(".hlItem"), view=item&&item.querySelector(".hlView"); if(!view)return;
  if(PEN.view[h.id]){delete PEN.view[h.id]; view.hidden=true; view.innerHTML=""; btn.textContent=penGoLabel(h); return;}
  PEN.view[h.id]=1; btn.textContent="Gizle"; view.hidden=false; view.innerHTML=`<p class="hint">Yükleniyor…</p>`;
  if(h.kind==="done"){view.innerHTML=`<div class="hlTurn"><p class="hint">${esc(fmtDay(h.date,{day:"numeric",month:"long"}))} bitti ekranından.</p><div class="hlTxt">${esc(h.prefix||"")}<mark class="hl hl-${esc(h.color)}" data-hid="${esc(h.id)}">${esc(h.quote)}</mark>${esc(h.suffix||"")}</div></div>`; return;}
  const d=penDb(); let t=null; if(d){try{const g=await d.collection("chats").doc(h.thread).get(); if(g&&g.exists){const v=g.data()||{}; t=(v.turns||[])[h.turn]||null; if(t&&!(t.c||"").includes(h.quote))t=(v.turns||[]).find(x=>x&&(x.c||"").includes(h.quote))||t;}}catch(e){}}
  if(!t){view.innerHTML=`<div class="hlTurn"><p class="hint">Sohbet kaydı bulunamadı; alıntı:</p><div class="hlTxt">${esc(h.prefix||"")}<mark class="hl hl-${esc(h.color)}" data-hid="${esc(h.id)}">${esc(h.quote)}</mark>${esc(h.suffix||"")}</div></div>`; return;}
  const who=t.r==="u"?"Sen":penAgentName(h.thread);
  view.innerHTML=`<div class="hlTurn"><p class="hint">${esc(who)} · ${esc(fmtDay(String(h.thread).slice(0,10),{day:"numeric",month:"long"}))}</p><div class="hlTxt cc-md">${t.r==="u"?esc(t.c).replace(/\n/g,"<br>"):(typeof ccMd==="function"?ccMd(t.c):esc(t.c))}</div></div>`;
  const tx=view.querySelector(".hlTxt"); if(tx)penPlace(tx,h,{inert:true});}
function penReveal(id,root){const m=(root||document).querySelector(`mark.hl[data-hid="${id}"]`); if(!m)return; try{m.scrollIntoView({block:"center",behavior:"smooth"});}catch(e){m.scrollIntoView();} m.classList.add("pen-new"); setTimeout(()=>m.classList.remove("pen-new"),1200); try{m.focus({preventScroll:true});}catch(e){}}
document.addEventListener("click",e=>{const g=e.target.closest("[data-hgo]"); if(g){const h=PEN.byId[g.dataset.hgo]; if(h)penGo(h,g); return;}
  const d=e.target.closest("[data-hdel]"); if(d){ /* iki adım: önce "Emin misin?", 3,5 sn içinde ikinci bas → sil (pencere/onay kutusu yok) */
    if(d.dataset.armed&&Date.now()-(+d.dataset.armed)<3500){penDelete(d.dataset.hdel);return;}
    d.dataset.armed=String(Date.now()); d.textContent="Emin misin?"; d.classList.add("warn"); setTimeout(()=>{if(d.isConnected){d.textContent="Sil";d.classList.remove("warn");delete d.dataset.armed;}},3600); return;}});
/* ---- başlat ---- */
penFab(); penDersTog(); penObserve(); penRenderList();
(async()=>{let d=null; for(let i=0;i<50&&!d;i++){d=penDb(); if(!d)await new Promise(r=>setTimeout(r,100));} if(!d)return;
  try{ d.collection("highlights").onSnapshot(q=>{penSet(q.docs.map(x=>Object.assign({id:x.id},x.data())));},()=>{}); }catch(e){} })();
window.TYPEN={get state(){return PEN;},apply:penApply,create:penCreateFromSel,remove:penDelete,update:penUpdate,toggle:penToggle};
