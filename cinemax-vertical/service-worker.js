/* ── CineMax Service Worker ────────────────────────
   - app shell (HTML/CSS/JS/ไอคอน) → cache-first เปิดเร็ว + ออฟไลน์ได้
   - Supabase REST / วิดีโอ → network เสมอ (ไม่ cache) ข้อมูลสดตลอด
   เปลี่ยน CACHE เวอร์ชันเมื่ออัปเดตไฟล์ เพื่อล้าง cache เก่า        */
var CACHE = 'cinemax-v27';

var SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/01-icons.js', './js/02-config.js', './js/03-data.js', './js/04-stats.js',
  './js/05-render.js', './js/06-nav.js', './js/07-player.js', './js/08-sheet.js',
  './js/09-comments.js', './js/10-boot.js', './js/11-pwa.js', './js/12-hover.js', './js/13-detail.js', './js/14-extras.js', './js/15-live.js', './js/16-party.js', './js/17-sharecard.js', './js/18-livemode.js',
  './manifest.webmanifest',
  './fonts/framework7-icons.css', './fonts/Framework7Icons-Regular.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-180.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(SHELL.map(function(u){ return new Request(u, { cache: 'reload' }); }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);

  // ไม่ยุ่งกับ: Supabase API, วิดีโอ, iframe ผู้ให้บริการ → ปล่อยผ่าน network ตรงๆ
  if(/supabase\.co|cloudflarestream|videodelivery|youtube|ytimg|googlevideo|drive\.google|b-cdn\.net|mediadelivery/.test(url.host)) return;
  if(/\.(m3u8|ts|mp4|webm|mov)(\?|$)/i.test(url.pathname)) return;

  // นำทางหน้า (SPA) → network-first, ล้มเหลวค่อยใช้ cache (ออฟไลน์)
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).catch(function(){ return caches.match('./index.html'); })
    );
    return;
  }

  // static อื่นๆ (CSS/JS/รูป/ฟอนต์) → cache-first แล้วเติม cache เบื้องหลัง
  e.respondWith(
    caches.match(req).then(function(hit){
      var net = fetch(req).then(function(res){
        if(res && res.status === 200 && (url.origin === location.origin || /fonts\.g|cdn\.jsdelivr/.test(url.host))){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
