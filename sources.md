# Fontes de dados

Levantamento feito em 2026-11-03. Os arquivos brutos são baixados por `script/sync.sh` para `data/raw/` (fora do git; o hash e a data de cada arquivo ficam em `data/raw/MANIFEST.tsv`).

## Sincronizadas

### 1. James Q. Jacobs — Amazon Geoglyphs (base principal)
- Página: https://www.jqjacobs.net/archaeology/geoglyph.html
- **Licença: ©2026 James Q. Jacobs, "all rights reserved".** Publicado com autorização do autor, dada por e-mail (jqjacobs@yahoo.com) a rafapolo e registrada aqui em 2026-11-04, com crédito e link em cada balão e no painel de fontes.
- Publicado: `amazon_geoglyphs.kml` e `bolivia.kml` (Llanos de Mojos) convertidos por `script/convert.py` em `docs/data/jacobs/` (pontos, contornos, estradas, calçadas e canais). Fora: as áreas de busca (`surveys`, retângulos de 20 a 150 km), a grade topográfica, rios, cotas, curvas de nível, campos sem nome e os alinhamentos astronômicos.
- É o inventário mais completo que existe: compilado de imagens de satélite, drone, LiDAR e da literatura, com referências no balão de cada sítio. Atualizado várias vezes por ano (no cabeçalho do KML: 2025.01 → 2026.04).

| Arquivo | Atualizado | Conteúdo |
|---|---|---|
| `amazon_geoglyphs.kml` | 2026-08-27 | 6.298 placemarks: geoglyphs (1.585 pontos), outlines (1.625 polígonos), lines (2.221 estradas/aterros), mound sites (133), mato grosso (254), surveys por ano 2014–2024 (480) |
| `amazon_geoglyphs.xls` | 2026-08-19 | planilha da mesma base (código, nome, forma, tamanho, coordenadas) |
| `bolivia.kml` | 2026-08-26 | "Space Archaeology in the Amazon, Beni, Bolivia" (zanjas, ilhas florestais, montículos) |
| `brazil_geoglifos.kml` / `.xls` | 2024-09-09 | recorte antigo só do Brasil |
| `acrelandia_2022_survey.kml` | 2024-08-15 | levantamento de Acrelândia em 2022 |

Comparação com a cópia antiga (`~/Documents/misc/amazon_geoglyphs.kml`, set/2024): +920 placemarks (+172 geoglifos, +545 linhas, +160 contornos, +17 montículos); 35 pontos com coordenadas corrigidas. O KML tem um erro de digitação (`--9.789017`): os parsers devem tratar `--` como `-`.

### 2. Nature 2026 — Pärssinen et al., "Over 20,000 pre-colonial earthworks in the Southwest Amazonia"
- DOI: https://doi.org/10.1038/s41586-026-10835-7 (jul/2026, open access, **CC BY 4.0**)
- Matéria da BBC News Brasil (30/09/2026): https://www.bbc.com/portuguese/articles/cm4gvnv14zlgo
- Tour, cena de Cotoca (Bolívia): Prümers et al. 2022, "Lidar reveals pre-Hispanic low-density urbanism in the Bolivian Amazon", *Nature* 606, https://doi.org/10.1038/s41586-022-04780-4 (só o texto da legenda; nenhum dado copiado)
- Tour, legenda sobre a colonização: Koch, Brierley, Maslin e Lewis 2019, "Earth system impacts of the European arrival and Great Dying in the Americas after 1492", *Quaternary Science Reviews* 207, https://doi.org/10.1016/j.quascirev.2018.12.004 (cerca de 90% da população indígena morreu no século seguinte a 1492; intervalo de 87% a 92%)
- LiDAR aerotransportado em 4.497 km² (AM/AC): 432 estruturas, 396 inéditas; fase Aquiry entre 600 a.C. e 850 d.C.; estimativa de 24–30 mil estruturas em ~183 mil km² e até 3 milhões de pessoas entre 100 e 300 d.C.
- Suplementos baixados:
  - `MOESM1_ESM.docx`: Supplementary Information. **A Tabela 2 lista as estruturas com coordenadas** (3 casas decimais, ~100 m); as de terras indígenas foram omitidas. A Tabela 1 traz as datações por radiocarbono.
  - `MOESM2_ESM.pdf`: Reporting Summary (fontes dos dados de fundo, como o MERIT Hydro para rios).
  - `MOESM3_ESM.pdf`: Peer Review File.
- Os dados brutos do LiDAR são restritos pela lei brasileira, segundo o próprio artigo.
- **Figuras de LiDAR (CC BY 4.0):** Fig. 2 (painéis d–f) e Extended Data Fig. 4a, baixadas de media.springernature.com para `data/raw/nature2026/figuras/`, recortadas por `script/figuras_nature.py` em `docs/data/figuras/` e ligadas aos pontos Lid24_L05_43a, Lid24_L05_44a, Lid24_L09_1b e Lid24_L01_203a, com crédito no balão. Os painéis a–c (Piloto, D. Schaan, Fazenda Atlântica) ficaram de fora: esses sítios não estão na Tabela 2.
- Extraída para `data/processed/nature2026_lidar.csv` por `script/extract_nature2026.py`: **406 estruturas** (284 Aquiry, 13 parciais). Os códigos da coluna "Name in our data" são os do Jacobs (`acre40`, `amag4`…). **337 delas não estão no KML do Jacobs** (nem pelo nome nem a menos de ~300 m de um ponto dele).

