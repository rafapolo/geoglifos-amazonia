// Tour: um passeio de ~2 min pela câmera, no estilo de cinema (faixas 2.39:1, legenda com kicker e frase).
// Abre pelo botão "Tour" ou por ?tour=1. Esc ou "✕ esc" param e devolvem o mapa como estava.
// Os textos vêm da reportagem da BBC News Brasil (30/09/2026) e de Pärssinen et al. 2026 (Nature);
// as contagens são calculadas dos dados carregados.
(() => {
  const $ = (id) => document.getElementById(id);
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // textos em pt/en/es pelo t() e números pelo fmt() de i18n.js (?tour=en|es abre o tour já no idioma)
  let TOTAL = 120000; // soma das durações das cenas, recalculada em iniciar()

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
    cancelAnimationFrame(anim);
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
  // voo ao longo de uma linha (lon/lat): o centro anda pela linha com velocidade constante no chão e a
  // câmera olha sempre para um ponto mais adiante dela, então vira junto com as curvas do caminho
  function seguir(pontos, ms, { zoom, pitch, adiante = 0.12 }) {
    cancelAnimationFrame(anim);
    const fim = pontos.at(-1);
    if (reduz) { map.jumpTo({ center: fim, zoom: zoom[1], pitch: pitch[1] }); return; }
    const k = Math.cos(fim[1] * Math.PI / 180);
    const seg = pontos.slice(1).map((b, i) => Math.hypot((b[0] - pontos[i][0]) * k, b[1] - pontos[i][1]));
    const total = seg.reduce((a, b) => a + b, 0);
    const ponto = (s) => {
      s = Math.max(0, Math.min(total, s));
      for (let i = 0; i < seg.length; i++) {
        if (s <= seg[i] || i === seg.length - 1) {
          const f = seg[i] ? s / seg[i] : 0, a = pontos[i], b = pontos[i + 1];
          return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        }
        s -= seg[i];
      }
    };
    const rumo = (a, b) => Math.atan2((b[0] - a[0]) * k, b[1] - a[1]) * 180 / Math.PI;
    let bearing = rumo(pontos[0], ponto(adiante * total));
    const t0 = performance.now();
    const passo = (agora) => {
      if (!ativo) return;
      const t = Math.min(1, (agora - t0) / ms);
      // entra já em movimento (sem a aceleração do começo) e freia no fim
      const e = Math.sin(t * Math.PI / 2);
      const c = ponto(e * total);
      // o rumo mais adiante é suavizado, para a câmera não dar trancos nas quinas da linha
      const alvo = rumo(c, ponto(e * total + adiante * total));
      let d = ((alvo - bearing + 540) % 360) - 180;
      if (t < 1 && Math.hypot(c[0] - fim[0], c[1] - fim[1]) > 1e-6) bearing += d * 0.03;
      map.jumpTo({ center: c, bearing, zoom: zoom[0] + (zoom[1] - zoom[0]) * e, pitch: pitch[0] + (pitch[1] - pitch[0]) * e });
      if (t < 1) anim = requestAnimationFrame(passo);
    };
    anim = requestAnimationFrame(passo);
  }
  // espera até o instante ms da cena atual (contado do começo marcado em iniciar())
  let t0Cena = 0;
  const em = (ms) => espera(t0Cena + ms - performance.now());

  // desmatamento do PRODES em três tempos: n = quantos períodos estão acesos (0 apaga tudo, com transição)
  async function desmatamento(n) {
    await garantirProdes();
    PRODES.forEach((id, i) => {
      if (i < n) map.setLayoutProperty(id, 'visibility', 'visible');
      map.setPaintProperty(id, 'raster-opacity', i < n ? 0.6 : 0);
    });
  }

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
    if (!f) return;
    // em tela estreita (celular), o balão no ponto real sairia cortado pela borda: abre no centro do mapa,
    // que fica parado enquanto a câmera orbita em volta dele
    abrirPopup(innerWidth < 600 ? { ...f, geometry: { type: 'Point', coordinates: map.getCenter().toArray() } } : f);
  }

  // os traçados de J. Q. Jacobs sem os pontos dele, que poluiriam a vista de perto
  const tracados = async () => {
    await garantirTracados();
    mostrar('jacobs', true);
    if (map.getLayer('jacobs-pontos')) map.setLayoutProperty('jacobs-pontos', 'visibility', 'none');
  };

  const so = (...nomes) => ['nature', 'science', 'prob', 'fotos', 'jacobs', 'lidar'].forEach((n) => mostrar(n, nomes.includes(n)));

  function cenas() {
    const nat = dados.nature.features, sci = dados.science.features;
    // cada legenda fica no mínimo 6 s na tela: os tempos são marcados a partir do começo da cena (em(ms)),
    // e a câmera se move durante as legendas, sem planos vazios
    return [
      // 0 · abertura: parte de Porto Velho e voa numa curva larga sobre o rio Madeira até Abunã, depois
      // sobre a BR-364 até Rio Branco: o eixo do desmatamento (~70°/250°, medido nas imagens do PRODES), por onde
      // a ocupação chegou de Rondônia. Voa baixo, perto do pasto, e o laranja se espalha em três tempos; no fim a
      // câmera sobe e gira para o norte, e o desmatamento aparece inteiro
      { dur: 14000, run: async () => {
        so('nature', 'science');
        // uma curva só, suave, de Porto Velho a Rio Branco: passa por cima do Madeira e da estrada sem seguir cada
        // volta do rio (Bézier cúbica, amostrada em 60 pontos)
        const [a, b, c, d] = [[-63.9, -8.76], [-64.9, -9.5], [-66.1, -9.85], [-67.5, -9.9]];
        const rota = Array.from({ length: 61 }, (_, i) => {
          const u = i / 60, v = 1 - u;
          return [0, 1].map((k) => v * v * v * a[k] + 3 * v * v * u * b[k] + 3 * v * u * u * c[k] + u * u * u * d[k]);
        });
        map.jumpTo({ center: rota[0], zoom: 10.6, pitch: 70, bearing: -121 });
        seguir(rota, 10000, { zoom: [10.6, 10.1], pitch: [70, 64], adiante: 0.25 });
        desmatamento(1);
        await legenda(t('Porto Velho → Rio Branco · rio Madeira e BR-364', 'Porto Velho → Rio Branco · Madeira River and BR-364', 'Porto Velho → Rio Branco · río Madeira y BR-364'),
          t('Seguindo o caminho da destruição…', 'Following the path of destruction…', 'Siguiendo el camino de la destrucción…'));
        await em(3500);
        desmatamento(2);
        await em(7000);
        desmatamento(3);
        await legenda(t('Geoglifos da Amazônia', 'Geoglyphs of the Amazon', 'Geoglifos de la Amazonía'), t('Desenhos de terra feitos entre 600 a.C. e 850 d.C. no sudoeste da Amazônia, revelados pelo desmatamento.', 'Earthen drawings made between 600 BC and AD 850 in the southwestern Amazon, revealed by deforestation.', 'Dibujos de tierra hechos entre 600 a. C. y 850 d. C. en el suroeste de la Amazonía, revelados por la deforestación.'));
        await em(10000);
        // o menor giro até o norte (rumo 0)
        orbita({ giro: -(((map.getBearing() % 360) + 540) % 360 - 180), pitch: 42, zoom: 7.5, centro: [-66.6, -9.55] }, 4000);
      } },
      // 1 · Acre: o voo de Ranzi; o desmatamento do PRODES (já aceso desde a abertura) fica, e a câmera, virada para
      // o norte, desce devagar sobre o pasto onde estão os geoglifos
      { dur: 10000, run: async () => {
        so('nature');
        desmatamento(3);
        await legenda(t('Acre · há mais de 40 anos', 'Acre · over 40 years ago', 'Acre · hace más de 40 años'), t('Alceu Ranzi viu os primeiros de um avião, voltando a Rio Branco: só apareciam onde a floresta tinha virado pasto.', 'Alceu Ranzi spotted the first ones from a plane flying back to Rio Branco: they only showed where forest had become pasture.', 'Alceu Ranzi vio los primeros desde un avión, de regreso a Rio Branco: solo aparecían donde el bosque se había vuelto pastizal.'));
        orbita({ giro: 20, pitch: 55, zoom: 8.4, centro: [-67.3, -9.8] }, 10000);
        await em(4500);
        await legenda(t('Desmatamento · PRODES/INPE (CC BY-SA)', 'Deforestation · PRODES/INPE (CC BY-SA)', 'Deforestación · PRODES/INPE (CC BY-SA)'), t('Em laranja, a floresta derrubada até 2007, até 2015 e até 2025. Cada pasto novo expôs mais desenhos.', 'In orange, forest cleared by 2007, by 2015 and by 2025. Every new pasture exposed more drawings.', 'En naranja, el bosque talado hasta 2007, hasta 2015 y hasta 2025. Cada pastizal nuevo expuso más dibujos.'));
      } },
      // 2 · Tequinho: chega de cima, a grua desce e dá a volta no quadrado triplo; a foto de drone dá a escala
      { dur: 13000, run: async () => {
        desmatamento(0);
        so();
        // coordenada da Tabela Suplementar 1 da Nature; o quadrado triplo aparece nítido no satélite
        voar({ center: [-67.4235, -9.89774], zoom: 16.5, pitch: 0, bearing: 0 }, 3500);
        await legenda('Tequinho · Acre', t('Valas de até 15 m de largura e 5 m de profundidade, cavadas sem pedra: com madeira e cestos.', 'Ditches up to 15 m wide and 5 m deep, dug without stone tools: with wood and baskets.', 'Zanjas de hasta 15 m de ancho y 5 m de profundidad, cavadas sin piedra: con madera y cestos.'));
        await em(3500);
        orbita({ giro: 150, pitch: 62, zoom: 15.9 }, 9500);
        await em(6500);
        // foto de drone de R. Walker: as palmeiras e a estrada mostram o tamanho das valas
        balao('fotos', 'acrdp');
        await legenda('Tequinho · Acre', t('“Esse povo fazia geometria monumental na Amazônia ao mesmo tempo que Pitágoras desenvolvia seu teorema na Grécia.”', '“These people were making monumental geometry in the Amazon at the same time Pythagoras was developing his theorem in Greece.”', '“Este pueblo hacía geometría monumental en la Amazonía al mismo tiempo que Pitágoras desarrollaba su teorema en Grecia.”'), 'Alceu Ranzi');
      } },
      // 3 · os octógonos: os únicos quatro recintos de oito lados, todos de ~155 m; do simples, num campo arado
      // (onde o satélite já não mostra nada), ao duplo junto da estrada, com o contorno de Jacobs
      { dur: 8000, run: async () => {
        fecharBaloes();
        so();
        await tracados();
        voar({ center: [-67.51921, -9.89596], zoom: 16.2, pitch: 0, bearing: 0 }, 2800);
        await legenda(t('Octógonos · Acre e Amazonas', 'Octagons · Acre and Amazonas', 'Octógonos · Acre y Amazonas'),
          t(`Entre os ${fmt(dados.jacobs?.features.length || 2204)} sítios mapeados por J. Q. Jacobs, só quatro têm oito lados, todos com cerca de 155 m. Um deles é duplo, uma vala dentro da outra.`,
            `Among the ${fmt(dados.jacobs?.features.length || 2204)} sites mapped by J. Q. Jacobs, only four have eight sides, all about 155 m across. One is double, one ditch inside the other.`,
            `Entre los ${fmt(dados.jacobs?.features.length || 2204)} sitios mapeados por J. Q. Jacobs, solo cuatro tienen ocho lados, todos de unos 155 m. Uno es doble, una zanja dentro de la otra.`));
        await em(3300);
        voar({ center: [-67.23234, -9.85533], zoom: 16.2, pitch: 30, bearing: -30 }, 2200);
        await em(5500);
        orbita({ giro: 50, pitch: 50, zoom: 16 }, 2500);
      } },
      // 4 · LiDAR: sobe e corre ao longo das faixas do levantamento, de lado
      { dur: 7000, run: async () => {
        so('nature');
        voar({ center: [-67.45, -9.75], zoom: 8.4, pitch: 66, bearing: 35 }, 3000);
        await legenda('LiDAR · Nature 2026', t('Um laser lançado de avião enxerga sob as árvores: em 4.497 km², 432 estruturas, 396 nunca registradas.', 'A laser fired from a plane sees beneath the trees: across 4,497 km², 432 structures, 396 never recorded before.', 'Un láser lanzado desde un avión ve bajo los árboles: en 4497 km², 432 estructuras, 396 nunca registradas.'));
        await em(3000);
        orbita({ giro: -25, pitch: 58, zoom: 8.2, centro: [-66.9, -9.35] }, 4000);
      } },
      // 5 · o laser revela: de cima só copa de árvore; a camada de LiDAR acende e mostra o recinto quadrado
      { dur: 13000, run: async () => {
        so('nature');
        voar({ center: [-66.79467, -9.41614], zoom: 15.6, pitch: 0, bearing: 0 }, 3500);
        await legenda(t('Sob a floresta · Acre', 'Under the forest · Acre', 'Bajo el bosque · Acre'),
          t('Daqui de cima, só copa de árvore.', 'From up here, nothing but treetops.', 'Desde aquí arriba, solo copas de árboles.'));
        await em(5000);
        mostrar('lidar', true);
        orbita({ giro: 35, pitch: 40, zoom: 15.9 }, 8000);
        await em(6500);
        await legenda(t('LiDAR aberto · EBA/INPE', 'Open LiDAR · EBA/INPE', 'LiDAR abierto · EBA/INPE'),
          t('O laser tira as árvores da frente e mostra o chão. Aqui, a Nature registrou um recinto Aquiry de 3 hectares.',
            'The laser strips the trees away and shows the ground. Here, Nature recorded a 3-hectare Aquiry enclosure.',
            'El láser quita los árboles y muestra el suelo. Aquí, Nature registró un recinto Aquiry de 3 hectáreas.'));
      } },
      // 6 · Aquiry: recua para mostrar o território e gira sobre ele
      { dur: 13000, run: async () => {
        so('nature', 'science');
        voar({ center: [-66.9, -9.8], zoom: 6.3, pitch: 50, bearing: -10 }, 3500);
        await legenda(t('Civilização Aquiry · 600 a.C.–850 d.C.', 'Aquiry civilization · 600 BC–AD 850', 'Civilización Aquiry · 600 a. C.–850 d. C.'), t('Até 3 milhões de pessoas entre 100 e 300 d.C., em 183 mil km², pouco mais que o Uruguai hoje.', 'Up to 3 million people between AD 100 and 300, over 183,000 km², a little more than Uruguay today.', 'Hasta 3 millones de personas entre 100 y 300 d. C., en 183 000 km², un poco más que Uruguay hoy.'));
        await em(3500);
        orbita({ giro: 75, pitch: 62, zoom: 6.9 }, 9500);
        await em(6500);
        await legenda(t('Aquiry · estradas', 'Aquiry · roads', 'Aquiry · caminos'), t('Os sítios eram ligados por estradas, 350 km já mapeados, que se alargavam ao chegar perto deles.', 'The sites were linked by roads, 350 km mapped so far, that widened as they approached them.', 'Los sitios estaban unidos por caminos, 350 km ya mapeados, que se ensanchaban al acercarse a ellos.'));
      } },
      // 7 · um sítio cerimonial no pasto: dois círculos, um retângulo e as estradas entre eles
      // (Acre, Iriarte et al. 2020); só o satélite, e uma órbita larga
      { dur: 8000, run: async () => {
        so();
        voar({ center: [-67.65726, -10.20662], zoom: 15.65, pitch: 40, bearing: 0 }, 3200);
        await legenda(t('Cerimônias, não fortalezas', 'Ceremonies, not fortresses', 'Ceremonias, no fortalezas'), t('“Os geoglifos eram usados para encontros, para tomar decisões políticas e para organizar cerimônias religiosas, e também para festas, dança e música.”', '“The geoglyphs were used for gatherings, for making political decisions and for religious ceremonies, and also for feasts, dance and music.”', '“Los geoglifos se usaban para encuentros, para tomar decisiones políticas y para organizar ceremonias religiosas, y también para fiestas, danza y música.”'), 'Martti Pärssinen');
        await em(3200);
        orbita({ giro: 120, pitch: 48, zoom: 15.5 }, 4800);
      } },
      // 8 · o que falta achar: sobe alto, a câmera endireita e o mapa de probabilidade se espalha
      { dur: 7500, run: async () => {
        so('prob', 'nature');
        voar({ center: [-66.5, -8.8], zoom: 5.6, pitch: 55, bearing: 30 }, 3000);
        await legenda(t('Ainda escondidos', 'Still hidden', 'Todavía ocultos'), t(`${fmt(sci.length)} estruturas já catalogadas na Amazônia, e os autores estimam de 24 a 30 mil só nesta região. Em vermelho, onde é mais provável achá-las.`, `${fmt(sci.length)} earthworks already catalogued across the Amazon, and the authors estimate 24,000 to 30,000 in this region alone. In red, where they are most likely to be found.`, `${fmt(sci.length)} estructuras ya catalogadas en la Amazonía, y los autores estiman entre 24 000 y 30 000 solo en esta región. En rojo, donde es más probable encontrarlas.`));
        await em(3000);
        orbita({ giro: -30, pitch: 10, zoom: 5.2 }, 4500);
      } },
      // 9 · Cotoca, na Bolívia: do satélite, só mato; o LiDAR achou ali uma cidade. Depois a câmera recua e
      // as calçadas e canais de Mojos (traçados de J. Q. Jacobs) acendem saindo do sítio
      { dur: 13000, run: async () => {
        so('fotos');
        voar({ center: [-64.58676, -14.99074], zoom: 16, pitch: 0, bearing: 40 }, 3500);
        await legenda(t('Cotoca · Bolívia · Nature 2022', 'Cotoca · Bolivia · Nature 2022', 'Cotoca · Bolivia · Nature 2022'),
          t('Do satélite, só mato. O LiDAR achou aqui uma cidade da cultura Casarabe (500–1400 d.C.): plataformas, pirâmides, canais e calçadas elevadas.',
            'From the satellite, only scrub. LiDAR found a city of the Casarabe culture here (AD 500–1400): platforms, pyramids, canals and raised causeways.',
            'Desde el satélite, solo monte. El LiDAR halló aquí una ciudad de la cultura Casarabe (500–1400 d. C.): plataformas, pirámides, canales y calzadas elevadas.'));
        await em(3500);
        // a imagem de LiDAR de Cotoca (Prümers et al. 2022) abre sobre o mato que o satélite mostra
        balao('fotos', 'cotoca');
        orbita({ giro: 25, pitch: 35, zoom: 15.7 }, 3000);
        await em(6500);
        fecharBaloes();
        so();
        await tracados();
        voar({ center: [-64.6, -15.0], zoom: 11.4, pitch: 40, bearing: 20 }, 3000);
        await legenda(t('Llanos de Mojos · traçados de J. Q. Jacobs', 'Llanos de Mojos · outlines by J. Q. Jacobs', 'Llanos de Mojos · trazados de J. Q. Jacobs'),
          t('Calçadas elevadas e canais saem de Cotoca em todas as direções e ligam a cidade aos sítios vizinhos.',
            'Raised causeways and canals leave Cotoca in every direction and link the city to the sites around it.',
            'Calzadas elevadas y canales salen de Cotoca en todas las direcciones y unen la ciudad a los sitios vecinos.'));
        await em(9800);
        orbita({ giro: 30, pitch: 50, zoom: 11.0 }, 3200);
      } },
      // 10 · fecho: a colonização, a última órbita larga e a câmera volta ao mapa chapado
      { dur: 16000, run: async () => {
        fecharBaloes();
        so('nature', 'science');
        voar({ center: [-66.9, -9.7], zoom: 6.5, pitch: 60, bearing: -40 }, 3500);
        await legenda(t('Depois de 1492 · Koch et al. 2019', 'After 1492 · Koch et al. 2019', 'Después de 1492 · Koch et al. 2019'),
          t('Os colonizadores europeus trouxeram epidemias, guerra e escravidão: cerca de 90% dos povos das Américas morreram em um século. A floresta cresceu sobre os jardins.',
            'European colonizers brought epidemics, war and slavery: about 90% of the peoples of the Americas died within a century. The forest grew back over the gardens.',
            'Los colonizadores europeos trajeron epidemias, guerra y esclavitud: cerca del 90% de los pueblos de América murió en un siglo. El bosque creció sobre los jardines.'));
        await em(3500);
        orbita({ giro: 50, pitch: 0, zoom: 6.1 }, 12500);
        await em(8000);
        await legenda(t('Um grande jardim', 'A great garden', 'Un gran jardín'), t('“O que a gente vê na Amazônia não é uma grande floresta natural, mas, sim, um grande jardim construído historicamente.”', '“What we see in the Amazon is not a great natural forest, but a great garden built over history.”', '“Lo que vemos en la Amazonía no es un gran bosque natural, sino un gran jardín construido a lo largo de la historia.”'), 'Rhuan Carlos Lopes');
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
    // o que o tour vai usar mais adiante começa a baixar já
    garantirProb();
    garantirTracados();
    garantirProdes();
    // o tour é feito sobre o satélite: o modo "só os desenhos" volta quando ele termina
    salvo.verde = document.body.classList.contains('fundo-verde');
    if (salvo.verde) fundoVerde(false);
    // os rótulos da Esri são raster: com a câmera inclinada eles esticam, então somem no tour
    map.setLayoutProperty('ref', 'visibility', 'none');
    document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
    document.body.classList.add('touring');
    map.resize();
    $('tour').hidden = false;
    $('tour').classList.remove('saindo');
    document.querySelector('#tour-progress i').style.transform = 'scaleX(0)';
    requestAnimationFrame(() => $('tour').classList.add('on'));
    inicio = performance.now();
    progresso();
    somTour.iniciar();
    try {
      let fim = 0;
      const roteiro = cenas();
      TOTAL = roteiro.reduce((s, c) => s + c.dur, 0);
      for (const [i, cena] of roteiro.entries()) {
        t0Cena = inicio + fim;
        fim += cena.dur;
        cenaAtual = i;
        somTour.cena(i);
        await cena.run();
        await espera(inicio + fim - performance.now());
      }
      // chegou ao fim: a linha de progresso e o tempo saem já, antes das faixas; quem viu o tour inteiro
      // não precisa mais do convite no painel
      cancelAnimationFrame(raf);
      try { localStorage.setItem(VISTO, '1'); } catch {}
      $('tour-abrir-painel').hidden = true;
      $('tour').classList.add('saindo');
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
    $('tour').classList.add('saindo');
    for (const p of pendentes) { clearTimeout(p.id); p.falha(new Parado()); }
    pendentes.clear();
    cancelAnimationFrame(anim);
    map.stop();
    fecharBaloes();
    PRODES.forEach((id) => { if (map.getLayer(id)) { map.setPaintProperty(id, 'raster-opacity', 0); map.setLayoutProperty(id, 'visibility', 'none'); } });
    // o mapa fica exatamente onde a câmera do tour estava: os limites de zoom e inclinação
    // só voltam ao normal quando a pessoa sai dessa vista (senão a câmera daria um pulo)
    map.once('movestart', () => { if (!ativo) { map.setMaxZoom(16); map.setMaxPitch(60); } });
    map.setLayoutProperty('ref', 'visibility', 'visible');
    if (salvo.verde) fundoVerde(true);
    salvo.camadas.forEach(([n, on]) => mostrar(n, on));
    $('tour').classList.remove('on');
    $('tour-cap').classList.remove('on');
    // a tela volta a ter a coluna de fotos: o mapa fica mais estreito, mas o que se via à esquerda não se mexe
    redimensionar(() => document.body.classList.remove('touring'));
    setTimeout(() => { if (!ativo) $('tour').hidden = true; }, 900);
    // a entrada do tour vira a vista onde ele parou (o "voltar" do navegador leva à vista de antes)
    if (!peloHistorico && history.state?.tour) history.replaceState({ ...history.state, tour: false }, '', location.href);
    map.fire('moveend'); // navegacao.js grava a câmera atual no endereço
  }

  // botão do painel some para quem já viu o tour até o fim (o do topo continua)
  const VISTO = 'geoglifos-tour-visto';
  try { if (localStorage.getItem(VISTO)) $('tour-abrir-painel').hidden = true; } catch {}
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
