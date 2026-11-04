#!/usr/bin/env bash
# Sincroniza as fontes de dados brutas em data/raw/.
# Baixa só o que mudou (If-Modified-Since) e registra tudo em data/raw/MANIFEST.tsv.
set -euo pipefail
cd "$(dirname "$0")/.."
RAW=data/raw
UA="geoglifos-amazonia-sync/0.1"
mkdir -p "$RAW"

# destino|url
# (Kalliola et al. 2024, Fairdata/IDA, CC BY 4.0, não tem link direto: o PDF vem pelo botão Download de
#  https://etsin.fairdata.fi/dataset/54f01053-3ea7-4679-a36b-f7146911c345 e fica em data/raw/kalliola2024/)
SOURCES=$(cat <<'EOF'
jacobs/amazon_geoglyphs.kml|https://www.jqjacobs.net/amazon/amazon_geoglyphs.kml
jacobs/amazon_geoglyphs.xls|https://www.jqjacobs.net/amazon/amazon_geoglyphs.xls
jacobs/bolivia.kml|https://www.jqjacobs.net/amazon/bolivia.kml
jacobs/brazil_geoglifos.kml|https://www.jqjacobs.net/amazon/brazil_geoglifos.kml
jacobs/brazil_geoglifos.xls|https://www.jqjacobs.net/amazon/brazil_geoglifos.xls
jacobs/acrelandia_2022_survey.kml|https://www.jqjacobs.net/kml/acrelandia_2022_survey.kml
jacobs/octagons.kml|https://www.jqjacobs.net/kml/octagons.kml
nature2026/41586_2026_10835_MOESM1_ESM.docx|https://static-content.springer.com/esm/art%3A10.1038%2Fs41586-026-10835-7/MediaObjects/41586_2026_10835_MOESM1_ESM.docx
nature2026/41586_2026_10835_MOESM2_ESM.pdf|https://static-content.springer.com/esm/art%3A10.1038%2Fs41586-026-10835-7/MediaObjects/41586_2026_10835_MOESM2_ESM.pdf
nature2026/41586_2026_10835_MOESM3_ESM.pdf|https://static-content.springer.com/esm/art%3A10.1038%2Fs41586-026-10835-7/MediaObjects/41586_2026_10835_MOESM3_ESM.pdf
science2023/ade2541-v1.0.0.zip|https://zenodo.org/api/records/10214943/files/Vperipato/ade2541-v1.0.0.zip/content
science2023/IPPModel_EarthworkProb-log10.tif|https://zenodo.org/api/records/10214943/files/IPPModel_EarthworkProb-log10.tif/content
EOF
)

MANIFEST="$RAW/MANIFEST.tsv"
printf "arquivo\tbytes\tsha256\tsincronizado_em\turl\n" > "$MANIFEST.tmp"
fail=0
while IFS='|' read -r dest url; do
  [ -z "$dest" ] && continue
  out="$RAW/$dest"; mkdir -p "$(dirname "$out")"
  zflag=(); [ -f "$out" ] && zflag=(-z "$out")
  if curl -fsSL --retry 3 --max-time 600 -A "$UA" -R ${zflag[@]+"${zflag[@]}"} -o "$out.part" "$url"; then
    if [ -s "$out.part" ]; then mv "$out.part" "$out"; echo "atualizado  $dest"
    else rm -f "$out.part"; echo "inalterado  $dest"; fi
  else
    rm -f "$out.part"; echo "FALHOU      $dest  ($url)" >&2; fail=1
  fi
  if [ -f "$out" ]; then
    printf "%s\t%s\t%s\t%s\t%s\n" "$dest" "$(stat -f %z "$out" 2>/dev/null || stat -c %s "$out")" \
      "$(shasum -a 256 "$out" | cut -d' ' -f1)" "$(date -u +%FT%TZ)" "$url" >> "$MANIFEST.tmp"
  fi
done <<< "$SOURCES"
mv "$MANIFEST.tmp" "$MANIFEST"

# Descompacta o pacote do artigo da Science (código R + pasta Database).
z="$RAW/science2023/ade2541-v1.0.0.zip"
[ -f "$z" ] && unzip -qo "$z" -d "$RAW/science2023/ade2541"
exit $fail
