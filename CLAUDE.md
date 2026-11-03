# geoglifos-amazonia

- Tudo neste projeto é em português do Brasil: site, README, documentação, comentários, mensagens dos scripts, nomes novos de variáveis/campos e mensagens de commit (no formato convencional, com o tipo em inglês: `feat: adiciona camada de contornos`).
- Dados de James Q. Jacobs são "all rights reserved": nunca entram no git nem no site publicado (ficam em `data/raw/` e `docs/data/local/`, ignorados pelo git) até haver autorização dele.
- Só publicar dados de fontes com licença aberta e registrar cada fonte em `sources.md`. Exceção decidida em 2026-11-03: as fotos do app de R. Walker são publicadas reduzidas e com crédito em cada uma (`docs/data/fotos/`).
- Pipeline: `script/sync.sh` → `script/extract_nature2026.py` → `script/convert.py`; fotos: `script/extrai_walker_marcadores.py` → `script/sync_walker.py`; o site estático fica em `docs/` (GitHub Pages).
