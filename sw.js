// Controle de Temperaturas - guarda o app no celular para abrir sem internet.
const VERSAO = 'v14';
const CACHE = 'controle-temperaturas-' + VERSAO;
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icone_192.png', './icone_512.png', './icone_512_maskable.png'];
// Opcionais: se algum faltar no servidor, a instalação não falha.
const OPCIONAIS = ['./splash.png', './splash-dark.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
      .then(c => c.addAll(ARQUIVOS).then(() => Promise.all(OPCIONAIS.map(u => c.add(u).catch(() => {})))))
      .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  if (new URL(r.url).origin !== location.origin) return;

  // Página: tenta a internet por até 4 s (versão nova); sem sinal, usa a guardada.
  if (r.mode === 'navigate') {
    e.respondWith(
      Promise.race([fetch(r), new Promise((_, rej) => setTimeout(rej, 4000))])
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copia));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Demais arquivos: usa o guardado e completa com a internet.
  e.respondWith(
    caches.match(r).then(guardado => guardado || fetch(r).then(res => {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(r, copia));
      return res;
    }))
  );
});
