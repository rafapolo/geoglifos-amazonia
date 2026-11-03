// Tour: um passeio de ~2 min pela câmera, no estilo de cinema (faixas 2.39:1, legenda com kicker e frase).
// Abre pelo botão "Tour" ou por ?tour=1. Esc ou "✕ esc" param e devolvem o mapa como estava.
// Os textos vêm da reportagem da BBC News Brasil (30/09/2026) e de Pärssinen et al. 2026 (Nature);
// as contagens são calculadas dos dados carregados.
(() => {
  const $ = (id) => document.getElementById(id);
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => n.toLocaleString('pt-BR');
  const TOTAL = 120000;

  let ativo = false, inicio = 0, raf = 0, salvo = null;
  const pendentes = new Set();

  class Parado extends Error {}

  // espera que é interrompida na hora pelo "parar"
  const espera = (ms) => new Promise((ok, falha) => {
    const p = { falha };
    p.id = setTimeout(() => { pendentes.delete(p); ok(); }, Math.max(0, ms));
    pendentes.add(p);
  });

  const voar = (alvo, ms) => {
    if (reduz) map.jumpTo(alvo);
    else map.flyTo({ ...alvo, duration: ms, essential: true, curve: 1.3 });
  };
  const deslizar = (alvo, ms) => {
    if (reduz) return;
    map.easeTo({ ...alvo, duration: ms, easing: (t) => t, essential: true });
  };

  // movimento contínuo de câmera quadro a quadro: gira (inclusive mais de 180°), inclina,
  // aproxima e desloca o centro ao mesmo tempo, com aceleração suave na entrada e na saída
  let anim = 0;
  const suave = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
  function orbita({ giro = 0, pitch, zoom, centro }, ms) {
    cancelAnimationFrame(anim);
    if (reduz) return;
    const b0 = map.getBearing(), p0 = map.getPitch(), z0 = map.getZoom(), c0 = map.getCenter();
    const t0 = performance.now();
    const passo = (agora) => {
      if (!ativo) return;
      const t = Math.min(1, (agora - t0) / ms), e = suave(t);
      const cam = { bearing: b0 + giro * e };
      if (pitch !== undefined) cam.pitch = p0 + (pitch - p0) * e;
      if (zoom !== undefined) cam.zoom = z0 + (zoom - z0) * e;
      if (centro) cam.center = [c0.lng + (centro[0] - c0.lng) * e, c0.lat + (centro[1] - c0.lat) * e];
      map.jumpTo(cam);
      if (t < 1) anim = requestAnimationFrame(passo);
    };
    anim = requestAnimationFrame(passo);
  }
  const voarEsperar = async (alvo, ms) => { cancelAnimationFrame(anim); voar(alvo, ms); await espera(ms); };

  async function legenda(kicker, linha, cite) {
    const cap = $('tour-cap');
    cap.classList.remove('on');
    await espera(450);
    $('tour-kicker').textContent = kicker || '';
    const l = $('tour-line');
    l.textContent = linha;
    if (cite) { const c = document.createElement('cite'); c.textContent = cite; l.append(c); }
    cap.classList.add('on');
  }

  const so = (...nomes) => ['nature', 'science', 'prob', 'fotos', 'jacobs'].forEach((n) => mostrar(n, nomes.includes(n)));

  function cenas() {
    const nat = dados.nature.features, sci = dados.science.features;
    const aquiry = nat.filter((f) => f.properties.aquiry === true).length;
    const ha = nat.reduce((s, f) => s + (f.properties.area_ha || 0), 0);
    // um sítio grande e bem delineado do LiDAR para o close
    const grande = nat.filter((f) => f.properties.precisao === 'boa' && f.properties.aquiry)
      .sort((a, b) => b.properties.area_ha - a.properties.area_ha)[0];
    const [glon, glat] = grande.geometry.coordinates;

    return [
      // 0 · abertura: grua subindo do mapa chapado para uma vista oblíqua, girando
      { dur: 9000, run: async () => {
        so('nature', 'science');
        map.jumpTo({ center: [-66.2, -9.2], zoom: 4.8, pitch: 0, bearing: 20 });
        orbita({ giro: -55, pitch: 62, zoom: 6.6, centro: [-67.1, -9.75] }, 9000);
        await legenda('Geoglifos da Amazônia', 'Sob a floresta e o pasto do sudoeste da Amazônia, desenhos de terra com mais de 2.000 anos.');
      } },
      // 1 · a Amazônia toda: recua alto e varre o horizonte
      { dur: 12000, run: async () => {
        so('science');
        const ida = voarEsperar({ center: [-63, -7.8], zoom: 4.6, pitch: 30, bearing: -20 }, 3500);
        await legenda('Amazônia · Science 2023', `${fmt(sci.length)} estruturas de terra já catalogadas por arqueólogos em toda a Amazônia.`);
        await ida;
        orbita({ giro: 50, pitch: 55, zoom: 5.1, centro: [-64.8, -9.2] }, 8400);
      } },
      // 2 · Acre: mergulho rasante e travelling sobre o pasto, como o voo de Ranzi
      { dur: 15000, run: async () => {
        so('science', 'nature');
        const ida = voarEsperar({ center: [-67.75, -10.12], zoom: 10.4, pitch: 72, bearing: -50 }, 5000);
        await legenda('Acre · há mais de 40 anos', 'Alceu Ranzi viu os primeiros de um avião, voltando a Rio Branco: só apareciam onde a floresta tinha virado pasto.');
        await ida;
        orbita({ giro: 40, pitch: 66, zoom: 10.9, centro: [-67.42, -9.9] }, 9800);
        await espera(4500);
        await legenda('Acre', '“São desenhos de 400, 500 metros de diâmetro.”', 'Alceu Ranzi');
      } },
      // 3 · Tequinho: chega de cima, depois a grua desce e dá a volta no quadrado triplo
      { dur: 17000, run: async () => {
        so();
        // coordenada da Tabela Suplementar 1 da Nature; o quadrado triplo aparece nítido no satélite
        const ida = voarEsperar({ center: [-67.4235, -9.89774], zoom: 16.5, pitch: 0, bearing: 0 }, 5000);
        await legenda('Tequinho · Acre', 'Valas de até 15 m de largura e 5 m de profundidade, cavadas sem pedra: com madeira e cestos.');
        await ida;
        orbita({ giro: 200, pitch: 64, zoom: 16.1 }, 11800);
        await espera(4000);
        await legenda('Tequinho · Acre', '“Esse povo fazia geometria monumental na Amazônia ao mesmo tempo que Pitágoras desenvolvia seu teorema na Grécia.”', 'Alceu Ranzi');
      } },
      // 4 · LiDAR: sobe e corre ao longo das faixas do levantamento, de lado
      { dur: 16000, run: async () => {
        so('nature');
        const ida = voarEsperar({ center: [-67.45, -9.75], zoom: 8.4, pitch: 66, bearing: 35 }, 5000);
        await legenda('LiDAR · Nature 2026', 'Um laser lançado de avião enxerga sob as árvores: em 4.497 km², 432 estruturas, 396 nunca registradas.');
        await ida;
        orbita({ giro: -30, pitch: 58, zoom: 8.1, centro: [-66.55, -9.05] }, 10800);
        await espera(1500);
        await legenda('LiDAR · Nature 2026', `Das ${fmt(nat.length)} com coordenadas publicadas, ${fmt(aquiry)} seguem o padrão Aquiry: juntas, cobrem ${fmt(Math.round(ha))} hectares.`);
      } },
      // 5 · Aquiry: recua para mostrar o território e gira devagar sobre ele
      { dur: 14000, run: async () => {
        so('nature', 'science');
        const ida = voarEsperar({ center: [-66.9, -9.8], zoom: 6.3, pitch: 50, bearing: -10 }, 4000);
        await legenda('Civilização Aquiry · 600 a.C.–850 d.C.', 'Até 3 milhões de pessoas entre 100 e 300 d.C., em 183 mil km², pouco mais que o Uruguai.');
        await ida;
        orbita({ giro: 70, pitch: 60, zoom: 6.7 }, 9800);
        await espera(2500);
        await legenda('Aquiry · estradas', 'Os sítios eram ligados por estradas, 350 km já mapeados, que se alargavam ao chegar perto deles.');
      } },
      // 6 · um sítio sob a floresta: aproximação baixa e órbita completa
      { dur: 14000, run: async () => {
        so('nature');
        const ida = voarEsperar({ center: [glon, glat], zoom: 14.8, pitch: 70, bearing: -90 }, 4500);
        await legenda('Cerimônias, não fortalezas', '“Os geoglifos eram usados para encontros, para tomar decisões políticas e para organizar cerimônias religiosas, e também para festas, dança e música.”', 'Martti Pärssinen');
        await ida;
        orbita({ giro: 240, pitch: 60, zoom: 14.4 }, 9400);
        await espera(3200);
        await legenda('Por volta de 850 d.C.', 'Deixaram de ser construídos, na mesma época em que os maias abandonaram suas cidades.');
      } },
      // 7 · o que falta achar: sobe alto, a câmera endireita e o mapa de probabilidade se espalha
      { dur: 13000, run: async () => {
        so('prob', 'nature');
        const ida = voarEsperar({ center: [-66.5, -8.8], zoom: 5.6, pitch: 55, bearing: 30 }, 4000);
        await legenda('Ainda escondidos', 'Os autores estimam de 24 a 30 mil estruturas na região, a maioria ainda sob a floresta.');
        await ida;
        orbita({ giro: -30, pitch: 10, zoom: 5.1 }, 8800);
        await espera(2000);
        await legenda('Ainda escondidos', 'Em vermelho, onde o modelo da Science prevê mais chance de encontrá-las.');
      } },
      // 8 · fecho: última órbita larga e a câmera volta ao mapa chapado
      { dur: 10000, run: async () => {
        so('nature', 'science');
        const ida = voarEsperar({ center: [-66.9, -9.7], zoom: 6.5, pitch: 60, bearing: -40 }, 3800);
        await legenda('Um grande jardim', '“O que a gente vê na Amazônia não é uma grande floresta natural, mas, sim, um grande jardim construído historicamente.”', 'Rhuan Carlos Lopes');
        await ida;
        orbita({ giro: 40, pitch: 0, zoom: 6.2 }, 6000);
        await espera(2400);
        await legenda('Geoglifos da Amazônia', 'Explore o mapa.');
      } },
    ];
  }

  function progresso() {
    const t = Math.min(1, (performance.now() - inicio) / TOTAL);
    document.querySelector('#tour-progress i').style.transform = `scaleX(${t})`;
    $('tour-left').textContent = `${Math.ceil((TOTAL * (1 - t)) / 1000)} s`;
    if (ativo) raf = requestAnimationFrame(progresso);
  }

  async function iniciar() {
    if (ativo) return;
    await pronto;
    ativo = true;
    salvo = {
      camera: { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() },
      camadas: [...document.querySelectorAll('input[data-camada]')].map((cb) => [cb.dataset.camada, cb.checked]),
    };
    map.setMaxZoom(17);
    map.setMaxPitch(78);
    // os rótulos da Esri são raster: com a câmera inclinada eles esticam, então somem no tour
    map.setLayoutProperty('ref', 'visibility', 'none');
    document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
    document.body.classList.add('touring');
    map.resize();
    $('tour').hidden = false;
    requestAnimationFrame(() => $('tour').classList.add('on'));
    inicio = performance.now();
    progresso();
    try {
      let fim = 0;
      for (const cena of cenas()) {
        fim += cena.dur;
        await cena.run();
        await espera(inicio + fim - performance.now());
      }
      await espera(800);
      parar(false);
    } catch (e) {
      if (!(e instanceof Parado)) { console.error(e); parar(true); }
    }
  }

  function parar(voltar = true) {
    if (!ativo) return;
    ativo = false;
    cancelAnimationFrame(raf);
    for (const p of pendentes) { clearTimeout(p.id); p.falha(new Parado()); }
    pendentes.clear();
    cancelAnimationFrame(anim);
    map.stop();
    map.setMaxZoom(16);
    map.setMaxPitch(60);
    map.setLayoutProperty('ref', 'visibility', 'visible');
    salvo.camadas.forEach(([n, on]) => mostrar(n, on));
    if (voltar) map.jumpTo(salvo.camera);
    $('tour').classList.remove('on');
    $('tour-cap').classList.remove('on');
    document.body.classList.remove('touring');
    map.resize();
    setTimeout(() => { if (!ativo) $('tour').hidden = true; }, 900);
  }

  $('tour-abrir').addEventListener('click', iniciar);
  $('tour-abrir-painel').addEventListener('click', iniciar);
  $('tour-parar').addEventListener('click', () => parar(true));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && ativo) parar(true); });

  // botão Sobre
  const sobre = $('sobre');
  $('sobre-abrir').addEventListener('click', () => sobre.showModal());
  sobre.querySelector('.fechar').addEventListener('click', () => sobre.close());
  sobre.addEventListener('click', (e) => { if (e.target === sobre) sobre.close(); });

  // ?tour=1 começa sozinho; o parâmetro sai do endereço para um reload abrir o mapa
  const q = new URLSearchParams(location.search);
  if (q.get('tour') === '1') {
    q.delete('tour');
    history.replaceState(null, '', location.pathname + (q.size ? `?${q}` : '') + location.hash);
    iniciar();
  }
  window.tour = { iniciar, parar };
})();
