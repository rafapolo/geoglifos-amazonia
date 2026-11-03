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
      { dur: 9000, run: async () => {
        so('nature', 'science');
        map.jumpTo({ center: [-66.4, -9.6], zoom: 5.3, pitch: 0, bearing: 0 });
        deslizar({ zoom: 6.1, pitch: 25 }, 9000);
        await legenda('Geoglifos da Amazônia', 'Sob a floresta e o pasto do sudoeste da Amazônia, desenhos de terra com mais de 2.000 anos.');
      } },
      { dur: 12000, run: async () => {
        so('science');
        voar({ center: [-62.5, -7.5], zoom: 4.4, pitch: 0, bearing: 0 }, 3500);
        await legenda('Amazônia · Science 2023', `${fmt(sci.length)} estruturas de terra já catalogadas por arqueólogos em toda a Amazônia.`);
        await espera(3500);
        deslizar({ center: [-64.5, -9], zoom: 5, bearing: -8 }, 8000);
      } },
      { dur: 15000, run: async () => {
        so('science', 'nature');
        voar({ center: [-67.55, -10.02], zoom: 9.6, pitch: 50, bearing: -20 }, 5000);
        await legenda('Acre · há mais de 40 anos', 'Alceu Ranzi viu os primeiros de um avião, voltando a Rio Branco: só apareciam onde a floresta tinha virado pasto.');
        await espera(5000);
        deslizar({ bearing: 10, zoom: 10.2 }, 9000);
        await espera(2500);
        await legenda('Acre', '“São desenhos de 400, 500 metros de diâmetro.”', 'Alceu Ranzi');
      } },
      { dur: 17000, run: async () => {
        so();
        // Tequinho: coordenada da Tabela Suplementar 1 da Nature; o quadrado triplo aparece nítido no satélite
        voar({ center: [-67.4235, -9.89774], zoom: 16.2, pitch: 0, bearing: 0 }, 5000);
        await legenda('Tequinho · Acre', 'Valas de até 15 m de largura e 5 m de profundidade, cavadas sem pedra: com madeira e cestos.');
        await espera(5200);
        deslizar({ bearing: 35, pitch: 40, zoom: 15.9 }, 11500);
        await espera(3000);
        await legenda('Tequinho · Acre', '“Esse povo fazia geometria monumental na Amazônia ao mesmo tempo que Pitágoras desenvolvia seu teorema na Grécia.”', 'Alceu Ranzi');
      } },
      { dur: 16000, run: async () => {
        so('nature');
        voar({ center: [-67.0, -9.35], zoom: 7.6, pitch: 35, bearing: 0 }, 5000);
        await legenda('LiDAR · Nature 2026', 'Um laser lançado de avião enxerga sob as árvores: em 4.497 km², 432 estruturas, 396 nunca registradas.');
        await espera(6000);
        deslizar({ bearing: -15, zoom: 7.9 }, 9000);
        await legenda('LiDAR · Nature 2026', `Das ${fmt(nat.length)} com coordenadas publicadas, ${fmt(aquiry)} seguem o padrão Aquiry: juntas, cobrem ${fmt(Math.round(ha))} hectares.`);
      } },
      { dur: 14000, run: async () => {
        so('nature', 'science');
        voar({ center: [-66.8, -9.9], zoom: 6.2, pitch: 20, bearing: 0 }, 4000);
        await legenda('Civilização Aquiry · 600 a.C.–850 d.C.', 'Até 3 milhões de pessoas entre 100 e 300 d.C., em 183 mil km², pouco mais que o Uruguai.');
        await espera(6500);
        await legenda('Aquiry · estradas', 'Os sítios eram ligados por estradas, 350 km já mapeados, que se alargavam ao chegar perto deles.');
      } },
      { dur: 14000, run: async () => {
        so('nature');
        voar({ center: [glon, glat], zoom: 14.6, pitch: 45, bearing: -30 }, 4500);
        await legenda('Cerimônias, não fortalezas', '“Os geoglifos eram usados para encontros, para tomar decisões políticas e para organizar cerimônias religiosas, e também para festas, dança e música.”', 'Martti Pärssinen');
        await espera(4600);
        deslizar({ bearing: 60 }, 9400);
        await espera(3200);
        await legenda('Por volta de 850 d.C.', 'Deixaram de ser construídos, na mesma época em que os maias abandonaram suas cidades.');
      } },
      { dur: 13000, run: async () => {
        so('prob', 'nature');
        voar({ center: [-66, -8.5], zoom: 5.2, pitch: 0, bearing: 0 }, 4000);
        await legenda('Ainda escondidos', 'Os autores estimam de 24 a 30 mil estruturas na região, a maioria ainda sob a floresta.');
        await espera(6000);
        await legenda('Ainda escondidos', 'Em vermelho, onde o modelo da Science prevê mais chance de encontrá-las.');
      } },
      { dur: 10000, run: async () => {
        so('nature', 'science');
        voar({ center: [-66.4, -9.6], zoom: 6, pitch: 20, bearing: 0 }, 4000);
        await legenda('Um grande jardim', '“O que a gente vê na Amazônia não é uma grande floresta natural, mas, sim, um grande jardim construído historicamente.”', 'Rhuan Carlos Lopes');
        await espera(6200);
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
    document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
    document.body.classList.add('touring');
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
    map.stop();
    map.setMaxZoom(16);
    salvo.camadas.forEach(([n, on]) => mostrar(n, on));
    if (voltar) map.jumpTo(salvo.camera);
    $('tour').classList.remove('on');
    $('tour-cap').classList.remove('on');
    document.body.classList.remove('touring');
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
