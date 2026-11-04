// Mapa: cria o MapLibre, carrega os dados e monta as camadas, os balões e a coluna de fotos.
// Carregado com defer, depois de maplibre-gl.js e antes de som.js, tour.js e navegacao.js (no build, tudo vira app.js).
const map = new maplibregl.Map({
  container: 'map',
  center: [-67.3, -9.7], zoom: 6.3, minZoom: 4.3, maxZoom: 16, attributionControl: false,
  // botões do MapLibre no idioma do site
  locale: {
    'NavigationControl.ZoomIn': t('Aproximar', 'Zoom in', 'Acercar'),
    'NavigationControl.ZoomOut': t('Afastar', 'Zoom out', 'Alejar'),
    'NavigationControl.ResetBearing': t('Voltar ao norte', 'Reset bearing to north', 'Volver al norte'),
    'AttributionControl.ToggleAttribution': t('Créditos do mapa', 'Toggle attribution', 'Créditos del mapa'),
  },
  maxBounds: [[-84, -24], [-40, 10]],
  style: {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      sat: { type: 'raster', tileSize: 256, maxzoom: 18,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        attribution: t('Imagens', 'Imagery', 'Imágenes') + ' © Esri, Maxar, Earthstar Geographics' },
      ref: { type: 'raster', tileSize: 256,
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'] }
    },
    layers: [
      // mar azul liso, que só aparece quando o satélite some (modo "só os desenhos"); a terra das
      // Américas entra por cima dele em verde (camada 'terra', carregada só quando o modo liga)
      { id: 'fundo', type: 'background', paint: { 'background-color': '#173a4f' } },
      { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.3, 'raster-brightness-max': 0.68, 'raster-contrast': 0.08 } },
      { id: 'ref', type: 'raster', source: 'ref', paint: { 'raster-opacity': 0.55 } }
    ]
  }
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');
map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
// a atribuição compacta abre sozinha em telas largas: começa sempre recolhida
const recolheAtribuicao = () => document.querySelectorAll('.maplibregl-ctrl-attrib').forEach(d => { d.removeAttribute('open'); d.classList.remove('maplibregl-compact-show'); });
map.once('load', recolheAtribuicao); map.once('idle', recolheAtribuicao);


let prontoOk; window.pronto = new Promise(r => prontoOk = r);
const camadas = { lidar: ['lidar', 'lidar-faixas'], nature: ['nature-mancha', 'nature'], science: ['science-mancha', 'science'], prob: ['prob'], fotos: ['fotos'], kalliola: ['kalliola'], ufpa: ['ufpa'], jacobsimg: ['jacobsimg'], jacobs: ['jacobs-contornos', 'jacobs-linhas', 'jacobs-pontos'] };
// chave estável de cada ponto, usada na URL (?sitio=n-12) e no histórico
const PREFIXO = { nature2026: 'n', science2023: 's', walker: 'f', jacobs: 'j', kalliola2024: 'k', ufpa2014: 'u', jacobs_img: 'ji' };
// dados sem licença para publicar (docs/data/local/, fora do git) só são buscados na cópia local
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
window.chave = p => `${PREFIXO[p.fonte]}-${p.id}`;
// pontos com imagem no balão: fotos do Walker e recortes de LiDAR da Nature
window.figuras = {};
window.temFoto = p => p.fonte === 'walker' || p.fonte === 'jacobs_img' || (p.fonte === 'nature2026' && !!figuras[p.nome]);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function carregar(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url);
  return r.json();
}
// pontos de Jacobs: baixados já, em paralelo com o estilo do mapa (aparecem de longe e servem aos links ?sitio=j-…)
const jacobsPontosPedido = carregar('data/jacobs/jacobs_pontos.geojson');
jacobsPontosPedido.catch(() => {});
// contornos e estradas de Jacobs (os arquivos mais pesados) só quando aparecem: a partir do zoom 9,
// no fundo verde ou no tour
let tracadosPedido = null;
window.garantirTracados = () => tracadosPedido ||= pronto
  .then(() => Promise.all(['contornos', 'linhas'].map(n => carregar(`data/jacobs/jacobs_${n}.geojson`))))
  .then(([cont, lin]) => {
    if (map.getSource('jacobs-contornos')) return;
    const antes = map.getLayer('jacobs-pontos') ? 'jacobs-pontos' : undefined;
    const vis = document.querySelector('input[data-camada="jacobs"]').checked ? 'visible' : 'none';
    map.addSource('jacobs-contornos', { type: 'geojson', data: cont });
    map.addSource('jacobs-linhas', { type: 'geojson', data: lin });
    map.addLayer({ id: 'jacobs-contornos', type: 'line', source: 'jacobs-contornos', minzoom: 11, layout: { visibility: vis }, paint: { 'line-color': '#7fd1c7', 'line-width': 1.5 } }, antes);
    map.addLayer({ id: 'jacobs-linhas', type: 'line', source: 'jacobs-linhas', minzoom: 10, layout: { visibility: vis }, paint: { 'line-color': '#f2f2a0', 'line-width': 1.2, 'line-dasharray': [2, 1] } }, antes);
    if (document.body.classList.contains('fundo-verde')) fundoVerde(true);
  })
  .catch((e) => { tracadosPedido = null; console.warn('traçados de Jacobs não carregaram', e); });
