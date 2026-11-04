"""Desenhos dos geoglifos no espírito de "Amazon Geoglyphs" de J. Q. Jacobs (2021): fundo verde liso,
traçados em ocre na escala real, título, barra de escala e créditos. Usa todos os dados do mapa:
contornos e estradas de Jacobs (com autorização), Nature 2026, Science 2023, Kalliola et al. 2024
e as faixas do LiDAR aberto (EBA/INPE).

Pranchas (pt, en e es), em PNG 2560 × 1600, em docs/desenhos/ (com --svg, também em SVG, em data/desenhos-svg/):
  sudoeste   a região inteira: a nuvem de sítios por fonte e os traçados
  amazonas   ~26 km no grupo mais denso de contornos do Amazonas (como o Boa Vista do original)
  acre       ~26 km no grupo mais denso de contornos do Acre
  mojos      ~40 km em volta de Cotoca (Bolívia): calçadas e canais

Uso: uv run --with matplotlib --with pyproj script/desenho.py [--svg]
(as fontes Fraunces e Inter, OFL, ficam em data/raw/fontes/)
"""
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.collections import LineCollection
from pyproj import Transformer

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "docs/data"
OUT = ROOT / "docs/desenhos"
FONTES = ROOT / "data/raw/fontes"
SVG = "--svg" in sys.argv
for f in FONTES.glob("*.ttf"):
    font_manager.fontManager.addfont(str(f))
SERIFA, SANS = "Fraunces", "Inter"

VERDE, OCRE, OCRE_CLARO, TERRA, ROSA, AREIA = "#1f3d29", "#e9b44c", "#d9b46a", "#c8642a", "#e48fa8", "#d9cdb6"
utm = Transformer.from_crs("EPSG:4326", "EPSG:32719", always_xy=True)  # UTM 19S, em metros

TEXTOS = {
    "pt": {"titulo": "Geoglifos da Amazônia", "km": "km",
           "legenda": ["contornos e estradas (J. Q. Jacobs)", "LiDAR, Nature 2026", "base compilada, Science 2023",
                       "lista de 2024 (Kalliola et al.)", "faixas do LiDAR aberto (EBA/INPE)"],
           "credito": "Traçados: J. Q. Jacobs, jqjacobs.net (com autorização) · Pärssinen et al. 2026, Nature · Peripato et al. 2023, Science · "
                      "Kalliola et al. 2024, Acta Amazonica · EBA/INPE · desenho: xn--2dk.xyz/dataviz/geoglifos-amazonia"},
    "en": {"titulo": "Amazon Geoglyphs", "km": "km",
           "legenda": ["outlines and roads (J. Q. Jacobs)", "LiDAR, Nature 2026", "compiled database, Science 2023",
                       "2024 list (Kalliola et al.)", "open LiDAR strips (EBA/INPE)"],
           "credito": "Outlines: J. Q. Jacobs, jqjacobs.net (with permission) · Pärssinen et al. 2026, Nature · Peripato et al. 2023, Science · "
                      "Kalliola et al. 2024, Acta Amazonica · EBA/INPE · drawing: xn--2dk.xyz/dataviz/geoglifos-amazonia"},
    "es": {"titulo": "Geoglifos de la Amazonía", "km": "km",
           "legenda": ["contornos y caminos (J. Q. Jacobs)", "LiDAR, Nature 2026", "base compilada, Science 2023",
                       "lista de 2024 (Kalliola et al.)", "franjas del LiDAR abierto (EBA/INPE)"],
           "credito": "Trazados: J. Q. Jacobs, jqjacobs.net (con autorización) · Pärssinen et al. 2026, Nature · Peripato et al. 2023, Science · "
                      "Kalliola et al. 2024, Acta Amazonica · EBA/INPE · dibujo: xn--2dk.xyz/dataviz/geoglifos-amazonia"},
}
SUBTITULOS = {
    "sudoeste": {"pt": "Sudoeste da Amazônia: Acre, Amazonas, Rondônia e Bolívia", "en": "Southwestern Amazonia: Acre, Amazonas, Rondônia and Bolivia", "es": "Suroeste de la Amazonía: Acre, Amazonas, Rondônia y Bolivia"},
    "amazonas": {"pt": "Amazonas, Brasil", "en": "Amazonas, Brazil", "es": "Amazonas, Brasil"},
    "acre": {"pt": "Acre, Brasil", "en": "Acre, Brazil", "es": "Acre, Brasil"},
    "mojos": {"pt": "Llanos de Mojos, Beni, Bolívia: em volta de Cotoca", "en": "Llanos de Mojos, Beni, Bolivia: around Cotoca", "es": "Llanos de Mojos, Beni, Bolivia: alrededor de Cotoca"},
}


