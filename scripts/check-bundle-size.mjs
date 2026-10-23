// Vérifie le budget de taille du JS initial (gzip). Échoue si le budget est dépassé.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 200;
const dir = 'dist/assets';
const html = readFileSync('dist/index.html', 'utf8');
const entryScripts = [...html.matchAll(/<script[^>]+src="\/assets\/([^"]+\.js)"/g)].map(
  (m) => m[1],
);
const preloads = [
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\/assets\/([^"]+\.js)"/g),
].map((m) => m[1]);
const initial = new Set([...entryScripts, ...preloads]);
const files = readdirSync(dir).filter((f) => initial.has(f));

let total = 0;
for (const file of files) {
  const size = gzipSync(readFileSync(join(dir, file))).length;
  total += size;
  console.log(`${file}: ${(size / 1024).toFixed(1)} kB gzip`);
}
const totalKb = total / 1024;
console.log(`JS initial : ${totalKb.toFixed(1)} kB gzip (budget ${BUDGET_KB} kB)`);
if (totalKb > BUDGET_KB) {
  console.error('Budget de bundle dépassé.');
  process.exit(1);
}
