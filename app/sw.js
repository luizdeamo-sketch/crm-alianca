// Service worker do CRM Aliança (celular). Guarda só o "casco" do aplicativo (tela, ícones). Dados de clientes NUNCA são guardados no aparelho.
const VERSAO = 'alianca-app-v2';
const CASCO = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(CASCO)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // Supabase e CDNs passam direto pela rede
  if (req.mode === 'navigate') {   // tela principal: rede primeiro (sempre a versão nova), cache se estiver sem sinal
    e.respondWith(fetch(req).then(r => { const copia = r.clone(); caches.open(VERSAO).then(c => c.put('./index.html', copia)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(h => h || fetch(req).then(r => { if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); } return r; })));
});
