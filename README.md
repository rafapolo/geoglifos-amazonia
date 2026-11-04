# Geoglifos da Amazônia

Mapa aberto das estruturas de terra pré-colombianas (geoglifos) do sudoeste da Amazônia: valas e aterros geométricos construídos entre 600 a.C. e 850 d.C. no Acre, no sul do Amazonas, em Rondônia e na Bolívia.

**Mapa:** https://xn--2dk.xyz/dataviz/geoglifos-amazonia/ (cópia em https://rafapolo.github.io/geoglifos-amazonia/)

- **Tour de 3 minutos** com música gerada no navegador (flauta, maracá, tambor e coro): botão Tour ou `?tour=1`; em inglês por `?tour=en`, em espanhol por `?tour=es`. Roteiro, legendas e som em [design/tour.md](design/tour.md).
- **Três línguas:** seletor PT/EN/ES no topo ou `?lang=en|es`.
- **Fundo verde, só os desenhos:** interruptor no painel (ou `?fundo=verde`) que troca o satélite por um mapa desenhado, com os traçados em ocre sobre a terra verde das Américas e o mar azul.
- **Desenhos** no espírito dos de J. Q. Jacobs, em [`docs/desenhos/`](docs/desenhos/): sudoeste da Amazônia, Amazonas, Acre e Llanos de Mojos, em pt, en e es.

Não existia um mapa web público e mantido desses sítios. A base mais completa, a de James Q. Jacobs, só abre no Google Earth Pro. Este projeto junta as fontes abertas e os traçados de Jacobs (com autorização dele) num mapa navegável, em três línguas.

## O trabalho de James Q. Jacobs

