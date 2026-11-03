"""Baixa as fotos do app "Ancient Amazonian Earthworks" (R. Walker, Univ. of Missouri).

As fotos têm direitos de terceiros (figuras de artigos, fotos de J. Q. Jacobs etc.). Por decisão do
projeto, são publicadas reduzidas e com crédito ao app de origem em cada foto; os originais ficam em
data/raw/walker/ (fora do git).

Pré-requisito: data/raw/walker/marcadores.json, extraído do Leaflet do app (coordenada + legenda).
Uso: uv run --with pillow script/sync_walker.py
"""

import html
import json
import re
import unicodedata
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data/raw/walker"
PUB = ROOT / "docs/data"
BASE = "https://robert-walker.shinyapps.io/ggshiny/"
PASTAS = ["image-pnt-0.0.1", "image-reactives-0.0.1"]
UA = {"User-Agent": "geoglifos-amazonia-sync/0.1"}


def baixa(caminho: str) -> bool:
    destino = RAW / "fotos" / caminho
    if destino.exists() and destino.stat().st_size > 0:
        return True
    try:
        with urllib.request.urlopen(urllib.request.Request(BASE + caminho, headers=UA), timeout=60) as r:
            if not r.headers.get("Content-Type", "").startswith("image/"):
                return False
            dados = r.read()
    except Exception:
        return False
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(dados)
    return True


def reduz(orig: Path, dest: Path, lado: int, q: int) -> None:
    """Só reduz (nunca amplia); se o JPEG ficar maior que o original já pequeno, copia o original."""
    from PIL import Image

    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(orig) as im:
        im = im.convert("RGB")
        im.thumbnail((lado, lado))
        im.save(dest, "JPEG", quality=q, optimize=True, progressive=True)
    if orig.suffix.lower() in (".jpg", ".jpeg") and dest.stat().st_size > orig.stat().st_size:
        dest.write_bytes(orig.read_bytes())


def main() -> None:
    camadas = json.loads((RAW / "marcadores.json").read_text())
    vistos, itens = set(), []
    for marcadores in camadas.values():
        for m in marcadores:
            src = re.search(r"src=['\"]([^'\"]+\.(?:jpe?g|png|gif))", m["html"], re.I)
            if not src:
                continue
            legenda = re.split(r"<ima?ge?\b", m["html"], flags=re.I)[0]
            legenda = unicodedata.normalize("NFC", html.unescape(re.sub(r"<[^>]+>", " ", legenda))).strip()
            arq = src.group(1)
            # caminho relativo ao app; os relativos soltos ("mgrc9.jpg") são tentados nas duas pastas
            rel = arq.split("/ggshiny/", 1)[-1]
            rel = re.sub(r"^_w_[0-9a-f]+/", "", rel)
            candidatos = [rel] if "/" in rel else [f"{p}/{rel}" for p in PASTAS]
            chave = (round(m["lat"], 5), round(m["lng"], 5), rel)
            if chave in vistos:
                continue
            vistos.add(chave)
            itens.append({"lat": m["lat"], "lon": m["lng"], "legenda": legenda, "candidatos": candidatos})

    todos = sorted({c for i in itens for c in i["candidatos"]})
    with ThreadPoolExecutor(4) as ex:
        ok = dict(zip(todos, ex.map(baixa, todos)))
    print(f"{len(itens)} marcadores com foto; {sum(ok.values())}/{len(todos)} arquivos baixados")

    # cópias para o mapa local: foto (máx. 1200 px) e miniatura (máx. 320 px), em JPEG
    feats, usados = [], set()
    for i in itens:
        achado = next((c for c in i["candidatos"] if ok.get(c)), None)
        if not achado:
            continue
        orig = RAW / "fotos" / achado
        nome = Path(achado).with_suffix(".jpg")
        for pasta, lado, q in (("fotos", 1000, 72), ("miniaturas", 240, 62)):
            dest = PUB / pasta / nome
            if not dest.exists():
                reduz(orig, dest, lado, q)
        ident, k = nome.stem, 2
        while ident in usados:
            ident, k = f"{nome.stem}-{k}", k + 1
        usados.add(ident)
        feats.append({"type": "Feature",
                      "geometry": {"type": "Point", "coordinates": [round(i["lon"], 6), round(i["lat"], 6)]},
                      "properties": {"id": ident, "legenda": i["legenda"], "foto": f"data/fotos/{nome}",
                                     "miniatura": f"data/miniaturas/{nome}", "fonte": "walker",
                                     "credito": "Ancient Amazonian Earthworks (R. Walker, Univ. of Missouri)"}})
    (PUB / "walker_fotos.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, separators=(",", ":")))
    sem = len(itens) - len(feats)
    print(f"{len(feats)} feições -> docs/data/walker_fotos.geojson ({sem} sem foto encontrada)")


if __name__ == "__main__":
    main()
