#!/usr/bin/env bash
# Publica o site em ミ.xyz (https://xn--2dk.xyz/dataviz/geoglifos-amazonia/):
# faz o build e copia dist/ para o repositório xyz, com commit e push lá.
# Uso: script/publica_xyz.sh [caminho do repositório xyz, padrão ~/Projetos/xyz]
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
XYZ="${1:-$HOME/Projetos/xyz}"
DESTINO="$XYZ/dataviz/geoglifos-amazonia"

[ -d "$XYZ/.git" ] || { echo "repositório xyz não encontrado em $XYZ" >&2; exit 1; }
if [ -n "$(git -C "$XYZ" status --porcelain)" ]; then
  echo "o repositório xyz tem mudanças não commitadas; resolva antes de publicar" >&2; exit 1
fi

cd "$RAIZ"
bun run build
# os dados de Jacobs ("all rights reserved") nunca saem daqui
[ ! -e dist/data/local ] || { echo "dist/data/local existe: abortando" >&2; exit 1; }

git -C "$XYZ" pull --ff-only -q
rsync -a --delete dist/ "$DESTINO/"
(cd "$XYZ" && bun scripts/gera_seo.ts >/dev/null)

git -C "$XYZ" add -A dataviz/geoglifos-amazonia sitemap.xml
if git -C "$XYZ" diff --cached --quiet; then
  echo "nada mudou em $DESTINO"; exit 0
fi
versao="$(git rev-parse --short HEAD)"
git -C "$XYZ" commit -q -m "feat: geoglifos da amazônia atualizado (geoglifos-amazonia@$versao)"
git -C "$XYZ" push -q
echo "publicado: https://xn--2dk.xyz/dataviz/geoglifos-amazonia/ (geoglifos-amazonia@$versao)"
