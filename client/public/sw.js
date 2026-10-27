/* ============================================================
   Service Worker do PWA (Ashow e Jazer)

   • guarda a "casca" do site para abrir mesmo sem internet
   • os ficheiros com hash ficam em cache (o HTML vai sempre
     à rede para o site receber as atualizações)
   • recebe os pushes do servidor e mostra a notificação
   ============================================================ */

const CACHE = 'locaus-v10';
const SHELL = ['/', '/index.html', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // CDNs, fontes: deixa passar
  if (url.pathname.startsWith('/api/')) return; // API: sempre rede (dados vivos)

  // Navegação (abrir uma página): rede primeiro, casca guardada se falhar
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copia)).catch(() => {});
          return r;
        })
        .catch(() =>
          caches
            .match('/index.html')
            .then((r) => r || caches.match('/'))
            .then((r) => r || new Response('Sem ligação', { status: 503, headers: { 'Content-Type': 'text/plain' } })),
        ),
    );
    return;
  }

  // Resto (js, css, imagens): SIEMPRE rede primeiro — assim
  // reiniciar o servidor com um build novo basta para atualizar o site.
  // A casca (/index.html, /) continua em cache para abrir offline.
  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r && r.status === 200 && r.type === 'basic') {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return r;
      })
      .catch(() =>
        caches
          .match(req)
          .then((r) => r || new Response('Sem ligação', { status: 503, headers: { 'Content-Type': 'text/plain' } })),
      ),
  );
});

/* ---------------- Web Push ---------------- */

self.addEventListener('push', (e) => {
  let dados = { title: 'Locaus', body: '', link: '/' };
  try {
    if (e.data) dados = { ...dados, ...e.data.json() };
  } catch {
    if (e.data) dados.body = e.data.text();
  }
  e.waitUntil(
    self.registration.showNotification(dados.title || 'Locaus', {
      body: dados.body || '',
      icon: dados.icon || '/icon-192.png',
      badge: '/icon-192.png',
      image: dados.image || dados.icon || '/icon-512.png',
      tag: dados.tag || 'locaus',
      renotify: Boolean(dados.tag),
      silent: false,
      requireInteraction: dados.tipo === 'chat' || dados.tipo === 'live',
      vibrate: [80, 40, 80],
      timestamp: Date.now(),
      data: { link: dados.link || '/', tipo: dados.tipo || 'geral' },
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ('focus' in c) {
          c.navigate(link);
          return c.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
