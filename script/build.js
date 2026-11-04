#!/usr/bin/env bun
// Build de produção: docs/ → dist/, publicado pelo GitHub Actions (.github/workflows/deploy.yml).
// - index.html minificado, com o CSS e o JS inline
// - som.js, tour.js e navegacao.js juntos num app.js minificado (uma requisição em vez de três)
// - MapLibre servido pelo próprio site, não pelo unpkg.com (um bloqueador ou uma queda do CDN derrubava o mapa)
// - dados e fotos copiados como estão; docs/data/local/ (cópias só locais, se houver) nunca entra
// docs/ continua funcionando sem build: `bun run dev`.

import { minify } from "html-minifier-terser";
import { minify as terser } from "terser";
import { copyFileSync, cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";

const RAIZ = new URL("..", import.meta.url).pathname;
const DOCS = join(RAIZ, "docs");
const DIST = join(RAIZ, "dist");
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const gz = (s) => Bun.gzipSync(typeof s === "string" ? Buffer.from(s) : s).length;

// do zero, para nada removido do site sobrar em dist/
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

// versão dos arquivos: o commit (GITHUB_SHA no CI, senão o HEAD local)
const sha = (process.env.GITHUB_SHA || Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: RAIZ }).stdout.toString().trim() || "dev").slice(0, 8);

// ── 1. arquivos estáticos (sem os dados locais do Jacobs nem lixo do macOS) ──
const FORA = [join(DOCS, "data/local")];
cpSync(DOCS, DIST, {
  recursive: true,
  filter: (src) => !FORA.some((f) => src === f || src.startsWith(f + "/")) && !src.endsWith(".DS_Store"),
});
if (readdirSync(join(DIST, "data")).includes("local")) throw new Error("docs/data/local vazou para dist/");

// ── 2. MapLibre local, na mesma versão do unpkg ──
const ML = join(RAIZ, "node_modules/maplibre-gl/dist");
const mlVersao = JSON.parse(readFileSync(join(RAIZ, "node_modules/maplibre-gl/package.json"), "utf-8")).version;
mkdirSync(join(DIST, "vendor"), { recursive: true });
for (const f of ["maplibre-gl.js", "maplibre-gl.css"]) copyFileSync(join(ML, f), join(DIST, "vendor", f));

// ── 3. scripts juntos e minificados ──
const SCRIPTS = ["mapa.js", "som.js", "tour.js", "navegacao.js"];
const fonteJs = SCRIPTS.map((f) => readFileSync(join(DOCS, f), "utf-8")).join("\n;\n");
// sem toplevel: os scripts conversam por globais (map, chave, pronto, tour…)
const app = await terser(fonteJs, { compress: { passes: 2 }, mangle: true, format: { comments: false } });
writeFileSync(join(DIST, "app.js"), app.code);
for (const f of SCRIPTS) rmSync(join(DIST, f));
// i18n.js roda antes do script do mapa (traduz a página e define t/fmt), então fica num arquivo à parte
const i18n = await terser(readFileSync(join(DOCS, "i18n.js"), "utf-8"), { compress: { passes: 2 }, mangle: true, format: { comments: false } });
writeFileSync(join(DIST, "i18n.js"), i18n.code);
// service worker: a versão do cache é o commit, para cada deploy começar um cache novo do site
const sw = await terser(readFileSync(join(DOCS, "sw.js"), "utf-8").replace("__VERSAO__", sha), { compress: { passes: 2 }, mangle: true, format: { comments: false } });
writeFileSync(join(DIST, "sw.js"), sw.code);

// ── 4. index.html ──
let html = readFileSync(join(DOCS, "index.html"), "utf-8");
const troca = (de, para) => {
  if (!html.includes(de)) throw new Error(`index.html: não achei ${de}`);
  html = html.split(de).join(para); // todas as ocorrências (a URL do MapLibre aparece no preload e no script)
};
troca(`https://unpkg.com/maplibre-gl@${mlVersao}/dist/maplibre-gl.css`, `vendor/maplibre-gl.css?v=${mlVersao}`);
troca(`https://unpkg.com/maplibre-gl@${mlVersao}/dist/maplibre-gl.js`, `vendor/maplibre-gl.js?v=${mlVersao}`);
// i18n.js (7 KB) roda antes de tudo: vai embutido na página, sem um pedido a mais bloqueando a primeira pintura
troca(`<script src="i18n.js"></script>`, `<script>${i18n.code.replace(/<\/script/gi, "<\\/script")}</script>`);
// tudo com defer (MapLibre, depois app.js = mapa + som + tour + navegação): o painel pinta antes de o mapa existir
troca(SCRIPTS.map((f) => `<script src="${f}" defer></script>`).join("\n"), `<script src="app.js?v=${sha}" defer></script>`);
// o CSS do MapLibre só estiliza os controles do mapa: carrega sem bloquear a primeira pintura
troca(`<link rel="stylesheet" href="vendor/maplibre-gl.css?v=${mlVersao}">`, `<link rel="preload" as="style" href="vendor/maplibre-gl.css?v=${mlVersao}" onload="this.rel='stylesheet'"><noscript><link rel="stylesheet" href="vendor/maplibre-gl.css?v=${mlVersao}"></noscript>`);

const min = await minify(html, {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: { compress: { passes: 2 }, mangle: true, format: { comments: false } },
  sortAttributes: true,
});
writeFileSync(join(DIST, "index.html"), min);

// ── 5. tamanhos ──
const fonteHtml = readFileSync(join(DOCS, "index.html"), "utf-8");
console.log(`index.html: ${kb(fonteHtml.length)} → ${kb(min.length)} (${kb(gz(fonteHtml))} → ${kb(gz(min))} com gzip)`);
console.log(`app.js:     ${kb(fonteJs.length)} → ${kb(app.code.length)} (${kb(gz(fonteJs))} → ${kb(gz(app.code))} com gzip)`);
console.log(`maplibre:   ${mlVersao}, servido de vendor/`);
const du = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? du(join(d, e.name)) : statSync(join(d, e.name)).size), 0);
console.log(`dist/:      ${(du(DIST) / 1048576).toFixed(1)} MB, versão ${sha} → ${relative(process.cwd(), DIST) || "."}`);
