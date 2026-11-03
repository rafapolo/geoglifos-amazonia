"""Camada de LiDAR aberto: transectos do projeto EBA (INPE, Zenodo, CC BY 4.0) que passam pela
região dos geoglifos, transformados em relevo sombreado e cortados em tiles para o mapa.

Roda numa máquina com espaço (o beelink): os .laz (~200 MB cada) vêm de script/zipremoto.py,
que baixa só os transectos pedidos de dentro dos zips do Zenodo.

  python lidar_eba.py dtm    laz/ dtm/      # .laz -> GeoTIFF RGBA (relevo sombreado, 2 m)
  python lidar_eba.py tiles  dtm/ tiles/    # GeoTIFFs -> tiles/{z}/{x}/{y}.webp (512 px, z10–16)
  python lidar_eba.py faixas dtm/ faixas.geojson   # contorno de cada faixa, para ver de longe

Dependências: laspy[lazrs] numpy scipy rasterio pillow
"""
import json, math, os, sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

RES = 2.0  # metros por pixel do modelo de terreno (o chão sob a floresta tem ~1 ponto/m²)


# ---------------------------------------------------------------- modelo de terreno e relevo
def relevo(dtm, valido):
    from scipy import ndimage
    # relevo sombreado de várias direções (evita que valas paralelas à luz sumam)
    gy, gx = np.gradient(dtm, RES)
    gx *= 2.5; gy *= 2.5  # exagero vertical: as estruturas têm 1–4 m
    declive = np.arctan(np.hypot(gx, gy))
    aspecto = np.arctan2(-gx, gy)
    alt = math.radians(40)
    sombra = np.zeros_like(dtm)
    for az, peso in ((315, 0.4), (270, 0.2), (225, 0.2), (360, 0.2)):
        a = math.radians(az)
        sombra += peso * (math.sin(alt) * np.cos(declive) + math.cos(alt) * np.sin(declive) * np.cos(a - aspecto))
    sombra = np.clip(sombra, 0, 1)
    # relevo local: terreno menos a sua versão suavizada (~20 m) realça valas e muretas
    suave = ndimage.gaussian_filter(dtm, 20 / RES)
    local = np.clip((dtm - suave) / 1.0, -1, 1)
    # cor: cinza quente do relevo, valas puxam para o teal e muretas para o ocre (paleta do site)
    base = 0.18 + 0.78 * sombra
    rgb = np.stack([base * 236, base * 226, base * 208], -1)
    neg, pos = np.clip(-local, 0, 1)[..., None], np.clip(local, 0, 1)[..., None]
    rgb = rgb * (1 - 0.55 * neg) + np.array([60, 140, 135]) * 0.55 * neg
    rgb = rgb * (1 - 0.45 * pos) + np.array([233, 180, 76]) * 0.45 * pos
    a = np.where(valido, 255, 0)[..., None]
    return np.concatenate([np.clip(rgb, 0, 255), a], -1).astype(np.uint8)


