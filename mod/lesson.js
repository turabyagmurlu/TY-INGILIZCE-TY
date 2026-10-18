/* TY Dil · ders ekranı + Konuş (tembel modül; build.py üretir, elle düzenleme) */
(function(){
"use strict";
if(window.TYLESSON)return;
const LCSS="html.lsn-on,html.kc-on{overflow:hidden}\nhtml.lsn-on .app,html.lsn-on .tabs{visibility:hidden}\n.lsn{position:fixed;inset:0;z-index:50;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}\n.lsnIn{max-width:760px;margin:0 auto;padding:12px max(16px,env(safe-area-inset-right,0px)) calc(48px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));display:grid;gap:14px}\n.lsnSticky{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line);padding:calc(8px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) 8px max(16px,env(safe-area-inset-left,0px))}\n.lsnSticky>*{max-width:760px;margin-inline:auto}\n.lsnBar{display:flex;align-items:center;gap:10px;margin-bottom:8px}\n.lsnBt{flex:1;min-width:0;display:grid}\n.lsnBt small{font-size:12.5px;font-weight:800;color:var(--good-ink);display:flex;gap:6px;align-items:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.lsnBt h1{margin:0;font-size:18px;line-height:1.2;color:var(--heading);font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.lsnLead{margin:0}\n.lsnTop{display:flex;align-items:center;gap:10px}\n.lsnX{flex:none;display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:8px 12px;border-radius:12px;border:2px solid var(--line);background:var(--card);color:var(--primary-ink);font-weight:700;font-size:15px}\n.lsnX .ico{width:18px;height:18px;transform:scaleX(-1)}\n.lsnHd{display:grid;gap:6px}\n.lsnHd .eyebrow{font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--good-ink);margin:0;display:flex;align-items:center;gap:8px}\n.lsnHd h1{margin:0;font-size:clamp(26px,5vw,34px);line-height:1.15;color:var(--heading);font-weight:800}\n.lsnHd .lead{margin:0}\n.lpath{display:grid;grid-template-columns:repeat(var(--n,5),minmax(0,1fr));gap:6px;list-style:none;margin:0;padding:0}\n.lpath button{width:100%;min-height:46px;border:2px solid var(--line);background:var(--card);border-radius:12px;color:var(--muted);font:700 14px/1.2 var(--font);display:grid;gap:2px;justify-items:center;align-content:center;padding:6px 2px}\n.lpath button span{font-family:var(--mono);font-size:12px;font-weight:600}\n.lpath button[aria-current=\"step\"]{border-color:var(--primary);color:var(--text);background:var(--primary-bg)}\n.lpath button.done{background:var(--good-bg);border-color:var(--good);color:var(--good-ink)}\n.lpath button:disabled{opacity:.5;cursor:not-allowed}\n.lcard{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;display:grid;gap:16px;min-width:0;box-shadow:var(--shadow-s)}\n.lcard h2{margin:0;font-size:23px;line-height:1.2;color:var(--heading);font-weight:800}\n.lcard h2:focus,.lcard .q:focus{outline:none}\n.lcard p{margin:0}\n.lk{font-size:13px;font-weight:700;color:var(--muted);letter-spacing:.04em;margin:0}\n.lrow{display:flex;flex-wrap:wrap;gap:10px;align-items:center}\n.lnav{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}\n.lnav .btn{min-height:48px}\n.lsub{display:flex;gap:8px}\n.lsub i{width:28px;height:6px;border-radius:3px;background:var(--line2)}\n.lsub i.on{background:var(--primary)}\n.compare{display:grid;gap:12px}\n.lane{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px;align-items:center}\n.lane>b{font-size:13px;color:var(--muted)}\n.blks{display:flex;flex-wrap:wrap;gap:6px}\n.blk{padding:8px 12px;border-radius:10px;background:var(--soft);font-weight:700}\n.blk.v{background:var(--accent-bg);box-shadow:inset 0 0 0 2px var(--accent)}\n.blk small{display:block;font-weight:400;font-size:12px;color:var(--muted)}\n.lnote{background:var(--soft);border-radius:12px;padding:12px 14px;font-size:16px}\n.lnote.warn{background:var(--bad-bg)}\n.ltbl{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:12px;border:1px solid var(--line)}\n.ltbl table{border-collapse:collapse;width:100%;min-width:440px;font-size:16px}\n.ltbl th,.ltbl td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:middle}\n.ltbl tr:last-child td{border-bottom:0}\n.ltbl th{font-size:13px;color:var(--muted);letter-spacing:.03em;background:var(--sand)}\n.ltbl td.tx{font-weight:800;color:var(--good-ink);white-space:nowrap}\n.ph{font-family:var(--mono);font-size:14px;color:var(--muted)}\n.say{min-width:44px;min-height:44px;border-radius:50%;border:2px solid var(--line);background:var(--card);color:var(--primary-ink);display:inline-grid;place-items:center;flex:none;padding:0}\n.say svg{width:18px;height:18px}\n.say.on{background:var(--primary);border-color:var(--primary);color:var(--on-primary)}\n.rules{display:grid;gap:14px;margin:0;padding:0;list-style:none}\n.rules li{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px}\n.rules .n{font-weight:800;font-size:20px;color:var(--good-ink)}\n.rules p{margin:2px 0 0}\n.ex{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px}\n.ex .tx,.lines .tx{font-weight:800;color:var(--good-ink)}\n.lines{display:grid;gap:4px;list-style:none;margin:0;padding:0}\n.lines li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}\n.lines li:last-child{border-bottom:0}\n.lines .tx{font-size:19px}\n.lines .tr{color:var(--muted)}\n.q{font-size:20px;font-weight:700;line-height:1.4}\n.q .gap{display:inline-block;min-width:70px;border-bottom:3px solid var(--primary);text-align:center}\n.opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}\n.opt{min-height:52px;border-radius:12px;border:2px solid var(--line);background:var(--card);color:var(--text);font:700 18px/1.25 var(--font);padding:8px 12px}\n.opt:hover:not(:disabled){border-color:var(--primary)}\n.opt.right{border-color:var(--good);background:var(--good-bg)}\n.opt.wrong{border-color:var(--bad);background:var(--bad-bg)}\n.opt:disabled{cursor:default}\n.lin{width:100%;min-height:52px;border-radius:12px;border:2px solid var(--line);background:var(--card);color:var(--text);font:400 19px var(--font);padding:10px 14px}\n.lin:focus{border-color:var(--primary);outline:none}\n.lform{display:flex;gap:8px;align-items:stretch}\n.lform .btn{min-height:52px}\n.oBuilt{min-height:56px;border:2px dashed var(--line2);border-radius:12px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}\n.oBuilt:empty::before{content:\"Kelimelere sırayla dokun\";color:var(--muted);font-size:15px;padding:0 6px}\n.oPool{display:flex;flex-wrap:wrap;gap:8px}\n.oW{min-height:44px;padding:8px 14px;border-radius:10px;border:2px solid var(--line);background:var(--soft);color:var(--text);font-weight:700;font-size:17px}\n.oW:disabled{opacity:.35}\n.oBuilt .oW{background:var(--primary-bg);border-color:var(--primary)}\n.fb{border-radius:12px;padding:12px 14px;font-size:16px;line-height:1.5}\n.fb.ok{background:var(--good-bg)}\n.fb.no{background:var(--bad-bg)}\n.lmeter{height:8px;border-radius:4px;background:var(--soft);overflow:hidden}\n.lmeter i{display:block;height:100%;background:var(--good);transition:width .3s}\n.ldone{text-align:center;justify-items:center}\n.lbig{font-size:52px;font-weight:800;color:var(--heading);line-height:1}\n.ltopics{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}\n.ltopics span{background:var(--bad-bg);color:var(--bad-ink);border-radius:999px;padding:4px 12px;font-weight:700;font-size:14px}\n.lcoach{display:flex;gap:12px;align-items:center}\n.kav{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;font-weight:800;color:#fff;flex:none;background:var(--en-btn)}\n.kav.it{background:var(--it-btn)}\n.lgoal{display:grid;gap:6px;margin:0;padding:0;list-style:none}\n.lgoal li{display:flex;gap:8px;align-items:baseline}\n.lgoal li::before{content:\"\";width:7px;height:7px;border-radius:50%;background:var(--good);flex:none;transform:translateY(-2px)}\n.askFab{flex:none;min-height:44px;padding:8px 14px;border-radius:999px;border:0;background:#1D6B3D;color:#fff;font:800 15px var(--font);display:inline-flex;align-items:center;gap:6px}\n.askFab[hidden]{display:none}\n.askFab .ico{width:20px;height:20px}\n.ask{position:fixed;right:calc(12px + env(safe-area-inset-right,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));width:min(420px,calc(100vw - 24px));max-height:min(72vh,580px);background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.25);display:grid;grid-template-rows:auto minmax(0,1fr) auto;z-index:56}\n.ask header{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--line)}\n.ask header small{display:block;color:var(--muted);font-size:13px}\n.askLog{display:grid;align-content:start;gap:10px;overflow-y:auto;padding:12px 14px;min-height:120px}\n.askLog .m{max-width:90%;padding:10px 14px;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px;line-height:1.5}\n.askLog .m.c{background:var(--soft);justify-self:start}\n.askLog .m.u{background:var(--primary);color:var(--on-primary);justify-self:end}\n.askLog .m.sys{background:transparent;color:var(--muted);font-size:14px;justify-self:center;text-align:center}\n.ask form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line)}\n.ask textarea{flex:1;min-height:46px;max-height:140px;border-radius:12px;border:2px solid var(--line);background:var(--card);color:var(--text);font:400 16px var(--font);padding:10px 12px;resize:none}\n.ask .btn{min-height:46px}\n.lx{min-width:44px;min-height:44px;border:0;background:transparent;font-size:26px;color:var(--muted);border-radius:10px}\n.kpick{display:grid;gap:16px}\n.kcoaches{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}\n.kco{display:flex;gap:12px;align-items:center;text-align:left;min-height:72px;padding:12px 14px;border-radius:16px;border:2px solid var(--line);background:var(--card);color:var(--text)}\n.kco b{display:block;font-size:17px}\n.kco small{display:block;color:var(--muted);font-size:13.5px}\n.kco[aria-checked=\"true\"]{border-color:var(--primary);background:var(--primary-bg)}\n.kchips{display:flex;flex-wrap:wrap;gap:8px}\n.kchip{min-height:44px;padding:8px 14px;border-radius:999px;border:2px solid var(--line);background:var(--card);color:var(--text);font-weight:700;font-size:15px;text-align:left;max-width:100%}\n.kchip[aria-checked=\"true\"]{border-color:var(--primary);background:var(--primary-bg);color:var(--primary-ink)}\n.kpick h3{margin:0;font-size:16px;color:var(--muted)}\n.kpick .btnRow{display:flex;gap:10px;flex-wrap:wrap}\n.kc{position:fixed;inset:0;z-index:70;background:var(--bg);display:grid;grid-template-rows:auto minmax(0,1fr) auto;padding:calc(10px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}\n.kcTop{display:flex;justify-content:space-between;align-items:center;gap:10px;max-width:760px;width:100%;margin:0 auto}\n.kcTop b{display:block;font-size:19px;color:var(--heading)}\n.kcTop span{color:var(--muted);font-size:14px}\n.kcTime{font-family:var(--mono);font-size:18px;font-weight:700;color:var(--text)!important;font-variant-numeric:tabular-nums}\n.kcMid{display:grid;align-content:center;justify-items:center;gap:16px;overflow-y:auto;max-width:760px;width:100%;margin:0 auto;padding:12px 0}\n.kcOrb{position:relative;width:min(46vw,190px);height:min(46vw,190px);border-radius:50%;border:0;padding:0;background:transparent;display:grid;place-items:center;color:#fff}\n.kcCore{position:relative;z-index:1;width:72%;height:72%;border-radius:50%;display:grid;place-items:center;font-size:26px;font-weight:800;letter-spacing:.04em;background:radial-gradient(circle at 35% 30%,var(--en),var(--en-btn));box-shadow:0 10px 30px rgba(40,80,130,.35)}\n.kc.it .kcCore{background:radial-gradient(circle at 35% 30%,var(--it),var(--it-btn));box-shadow:0 10px 30px rgba(30,110,70,.35)}\n.kcRing{position:absolute;inset:0;border-radius:50%;background:var(--en-bg);opacity:.9}\n.kc.it .kcRing{background:var(--it-bg)}\n.kcOrb[data-st=\"listening\"] .kcRing{animation:kcPulse 1.6s ease-in-out infinite}\n.kcOrb[data-st=\"speaking\"] .kcCore{animation:kcBreath 1.2s ease-in-out infinite}\n.kcOrb[data-st=\"thinking\"] .kcRing{background:conic-gradient(from 0deg,var(--en-bg),var(--en),var(--en-bg));animation:kcSpin 1.4s linear infinite;opacity:.7}\n.kc.it .kcOrb[data-st=\"thinking\"] .kcRing{background:conic-gradient(from 0deg,var(--it-bg),var(--it),var(--it-bg))}\n.kcOrb[data-st=\"idle\"] .kcCore{filter:saturate(.4);opacity:.85}\n@keyframes kcPulse{0%,100%{transform:scale(.92)}50%{transform:scale(1.04)}}\n@keyframes kcBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}\n@keyframes kcSpin{to{transform:rotate(360deg)}}\n@media (prefers-reduced-motion:reduce){.kcOrb .kcRing,.kcOrb .kcCore{animation:none!important}.lmeter i{transition:none}}\n.kcSt{margin:0;font-size:20px;font-weight:800;color:var(--heading)}\n.kcHint{background:var(--accent-bg);border-radius:12px;padding:10px 14px;font-size:16px;max-width:560px;text-align:center}\n.kcCap{display:grid;gap:8px;width:100%;max-width:560px}\n.kcCap p{margin:0;padding:10px 14px;border-radius:14px;font-size:17px;line-height:1.45;background:var(--card);box-shadow:var(--shadow-s)}\n.kcCap p span{display:block;font-size:13px;font-weight:800;color:var(--muted);letter-spacing:.02em}\n.kcCap p.u{background:var(--primary-bg)}\n.kcType{display:grid;gap:6px;width:100%;max-width:560px}\n.kcType div{display:flex;gap:8px}\n.kcType textarea{flex:1;min-height:52px;border-radius:12px;border:2px solid var(--line);background:var(--card);color:var(--text);font:400 17px var(--font);padding:10px 12px;resize:none}\n.kcType .hint{margin:0;color:var(--muted);font-size:14px;text-align:center}\n.kcCtl{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;max-width:560px;width:100%;margin:0 auto}\n.kcB{display:grid;justify-items:center;align-content:center;gap:3px;min-height:64px;border-radius:16px;border:2px solid var(--line);background:var(--card);color:var(--primary-ink);font:700 13px/1.15 var(--font);padding:6px 2px}\n.kcB .ico{width:22px;height:22px}\n.kcB[aria-pressed=\"true\"]{background:var(--primary-bg);border-color:var(--primary)}\n.kcB.end{background:#B83227;border-color:#B83227;color:#fff}\n.kcB:disabled{opacity:.45}\n.kcMid.sum{align-content:start}\n.kcSum{display:grid;gap:14px;width:100%;max-width:600px;align-self:start}\n.kcSum h2{margin:0;color:var(--heading);font-size:24px}\n.kcStats{display:flex;gap:10px;flex-wrap:wrap}\n.kcStats span{background:var(--card);border-radius:12px;padding:8px 14px;font-weight:700;box-shadow:var(--shadow-s)}\n.kcSum h3{margin:6px 0 0;font-size:15px;color:var(--muted);letter-spacing:.03em}\n.kcFix{list-style:none;margin:0;padding:0;display:grid;gap:8px}\n.kcFix li{background:var(--card);border-radius:12px;padding:10px 14px;box-shadow:var(--shadow-s);display:grid;gap:4px}\n.kcFix s{color:var(--bad-ink);text-decoration-thickness:1px}\n.kcFix b{color:var(--good-ink)}\n.kcPh li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center}\n.kcPh small{display:block;color:var(--muted)}\n.kcAdd{min-height:44px;padding:6px 12px;border-radius:10px;border:2px solid var(--line);background:var(--soft);color:var(--primary-ink);font-weight:700;font-size:14px}\n.kcAdd:disabled{opacity:.6}\n@media (max-width:520px){.lcard{padding:18px}.lpath button{font-size:12px;min-height:52px}.lane{grid-template-columns:1fr}.kcoaches{grid-template-columns:1fr}.kcB{font-size:13px}}\n.lrcs{display:none;gap:8px}\n.lrc{border:1px solid var(--line);border-radius:12px;padding:8px 12px;display:grid;gap:4px;background:var(--sand)}\n.lrcH{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:18px;font-weight:800}\n.lrcR{display:flex;gap:8px;align-items:baseline;font-size:15px;overflow-wrap:normal;word-break:normal}\n.lrcR span{color:var(--muted);font-size:13px;min-width:72px}\n.lrcR b{font-weight:600}\n@media (max-width:599px){.lrcs{display:grid}.lrcs+.ltbl{display:none}}\n.ltbl td{overflow-wrap:normal;word-break:normal;hyphens:manual}\n.askLog .m .tx{color:var(--good-ink)}\n.askLog .m.c .say{vertical-align:middle;margin-left:4px;width:40px;height:40px;min-width:40px;min-height:40px}\n.lsum{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}\n.lsum span{display:inline-flex;align-items:center;gap:6px;background:var(--soft);border-radius:999px;padding:6px 12px;font-weight:700}\n.lsum .ico{width:18px;height:18px}\n@media (max-width:430px){.lsnBt small{display:none}.lsnBt h1{font-size:16px;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}}\n.xinfo{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0}\n.xinfo div{background:var(--soft);border-radius:12px;padding:10px 12px;text-align:center}\n.xinfo dt{font-size:13px;font-weight:700;color:var(--muted)}\n.xinfo dd{margin:2px 0 0;font-size:18px;white-space:nowrap;font-weight:800;color:var(--heading)}\n.xgrp{border-top:1px solid var(--line);padding-top:12px;display:grid;gap:8px}\n.xgh{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}\n.xgrp ul{margin:0;padding:0;list-style:none;display:grid;gap:10px}\n.xgrp li{background:var(--soft);border-radius:12px;padding:10px 12px}\n.xgrp li p{margin:0 0 4px}\n.xa{font-size:15px}.xa s{color:var(--bad-ink)}.xw{font-size:15px;color:var(--muted)}\n.kcl{display:grid;gap:8px;margin-top:4px}\n.kcl .btn{justify-content:center;text-decoration:none}\n";
const T=window.TYDIL, C=T.core, esc=C.esc, ICON=C.ICON, FLAG=C.FLAG;
{const st=document.createElement("style"); st.id="lsnCss"; st.textContent=LCSS; document.head.appendChild(st);}
const md=s=>esc(s).replace(/\*\*([^*\n]+?)\*\*/g,"<b>$1</b>");
const LN={it:"İtalyanca",en:"İngilizce"};
const COACH={it:{name:"Chiara",to:"Chiara'ya",mono:"CH"},en:{name:"Oliver",to:"Oliver'a",mono:"OL"}};
const SPK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/></svg>';
function spoken(t){return String(t||"").replace(/\[\[(?:it|en|tr):\s*([^\]]*?)\s*\]\]/g,"$1").replace(/https?:\/\/\S+/g," ").replace(/\[[^\]]*\]/g," ").replace(/\([^)]*\)/g," ")
  .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu,"").replace(/[*_#`>|~<{}]+/g," ").replace(/^\s*[-•]\s+/gm,"").replace(/\s+([,.;:!?])/g,"$1").replace(/\s+/g," ").trim();}
function sentences(t){return (spoken(t).match(/[^.!?…]+(?:[.!?…]+["'»)]*|$)/g)||[]).map(s=>s.trim()).filter(s=>/[\p{L}\p{N}]/u.test(s));}
const TTS={job:null};
const ttsOk=()=>C.ttsOk();
const tagOf=l=>l==="it"?"it-IT":l==="en"?"en-GB":"tr-TR";
function speak(src,lang,o){o=o||{}; ttsStop(); if(!ttsOk())return Promise.resolve({done:false});
  const list=Array.isArray(src)?src:sentences(src); const job={q:list.slice(),cancelled:false,lang,rate:o.rate||C.rate(),open:!!o.open}; TTS.job=job;
  return new Promise(res=>{job.res=res; ttsNext(job);});}
function ttsPush(s){const j=TTS.job; if(!j||j.cancelled)return; j.q.push(s); if(!j.busy&&!j.ended)ttsNext(j);}
function ttsClose(){const j=TTS.job; if(!j)return; j.open=false; if(!j.busy&&!j.q.length)ttsFin(j,{done:true});}
function ttsFin(j,r){if(j.ended)return; j.ended=true; clearTimeout(j.w); if(TTS.job===j)TTS.job=null; j.res(r);}
function ttsNext(j){if(j.cancelled)return ttsFin(j,{cancelled:true}); const s=j.q.shift(); if(s==null){j.busy=false; if(!j.open)ttsFin(j,{done:true}); return;}
  j.busy=true; const SY=window.speechSynthesis, u=new SpeechSynthesisUtterance(s); u.lang=tagOf(j.lang); u.rate=j.rate; const v=C.voiceFor(j.lang); if(v)u.voice=v;
  const go=()=>{clearTimeout(j.w); if(!j.cancelled)ttsNext(j);};
  u.onend=go; u.onerror=e=>{const c=e&&e.error; if(c==="interrupted"||c==="canceled"){clearTimeout(j.w); return ttsFin(j,{cancelled:true});} go();};
  clearTimeout(j.w); j.w=setTimeout(()=>{try{SY.cancel();}catch(e){} go();},2500);
  u.onstart=()=>{clearTimeout(j.w); j.w=setTimeout(()=>{try{SY.cancel();}catch(e){} go();},Math.min(30000,3000+s.length*90));};
  try{SY.speak(u);}catch(e){go();}}
function ttsStop(){const j=TTS.job; if(j){j.cancelled=true; TTS.job=null; clearTimeout(j.w); ttsFin(j,{cancelled:true});} try{if(ttsOk())window.speechSynthesis.cancel();}catch(e){} document.querySelectorAll(".say.on").forEach(b=>b.classList.remove("on"));}
const sayBtn=(t,lang,label)=>`<button type="button" class="say" data-say="${esc(t)}" data-sl="${lang}" aria-label="${esc(label||("Dinle: "+t))}">${SPK}</button>`;
function coachErr(e){const c=e&&e.code; return c==="capability_disabled"||c==="session_expired"?"Koç için Ayarlar → Claude bağlantısı'ndan anahtar gir.":c==="rate_limited"?"Şu an çok istek var. Biraz sonra tekrar dene.":c==="cancelled"?"":"Bağlantı kurulamadı. Tekrar dene.";}
function coachReady(){const s=C.sample(); if(!s)return "Koç hazırlanıyor; birkaç saniye sonra tekrar dene."; const lk=C.locked(); if(lk)return lk; return "";}
const norm=s=>String(s||"").toLowerCase().replace(/[.!?¿¡,;:"'’‘`´«»“”]/g,"").replace(/\s+/g," ").trim();
const deacc=s=>norm(s).normalize("NFD").replace(/[̀-ͯ]/g,"");
const arr=v=>Array.isArray(v)?v:v==null?[]:[v];
function judge(item,val){if(item.t==="choice")return val===item.a?"ok":"no";
  const v=norm(val), A=arr(item.a).concat(arr(item.alt));
  if(A.some(a=>norm(a)===v))return "ok";
  if(arr(item.soft).some(a=>norm(a)===v)||A.some(a=>deacc(a)===deacc(val)))return "soft";
  return "no";}
const ansOf=item=>arr(item.a)[0]||"";
const cap=s=>String(s).replace(/^./,c=>c.toUpperCase());
const STEPS=[["anlat","Anlat"],["dinle","Dinle"],["uygula","Uygula"],["konus","Konuş"],["yokla","Yokla"]];
const L={id:"",d:null,lang:"it",coach:"it",step:0,done:[0,0,0,0,0],page:0,pr:{i:0,score:0,ans:false},qz:{i:0,score:0,ans:false,miss:[]},pk:null,ask:[],askBusy:false,open:false,ms:0,msDate:"",act:0,tick:0,tok:"",konus:null,order:[]};
const $l=s=>document.querySelector("#lsn "+s);
function lsnEl(){let el=document.getElementById("lsn"); if(el)return el;
  el=document.createElement("div"); el.id="lsn"; el.className="lsn"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-labelledby","lsnT"); el.lang="tr"; el.hidden=true;
  el.innerHTML=`<div class="lsnSticky"><div class="lsnBar"><button type="button" class="lsnX" id="lsnX">${ICON("arrow")}<span>Çık</span></button>
      <div class="lsnBt"><small id="lsnEye"></small><h1 id="lsnT"></h1></div>
      <button type="button" class="askFab" id="askFab" aria-expanded="false" aria-controls="ask">${ICON("ask")}<span>Koça sor</span></button></div>
    <ol class="lpath" id="lpath" aria-label="Dersin adımları"></ol></div>
   <div class="lsnIn"><p class="lead lsnLead" id="lsnLead"></p><main id="lstage"></main></div>
   <section class="ask" id="ask" hidden aria-label="Koça sor"><header><div><strong id="askWho">Koça sor</strong><small id="askCtx"></small></div><button type="button" class="lx" id="askX" aria-label="Kapat">×</button></header>
    <div class="askLog" id="askLog" aria-live="polite"></div><form id="askForm"><label class="cc-vh" for="askIn">Sorun</label><textarea id="askIn" rows="1" placeholder="Takıldığın yeri yaz…"></textarea><button type="submit" class="btn btn-primary btn-sm" id="askSend">Sor</button></form></section>`;
  document.body.appendChild(el); el.addEventListener("click",onClick); el.addEventListener("submit",onSubmit); el.addEventListener("keydown",onKey);
  el.addEventListener("pointerdown",()=>{L.act=Date.now();},{passive:true}); el.addEventListener("keydown",()=>{L.act=Date.now();},{passive:true});
  return el;}
function today(){return C.today();}
function progDoc(){return C.lxP(L.id);}
async function save(extra){const db=C.db; if(!db)return; const p=progDoc();
  const rec=Object.assign({},p,{step:L.step,done:L.done.map(Boolean),page:L.page,p:{i:L.pr.i,score:L.pr.score},ms:{date:L.msDate,v:Math.round(L.ms)},updated:new Date().toISOString()},extra||{});
  C.LX.prog[L.id]=rec; try{await db.collection("lessons").doc(L.id).set(rec);}catch(e){} }
function tick(){if(!L.open||document.hidden||K.call)return; if(Date.now()-L.act>180000)return; const t=today(); if(L.msDate!==t){L.msDate=t; L.ms=0;} L.ms+=15000;}
async function open(id,o){o=o||{}; let d, wk=null; try{d=await C.lxGet(id); if(o.week&&o.week.length>1)wk=await Promise.all(o.week.map(x=>C.lxGet(x)));}catch(e){C.fNotice(e.message||"Ders açılamadı."); return;}
  const bad=validate(d); if(bad){C.fNotice("Ders dosyası hatalı: "+bad); return;}
  if(L.open)close(true);
  const p=C.lxP(id); Object.assign(L,{id,d,lang:d.lang==="en"?"en":"it",coach:d.konus&&d.konus.coach==="oliver"?"en":d.konus&&d.konus.coach==="chiara"?"it":(d.lang==="en"?"en":"it"),
    done:[0,1,2,3,4].map(i=>!!(p.done&&p.done[i])),step:Math.min(4,Math.max(0,+p.step||0)),page:0,pr:{i:+(p.p&&p.p.i)||0,score:+(p.p&&p.p.score)||0,ans:false},qz:{i:0,score:0,ans:false,miss:[]},
    ex:d.kind==="exam"?{stage:"intro",i:0,score:0,ans:false,miss:[],log:[]}:null,pk:d.kind!=="exam"&&o.pk&&d.pekistir&&Array.isArray(d.pekistir.items)?{i:0,score:0,ans:false,talk:false,items:wk?[].concat(...wk.map(x=>arr(x.pekistir&&x.pekistir.items).slice(0,4))):d.pekistir.items}:null,week:wk?o.week.slice():null,ask:[],sum:null,open:true,act:Date.now(),msDate:p.ms&&p.ms.date===today()?p.ms.date:today(),ms:p.ms&&p.ms.date===today()?+p.ms.v||0:0});
  if(L.pr.i>=(d.uygula||[]).length&&!L.done[2])L.pr={i:0,score:0,ans:false};
  const el=lsnEl(); el.hidden=false; el.scrollTop=0; document.documentElement.classList.add("lsn-on"); C.ccStop();
  L.tok=Math.random().toString(36).slice(2,9); try{history.pushState({lsn:L.tok},"",location.pathname+location.search+"#ders-"+id); L.pushed=true;}catch(e){L.pushed=false;}
  clearInterval(L.tick); L.tick=setInterval(tick,15000);
  render(); const x=$l("#lsnX"); if(x)x.focus({preventScroll:true});}
function close(quiet){if(!L.open)return; tick(); if(!L.ex)save(); L.open=false; clearInterval(L.tick); ttsStop(); closeAsk(true); if(K.call)kEnd(true);
  const el=document.getElementById("lsn"); if(el)el.hidden=true; document.documentElement.classList.remove("lsn-on");
  if(L.pushed&&!quiet){L.pushed=false; try{if(history.state&&history.state.lsn===L.tok)history.back();}catch(e){}}
  else if(location.hash.indexOf("#ders-")===0){try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}}
  C.lxPaint(); C.renderLive();}
window.addEventListener("popstate",e=>{if(L.open&&!(e.state&&e.state.lsn===L.tok)){L.pushed=false; close(true);}});
function validate(d){if(!d||typeof d!=="object")return "JSON nesnesi değil"; if(!d.id||!d.title)return "id/title yok"; if(!(d.lang==="it"||d.lang==="en"))return "lang it|en olmalı";
  if(d.kind==="exam"){if(!Array.isArray(d.items)||d.items.length<10)return "sınav: en az 10 soru"; if(typeof d.pass!=="number"||!(d.pass>0&&d.pass<=d.items.length))return "sınav: pass sayı olmalı";
    for(const it of d.items){const e=itemErr(it); if(e)return "items: "+e; if(!it.topic||!it.from)return "items: topic/from yok ("+it.q+")";} return "";}
  if(!Array.isArray(d.anlat)||!d.anlat.length)return "anlat boş"; for(const c of d.anlat){if(!c||!Array.isArray(c.blocks))return "anlat kartında blocks yok"; for(const b of c.blocks){if(!b||!BLOCK[b.type])return "bilinmeyen blok: "+(b&&b.type);}}
  if(!Array.isArray(d.dinle)||!d.dinle.every(x=>x&&x.x))return "dinle hatalı";
  const items=(a,n)=>{if(!Array.isArray(a)||!a.length)return n+" boş"; for(const it of a){const e=itemErr(it); if(e)return n+": "+e;} return "";};
  return items(d.uygula,"uygula")||items(d.yokla,"yokla")||(d.konus&&typeof d.konus==="object"?"":"konus yok")||(d.pekistir&&d.pekistir.items?items(d.pekistir.items,"pekistir"):"");}
function itemErr(it){if(!it||!it.q)return "soru metni yok";
  if(it.t==="choice")return Array.isArray(it.o)&&it.o.includes(it.a)?"":"choice: a seçeneklerde yok ("+it.q+")";
  if(it.t==="type")return arr(it.a).length?"":"type: a boş";
  if(it.t==="order")return Array.isArray(it.words)&&it.words.length&&arr(it.a).length?"":"order: words/a eksik";
  return "bilinmeyen tür: "+it.t;}
const unlocked=i=>i===0||L.done[i-1]||L.done[i]||!!progDoc().passed;
function render(){const d=L.d; $l("#lsnEye").innerHTML=FLAG(L.lang)+esc(LN[L.lang]+" "+(d.level||"")+(L.ex?" · Sınav":L.pk?" · Pekiştir":" · Ders"));
  $l("#askFab").hidden=!!L.ex||!$l("#ask").hidden; $l("#lpath").hidden=!!L.ex;
  if(L.ex){$l("#lsnT").textContent=d.title; const ld=$l("#lsnLead"); ld.innerHTML=md(d.lead||""); ld.hidden=L.ex.stage!=="intro"||!d.lead;
    $l("#lstage").innerHTML=L.ex.stage==="intro"?vExIntro():L.ex.i>=d.items.length?vExRes():`<section class="lcard">${qView(d.items[L.ex.i],L.ex,d.items.length,"x")}</section>`;
    const f=$l("#lstage [data-focus]"); if(f)f.focus({preventScroll:true}); return;}
  $l("#lsnT").textContent=L.week?"Haftanın Pekiştir'i":d.title; const lead=$l("#lsnLead"); lead.innerHTML=L.pk?(L.week?"Haftanın derslerini pekiştir: kısa sorular, sonra kısa konuşma.":"Dünkü dersi pekiştir: kısa sorular, sonra kısa konuşma."):md(d.lead||""); lead.hidden=!L.pk&&!(L.step===0&&L.page===0&&d.lead);
  const path=$l("#lpath");
  if(L.pk){const ps=[["Sorular",!!L.pk.talk||L.pk.i>=L.pk.items.length],["Konuş",false]]; path.style.setProperty("--n",2);
    path.innerHTML=ps.map((s,i)=>`<li><button type="button" disabled class="${s[1]?"done":""}" ${(i===0)!==!!L.pk.talk?'aria-current="step"':""}><span>${s[1]?"✓":i+1}</span>${s[0]}</button></li>`).join("");}
  else{path.style.setProperty("--n",5); path.innerHTML=STEPS.map((s,i)=>`<li><button type="button" data-step="${i}" ${i===L.step?'aria-current="step"':""} class="${L.done[i]?"done":""}" ${unlocked(i)?"":"disabled"}><span>${L.done[i]?"✓":i+1}</span>${s[1]}</button></li>`).join("");}
  const k=L.pk?(L.pk.talk?"pkTalk":"pk"):STEPS[L.step][0];
  $l("#lstage").innerHTML=({anlat:vAnlat,dinle:vDinle,uygula:vUygula,konus:vKonus,yokla:vYokla,pk:vPk,pkTalk:vPkTalk})[k]();
  $l("#askWho").textContent=COACH[L.lang].to+" sor"; $l("#askCtx").textContent="Şu an: "+ctxName();
  const f=$l("#lstage [data-focus]"); if(f)f.focus({preventScroll:true});}
function go(i){if(!unlocked(i))return; L.step=i; if(i===0)L.page=0; save(); render(); const el=document.getElementById("lsn"); if(el)el.scrollTo({top:0,behavior:"auto"});}
function finish(i){L.done[i]=true; if(i<4)go(i+1); else{save(); render();}}
const BLOCK={
  p:b=>`<p>${md(b.text)}</p>`,
  note:b=>`<p class="lnote${b.warn?" warn":""}">${md(b.text)}</p>`,
  compare:b=>`<div class="compare">${arr(b.rows).map(r=>`<div class="lane"><b>${md(r.label)}</b><div class="blks">${arr(r.items).map(x=>`<span class="blk${x.hl?" v":""}">${md(x.t)}${x.s?`<small>${md(x.s)}</small>`:""}</span>`).join("")}</div></div>`).join("")}</div>`,
  table:b=>{const x=Number.isInteger(b.x)?b.x:-1, say=Array.isArray(b.say)?b.say:null, sp=say||x>=0, H=arr(b.head);
    const cards=`<div class="lrcs">${arr(b.rows).map((r,ri)=>{r=arr(r); const k=x>=0?x:0, t=say?say[ri]:x>=0?String(r[x]||"").replace(/\*\*/g,""):"";
      return `<div class="lrc"><div class="lrcH"><span class="${x>=0?"tx":""}">${md(r[k])}</span>${t?sayBtn(t,L.lang):""}</div>${r.map((c,ci)=>ci===k||c===""||c==null?"":`<div class="lrcR"><span>${md(H[ci]||"")}</span><b>${md(c)}</b></div>`).join("")}</div>`;}).join("")}</div>`;
    return cards+`<div class="ltbl" tabindex="0" role="region" aria-label="Tablo"><table>${arr(b.head).length?`<thead><tr>${b.head.map(h=>`<th>${md(h)}</th>`).join("")}${sp?"<th></th>":""}</tr></thead>`:""}<tbody>${arr(b.rows).map((r,ri)=>{const t=say?say[ri]:x>=0?String(arr(r)[x]||"").replace(/\*\*/g,""):"";
      return `<tr>${arr(r).map((c,ci)=>`<td class="${ci===x?"tx":""}">${md(c)}</td>`).join("")}${sp?`<td>${t?sayBtn(t,L.lang):""}</td>`:""}</tr>`;}).join("")}</tbody></table></div>`;},
  rules:b=>`<ol class="rules">${arr(b.items).map((r,i)=>`<li><span class="n">${i+1}</span><div><b>${md(r.title)}</b>${r.text?`<p>${md(r.text)}</p>`:""}${r.ex&&r.ex.x?`<div class="ex"><span class="tx">${md(r.ex.x)}</span>${sayBtn(r.ex.x.replace(/\*\*/g,""),L.lang)}${r.ex.tr?`<span>= ${md(r.ex.tr)}</span>`:""}</div>`:""}</div></li>`).join("")}</ol>`,
  examples:b=>`<ul class="lines">${arr(b.items).map(e=>`<li>${sayBtn(String(e.x).replace(/\*\*/g,""),L.lang)}<div><div class="tx">${md(e.x)}</div>${e.ph?`<div class="ph">${md(e.ph)}</div>`:""}${e.tr?`<div class="tr">${md(e.tr)}</div>`:""}</div></li>`).join("")}</ul>`
};
function vAnlat(){const cards=L.d.anlat, pg=Math.min(L.page,cards.length-1), c=cards[pg];
  const dots=`<div class="lsub" aria-hidden="true">${cards.map((x,i)=>`<i class="${i<=pg?"on":""}"></i>`).join("")}</div>`;
  return `<section class="lcard" aria-labelledby="lh">${dots}<p class="lk">Anlat · ${pg+1} / ${cards.length}</p><h2 id="lh" data-focus tabindex="-1">${md(c.title||"")}</h2>${c.blocks.map(b=>BLOCK[b.type](b)).join("")}
   <div class="lnav"><button type="button" class="btn btn-ghost" data-act="aPrev" ${pg===0?"disabled":""}>Geri</button><button type="button" class="btn btn-primary" data-act="aNext">${pg<cards.length-1?"Devam":"Anlatım bitti → Dinle"}</button></div></section>`;}
function vDinle(){const lines=L.d.dinle;
  return `<section class="lcard"><h2 data-focus tabindex="-1">Dinle ve tekrar et</h2><p class="lead">Her cümleyi dinle, sonra yüksek sesle tekrar et.${L.lang==="it"?" Büyük harfli hece vurgulu okunur.":""}</p>
   <div class="lrow"><button type="button" class="btn btn-soft" data-act="playAll">${ICON("sesli")}Hepsini sırayla dinle</button><button type="button" class="btn btn-ghost" data-act="slow">Yavaş dinle</button></div>
   <ul class="lines">${lines.map(l=>`<li>${sayBtn(l.x,L.lang)}<div><div class="tx">${esc(l.x)}</div>${l.ph?`<div class="ph">${esc(l.ph)}</div>`:""}${l.tr?`<div class="tr">${esc(l.tr)}</div>`:""}</div></li>`).join("")}</ul>
   <div class="lnav"><button type="button" class="btn btn-ghost" data-act="toStep" data-to="0">Anlatıma dön</button><button type="button" class="btn btn-primary" data-act="finish" data-i="1">Tekrar ettim → Uygula</button></div></section>`;}
function qView(item,st,total,kind){
  const head=`<div class="lmeter" aria-hidden="true"><i style="width:${Math.round(st.i/total*100)}%"></i></div><p class="lk">${kind==="q"?"Yoklama":kind==="k"?"Pekiştir":kind==="x"?"Soru":"Alıştırma"} ${st.i+1} / ${total}</p>`;
  const q=String(item.q).includes("___")?md(item.q).replace("___",'<span class="gap">&nbsp;</span>'):md(item.q);
  let input;
  if(item.t==="choice")input=`<div class="opts" role="group" aria-label="Seçenekler">${item.o.map(o=>`<button type="button" class="opt" data-ans="${esc(o)}" data-kind="${kind}">${esc(o)}</button>`).join("")}</div>`;
  else if(item.t==="order"){L.order=[]; input=`<div class="oBuilt" id="oBuilt" aria-live="polite"></div><div class="oPool" role="group" aria-label="Kelimeler">${item.words.map((w,i)=>`<button type="button" class="oW" data-ow="${i}">${esc(w)}</button>`).join("")}</div>
     <div class="lrow"><button type="button" class="btn btn-ghost btn-sm" data-act="oUndo">Geri al</button><button type="button" class="btn btn-primary" data-act="oCheck" data-kind="${kind}">Kontrol</button></div>`;}
  else input=`<form data-form="${kind}" class="lform"><label class="cc-vh" for="ans_${kind}">Cevabın</label><input type="text" class="lin" id="ans_${kind}" autocomplete="off" autocapitalize="off" spellcheck="false" lang="${L.lang}" placeholder="${LN[L.lang]} yaz"><button class="btn btn-primary" type="submit">Kontrol</button></form>${item.hint&&kind!=="q"&&kind!=="x"?`<p class="lnote">İpucu: ${md(item.hint)}</p>`:""}`;
  return `${head}<p class="q" data-focus tabindex="-1">${q}</p>${input}<div id="fb_${kind}" aria-live="polite"></div>`;}
function feedback(kind,item,val,res){const box=$l("#fb_"+kind); let h;
  if(res==="ok")h=`<div class="fb ok"><b>Doğru.</b> ${md(item.ok||"")}</div>`;
  else if(res==="soft")h=`<div class="fb ok"><b>Doğru sayıldı.</b> ${item.soft_note?md(item.soft_note):`Doğru yazımı: <b>${esc(cap(ansOf(item)))}</b>.`}</div>`;
  else{const why=whyOf(item,val)||(kind!=="q"&&kind!=="x"?item.hint||"":""); h=`<div class="fb no"><b>Doğrusu: ${esc(ansOf(item))}</b>${why?"<br>"+md(why):""}</div>`;}
  h+=`<div class="lrow" style="margin-top:12px"><button type="button" class="btn btn-primary" data-act="next" data-kind="${kind}" data-focusnext>Sonraki</button>${res==="no"&&kind!=="q"&&kind!=="x"?`<button type="button" class="btn btn-ghost" data-act="askWhy">${ICON("ask")}Koça neden diye sor</button>`:""}</div>`;
  box.innerHTML=h; L.lastQ={q:item.q,val,a:ansOf(item)};
  document.querySelectorAll("#lstage .opt").forEach(o=>{o.disabled=true; if(o.dataset.ans===ansOf(item))o.classList.add("right"); else if(o.dataset.ans===val)o.classList.add("wrong");});
  document.querySelectorAll("#lstage .lform input,#lstage .lform button,#lstage .oW,#lstage [data-act=oCheck],#lstage [data-act=oUndo]").forEach(x=>x.disabled=true);
  const b=box.querySelector("[data-focusnext]"); if(b)b.focus({preventScroll:true});}
const whyOf=(item,val)=>item.t==="choice"&&item.why&&item.why[val]?item.why[val]:typeof item.why==="string"?item.why:"";
function stOf(kind){return kind==="p"?L.pr:kind==="q"?L.qz:kind==="x"?L.ex:L.pk;}
function itemsOf(kind){return kind==="p"?L.d.uygula:kind==="q"?L.d.yokla:kind==="x"?L.d.items:L.pk.items;}
function answer(kind,val){const st=stOf(kind), item=itemsOf(kind)[st.i]; if(!item||st.ans)return; st.ans=true; L.act=Date.now();
  const res=judge(item,val); if(res!=="no")st.score++; else if(kind==="q"||kind==="x")st.miss.push(item.topic||"Genel tekrar");
  if(kind==="x")st.log.push({item,val,res});
  feedback(kind,item,val,res); if(kind==="p")save();}
function vUygula(){const st=L.pr, U=L.d.uygula, n=U.length;
  if(st.i>=n){const good=st.score>=Math.ceil(n*0.75);
    return `<section class="lcard ldone"><p class="lk">Alıştırma bitti</p><p class="lbig">${st.score} / ${n}</p><p class="lead">${good?"İyi gidiyorsun. Şimdi "+COACH[L.coach].name+" ile bu kalıpları konuşarak kullan.":"Yanlış yaptıklarını bir kez daha gözden geçir, sonra konuşmaya geç."}</p>
     <div class="lrow"><button type="button" class="btn btn-ghost" data-act="redoP">Alıştırmayı baştan yap</button><button type="button" class="btn btn-primary" data-act="finish" data-i="2">Konuşmaya geç</button></div></section>`;}
  return `<section class="lcard">${qView(U[st.i],st,n,"p")}</section>`;}
function vKonus(){const k=L.d.konus||{}, c=COACH[L.coach], s=L.konus;
  const lk=coachReady();
  return `<section class="lcard"><div class="lcoach"><span class="kav ${L.coach}" aria-hidden="true">${c.mono}</span><div><h2 data-focus tabindex="-1">${c.name} ile konuş</h2><p class="lead">Telefonla konuşur gibi: ${c.name} kısa sorular sorar, sen sesli cevap verirsin.</p></div></div>
   ${k.goal?`<p><b>Hedef:</b> ${md(k.goal)}</p>`:""}${arr(k.structures).length?`<ul class="lgoal">${k.structures.map(x=>`<li>${md(x)}</li>`).join("")}</ul>`:""}
   ${s?`<p class="fb ok"><b>Konuşma tamam · ${s.mins} dk.</b> ${s.fixes?s.fixes+" düzeltme, ":""}${s.phrases?s.phrases+" faydalı ifade.":""}</p>`:""}
   ${lk?`<p class="lnote">${esc(lk)} Bu adımı şimdilik atlayabilirsin.</p>`:""}
   <div class="lrow"><button type="button" class="btn ${s?"btn-soft":"btn-primary"}" data-act="call" ${lk?"disabled":""}>${ICON("speaking")}${s?"Yeniden konuş":"Aramayı başlat"}</button></div>
   <div class="lnav"><button type="button" class="btn btn-ghost" data-act="toStep" data-to="2">Alıştırmaya dön</button><button type="button" class="btn ${s||lk?"btn-primary":"btn-ghost"}" data-act="finish" data-i="3">Konuşmayı bitirdim → Yokla</button></div></section>`;}
function vYokla(){const st=L.qz, Q=L.d.yokla, n=Q.length, pass=+L.d.pass||Math.ceil(n*0.8);
  if(st.i>=n){const ok=st.score>=pass, miss=[...new Set(st.miss)], sm=L.sum, nx=ok&&C.lxNext?C.lxNext():null;
    if(ok)return `<section class="lcard ldone"><p class="lk">Ders tamam</p><p class="lbig">${st.score} / ${n}</p><p class="lead">Konu tamamlandı olarak işaretlendi; yarın kısa bir Pekiştir gelir.</p>
     <div class="lsum">${sm?`<span>${ICON("clock")} ${sm.mins} dk</span><span>${ICON("deck")} ${sm.words?sm.words+" kelime kartlara eklendi":"Kartlar zaten vardı"}</span>`:""}</div>
     ${sm&&sm.miss.length?`<p class="lk">Dikkat edeceğin konular</p><div class="ltopics">${sm.miss.map(m=>`<span>${esc(m)}</span>`).join("")}</div>`:""}
     <div class="lrow">${nx?`<button type="button" class="btn btn-primary" data-act="planNext">Sıradaki: ${esc(nx.label)}${ICON("arrow")}</button>`:""}<button type="button" class="btn ${nx?"btn-ghost":"btn-primary"}" data-act="close">${nx?"Kapat":"Bitir"}</button><button type="button" class="btn btn-ghost" data-act="redoQ">Yoklamayı tekrar et</button></div></section>`;
    return `<section class="lcard ldone"><p class="lk">Henüz değil</p><p class="lbig">${st.score} / ${n}</p>
     <p class="lead">Geçmek için ${n} sorudan en az ${pass} doğru olmalı. Tekrar bakman gereken konular:</p>
     ${miss.length?`<div class="ltopics">${miss.map(m=>`<span>${esc(m)}</span>`).join("")}</div>`:""}
     <div class="lrow"><button type="button" class="btn btn-ghost" data-act="toStep" data-to="0">Anlatıma dön</button><button type="button" class="btn btn-primary" data-act="redoQ">Yoklamayı tekrar et</button></div></section>`;}
  return `<section class="lcard">${qView(Q[st.i],st,n,"q")}</section>`;}
function vPk(){const st=L.pk, P=st.items, n=P.length;
  if(st.i>=n)return `<section class="lcard ldone"><p class="lk">Sorular bitti</p><p class="lbig">${st.score} / ${n}</p><p class="lead">Şimdi kısa bir konuşma: ${esc(COACH[L.coach].name)} seninle aynı kalıpları kullanır.</p>
    <div class="lrow"><button type="button" class="btn btn-primary" data-act="pkTalk">Konuşmaya geç</button></div></section>`;
  return `<section class="lcard">${qView(P[st.i],st,n,"k")}</section>`;}
function vPkTalk(){const c=COACH[L.coach], lk=coachReady(), s=L.konus;
  return `<section class="lcard"><div class="lcoach"><span class="kav ${L.coach}" aria-hidden="true">${c.mono}</span><div><h2 data-focus tabindex="-1">Kısa konuşma</h2><p class="lead">${md(L.d.pekistir.konus_prompt||"Dünkü kalıplarla 3–4 dakika konuş.")}</p></div></div>
   ${s?`<p class="fb ok"><b>Konuşma tamam · ${s.mins} dk.</b></p>`:""}${lk?`<p class="lnote">${esc(lk)}</p>`:""}
   <div class="lrow"><button type="button" class="btn ${s?"btn-soft":"btn-primary"}" data-act="call" ${lk?"disabled":""}>${ICON("speaking")}${s?"Yeniden konuş":"Aramayı başlat"}</button></div>
   <div class="lnav"><button type="button" class="btn btn-ghost" data-act="full">Dersi baştan aç</button><button type="button" class="btn btn-primary" data-act="pkDone">Pekiştirmeyi bitir</button></div></section>`;}
function minsNow(){tick(); return Math.max(1,Math.round(L.ms/60000));}
function lessonCards(){const d=L.d, out=[], seen=new Set(), clean=x=>String(x||"").replace(/\*\*/g,"").trim();
  const ex={}; arr(d.anlat).forEach(c=>arr(c.blocks).forEach(b=>{if(b.type==="examples")arr(b.items).forEach(e=>{if(e.x&&e.tr)ex[norm(clean(e.x))]=clean(e.tr);});}));
  arr(d.konus&&d.konus.vocab).forEach(v=>{const t=ex[norm(v)]; if(t)out.push({f:clean(v),tr:t});});
  arr(d.dinle).forEach(l=>{if(l.x&&l.tr)out.push({f:clean(l.x),tr:clean(l.tr),ex:l.ph?clean(l.ph):""});});
  return out.filter(w=>{const k=w.f.toLowerCase(); if(seen.has(k))return false; seen.add(k); return true;});}
async function addCards(){const db=C.db; if(!db)return 0; const lang=L.lang, due=C.addDays(today(),1), now=new Date().toISOString(); let n=0;
  for(const w of lessonCards()){if(C.S.cards.some(c=>c.lang===lang&&String(c.f||"").toLowerCase()===w.f.toLowerCase()))continue;
    try{await db.collection("cards").add({lang,f:w.f.slice(0,120),tr:w.tr.slice(0,160),ex:(w.ex||"").slice(0,240),box:1,due,added:now,src:"lesson:"+L.id}); n++;}catch(e){}}
  return n;}
function missAll(){return [...new Set(arr(progDoc().miss).concat(L.qz.miss))].slice(0,10);}
async function lessonSession(extra){const t=today(), m=minsNow(), lang=L.lang;
  const mins=lang==="it"?{gramer:Math.ceil(m*0.7),okuma:m-Math.ceil(m*0.7)}:{gramer:m};
  try{await C.upsertSession("lesson-"+t+"-"+L.id,Object.assign({date:t,lang,mins,total:m,topic:C.topicById(L.id)?L.id:"",mistakes:missAll().map(x=>x+" ("+L.d.title+")"),note:"",next:"",created:new Date().toISOString(),words:0,src:"lesson"},extra||{}));}catch(e){}
  return m;}
async function passLesson(){const t=today(), p=progDoc(), db=C.db, lang=L.lang, first=!p.passed;
  await save({passed:true,passedAt:p.passed?p.passedAt:t,best:Math.max(+p.best||0,L.qz.score),last:L.qz.score,attempts:(+p.attempts||0)+1,miss:missAll()});
  if(!db)return;
  try{if(C.topicById(L.id))await C.setTopic(L.id,"done");}catch(e){}
  const words=first?await addCards():0;
  const m=await lessonSession({note:"Ders geçildi: "+L.d.title+" ("+L.qz.score+"/"+L.d.yokla.length+")",words});
  C.lxFin(lang,lang==="it"?["kelime","gramer","okuma","sesli"]:["kelime","gramer","okuma"]);
  L.sum={mins:m,words,miss:missAll()};}
async function failLesson(){const p=progDoc(); await save({best:Math.max(+p.best||0,L.qz.score),last:L.qz.score,attempts:(+p.attempts||0)+1,miss:missAll()}); await lessonSession({note:"Yoklama: "+L.d.title+" ("+L.qz.score+"/"+L.d.yokla.length+")"});}
async function pkDone(){const t=today(), m=minsNow(); await save({pk:t});
  if(L.week){for(const id of L.week){if(id===L.id)continue; const p=C.lxP(id), rec=Object.assign({},p,{pk:t,updated:new Date().toISOString()}); C.LX.prog[id]=rec; try{await C.db.collection("lessons").doc(id).set(rec);}catch(e){}}}
  try{await C.upsertSession("pekistir-"+t+"-"+L.id,{date:t,lang:L.lang,mins:{gramer:m},total:m,topic:C.topicById(L.id)?L.id:"",mistakes:[],note:"Pekiştir: "+L.d.title,next:"",created:new Date().toISOString(),words:0,src:"lesson"});}catch(e){}
  close();}
const EXW={cp1:[4,"checkpoint"],cp2:[8,"checkpoint"],final:[12,"final"]};
function vExIntro(){const d=L.d, n=d.items.length, p=progDoc();
  return `<section class="lcard"><p class="lk">Sınav</p><h2 data-focus tabindex="-1">${esc(d.title)}</h2>
   <dl class="xinfo"><div><dt>Soru</dt><dd>${n}</dd></div><div><dt>Geçme</dt><dd>${d.pass} doğru</dd></div><div><dt>Süre</dt><dd>${+d.minutes||Math.round(n*1.2)} dk</dd></div></dl>
   ${p.attempts?`<p class="lnote">En iyi sonucun: <b>${+p.best||0} / ${n}</b> · ${p.attempts} deneme</p>`:""}<p class="lnote">Her sorudan sonra doğrusunu görürsün. Sınavda Koça sor kapalı.</p>
   <div class="lnav"><button type="button" class="btn btn-ghost" data-act="close">Kapat</button><button type="button" class="btn btn-primary" data-act="exStart">${ICON("play")}Başla</button></div></section>`;}
function vExRes(){const d=L.d, st=L.ex, n=d.items.length, ok=st.score>=d.pass, pct=Math.round(st.score/n*100), nx=ok&&C.lxNext?C.lxNext():null, G=new Map();
  st.log.filter(x=>x.res==="no").forEach(x=>{const k=x.item.topic; if(!G.has(k))G.set(k,{from:x.item.from,l:[]}); G.get(k).l.push(x);});
  const grp=[...G].map(([tp,g])=>{const m=C.lxMeta(g.from); return `<div class="xgrp"><div class="xgh"><b>${esc(tp)}</b>${m&&m.kind!=="exam"?`<button type="button" class="btn btn-soft btn-sm" data-act="exLesson" data-id="${esc(g.from)}">Dersi aç · ${esc(m.title)}</button>`:""}</div>
    <ul>${g.l.map(x=>{const w=whyOf(x.item,x.val); return `<li><p>${md(x.item.q)}</p><p class="xa">Senin cevabın: <s>${esc(x.val)}</s></p><p class="xa">Doğrusu: <b>${esc(ansOf(x.item))}</b></p>${w?`<p class="xw">${md(w)}</p>`:""}</li>`;}).join("")}</ul></div>`;}).join("");
  return `<section class="lcard ldone"><p class="lk">${ok?"Sınav · geçti":"Sınav · kaldı"}</p><p class="lbig">${st.score} / ${n}</p><p class="lead"><b>%${pct}</b> · ${ok?"Geçtin. Eşik "+d.pass+" doğruydu.":"Geçmek için en az "+d.pass+" doğru gerekli. Aşağıdaki konulara dön, sonra tekrar dene."}</p></section>
   ${grp?`<section class="lcard"><h2>Yanlışlar · konuya göre</h2>${grp}</section>`:""}
   <div class="lrow">${nx?`<button type="button" class="btn btn-primary" data-act="planNext">Sıradaki: ${esc(nx.label)}${ICON("arrow")}</button>`:""}<button type="button" class="btn ${ok?"btn-ghost":"btn-primary"}" data-act="exRedo">Tekrar dene</button><button type="button" class="btn btn-ghost" data-act="close">Kapat</button></div>`;}
async function examDone(){const d=L.d, st=L.ex, n=d.items.length, sc=st.score, ok=sc>=d.pass, t=today(), p=progDoc(), db=C.db, now=new Date().toISOString(), miss=[...new Set(st.miss)];
  const rec=Object.assign({},p,{best:Math.max(+p.best||0,sc),last:sc,attempts:(+p.attempts||0)+1,passed:!!p.passed||ok,miss,updated:now}); if(ok&&!p.passed)rec.passedAt=t;
  C.LX.prog[L.id]=rec; if(!db)return; try{await db.collection("lessons").doc(L.id).set(rec);}catch(e){}
  const m=EXW[L.id]; if(m){const [w,tur]=m, eid=tur+"-w"+String(w).padStart(2,"0"), E=C.S.exams, prev=E.find(e=>e.id===eid), keep=prev&&+prev.puan>sc;
    const x=keep?Object.assign({},prev,{deneme:(+prev.deneme||0)+1,updated:now}):{hafta:w,puan:sc,toplam:n,tur,notlar:(miss.length?"Yanlış konular: "+miss.join(", "):"Hepsi doğru").slice(0,400),tarih:t,ajan:"sinav",deneme:(prev&&+prev.deneme||0)+1,updated:now};
    delete x.id; try{await db.collection("exams").doc(eid).set(x);}catch(e){} const i=E.findIndex(e=>e.id===eid); if(i>=0)E[i]=Object.assign({id:eid},x); else E.push(Object.assign({id:eid},x));}
  await lessonSession({note:"Sınav: "+d.title+" ("+sc+"/"+n+")",mistakes:miss.map(x=>x+" ("+d.title+")")}); C.lxPaint();}
async function onClick(e){const b=e.target.closest("button"); if(!b||b.disabled)return; L.act=Date.now();
  if(b.dataset.say!==undefined){const on=b.classList.contains("on"); ttsStop(); if(on)return; b.classList.add("on"); speak([b.dataset.say],b.dataset.sl||L.lang).then(()=>b.classList.remove("on")); return;}
  if(b.dataset.step){go(+b.dataset.step); return;}
  if(b.dataset.ans!==undefined){answer(b.dataset.kind,b.dataset.ans); return;}
  if(b.dataset.ow!==undefined){const i=+b.dataset.ow; if(L.order.includes(i))return; L.order.push(i); paintOrder(); return;}
  if(b.dataset.ob!==undefined){L.order=L.order.filter(x=>x!==+b.dataset.ob); paintOrder(); return;}
  const a=b.dataset.act;
  if(b.id==="lsnX"||a==="close"){close(); return;}
  if(b.id==="askFab"){openAsk(); return;} if(b.id==="askX"){closeAsk(); return;}
  if(a==="aNext"){if(L.page<L.d.anlat.length-1){L.page++; render(); $l("#lstage").scrollIntoView({block:"start"});} else finish(0); return;}
  if(a==="aPrev"){L.page=Math.max(0,L.page-1); render(); return;}
  if(a==="finish"){finish(+b.dataset.i); return;}
  if(a==="toStep"){go(+b.dataset.to); return;}
  if(a==="playAll"||a==="slow"){speak(L.d.dinle.map(l=>l.x),L.lang,{rate:a==="slow"?C.rate()*0.72:C.rate()}); return;}
  if(a==="oUndo"){L.order.pop(); paintOrder(); return;}
  if(a==="oCheck"){const kind=b.dataset.kind, item=itemsOf(kind)[stOf(kind).i]; if(!L.order.length)return; answer(kind,L.order.map(i=>item.words[i]).join(" ")); return;}
  if(a==="next"){const kind=b.dataset.kind, st=stOf(kind); st.i++; st.ans=false;
    if(kind==="x"&&st.i>=L.d.items.length)await examDone();
    if(kind==="q"&&st.i>=L.d.yokla.length){if(st.score>=(+L.d.pass||Math.ceil(L.d.yokla.length*0.8))){L.done[4]=true; await passLesson();} else await failLesson();}
    if(kind==="p")save(); render(); return;}
  if(a==="redoP"){L.pr={i:0,score:0,ans:false}; save(); render(); return;}
  if(a==="exStart"||a==="exRedo"){L.ex={stage:"q",i:0,score:0,ans:false,miss:[],log:[]}; render(); const el=document.getElementById("lsn"); if(el)el.scrollTo({top:0,behavior:"auto"}); return;}
  if(a==="exLesson"){const id=b.dataset.id; if(C.lxMeta(id))open(id,{}); return;}
  if(a==="redoQ"){L.qz={i:0,score:0,ans:false,miss:[]}; render(); return;}
  if(a==="askWhy"){const q=L.lastQ||{}; openAsk("Bu soruda neden yanlış yaptım? Soru: "+String(q.q||"").replace(/\*\*/g,"")+" · Benim cevabım: "+(q.val||"")+" · Doğrusu: "+(q.a||"")); return;}
  if(a==="call"){startCall(); return;}
  if(a==="pkTalk"){L.pk.talk=true; L.konus=null; render(); return;}
  if(a==="pkDone"){pkDone(); return;}
  if(a==="planNext"){close(); setTimeout(()=>C.lxGo(),0); return;}
  if(a==="full"){L.pk=null; L.step=0; L.page=0; render(); return;}}
function paintOrder(){const kind=(document.querySelector("#lstage [data-act=oCheck]")||{dataset:{}}).dataset.kind; if(!kind)return; const item=itemsOf(kind)[stOf(kind).i];
  $l("#oBuilt").innerHTML=L.order.map(i=>`<button type="button" class="oW" data-ob="${i}" aria-label="Çıkar: ${esc(item.words[i])}">${esc(item.words[i])}</button>`).join("");
  document.querySelectorAll("#lstage .oPool .oW").forEach(w=>w.disabled=L.order.includes(+w.dataset.ow));}
function onSubmit(e){e.preventDefault(); const f=e.target; L.act=Date.now();
  if(f.dataset.form){const kind=f.dataset.form, v=f.querySelector("input").value; if(!v.trim())return; answer(kind,v); return;}
  if(f.id==="askForm"){const t=$l("#askIn"), v=t.value.trim(); if(!v)return; t.value=""; askSend(v);}}
function onKey(e){if(e.key==="Enter"&&!e.shiftKey&&e.target.id==="askIn"){e.preventDefault(); e.target.form.requestSubmit();}
  if(e.key==="Escape"){if(K.call)return; e.preventDefault(); if(!$l("#ask").hidden)closeAsk(); else close();}}
function startCall(){const k=L.d.konus||{}; ttsStop(); tick();
  kCall({coach:L.coach,lessonId:L.id,lessonTitle:L.d.title,topic:L.pk?(L.d.pekistir.konus_prompt||k.goal):(k.goal||L.d.title),goal:k.goal,vocab:arr(k.vocab),structures:arr(k.structures),opener:k.opener_hint,level:k.level_note,
    onEnd:r=>{L.act=Date.now(); if(r&&r.turns){L.konus={mins:r.mins,fixes:r.fixes,phrases:r.phrases}; if(!L.pk){L.done[3]=true; save();}} if(L.open)render();}});}
function ctxName(){if(L.ex)return "Sınav"; const k=L.pk?(L.pk.talk?"Pekiştir · konuşma":"Pekiştir · soru "+(L.pk.i+1)):STEPS[L.step][1]; if(L.pk)return k;
  if(L.step===0)return k+" · kart "+(Math.min(L.page,L.d.anlat.length-1)+1)+"/"+L.d.anlat.length; if(L.step===2&&L.pr.i<L.d.uygula.length)return k+" · alıştırma "+(L.pr.i+1); if(L.step===4&&L.qz.i<L.d.yokla.length)return k+" · soru "+(L.qz.i+1); return k;}
function askRules(){const c=COACH[L.lang], quiz=!L.pk&&L.step===4&&L.qz.i<L.d.yokla.length;
  return `=== AJAN: ${c.name.toUpperCase()} — KOÇA SOR (ders içi) ===
Sen ${c.name}'sın, Türk bir yetişkine (Türab) ${LN[L.lang]} öğreten öğretmen. Öğrenci "${L.d.title}" dersinde (kod ${L.id}) bir şeye takıldı.
Kısa, net, Türkçe cevap ver (en fazla 4 cümle). Gerekirse 1–2 ${LN[L.lang]} örnek ver, yanına Türkçesini yaz. Dersin konusunun dışına çıkma; ileri konu sorulursa "ilerideki derste" de, tek cümleyle söyle.
Yoklama (Yokla) sorularının cevabını ASLA verme; yalnızca kuralı hatırlatan bir ipucu ver.${quiz?" ŞU AN YOKLAMA AÇIK: cevabı söyleme, harfini/kelimesini verme.":""} Markdown, tablo, emoji kullanma.
Öğrenci şu an: ${ctxName()}.
Ekranda gördüğü:
${(($l("#lstage")||{}).innerText||"").replace(/\n{2,}/g,"\n").slice(0,1500)}`;}
function rich(t){const parts=[]; let s=String(t||"").replace(/\[\[(it|en|tr):\s*([^\]]*?)\s*\]\]/g,(m,l,x)=>{parts.push([l,x]); return "\u0001"+(parts.length-1)+"\u0002";});
  s=esc(s).replace(/\*\*([^*\n]+?)\*\*/g,"<b>$1</b>").replace(/\*/g,"").replace(/^#+\s*/gm,"");
  return s.replace(/\u0001(\d+)\u0002/g,(m,i)=>{const [l,x]=parts[+i]; return `<b class="tx" lang="${l}">${esc(x)}</b>${l!=="tr"?" "+sayBtn(x,l):""}`;});}
function bubble(log,cls,text){const d=document.createElement("div"); d.className="m "+cls; d.textContent=text; log.appendChild(d); log.scrollTop=log.scrollHeight; return d;}
function openAsk(prefill){const p=$l("#ask"); p.hidden=false; const f=$l("#askFab"); f.hidden=true; f.setAttribute("aria-expanded","true"); $l("#askCtx").textContent="Şu an: "+ctxName();
  const i=$l("#askIn"); if(prefill)i.value=prefill; i.focus();}
function closeAsk(quiet){const p=document.querySelector("#lsn #ask"); if(!p||p.hidden)return; p.hidden=true; const f=$l("#askFab"); f.hidden=false; f.setAttribute("aria-expanded","false"); if(!quiet)f.focus();}
async function askSend(q){const log=$l("#askLog"); bubble(log,"u",q); const why=coachReady(); if(why){bubble(log,"sys",why); return;}
  if(L.askBusy)return; L.askBusy=true; L.ask.push({role:"user",content:q}); const b=bubble(log,"c",COACH[L.lang].name+" düşünüyor…"); $l("#askSend").disabled=true;
  try{const r=await C.sample()([{role:"user",content:askRules()},...L.ask.slice(-8)],{onText:({text})=>{b.innerHTML=rich(text); log.scrollTop=log.scrollHeight;}});
    b.innerHTML=rich(r.text||"…"); L.ask.push({role:"assistant",content:r.text||"…"});}
  catch(e){b.textContent=(e&&e.text)||coachErr(e)||"Yanıt gelmedi."; L.ask.pop();}
  finally{L.askBusy=false; const s=$l("#askSend"); if(s)s.disabled=false;}}

const K={el:null,coach:"en",topic:0,call:null};
const K_SIL=700, K_RETRY=2, K_FAST="claude-haiku-5-5";
const KIT_ALT=["Kendini tanıt: adın, şehrin, işin","Ailen ve memleketin","Şantiyede bir gün: ne var, ne yok"];
function kTopics(coach){const out=[];
  if(coach==="en"){const e=C.enToday(), wk=C.SPEAK_EN, i0=Math.max(0,wk.indexOf(e.theme)); const L0=C.LX.index&&e.t?C.lxMeta(e.t[1]):null;
    out.push({t:e.theme||wk[0],lesson:L0?L0.id:null,sub:e.t?"Gramer odağı: "+e.t[2]:""}); for(let k=1;k<=3;k++)out.push({t:wk[(i0+k)%wk.length]});}
  else{const x=C.itToday(), id=x.t?x.t[1]:null, m=id?C.lxMeta(id):null; out.push({t:m?m.title:x.t?x.t[2]:"Selamlaşma ve tanışma",lesson:m&&C.lxP(m.id).passed?m.id:null}); KIT_ALT.forEach(t=>out.push({t}));}
  out.push({t:"Serbest",free:1}); return out;}
function kTip(){if(K.tipOn===undefined){let seen=false; try{seen=localStorage.getItem("tydil.vtip.konusSeen")==="1";}catch(e){} K.tipOn=!seen; if(!seen){try{localStorage.setItem("tydil.vtip.konusSeen","1");}catch(e){}}}
  return K.tipOn?C.tipHtml(["it","en"],"konus"):"";}
function kMount(el){if(!el)return; K.el=el; kPaint();}
function kPaint(){const el=K.el; if(!el)return; const tp=kTopics(K.coach); if(K.topic>=tp.length)K.topic=0;
  const co=c=>`<button type="button" class="kco" role="radio" aria-checked="${K.coach===c}" data-kco="${c}"><span class="kav ${c}" aria-hidden="true">${COACH[c].mono}</span><span><b>${COACH[c].name}</b><small>${c==="en"?"İngilizce · B1+ → B2":"İtalyanca · A1, çok yavaş ve basit"}</small></span></button>`;
  const lk=coachReady();
  el.innerHTML=`<div class="kpick"><div class="phead"><h2>Konuş</h2><p>Telefonla konuşur gibi, canlı: koç konuşurken sözünü kesebilirsin, konuşmaya başlaman yeter. Sustuğunda koç hemen cevap verir.</p></div>
   <article class="card kpick"><div class="kcoaches" role="radiogroup" aria-label="Koç">${co("en")}${co("it")}</div>
    <h3 id="kTopL">Konu</h3><div class="kchips" role="radiogroup" aria-labelledby="kTopL">${tp.map((t,i)=>`<button type="button" class="kchip" role="radio" aria-checked="${i===K.topic}" data-kt="${i}">${esc(t.t)}</button>`).join("")}</div>
    ${tp[K.topic]&&tp[K.topic].sub?`<p class="hint" style="margin:0">${esc(tp[K.topic].sub)}</p>`:""}
    ${lk?`<p class="msg info" style="margin:0">${esc(lk)} <button type="button" class="btn btn-soft btn-sm" data-go="key">Ayarlar'a git</button></p>`:""}
    <div class="btnRow"><button type="button" class="btn btn-primary btn-big" id="kStart" ${lk?"disabled":""}>${ICON("speaking")}Canlı konuşmayı başlat</button><button type="button" class="btn btn-ghost" data-go="coach">${ICON("chat")}Yazarak çalış</button></div>${kTip()}</article></div>`;}
document.addEventListener("click",e=>{const b=e.target.closest("#konusMount button"); if(!b)return;
  if(b.dataset.kco){K.coach=b.dataset.kco; K.topic=0; kPaint(); return;}
  if(b.dataset.kt){K.topic=+b.dataset.kt; kPaint(); return;}
  if(b.id==="kStart"){const t=kTopics(K.coach)[K.topic]||{}; kStartFrom(K.coach,t);}});
function kStartFrom(coach,t){let o={coach,topic:t.free?"":t.t};
  if(t.lesson){C.lxGet(t.lesson).then(d=>{const k=d.konus||{}; kCall(Object.assign(o,{lessonId:d.id,lessonTitle:d.title,goal:k.goal,vocab:arr(k.vocab),structures:arr(k.structures),opener:k.opener_hint,level:k.level_note}));}).catch(()=>kCall(o));}
  else kCall(o);}
function kCallPlan(o){const coach=o.coach==="it"?"it":"en"; K.coach=coach; K.topic=0; kPaint(); const t=kTopics(coach)[0]; if(o.lesson)t.lesson=o.lesson; kStartFrom(coach,t);}
function kEl(){let el=document.getElementById("kc"); if(el)return el;
  el=document.createElement("div"); el.id="kc"; el.className="kc"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-labelledby","kcWho"); el.lang="tr"; el.hidden=true;
  document.body.appendChild(el); el.addEventListener("click",kClick); el.addEventListener("submit",kSubmit);
  el.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault(); e.stopPropagation(); kFinish();} if(e.key==="Enter"&&!e.shiftKey&&e.target.id==="kcIn"){e.preventDefault(); e.target.form.requestSubmit();}});
  return el;}
const KSTN={listening:"Dinliyorum",thinking:"Düşünüyor",speaking:"Konuşuyor",idle:"Duraklatıldı"};
function kCall(o){if(K.call)kEnd(true); const why=coachReady(); if(why){C.fNotice(why); return;}
  const coach=o.coach==="it"?"it":"en", el=kEl();
  K.call={o,coach,lang:coach,turns:[],last:"",you:"",st:"thinking",paused:false,t0:Date.now(),pausedMs:0,pauseAt:0,timer:0,rec:null,srOff:!C.srOk(),retry:0,ctl:null,gen:0,caps:true,ended:false,userTurns:0};
  el.className="kc "+coach; el.hidden=false; document.documentElement.classList.add("kc-on"); C.ccStop(); ttsStop();
  try{/* iOS: ilk okuma dokunuşla açılır */if(ttsOk()){const u=new SpeechSynthesisUtterance(" "); u.volume=0; window.speechSynthesis.speak(u);}}catch(e){}
  kPaintCall(); K.call.timer=setInterval(kTime,1000); kSend(null);}
function kPaintCall(){const c=K.call, el=kEl(), co=COACH[c.coach], o=c.o;
  el.innerHTML=`<header class="kcTop"><div><b id="kcWho">${co.name}</b><span>${esc(LN[c.lang])}${o.topic?" · "+esc(o.topic):" · serbest"}</span></div><span class="kcTime mono" id="kcTime" role="timer">00:00</span></header>
   <div class="kcMid" id="kcMid"><button type="button" class="kcOrb" id="kcOrb" data-st="${c.st}" aria-label="Küre: koçu kes ya da konuşmanı bitir"><span class="kcRing"></span><span class="kcCore">${co.mono}</span></button>
    <p class="kcSt" id="kcSt" aria-live="polite">${KSTN[c.st]}</p><div class="kcHint" id="kcHint" hidden></div>
    <div class="kcCap" id="kcCap"></div>
    <form class="kcType" id="kcType" ${c.srOff?"":"hidden"}><div><label class="cc-vh" for="kcIn">Cevabın</label><textarea id="kcIn" rows="1" lang="${c.lang}" placeholder="${c.lang==="it"?"İtalyanca cevap ver…":"Answer in English…"}"></textarea><button type="submit" class="btn btn-primary">Gönder</button></div><p class="hint">Klavyedeki mikrofon tuşuyla dikte et</p></form>
</div>
   <footer class="kcCtl"><button type="button" class="kcB" id="kcMic" aria-pressed="false">${ICON("speaking")}<span>Duraklat</span></button><button type="button" class="kcB" id="kcRep">${ICON("repeat")}<span>Tekrar et</span></button><button type="button" class="kcB" id="kcTr">${ICON("globe")}<span>Türkçesi?</span></button><button type="button" class="kcB" id="kcCapT" aria-pressed="true">${ICON("chat")}<span>Altyazı</span></button><button type="button" class="kcB end" id="kcEnd">${ICON("x")}<span>Bitir</span></button></footer>`;
  kCaps(); kState(c.st);}
function kTime(){const c=K.call; if(!c)return; const el=document.getElementById("kcTime"); if(el){const s=Math.floor(kMs()/1000); el.textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");}}
function kMs(){const c=K.call; if(!c)return 0; return Math.max(0,(c.endAt||Date.now())-c.t0-c.pausedMs-(c.pauseAt?Date.now()-c.pauseAt:0));}
function kState(st){const c=K.call; if(!c)return; c.st=st; const o=document.getElementById("kcOrb"), s=document.getElementById("kcSt"); if(o)o.dataset.st=st; if(s)s.textContent=c.srOff&&st==="listening"?"Sıra sende: yaz ya da dikte et":KSTN[st];
  const m=document.getElementById("kcMic"); if(m){m.setAttribute("aria-pressed",String(c.paused)); m.querySelector("span").textContent=c.paused?"Devam et":"Duraklat";}}
function kCaps(){const c=K.call, el=document.getElementById("kcCap"); if(!c||!el)return; el.hidden=!c.caps;
  el.innerHTML=(c.last?`<p class="c"><span>${COACH[c.coach].name}</span>${esc(spoken(c.last))}</p>`:"")+(c.you?`<p class="u"><span>Sen</span>${esc(c.you)}</p>`:"");}
function kTurns(){const c=K.call, o=c.o; const sys=C.speakRules(c.lang,{topic:o.topic,goal:o.goal,vocab:o.vocab,structures:o.structures,opener:o.opener,level:o.level});
  const T=c.turns.slice(-24); if(!T.length||T[0].role!=="user")T.unshift({role:"user",content:c.lang==="it"?"(Görüşme başladı. Merhaba!)":"(The call has started. Hi!)"});
  return [{role:"user",content:sys},...T];}
async function kSend(text){const c=K.call; if(!c||c.ended)return; const gen=++c.gen;
  if(text){c.turns.push({role:"user",content:text}); c.you=text; c.userTurns++; kCaps();}
  kState("thinking"); c.said=""; kListen(); let said=0, buf="", started=false;
  const out=x=>{if(gen!==c.gen)return; if(!started){started=true; kSpeakOpen();} c.said+=" "+x; ttsPush(x);};
  const flush=final=>{let end=0; const re=/[.!?…]+["'»)*_]*\s+/g; let m; while((m=re.exec(buf)))end=m.index+m[0].length;
    if(!end&&!started&&buf.length>36){const k=Math.max(buf.lastIndexOf(", "),buf.lastIndexOf("; "),buf.lastIndexOf(": ")); if(k>18)end=k+2;}   /* ilk ses: ilk yan cümlede başlar */
    if(end){sentences(buf.slice(0,end)).forEach(out); buf=buf.slice(end);} if(final&&buf.trim()){sentences(buf).forEach(out); buf="";}};
  let r=null;
  try{r=await C.sample()(kTurns(),{model:K_FAST,maxTokens:400,onText:({text:t})=>{if(gen!==c.gen||c.ended)return; buf+=t.slice(said); said=t.length; flush(false);}});}
  catch(e){if(c.ended)return; if(text&&c.turns[c.turns.length-1]&&c.turns[c.turns.length-1].content===text){c.turns.pop(); c.userTurns--;} if(gen!==c.gen)return; ttsStop(); kHint(coachErr(e)||"Yanıt gelmedi. Tekrar dene."); c.paused=true; c.pauseAt=Date.now(); kState("idle"); return;}
  if(c.ended)return;
  const full=String(r&&r.text||"").trim(); if(gen!==c.gen&&c.cutGen===gen)return;            /* sözü kesildi: yarım cümle zaten kayıtta */
  c.turns.push({role:"assistant",content:full||"…"}); c.last=full; kCaps();
  if(gen!==c.gen)return;                                                   /* kesildi: kayda girer, okunmaz */
  if(said<full.length){buf+=full.slice(said);} flush(true);
  if(!started){kAfterSpeak();} else ttsClose();}
function kSpeakOpen(){const c=K.call; kState("speaking"); const g=c.gen; speak([],c.lang,{open:true}).then(r=>{if(!K.call||K.call.gen!==g)return; if(r&&r.cancelled&&K.call.interrupted){K.call.interrupted=false; return;} kAfterSpeak();});}
function kAfterSpeak(){const c=K.call; if(!c||c.ended)return; if(c.paused){kState("idle"); return;} kState("listening"); if(c.rec&&!c.rec.done){kArm(); return;} kListen();}
const kWords=t=>String(t||"").toLowerCase().normalize("NFC").match(/[\p{L}']+/gu)||[];
function kEcho(heard,said){const S=new Set(kWords(said)); return kWords(heard).filter(w=>!S.has(w)).length;}
function kCut(c){const t=String(c.said||"").trim(); if(!t)return; const lt=c.turns[c.turns.length-1], v={role:"assistant",content:t+" —"}; if(lt&&lt.role==="assistant")c.turns[c.turns.length-1]=v; else c.turns.push(v); c.last=t;}
function kArm(){const c=K.call, s=c&&c.rec; if(!s||s.done)return; clearTimeout(s.silT); const t=(s.pre+" "+s.fin.join(" ")+" "+s.interim).replace(/\s+/g," ").trim(); if(t&&c.st==="listening")s.silT=setTimeout(()=>kTurnEnd(),K_SIL);}
function kListen(){const c=K.call; if(!c||c.ended||c.paused)return; if(c.rec&&!c.rec.done){if(c.st==="listening")kArm(); return;}
  if(c.srOff){kState("listening"); const i=document.getElementById("kcIn"); if(i)i.focus({preventScroll:true}); return;}
  const SR=C.SR(); let rec; try{rec=new SR();}catch(e){kNoSR(); return;}
  const s={rec,fin:[],interim:"",pre:"",silT:0,done:false}; c.rec=s; rec.lang=tagOf(c.lang); rec.continuous=true; rec.interimResults=true; try{rec.maxAlternatives=1;}catch(e){}
  const text=()=>(s.pre+" "+s.fin.join(" ")+" "+s.interim).replace(/\s+/g," ").trim();
  rec.onresult=e=>{if(s.done||c.rec!==s)return; const R=e.results||[]; let interim=""; for(let i=e.resultIndex||0;i<R.length;i++){const r=R[i]; if(!r||!r[0])continue; if(r.isFinal)s.fin[i]=r[0].transcript; else interim+=r[0].transcript+" ";}
    s.interim=interim.trim();
    if(c.st==="speaking"||c.st==="thinking"){const t=text(); if(kEcho(t,c.said||c.last||"")<2){if(R.length&&R[R.length-1].isFinal){s.fin=[]; s.interim="";} return;}
      const wasThinking=c.st==="thinking"; c.cutGen=c.gen; c.gen++; ttsStop(); c.interrupted=false;
      if(wasThinking){const lt=c.turns[c.turns.length-1]; if(lt&&lt.role==="user"){c.turns.pop(); c.userTurns--; s.pre=lt.content;}}
      else kCut(c);
      kState("listening");}
    c.you=text(); kCaps(); kArm();};
  rec.onerror=e=>{if(s.done||c.rec!==s)return; const er=e&&e.error; if(er==="not-allowed"||er==="service-not-allowed"||er==="audio-capture"||er==="language-not-supported"){s.done=true; kNoSR();}};
  rec.onend=()=>{if(s.done||c.rec!==s)return; c.rec=null; if(c.st!=="listening"){setTimeout(()=>{if(K.call===c&&!c.rec&&!c.paused&&!c.ended)kListen();},120); return;}
    if(text()){c.rec=s; return kTurnEnd();} if(c.retry<K_RETRY){c.retry++; setTimeout(()=>{if(K.call===c&&!c.rec&&!c.paused&&!c.ended)kListen();},120); return;}
    c.retry=0; c.paused=true; kState("idle"); kHint("Seni duyamadım. Devam etmek için mikrofona dokun.");};
  try{rec.start(); if(c.st!=="speaking"&&c.st!=="thinking")kState("listening");}catch(e){c.rec=null; kNoSR();}}
function kTurnEnd(){const c=K.call; if(!c)return; const s=c.rec; if(!s)return; const t=(s.pre+" "+s.fin.join(" ")+" "+s.interim).replace(/\s+/g," ").trim(); clearTimeout(s.silT); c.retry=0;
  s.fin=[]; s.interim=""; s.pre=""; if(s.done){c.rec=null;}                 /* mikrofon açık kalır: koç konuşurken sözünü kesebilirsin */
  if(t){kHint(""); c.you=t; kSend(t);} else kListen();}
function kStopListen(){const c=K.call; if(!c||!c.rec)return; const s=c.rec; s.done=true; clearTimeout(s.silT); try{s.rec.abort();}catch(e){} c.rec=null;}
function kNoSR(){const c=K.call; if(!c)return; c.srOff=true; c.rec=null; const f=document.getElementById("kcType"); if(f)f.hidden=false; kState("listening"); const i=document.getElementById("kcIn"); if(i)i.focus({preventScroll:true});}
function kHint(t){const h=document.getElementById("kcHint"); if(!h)return; h.textContent=t||""; h.hidden=!t;}
async function kClick(e){const b=e.target.closest("button"); if(!b)return; const c=K.call;
  if(b.id==="kcOrb"&&c&&!c.ended){if(c.st==="speaking"||c.st==="thinking"){if(c.st==="speaking"){c.cutGen=c.gen; kCut(c);} c.interrupted=false; c.gen++; ttsStop(); c.paused=false; kState("listening"); kListen();} else if(c.st==="listening"&&c.rec){kTurnEnd();} else if(c.st==="idle"){kResume();} return;}
  if(b.id==="kcMic"&&c){if(c.paused)kResume(); else{c.paused=true; c.pauseAt=Date.now(); c.gen++; ttsStop(); kStopListen(); kState("idle");} return;}
  if(b.id==="kcRep"&&c&&c.last){c.gen++; c.said=c.last; if(c.rec)clearTimeout(c.rec.silT); kState("speaking"); const g=c.gen; speak(c.last,c.lang,{rate:C.rate()*0.75}).then(()=>{if(K.call===c&&c.gen===g)kAfterSpeak();}); return;}
  if(b.id==="kcTr"&&c&&c.last){kHint("Türkçesi hazırlanıyor…"); try{const r=await C.sample()([{role:"user",content:"Aşağıdaki "+LN[c.lang]+" cümle(ler)in Türkçesini TEK satırda yaz. Başka hiçbir şey yazma, açıklama ekleme.\n\n"+spoken(c.last)}],{}); if(K.call===c)kHint("Türkçesi: "+String(r.text||"").replace(/\s+/g," ").trim());}catch(x){if(K.call===c)kHint(coachErr(x)||"Çeviri gelmedi.");} return;}
  if(b.id==="kcCapT"&&c){c.caps=!c.caps; b.setAttribute("aria-pressed",String(c.caps)); kCaps(); return;}
  if(b.id==="kcEnd"){kFinish(); return;}
  if(b.dataset.kph!==undefined){const p=K.sum&&K.sum.phrases[+b.dataset.kph]; if(p)speak([p.x],K.sum.lang); return;}
  if(b.dataset.kadd!==undefined){kAddCard(+b.dataset.kadd,b); return;}
  if(b.id==="kcClose"){kClose(); return;}}
function kResume(){const c=K.call; if(!c)return; if(c.pauseAt){c.pausedMs+=Date.now()-c.pauseAt; c.pauseAt=0;} c.paused=false; kHint(""); kListen();}
function kSubmit(e){e.preventDefault(); const c=K.call; if(!c||c.ended)return; const i=document.getElementById("kcIn"), v=(i.value||"").trim(); if(!v)return; i.value=""; c.gen++; ttsStop(); kSend(v);}
async function kFinish(){const c=K.call; if(!c||c.ended)return; c.ended=true; c.endAt=Date.now(); if(c.pauseAt){c.pausedMs+=Date.now()-c.pauseAt; c.pauseAt=0;} c.gen++; clearInterval(c.timer); kStopListen(); ttsStop();
  const mins=Math.max(1,Math.round(kMs()/60000)); const mid=document.getElementById("kcMid"), ctl=document.querySelector("#kc .kcCtl"); if(ctl)ctl.hidden=true;
  if(!c.userTurns){kClose(); return;}
  if(mid){mid.classList.add("sum"); mid.scrollTop=0;}
  if(mid)mid.innerHTML=`<div class="kcSum"><h2>Özet hazırlanıyor…</h2><p class="lead">${COACH[c.coach].name} konuşmanı gözden geçiriyor.</p></div>`;
  let sum={duzeltmeler:[],ifadeler:[],ipucu:""};
  try{const ask=c.lang==="it"?"GÖRÜŞME BİTTİ. Şimdi yalnızca şu biçimde JSON yaz, başka hiçbir metin yazma":"THE CALL IS OVER. Now output ONLY this JSON, no other text";
    const r=await C.sample()([{role:"user",content:C.speakRules(c.lang,{topic:c.o.topic})},{role:"user",content:"(…)"},...c.turns.slice(-30),{role:"user",content:ask+':\n{"duzeltmeler":[{"sen":"öğrencinin gerçek cümlesi","dogal":"doğal hali"}],"ifadeler":[{"x":"'+LN[c.lang]+' faydalı ifade","tr":"Türkçesi"}],"ipucu":"Türkçe tek cümle ipucu"}\nEn çok 3 düzeltme (yalnızca öğrencinin söylediklerinden; hata yoksa boş liste), tam 3 faydalı ifade, 1 ipucu.'}],{});
    const t=String(r.text||""), a=t.indexOf("{"), z=t.lastIndexOf("}"); if(a>=0&&z>a){const j=JSON.parse(t.slice(a,z+1)); sum={duzeltmeler:arr(j.duzeltmeler).filter(x=>x&&x.sen&&x.dogal).slice(0,3),ifadeler:arr(j.ifadeler).filter(x=>x&&x.x).slice(0,3),ipucu:String(j.ipucu||"")};}}
  catch(e){sum.ipucu=coachErr(e)?"Özet alınamadı: "+coachErr(e):"";}
  K.sum={lang:c.lang,phrases:sum.ifadeler};
  await kSave(c,mins);
  const res={turns:c.userTurns,mins,fixes:sum.duzeltmeler.length,phrases:sum.ifadeler.length};
  if(mid)mid.innerHTML=`<div class="kcSum" id="kcSum"><h2>Konuşma tamam</h2><div class="kcStats"><span>${ICON("clock")} ${mins} dk</span><span>${c.userTurns} cevap</span><span>${COACH[c.coach].name}</span></div>
    ${sum.duzeltmeler.length?`<h3>DAHA DOĞAL SÖYLE</h3><ul class="kcFix">${sum.duzeltmeler.map(f=>`<li><span><s>${esc(f.sen)}</s></span><span>→ <b lang="${c.lang}">${esc(f.dogal)}</b></span></li>`).join("")}</ul>`:`<p class="fb ok">Belirgin bir hata yakalanmadı.</p>`}
    ${sum.ifadeler.length?`<h3>İŞİNE YARAYACAK İFADELER</h3><ul class="kcFix kcPh">${sum.ifadeler.map((p,i)=>`<li><button type="button" class="say" data-kph="${i}" aria-label="Dinle: ${esc(p.x)}">${SPK}</button><span><b lang="${c.lang}">${esc(p.x)}</b>${p.tr?`<small>${esc(p.tr)}</small>`:""}</span><button type="button" class="kcAdd" data-kadd="${i}">Kartlara ekle</button></li>`).join("")}</ul>`:""}
    ${sum.ipucu?`<p class="lnote"><b>İpucu:</b> ${esc(sum.ipucu)}</p>`:""}
    <div class="btnRow"><button type="button" class="btn btn-primary" id="kcClose">${c.o.lessonId&&L.open?"Derse dön":"Kapat"}</button></div></div>`;
  const cl=document.getElementById("kcClose"); if(cl)cl.focus({preventScroll:true});
  c.result=res;}
async function kSave(c,mins){const db=C.db; if(!db)return; const t=today(), lang=c.lang, k=lang==="en"?"speaking":"sesli", id="konus-"+t+"-"+lang;
  const prev=C.S.sessions.find(s=>s.id===id), pm=prev&&prev.mins?+prev.mins[k]||0:0, m={}; m[k]=pm+mins;
  try{await C.upsertSession(id,{date:t,lang,mins:m,total:pm+mins,topic:c.o.lessonId&&C.topicById(c.o.lessonId)?c.o.lessonId:lang==="en"&&C.enToday().t?C.enToday().t[1]:"",mistakes:[],note:"Konuş: "+(c.o.topic||"serbest"),next:"",created:new Date().toISOString(),words:0,src:"konus"});}catch(e){}
  C.lxFin(lang,[lang==="en"?"speaking":"sesli"]);}
async function kAddCard(i,b){const p=K.sum&&K.sum.phrases[i], db=C.db; if(!p||!db)return; b.disabled=true; const lang=K.sum.lang;
  if(C.S.cards.some(c=>c.lang===lang&&String(c.f||"").toLowerCase()===String(p.x).toLowerCase())){b.textContent="Zaten kartlarda"; return;}
  try{await db.collection("cards").add({lang,f:String(p.x).slice(0,120),tr:String(p.tr||"").slice(0,160),ex:"",box:1,due:C.addDays(today(),1),added:new Date().toISOString()}); b.textContent="Eklendi ✓";}catch(e){b.disabled=false; b.textContent="Eklenemedi";}}
function kClose(){const c=K.call; const r=c&&c.result; kEnd(true); if(c&&c.o.onEnd)c.o.onEnd(r||null); C.renderLive(); C.lxPaint();}
function kEnd(quiet){const c=K.call; if(c){c.ended=true; c.gen++; clearInterval(c.timer); kStopListen();} ttsStop(); K.call=null; const el=document.getElementById("kc"); if(el){el.hidden=true; el.innerHTML="";} document.documentElement.classList.remove("kc-on");}
document.addEventListener("visibilitychange",()=>{const c=K.call; if(document.hidden&&c&&!c.ended&&!c.paused){c.paused=true; c.pauseAt=Date.now(); c.gen++; ttsStop(); kStopListen(); kState("idle");}});
window.TYLESSON={open,close,validate,konus:{mount:kMount,call:kCallPlan,start:kCall},spoken,sentences,state:()=>({L,K})};

})();
