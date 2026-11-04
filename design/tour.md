# Tour: o roteiro

O tour é um passeio de câmera de 2 min 20 s pelos geoglifos, no estilo de cinema. Abre pelo botão **Tour** no topo, por **Tour de 2 minutos** no painel ou por `?tour=1`, que abre um convite (**Começar o tour**) sobre o mapa: o clique começa o tour e libera o som, que o navegador não toca sem um gesto; clicar fora ou Esc deixa só o mapa (o parâmetro sai do endereço, então recarregar abre o mapa). `?tour=en` e `?tour=es` fazem o mesmo em inglês e em espanhol, e o site inteiro troca de idioma junto (ver `docs/i18n.js`). **Esc**, **✕ esc** ou o voltar do navegador param o tour e devolvem a câmera e as camadas como estavam.

Este arquivo descreve cada cena e a música. Para mudar algo, edite aqui e peça a mudança no código: as cenas ficam em `cenas()`, em `docs/tour.js`; a música em `docs/som.js`.

## Regras gerais

- **Quadro.** Faixas pretas de cinema 2.39:1 (até 16% da tela cada) e uma linha fina de progresso na borda da faixa de baixo, com os segundos que faltam à direita. Painel, botões e fotos somem; o mapa ocupa a tela toda.
- **Texto.** A legenda tem duas partes: um rótulo pequeno em cima (o *kicker*, lugar · fonte) e a frase; citações levam o nome de quem fala em ocre. Os textos vêm da reportagem da BBC News Brasil (30/09/2026), de Pärssinen et al. 2026 (*Nature*), de Prümers et al. 2022 (*Nature*, Cotoca) e de Koch et al. 2019 (*Quaternary Science Reviews*, a mortalidade depois de 1492).
- **Idiomas.** Cada legenda tem versão em português, inglês e espanhol (`t('pt', 'en', 'es')` em `cenas()`); o idioma é o do site e vem só do endereço (`?lang=en|es`, `?tour=en|es` ou o seletor PT/EN/ES no topo, que recarrega com `?lang=`); sem ele, português. As citações em inglês e espanhol são traduções nossas do português da BBC.
- **Números.** Contados no navegador a partir dos dados carregados (estruturas, sítios Aquiry, hectares); só as cifras citadas da reportagem e do artigo são fixas.
- **Rótulos.** Os rótulos da Esri são raster e esticam com a câmera inclinada, então somem durante o tour.
- **Câmera.** Cada cena chega com um voo (`flyTo`) e depois faz um movimento contínuo quadro a quadro (`orbita`): gira, inclina, aproxima e desloca ao mesmo tempo, com aceleração suave na entrada e na saída. No tour o zoom vai até 17 e a inclinação até 78°.
- **Movimento reduzido.** Com `prefers-reduced-motion`, a câmera corta de plano em plano e não orbita.

## As cenas

| # | cena | duração | camadas | câmera |
|---|---|---|---|---|
| 0 | Abertura | 9 s | Nature, Science | grua do mapa chapado (zoom 4,8) para a vista oblíqua (6,6, 62°), girando −55° |
| 1 | A Amazônia toda | 12 s | Science | recua alto (4,6) e varre o horizonte, +50° |
| 2 | Acre, o voo de Ranzi | 15 s | Science, Nature | mergulho rasante (10,4, 72°) e travelling sobre o pasto |
| 3 | Tequinho | 17 s | nenhuma (só o satélite) | chega de cima (16,5) e dá 200° de volta no quadrado triplo |
| 4 | LiDAR | 16 s | Nature | sobe (8,4) e corre de lado ao longo das faixas do levantamento |
| 5 | Civilização Aquiry | 14 s | Nature, Science | recua para o território (6,3) e gira devagar, +70° |
| 6 | Um sítio sob a floresta | 14 s | Nature | aproximação baixa (14,8, 70°) e órbita de 240° no maior sítio Aquiry bem delineado |
| 7 | Ainda escondidos | 13 s | probabilidade, Nature | sobe (5,6) e a câmera endireita até 10° enquanto o mapa de probabilidade se espalha |
| 8 | Cotoca, o que vem por aí | 15 s | fotos | voa à Bolívia e chega de cima (16, rumo 40°), abre o balão com o LiDAR de Cotoca e gira +60° inclinando até 55° |
| 9 | Depois de 1492, um grande jardim | 16 s | Nature, Science | fecha o balão, última órbita larga e volta ao mapa chapado |

