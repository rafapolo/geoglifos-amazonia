"""Recorta os painéis de LiDAR (modelo de terreno com relevo sombreado) das figuras de
Pärssinen et al. 2026 (Nature, CC BY 4.0) e liga cada um ao ponto da Nature com o mesmo nome.

Entrada: data/raw/nature2026/figuras/ (Fig. 2 e Extended Data Fig. 4, baixadas da Nature)
Saída:   docs/data/figuras/*.jpg e docs/data/nature_figuras.json ({nome: {foto, legenda, credito}})
"""
import json
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
FIG = RAIZ / "data/raw/nature2026/figuras"
SAIDA = RAIZ / "docs/data/figuras"
CREDITO = "Pärssinen et al. 2026, Nature (CC BY 4.0)"

# (arquivo, recorte em px, ponto da Nature, legenda)
PAINEIS = [
    ("Fig2_HTML.png", (457, 688, 712, 1046), "Lid24_L05_43a", "LiDAR: Lid24_L05_43a (amag34), Fig. 2d"),
    ("Fig2_HTML.png", (734, 688, 1082, 1046), "Lid24_L05_44a", "LiDAR: Lid24_L05_44a, Fig. 2e"),
    ("Fig2_HTML.png", (1110, 688, 1522, 1046), "Lid24_L09_1b", "LiDAR: Lid24_L09_1b, Fig. 2f"),
    ("Fig7_ESM.jpg", (188, 7, 2673, 1447), "Lid24_L01_203a", "LiDAR: grupo Lid24_L01_203, Extended Data Fig. 4a"),
]

def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    nomes = {f["properties"]["nome"] for f in json.loads((RAIZ / "docs/data/nature2026.geojson").read_text())["features"]}
    mapa = {}
    for arq, caixa, nome, legenda in PAINEIS:
        if nome not in nomes:
            raise SystemExit(f"{nome} não está em nature2026.geojson")
        img = Image.open(FIG / arq).convert("RGB").crop(caixa)
        img.thumbnail((900, 900))
        dest = SAIDA / f"{nome}.jpg"
        img.save(dest, quality=82, optimize=True, progressive=True)
        mapa[nome] = {"foto": f"data/figuras/{dest.name}", "legenda": legenda, "credito": CREDITO}
        print(f"{dest.relative_to(RAIZ)}: {img.size[0]}x{img.size[1]}, {dest.stat().st_size >> 10} KB")
    (RAIZ / "docs/data/nature_figuras.json").write_text(json.dumps(mapa, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
