# Tour: o roteiro

O tour é um passeio de câmera de 1 min 58 s pelos geoglifos, no estilo de cinema. Abre pelo botão **Tour** no topo, por **Tour de 2 minutos** (que some do painel depois de um tour visto até o fim; o botão do topo continua) no painel ou por `?tour=1`, que abre um convite (**Começar o tour**) sobre o mapa: o clique começa o tour e libera o som, que o navegador não toca sem um gesto; clicar fora ou Esc deixa só o mapa (o parâmetro sai do endereço, então recarregar abre o mapa). `?tour=en` e `?tour=es` fazem o mesmo em inglês e em espanhol, e o site inteiro troca de idioma junto (ver `docs/i18n.js`). **Esc** ou **✕ esc** param o tour e deixam o mapa exatamente onde a câmera estava (as camadas voltam como estavam; o endereço passa a ser dessa vista). O voltar do navegador também para o tour e volta à vista de antes dele.

Este arquivo descreve cada cena e a música. Para mudar algo, edite aqui e peça a mudança no código: as cenas ficam em `cenas()`, em `docs/tour.js`; a música em `docs/som.js`.

## Regras gerais

- **Quadro.** Faixas pretas de cinema 2.39:1 (até 16% da tela cada) e uma linha fina de progresso na borda da faixa de baixo, com o tempo que falta logo acima dela, colado à direita (02:10 acima de um minuto, 45 s abaixo). Na saída (fim ou parada), a linha de progresso, o tempo, os botões e a legenda somem em 200 ms, antes de as faixas fecharem, para não ficarem boiando no meio da tela. Painel, botões e fotos somem; o mapa ocupa a tela toda.
- **Texto.** A legenda tem duas partes: um rótulo pequeno em cima (o *kicker*, lugar · fonte) e a frase; citações levam o nome de quem fala em ocre. Os textos vêm do PRODES/INPE (desmatamento), da reportagem da BBC News Brasil (30/09/2026), de Pärssinen et al. 2026 (*Nature*), de Prümers et al. 2022 (*Nature*, Cotoca) e de Koch et al. 2019 (*Quaternary Science Reviews*, a mortalidade depois de 1492).
- **Idiomas.** Cada legenda tem versão em português, inglês e espanhol (`t('pt', 'en', 'es')` em `cenas()`); o idioma é o do site e vem só do endereço (`?lang=en|es`, `?tour=en|es` ou o seletor PT/EN/ES no topo, que recarrega com `?lang=`); sem ele, português. As citações em inglês e espanhol são traduções nossas do português da BBC.
- **Números.** Contados no navegador a partir dos dados carregados (estruturas, sítios Aquiry, hectares); só as cifras citadas da reportagem e do artigo são fixas.
- **Rótulos.** Os rótulos da Esri são raster e esticam com a câmera inclinada, então somem durante o tour.
- **Câmera.** Cada cena chega com um voo (`flyTo`) e depois faz um movimento contínuo quadro a quadro (`orbita`): gira, inclina, aproxima e desloca ao mesmo tempo, com aceleração suave na entrada e na saída. No tour o zoom vai até 17 e a inclinação até 78°.
- **Tempo.** Cada legenda fica no mínimo 6 s na tela; os momentos de cada cena são marcados a partir do começo dela (`em(ms)` em `cenas()`), e a câmera se move durante as legendas, sem planos vazios.
- **Movimento reduzido.** Com `prefers-reduced-motion`, a câmera corta de plano em plano e não orbita.

## As cenas

