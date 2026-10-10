/* ---------- GÖRSELLER (satır içi SVG) ---------- */
/* Bayrak: TY İngilizce ile aynı ölçü (1.4em × .95em, 3px köşe); w verilirse yazı boyutuna çevrilir */
function FLAG(l,w){const st=w?` style="font-size:${Math.round(w/1.4)}px"`:"";
  if(l==="it") return `<span class="flag"${st} role="img" aria-label="İtalya bayrağı"><svg viewBox="0 0 3 2" preserveAspectRatio="none" aria-hidden="true"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#F4F5F0"/><rect x="2" width="1" height="2" fill="#CE2B37"/></svg></span>`;
  return `<span class="flag"${st} role="img" aria-label="Birleşik Krallık bayrağı"><svg viewBox="0 0 60 40" preserveAspectRatio="none" aria-hidden="true"><rect width="60" height="40" fill="#012169"/><path d="M0,0 60,40M60,0 0,40" stroke="#fff" stroke-width="8"/><path d="M0,0 60,40M60,0 0,40" stroke="#C8102E" stroke-width="3"/><path d="M30,0v40M0,20h60" stroke="#fff" stroke-width="12"/><path d="M30,0v40M0,20h60" stroke="#C8102E" stroke-width="7"/></svg></span>`;}
const ICONS={
  kelime:'<path d="M5 4.5h9.5L19 9v10.5H5z"/><path d="M14.5 4.5V9H19M8.5 13h7M8.5 16.5h4.5"/>',
  gramer:'<path d="M4 6h16M4 12h10M4 18h13"/><circle cx="19" cy="12" r="1.2"/>',
  okuma:'<path d="M3.5 5.5h5.5A3 3 0 0 1 12 8.5v11a2.5 2.5 0 0 0-2.5-2.5h-6z"/><path d="M20.5 5.5H15a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5h6z"/>',
  sesli:'<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  speaking:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  check:'<path d="m5 12.5 4.2 4.2L19 7"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  down:'<path d="M12 5v14M6 13l6 6 6-6"/>',
  copy:'<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  chat:'<path d="M4.5 18.5V7A2.5 2.5 0 0 1 7 4.5h10A2.5 2.5 0 0 1 19.5 7v7a2.5 2.5 0 0 1-2.5 2.5H8.5z"/>',
  deck:'<rect x="4" y="7" width="12" height="13" rx="2"/><path d="M8 4h10a2 2 0 0 1 2 2v11"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>',
  learn:'<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  practice:'<path d="M4 17.5V7a2.5 2.5 0 0 1 2.5-2.5h7A2.5 2.5 0 0 1 16 7v4.5a2.5 2.5 0 0 1-2.5 2.5H7.5z"/><path d="M16 9h1.5A2.5 2.5 0 0 1 20 11.5V20l-3-2.5h-4.5A2.5 2.5 0 0 1 10 15v-1"/>',
  progress:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  setup:'<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  flame:'<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.6-7.6.3 1.6 1 2.7 2 3.3.2-3 1.6-5.6 3.9-7.5-.1 2.6.9 4.4 2.3 6.2 1 1.4 1.7 3 1.7 5 0 4-2.9 6.8-7 6.8z"/>',
  play:'<path d="M8 5.5v13l10.5-6.5z"/>',
  repeat:'<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  ask:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.8v.2"/>',
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>'
};
function ICON(n,cls){return `<svg class="ico ${cls||""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||""}</svg>`;}
function artFor(){return "";}