## Som

A música é feita no navegador enquanto o tour roda, com Web Audio, sem arquivo de som, e toca só no tour. Inspira-se em música indígena amazônica: escala pentatônica de ré menor (ré, fá, sol, lá, dó), flauta de bambu, maracá, chuva de sementes e tambor grave, sobre um bordão. Cada execução é diferente: as frases e os golpes são sorteados, mas sempre na escala e no pulso de 92 bpm. O botão **♪**, ao lado de **✕ esc**, liga e desliga; a escolha fica no `localStorage` (`geoglifos-som`) e o som vem ligado. Com `?som=debug`, `window.som` expõe o motor, e `som.pico()` mede a saída.

### A câmera toca a música

| câmera | som | valores |
|---|---|---|
| zoom | brilho do bordão (passa-baixas) | 220 Hz × 2^((zoom − 5) / 2,6), entre 150 e 2.600 Hz |
| zoom | o tambor só bate de perto: no 1 de cada compasso a partir do zoom 8, e também no "e" do 3 quando perto | força 0,3 → 1 do zoom 8 ao 15 |
| zoom | a flauta: de longe, frases curtas de notas longas e graves; de perto, mais altas, rápidas e com apojaturas | 3 a 7 notas; ornamento 15% → 45% |
| inclinação | quanto vai para o eco da sala | 0,2 + inclinação / 78 × 0,45 |
| rumo | posição esquerda/direita do bordão e da flauta | sen(rumo) × 0,5 (flauta × 0,45) |
| velocidade | densidade do maracá: parado só marca o tempo; rápido, enche até as semicolcheias, mais forte e mais brilhante | √(pixels + zoom × 800 + graus × 4 por segundo ÷ 1.500), sobe rápido, desce devagar |
| velocidade | chuva de sementes (pau de chuva) nos voos | até 7 grãos por semicolcheia, ∝ velocidade² |
| velocidade | vento: ruído em banda que sobe de tom | ganho 0,09 × velocidade², banda 300 → 1.800 Hz |
| giro | os golpes do maracá se abrem para os lados, alternando esquerda e direita | 0,2 + giro (graus/s) / 40, até 0,8 |

### As camadas

| camada | o que é | valores |
|---|---|---|
| Bordão | triângulo duas oitavas abaixo da nota da cena, duas serras uma oitava abaixo (±7 cents), quinta em seno | ganho 0,11; desliza 0,8 s para a nota nova |
| Flauta | seno com deslize de entrada (−3,5%), vibrato de 5,2 Hz que entra devagar, oitava fraca e sopro (ruído em banda) | ganho 0,09 × força; muito eco |
| Maracá | cada golpe são 3 a 6 sementes em 30 ms: ruído em banda de 4,5 a 7 kHz, decaimento de 35 a 85 ms | acento no tempo (1), meio tempo (0,6), semicolcheia (0,3) |
| Tambor | seno caindo de tom em 80 ms, com estalo | 0,9 s de decaimento |
| Sala | 3 s de ruído morrendo, os agudos primeiro | pré-atraso de 15 ms |
| Mestre | passa-altas → compressor → limitador → teto suave (tanh) | 30 Hz; −18 dB, 3:1; −3 dB, 20:1 |

### Os momentos

| momento | som |
|---|---|
| Tour abre | o bordão entra em ~2 s, o maracá começa a marcar o tempo |
| Cada cena nova | o bordão desliza para a nota da cena e o tambor bate duas vezes |
| Cada legenda nova | uma frase da flauta, se ela não estiver no meio de outra |
| Câmera calma | a flauta volta sozinha a cada 7 a 11 s |
| Tour até o fim | cadência: a flauta desce lá, sol, fá, ré; rufo de maracá, dois golpes de tambor e o som se apaga em ~4 s |
| Tour parado no meio | o som some em 0,8 s |
| Aba escondida | o som pausa e volta com ela |
| `?tour=1` | o convite pede um clique antes de começar, então o som já entra com o tour |

