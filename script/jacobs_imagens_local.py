"""Imagens da Amazônia do site de J. Q. Jacobs, SÓ PARA A CÓPIA LOCAL: a autorização dele cobre os
traçados (pontos, contornos e estradas), não as imagens. Baixa, reduz a 1600 px e posiciona cada
uma pelo código do sítio (fotos de drone) ou no centro dos sítios do Jacobs com o mesmo nome de lugar.

Saída: docs/data/local/jacobs_imagens/*.jpg e docs/data/local/jacobs_imagens.geojson (fora do git).
Uso: uv run --with pillow script/jacobs_imagens_local.py
"""
import io, json, time, unicodedata, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs/data/local"
PONTOS = json.loads((ROOT / "docs/data/jacobs/jacobs_pontos.geojson").read_text())["features"]
UA = {"User-Agent": "geoglifos-amazonia/0.1 (cópia local)"}
B = "https://www.jqjacobs.net"
# imagem, legenda (do alt ou do contexto na página), como posicionar: ("codigo", x) ou ("lugar", x) ou ("grupo", x)
IMAGENS = [
    ("/amazon/images/vista_alegre.jpg", "Vista Alegre: três geoglifos destruídos", ("lugar", "vista alegre")),
    ("/amazon/images/abuno.jpg", "Abunã: oval", ("lugar", "abuna")),
    ("/amazon/images/bella_flor.jpg", "Bella Flor", ("lugar", "bella flor")),
    ("/amazon/images/cruzeirinho_geoglyphs.jpg", "Cruzeirinho", ("lugar", "cruzeirinho")),
    ("/amazon/images/boca_acre_geoglyph.jpg", "Boca do Acre", ("lugar", "boca do acre")),
    ("/amazon/images/placido_castro_geoglyph.jpg", "Plácido de Castro", ("lugar", "placido")),
    ("/amazon/images/acrelandia_geoglifos.jpg", "Geoglifos de Acrelândia", ("lugar", "acrelandia")),
    ("/amazon/images/rio_branco_enclosure.jpg", "Rio Branco: recinto, vista aérea", ("lugar", "rio branco")),
    ("/amazon/images/rio_branco_geoglifo.jpg", "Rio Branco: geoglifo circular", ("lugar", "rio branco")),
    ("/amazon/images/rio_branco_geoglifos.jpg", "Rio Branco: geoglifos", ("lugar", "rio branco")),
    ("/amazon/images/rio_branco_quadrangle.jpg", "Rio Branco: quadrângulo", ("lugar", "rio branco")),
    ("/amazon/images/acre_earthworks.jpg", "Acre: estruturas de terra, imagem aérea", ("lugar", "acre ")),
    ("/amazon/images/acre_geoglyphs_l.jpg", "Acre: geoglifos, imagem aérea", ("lugar", "acre ")),
    ("/amazon/images/acre_quadrangles.jpg", "Acre: recintos quadrados", ("lugar", "acre quadrangle")),
    ("/amazon/geoglyphs.jpg", "Geoglifos do Amazonas, com os contornos", ("lugar", "amazonas geoglyph")),
    ("/kml/drawings/amazon_geoglyphs.jpg", "Desenho: geoglifos de Boa Vista, Amazonas (2021)", ("lugar", "amazonas geoglyph")),
    ("/kml/drawings/boa_vista_amazonas.jpg", "Desenho: Boa Vista, Amazonas", ("lugar", "amazonas geoglyph")),
    ("/kml/images/amazon_octagons.jpg", "Os octógonos da Amazônia", ("lugar", "octagon")),
    ("/amazon/images/amazon_bolivia.jpg", "Arqueologia do espaço no Beni, Bolívia", ("grupo", "bolivia")),
    ("/amazon/images/llanos_de_mojos_2022_kml.jpg", "Llanos de Mojos: montes, calçadas, canais, barragens e campos elevados", ("grupo", "bolivia")),
    ("/kml/aerial/ronr2.jpg", "Foto de drone (R. S. Walker)", ("codigo", "ronr2")),
    ("/kml/aerial/acdc3.jpg", "Foto de drone (R. S. Walker)", ("codigo", "acdc3")),
    ("/kml/aerial/acrs6.jpg", "Foto de drone (R. S. Walker)", ("codigo", "acrs6")),
    ("/kml/aerial/rpars.jpg", "Foto de drone (R. S. Walker)", ("codigo", "rpars")),
]
norm = lambda s: unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()

def posicao(modo, chave):
    if modo == "codigo":
        f = [p for p in PONTOS if p["properties"]["codigo"].lower() == chave]
    elif modo == "grupo":
        f = [p for p in PONTOS if p["properties"].get("grupo") == chave]
    else:
        f = [p for p in PONTOS if norm(p["properties"].get("nome")).startswith(chave) or f" {chave}" in norm(p["properties"].get("nome"))]
    if not f:
        return None, 0
    xs = [p["geometry"]["coordinates"][0] for p in f]; ys = [p["geometry"]["coordinates"][1] for p in f]
    return [round(sum(xs) / len(xs), 5), round(sum(ys) / len(ys), 5)], len(f)

(OUT / "jacobs_imagens").mkdir(parents=True, exist_ok=True)
feats = []
for i, (caminho, legenda, (modo, chave)) in enumerate(IMAGENS):
    xy, n = posicao(modo, chave)
    if not xy:
        print("sem posição:", caminho); continue
    nome = Path(caminho).name
    destino = OUT / "jacobs_imagens" / nome
    if not destino.exists():
        with urllib.request.urlopen(urllib.request.Request(B + caminho, headers=UA), timeout=60) as r:
            im = Image.open(io.BytesIO(r.read())).convert("RGB")
        im.thumbnail((1600, 1600)); im.save(destino, quality=82); time.sleep(0.5)
    feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": xy},
                  "properties": {"id": i, "fonte": "jacobs_img", "foto": f"data/local/jacobs_imagens/{nome}", "legenda": legenda,
                                 "url": B + caminho, "posicao": "exata" if modo == "codigo" else f"aproximada: centro de {n} sítios"}})
# imagens no mesmo ponto (ex.: as 4 de Rio Branco) se abrem num pequeno círculo, para cada uma ser clicável
import math
from collections import defaultdict
juntas = defaultdict(list)
for f in feats: juntas[tuple(f["geometry"]["coordinates"])].append(f)
for grupo in juntas.values():
    if len(grupo) > 1:
        for k, f in enumerate(grupo):
            a = 2 * math.pi * k / len(grupo)
            x, y = f["geometry"]["coordinates"]
            f["geometry"]["coordinates"] = [round(x + 0.02 * math.cos(a), 5), round(y + 0.02 * math.sin(a), 5)]
(OUT / "jacobs_imagens.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False))
print(f"{len(feats)} imagens -> docs/data/local/jacobs_imagens.geojson")
for f in feats: print("  ", f["properties"]["foto"].split("/")[-1], f["properties"]["posicao"], f["geometry"]["coordinates"])