def carregar(nome):
    return json.loads((D / nome).read_text())["features"]


def em_metros(coords):
    xs, ys = utm.transform([c[0] for c in coords], [c[1] for c in coords])
    return list(zip(xs, ys))


def linhas_de(features):
    segs = []
    for f in features:
        g = f["geometry"]
        partes = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"] if g["type"] == "Polygon" else []
        for p in partes:
            if len(p) >= 2:
                segs.append(em_metros(p))
    return segs


def pontos_de(features):
    cs = [f["geometry"]["coordinates"] for f in features if f["geometry"]["type"] == "Point"]
    return em_metros(cs) if cs else []


def janela_mais_densa(segs, filtro, lado):
    """centro da janela de `lado` metros com mais contornos, entre os que passam no filtro (x, y)"""
    centros = [(sum(x for x, _ in s) / len(s), sum(y for _, y in s) / len(s)) for s in segs]
    centros = [c for c in centros if filtro(*c)]
    melhor = max(centros, key=lambda c: sum(1 for d in centros if abs(d[0] - c[0]) < lado / 2 and abs(d[1] - c[1]) < lado / 2))
    return melhor


def prancha(nome, centro, largura_m, lingua, dados, escala_km, mostra_pontos=True):
    W, H, DPI = 2560, 1600, 200
    fig = plt.figure(figsize=(W / DPI, H / DPI), dpi=DPI, facecolor=VERDE)
    ax = fig.add_axes([0, 0, 1, 1], facecolor=VERDE)
    altura_m = largura_m * H / W
    cx, cy = centro
    ax.set_xlim(cx - largura_m / 2, cx + largura_m / 2)
    ax.set_ylim(cy - altura_m / 2, cy + altura_m / 2)
    ax.set_aspect("equal")
    ax.axis("off")
    larga = largura_m > 200_000
    # faixas do LiDAR aberto, como manchas de areia bem apagadas
    for s in dados["faixas"]:
        xs, ys = zip(*s)
        ax.fill(xs, ys, color=AREIA, alpha=0.10 if larga else 0.07, lw=0)
    # traçados de Jacobs: contornos mais fortes que as estradas
    ax.add_collection(LineCollection(dados["linhas"], colors=OCRE_CLARO, linewidths=0.35 if larga else 0.9, alpha=0.75))
    ax.add_collection(LineCollection(dados["contornos"], colors=OCRE, linewidths=0.5 if larga else 1.4))
    if mostra_pontos:
        tam = 1.2 if larga else 9
        for pts, cor, z in ((dados["kalliola"], ROSA, 2), (dados["science"], OCRE, 3), (dados["nature"], TERRA, 4)):
            if pts:
                xs, ys = zip(*pts)
                ax.scatter(xs, ys, s=tam, c=cor, lw=0, alpha=0.85, zorder=z)
    tx = TEXTOS[lingua]
    # um véu verde atrás do título, da legenda e da escala, para os traçados não passarem por cima do texto
    veu = dict(color=VERDE, alpha=0.88, transform=fig.transFigure, zorder=5, lw=0)
    fig.patches.append(plt.Rectangle((0.60, 0.62 if mostra_pontos else 0.73), 0.39, 0.34 if mostra_pontos else 0.23, **veu))
    fig.patches.append(plt.Rectangle((0.76, 0.03), 0.23, 0.11, **veu))
    fig.patches.append(plt.Rectangle((0.0, 0.0), 0.80, 0.06, **veu))
    # título e subtítulo no canto, como no original
    fig.text(0.965, 0.92, tx["titulo"], ha="right", va="top", color=OCRE, fontsize=26, family=SERIFA, weight=900, zorder=6)
    fig.text(0.965, 0.865, SUBTITULOS[nome][lingua], ha="right", va="top", color=OCRE, fontsize=13, family=SANS, zorder=6)
    # legenda
    itens = [(OCRE, "linha", tx["legenda"][0]), (TERRA, "ponto", tx["legenda"][1]), (OCRE, "ponto", tx["legenda"][2]),
             (ROSA, "ponto", tx["legenda"][3]), (AREIA, "faixa", tx["legenda"][4])]
    for i, (cor, tipo, rotulo) in enumerate(itens if mostra_pontos else itens[:1] + itens[4:]):
        y = 0.80 - i * 0.033
        if tipo == "linha":
            fig.lines.append(plt.Line2D([0.885, 0.905], [y, y], color=cor, lw=1.6, transform=fig.transFigure, zorder=6))
        elif tipo == "ponto":
            fig.patches.append(plt.Circle((0.895, y), 0.004, color=cor, transform=fig.transFigure, zorder=6))
        else:
            fig.patches.append(plt.Rectangle((0.885, y - 0.006), 0.02, 0.012, color=cor, alpha=0.35, transform=fig.transFigure, zorder=6))
        fig.text(0.875, y, rotulo, ha="right", va="center", color=OCRE_CLARO, fontsize=8.5, family=SANS, zorder=6)
    # barra de escala, embaixo à direita
    x1 = cx + largura_m / 2 - largura_m * 0.035
    x0 = x1 - escala_km * 1000
    y0 = cy - altura_m / 2 + altura_m * 0.07
    fx = lambda x: (x - (cx - largura_m / 2)) / largura_m
    fig.lines.append(plt.Line2D([fx(x0), fx(x1)], [0.07, 0.07], color=OCRE, lw=1.4, transform=fig.transFigure, zorder=6))
    fig.text(fx(x1), 0.082, f"{escala_km} {tx['km']}", ha="right", va="bottom", color=OCRE, fontsize=10, family=SANS, zorder=6)
    # créditos no rodapé
    fig.text(0.035, 0.035, tx["credito"], ha="left", va="bottom", color=OCRE_CLARO, fontsize=6.5, family=SANS, alpha=0.9, zorder=6)
    OUT.mkdir(parents=True, exist_ok=True)
    base = OUT / f"{nome}_{lingua}"
    fig.savefig(base.with_suffix(".png"), dpi=DPI, facecolor=VERDE)
    if SVG:  # vetor para impressão: ~1,5 MB cada, fica fora do site (data/desenhos-svg/)
        (ROOT / "data/desenhos-svg").mkdir(parents=True, exist_ok=True)
        fig.savefig(ROOT / "data/desenhos-svg" / f"{nome}_{lingua}.svg", facecolor=VERDE)
    plt.close(fig)
    return base