Há anos, [James Q. Jacobs](https://www.jqjacobs.net/archaeology/geoglyph.html) procura geoglifos em imagens de satélite e os desenha, um a um, no Google Earth: hoje são mais de 2.200 sítios no Acre, no Amazonas, em Rondônia, em Mato Grosso e nos Llanos de Mojos, na Bolívia, com os contornos de cada recinto e as estradas, calçadas e canais entre eles. Sem esse trabalho, este mapa seria só uma nuvem de pontos.

- Página: https://www.jqjacobs.net/archaeology/geoglyph.html
- Arquivos dele: [`amazon_geoglyphs.kml`](https://www.jqjacobs.net/amazon/amazon_geoglyphs.kml), [`amazon_geoglyphs.xls`](https://www.jqjacobs.net/amazon/amazon_geoglyphs.xls), [`bolivia.kml`](https://www.jqjacobs.net/amazon/bolivia.kml), [`octagons.kml`](https://www.jqjacobs.net/kml/octagons.kml)
- O desenho que inspirou o fundo verde e as pranchas: [`amazon_geoglyphs.jpg`](https://www.jqjacobs.net/kml/drawings/amazon_geoglyphs.jpg) (2021)
- Inventário de tudo o que o site dele liga, com o que já está no mapa: [`tasks/inventario-jacobs.md`](tasks/inventario-jacobs.md)

## Camadas

| Camada | Itens | Fonte | Licença |
|---|---|---|---|
| Estruturas detectadas por LiDAR | 406 | Pärssinen et al. 2026, *Nature*, Tabela Suplementar 2 ([doi](https://doi.org/10.1038/s41586-026-10835-7)) | CC BY 4.0 |
| Base compilada de estruturas de terra | 961 | Peripato et al. 2023, *Science* ([doi](https://doi.org/10.1126/science.ade2541), [Zenodo](https://zenodo.org/records/10214943)) | aberta (Zenodo) |
| Probabilidade de estruturas ainda ocultas | raster 1 km | Peripato et al. 2023, modelo preditivo | aberta (Zenodo) |
| Fotos dos sítios | 664 | app [Ancient Amazonian Earthworks](https://robert-walker.shinyapps.io/ggshiny/) (R. Walker) | de terceiros; publicadas reduzidas e com crédito |
| Lista de estruturas de 2024 | 1.279 | Kalliola, Pärssinen, Ranzi, Seppä e Damasceno Barbosa 2024, *Acta Amazonica* ([Fairdata](https://doi.org/10.23729/da98421d-d65d-4045-bc93-344a0837cc93)) | CC BY 4.0 |
| Pontos, contornos e estradas de J. Q. Jacobs (Brasil, octógonos, Acrelândia 2022 e Llanos de Mojos, Bolívia) | 2.204 / 1.201 / 8.375 | [jqjacobs.net](https://www.jqjacobs.net/archaeology/geoglyph.html), com os atributos da planilha dele (forma, dimensões, altitude, data da imagem) | todos os direitos reservados; **publicado com autorização do autor** (2026-11-04), sem as áreas de busca, a topografia e os alinhamentos |
| LiDAR aberto: relevo sob a floresta | 29 faixas | projeto EBA (INPE), [Zenodo](https://zenodo.org/records/4968706) | CC BY 4.0 |
| Terra das Américas (fundo verde) | 412 polígonos | [Natural Earth](https://www.naturalearthdata.com) 1:50 mi | domínio público |

Só na cópia local (fora do git e do site publicado, por licença):

| Camada | Itens | Fonte | Por quê |
|---|---|---|---|
| Recintos com valeta, integridade e uso | 362 | Barbosa 2014, dissertação, UFPA ([repositório](https://www.repositorio.ufpa.br/jspui/handle/2011/8855)) | CC BY-NC-ND: sem derivadas |
| Imagens de Jacobs (fotos aéreas e desenhos) | 24 | jqjacobs.net | a autorização cobre os traçados, não as imagens |

Das 406 estruturas da *Nature*, 337 não estavam na base do Jacobs. As estruturas em terras indígenas foram omitidas pelos próprios autores.

Detalhes de cada fonte, das fontes descartadas e dos cuidados: [`sources.md`](sources.md).

## Como reproduzir

Requisitos: `curl`, [`uv`](https://docs.astral.sh/uv/), R (`Rscript`) e GDAL (`gdalwarp`, `gdaldem`).

```sh
./script/sync.sh                                                          # baixa as fontes para data/raw/ (só o que mudou)
uv run --with polars --with 'markitdown[docx]' script/extract_nature2026.py  # tabela da Nature -> data/processed/
uv run --with polars --with fastexcel script/convert.py                   # GeoJSON e raster -> docs/data/ (inclui Jacobs e Kalliola)
uv run --with playwright script/extrai_walker_marcadores.py                # marcadores do app do Walker
uv run --with pillow script/sync_walker.py                                 # fotos e miniaturas -> docs/data/
uv run --with matplotlib --with pyproj script/desenho.py                  # pranchas desenhadas -> docs/desenhos/
uv run --with pyproj script/ufpa_barbosa2014.py                           # camada local da dissertação (só cópia local)
uv run --with pillow script/jacobs_imagens_local.py                       # camada local das imagens de Jacobs
python3 -m http.server -d docs                                            # abre o mapa em http://localhost:8000
bun install && bun run build                                              # versão de produção minificada -> dist/
script/publica_xyz.sh                                                     # build e cópia para xn--2dk.xyz/dataviz/geoglifos-amazonia
```

O PDF de Kalliola et al. 2024 não tem link direto: baixa-se pelo botão Download do [Fairdata](https://etsin.fairdata.fi/dataset/54f01053-3ea7-4679-a36b-f7146911c345) para `data/raw/kalliola2024/`.

`data/raw/` (com `MANIFEST.tsv`: hash e data de cada arquivo) e `docs/data/local/` ficam fora do git. As camadas do Jacobs saem convertidas em `docs/data/jacobs/` e são publicadas com autorização dele.

## Estrutura

```
script/sync.sh               sincroniza as fontes brutas
script/extract_nature2026.py extrai a Tabela Suplementar 2 da Nature para CSV
script/convert.py            gera os GeoJSON (Nature, Science, Jacobs, Kalliola) e o PNG de probabilidade
script/desenho.py            desenha as pranchas no espírito de Jacobs
script/lidar_eba.py          relevo do LiDAR aberto (EBA) em tiles
script/publica_xyz.sh        publica em xn--2dk.xyz
data/processed/              CSVs derivados das fontes abertas
docs/                        site: index.html, i18n.js, tour.js, som.js, navegacao.js, data/ e desenhos/ (o build gera dist/)
design/tour.md               roteiro do tour: cenas, legendas em três línguas e música
tasks/                       tarefas e inventários (desenho, site de Jacobs)
sources.md                   levantamento das fontes de dados
```

## Proteção dos sítios

Sítios arqueológicos são bens da União (Lei 3.924/1961), e vários geoglifos já foram danificados. As coordenadas publicadas aqui já tinham sido publicadas pelos autores das fontes. As da *Nature* têm precisão de cerca de 100 m.

## Próximos passos

- Pedir a James Q. Jacobs a autorização das imagens (desenhos e fotos aéreas); os traçados já estão autorizados e publicados.
- Pedir a Antonia Damasceno Barbosa a autorização para publicar os atributos da dissertação (valeta, integridade, uso do local).
- Avisar Robert Walker (Univ. of Missouri) de que as fotos do app dele estão no mapa, com crédito, e pedir a autorização formal.
- Pedir ao IPHAN, via LAI, os sítios georreferenciados do Acre (SICG/CNSA).