map.on('zoomend', () => { if (map.getZoom() >= 9) garantirTracados(); });

// de longe, os pontos viram uma mancha de calor; ao aproximar, ela some e os pontos aparecem
const SURGE = ['interpolate', ['linear'], ['zoom'], 5.6, 0, 7.4, 1];
function circulo(id, source, cor, raio) {
  map.addLayer({ id, type: 'circle', source, paint: {
    'circle-color': cor, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.2,
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, raio * 0.6, 10, raio, 15, raio * 1.8],
    'circle-opacity': ['interpolate', ['linear'], ['zoom'], 5.6, 0, 7.4, 0.92],
    'circle-stroke-opacity': SURGE } });
  // pontos com foto ficam por cima dos que caem no mesmo lugar (as camadas chegam em ordens diferentes)
  for (const c of ['jacobsimg', 'fotos']) if (map.getLayer(c)) map.moveLayer(c);
}
function mancha(id, source, peso) {
  map.addLayer({ id, type: 'heatmap', source, maxzoom: 9.5, paint: {
    'heatmap-weight': peso,
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.35, 9, 1],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, 8, 7, 18, 9, 28],
    'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(0,0,0,0)', 0.1, 'rgba(233,180,76,.18)', 0.3, 'rgba(233,160,70,.42)', 0.55, 'rgba(214,118,50,.62)', 0.8, 'rgba(200,100,42,.78)', 1, 'rgba(240,170,90,.88)'],
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 6.4, 0.85, 8.6, 0] } });
}

