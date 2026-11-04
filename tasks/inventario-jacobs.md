# Inventário do site de J. Q. Jacobs

Feito em 2026-11-04 por `script/inventario_jacobs.py`.
- **O que foi lido:** a página https://www.jqjacobs.net/archaeology/geoglyph.html e as 6 páginas do mesmo site que ela liga, um nível abaixo: `/archaeo/`, `/kml/`, `/andes/` e `newark_arcs.html`.
- **O que saiu:** 181 arquivos ligados. Estão todos em `tasks/inventario-jacobs.json`, com status HTTP, tamanho e data.
- **Para que serve:** deixar claro o que já usamos e o que ainda pode servir às tarefas, como o desenho em `tasks/desenho-geoglifos.md`.

## Dados (KML, KMZ, XLS): o que já está no mapa

| arquivo | atualizado | no mapa? |
|---|---|---|
| `amazon/amazon_geoglyphs.kml` (3,9 MB) | 27/08/2026 | sim: pontos, contornos e estradas do Brasil (sem as áreas de busca) |
| `amazon/bolivia.kml` (2,7 MB) | 26/08/2026 | sim: calçadas, canais, contornos, lomas e sítios de Mojos (sem topografia, cotas e alinhamentos) |
| `kml/octagons.kml` | 24/08/2025 | sim: os 4 octógonos da Amazônia (sem as linhas de análise e os octógonos de Ohio) |
| `kml/acrelandia_2022_survey.kml` | 15/08/2024 | sim: contornos e estradas de Acrelândia 2022 (sem a área de busca) |
| `amazon/amazon_geoglyphs.xls` | 19/08/2026 | **ainda não**: tem mais atributos por sítio do que o KML (forma, medidas, às vezes data e referência). Serve para balões mais ricos e para o desenho |
| `amazon/brazil_geoglifos.kml` / `.xls` (2014) | 09/09/2024 | já coberto pela base atual |

## Dados que não acrescentam nada

Testado por distância: nenhum ponto destes fica a mais de 300 m de um ponto já no mapa.

- `amazon/geoglyphs.kml` (atualização de 2014): 54 pontos, todos já no mapa.
- `archaeo/sites/amazon_geoglifos.kmz` (2011): 49 pontos, todos já no mapa (alguns com códigos antigos, como `must3` e `plcrc`).
- `kml/tumichucua.kml`: um sítio no Beni, já no mapa. As outras 8 linhas são de análise geométrica.
- `kml/archaeogeodesy.kml` (10 MB) e `astro/xls/archaeogeodesy.xls`: base mundial de sítios para arqueogeodésia. Os 344 sítios dela que não temos, dentro do recorte, são andinos (Cusco, Machu Picchu, Titicaca), não estruturas de terra da Amazônia.
- Fora do tema: Ohio, Mississippi, Cahokia, Andes, França, Orkney, Cazaquistão, Atacama.
- Links quebrados (404): `amazon/geoglyphs_2015.04.kml` e `archaeo/portsmouth.kmz`.

## Imagens da Amazônia (44 arquivos)

A autorização de 2026-11-04 cobre só os traçados, não as imagens (confirmado com rafapolo). Por isso `script/jacobs_imagens_local.py` baixa 24 delas, reduzidas a 1.600 px, para `docs/data/local/` (fora do git e do site publicado) e as mostra na camada "Imagens de Jacobs (só local)". As fotos de drone ficam no sítio exato pelo código; as outras ficam no centro dos sítios do Jacobs com o mesmo nome de lugar, com a posição marcada como aproximada. Para publicar, pedir a ele a autorização das imagens.

- **Desenhos:**
  - `kml/drawings/amazon_geoglyphs.jpg`, `boa_vista_amazonas.jpg` e `amazon_geoglyphs_deskpicture.jpg` (referência do desenho em `tasks/desenho-geoglifos.md`);
  - `kml/images/amazon_octagons.jpg`;
  - `amazon/geoglyphs.jpg`.
- **Prancha dos traçados de Mojos:** `amazon/images/llanos_de_mojos_kml.jpg` e `llanos_de_mojos_2022_kml.jpg`.
- **Fotos aéreas e imagens de satélite com traçado,** por lugar:
  - Acre: `acre_earthworks`, `acre_geoglyphs`, `acre_quadrangles`;
  - Acrelândia: `acrelandia_geoglifos`;
  - Bella Flor: `bella_flor`;
  - Boca do Acre: `boca_acre_geoglyph`;
  - Cruzeirinho: `cruzeirinho_geoglyphs`;
  - Plácido de Castro: `placido_castro_geoglyph`;
  - Rio Branco: `rio_branco_enclosure`, `rio_branco_geoglifo`, `rio_branco_geoglifos`, `rio_branco_quadrangle`;
  - Vista Alegre: `vista_alegre`, com os geoglifos destruídos;
  - Abunã: `abuno`;
  - Bolívia: `amazon_bolivia`.
  - Quase todas têm uma versão `_t` em miniatura.
- **Fotos de drone de Walker:** `kml/aerial/acdc3.jpg`, `ronr2.jpg`, `acrs6.jpg` e `rpars.jpg`. Muitas já podem estar no app de Walker que usamos.

## Fontes externas ligadas na página

| fonte | o que tem | uso possível |
|---|---|---|
| Kalliola et al. 2024, Fairdata (CC BY 4.0) | lista de 1.279 estruturas | **já no mapa** (camada "Lista de 2024") |
| [Schaan 2010, IPHAN](http://portal.iphan.gov.br/uploads/ckfinder/arquivos/Geoglifos_paisagens_da_amazonia_ocidental.pdf) | livro com ~90 fotos aéreas dos geoglifos do Acre | fotos com direitos do IPHAN e dos fotógrafos: só link, ou pedir autorização |
| [Dissertação UFPA, "Análise espacial de sítios"](https://www.repositorio.ufpa.br/jspui/bitstream/2011/8855/1/Dissertacao_AnaliseEspacialSitios.pdf) | análise espacial dos sítios, talvez com tabela de coordenadas | **ler**: pode trazer atributos (datas, formas, dimensões) |
| [Ranzi et al. 2007, EOS](https://web.archive.org/web/20140722002910/http://www.geoglifos.com.br/2007EO210003_Ranzi_et_al_Geoglyphs.pdf) | primeiro artigo internacional sobre os geoglifos | texto e contexto para o "Sobre" |
| [Mann 2008, *Science*](https://web.archive.org/web/20140430034328/http://www.geoglifos.com.br/ScienceMann2008AncientEarthmoversoftheAmazon.pdf) | reportagem "Ancient Earthmovers of the Amazon" | contexto |
| Acervo geoglifos.com.br (Web Archive) | galeria de fotos de 2007 a 2016 | fotos de terceiros: só link |
| Álbum de Edison Caetano no Flickr | 26 fotos aéreas | ver a licença de cada foto no Flickr |

## Próximos passos

1. ~~Ler a planilha `amazon_geoglyphs.xls` e juntar os atributos aos pontos do Jacobs~~ (feito: 1.690 pontos com forma, dimensões, altitude e data da imagem).
2. ~~Ler a dissertação da UFPA~~ (feito: 362 recintos com valeta, integridade e uso; CC BY-NC-ND, então só na cópia local).
3. Perguntar a Jacobs se as imagens (desenhos e fotos aéreas) entram na autorização; hoje estão só na camada local.
4. Ver as licenças das fotos do Flickr de Edison Caetano.