### 3. Science 2023 — Peripato et al., "More than 10,000 pre-Columbian earthworks are still hidden throughout Amazonia"
- DOI: https://doi.org/10.1126/science.ade2541
- Dados: Zenodo https://zenodo.org/records/10214943 (licença "other-open"); GitHub https://github.com/Vperipato/ade2541
- `ade2541-v1.0.0.zip` → `Database/Earthworks.rds`: **961 estruturas** (lon/lat + base de origem: Amazon Arch 360, PAST 164, CNSA 98, INRAP & DAC 32, TREES/INPE 24, múltiplas 283). Cobre a Amazônia inteira, não só os geoglifos.
- `IPPModel_EarthworkProb-log10.tif`: mapa de probabilidade de haver estruturas ocultas (1 km). Pode virar uma camada de "onde ainda pode haver geoglifos". Não baixamos a versão linear (36 MB), que é redundante.

### 4. Fotos — app "Ancient Amazonian Earthworks" (R. Walker, Univ. of Missouri)
- App: https://robert-walker.shinyapps.io/ggshiny/ (Leaflet; ao passar o mouse nos pontos vermelhos aparece a foto)
- `script/extrai_walker_marcadores.py` lê os 1.295 marcadores com foto direto do Leaflet da página; `script/sync_walker.py` baixa as imagens de `image-pnt-0.0.1/` e `image-reactives-0.0.1/` (os nomes são os códigos do Jacobs: `valsq.jpg`, `mgrz13.jpg`). Não precisa do ID do worker (`_w_…`).
- **664 fotos encontradas.** Os outros 631 marcadores apontam para arquivos sem pasta (`mgrc9.jpg`) que não existem nem no próprio app; testamos extensões, pastas e uma força bruta com todos os 1.796 códigos do Jacobs, sem nenhuma foto a mais.
- **Direitos:** são figuras de artigos (Saunaluoma et al. 2019, Iriarte et al. 2020…) e fotos de pesquisadores. Decisão de 2026-11-03: publicar reduzidas (1000 px, miniaturas de 240 px) com crédito ao app em cada foto. Atender de pronto qualquer pedido de remoção.

### 5. LiDAR aberto — transectos do projeto EBA (INPE, "Estimativa de Biomassa na Amazônia")
- Índice dos transectos: Zenodo https://zenodo.org/records/4968706 (**CC BY 4.0**), 901 faixas de ~12,5 km × 300 m, 2016–2018.
- Nuvens de pontos (L1A, .laz) por estado: Acre e Rondônia https://zenodo.org/records/7689909; Amazonas, Pará e Mato Grosso https://zenodo.org/records/7636454; Roraima e Amapá https://zenodo.org/records/7689693; Maranhão e Tocantins https://zenodo.org/records/7689210 (todos CC BY 4.0).
- `script/zipremoto.py` lê o índice dos zips (90+ GB) por range requests e baixa só os transectos pedidos: os 24 a menos de 20 km de algum geoglifo do sudoeste e os 5 com pontos da Science 2023 dentro (29 faixas, ~6 GB, processadas no beelink).
- A classe "chão" desses arquivos inclui copa de árvore (alturas iguais às da vegetação), então `script/lidar_eba.py` faz um filtro próprio: ponto mais baixo por célula de 2 m, abertura morfológica de 20 m e pontos até 0,5 m acima dela. Daí sai o modelo de terreno de 2 m, o relevo sombreado de várias direções e o realce do relevo local, cortados em `docs/data/lidar/{z}/{x}/{y}.webp` (z10–16, ~24 MB) e `docs/data/lidar_faixas.geojson`.
- Validação: no ponto Science 2023 nº 745 (Acre, transecto T-0414) aparece um geoglifo circular sob a floresta.

## Avaliadas, não sincronizadas

| Fonte | Por quê |
|---|---|
| Mendeley Data — Jacobs, "Amazon Geoglyphs" (https://data.mendeley.com/datasets/5ynjwk7gc7/1) | snapshot de 2016 (440 geoglifos); obsoleto em relação ao KML atual |
| IPHAN — SICG / CNSA (cadastro oficial de sítios) | sem API/mapa público; um acordo do MPF prevê georreferenciar 400 sítios do Acre (https://www.mpf.mp.br/o-mpf/unidades/pr-ac/noticias/mpf-firma-acordos-para-compensar-danos-a-geoglifos-amazonicos-no-acre). Vale pedir os dados via LAI |
| Kalliola et al., Acta Amazonica 2024 (https://scielo.br/j/aa/a/6mwCFLMkt6SQCmSpnBMRqgR) | geografia das estruturas em 27.569 km²; conferir se o material suplementar tem coordenadas |
| Factum Foundation — The Aquiry earthworks (https://factumfoundation.org/our-projects/research/the-aquiry-earthworks-in-southwest-amazonia/) | imagens/hillshades do LiDAR da Nature; possível fonte visual, sem dados vetoriais |

## Plataformas existentes

Não há nenhum mapa web público e mantido dos geoglifos amazônicos. O KML do Jacobs exige o Google Earth Pro, e o app do Walker é de nicho. A lacuna é real.

## Cuidados

- **Licença:** só a Nature (CC BY 4.0) e a Science/Zenodo são abertas. Os dados do Jacobs precisam da autorização dele para serem publicados.
- **Proteção dos sítios:** sítios arqueológicos são bens da União (Lei 3.924/1961) e já sofreram danos (vide os acordos do MPF). Ao publicar, considerar reduzir a precisão das coordenadas no zoom alto. A própria Nature já omite as estruturas em terras indígenas.
