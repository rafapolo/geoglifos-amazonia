"""Anexos da dissertação de Antonia Damasceno Barbosa (UFPA, 2014), "Análise espacial dos sítios
monumentais do leste da Amazônia Ocidental": recintos com coordenadas UTM 19L, município, forma,
tipo de valeta, integridade, uso do local e quem encontrou.

Licença CC BY-NC-ND 4.0 (sem derivadas): a camada fica SÓ na cópia local, em docs/data/local/
(fora do git e do site publicado).

Uso: uv run --with pyproj script/ufpa_barbosa2014.py
     (precisa de data/raw/ufpa/dissertacao_analise_espacial.md, gerado com markitdown do PDF)
"""
import json
import re
from pathlib import Path

from pyproj import Transformer

ROOT = Path(__file__).resolve().parent.parent
MD = ROOT / "data/raw/ufpa/dissertacao_analise_espacial.md"
OUT = ROOT / "docs/data/local/ufpa2014.geojson"
utm = Transformer.from_crs("EPSG:32719", "EPSG:4326", always_xy=True)  # UTM 19S (faixa 19L)

texto = MD.read_text()
linhas = [re.sub(r"\s+", " ", l.replace("|", " ")).strip() for l in texto.splitlines()]

DELIM = r"(Valeta simples|Valeta dupla|Valeta tripla|Muretas|[Mm]ont[íi]culos)"
FORMAS = r"(Quadril[áa]tero|Circular|Linear|Pol[íi]gono(?: de \d+ lados)?|Oval|Irregular|Semic[íi]rculo|El[íi]ptic[oa]|Hexagonal|Octogonal|Pentagonal|Retangular|Quadrada|Composta|Indefinida)"
coord = re.compile(r"^(?:(\d+) )?(.*?) ?(?:(\d+) )?" + DELIM + r" 19L (\d{6}) (\d{7}) (.+?) " + FORMAS + "$")
coord_solta = re.compile(r"(\d{6}) (\d{7})")

# tabela de coordenadas: começa no cabeçalho "N Nome_Sítio Quant. Estr. ..."
ini = next(i for i, l in enumerate(linhas) if l.startswith("N Nome_Sítio Quant"))
recintos, ultimo_nome, n_atual = [], None, None
for l in linhas[ini + 1:]:
    m = coord.match(l)
    if not m:
        continue
    n, nome, quant, delim, x, y, municipio, forma = m.groups()
    nome = nome.strip() or ultimo_nome
    if n:
        n_atual = int(n)
    lon, lat = utm.transform(int(x), int(y))
    if not (-75 < lon < -60 and -12 < lat < -7):
        continue
    recintos.append({"n": n_atual, "nome": nome, "delimitacao": delim.capitalize(), "municipio": municipio.strip(),
                     "forma": forma.strip(), "lon": round(lon, 6), "lat": round(lat, 6)})
    ultimo_nome = nome

# tabela de descrição (antes da de coordenadas): nº, nome, integridade, uso, quem encontrou
INTEG = r"(menos de 25%|Entre 25 e 75%|Mais de 75%|Destru[íi]do)"
USOS = r"(Pasto abandonado|Pecu[áa]ria|Pasto|Floresta|Capoeira|Moradia|Agricultura|Estrada|Fazenda|Ramal|Cidade|A[çc]ude|Ro[çc]ado|Plantio|\S+)"
desc = re.compile(r"^(\d+) (.+?) " + INTEG + r" " + USOS + r" ?(.*)$", re.I)
info = {}
for l in linhas[:ini]:
    m = desc.match(l)
    if m and int(m.group(1)) <= 400:
        n, nome, integ, uso, resto = m.groups()
        info.setdefault(int(n), {"integridade": integ, "uso": uso, "encontrado": resto[:120]})

feats = []
for i, r in enumerate(recintos):
    p = {"id": i, "fonte": "ufpa2014", "nome": r["nome"], "delimitacao": r["delimitacao"], "municipio": r["municipio"],
         "forma": r["forma"], **info.get(r["n"], {})}
    feats.append({"type": "Feature", "properties": p, "geometry": {"type": "Point", "coordinates": [r["lon"], r["lat"]]}})
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, separators=(",", ":")))
print(f"{len(feats)} recintos ({len({r['n'] for r in recintos})} sítios numerados), {sum(1 for f in feats if 'integridade' in f['properties'])} com integridade -> {OUT.relative_to(ROOT)}")
