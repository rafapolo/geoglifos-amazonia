// Idioma do site: pt (padrão), en ou es.
// Vem só do endereço: ?lang=xx ou ?tour=en|es; sem nenhum dos dois, português.
// O texto em português fica no HTML; os elementos com data-i18n recebem aqui a versão em en/es.
// Para os textos montados em JS, use t('pt', 'en', 'es') e fmt(n).
(() => {
  const LINGUAS = ['pt', 'en', 'es'];
  const q = new URLSearchParams(location.search);
  const daUrl = [q.get('lang'), q.get('tour')].find((l) => LINGUAS.includes(l));
  const idioma = daUrl || 'pt';

  const LOCALE = { pt: 'pt-BR', en: 'en-US', es: 'es' }[idioma];
  window.idioma = idioma;
  window.LOCALE = LOCALE;
  window.t = (pt, en, es) => ({ pt, en, es }[idioma] ?? pt);
  window.fmt = (n) => n.toLocaleString(LOCALE);

  // textos fixos da página, por chave data-i18n (innerHTML) e data-i18n-title / data-i18n-aria (atributos)
  const T = {
    en: {
      titulo: 'Geoglyphs of the Amazon: map of pre-Columbian earthworks',
      alca: 'Open or close the panel',
      h1: 'Geoglyphs of the <span>Amazon</span>',
      lede: '<b id="lede-total">1,367</b> earthworks (<span id="lede-nature">406</span> found by LiDAR, <span id="lede-science">961</span> already catalogued) and <span id="lede-fotos">664</span> photos: geometric ditches and embankments from 600&nbsp;BC to AD&nbsp;850, revealed by deforestation and LiDAR in Acre, Amazonas and Bolivia.',
      'tour-painel': '2-minute tour',
      camadas: 'Layers',
      'c-nature': 'LiDAR: Nature 2026<small>structures under the forest (Pärssinen et al.)</small>',
      'c-science': 'Compiled database: Science 2023<small>Amazon Arch, CNSA, PAST, INRAP, INPE</small>',
      'c-lidar': 'Open LiDAR: terrain under the forest<small>EBA project strips (INPE); zoom in to see</small>',
      'c-prob': 'Where more structures may be<small>predictive model, Science 2023</small>',
      'c-fotos': 'Photos<small>Ancient Amazonian Earthworks app (R. Walker)</small>',
      'c-jacobs': 'Jacobs (local only)<small>points, outlines and roads</small>',
      'prob-menor': 'lower',
      'prob-maior': 'higher probability',
      'd-oque': `<summary>What are geoglyphs?</summary>
    <p>They are earthen enclosures (circles, squares, octagons, ellipses) bounded by ditches up to 15&nbsp;m wide and 5&nbsp;m deep, sometimes linked by roads with parallel embankments. According to Pärssinen et al. (2026), they were built by the so-called Aquiry civilization and served ceremonies and political gatherings, not housing.</p>
    <p>The LiDAR survey of 4,497&nbsp;km² found 432 structures, 396 of them new, and the authors estimate there are 24,000 to 30,000 in the region.</p>`,
      'd-fontes': `<summary>Sources and licences</summary>
    <ul>
      <li>Pärssinen et al. 2026, <i>Nature</i>, <a href="https://doi.org/10.1038/s41586-026-10835-7">doi:10.1038/s41586-026-10835-7</a> (CC&nbsp;BY&nbsp;4.0). Supplementary Table&nbsp;2; structures on Indigenous lands were omitted by the authors. The LiDAR crops in the pop-ups come from Fig.&nbsp;2 and Extended Data Fig.&nbsp;4 of the paper.</li>
      <li>Peripato et al. 2023, <i>Science</i>, <a href="https://doi.org/10.1126/science.ade2541">doi:10.1126/science.ade2541</a>; data on <a href="https://zenodo.org/records/10214943">Zenodo</a>.</li>
      <li>Photos: <a href="https://robert-walker.shinyapps.io/ggshiny/">Ancient Amazonian Earthworks</a> app (R. Walker, Univ. of Missouri), which gathers figures from papers and researchers' photos; each photo keeps its original caption credits.</li>
      <li>Open LiDAR: EBA project transects (INPE), <a href="https://zenodo.org/records/4968706">Zenodo</a> (CC&nbsp;BY&nbsp;4.0). 2&nbsp;m terrain model made here from the point clouds, with our own ground filter, hillshade and local relief enhancement (ditches in teal, embankments in ochre).</li>
      <li>Tour: BBC News Brasil (30/09/2026); Prümers et al. 2022, <i>Nature</i>, <a href="https://doi.org/10.1038/s41586-022-04780-4">doi:10.1038/s41586-022-04780-4</a>; Koch et al. 2019, <i>Quaternary Science Reviews</i>, <a href="https://doi.org/10.1016/j.quascirev.2018.12.004">doi:10.1016/j.quascirev.2018.12.004</a>.</li>
      <li>Satellite imagery: Esri World Imagery.</li>
    </ul>
    <p>The most complete database, with photos and outlines, is <a href="https://www.jqjacobs.net/archaeology/geoglyph.html">James Q. Jacobs</a>'s.</p>`,
      'd-protecao': `<summary>Protecting the sites</summary>
    <p>Archaeological sites are federal property in Brazil (Law 3,924/1961). The coordinates here were already published by the authors, with a precision of about 100&nbsp;m. Do not enter private land or remove material; damaging sites is a crime.</p>`,
      rodape: 'Code and data on GitHub',
      'fotos-aria': 'Photos of the sites',
      'fotos-cab': '<b>Photos</b> <span id="fotos-n"></span><small>click to fly to the site</small>',
      'fotos-rodape': 'Photos: <a href="https://robert-walker.shinyapps.io/ggshiny/">Ancient Amazonian Earthworks</a> (R. Walker)',
      'tour-titulo': 'A 2-minute flight over the geoglyphs',
      compartilhar: 'Share',
      'compartilhar-titulo': 'Share this view',
      sobre: 'About',
      idioma: 'Language',
      fechar: 'Close',
      'svg-aria': 'Drawing of two geoglyphs linked by a road: a triple square and a circle inside a square',
      'svg-quadrado': 'TRIPLE SQUARE',
      'svg-circulo': 'CIRCLE IN A SQUARE',
      'sobre-corpo': `<p>This map gathers in one place the pre-Columbian earthworks of the southwestern Amazon: the <b>geoglyphs</b>, geometric ditches and embankments that are only visible from above, by plane or satellite.</p>

  <h3>The Aquiry civilization</h3>
  <p>In July 2026, a team from universities in Finland and Brazil (Helsinki, Turku, UFAC, UFPA and others) published in <i>Nature</i> a LiDAR survey, a laser fired from a plane that sees beneath the trees, of 4,497&nbsp;km² between Acre and Amazonas. They found <b>432 structures, 396 of them never recorded</b>.</p>
  <ul>
    <li>The geoglyphs were built between <b>600 BC and AD 850</b> by the so-called Aquiry civilization.</li>
    <li>The occupied area may have reached <b>183,000 km²</b>, a little more than Uruguay, with <b>up to 3 million people</b> between AD 100 and 300.</li>
    <li>The ditches are up to 15&nbsp;m wide and 5&nbsp;m deep. With no stone in the region, the earth was moved with wood and baskets.</li>
    <li>They were spaces for ceremony and political decisions, linked by <b>350&nbsp;km of roads</b> mapped so far, which widened as they approached them. They were neither fortresses nor dwellings.</li>
    <li>Around AD 850 they stopped being built, around the time the Maya abandoned their cities.</li>
    <li>The authors estimate there are <b>24,000 to 30,000</b> structures in the region, most still under the forest.</li>
  </ul>
  <blockquote>“These people were making monumental geometry in the Amazon at the same time Pythagoras was developing his theorem in Greece.”<cite>Alceu Ranzi, palaeontologist, Instituto Geoglifos da Amazônia (translated)</cite></blockquote>
  <blockquote>“What we see in the Amazon is not a great natural forest, but a great garden built over history.”<cite>Rhuan Carlos Lopes, archaeologist, UFPA (translated)</cite></blockquote>
  <p>Based on the report <a href="https://www.bbc.com/portuguese/articles/cm4gvnv14zlgo">“As construções monumentais ‘escondidas’ na Amazônia descobertas por cientistas”</a> by André Biernath (BBC News Brasil, 30/09/2026, in Portuguese), and on the paper <a href="https://doi.org/10.1038/s41586-026-10835-7">Pärssinen et al. 2026, <i>Nature</i></a>.</p>

  <h3>Data</h3>
  <p>Points from Supplementary Table 2 of <i>Nature</i> (CC&nbsp;BY&nbsp;4.0; without structures on Indigenous lands) and from the database compiled by <a href="https://doi.org/10.1126/science.ade2541">Peripato et al. 2023, <i>Science</i></a>, with the same authors' probability model. Code, data and list of sources: <a href="https://github.com/rafapolo/geoglifos-amazonia">github.com/rafapolo/geoglifos-amazonia</a>.</p>
  <p class="aviso">Archaeological sites are federal property in Brazil (Law 3,924/1961). Damaging them is a crime.</p>`,
      'tour-som': 'Tour sound (on/off)',
      'tour-som-aria': 'Tour sound',
    },
    es: {
      titulo: 'Geoglifos de la Amazonía: mapa de las estructuras de tierra precolombinas',
      alca: 'Abrir o cerrar el panel',
      h1: 'Geoglifos de la <span>Amazonía</span>',
      lede: '<b id="lede-total">1367</b> estructuras de tierra (<span id="lede-nature">406</span> halladas con LiDAR, <span id="lede-science">961</span> ya catalogadas) y <span id="lede-fotos">664</span> fotos: zanjas y terraplenes geométricos de 600&nbsp;a.&nbsp;C. a 850&nbsp;d.&nbsp;C., revelados por la deforestación y el LiDAR en Acre, Amazonas y Bolivia.',
      'tour-painel': 'Tour de 2 minutos',
      camadas: 'Capas',
      'c-nature': 'LiDAR: Nature 2026<small>estructuras bajo el bosque (Pärssinen et al.)</small>',
      'c-science': 'Base compilada: Science 2023<small>Amazon Arch, CNSA, PAST, INRAP, INPE</small>',
      'c-lidar': 'LiDAR abierto: relieve bajo el bosque<small>franjas del proyecto EBA (INPE); acérquese para verlas</small>',
      'c-prob': 'Dónde aún puede haber estructuras<small>modelo predictivo, Science 2023</small>',
      'c-fotos': 'Fotos<small>app Ancient Amazonian Earthworks (R. Walker)</small>',
      'c-jacobs': 'Jacobs (solo local)<small>puntos, contornos y caminos</small>',
      'prob-menor': 'menor',
      'prob-maior': 'mayor probabilidad',
      'd-oque': `<summary>¿Qué son los geoglifos?</summary>
    <p>Son recintos de tierra (círculos, cuadrados, octógonos, elipses) delimitados por zanjas de hasta 15&nbsp;m de ancho y 5&nbsp;m de profundidad, a veces unidos por caminos con terraplenes paralelos. Según Pärssinen et al. (2026), los construyó la llamada civilización Aquiry y servían para ceremonias y encuentros políticos, no como vivienda.</p>
    <p>El LiDAR de 4497&nbsp;km² encontró 432 estructuras, 396 de ellas inéditas, y los autores estiman que hay entre 24&nbsp;000 y 30&nbsp;000 en la región.</p>`,
      'd-fontes': `<summary>Fuentes y licencias</summary>
    <ul>
      <li>Pärssinen et al. 2026, <i>Nature</i>, <a href="https://doi.org/10.1038/s41586-026-10835-7">doi:10.1038/s41586-026-10835-7</a> (CC&nbsp;BY&nbsp;4.0). Tabla Suplementaria&nbsp;2; los autores omitieron las estructuras en tierras indígenas. Los recortes de LiDAR en los globos vienen de la Fig.&nbsp;2 y de la Extended Data Fig.&nbsp;4 del artículo.</li>
      <li>Peripato et al. 2023, <i>Science</i>, <a href="https://doi.org/10.1126/science.ade2541">doi:10.1126/science.ade2541</a>; datos en <a href="https://zenodo.org/records/10214943">Zenodo</a>.</li>
      <li>Fotos: app <a href="https://robert-walker.shinyapps.io/ggshiny/">Ancient Amazonian Earthworks</a> (R. Walker, Univ. of Missouri), que reúne figuras de artículos y fotos de investigadores; los créditos de cada foto siguen la leyenda original.</li>
      <li>LiDAR abierto: transectos del proyecto EBA (INPE), <a href="https://zenodo.org/records/4968706">Zenodo</a> (CC&nbsp;BY&nbsp;4.0). Modelo de terreno de 2&nbsp;m hecho aquí a partir de las nubes de puntos, con filtro de suelo propio, relieve sombreado y realce del relieve local (zanjas en verde azulado, terraplenes en ocre).</li>
      <li>Tour: BBC News Brasil (30/09/2026); Prümers et al. 2022, <i>Nature</i>, <a href="https://doi.org/10.1038/s41586-022-04780-4">doi:10.1038/s41586-022-04780-4</a>; Koch et al. 2019, <i>Quaternary Science Reviews</i>, <a href="https://doi.org/10.1016/j.quascirev.2018.12.004">doi:10.1016/j.quascirev.2018.12.004</a>.</li>
      <li>Imágenes de satélite: Esri World Imagery.</li>
    </ul>
    <p>La base más completa, con fotos y contornos, es la de <a href="https://www.jqjacobs.net/archaeology/geoglyph.html">James Q. Jacobs</a>.</p>`,
      'd-protecao': `<summary>Protección de los sitios</summary>
    <p>En Brasil, los sitios arqueológicos son bienes de la Unión (Ley 3924/1961). Las coordenadas de este mapa ya fueron publicadas por los autores, con una precisión de unos 100&nbsp;m. No entre en propiedades ni retire material; dañar sitios es delito.</p>`,
      rodape: 'Código y datos en GitHub',
      'fotos-aria': 'Fotos de los sitios',
      'fotos-cab': '<b>Fotos</b> <span id="fotos-n"></span><small>haga clic para ir al sitio</small>',
      'fotos-rodape': 'Fotos: <a href="https://robert-walker.shinyapps.io/ggshiny/">Ancient Amazonian Earthworks</a> (R. Walker)',
      'tour-titulo': 'Un paseo de 2 minutos por los geoglifos',
      compartilhar: 'Compartir',
      'compartilhar-titulo': 'Compartir esta vista',
      sobre: 'Acerca de',
      idioma: 'Idioma',
      fechar: 'Cerrar',
      'svg-aria': 'Dibujo de dos geoglifos unidos por un camino: un cuadrado triple y un círculo dentro de un cuadrado',
      'svg-quadrado': 'CUADRADO TRIPLE',
      'svg-circulo': 'CÍRCULO EN EL CUADRADO',
      'sobre-corpo': `<p>Este mapa reúne en un solo lugar las estructuras de tierra precolombinas del suroeste de la Amazonía: los <b>geoglifos</b>, zanjas y terraplenes geométricos que solo se ven desde lo alto, en avión o por satélite.</p>

  <h3>La civilización Aquiry</h3>
  <p>En julio de 2026, un equipo de universidades de Finlandia y Brasil (Helsinki, Turku, UFAC, UFPA y otras) publicó en <i>Nature</i> un relevamiento con LiDAR, un láser lanzado desde un avión que ve bajo los árboles, de 4497&nbsp;km² entre Acre y Amazonas. Encontraron <b>432 estructuras, 396 de ellas nunca registradas</b>.</p>
  <ul>
    <li>Los geoglifos se construyeron entre <b>600 a.&nbsp;C. y 850 d.&nbsp;C.</b> por la llamada civilización Aquiry.</li>
    <li>El área ocupada llegaría a <b>183&nbsp;000 km²</b>, un poco más que Uruguay, con <b>hasta 3 millones de personas</b> entre 100 y 300 d.&nbsp;C.</li>
    <li>Las zanjas llegan a 15&nbsp;m de ancho y 5&nbsp;m de profundidad. Sin piedra en la región, la tierra se movía con madera y cestos.</li>
    <li>Eran espacios de ceremonia y de decisión política, unidos por <b>350&nbsp;km de caminos</b> ya mapeados, que se ensanchaban al acercarse a ellos. No eran fortalezas ni viviendas.</li>
    <li>Hacia el 850 d.&nbsp;C. dejaron de construirse, en la misma época en que los mayas abandonaron sus ciudades.</li>
    <li>Los autores estiman que hay entre <b>24&nbsp;000 y 30&nbsp;000</b> estructuras en la región, la mayoría todavía bajo el bosque.</li>
  </ul>
  <blockquote>“Este pueblo hacía geometría monumental en la Amazonía al mismo tiempo que Pitágoras desarrollaba su teorema en Grecia.”<cite>Alceu Ranzi, paleontólogo, Instituto Geoglifos da Amazônia (traducido)</cite></blockquote>
  <blockquote>“Lo que vemos en la Amazonía no es un gran bosque natural, sino un gran jardín construido a lo largo de la historia.”<cite>Rhuan Carlos Lopes, arqueólogo, UFPA (traducido)</cite></blockquote>
  <p>Basado en el reportaje <a href="https://www.bbc.com/portuguese/articles/cm4gvnv14zlgo">“As construções monumentais ‘escondidas’ na Amazônia descobertas por cientistas”</a>, de André Biernath (BBC News Brasil, 30/09/2026, en portugués), y en el artículo <a href="https://doi.org/10.1038/s41586-026-10835-7">Pärssinen et al. 2026, <i>Nature</i></a>.</p>

  <h3>Datos</h3>
  <p>Puntos de la Tabla Suplementaria 2 de <i>Nature</i> (CC&nbsp;BY&nbsp;4.0; sin las estructuras en tierras indígenas) y de la base compilada por <a href="https://doi.org/10.1126/science.ade2541">Peripato et al. 2023, <i>Science</i></a>, con el modelo de probabilidad de los mismos autores. Código, datos y lista de fuentes: <a href="https://github.com/rafapolo/geoglifos-amazonia">github.com/rafapolo/geoglifos-amazonia</a>.</p>
  <p class="aviso">En Brasil, los sitios arqueológicos son bienes de la Unión (Ley 3924/1961). Dañarlos es delito.</p>`,
      'tour-som': 'Sonido del tour (encender/apagar)',
      'tour-som-aria': 'Sonido del tour',
    },
  };

  document.documentElement.lang = { pt: 'pt-BR', en: 'en', es: 'es' }[idioma];
  const D = T[idioma];
  if (D) {
    if (D.titulo) document.title = D.titulo;
    document.querySelectorAll('[data-i18n]').forEach((el) => { const v = D[el.dataset.i18n]; if (v !== undefined) el.innerHTML = v; });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => { const v = D[el.dataset.i18nTitle]; if (v !== undefined) el.title = v; });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { const v = D[el.dataset.i18nAria]; if (v !== undefined) el.setAttribute('aria-label', v); });
  }

  // título e nomes das camadas cabem numa linha em qualquer idioma: a fonte diminui só o necessário (até 75%)
  document.querySelectorAll('label.camada > span:nth-of-type(2)').forEach((s) => {
    const txt = s.firstChild;
    if (txt?.nodeType !== 3) return;
    const nome = document.createElement('span');
    nome.className = 'nome';
    s.insertBefore(nome, txt);
    nome.append(txt);
  });
  const caber = () => document.querySelectorAll('#painel h1, label.camada .nome').forEach((el) => {
    el.style.fontSize = '';
    let fs = parseFloat(getComputedStyle(el).fontSize);
    const min = fs * 0.75;
    while (el.scrollWidth > el.clientWidth + 0.5 && fs > min) { fs -= 0.25; el.style.fontSize = `${fs}px`; }
  });
  caber();
  document.fonts?.ready.then(caber);
  let espera = 0;
  addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(caber, 150); });

  // seletor PT/EN/ES no topo: recarrega na mesma vista, com o idioma no endereço (a câmera e o sítio também ficam lá)
  const sel = document.getElementById('idioma');
  if (sel) {
    sel.value = idioma;
    sel.addEventListener('change', () => {
      const u = new URL(location.href);
      u.searchParams.delete('tour');
      if (sel.value === 'pt') u.searchParams.delete('lang'); else u.searchParams.set('lang', sel.value);
      location.replace(u.href);
    });
  }
})();