map.on('load', async () => {

  // Barbosa 2014 (dissertação da UFPA, CC BY-NC-ND): só na cópia local
  if (LOCAL) try {
    const ufpa = await carregar('data/local/ufpa2014.geojson');
    map.addSource('ufpa', { type: 'geojson', data: ufpa });
    circulo('ufpa', 'ufpa', '#b8a1e3', 4);
    map.setLayoutProperty('ufpa', 'visibility', 'none');
    window.dadosLocais = { ...(window.dadosLocais || {}), ufpa };
    document.getElementById('n-ufpa').textContent = fmt(ufpa.features.length);
    document.body.classList.add('tem-local');
  } catch (e) { /* sem a camada local */ }
  // imagens de J. Q. Jacobs (a autorização cobre só os traçados): só na cópia local
  if (LOCAL) try {
    const img = await carregar('data/local/jacobs_imagens.geojson');
    map.addSource('jacobsimg', { type: 'geojson', data: img });
    circulo('jacobsimg', 'jacobsimg', '#f2f2a0', 5);
    map.setLayoutProperty('jacobsimg', 'visibility', 'none');
    window.dadosLocais = { ...(window.dadosLocais || {}), jacobsimg: img };
    document.getElementById('n-jacobsimg').textContent = fmt(img.features.length);
  } catch (e) { /* sem a camada local */ }

  // pontos de J. Q. Jacobs (publicados com autorização dele); os contornos e estradas vêm depois (garantirTracados)
  try {
    const pts = await jacobsPontosPedido;
    pts.features.forEach((f, i) => { f.properties.id = i; });
    map.addSource('jacobs-pontos', { type: 'geojson', data: pts });
    window.dadosLocais = { ...(window.dadosLocais || {}), jacobs: pts };
    circulo('jacobs-pontos', 'jacobs-pontos', '#7fd1c7', 4);
    document.getElementById('n-jacobs').textContent = fmt(pts.features.length);
  } catch (e) { console.warn('camadas do Jacobs não carregaram', e); }

  // LiDAR aberto (EBA/INPE): relevo sombreado em tiles, só onde há faixa; de longe, o contorno das faixas
  const faixas = await carregar('data/lidar_faixas.geojson');
  const lim = faixas.features.flatMap(f => f.geometry.coordinates[0]).reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [180, 90, -180, -90]);
  map.addSource('lidar', { type: 'raster', tiles: [new URL('data/lidar/{z}/{x}/{y}.webp', location.href).href.replace(/%7B/g, '{').replace(/%7D/g, '}')], tileSize: 256, minzoom: 10, maxzoom: 16, bounds: lim,
    attribution: 'LiDAR: <a href="https://zenodo.org/records/4968706">EBA/INPE</a> (CC BY 4.0)' });
  map.addLayer({ id: 'lidar', type: 'raster', source: 'lidar', minzoom: 10, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0, 11.5, 1], 'raster-fade-duration': 200 } }, 'ref');
  map.addSource('lidar-faixas', { type: 'geojson', data: faixas });
  map.addLayer({ id: 'lidar-faixas', type: 'line', source: 'lidar-faixas', maxzoom: 13, paint: {
    'line-color': '#d9cdb6', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.5, 12, 1], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0.9, 13, 0] } }, 'ref');
  document.getElementById('n-lidar').textContent = fmt(faixas.features.length);

  const [sci, nat, fot, kal] = await Promise.all(['science2023', 'nature2026', 'walker_fotos', 'kalliola2024'].map(n => carregar(`data/${n}.geojson`)));
  // recortes de LiDAR das figuras da Nature (CC BY 4.0), ligados ao ponto pelo nome
  window.figuras = await carregar('data/nature_figuras.json').catch(() => ({}));
  map.addSource('science', { type: 'geojson', data: sci });
  map.addSource('nature', { type: 'geojson', data: nat });
  map.addSource('fotos', { type: 'geojson', data: fot });
  mancha('science-mancha', 'science', 0.6);
  mancha('nature-mancha', 'nature', 0.7);
  circulo('fotos', 'fotos', '#9cc3e6', 3.6);
  // Kalliola et al. 2024 (Acta Amazonica, CC BY 4.0): começa desligada, porque repete muitos pontos das outras bases
  map.addSource('kalliola', { type: 'geojson', data: kal });
  circulo('kalliola', 'kalliola', '#e48fa8', 4);
  map.setLayoutProperty('kalliola', 'visibility', 'none');
  circulo('science', 'science', '#e9b44c', 4.5);
  circulo('nature', 'nature', ['case', ['get', 'aquiry'], '#c8642a', '#8c6b52'], 5.5);
  const n = { nature: nat.features.length, science: sci.features.length, fotos: fot.features.length };
  document.getElementById('n-kalliola').textContent = fmt(kal.features.length);
  // o texto do painel já vem com os números certos: só reescreve se mudarem (reescrever igual conta como
  // uma pintura nova e atrasa o "maior conteúdo" medido pelo Lighthouse)
  const texto = (id, v) => { const e = document.getElementById(id); if (e && e.textContent !== v) e.textContent = v; };
  for (const k in n) { texto(`n-${k}`, fmt(n[k])); texto(`lede-${k}`, fmt(n[k])); }
  texto('lede-total', fmt(n.nature + n.science));
  window.dados = { nature: nat, science: sci, fotos: fot, kalliola: kal, ...(window.dadosLocais || {}) };
  montarFotos(fot.features);

  // só os pontos com foto têm o botão de compartilhar no balão
  const botaoCompartilhar = p => !temFoto(p) ? '' : `<button class="compartilhar" type="button" data-sitio="${esc(chave(p))}">${t('Compartilhar', 'Share', 'Compartir')}</button>`;
  const popup = (f) => conteudo(f) + botaoCompartilhar(f.properties);
  const conteudo = (f) => {
    const p = f.properties;
    const fig0 = p.fonte === 'nature2026' && figuras[p.nome];
    const fig = fig0 && { ...fig0, legenda: fig0.legenda.replace('LiDAR: grupo ', `LiDAR: ${t('grupo', 'group', 'grupo')} `) };
    if (fig) return `<img src="${esc(fig.foto)}" alt="${esc(fig.legenda)}" loading="lazy"><b>${esc(p.nome)}</b><br>${p.area_ha} ha${p.aquiry === true || p.aquiry === 'true' ? '<span class="tag">Aquiry</span>' : ''}<span class="tag">LiDAR</span><br><span class="credito">${esc(fig.legenda)}. ${esc(fig.credito)}</span>`;
    if (p.fonte === 'nature2026') return `<b>${esc(p.nome)}</b><br>${p.area_ha} ha${p.aquiry === true || p.aquiry === 'true' ? '<span class="tag">Aquiry</span>' : `<span class="tag">${t('não Aquiry', 'not Aquiry', 'no Aquiry')}</span>`}<span class="tag">LiDAR</span>${p.parcial === true || p.parcial === 'true' ? `<span class="tag">${t('parcial', 'partial', 'parcial')}</span>` : ''}<br><small>Pärssinen et al. 2026, <i>Nature</i></small>`;
    if (p.fonte === 'walker') return `<img src="${esc(p.foto)}" alt="${esc(p.legenda)}" loading="lazy"><b>${esc(p.legenda)}</b><br><span class="credito">${t('Foto', 'Photo', 'Foto')}: ${esc(p.credito)}</span>`;
    if (p.fonte === 'jacobs_img') return `<img src="${esc(p.foto)}" alt="${esc(p.legenda)}" loading="lazy"><b>${esc(p.legenda)}</b><br><span class="credito">© J. Q. Jacobs, <a href="${esc(p.url)}" target="_blank" rel="noopener">jqjacobs.net</a> · ${t('posição', 'position', 'posición')} ${esc(p.posicao)} · ${t('só na cópia local', 'local copy only', 'solo en la copia local')}</span>`;
    if (p.fonte === 'ufpa2014') return `<b>${esc(p.nome)}</b><br><span class="tag">${esc(p.forma)}</span><span class="tag">${esc(p.delimitacao)}</span><br><small>${esc(p.municipio)} · ${t('integridade', 'integrity', 'integridad')} ${esc(p.integridade || '?')} · ${esc(p.uso || '')}${p.encontrado ? '<br>' + t('encontrado por', 'found by', 'hallado por') + ': ' + esc(p.encontrado) : ''}</small><br><small>Barbosa 2014, UFPA (CC BY-NC-ND)</small>`;
    if (p.fonte === 'kalliola2024') return `<b>${esc(p.nome)}</b><br><small><a href="https://doi.org/10.23729/da98421d-d65d-4045-bc93-344a0837cc93" target="_blank" rel="noopener">Kalliola et al. 2024</a>, <i>Acta Amazonica</i> (CC BY 4.0)</small>`;
    if (p.fonte === 'science2023') return `<b>${t('Estrutura de terra', 'Earthwork', 'Estructura de tierra')}</b><br><small>${t('Base', 'Database', 'Base')}: ${esc(p.base)}<br>Peripato et al. 2023, <i>Science</i></small>`;
    return balaoJacobs(p);
  };
  // ponto de J. Q. Jacobs: forma, dimensões, altitude e registro vêm da planilha dele (amazon_geoglyphs.xls)
  const FORMAS = {
    quadrangle: ['quadrângulo', 'quadrangle', 'cuadrángulo'], geoglyph: ['geoglifo', 'geoglyph', 'geoglifo'], zanja: ['zanja', 'zanja', 'zanja'],
    enclosure: ['recinto', 'enclosure', 'recinto'], circle: ['círculo', 'circle', 'círculo'], oval: ['oval', 'oval', 'óvalo'],
    square: ['quadrado', 'square', 'cuadrado'], rectangle: ['retângulo', 'rectangle', 'rectángulo'], parallelogram: ['paralelogramo', 'parallelogram', 'paralelogramo'],
    ellipse: ['elipse', 'ellipse', 'elipse'], octagon: ['octógono', 'octagon', 'octógono'], hexagon: ['hexágono', 'hexagon', 'hexágono'],
    pentagon: ['pentágono', 'pentagon', 'pentágono'], 'mound village': ['aldeia de montículos', 'mound village', 'aldea de montículos'],
  };
  const balaoJacobs = (p) => {
    const forma = FORMAS[p.forma_en] ? t(...FORMAS[p.forma_en]) : (p.forma || p.grupo);
    const m = (v) => `${fmt(v)} m`;
    const dim = p.dim_a_m ? (p.dim_b_m ? `${fmt(p.dim_a_m)} × ${m(p.dim_b_m)}` : m(p.dim_a_m)) : '';
    const linhas = [];
    if (dim) linhas.push(dim);
    if (p.altitude_m) linhas.push(t(`altitude ${m(p.altitude_m)}`, `elevation ${m(p.altitude_m)}`, `altitud ${m(p.altitude_m)}`));
    if (p.registro) linhas.push(p.registro_tipo === 'imagem'
      ? t(`visto em imagem de satélite de ${p.registro}`, `seen on satellite imagery from ${p.registro}`, `visto en imagen satelital de ${p.registro}`)
      : t(`registro: ${esc(p.registro)}`, `record: ${esc(p.registro)}`, `registro: ${esc(p.registro)}`));
    return `<b>${esc(p.nome || p.codigo)}</b><br><span class="tag">${esc(forma)}</span><span class="tag">${esc(p.codigo)}</span>`
      + (linhas.length ? `<br><small>${linhas.join(' · ')}</small>` : '')
      + `<br><small><a href="https://www.jqjacobs.net/archaeology/geoglyph.html" target="_blank" rel="noopener">J. Q. Jacobs</a></small>`;
  };
  window.abrirPopup = (f) => {
    document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
    return new maplibregl.Popup({ offset: 8, className: temFoto(f.properties) ? 'foto' : '' })
      .setLngLat(f.geometry.coordinates).setHTML(popup(f)).addTo(map);
  };
  const PONTOS = ['nature', 'science', 'kalliola', 'ufpa', 'jacobsimg', 'fotos', 'jacobs-pontos'];
  // o ponto com foto tem prioridade, como um z-index: um ponto sem foto a até 30 m de um com foto
  // (o mesmo sítio, em outra base) cede a vez a ele, se a camada da foto estiver ligada
  const visivel = id => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none';
  const metros = ([x1, y1], [x2, y2]) => Math.hypot((x2 - x1) * 111320 * Math.cos(y1 * Math.PI / 180), (y2 - y1) * 110540);
  window.preferirFoto = (f) => {
    if (!f || temFoto(f.properties)) return f;
    const candidatos = [['fotos', dados.fotos], ['jacobsimg', dados.jacobsimg], ['nature', dados.nature]]
      .filter(([id, fc]) => fc && visivel(id)).flatMap(([, fc]) => fc.features).filter(g => temFoto(g.properties));
    let melhor = f, dmin = 30;
    for (const g of candidatos) {
      const d = metros(f.geometry.coordinates, g.geometry.coordinates);
      if (d <= dmin) { melhor = g; dmin = d; }
    }
    return melhor;
  };
  // um clique só para todas as camadas: onde dois pontos se sobrepõem, abre o que tem foto no balão
  map.on('click', (e) => {
    const layers = PONTOS.filter(id => map.getLayer(id));
    const fs = map.queryRenderedFeatures(e.point, { layers });
    if (fs.length) abrirSitio(fs.find(f => temFoto(f.properties)) || preferirFoto(fs[0]));
  });
  for (const id of PONTOS) {
    map.on('mouseenter', id, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', id, () => map.getCanvas().style.cursor = '');
  }
  prontoOk();
});