def main():
    jac_c = carregar("jacobs/jacobs_contornos.geojson")
    jac_l = carregar("jacobs/jacobs_linhas.geojson")
    dados = {
        "contornos": linhas_de(jac_c),
        "linhas": linhas_de(jac_l),
        "faixas": linhas_de(carregar("lidar_faixas.geojson")),
        "nature": pontos_de(carregar("nature2026.geojson")),
        "science": pontos_de(carregar("science2023.geojson")),
        "kalliola": pontos_de(carregar("kalliola2024.geojson")),
    }
    # lat ~ -9.4 em UTM 19S: y ≈ 8.96e6; Amazonas fica ao norte de ~ -9.6 (y > 8.94e6), Acre ao sul
    y_lat = lambda lat: utm.transform(-67.0, lat)[1]
    amazonas = janela_mais_densa(dados["contornos"], lambda x, y: y > y_lat(-9.55) and x > utm.transform(-68.5, -9)[0], 26_000)
    acre = janela_mais_densa(dados["contornos"], lambda x, y: y_lat(-11.2) < y < y_lat(-9.7) and x < utm.transform(-66.9, -10)[0], 26_000)
    cotoca = utm.transform(-64.58676, -14.99074)
    sudoeste = utm.transform(-66.4, -10.6)
    feitas = []
    for lingua in ("pt", "en", "es"):
        feitas.append(prancha("sudoeste", sudoeste, 900_000, lingua, dados, 100))
        feitas.append(prancha("amazonas", amazonas, 26_000, lingua, dados, 5))
        feitas.append(prancha("acre", acre, 26_000, lingua, dados, 5))
        feitas.append(prancha("mojos", cotoca, 40_000, lingua, dados, 5, mostra_pontos=False))
    for b in feitas:
        print(b.relative_to(ROOT))


if __name__ == "__main__":
    main()
