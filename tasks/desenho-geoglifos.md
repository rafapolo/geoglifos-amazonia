# Tarefa: um desenho novo dos geoglifos com todos os nossos dados

Registrada em 2026-11-04. **Primeira versão feita no mesmo dia**: `script/desenho.py` gera as pranchas sudoeste, amazonas, acre e mojos em pt, en e es (PNG 2560 × 1600 em `docs/desenhos/`; SVG com `--svg`, em `data/desenhos-svg/`, fora do site), com links no "Sobre". No mapa, o interruptor "Fundo verde, só os desenhos" faz o mesmo ao vivo. Faltam: a prancha de Tequinho, a do LiDAR "sob a floresta", os tamanhos 1200 × 630 e 1080 × 1080, e confirmar com Jacobs o uso impresso.

## A referência

[`amazon_geoglyphs.jpg`](https://www.jqjacobs.net/kml/drawings/amazon_geoglyphs.jpg), de J. Q. Jacobs (2021), em 800 × 681 px:

- **Fundo e traço:** fundo verde-escuro liso, sem satélite. Os contornos e as estradas são traços finos em ocre, na escala real.
- **Recorte:** uma região só, Boa Vista, no Amazonas, com uns 25 km de lado.
- **Textos:** título no canto ("Amazon Geoglyphs / Boa Vista, Amazonas, Brazil"), barra de escala de 5 km e crédito no rodapé.
- **O que funciona:** sem mapa por baixo, o que aparece é só a geometria: quadrados duplos, círculos e estradas retas saindo dos recintos.

Há outras versões no mesmo diretório (`boa_vista_amazonas.jpg`, `amazon_geoglyphs_deskpicture.jpg` em 2560 px).

## A ideia

Refazer o desenho no mesmo espírito, mas com tudo o que o mapa reúne. Seria uma série de pranchas, e não uma só:

| prancha | recorte | o que entra |
|---|---|---|
| Visão geral | sudoeste da Amazônia inteiro (Acre, Amazonas, Rondônia, Bolívia) | todos os pontos, sem traço: só a nuvem de sítios por fonte |
| Acre oriental | entre Rio Branco e Xapuri, ~80 km | contornos e estradas do Jacobs, pontos da *Nature* e da *Science* |
| Boa Vista, Amazonas | o mesmo recorte do desenho original | para comparar com o de 2021 |
| Tequinho e arredores | ~5 km | o quadrado triplo e as estradas, em detalhe |
| Llanos de Mojos (Bolívia) | Cotoca e Casarabe, ~40 km | as calçadas e os canais irradiando dos sítios (`bolivia.kml`) |
| Sob a floresta | uma faixa do LiDAR aberto | o relevo do EBA em tons de ocre sobre o verde, com o recinto Aquiry de 3 ha |

### Dados que entram

- **J. Q. Jacobs**, com autorização: contornos (1.187), estradas, calçadas e canais (8.356) e pontos (2.204), de `docs/data/jacobs/`. As áreas de busca ficam de fora.
- **Pärssinen et al. 2026, *Nature*:** 406 pontos com área. Podem virar círculos com a área de cada estrutura em escala, porque não temos o contorno delas.
- **Peripato et al. 2023, *Science*:** 961 pontos, como marcas pequenas.
- **LiDAR aberto do EBA/INPE:** as faixas (`lidar_faixas.geojson`) e, nas pranchas de detalhe, o relevo.
- **Fotos de Walker:** só como posição, se ajudar.

## Como fazer

- **Script:** `script/desenho.py`, com Polars para os dados e saída em SVG (vetor, nítido em qualquer tamanho) e PNG.
- **Projeção:** UTM 19S (EPSG:32719), em metros, para a barra de escala ser real.
- **Paleta:**
  - fundo verde-escuro, como o original (#1f3d29 ou parecido);
  - traço do Jacobs em ocre (`--ocre` do site, #e9b44c);
  - *Nature* em terra (#c8642a);
  - *Science* em ocre claro;
  - LiDAR em tons de areia.
- **Textos:**
  - título em Fraunces e rodapé em Inter, como no site;
  - legenda com as fontes de cada cor e barra de escala;
  - crédito "J. Q. Jacobs (com autorização), Pärssinen et al. 2026, Peripato et al. 2023, EBA/INPE";
  - versões em pt, en e es.
- **Tamanhos de saída:**
  - 2560 × 1600 (papel de parede);
  - 1200 × 630 (cartão de compartilhamento, que pode substituir o `og.jpg`);
  - quadrado 1080 (redes).
- **Destino:** `docs/desenhos/`, com um link no "Sobre" e talvez uma prancha por cena do tour.

## Cuidados

- O desenho original é do Jacobs: o nosso se inspira no estilo, não copia o arquivo. O crédito do traço dele vai em todas as pranchas.
- Confirmar com ele se a autorização cobre também derivados impressos ou em alta resolução.
- Os sítios em terras indígenas já não estão nos dados da *Nature* (os autores omitiram), e assim continua.
