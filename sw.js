/* TY Dil service worker · ty-dil-v9
   Gezinme (HTML): önce önbellek (anında açılış), arkada ağdan tazele (stale-while-revalidate; fetch cache:"no-cache" → GitHub Pages'in 10 dk HTTP önbelleği atlanır).
   Diğer dosyalar: önbellek öncelikli, arkada tazeleme. API (api.anthropic.com) ve dış istekler SW'ye girmez.
   FILES ve BUILD satırlarını build.py yazar (content/index.json'daki dersler otomatik önbelleğe girer; her yeni derleme SW güncellemesini tetikler → sayfada "Yeni sürüm hazır" bandı). */
const CACHE = "ty-dil-v9";
const BUILD = "b70285603d27";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./legacy/ty-ingilizce.html", "./vendor/jsqr.js", "./vendor/tyqr.js", "./mod/lesson.js", "./content/index.json", "./content/it01.json", "./content/it02.json", "./content/it03.json", "./content/it04.json", "./content/it05.json", "./content/it06.json", "./content/en01.json", "./content/en02.json", "./content/en03.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: "no-cache" })).catch(() => {}))))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("message", e => { if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting(); });
function refresh(req, c) {
  return fetch(req, { cache: "no-cache" }).then(r => { if (r && r.ok) { c.put(req, r.clone()).catch(() => {}); } return r; });
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const nav = req.mode === "navigate";
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: nav }).then(hit => {
    const net = refresh(req, c).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }                                   /* önbellekten anında; arkada tazele */
    return net.then(r => r || (nav ? c.match("./index.html") : undefined)).then(r => r || Response.error());
  })));
});
