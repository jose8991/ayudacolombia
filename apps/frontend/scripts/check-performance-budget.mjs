import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const assetsDirectory = new URL('../dist/assets/', import.meta.url);
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const entryScript = html.match(/src="\/assets\/([^"]+\.js)"/)?.[1];
const entryStyle = html.match(/href="\/assets\/([^"]+\.css)"/)?.[1];
const mapScript = readdirSync(assetsDirectory).find((name) => name.startsWith('maplibre-gl-') && name.endsWith('.js'));

const budgets = [
  { label: 'JavaScript inicial', file: entryScript, gzipLimit: 100 * 1024 },
  { label: 'CSS inicial', file: entryStyle, gzipLimit: 12 * 1024 },
  { label: 'Mapa diferido', file: mapScript, gzipLimit: 300 * 1024 },
];

let failed = false;
for (const budget of budgets) {
  if (!budget.file) throw new Error(`No se encontró el recurso: ${budget.label}`);
  const gzipBytes = gzipSync(readFileSync(new URL(budget.file, assetsDirectory))).byteLength;
  const limitKb = Math.round(budget.gzipLimit / 1024);
  const actualKb = (gzipBytes / 1024).toFixed(1);
  console.log(`${budget.label}: ${actualKb} KB gzip (límite ${limitKb} KB)`);
  if (gzipBytes > budget.gzipLimit) failed = true;
}

if (failed) {
  console.error('El build supera el presupuesto de rendimiento.');
  process.exitCode = 1;
}
