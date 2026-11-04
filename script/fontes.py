"""Fontes do site servidas por ele mesmo, enxutas: Fraunces (títulos) e Inter (texto), SIL Open Font License.
Parte das fontes variáveis do Google Fonts (data/raw/fontes/), limita os eixos aos pesos usados no site
e guarda só latim, latim estendido A e a pontuação usada. Saída: docs/fontes/*.woff2 (os @font-face, impressos no fim, ficam no <style> de docs/index.html).
Uso: uv run --with fonttools --with brotli script/fontes.py
"""
import io
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
RAW, OUT = ROOT / "data/raw/fontes", ROOT / "docs/fontes"
UNICODES = "U+0020-007E,U+00A0-00FF,U+0100-017F,U+2010-2027,U+2030-203A,U+20AC,U+2122,U+2190-2193,U+2212,U+00D7,U+25B8,U+2715,U+266A"
FONTES = [  # arquivo, família, eixos, pesos no CSS
    ("Fraunces.ttf", "Fraunces", {"wght": (500, 700), "opsz": 36, "SOFT": 0, "WONK": 0}, "500 700"),
    ("Inter.ttf", "Inter", {"wght": (400, 600), "opsz": 14}, "400 600"),
]
OUT.mkdir(exist_ok=True)
for f in OUT.glob("*"):
    f.unlink()
css = ["/* Fraunces e Inter (SIL Open Font License), enxutas por script/fontes.py */"]
for arq, fam, eixos, pesos in FONTES:
    fonte = TTFont(RAW / arq)
    eixos = {k: v for k, v in eixos.items() if k in {a.axisTag for a in fonte["fvar"].axes}}
    fonte = instancer.instantiateVariableFont(fonte, eixos)
    # grava e relê antes de recortar (o recorte falha sobre a fonte recém-instanciada na memória)
    import io
    buf = io.BytesIO(); fonte.save(buf); buf.seek(0); fonte = TTFont(buf)
    opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["kern", "liga", "calt", "tnum", "lnum"]
    sub = subset.Subsetter(opts); sub.populate(unicodes=subset.parse_unicodes(UNICODES)); sub.subset(fonte)
    destino = OUT / f"{fam.lower()}.woff2"
    fonte.flavor = "woff2"; fonte.save(destino)
    css.append(f"@font-face {{ font-family: '{fam}'; font-style: normal; font-weight: {pesos}; font-display: swap; src: url(fontes/{destino.name}) format('woff2'); }}")
    print(f"{destino.relative_to(ROOT)}: {destino.stat().st_size // 1024} KB")
print("\n".join(css))  # os @font-face ficam no <style> de docs/index.html