def dtm_de(laz, saida):
    import laspy, rasterio
    from rasterio.transform import from_origin
    from scipy import ndimage
    saida = Path(saida)
    if saida.exists():
        return f"já existe {saida.name}"
    xs, ys, zs = [], [], []
    with laspy.open(laz) as f:
        crs = f.header.parse_crs()
        for p in f.chunk_iterator(5_000_000):
            xs.append(np.asarray(p.x)); ys.append(np.asarray(p.y)); zs.append(np.asarray(p.z).astype(np.float32))
    x, y, z = np.concatenate(xs), np.concatenate(ys), np.concatenate(zs)
    del xs, ys, zs
    x0, y1 = math.floor(x.min()), math.ceil(y.max())
    w, h = int(math.ceil((x.max() - x0) / RES)) + 1, int(math.ceil((y1 - y.min()) / RES)) + 1
    k = ((y1 - y) / RES).astype(np.int64) * w + ((x - x0) / RES).astype(np.int64)
    del x, y
    # A classe "chão" dos arquivos do EBA inclui copa de árvore; o chão sai de um filtro próprio:
    # ponto mais baixo de cada célula -> abertura morfológica de 20 m (tira árvores, mantém valas)
    # -> só os pontos até 0,5 m acima dessa superfície
    mn = np.full(w * h, np.inf, np.float32); np.minimum.at(mn, k, z)
    tem = ~np.isinf(mn)
    mn = mn.reshape(h, w); tem = tem.reshape(h, w)
    ind = ndimage.distance_transform_edt(~tem, return_distances=False, return_indices=True)
    sup = ndimage.gaussian_filter(ndimage.grey_opening(mn[ind[0], ind[1]], size=(10, 10)), 2)
    del mn
    ok = z < sup.ravel()[k] + 0.5
    soma = np.bincount(k[ok], z[ok], minlength=w * h); n = np.bincount(k[ok], minlength=w * h)
    del k, z, ok, sup
    chao = n > 0
    dtm = np.where(chao, soma / np.maximum(n, 1), np.nan).astype(np.float32).reshape(h, w)
    chao = chao.reshape(h, w)
    valido = ndimage.binary_fill_holes(ndimage.binary_closing(tem, iterations=3))
    ind = ndimage.distance_transform_edt(~chao, return_distances=False, return_indices=True)
    dtm = dtm[ind[0], ind[1]]; del ind
    dtm = ndimage.gaussian_filter(dtm, 1.2)
    img = relevo(dtm, valido)
    perfil = dict(driver="GTiff", width=w, height=h, count=4, dtype="uint8", crs=crs,
                  transform=from_origin(x0, y1, RES, RES), compress="deflate", tiled=True, photometric="RGB")
    with rasterio.open(saida.with_suffix(".tmp.tif"), "w", **perfil) as d:
        d.write(np.moveaxis(img, -1, 0))
    os.rename(saida.with_suffix(".tmp.tif"), saida)
    return f"ok {saida.name} {w}x{h}, cobertura {valido.mean():.0%}"


# ---------------------------------------------------------------- tiles
R = 6378137.0
LADO = 2 * math.pi * R

def tile_bounds(z, x, y):
    t = LADO / 2 ** z
    return (-LADO / 2 + x * t, LADO / 2 - (y + 1) * t, -LADO / 2 + (x + 1) * t, LADO / 2 - y * t)

