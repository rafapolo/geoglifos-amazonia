"""Converte as fontes brutas (data/raw/) em GeoJSON para o mapa.

Saídas públicas (licença aberta) em docs/data/:
  nature2026.geojson   Pärssinen et al. 2026, Nature, CC BY 4.0 (estruturas por LiDAR)
  science2023.geojson  Peripato et al. 2023, Science, Zenodo (base compilada de 961 estruturas)
  probabilidade.png    modelo de probabilidade de estruturas ocultas (Science 2023), em EPSG:3857
Saídas de James Q. Jacobs (©, publicadas com autorização dele, informada em 2026-11-04) em docs/data/jacobs/:
  jacobs_pontos.geojson, jacobs_contornos.geojson, jacobs_linhas.geojson
  (amazon_geoglyphs.kml + bolivia.kml, sem as áreas de busca, a topografia e as interpretações)

Uso: uv run --with polars script/convert.py   (precisa de Rscript e GDAL no PATH)
"""

import html
import json
import re
import unicodedata
import subprocess
import tempfile
from pathlib import Path
from xml.etree import ElementTree as ET

import polars as pl

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data/raw"
PROC = ROOT / "data/processed"
OUT = ROOT / "docs/data"
JACOBS = OUT / "jacobs"
NS = {"k": "http://www.opengis.net/kml/2.2"}

FORMAS = {
    "Circle": "círculo", "Oval": "oval", "Ellipse": "elipse", "Square": "quadrado",
    "Quadrangle": "quadrângulo", "Rectangle": "retângulo", "Parallelogram": "paralelogramo",
    "Octagon": "octógono", "Hexagon": "hexágono", "Pentagon": "pentágono",
    "Enclosure": "recinto", "Zanja": "zanja", "Mound": "aldeia de montículos",
    "Village": "aldeia de montículos", "Spiral": "espiral", "Ring": "anel",
    "Geoglyph": "geoglifo",
}


def write_geojson(path: Path, features: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features},
                   ensure_ascii=False, separators=(",", ":"))
    )
    print(f"{len(features):>5} feições -> {path.relative_to(ROOT)}")


