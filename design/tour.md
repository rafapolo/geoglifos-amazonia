# Tour: o roteiro

O tour é um passeio de câmera de ~2 minutos pelos geoglifos, no estilo de cinema. Abre pelo botão **Tour** no topo, por **Tour de 2 minutos** no painel ou por `?tour=1`, que começa sozinho quando o mapa carrega; `?tour=en` faz o mesmo com as legendas em inglês, para mandar a quem não lê português (o resto do site segue em português) (o parâmetro sai do endereço, então recarregar abre o mapa). **Esc**, **✕ esc** ou o voltar do navegador param o tour e devolvem a câmera e as camadas como estavam.

Este arquivo descreve cada cena e a música. Para mudar algo, edite aqui e peça a mudança no código: as cenas ficam em `cenas()`, em `docs/tour.js`; a música em `docs/som.js`.

## Regras gerais

- **Quadro.** Faixas pretas de cinema 2.39:1 (até 16% da tela cada) e uma linha fina de progresso na borda da faixa de baixo, com os segundos que faltam à direita. Painel, botões e fotos somem; o mapa ocupa a tela toda.
- **Texto.** A legenda tem duas partes: um rótulo pequeno em cima (o *kicker*, lugar · fonte) e a frase; citações levam o nome de quem fala em ocre. Os textos vêm da reportagem da BBC News Brasil (30/09/2026) e de Pärssinen et al. 2026 (*Nature*).
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
| 8 | Um grande jardim | 10 s | Nature, Science | última órbita larga e volta ao mapa chapado |

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
| `?tour=1` sem clique | o navegador segura o som até o primeiro toque ou tecla |

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
| 8 · Um grande jardim | ré |
