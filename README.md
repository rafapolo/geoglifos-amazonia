# Geoglifos da Amazônia

Mapa aberto das estruturas de terra pré-colombianas (geoglifos) do sudoeste da Amazônia: valas e aterros geométricos construídos entre 600 a.C. e 850 d.C. no Acre, no sul do Amazonas, em Rondônia e na Bolívia.

**Mapa:** https://rafapolo.github.io/geoglifos-amazonia/ (tour de 2 minutos: botão Tour ou `?tour=1`)

Não existia um mapa web público e mantido desses sítios. A base mais completa, a de James Q. Jacobs, só abre no Google Earth Pro. Este projeto junta as fontes abertas num mapa navegável, em português.

## Camadas

| Camada | Itens | Fonte | Licença |
|---|---|---|---|
| Estruturas detectadas por LiDAR | 406 | Pärssinen et al. 2026, *Nature*, Tabela Suplementar 2 ([doi](https://doi.org/10.1038/s41586-026-10835-7)) | CC BY 4.0 |
| Base compilada de estruturas de terra | 961 | Peripato et al. 2023, *Science* ([doi](https://doi.org/10.1126/science.ade2541), [Zenodo](https://zenodo.org/records/10214943)) | aberta (Zenodo) |
| Probabilidade de estruturas ainda ocultas | raster 1 km | Peripato et al. 2023, modelo preditivo | aberta (Zenodo) |
| Fotos dos sítios | 664 | app [Ancient Amazonian Earthworks](https://robert-walker.shinyapps.io/ggshiny/) (R. Walker) | de terceiros; publicadas reduzidas e com crédito |
| Pontos, contornos e estradas de J. Q. Jacobs | 1.805 / 1.567 / 2.928 | [jqjacobs.net](https://www.jqjacobs.net/archaeology/geoglyph.html) | **todos os direitos reservados: só na cópia local** |

Das 406 estruturas da *Nature*, 337 não estavam na base do Jacobs. As estruturas em terras indígenas foram omitidas pelos próprios autores.

Detalhes de cada fonte, das fontes descartadas e dos cuidados: [`sources.md`](sources.md).

## Como reproduzir

Requisitos: `curl`, [`uv`](https://docs.astral.sh/uv/), R (`Rscript`) e GDAL (`gdalwarp`, `gdaldem`).

```sh
./script/sync.sh                                                          # baixa as fontes para data/raw/ (só o que mudou)
uv run --with polars --with 'markitdown[docx]' script/extract_nature2026.py  # tabela da Nature -> data/processed/
uv run --with polars script/convert.py                                    # GeoJSON e raster -> docs/data/
uv run --with playwright script/extrai_walker_marcadores.py                # marcadores do app do Walker
uv run --with pillow script/sync_walker.py                                 # fotos e miniaturas -> docs/data/
python3 -m http.server -d docs                                            # abre o mapa em http://localhost:8000
```

`data/raw/` (com `MANIFEST.tsv`: hash e data de cada arquivo) e `docs/data/local/` (camadas do Jacobs) ficam fora do git. Na cópia local, o mapa mostra também as camadas do Jacobs; na versão publicada, elas não existem.

## Estrutura

```
script/sync.sh               sincroniza as fontes brutas
script/extract_nature2026.py extrai a Tabela Suplementar 2 da Nature para CSV
script/convert.py            gera os GeoJSON e o PNG de probabilidade
data/processed/              CSVs derivados das fontes abertas
docs/                        site (GitHub Pages): index.html + data/
sources.md                   levantamento das fontes de dados
```

## Proteção dos sítios

Sítios arqueológicos são bens da União (Lei 3.924/1961), e vários geoglifos já foram danificados. As coordenadas publicadas aqui já tinham sido publicadas pelos autores das fontes. As da *Nature* têm precisão de cerca de 100 m.

## Próximos passos

- Pedir a James Q. Jacobs autorização para publicar a base dele (contornos, estradas e fotos de drone).
- Avisar Robert Walker (Univ. of Missouri) de que as fotos do app dele estão no mapa, com crédito, e pedir a autorização formal.
- Pedir ao IPHAN, via LAI, os sítios georreferenciados do Acre (SICG/CNSA).
