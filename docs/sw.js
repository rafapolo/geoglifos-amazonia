// Service worker: guarda o site, os dados e os tiles já vistos, para a próxima visita abrir na hora
// (e funcionar mesmo sem internet no que já foi visto). Registrado só no site publicado (index.html).
//   página (navegação)     rede primeiro; sem rede, a última guardada
//   scripts, estilos, dados a guardada na hora, e atualiza por trás para a próxima visita
//   tiles (satélite, LiDAR) a guardada se houver; até MAX_TILES, apagando os mais antigos
const VERSAO = '__VERSAO__'; // trocada pelo commit no build (script/build.js)
const SITE = `geoglifos-site-${VERSAO}`;
const TILES = 'geoglifos-tiles-v1';
const MAX_TILES = 2000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('geoglifos-site-') && k !== SITE) await caches.delete(k);
  await self.clients.claim();
})()));

const eTile = (u) => u.hostname === 'server.arcgisonline.com' || /\/data\/lidar\/\d+\//.test(u.pathname);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const u = new URL(req.url);
  if (eTile(u)) e.respondWith(cacheEmPrimeiro(req));
  else if (u.origin !== location.origin) return;
  else if (req.mode === 'navigate') e.respondWith(redeEmPrimeiro(req));
  else e.respondWith(guardadaEAtualiza(req, e));
});

async function redeEmPrimeiro(req) {
  const c = await caches.open(SITE);
  try {
    const r = await fetch(req);
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch {
    return (await c.match(req)) || (await c.match('./')) || Response.error();
  }
}

async function guardadaEAtualiza(req, e) {
  const c = await caches.open(SITE);
  const guardada = await c.match(req);
  const rede = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; });
  if (guardada) { e.waitUntil(rede.catch(() => {})); return guardada; }
  return rede;
}

async function cacheEmPrimeiro(req) {
  const c = await caches.open(TILES);
  const guardado = await c.match(req);
  if (guardado) return guardado;
  const r = await fetch(req);
  if (r.ok) { await c.put(req, r.clone()); aparar(c); }
  return r;
}

let aparando = false;
async function aparar(c) {
  if (aparando) return;
  aparando = true;
  try {
    const ks = await c.keys();
    for (let i = 0; i < ks.length - MAX_TILES; i++) await c.delete(ks[i]);
  } finally { aparando = false; }
}