| cena | nota do bordão |
|---|---|
| 0 · Abertura | ré |
| 1 · A Amazônia toda | fá |
| 2 · Acre | sol |
| 3 · Tequinho | dó (abaixo) |
| 4 · LiDAR | lá |
| 5 · Aquiry | ré |
| 6 · Um sítio sob a floresta | fá |
| 7 · Ainda escondidos | dó (abaixo) |
| 8 · Cotoca | sol |
| 9 · Um grande jardim | ré |

## As legendas

O rótulo (*kicker*) vem antes do travessão. Os números entre chaves são contados dos dados no navegador.

| # | português | inglês | espanhol |
|---|---|---|---|
| 0 | Geoglifos da Amazônia — Sob a floresta e o pasto do sudoeste da Amazônia, desenhos de terra com mais de 2.000 anos. | Geoglyphs of the Amazon — Beneath the forest and pasture of the southwestern Amazon, earthen drawings more than 2,000 years old. | Geoglifos de la Amazonía — Bajo el bosque y los pastizales del suroeste de la Amazonía, dibujos de tierra de más de 2000 años. |
| 1 | Amazônia · Science 2023 — {961} estruturas de terra já catalogadas por arqueólogos em toda a Amazônia. | Amazonia · Science 2023 — {961} earthworks already catalogued by archaeologists across the Amazon. | Amazonía · Science 2023 — {961} estructuras de tierra ya catalogadas por arqueólogos en toda la Amazonía. |
| 2 | Acre · há mais de 40 anos — Alceu Ranzi viu os primeiros de um avião, voltando a Rio Branco: só apareciam onde a floresta tinha virado pasto. | Acre · over 40 years ago — Alceu Ranzi spotted the first ones from a plane flying back to Rio Branco: they only showed where forest had become pasture. | Acre · hace más de 40 años — Alceu Ranzi vio los primeros desde un avión, de regreso a Rio Branco: solo aparecían donde el bosque se había vuelto pastizal. |
| 2 | Acre — “São desenhos de 400, 500 metros de diâmetro.” (Alceu Ranzi) | “These are drawings 400, 500 metres across.” | “Son dibujos de 400, 500 metros de diámetro.” |
| 3 | Tequinho · Acre — Valas de até 15 m de largura e 5 m de profundidade, cavadas sem pedra: com madeira e cestos. | Ditches up to 15 m wide and 5 m deep, dug without stone tools: with wood and baskets. | Zanjas de hasta 15 m de ancho y 5 m de profundidad, cavadas sin piedra: con madera y cestos. |
| 3 | Tequinho · Acre — “Esse povo fazia geometria monumental na Amazônia ao mesmo tempo que Pitágoras desenvolvia seu teorema na Grécia.” (Alceu Ranzi) | “These people were making monumental geometry in the Amazon at the same time Pythagoras was developing his theorem in Greece.” | “Este pueblo hacía geometría monumental en la Amazonía al mismo tiempo que Pitágoras desarrollaba su teorema en Grecia.” |
| 4 | LiDAR · Nature 2026 — Um laser lançado de avião enxerga sob as árvores: em 4.497 km², 432 estruturas, 396 nunca registradas. | A laser fired from a plane sees beneath the trees: across 4,497 km², 432 structures, 396 never recorded before. | Un láser lanzado desde un avión ve bajo los árboles: en 4497 km², 432 estructuras, 396 nunca registradas. |
| 4 | LiDAR · Nature 2026 — Das {406} com coordenadas publicadas, {284} seguem o padrão Aquiry: juntas, cobrem {1.190} hectares. | Of the {406} with published coordinates, {284} follow the Aquiry pattern: together they cover {1,190} hectares. | De las {406} con coordenadas publicadas, {284} siguen el patrón Aquiry: juntas cubren {1190} hectáreas. |
| 5 | Civilização Aquiry · 600 a.C.–850 d.C. — Até 3 milhões de pessoas entre 100 e 300 d.C., em 183 mil km², pouco mais que o Uruguai. | Aquiry civilization · 600 BC–AD 850 — Up to 3 million people between AD 100 and 300, over 183,000 km², a little more than Uruguay. | Civilización Aquiry · 600 a. C.–850 d. C. — Hasta 3 millones de personas entre 100 y 300 d. C., en 183 000 km², un poco más que Uruguay. |
| 5 | Aquiry · estradas — Os sítios eram ligados por estradas, 350 km já mapeados, que se alargavam ao chegar perto deles. | Aquiry · roads — The sites were linked by roads, 350 km mapped so far, that widened as they approached them. | Aquiry · caminos — Los sitios estaban unidos por caminos, 350 km ya mapeados, que se ensanchaban al acercarse a ellos. |
| 6 | Cerimônias, não fortalezas — “Os geoglifos eram usados para encontros, para tomar decisões políticas e para organizar cerimônias religiosas, e também para festas, dança e música.” (Martti Pärssinen) | Ceremonies, not fortresses — “The geoglyphs were used for gatherings, for making political decisions and for religious ceremonies, and also for feasts, dance and music.” | Ceremonias, no fortalezas — “Los geoglifos se usaban para encuentros, para tomar decisiones políticas y para organizar ceremonias religiosas, y también para fiestas, danza y música.” |
| 6 | Por volta de 850 d.C. — Deixaram de ser construídos, na mesma época em que os maias abandonaram suas cidades. | Around AD 850 — They stopped being built, around the time the Maya abandoned their cities. | Hacia el 850 d. C. — Dejaron de construirse en la misma época en que los mayas abandonaron sus ciudades. |
| 7 | Ainda escondidos — Os autores estimam de 24 a 30 mil estruturas na região, a maioria ainda sob a floresta. | Still hidden — The authors estimate 24,000 to 30,000 structures in the region, most still under the forest. | Todavía ocultos — Los autores estiman entre 24 000 y 30 000 estructuras en la región, la mayoría aún bajo el bosque. |
| 7 | Ainda escondidos — Em vermelho, onde o modelo da Science prevê mais chance de encontrá-las. | In red, where the Science model predicts they are most likely to be found. | En rojo, donde el modelo de Science prevé más probabilidad de encontrarlas. |
| 8 | Cotoca · Bolívia · Nature 2022 — Do satélite, só mato. O LiDAR achou aqui uma cidade da cultura Casarabe (500–1400 d.C.): plataformas, pirâmides, canais e calçadas elevadas. | From the satellite, only scrub. LiDAR found a city of the Casarabe culture here (AD 500–1400): platforms, pyramids, canals and raised causeways. | Desde el satélite, solo monte. El LiDAR halló aquí una ciudad de la cultura Casarabe (500–1400 d. C.): plataformas, pirámides, canales y calzadas elevadas. |
| 8 | O que vem por aí — Cada voo de LiDAR desmonta um pouco mais a ideia de uma floresta virgem. O que a mata ainda esconde? | What comes next — Every LiDAR flight dismantles a little more the idea of a virgin forest. What is the forest still hiding? | Lo que viene — Cada vuelo de LiDAR desmonta un poco más la idea de un bosque virgen. ¿Qué esconde todavía la selva? |
| 9 | Depois de 1492 · Koch et al. 2019 — Epidemias, guerras e escravidão mataram cerca de 90% dos povos das Américas em um século. A floresta cresceu sobre os jardins. | After 1492 — Epidemics, war and slavery killed about 90% of the peoples of the Americas within a century. The forest grew back over the gardens. | Después de 1492 — Epidemias, guerras y esclavitud mataron a cerca del 90% de los pueblos de América en un siglo. El bosque creció sobre los jardines. |
| 9 | Um grande jardim — “O que a gente vê na Amazônia não é uma grande floresta natural, mas, sim, um grande jardim construído historicamente.” (Rhuan Carlos Lopes) | A great garden — “What we see in the Amazon is not a great natural forest, but a great garden built over history.” | Un gran jardín — “Lo que vemos en la Amazonía no es un gran bosque natural, sino un gran jardín construido a lo largo de la historia.” |
| 9 | Geoglifos da Amazônia — Explore o mapa. | Geoglyphs of the Amazon — Explore the map. | Geoglifos de la Amazonía — Explore el mapa. |
