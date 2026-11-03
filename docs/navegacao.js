// Navegação: voltar/avançar do navegador, links diretos e compartilhar.
// Cada sítio (ou foto) aberto, o Sobre e o tour viram uma entrada no histórico; voltar e avançar
// refazem o estado, inclusive a câmera. Na URL: ?sitio=<chave> ou ?sobre, e a câmera no
// #zoom/lat/lng/rumo/inclinação, de modo que qualquer vista pode ser compartilhada.
(() => {
  const $ = (id) => document.getElementById(id);
  const sobre = $('sobre');
  const movel = matchMedia('(max-width: 640px)');
  let silencioso = false; // remoção de balões feita por nós, não pelo usuário

  // ---------- câmera <-> #hash ----------
  const cam = () => {
    const c = map.getCenter();
    return { center: [+c.lng.toFixed(5), +c.lat.toFixed(5)], zoom: +map.getZoom().toFixed(2),
      bearing: Math.round(map.getBearing()), pitch: Math.round(map.getPitch()) };
  };
  const hash = (k) => `#${k.zoom}/${k.center[1]}/${k.center[0]}/${k.bearing}/${k.pitch}`;
  function lerHash() {
    const p = location.hash.slice(1).split('/').map(Number);
    if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite))
      return { zoom: p[0], center: [p[2], p[1]], bearing: p[3] || 0, pitch: p[4] || 0 };
  }
  const inicial = lerHash();
  if (inicial) map.jumpTo(inicial);
  // o pedido da URL (?sitio, ?sobre) é lido já: movimentos do mapa antes dos dados não podem apagá-lo
  const pedido = new URLSearchParams(location.search);
  history.replaceState({ sitio: pedido.get('sitio'), sobre: pedido.has('sobre') }, '', location.href);

  // ---------- histórico ----------
  const atual = () => history.state || {};
  function url(s, absoluta = false) {
    const q = [];
    if (s.sitio) q.push(`sitio=${encodeURIComponent(s.sitio)}`);
    if (s.sobre) q.push('sobre');
    return (absoluta ? location.origin : '') + location.pathname + (q.length ? `?${q.join('&')}` : '') + hash(s.cam || cam());
  }
  // atualiza a entrada atual (sem criar outra)
  function trocar(mud = {}) {
    const s = { ...atual(), ...mud, cam: cam() };
    history.replaceState(s, '', url(s));
  }
  // cria uma entrada nova; a atual guarda a câmera de agora, para o "voltar" retornar a ela
  function empurrar(mud) {
    trocar();
    const s = { ...atual(), tour: false, ...mud, empurrado: true, cam: cam() };
    history.pushState(s, '', url(s));
  }
  map.on('moveend', () => { if (!document.body.classList.contains('touring')) trocar(); });

  // ---------- sítios ----------
  const indice = new Map();
  const fecharBaloes = () => {
    silencioso = true;
    document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
    silencioso = false;
  };
  function destacarMini(k) {
    document.querySelectorAll('#fotos-grade .ativo').forEach((x) => x.classList.remove('ativo'));
    const b = document.querySelector(`#fotos-grade [data-k="${CSS.escape(k || '')}"]`);
    if (b) { b.classList.add('ativo'); b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }
  }
  function balao(f) {
    fecharBaloes();
    const k = chave(f.properties);
    const p = abrirPopup(f);
    p.on('close', () => {
      if (silencioso) return;
      destacarMini(null);
      if (atual().sitio === k) trocar({ sitio: null });
    });
    destacarMini(k);
    return p;
  }
  // desloca o ponto para baixo do centro, deixando o balão (que abre acima dele) inteiro na tela
  const deslocamento = () => (movel.matches ? [0, 70] : [innerWidth > 900 ? 46 : 0, 120]);

  // o ponto está à vista, com espaço acima para o balão e sem nada por cima (painel, fotos, folha)?
  function cabeNaTela(f) {
    if (map.getZoom() < 7.4) return false; // de longe os pontos nem aparecem
    const { x, y } = map.project(f.geometry.coordinates);
    let esq = 0, dir = innerWidth, cima = $('topo').getBoundingClientRect().bottom, baixo = innerHeight;
    for (const el of [painel, $('fotos')]) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).display === 'none') continue;
      if (r.width > innerWidth * 0.8) { if (r.top > innerHeight / 2) baixo = Math.min(baixo, r.top); else cima = Math.max(cima, r.bottom); }
      else if (r.left < innerWidth / 2) esq = Math.max(esq, r.right); else dir = Math.min(dir, r.left);
    }
    const alto = temFoto(f.properties) ? 380 : 160; // altura do balão acima do ponto
    return x > esq + 130 && x < dir - 130 && y > cima + alto && y < baixo - 20;
  }

  window.abrirSitio =(f, { voar = false, empurra = true } = {}) => {
    const k = chave(f.properties);
    if (empurra && atual().sitio !== k) empurrar({ sitio: k, sobre: false });
    if (movel.matches) folha(false);
    if (f.properties.fonte === 'walker') mostrar('fotos', true);
    if (!voar) return balao(f);
    fecharBaloes();
    map.flyTo({ center: f.geometry.coordinates, zoom: Math.max(map.getZoom(), 14.5), pitch: 40, bearing: 0,
      offset: deslocamento(), speed: 1.1, curve: 1.5, essential: true });
    map.once('moveend', () => { if (atual().sitio === k) balao(f); });
  };

  // ---------- Sobre ----------
  $('sobre-abrir').addEventListener('click', () => {
    if (!sobre.open) { empurrar({ sobre: true }); sobre.showModal(); }
  });
  let fechandoPeloHistorico = false;
  sobre.addEventListener('close', () => {
    if (fechandoPeloHistorico || !atual().sobre) return;
    if (atual().empurrado) history.back(); // o "voltar" desfaz a abertura
    else trocar({ sobre: false });          // chegou por link direto: só tira o ?sobre
  });

  // ---------- voltar / avançar ----------
  addEventListener('popstate', (e) => {
    const s = e.state || {};
    if (window.tour?.ativo() && !s.tour) tour.parar(true, true);
    if (s.sobre && !sobre.open) sobre.showModal();
    if (!s.sobre && sobre.open) { fechandoPeloHistorico = true; sobre.close(); fechandoPeloHistorico = false; }
    const f = s.sitio && indice.get(s.sitio);
    if (f) {
      balao(f);
      if (s.cam) map.flyTo({ ...s.cam, speed: 1.4, curve: 1.4, essential: true });
    } else {
      fecharBaloes();
      destacarMini(null);
      if (s.cam) map.flyTo({ ...s.cam, speed: 1.4, curve: 1.4, essential: true });
    }
  });

  // ---------- compartilhar ----------
  const toast = $('toast');
  let toastT = 0;
  function aviso(txt) {
    toast.textContent = txt; toast.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 2200);
  }
  async function compartilhar(k) {
    const s = { ...atual(), sobre: false, cam: cam() };
    if (k !== undefined) s.sitio = k;
    const f = s.sitio && indice.get(s.sitio);
    const nome = f ? (f.properties.nome || f.properties.legenda || 'Estrutura de terra') : null;
    const dados = {
      title: nome ? `${nome} · Geoglifos da Amazônia` : 'Geoglifos da Amazônia',
      text: nome ? `${nome}, no mapa dos geoglifos da Amazônia` : 'O mapa das estruturas de terra pré-colombianas do sudoeste da Amazônia',
      url: url(s, true),
    };
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share(dados); } catch { /* cancelado */ }
      return;
    }
    try { await navigator.clipboard.writeText(dados.url); aviso('Link copiado'); }
    catch { prompt('Copie o link:', dados.url); }
  }
  $('compartilhar').addEventListener('click', () => compartilhar());
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.compartilhar[data-sitio]');
    if (b) compartilhar(b.dataset.sitio);
  });

  // ---------- folha do celular ----------
  const painel = $('painel');
  function folha(aberta) {
    painel.classList.toggle('aberta', aberta);
    document.body.classList.toggle('folha-aberta', aberta);
    $('alca').setAttribute('aria-expanded', String(aberta));
  }
  window.folha = folha;
  $('alca').addEventListener('click', () => folha(!painel.classList.contains('aberta')));
  painel.querySelector('h1').addEventListener('click', () => { if (movel.matches) folha(!painel.classList.contains('aberta')); });
  let y0 = null;
  painel.addEventListener('touchstart', (e) => { if (e.target.closest('#alca, h1')) y0 = e.touches[0].clientY; }, { passive: true });
  painel.addEventListener('touchend', (e) => {
    if (y0 === null) return;
    const dy = e.changedTouches[0].clientY - y0; y0 = null;
    if (Math.abs(dy) > 30) folha(dy < 0);
  });

  // ---------- depois de carregar os dados: índice e link direto ----------
  pronto.then(() => {
    for (const [nome, fc] of Object.entries(dados)) for (const f of fc.features) indice.set(chave(f.properties), f);
    const k = pedido.get('sitio');
    const f = k && indice.get(k);
    const s = { sitio: f ? k : null, sobre: pedido.has('sobre') };
    if (f) {
      history.replaceState({ ...s, cam: cam() }, '', url({ ...s, cam: cam() }));
      // a câmera do link é a de quem compartilhou: se o ponto não cabe nesta tela com o balão
      // (que abre acima dele), voa até ele em vez de abrir o balão fora da vista
      if (inicial && cabeNaTela(f)) balao(f); else abrirSitio(f, { voar: true, empurra: false });
    } else trocar(s);
    if (s.sobre && !sobre.open) sobre.showModal();
  });
})();
