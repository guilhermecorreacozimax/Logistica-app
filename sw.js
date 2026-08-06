const CACHE = 'canhotos-v9';

// Só o essencial é obrigatório. CDNs são "best effort".
const ESSENCIAL = ['./', './index.html'];
const OPCIONAL = [
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/fonts/tabler-icons.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Essencial: se falhar, o install falha mesmo (é o app em si)
    await c.addAll(ESSENCIAL);
    // Opcional: cada um por si, uma falha não derruba a instalação
    await Promise.allSettled(OPCIONAL.map(u => c.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Nunca interceptar: uploads, banco de dados e APIs de rede
  if (url.includes('cloudinary.com') ||
      url.includes('googleapis.com') ||
      url.includes('firebaseio.com') ||
      url.includes('firestore')) return;

  if (e.request.method !== 'GET') return;

  // HTML: network-first — garante que o app sempre atualiza
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Demais assets: cache-first (fontes, ícones)
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return res;
      })
    ).catch(() => caches.match('./index.html'))
  );
});