| # | cena | duração | camadas | câmera |
|---|---|---|---|---|
| 0 | Abertura | 14 s | Nature, Science, PRODES em três tempos | parte de Porto Velho e voa numa curva larga e suave (Bézier) sobre o rio Madeira e a BR-364 até Rio Branco, baixo sobre o pasto (`seguir()`: zoom 10,6→10,1, 70°→64°, a câmera olha um quarto da rota à frente e vira devagar), no eixo do desmatamento (~70°/250°, medido nas imagens do PRODES); o desmatamento acende até 2007 (0 s), até 2015 (3,5 s) e até 2025 (7 s); aos 10 s sobe para 7,5 (42°) girando até o norte. Legendas: “Seguindo o caminho da destruição…” (0 s) e o voo de Ranzi (7 s) |
| 1 | Acre: o que são os geoglifos e o desmatamento | 10 s | Nature, PRODES (já aceso) | virada para o norte, desce devagar até 8,4 (55°) girando +20° sobre o pasto |
| 2 | Tequinho | 13 s | nenhuma (só o satélite), depois a foto de drone | chega de cima (16,5) e dá 150° de volta no quadrado triplo; aos 6,5 s abre o balão com a foto de drone de R. Walker (acrdp); aos 10 s acende o contorno das valas (traçados de Jacobs) |
| 3 | Octógonos | 8 s | contornos e estradas de Jacobs (sem os pontos) | de cima (16,2) no octógono de um campo arado (acroc), voo de 30 km até o octógono duplo (acdoc) e meia órbita |
| 4 | LiDAR | 7 s | Nature | sobe (8,4) e corre de lado ao longo das faixas |
| 5 | O laser revela | 13 s | Nature, depois LiDAR aberto | chega de cima (15,6) sobre a copa; aos 5 s o LiDAR acende e a câmera gira +35° inclinando até 40° sobre um recinto Aquiry de 3 ha (Lid24_L02_63a) |
| 6 | Civilização Aquiry | 13 s | Nature, Science | recua para o território (6,3) e gira; aos 6,5 s, na frase das estradas, passa por uns segundos ao fundo verde com os traçados de Jacobs e voa até um dos trechos com mais traçados, recintos ligados por estradas ao norte de Rio Branco (−67,215, −9,165; zoom 12→12,2) |
| 7 | Um sítio cerimonial | 8 s | nenhuma (só o satélite) | chega a 15,65 (40°) sobre dois círculos, um retângulo e estradas (Iriarte et al. 2020) e dá 120° de volta |
| 8 | Ainda escondidos | 7,5 s | probabilidade, Nature | sobe (5,6) e endireita até 10° enquanto o mapa de probabilidade se espalha |
| 9 | Cotoca e as calçadas de Mojos | 13 s | fotos, depois contornos e estradas de Jacobs | chega de cima a Cotoca (16) e abre o LiDAR no balão; aos 6,5 s fecha, recua a 11,4 e as calçadas de Jacobs aparecem |
| 10 | Depois de 1492, um grande jardim | 16 s | Nature, Science | última órbita larga e volta ao mapa chapado |

## Som

A música é feita no navegador enquanto o tour roda, com Web Audio, sem arquivo de som, e toca só no tour. Inspira-se em música indígena amazônica: escala pentatônica de ré menor (ré, fá, sol, lá, dó), flauta de bambu, maracá, chuva de sementes, tambor grave e um coro de vozes que responde à flauta, sobre um bordão. O coro canta só vogais, sem palavras, e fica discreto, como textura de gente cantando junto. Cada execução é diferente: as frases e os golpes são sorteados, mas sempre na escala e no pulso de 92 bpm. O botão **♪**, ao lado de **✕ esc**, liga e desliga; a escolha fica no `localStorage` (`geoglifos-som`) e o som vem ligado. Com `?som=debug`, `window.som` expõe o motor, e `som.pico()` mede a saída.

### A câmera toca a música

| câmera | som | valores |
|---|---|---|
| zoom | brilho do bordão (passa-baixas) | 220 Hz × 2^((zoom − 5) / 2,6), entre 150 e 2.600 Hz |
| zoom | o tambor só bate de perto: no 1 de cada compasso a partir do zoom 8, e também no "e" do 3 quando perto | força 0,3 → 1 do zoom 8 ao 15 |
| zoom | a flauta: de longe, frases curtas de notas longas e graves; de perto, mais altas, rápidas e com apojaturas | 3 a 7 notas; ornamento 15% → 45% |
| zoom | o coro responde mais de perto | chance de resposta 45% → 75% do zoom 5 ao 15 (90% nas cenas 7 e 10) |
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
| Coro | 8 vozes, metade grave e metade aguda (uma oitava acima): serra com vibrato próprio (4,6 a 6 Hz) pelos três formantes de uma vogal (a, o, u, e), mais sopro; cada voz desafina até ±12 cents, entra até 90 ms depois das outras e fica num ponto da roda, da esquerda à direita | ganho 0,11 por voz; mais sala que os outros (0,7); `?coro=0` desliga, `som.coro()` toca com `?som=debug` |
| Sala | 3 s de ruído morrendo, os agudos primeiro | pré-atraso de 15 ms |
| Mestre | passa-altas → compressor → limitador → teto suave (tanh) | 30 Hz; −18 dB, 3:1; −3 dB, 20:1 |

### Os momentos

| momento | som |
|---|---|
| Tour abre | o bordão entra em ~2 s, o maracá começa a marcar o tempo |
| Cada cena nova | o bordão desliza para a nota da cena e o tambor bate duas vezes |
| Cada legenda nova | uma frase da flauta, se ela não estiver no meio de outra |
| Câmera calma | a flauta volta sozinha a cada 7 a 11 s |
| Fim de uma frase da flauta | pergunta e resposta: o coro repete as últimas 2 ou 3 notas e segura a final |
| Cenas 7 e 10 (cerimônias, fecho) | o grupo marca o pulso a cada dois compassos: duas sílabas curtas na nota da cena e uma longa na quinta abaixo |
| Tour até o fim | cadência: a flauta e o coro descem lá, sol, fá, ré; rufo de maracá, dois golpes de tambor e o som se apaga em ~4 s |
| Tour parado no meio | o som some em 0,8 s |
| Aba escondida | o som pausa e volta com ela |
| `?tour=1` | o convite pede um clique antes de começar, então o som já entra com o tour |

