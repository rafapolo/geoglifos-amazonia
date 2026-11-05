"""Desmatamento do PRODES (INPE, CC BY-SA 4.0) na região dos geoglifos, em três imagens para o tour:
o que foi desmatado até 2007, de 2008 a 2015 e de 2016 em diante. Cada imagem tem só o seu período;
o tour as acende uma depois da outra, e o desmatamento se espalha.

Entrada: WFS do TerraBrasilis (camadas prodes-legal-amz:accumulated_deforestation_2007 e
         prodes-legal-amz:yearly_deforestation), guardado em data/raw/prodes/ para não baixar de novo
Saída:   docs/data/prodes/{ate2007,2008a2015,desde2016}.webp e docs/data/prodes.json (cantos das imagens)

Uso: uv run --with shapely --with pillow script/prodes.py
"""
import json
import math
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
BRUTO = RAIZ / "data/raw/prodes"
SAIDA = RAIZ / "docs/data/prodes"
WFS = "https://terrabrasilis.dpi.inpe.br/geoserver/prodes-legal-amz/ows"
# leste do Acre e sul do Amazonas, onde estão os geoglifos e as faixas de LiDAR da Nature
OESTE, SUL, LESTE, NORTE = -69.0, -11.2, -65.5, -8.5
METROS_PX = 70
COR = (226, 112, 64)
PERIODOS = {"ate2007": (0, 2007), "2008a2015": (2008, 2015), "desde2016": (2016, 9999)}


def baixar(camada):
    destino = BRUTO / f"{camada}.geojson"
    if destino.exists():
        return json.loads(destino.read_text())["features"]
    feats, inicio = [], 0
    while True:
        q = urllib.parse.urlencode({
            "service": "WFS", "version": "2.0.0", "request": "GetFeature",
            "typeNames": f"prodes-legal-amz:{camada}", "outputFormat": "application/json",
            "srsName": "EPSG:4326", "count": 10000, "startIndex": inicio, "sortBy": "fid",
            "propertyName": "year,geom",
            "bbox": f"{SUL},{OESTE},{NORTE},{LESTE},urn:ogc:def:crs:EPSG::4326",
        })
        with urllib.request.urlopen(f"{WFS}?{q}", timeout=300) as r:
            pagina = json.load(r)["features"]
        feats += pagina
        print(f"  {camada}: {len(feats)} polígonos")
        if len(pagina) < 10000:
            break
        inicio += 10000
    BRUTO.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps({"type": "FeatureCollection", "features": feats}))
    return feats


def merc(lon, lat):
    return lon * math.pi / 180, math.log(math.tan(math.pi / 4 + lat * math.pi / 360))


def main():
    feats = baixar("accumulated_deforestation_2007") + baixar("yearly_deforestation")
    x0, y0 = merc(OESTE, NORTE)
    x1, y1 = merc(LESTE, SUL)
    # metros por radiano de Mercator na latitude média da região
    m_rad = 6378137 * math.cos(math.radians((SUL + NORTE) / 2))
    larg = round((x1 - x0) * m_rad / METROS_PX)
    alt = round((y0 - y1) * m_rad / METROS_PX)
    px = lambda lon, lat: ((merc(lon, lat)[0] - x0) / (x1 - x0) * larg, (y0 - merc(lon, lat)[1]) / (y0 - y1) * alt)

    SAIDA.mkdir(parents=True, exist_ok=True)
    for nome, (a, b) in PERIODOS.items():
        mascara = Image.new("L", (larg, alt), 0)
        d = ImageDraw.Draw(mascara)
        n = 0
        for f in feats:
            ano = f["properties"].get("year") or 2007
            if not a <= int(ano) <= b or not f["geometry"]:
                continue
            g = f["geometry"]
            poligonos = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            for aneis in poligonos:
                d.polygon([px(*c[:2]) for c in aneis[0]], fill=255)
                for buraco in aneis[1:]:
                    d.polygon([px(*c[:2]) for c in buraco], fill=0)
            n += 1
        img = Image.new("RGBA", (larg, alt), COR + (0,))
        img.putalpha(mascara)
        img.save(SAIDA / f"{nome}.webp", lossless=True, quality=100, method=6)
        print(f"{nome}: {n} polígonos, {(SAIDA / f'{nome}.webp').stat().st_size // 1024} KB")

    cantos = [[OESTE, NORTE], [LESTE, NORTE], [LESTE, SUL], [OESTE, SUL]]
    (RAIZ / "docs/data/prodes.json").write_text(json.dumps({"coordinates": cantos, "periodos": list(PERIODOS)}))
    print(f"{larg}×{alt} px")


if __name__ == "__main__":
    main()
