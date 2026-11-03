"""Extrai do app "Ancient Amazonian Earthworks" (R. Walker) todos os marcadores do Leaflet
(coordenada + legenda com a URL da foto) para data/raw/walker/marcadores.json.

Uso: uv run --with playwright script/extrai_walker_marcadores.py   (depois: script/sync_walker.py)
"""

import json
from pathlib import Path

SAIDA = Path(__file__).resolve().parent.parent / "data/raw/walker/marcadores.json"
from playwright.sync_api import sync_playwright
JS="""() => { const m = HTMLWidgets.find('#myMap').getMap(); const out=[];
  m.eachLayer(l => { if (!l.getLatLng) return; const t=l.getTooltip&&l.getTooltip(); const pp=l.getPopup&&l.getPopup();
    const c=(t&&t.getContent())||(pp&&pp.getContent())||(l.options&&l.options.label)||'';
    out.push({lat:l.getLatLng().lat,lng:l.getLatLng().lng,html:typeof c==='string'?c:(c&&c.outerHTML)||'',cor:l.options.color||''}); });
  return out; }"""
res={}
with sync_playwright() as p:
    b=p.chromium.launch()
    try:
        pg=b.new_page(); pg.goto("https://robert-walker.shinyapps.io/ggshiny/",timeout=90000)
        pg.wait_for_selector(".leaflet-container",timeout=90000); pg.wait_for_timeout(8000)
        res["inicial"]=pg.evaluate(JS)
        sel=pg.locator("select").first
        for o in sel.locator("option").all_inner_texts():
            sel.select_option(label=o); pg.wait_for_timeout(5000); res[o]=pg.evaluate(JS)
    finally: b.close()
json.dump(res,open(str(SAIDA),"w"),ensure_ascii=False)
for k,v in res.items(): print(k,len(v),sum('.jpg' in x['html'] or '.png' in x['html'] for x in v))
print(res["inicial"][0])
