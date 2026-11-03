"""Extrai a Supplementary Table 2 (estruturas detectadas por LiDAR) do suplemento
da Nature 2026 (Pärssinen et al., CC BY 4.0) para data/processed/nature2026_lidar.csv.

Uso: uv run --with polars --with 'markitdown[docx]' script/extract_nature2026.py
"""

import html
import re
import subprocess
import unicodedata
import sys
from pathlib import Path

import polars as pl

ROOT = Path(__file__).resolve().parent.parent
DOCX = ROOT / "data/raw/nature2026/41586_2026_10835_MOESM1_ESM.docx"
OUT = ROOT / "data/processed/nature2026_lidar.csv"


def limpa(s: str) -> str:
    """Desfaz os escapes do markdown (Lid24\\_L04\\_46a), entidades HTML e espaços especiais."""
    s = re.sub(r"\\([\\`*_{}\[\]()#+\-.!|<>~])", r"\1", s)
    s = html.unescape(s).replace(" ", " ").replace("​", "")
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", s)).strip()


def main() -> None:
    md = subprocess.run(
        ["markitdown", str(DOCX)], capture_output=True, text=True, check=True
    ).stdout
    start = md.index("Supplementary Table 2. List")
    end = md.index("Supplementary Table 3.", start)
    rows = []
    for line in md[start:end].splitlines():
        cells = [limpa(c) for c in line.strip().strip("|").split("|")]
        if len(cells) != 7 or not re.fullmatch(r"\*?\d+", cells[0]):
            continue
        no, lat, lon, name, aquiry, size, acc = cells
        rows.append(
            {
                "n": int(no.lstrip("*")),
                "parcial": "*" in no,  # intersecta <50% da faixa LiDAR
                "lat": float(lat),
                "lon": float(lon),
                "nome": name,
                "aquiry": aquiry.lower() == "y",
                "area_ha": float(size) if size else None,
                "precisao": acc,
            }
        )
    df = pl.DataFrame(rows).sort("n")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df.write_csv(OUT)
    print(f"{df.height} estruturas -> {OUT.relative_to(ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