def tiles_de(b, z):
    t = LADO / 2 ** z
    x0, x1 = int((b[0] + LADO / 2) // t), int((b[2] + LADO / 2) // t)
    y0, y1 = int((LADO / 2 - b[3]) // t), int((LADO / 2 - b[1]) // t)
    return [(z, x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]

PX = 512  # imagem de 512 px declarada como tile de 256: nítida em telas de alta densidade

def um_tile(args):
    import rasterio
    from rasterio.enums import Resampling
    from affine import Affine
    from rasterio.transform import from_bounds as tf_bounds
    from rasterio.warp import reproject, transform_bounds
    from rasterio.windows import from_bounds, Window
    from PIL import Image
    (z, x, y), tifs, pasta = args
    b = tile_bounds(z, x, y)
    destino = tf_bounds(*b, PX, PX)
    metros = (b[2] - b[0]) / PX  # tamanho do pixel do tile
    acc = np.zeros((4, PX, PX), np.float32)
    for t in tifs:
        with rasterio.open(t) as src:
            # só a janela da origem que cobre o tile (com folga), reduzida quando o tile é de longe
            sb = transform_bounds("EPSG:3857", src.crs, *b)
            win = from_bounds(*sb, transform=src.transform).round_offsets().round_lengths()
            try:
                win = win.intersection(Window(0, 0, src.width, src.height))
            except rasterio.errors.WindowError:
                continue  # o tile só encosta no retângulo da faixa
            fator = max(1, int(metros / src.res[0] / 1.5))
            forma = (4, max(1, int(win.height) // fator), max(1, int(win.width) // fator))
            a = src.read(window=win, out_shape=forma, resampling=Resampling.average if fator > 1 else Resampling.nearest)
            tr = src.window_transform(win) * Affine.scale(win.width / forma[2], win.height / forma[1])
            out = np.zeros((4, PX, PX), np.uint8)
            reproject(a, out, src_transform=tr, src_crs=src.crs, dst_transform=destino, dst_crs="EPSG:3857",
                      resampling=Resampling.bilinear)
        al = out[3:4].astype(np.float32) / 255
        acc[:3] = out[:3] * al + acc[:3] * (1 - al)
        acc[3:4] = np.maximum(acc[3:4], out[3:4])
    if acc[3].max() == 0:
        return 0
    d = Path(pasta) / str(z) / str(x); d.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.moveaxis(acc, 0, -1).astype(np.uint8), "RGBA").save(d / f"{y}.webp", quality=72, method=5)
    return 1

def limites_3857(t):
    import rasterio
    from rasterio.warp import transform_bounds
    with rasterio.open(t) as s:
        return transform_bounds(s.crs, "EPSG:3857", *s.bounds)

def tiles(pasta_dtm, pasta):
    tifs = sorted(str(p) for p in Path(pasta_dtm).glob("*.tif") if ".tmp" not in p.name)
    lim = {t: limites_3857(t) for t in tifs}
    pedidos = {}
    for z in range(10, 17):
        for t, b in lim.items():
            for k in tiles_de(b, z):
                pedidos.setdefault(k, []).append(t)
    print(len(tifs), "faixas,", len(pedidos), "tiles candidatos", flush=True)
    with ProcessPoolExecutor(12) as ex:
        n = sum(ex.map(um_tile, [(k, v, pasta) for k, v in pedidos.items()], chunksize=8))
    print(n, "tiles com dados")


# ---------------------------------------------------------------- contornos das faixas
def contorno(t):
    import rasterio
    from rasterio.features import shapes
    from rasterio.warp import transform_geom
    with rasterio.open(t) as s:
        a = s.read(4, out_shape=(s.height // 20, s.width // 20))  # 20 m basta para o contorno
        tr = s.transform * s.transform.scale(s.width / a.shape[1], s.height / a.shape[0])
        geoms = [g for g, v in shapes((a > 0).astype(np.uint8), transform=tr) if v == 1]
        g = max(geoms, key=lambda g: len(g["coordinates"][0]))
        g = {"type": "Polygon", "coordinates": [g["coordinates"][0]]}
        g = transform_geom(s.crs, "EPSG:4326", g)
    g["coordinates"] = [[[round(x, 5), round(y, 5)] for x, y in g["coordinates"][0][::2]] + [g["coordinates"][0][0]]]
    return g

def faixas(pasta_dtm, saida):
    feats = []
    for t in sorted(Path(pasta_dtm).glob("*.tif")):
        if ".tmp" in t.name: continue
        tid = t.stem.replace("NP_T-", "")
        feats.append({"type": "Feature", "geometry": contorno(str(t)),
                      "properties": {"id": tid, "transecto": f"T-{tid}", "fonte": "eba"}})
    Path(saida).write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))
    print(len(feats), "faixas em", saida)


if __name__ == "__main__":
    cmd, a, b = sys.argv[1:4]
    if cmd == "dtm":
        Path(b).mkdir(exist_ok=True)
        lazs = sorted(Path(a).glob("*.laz"))
        with ProcessPoolExecutor(4) as ex:
            for r in ex.map(dtm_de, map(str, lazs), [str(Path(b) / (p.stem + ".tif")) for p in lazs]):
                print(r, flush=True)
    elif cmd == "tiles":
        tiles(a, b)
    elif cmd == "faixas":
        faixas(a, b)