// painel de miniaturas: clicar voa até o sítio e abre a foto
function montarFotos(feats) {
  const grade = document.getElementById('fotos-grade');
  document.getElementById('fotos-n').textContent = fmt(feats.length);
  const obs = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { e.target.src = e.target.dataset.src; obs.unobserve(e.target); }
  }), { root: grade, rootMargin: '400px' });
  const criar = (f) => {
    const b = document.createElement('button');
    b.type = 'button'; b.title = f.properties.legenda; b.dataset.k = chave(f.properties);
    const img = document.createElement('img');
    img.alt = f.properties.legenda; img.dataset.src = f.properties.miniatura;
    b.append(img); grade.append(b); obs.observe(img);
    b.addEventListener('click', () => abrirSitio(f, { voar: true }));
  };
  // as primeiras 40 miniaturas já; as outras em lotes nos momentos ociosos (são 664 botões: criados de uma vez,
  // travavam a abertura no celular)
  feats.slice(0, 40).forEach(criar);
  let i = 40;
  const ocioso = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ timeRemaining: () => 8 }), 60));
  const lote = (prazo) => { while (i < feats.length && prazo.timeRemaining() > 3) criar(feats[i++]); if (i < feats.length) ocioso(lote); };
  ocioso(lote);
  if (feats.length) document.body.classList.add('tem-fotos');
  map.resize();
}

