// Copie le moteur OCR (tesseract.js) et les langues dans public/ocr/ : auto-hébergés, chargés
// seulement quand on importe une capture, sans appel à un CDN tiers (voir ADR 0004).
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const out = 'public/ocr';
const packageDir = (name, from) =>
  dirname(require.resolve(`${name}/package.json`, from ? { paths: [from] } : undefined));

const tesseract = packageDir('tesseract.js');
const core = packageDir('tesseract.js-core', tesseract);
const files = [
  [join(tesseract, 'dist/worker.min.js'), 'worker.min.js'],
  ...['lstm', 'simd-lstm', 'relaxedsimd-lstm'].map((variant) => [
    join(core, `tesseract-core-${variant}.wasm.js`),
    `core/tesseract-core-${variant}.wasm.js`,
  ]),
  ...['fra', 'eng'].map((lang) => [
    join(packageDir(`@tesseract.js-data/${lang}`), `4.0.0_best_int/${lang}.traineddata.gz`),
    `lang/${lang}.traineddata.gz`,
  ]),
];

for (const [from, to] of files) {
  const target = join(out, to);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(from, target);
}
console.log(`OCR : ${String(files.length)} fichiers dans ${out}/`);
