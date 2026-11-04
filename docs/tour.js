// Tour: um passeio de ~2 min pela câmera, no estilo de cinema (faixas 2.39:1, legenda com kicker e frase).
// Abre pelo botão "Tour" ou por ?tour=1. Esc ou "✕ esc" param e devolvem o mapa como estava.
// Os textos vêm da reportagem da BBC News Brasil (30/09/2026) e de Pärssinen et al. 2026 (Nature);
// as contagens são calculadas dos dados carregados.
(() => {
  const $ = (id) => document.getElementById(id);
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // textos em pt/en/es pelo t() e números pelo fmt() de i18n.js (?tour=en|es abre o tour já no idioma)
  let TOTAL = 140000; // soma das durações das cenas, recalculada em iniciar()

  let ativo = false, inicio = 0, raf = 0, salvo = null, cenaAtual = 0;
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
    somTour.legenda();
  }

  // balão de um ponto aberto durante a cena (a imagem do sítio); some na cena seguinte e ao parar
  const fecharBaloes = () => document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
  function balao(fonte, id) {
    const f = dados[fonte]?.features.find((x) => x.properties.id === id);
    if (f) abrirPopup(f);
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
        await legenda(t('Geoglifos da Amazônia', 'Geoglyphs of the Amazon', 'Geoglifos de la Amazonía'), t('Sob a floresta e o pasto do sudoeste da Amazônia, desenhos de terra com mais de 2.000 anos.', 'Beneath the forest and pasture of the southwestern Amazon, earthen drawings more than 2,000 years old.', 'Bajo el bosque y los pastizales del suroeste de la Amazonía, dibujos de tierra de más de 2000 años.'));
      } },
      // 1 · a Amazônia toda: recua alto e varre o horizonte
      { dur: 12000, run: async () => {
        so('science');
        const ida = voarEsperar({ center: [-63, -7.8], zoom: 4.6, pitch: 30, bearing: -20 }, 3500);
        await legenda(t('Amazônia · Science 2023', 'Amazonia · Science 2023', 'Amazonía · Science 2023'), t(`${fmt(sci.length)} estruturas de terra já catalogadas por arqueólogos em toda a Amazônia.`, `${fmt(sci.length)} earthworks already catalogued by archaeologists across the Amazon.`, `${fmt(sci.length)} estructuras de tierra ya catalogadas por arqueólogos en toda la Amazonía.`));
        await ida;
        orbita({ giro: 50, pitch: 55, zoom: 5.1, centro: [-64.8, -9.2] }, 8400);
      } },
      // 2 · Acre: mergulho rasante e travelling sobre o pasto, como o voo de Ranzi
      { dur: 15000, run: async () => {
        so('science', 'nature');
        const ida = voarEsperar({ center: [-67.75, -10.12], zoom: 10.4, pitch: 72, bearing: -50 }, 5000);
        await legenda(t('Acre · há mais de 40 anos', 'Acre · over 40 years ago', 'Acre · hace más de 40 años'), t('Alceu Ranzi viu os primeiros de um avião, voltando a Rio Branco: só apareciam onde a floresta tinha virado pasto.', 'Alceu Ranzi spotted the first ones from a plane flying back to Rio Branco: they only showed where forest had become pasture.', 'Alceu Ranzi vio los primeros desde un avión, de regreso a Rio Branco: solo aparecían donde el bosque se había vuelto pastizal.'));
        await ida;
        orbita({ giro: 40, pitch: 66, zoom: 10.9, centro: [-67.42, -9.9] }, 9800);
        await espera(4500);
        await legenda('Acre', t('“São desenhos de 400, 500 metros de diâmetro.”', '“These are drawings 400, 500 metres across.”', '“Son dibujos de 400, 500 metros de diámetro.”'), 'Alceu Ranzi');
      } },
      // 3 · Tequinho: chega de cima, depois a grua desce e dá a volta no quadrado triplo
      { dur: 17000, run: async () => {
        so();
        // coordenada da Tabela Suplementar 1 da Nature; o quadrado triplo aparece nítido no satélite
        const ida = voarEsperar({ center: [-67.4235, -9.89774], zoom: 16.5, pitch: 0, bearing: 0 }, 5000);
        await legenda('Tequinho · Acre', t('Valas de até 15 m de largura e 5 m de profundidade, cavadas sem pedra: com madeira e cestos.', 'Ditches up to 15 m wide and 5 m deep, dug without stone tools: with wood and baskets.', 'Zanjas de hasta 15 m de ancho y 5 m de profundidad, cavadas sin piedra: con madera y cestos.'));
        await ida;
        orbita({ giro: 200, pitch: 64, zoom: 16.1 }, 11800);
        await espera(4000);
        await legenda('Tequinho · Acre', t('“Esse povo fazia geometria monumental na Amazônia ao mesmo tempo que Pitágoras desenvolvia seu teorema na Grécia.”', '“These people were making monumental geometry in the Amazon at the same time Pythagoras was developing his theorem in Greece.”', '“Este pueblo hacía geometría monumental en la Amazonía al mismo tiempo que Pitágoras desarrollaba su teorema en Grecia.”'), 'Alceu Ranzi');
      } },
      // 4 · LiDAR: sobe e corre ao longo das faixas do levantamento, de lado
      { dur: 16000, run: async () => {
        so('nature');
        const ida = voarEsperar({ center: [-67.45, -9.75], zoom: 8.4, pitch: 66, bearing: 35 }, 5000);
        await legenda('LiDAR · Nature 2026', t('Um laser lançado de avião enxerga sob as árvores: em 4.497 km², 432 estruturas, 396 nunca registradas.', 'A laser fired from a plane sees beneath the trees: across 4,497 km², 432 structures, 396 never recorded before.', 'Un láser lanzado desde un avión ve bajo los árboles: en 4497 km², 432 estructuras, 396 nunca registradas.'));
        await ida;
        orbita({ giro: -30, pitch: 58, zoom: 8.1, centro: [-66.55, -9.05] }, 10800);
        await espera(1500);
        await legenda('LiDAR · Nature 2026', t(`Das ${fmt(nat.length)} com coordenadas publicadas, ${fmt(aquiry)} seguem o padrão Aquiry: juntas, cobrem ${fmt(Math.round(ha))} hectares.`, `Of the ${fmt(nat.length)} with published coordinates, ${fmt(aquiry)} follow the Aquiry pattern: together they cover ${fmt(Math.round(ha))} hectares.`, `De las ${fmt(nat.length)} con coordenadas publicadas, ${fmt(aquiry)} siguen el patrón Aquiry: juntas cubren ${fmt(Math.round(ha))} hectáreas.`));
      } },
      // 5 · Aquiry: recua para mostrar o território e gira devagar sobre ele
      { dur: 14000, run: async () => {
        so('nature', 'science');
        const ida = voarEsperar({ center: [-66.9, -9.8], zoom: 6.3, pitch: 50, bearing: -10 }, 4000);
        await legenda(t('Civilização Aquiry · 600 a.C.–850 d.C.', 'Aquiry civilization · 600 BC–AD 850', 'Civilización Aquiry · 600 a. C.–850 d. C.'), t('Até 3 milhões de pessoas entre 100 e 300 d.C., em 183 mil km², pouco mais que o Uruguai.', 'Up to 3 million people between AD 100 and 300, over 183,000 km², a little more than Uruguay.', 'Hasta 3 millones de personas entre 100 y 300 d. C., en 183 000 km², un poco más que Uruguay.'));
        await ida;
        orbita({ giro: 70, pitch: 60, zoom: 6.7 }, 9800);
        await espera(2500);
        await legenda(t('Aquiry · estradas', 'Aquiry · roads', 'Aquiry · caminos'), t('Os sítios eram ligados por estradas, 350 km já mapeados, que se alargavam ao chegar perto deles.', 'The sites were linked by roads, 350 km mapped so far, that widened as they approached them.', 'Los sitios estaban unidos por caminos, 350 km ya mapeados, que se ensanchaban al acercarse a ellos.'));
      } },
      // 6 · um sítio sob a floresta: aproximação baixa e órbita completa
      { dur: 14000, run: async () => {
        so('nature');
        const ida = voarEsperar({ center: [glon, glat], zoom: 14.8, pitch: 70, bearing: -90 }, 4500);
        await legenda(t('Cerimônias, não fortalezas', 'Ceremonies, not fortresses', 'Ceremonias, no fortalezas'), t('“Os geoglifos eram usados para encontros, para tomar decisões políticas e para organizar cerimônias religiosas, e também para festas, dança e música.”', '“The geoglyphs were used for gatherings, for making political decisions and for religious ceremonies, and also for feasts, dance and music.”', '“Los geoglifos se usaban para encuentros, para tomar decisiones políticas y para organizar ceremonias religiosas, y también para fiestas, danza y música.”'), 'Martti Pärssinen');
        await ida;
        orbita({ giro: 240, pitch: 60, zoom: 14.4 }, 9400);
        await espera(3200);
        await legenda(t('Por volta de 850 d.C.', 'Around AD 850', 'Hacia el 850 d. C.'), t('Deixaram de ser construídos, na mesma época em que os maias abandonaram suas cidades.', 'They stopped being built, around the time the Maya abandoned their cities.', 'Dejaron de construirse en la misma época en que los mayas abandonaron sus ciudades.'));
      } },
      // 7 · o que falta achar: sobe alto, a câmera endireita e o mapa de probabilidade se espalha
      { dur: 13000, run: async () => {
        so('prob', 'nature');
        const ida = voarEsperar({ center: [-66.5, -8.8], zoom: 5.6, pitch: 55, bearing: 30 }, 4000);
        await legenda(t('Ainda escondidos', 'Still hidden', 'Todavía ocultos'), t('Os autores estimam de 24 a 30 mil estruturas na região, a maioria ainda sob a floresta.', 'The authors estimate 24,000 to 30,000 structures in the region, most still under the forest.', 'Los autores estiman entre 24 000 y 30 000 estructuras en la región, la mayoría aún bajo el bosque.'));
        await ida;
        orbita({ giro: -30, pitch: 10, zoom: 5.1 }, 8800);
        await espera(2000);
        await legenda(t('Ainda escondidos', 'Still hidden', 'Todavía ocultos'), t('Em vermelho, onde o modelo da Science prevê mais chance de encontrá-las.', 'In red, where the Science model predicts they are most likely to be found.', 'En rojo, donde el modelo de Science prevé más probabilidad de encontrarlas.'));
      } },
      // 8 · Cotoca, na Bolívia: do satélite, só mato; o LiDAR achou ali uma cidade. A pergunta do que ainda falta achar
      { dur: 15000, run: async () => {
        so('fotos');
        const ida = voarEsperar({ center: [-64.58676, -14.99074], zoom: 16, pitch: 0, bearing: 40 }, 5000);
        await legenda(t('Cotoca · Bolívia · Nature 2022', 'Cotoca · Bolivia · Nature 2022', 'Cotoca · Bolivia · Nature 2022'),
          t('Do satélite, só mato. O LiDAR achou aqui uma cidade da cultura Casarabe (500–1400 d.C.): plataformas, pirâmides, canais e calçadas elevadas.',
            'From the satellite, only scrub. LiDAR found a city of the Casarabe culture here (AD 500–1400): platforms, pyramids, canals and raised causeways.',
            'Desde el satélite, solo monte. El LiDAR halló aquí una ciudad de la cultura Casarabe (500–1400 d. C.): plataformas, pirámides, canales y calzadas elevadas.'));
        await ida;
        // a imagem de LiDAR de Cotoca (Prümers et al. 2022) abre sobre o mato que o satélite mostra
        balao('fotos', 'cotoca');
        orbita({ giro: 60, pitch: 55, zoom: 15.4 }, 9500);
        await espera(4500);
        await legenda(t('O que vem por aí', 'What comes next', 'Lo que viene'),
          t('Cada voo de LiDAR desmonta um pouco mais a ideia de uma floresta virgem. O que a mata ainda esconde?',
            'Every LiDAR flight dismantles a little more the idea of a virgin forest. What is the forest still hiding?',
            'Cada vuelo de LiDAR desmonta un poco más la idea de un bosque virgen. ¿Qué esconde todavía la selva?'));
      } },
      // 9 · fecho: a colonização, a última órbita larga e a câmera volta ao mapa chapado
      { dur: 16000, run: async () => {
        fecharBaloes();
        so('nature', 'science');
        const ida = voarEsperar({ center: [-66.9, -9.7], zoom: 6.5, pitch: 60, bearing: -40 }, 3800);
        await legenda(t('Depois de 1492 · Koch et al. 2019', 'After 1492 · Koch et al. 2019', 'Después de 1492 · Koch et al. 2019'),
          t('Epidemias, guerras e escravidão mataram cerca de 90% dos povos das Américas em um século. A floresta cresceu sobre os jardins.',
            'Epidemics, war and slavery killed about 90% of the peoples of the Americas within a century. The forest grew back over the gardens.',
            'Epidemias, guerras y esclavitud mataron a cerca del 90% de los pueblos de América en un siglo. El bosque creció sobre los jardines.'));
        await ida;
        orbita({ giro: 40, pitch: 0, zoom: 6.2 }, 11000);
        await espera(2800);
        await legenda(t('Um grande jardim', 'A great garden', 'Un gran jardín'), t('“O que a gente vê na Amazônia não é uma grande floresta natural, mas, sim, um grande jardim construído historicamente.”', '“What we see in the Amazon is not a great natural forest, but a great garden built over history.”', '“Lo que vemos en la Amazonía no es un gran bosque natural, sino un gran jardín construido a lo largo de la historia.”'), 'Rhuan Carlos Lopes');
        await espera(4200);
        await legenda(t('Geoglifos da Amazônia', 'Geoglyphs of the Amazon', 'Geoglifos de la Amazonía'), t('Explore o mapa.', 'Explore the map.', 'Explore el mapa.'));
      } },
    ];
  }

  function progresso() {
    const t = Math.min(1, (performance.now() - inicio) / TOTAL);
    document.querySelector('#tour-progress i').style.transform = `scaleX(${t})`;
    // acima de um minuto, mm:ss (02:10); abaixo, só os segundos (45 s)
    const resta = Math.ceil((TOTAL * (1 - t)) / 1000);
    $('tour-left').textContent = resta > 60
      ? `${String(Math.floor(resta / 60)).padStart(2, '0')}:${String(resta % 60).padStart(2, '0')}`
      : `${resta} s`;
    if (ativo) raf = requestAnimationFrame(progresso);
  }

  async function iniciar() {
    if (ativo) return;
    $('tour-cap').lang = document.documentElement.lang;
    await pronto;
    ativo = true;
    // o tour vira uma entrada no histórico: o "voltar" do navegador o encerra
    history.pushState({ ...(history.state || {}), tour: true, empurrado: true }, '', location.href);
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
    somTour.iniciar();
    try {
      let fim = 0;
      const roteiro = cenas();
      TOTAL = roteiro.reduce((s, c) => s + c.dur, 0);
      for (const [i, cena] of roteiro.entries()) {
        fim += cena.dur;
        cenaAtual = i;
        somTour.cena(i);
        await cena.run();
        await espera(inicio + fim - performance.now());
      }
      await espera(800);
      parar(false);
    } catch (e) {
      if (!(e instanceof Parado)) { console.error(e); parar(true); }
    }
  }

  function parar(voltar = true, peloHistorico = false) {
    if (!ativo) return;
    ativo = false;
    somTour.parar(!voltar); // tour até o fim: cadência; parado no meio: some rápido
    cancelAnimationFrame(raf);
    for (const p of pendentes) { clearTimeout(p.id); p.falha(new Parado()); }
    pendentes.clear();
    cancelAnimationFrame(anim);
    map.stop();
    fecharBaloes();
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
    if (!peloHistorico && history.state?.tour) {
      if (voltar) history.back(); // Esc ou ✕: volta à entrada de antes do tour
      else history.replaceState({ ...history.state, tour: false }, '', location.href);
    }
  }

  $('tour-abrir').addEventListener('click', () => iniciar());
  $('tour-abrir-painel').addEventListener('click', () => iniciar());
  $('tour-parar').addEventListener('click', () => parar(true));
  const botaoSom = $('tour-som');
  const marcarSom = () => { botaoSom.classList.toggle('mudo', !somTour.ligado()); botaoSom.setAttribute('aria-pressed', somTour.ligado()); };
  botaoSom.addEventListener('click', () => { somTour.alternar(); marcarSom(); });
  marcarSom();
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && ativo) parar(true); });

  // botão Sobre (abrir fica em navegacao.js, que registra no histórico)
  const sobre = $('sobre');
  sobre.querySelector('.fechar').addEventListener('click', () => sobre.close());
  sobre.addEventListener('click', (e) => { if (e.target === sobre) sobre.close(); });

  // ?tour=1 abre um convite (?tour=en ou ?tour=es também trocam o idioma, em i18n.js): o clique começa o tour
  // e libera o som, que o navegador não toca sem um gesto. Clicar fora ou Esc deixa só o mapa.
  // O parâmetro sai do endereço para um reload abrir o mapa.
  const q = new URLSearchParams(location.search);
  if (['1', 'pt', 'en', 'es'].includes(q.get('tour'))) {
    // o idioma do convite fica no endereço como ?lang=, para o voltar e o recarregar manterem a língua
    const lingua = q.get('tour');
    q.delete('tour');
    if (lingua === 'en' || lingua === 'es') q.set('lang', lingua);
    history.replaceState(null, '', location.pathname + (q.size ? `?${q}` : '') + location.hash);
    const convite = $('tour-convite');
    $('tour-convite-txt').textContent = t('Começar o tour', 'Start the tour', 'Empezar el tour');
    $('tour-convite-sub').textContent = t('2 minutos, com som', '2 minutes, with sound', '2 minutos, con sonido');
    convite.hidden = false;
    const fechar = () => { convite.hidden = true; removeEventListener('keydown', tecla); };
    const tecla = (e) => { if (e.key === 'Escape') fechar(); };
    addEventListener('keydown', tecla);
    convite.addEventListener('click', (e) => { fechar(); if (e.target.closest('button')) iniciar(); });
    convite.querySelector('button').focus();
  }
  window.tour = { iniciar, parar, ativo: () => ativo, cena: () => cenaAtual };
})();