// quando a coluna de fotos aparece ou some, o mapa muda de largura; o MapLibre manteria o centro e tudo
// escorregaria para o lado. Aqui a parte que continua visível fica parada: o novo centro é o ponto que,
// antes do ajuste, estava no meio da área que sobra (a borda esquerda do mapa não se mexe)
window.redimensionar = (mudar) => {
  const h = map.getCanvas().clientHeight;
  mudar();
  const larg = document.getElementById('map').clientWidth;  // já com a coluna nova (força o layout)
  const centro = map.unproject([larg / 2, h / 2]);           // ainda na projeção antiga
  map.resize();
  map.jumpTo({ center: centro });
};

// mapa de probabilidade (Science 2023): ~550 KB, baixado só quando a camada é ligada (ou o tour começa)
let probPedido = null;
window.garantirProb = () => probPedido ||= carregar('data/probabilidade.json').then((prob) => {
  if (map.getSource('prob')) return;
  map.addSource('prob', { type: 'image', url: 'data/probabilidade.webp', coordinates: prob.coordinates });
  map.addLayer({ id: 'prob', type: 'raster', source: 'prob', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.65, 'raster-resampling': 'linear' } }, 'ref');
});

window.mostrar = (nome, on) => { const cb = document.querySelector(`input[data-camada="${nome}"]`); if (cb && cb.checked !== on) { cb.checked = on; cb.dispatchEvent(new Event('change')); } };
document.querySelectorAll('input[data-camada]').forEach(cb => cb.addEventListener('change', async () => {
  // camadas que só são baixadas quando ligadas
  if (cb.checked && cb.dataset.camada === 'prob') await garantirProb();
  if (cb.checked && cb.dataset.camada === 'jacobs') await garantirTracados();
  for (const id of camadas[cb.dataset.camada]) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', cb.dataset.camada === 'prob' || cb.dataset.camada === 'jacobs' ? (document.querySelector(`input[data-camada="${cb.dataset.camada}"]`).checked ? 'visible' : 'none') : (cb.checked ? 'visible' : 'none'));
  if (cb.dataset.camada === 'prob') document.getElementById('legenda-prob').style.display = cb.checked ? 'block' : 'none';
}));

