const CACHE = 'habit-grow-v1';

self.addEventListener('install', e => {
  // 預先快取根路徑（作為離線 fallback）
  e.waitUntil(caches.open(CACHE).then(c => c.add('./')));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // 導覽請求（index.html）→ network-first
  // 有網路就拿最新版並更新快取；離線才用快取
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // 其他資源（字體、外部 CDN）→ cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
