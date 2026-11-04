# Inventário dos arquivos ligados a https://www.jqjacobs.net/archaeology/geoglyph.html e às páginas
# do mesmo site que ela liga (um nível). Uso: python3 -I script/inventario_jacobs.py tasks/inventario-jacobs.json

import re, sys, time, json, urllib.request, urllib.parse, html
OUT = sys.argv[1]
UA = {"User-Agent": "geoglifos-amazonia-inventario/0.1"}
INICIO = "https://www.jqjacobs.net/archaeology/geoglyph.html"
def baixar(u, limite=3_000_000):
    req = urllib.request.Request(u, headers=UA, method="GET")
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.headers.get("Content-Type", ""), r.read(limite)
def cabeca(u):
    try:
        req = urllib.request.Request(u, headers=UA, method="HEAD")
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.headers.get("Content-Type", ""), int(r.headers.get("Content-Length") or 0), r.headers.get("Last-Modified", "")
    except Exception as e:
        return getattr(e, "code", "erro"), "", 0, ""
def links(base, corpo):
    t = corpo.decode("utf-8", "replace")
    for m in re.finditer(r'(?:href|src)\s*=\s*["\']([^"\'#]+)', t, re.I):
        yield urllib.parse.urljoin(base, html.unescape(m.group(1).strip()))
    # textos-âncora para contexto
DADOS = re.compile(r"\.(kml|kmz|xls|xlsx|csv|json|geojson|gpx|shp|zip|tif|tiff|pdf)$", re.I)
IMG = re.compile(r"\.(jpg|jpeg|png|gif|webp)$", re.I)
paginas = [INICIO]; vistas = set(); achados = {}
# nível 1: a página; nível 2: páginas html do mesmo site que ela liga (só em /amazon, /archaeo, /archaeology, /kml, /andes)
ok_dirs = ("/amazon", "/archaeo", "/archaeology", "/kml", "/andes")
fila = [(INICIO, 0)]
while fila:
    u, nivel = fila.pop(0)
    if u in vistas: continue
    vistas.add(u)
    try:
        tipo, corpo = baixar(u)
    except Exception as e:
        print("falhou", u, e, file=sys.stderr); continue
    time.sleep(0.6)
    for l in links(u, corpo):
        p = urllib.parse.urlparse(l)
        if DADOS.search(p.path) or IMG.search(p.path):
            achados.setdefault(l, set()).add(u)
        elif nivel < 1 and p.netloc.endswith("jqjacobs.net") and p.path.endswith((".html", "/")) and p.path.startswith(ok_dirs):
            fila.append((l, nivel + 1))
print(f"páginas lidas: {len(vistas)}", file=sys.stderr)
res = []
for l, origens in sorted(achados.items()):
    p = urllib.parse.urlparse(l)
    if not p.netloc.endswith("jqjacobs.net"):
        res.append({"url": l, "status": "externo", "tipo": "", "bytes": 0, "modificado": "", "origens": sorted(origens)}); continue
    st, tp, n, lm = cabeca(l); time.sleep(0.3)
    res.append({"url": l, "status": st, "tipo": tp, "bytes": n, "modificado": lm, "origens": sorted(origens)})
json.dump({"paginas": sorted(vistas), "arquivos": res}, open(OUT, "w"), ensure_ascii=False, indent=1)
print(f"arquivos: {len(res)}", file=sys.stderr)