| cena | nota do bordão |
|---|---|
| 0 · Abertura | ré |
| 1 · Acre | sol |
| 2 · Tequinho | dó (abaixo) |
| 3 · Octógonos | fá |
| 4 · LiDAR | lá |
| 5 · O laser revela | fá |
| 6 · Aquiry | ré |
| 7 · Um sítio cerimonial | fá |
| 8 · Ainda escondidos | dó (abaixo) |
| 9 · Cotoca | sol |
| 10 · Um grande jardim | ré |

## As legendas

O rótulo (*kicker*) vem antes do travessão. Os números entre chaves são contados dos dados no navegador.

| # | português | inglês | espanhol |
|---|---|---|---|
| 0 | Porto Velho → Rio Branco · rio Madeira e BR-364 — Seguindo o caminho da destruição… | Porto Velho → Rio Branco · Madeira River and BR-364 — Following the path of destruction… | Porto Velho → Rio Branco · río Madeira y BR-364 — Siguiendo el camino de la destrucción… |
| 0 | Acre · há mais de 40 anos — Alceu Ranzi viu os primeiros de um avião, voltando a Rio Branco: só apareciam onde a floresta tinha virado pasto. | Acre · over 40 years ago — Alceu Ranzi spotted the first ones from a plane flying back to Rio Branco: they only showed where forest had become pasture. | Acre · hace más de 40 años — Alceu Ranzi vio los primeros desde un avión, de regreso a Rio Branco: solo aparecían donde el bosque se había vuelto pastizal. |
| 1 | Geoglifos da Amazônia — Desenhos de terra feitos entre 600 a.C. e 850 d.C., enterrados sob as florestas do sudoeste da Amazônia e revelados pelo desmatamento. | Geoglyphs of the Amazon — Earthen drawings made between 600 BC and AD 850, buried beneath the forests of the southwestern Amazon and revealed by deforestation. | Geoglifos de la Amazonía — Dibujos de tierra hechos entre 600 a. C. y 850 d. C., enterrados bajo los bosques del suroeste de la Amazonía y revelados por la deforestación. |
| 1 | Desmatamento · PRODES/INPE (CC BY-SA) — Em laranja, a floresta derrubada até 2007, até 2015 e até 2025. Cada pasto novo expôs mais desenhos. | Deforestation · PRODES/INPE — In orange, forest cleared by 2007, by 2015 and by 2025. Every new pasture exposed more drawings. | Deforestación · PRODES/INPE — En naranja, el bosque talado hasta 2007, hasta 2015 y hasta 2025. Cada pastizal nuevo expuso más dibujos. |
| 2 | Tequinho · Acre — Valas de até 15 m de largura e 5 m de profundidade, cavadas sem pedra: com madeira e cestos. | Ditches up to 15 m wide and 5 m deep, dug without stone tools: with wood and baskets. | Zanjas de hasta 15 m de ancho y 5 m de profundidad, cavadas sin piedra: con madera y cestos. |
| 2 | Tequinho · Acre — “Esse povo fazia geometria monumental na Amazônia ao mesmo tempo que Pitágoras desenvolvia seu teorema na Grécia.” (Alceu Ranzi) | “These people were making monumental geometry in the Amazon at the same time Pythagoras was developing his theorem in Greece.” | “Este pueblo hacía geometría monumental en la Amazonía al mismo tiempo que Pitágoras desarrollaba su teorema en Grecia.” |
| 3 | Octógonos · Acre e Amazonas — Entre os {2.204} sítios mapeados por J. Q. Jacobs, só quatro têm oito lados, todos com cerca de 155 m. Um deles é duplo, uma vala dentro da outra. | Octagons · Acre and Amazonas — Among the {2,204} sites mapped by J. Q. Jacobs, only four have eight sides, all about 155 m across. One is double, one ditch inside the other. | Octógonos · Acre y Amazonas — Entre los {2204} sitios mapeados por J. Q. Jacobs, solo cuatro tienen ocho lados, todos de unos 155 m. Uno es doble, una zanja dentro de la otra. |
| 4 | LiDAR · Nature 2026 — Um laser lançado de avião enxerga sob as árvores: em 4.497 km², 432 estruturas, 396 nunca registradas. | A laser fired from a plane sees beneath the trees: across 4,497 km², 432 structures, 396 never recorded before. | Un láser lanzado desde un avión ve bajo los árboles: en 4497 km², 432 estructuras, 396 nunca registradas. |
| 5 | Sob a floresta · Acre — Daqui de cima, só copa de árvore. | Under the forest · Acre — From up here, nothing but treetops. | Bajo el bosque · Acre — Desde aquí arriba, solo copas de árboles. |
| 5 | LiDAR aberto · EBA/INPE — O laser tira as árvores da frente e mostra o chão. Aqui, a Nature registrou um recinto Aquiry de 3 hectares. | Open LiDAR · EBA/INPE — The laser strips the trees away and shows the ground. Here, Nature recorded a 3-hectare Aquiry enclosure. | LiDAR abierto · EBA/INPE — El láser quita los árboles y muestra el suelo. Aquí, Nature registró un recinto Aquiry de 3 hectáreas. |
| 6 | Civilização Aquiry · 600 a.C.–850 d.C. — Até 3 milhões de pessoas entre 100 e 300 d.C., em 183 mil km², pouco mais que o Uruguai hoje. | Aquiry civilization · 600 BC–AD 850 — Up to 3 million people between AD 100 and 300, over 183,000 km², a little more than Uruguay today. | Civilización Aquiry · 600 a. C.–850 d. C. — Hasta 3 millones de personas entre 100 y 300 d. C., en 183 000 km², un poco más que Uruguay hoy. |
| 6 | Aquiry · estradas — Os sítios eram ligados por estradas, 350 km já mapeados, que se alargavam ao chegar perto deles. | Aquiry · roads — The sites were linked by roads, 350 km mapped so far, that widened as they approached them. | Aquiry · caminos — Los sitios estaban unidos por caminos, 350 km ya mapeados, que se ensanchaban al acercarse a ellos. |
| 7 | Cerimônias, não fortalezas — “Os geoglifos eram usados para encontros, para tomar decisões políticas e para organizar cerimônias religiosas, e também para festas, dança e música.” (Martti Pärssinen) | Ceremonies, not fortresses — “The geoglyphs were used for gatherings, for making political decisions and for religious ceremonies, and also for feasts, dance and music.” | Ceremonias, no fortalezas — “Los geoglifos se usaban para encuentros, para tomar decisiones políticas y para organizar ceremonias religiosas, y también para fiestas, danza y música.” |
| 8 | Ainda escondidos — {961} estruturas já catalogadas na Amazônia, e os autores estimam de 24 a 30 mil só nesta região. Em vermelho, onde é mais provável achá-las. | Still hidden — {961} earthworks already catalogued across the Amazon, and the authors estimate 24,000 to 30,000 in this region alone. In red, where they are most likely to be found. | Todavía ocultos — {961} estructuras ya catalogadas en la Amazonía, y los autores estiman entre 24 000 y 30 000 solo en esta región. En rojo, donde es más probable encontrarlas. |
| 9 | Cotoca · Bolívia · Nature 2022 — Do satélite, só mato. O LiDAR achou aqui uma cidade da cultura Casarabe (500–1400 d.C.): plataformas, pirâmides, canais e calçadas elevadas. | From the satellite, only scrub. LiDAR found a city of the Casarabe culture here (AD 500–1400): platforms, pyramids, canals and raised causeways. | Desde el satélite, solo monte. El LiDAR halló aquí una ciudad de la cultura Casarabe (500–1400 d. C.): plataformas, pirámides, canales y calzadas elevadas. |
| 9 | Llanos de Mojos · traçados de J. Q. Jacobs — Calçadas elevadas e canais saem de Cotoca em todas as direções e ligam a cidade aos sítios vizinhos. | Llanos de Mojos · outlines by J. Q. Jacobs — Raised causeways and canals leave Cotoca in every direction and link the city to the sites around it. | Llanos de Mojos · trazados de J. Q. Jacobs — Calzadas elevadas y canales salen de Cotoca en todas las direcciones y unen la ciudad a los sitios vecinos. |
| 10 | Depois de 1492 · Koch et al. 2019 — Os colonizadores europeus trouxeram epidemias, guerra e escravidão: cerca de 90% dos povos das Américas morreram em um século. A floresta cresceu sobre os jardins. | After 1492 — European colonizers brought epidemics, war and slavery: about 90% of the peoples of the Americas died within a century. The forest grew back over the gardens. | Después de 1492 — Los colonizadores europeos trajeron epidemias, guerra y esclavitud: cerca del 90% de los pueblos de América murió en un siglo. El bosque creció sobre los jardines. |
| 10 | Um grande jardim — “O que a gente vê na Amazônia não é uma grande floresta natural, mas, sim, um grande jardim construído historicamente.” (Rhuan Carlos Lopes) | A great garden — “What we see in the Amazon is not a great natural forest, but a great garden built over history.” | Un gran jardín — “Lo que vemos en la Amazonía no es un gran bosque natural, sino un gran jardín construido a lo largo de la historia.” |