// modo "só os desenhos": tira o satélite e os rótulos e pinta os traçados de ocre sobre o verde,
// como os desenhos de J. Q. Jacobs; fica no endereço (?fundo=verde) para o link compartilhado abrir igual
let antesDoVerde = null;
window.fundoVerde = (on) => {
  redimensionar(() => document.body.classList.toggle('fundo-verde', on));
  document.getElementById('fundo-verde').checked = on;
  const aplicar = () => {
    map.setLayoutProperty('sat', 'visibility', on ? 'none' : 'visible');
    map.setLayoutProperty('ref', 'visibility', on ? 'none' : 'visible');
    const linha = (id, cor, larg) => map.getLayer(id) && (map.setPaintProperty(id, 'line-color', cor), map.setPaintProperty(id, 'line-width', larg));
    linha('jacobs-contornos', on ? '#e9b44c' : '#7fd1c7', on ? ['interpolate', ['linear'], ['zoom'], 9, 1, 14, 2.2] : 1.5);
    linha('jacobs-linhas', on ? '#d9b46a' : '#f2f2a0', on ? ['interpolate', ['linear'], ['zoom'], 9, 0.8, 14, 1.6] : 1.2);
    if (map.getLayer('jacobs-linhas')) map.setPaintProperty('jacobs-linhas', 'line-dasharray', on ? [1, 0] : [2, 1]);
    // terra das Américas em verde sobre o mar azul (Natural Earth 1:50 mi, domínio público)
    if (on && !map.getSource('americas')) {
      map.addSource('americas', { type: 'geojson', data: 'data/americas.geojson' });
      map.addLayer({ id: 'terra', type: 'fill', source: 'americas', paint: { 'fill-color': '#1f3d29', 'fill-antialias': true } }, 'sat');
      map.addLayer({ id: 'costa', type: 'line', source: 'americas', paint: { 'line-color': '#2e5a3e', 'line-width': 0.8 } }, 'sat');
    }
    for (const id of ['terra', 'costa']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    // no verde, os traçados aparecem desde longe: de perto, finos e na escala real; de longe, um pouco mais
    // grossos, para cada recinto virar uma marca e cada calçada um risco visível no continente
    if (map.getLayer('jacobs-contornos')) map.setLayerZoomRange('jacobs-contornos', on ? 0 : 11, 24);
    if (map.getLayer('jacobs-linhas')) map.setLayerZoomRange('jacobs-linhas', on ? 0 : 10, 24);
    linha('jacobs-contornos', on ? '#e9b44c' : '#7fd1c7', on ? ['interpolate', ['linear'], ['zoom'], 4, 3, 7, 2.4, 10, 1.4, 14, 2.2] : 1.5);
    linha('jacobs-linhas', on ? '#d9b46a' : '#f2f2a0', on ? ['interpolate', ['linear'], ['zoom'], 4, 1.1, 7, 1, 10, 0.9, 14, 1.6] : 1.2);
    // só os traçados: pontos, manchas, fotos e o LiDAR somem; ao sair, as camadas voltam como estavam
    const SO_PONTOS = ['nature', 'science', 'lidar', 'prob', 'fotos', 'kalliola', 'ufpa', 'jacobsimg'];
    if (on) {
      antesDoVerde = SO_PONTOS.map((n) => [n, document.querySelector(`input[data-camada="${n}"]`)?.checked]);
      SO_PONTOS.forEach((n) => mostrar(n, false));
      mostrar('jacobs', true);
    } else if (antesDoVerde) {
      antesDoVerde.forEach(([n, v]) => v !== undefined && mostrar(n, v));
      antesDoVerde = null;
    }
    if (map.getLayer('jacobs-pontos')) map.setLayoutProperty('jacobs-pontos', 'visibility', on ? 'none' : (document.querySelector('input[data-camada="jacobs"]').checked ? 'visible' : 'none'));
  };
  if (window.dados) aplicar(); else pronto.then(aplicar);
  if (on) garantirTracados();
  document.dispatchEvent(new Event('fundo'));
};
document.getElementById('fundo-verde').addEventListener('change', (e) => fundoVerde(e.target.checked));
// service worker (docs/sw.js): a próxima visita abre com o site, os dados e os tiles já guardados; só no site publicado
if ('serviceWorker' in navigator && !LOCAL) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
if (new URLSearchParams(location.search).get('fundo') === 'verde') fundoVerde(true);
