/* 辅导员工作台 · 离线缓存 Service Worker */
const CACHE = 'wb-cache-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/style.css',
  'assets/js/db.js',
  'assets/js/ui.js',
  'assets/js/views-overview.js',
  'assets/js/app.js',
  'assets/js/views-students.js',
  'assets/js/views-daily.js',
  'assets/js/views-awards.js',
  'assets/js/views-files.js',
  'assets/js/views-assessment.js',
  'assets/js/views-self.js',
  'assets/js/views-assistant.js',
  'assets/js/views-party.js',
  'assets/js/views-profile.js',
  'icon-192.png',
  'icon-512.png',
  'favicon.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // 页面导航：网络优先，离线时回退到缓存的 index.html（SPA 外壳）
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./')));
    return;
  }

  // 静态资源：缓存优先，同时后台更新
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return resp;
    }).catch(() => caches.match(e.request)))
  );
});
