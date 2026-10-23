/**
 * Reconnaissance du texte d'une capture d'Écho avec tesseract.js, entièrement dans le navigateur.
 * Moteur et langues auto-hébergés dans /ocr (scripts/copy-ocr-assets.mjs, ADR 0004).
 */

/** Niveaux de gris, puis inversion si l'image est sombre : l'OCR lit mieux du texte foncé sur fond clair. */
export function prepareForOcr(data: Uint8ClampedArray): void {
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(
      0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0),
    );
    data[i] = data[i + 1] = data[i + 2] = gray;
    total += gray;
  }
  if (total / (data.length / 4) >= 128) return;
  for (let i = 0; i < data.length; i += 4)
    data[i] = data[i + 1] = data[i + 2] = 255 - (data[i] ?? 0);
}

/** Agrandit (×2) et prépare l'image : les petits caractères de l'interface du jeu sont mieux lus. */
async function preparedCanvas(image: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(image);
  const scale = bitmap.width < 1600 ? 2 : 1;
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  prepareForOcr(pixels.data);
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

export async function recognizeImage(
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const [{ createWorker, OEM }, canvas] = await Promise.all([
    import('tesseract.js'),
    preparedCanvas(image),
  ]);
  const worker = await createWorker(['fra', 'eng'], OEM.LSTM_ONLY, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr/core',
    langPath: '/ocr/lang',
    workerBlobURL: false,
    logger: (message) => {
      if (message.status === 'recognizing text') onProgress?.(message.progress);
    },
  });
  try {
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