def point(lon: float, lat: float, props: dict) -> dict:
    return {"type": "Feature", "properties": props,
            "geometry": {"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]}}


def nature() -> None:
    df = pl.read_csv(PROC / "nature2026_lidar.csv")
    feats = [
        point(r["lon"], r["lat"], {
            "id": r["n"], "nome": r["nome"], "aquiry": r["aquiry"], "area_ha": r["area_ha"],
            "precisao": "boa" if r["precisao"] == "g" else "razoável",
            "parcial": r["parcial"], "fonte": "nature2026",
        })
        for r in df.iter_rows(named=True)
    ]
    write_geojson(OUT / "nature2026.geojson", feats)


def science() -> None:
    rds = next((RAW / "science2023/ade2541").glob("*/Database/Earthworks.rds"))
    csv = PROC / "science2023_earthworks.csv"
    subprocess.run(
        ["Rscript", "-e", f"write.csv(readRDS('{rds}'), '{csv}', row.names=FALSE)"],
        check=True,
    )
    df = pl.read_csv(csv)
    feats = [
        point(r["Longitude"], r["Latitude"], {
            "id": i,
            "base": r["Database"].removeprefix("Multiple: ").strip("()"),
            "fonte": "science2023",
        })
        for i, r in enumerate(df.iter_rows(named=True))
    ]
    write_geojson(OUT / "science2023.geojson", feats)


def probabilidade() -> None:
    """Raster log10(prob) -> PNG colorido em Web Mercator, com transparência."""
    tif = RAW / "science2023/IPPModel_EarthworkProb-log10.tif"
    # só as faixas mais altas aparecem; abaixo de log10(p) = -2.2 fica transparente
    ramp = (
        "nv 0 0 0 0\n-8.3 0 0 0 0\n-2.2 0 0 0 0\n-1.8 255 237 160 70\n"
        "-1.2 254 178 76 140\n-0.6 240 59 32 190\n0 189 0 38 220\n"
    )
    with tempfile.TemporaryDirectory() as tmp:
        warped, colors = Path(tmp) / "w.tif", Path(tmp) / "ramp.txt"
        colors.write_text(ramp)
        subprocess.run(["gdalwarp", "-q", "-overwrite", "-t_srs", "EPSG:3857", "-tr", "2000", "2000",
                        "-r", "bilinear", "-te_srs", "EPSG:4326", "-te", "-79.44", "-18.0", "-44.4", "8.66",
                        str(tif), str(warped)], check=True)
        png = OUT / "probabilidade.png"
        subprocess.run(["gdaldem", "color-relief", "-q", "-alpha", "-of", "PNG",
                        str(warped), str(colors), str(png)], check=True)
    (OUT / "probabilidade.json").write_text(json.dumps(
        {"coordinates": [[-79.44, 8.66], [-44.4, 8.66], [-44.4, -18.0], [-79.44, -18.0]]}))
    for aux in OUT.glob("probabilidade.png.aux.xml"):
        aux.unlink()
    print(f"      raster -> {png.relative_to(ROOT)} ({png.stat().st_size // 1024} KB)")


def clean(texto: str) -> str:
    """Tira as tags, decodifica entidades (&amp;, &nbsp;) e normaliza o Unicode."""
    t = html.unescape(re.sub(r"<[^>]+>", " ", texto or "")).replace("\u00a0", " ")
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", t)).strip()


def coords(text: str) -> list[list[float]]:
    out = []
    for tok in text.split():
        parts = tok.replace("--", "-").split(",")
        try:
            out.append([round(float(parts[0]), 6), round(float(parts[1]), 6)])
        except (ValueError, IndexError):
            continue
    return out


def jacobs() -> None:
    root = ET.parse(RAW / "jacobs/amazon_geoglyphs.kml").getroot()
    doc = root.find("k:Document", NS)
    top = doc.find("k:Folder", NS)
    if top is not None and top.findtext("k:name", namespaces=NS) == "amazon_geoglyphs":
        doc = top
    pontos, contornos, linhas = [], [], []
    for folder in doc.findall("k:Folder", NS):
        grupo = folder.findtext("k:name", namespaces=NS)
        # as áreas de busca de cada viagem (retângulos de 20 a 150 km) não são estruturas
        if grupo == "surveys":
            continue
        for sub in [folder, *folder.findall(".//k:Folder", NS)]:
            subgrupo = sub.findtext("k:name", namespaces=NS)
            for pm in sub.findall("k:Placemark", NS):
                nome = (pm.findtext("k:name", default="", namespaces=NS) or "").strip()
                desc = clean(pm.findtext("k:description", default="", namespaces=NS))
                props = {"codigo": nome, "grupo": grupo, "subgrupo": subgrupo, "fonte": "jacobs"}
                pt = pm.find("k:Point/k:coordinates", NS)
                if pt is not None:
                    c = coords(pt.text)
                    if not c:
                        continue
                    m = re.match(r"(.*?)\s+-?-?\d+\.\d+\s+-?-?\d+\.\d+", desc)
                    titulo = m.group(1) if m else desc[:80]
                    palavras = re.findall(r"[A-Z][a-z]+", titulo)
                    forma = next((FORMAS[p] for p in FORMAS if p in palavras), "outro")
                    tam = re.search(r"(\d+(?:\.\d+)?)\s*(?:x\s*(\d+(?:\.\d+)?)\s*)?m\b", titulo)
                    props |= {"nome": titulo, "forma": forma,
                              "tamanho_m": float(tam.group(1)) if tam else None,
                              "duvidoso": "?" in (subgrupo or "")}
                    pontos.append(point(*c[0], props))
                    continue
                for ring in pm.iterfind(".//k:Polygon/k:outerBoundaryIs/k:LinearRing/k:coordinates", NS):
                    c = coords(ring.text)
                    if len(c) >= 4:
                        contornos.append({"type": "Feature", "properties": props,
                                          "geometry": {"type": "Polygon", "coordinates": [c]}})
                for ls in pm.iterfind(".//k:LineString/k:coordinates", NS):
                    c = coords(ls.text)
                    if len(c) >= 2:
                        alvo = contornos if c[0] == c[-1] and len(c) >= 4 else linhas
                        geom = ({"type": "Polygon", "coordinates": [c]} if alvo is contornos
                                else {"type": "LineString", "coordinates": c})
                        alvo.append({"type": "Feature", "properties": props, "geometry": geom})
    p2, c2, l2 = jacobs_bolivia()
    write_geojson(JACOBS / "jacobs_pontos.geojson", pontos + p2)
    write_geojson(JACOBS / "jacobs_contornos.geojson", contornos + c2)
    write_geojson(JACOBS / "jacobs_linhas.geojson", linhas + l2)


# bolivia.kml: pastas que não são estruturas (topografia, cotas, áreas de busca, leituras)
# ou que são interpretação (alinhamentos astronômicos) ficam de fora
BOLIVIA_FORA = {"topography", "topography map grids", "rivers", "elevations", "fields", "contours",
                "alignments", "long lines", "surveys", "references and readings", "videos"}
# pastas de recintos: as linhas delas são contornos, não estradas
BOLIVIA_RECINTOS = {"outlines", "zanjas", "geoglyphs and zanjas", "features", "sites"}
BOLIVIA_FORMAS = {"circle": "círculo", "rectangle": "retângulo", "oval": "oval", "enclosure": "recinto",
                  "zanja": "zanja", "geoglyph": "geoglifo", "mound": "loma", "loma": "loma",
                  "weir": "barragem de pesca", "arc": "arco"}


def jacobs_bolivia() -> tuple[list, list, list]:
    """Llanos de Mojos (Bolívia): calçadas e canais, contornos, zanjas, lomas e sítios."""
    root = ET.parse(RAW / "jacobs/bolivia.kml").getroot()
    pontos, contornos, linhas = [], [], []

    def andar(pasta, caminho):
        nomes = [n.lower() for n in caminho]
        if any(n in BOLIVIA_FORA for n in nomes):
            return
        regiao = caminho[1] if len(caminho) > 1 else "bolivia"
        tipo = caminho[-1]
        recinto = any(n in BOLIVIA_RECINTOS for n in nomes)
        for pm in pasta.findall("k:Placemark", NS):
            nome = (pm.findtext("k:name", default="", namespaces=NS) or "").strip()
            props = {"codigo": nome, "grupo": "bolivia", "subgrupo": regiao, "tipo": tipo, "fonte": "jacobs"}
            pt = pm.find(".//k:Point/k:coordinates", NS)
            if pt is not None:
                c = coords(pt.text)
                if not c or not nome:
                    continue
                chave = next((k for k in BOLIVIA_FORMAS if k in (nome + " " + tipo).lower()), None)
                tam = re.search(r"(\d+(?:\.\d+)?)\s*m\b", nome)
                props |= {"nome": nome, "forma": BOLIVIA_FORMAS.get(chave, "sítio"),
                          "tamanho_m": float(tam.group(1)) if tam else None, "duvidoso": "?" in nome}
                pontos.append(point(*c[0], props))
                continue
            for ls in pm.iterfind(".//k:LineString/k:coordinates", NS):
                c = coords(ls.text)
                if len(c) < 2:
                    continue
                if recinto:
                    fechado = c[0] == c[-1] and len(c) >= 4
                    geom = {"type": "Polygon", "coordinates": [c]} if fechado else {"type": "LineString", "coordinates": c}
                    contornos.append({"type": "Feature", "properties": props, "geometry": geom})
                else:
                    linhas.append({"type": "Feature", "properties": props, "geometry": {"type": "LineString", "coordinates": c}})
        for sub in pasta.findall("k:Folder", NS):
            andar(sub, [*caminho, sub.findtext("k:name", default="", namespaces=NS)])

    doc = root.find("k:Document", NS)
    for pasta in doc.findall("k:Folder", NS):
        andar(pasta, [pasta.findtext("k:name", default="", namespaces=NS)])
    print(f"bolívia: {len(pontos)} pontos, {len(contornos)} contornos, {len(linhas)} linhas")
    return pontos, contornos, linhas


if __name__ == "__main__":
    nature()
    science()
    probabilidade()
    jacobs()
