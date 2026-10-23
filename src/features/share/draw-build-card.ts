import type { BuildCardModel } from './build-card';

/** Format des aperçus de liens (Open Graph), lisible sur mobile comme sur desktop. */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const WHITE = '#ffffff';
const SECONDARY = 'rgba(235, 235, 245, 0.72)';
const PANEL = 'rgba(28, 28, 30, 0.62)';
const PANEL_BORDER = 'rgba(255, 255, 255, 0.12)';

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

async function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return null;
  const image = new Image();
  image.src = src;
  try {
    await image.decode();
    return image;
  } catch {
    return null;
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Tronque un texte avec « … » pour tenir dans la largeur donnée. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/** Dessine l'image de partage d'un build et la renvoie en PNG. */
export async function renderBuildCard(model: BuildCardModel): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');

  await document.fonts.ready;
  const font = cssVar('--font-sans', 'system-ui, sans-serif');
  const base = cssVar('--surface-dark-base', '#0e1213');
  const accent = cssVar(`--el-${model.element}`, '#8e8e93');

  const [sprite, weaponIcon, ...echoIcons] = await Promise.all([
    loadImage(model.sprite),
    loadImage(model.weapon?.icon ?? null),
    ...model.echoes.map((e) => loadImage(e.icon)),
  ]);

  // Fond : teinte de l'attribut sur base sombre, comme le bandeau de la fiche.
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const glow = ctx.createRadialGradient(820, 180, 40, 820, 180, 720);
  glow.addColorStop(0, accent);
  glow.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.globalAlpha = 1;

  if (sprite) {
    const height = CARD_HEIGHT * 1.35;
    const width = (sprite.naturalWidth / sprite.naturalHeight) * height;
    ctx.drawImage(sprite, 860 - width / 2, 10, width, height);
  }
  const scrim = ctx.createLinearGradient(0, 0, CARD_WIDTH, 0);
  scrim.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
  scrim.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
  scrim.addColorStop(0.75, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // En-tête.
  const left = 56;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = accent;
  ctx.fillRect(left, 56, 48, 6);
  ctx.fillStyle = WHITE;
  ctx.font = `700 76px ${font}`;
  ctx.fillText(fit(ctx, model.resonatorName, 600), left, 140);
  ctx.font = `500 28px ${font}`;
  ctx.fillStyle = SECONDARY;
  ctx.fillText(fit(ctx, `${model.buildName} · ${model.subtitle}`, 600), left, 184);

  // Arme.
  roundedRect(ctx, left, 212, 540, 84, 18);
  ctx.fillStyle = PANEL;
  ctx.fill();
  ctx.strokeStyle = PANEL_BORDER;
  ctx.stroke();
  if (weaponIcon) ctx.drawImage(weaponIcon, left + 14, 222, 64, 64);
  ctx.fillStyle = WHITE;
  ctx.font = `600 26px ${font}`;
  ctx.fillText(fit(ctx, model.weapon?.name ?? 'Sans arme', 420), left + 94, 250);
  ctx.fillStyle = SECONDARY;
  ctx.font = `400 21px ${font}`;
  ctx.fillText(model.weapon?.meta ?? '—', left + 94, 280);

  // Stats : deux colonnes.
  const statsTop = 344;
  model.stats.forEach((stat, i) => {
    const x = left + (i % 2) * 280;
    const y = statsTop + Math.floor(i / 2) * 50;
    ctx.fillStyle = SECONDARY;
    ctx.font = `400 21px ${font}`;
    ctx.fillText(fit(ctx, stat.label, 150), x, y);
    ctx.fillStyle = WHITE;
    ctx.font = `700 26px ${font}`;
    ctx.textAlign = 'right';
    ctx.fillText(stat.value, x + 250, y);
    ctx.textAlign = 'left';
  });

  // Échos et ensembles, en bas à droite.
  const echoTop = 470;
  model.echoes.forEach((echo, i) => {
    const x = 640 + i * 104;
    roundedRect(ctx, x, echoTop, 92, 92, 20);
    ctx.fillStyle = PANEL;
    ctx.fill();
    ctx.strokeStyle = PANEL_BORDER;
    ctx.stroke();
    const icon = echoIcons[i];
    if (icon) ctx.drawImage(icon, x + 10, echoTop + 6, 72, 72);
    ctx.fillStyle = WHITE;
    ctx.font = `700 17px ${font}`;
    ctx.textAlign = 'center';
    ctx.fillText(`C${String(echo.cost)}`, x + 46, echoTop + 88);
    ctx.textAlign = 'left';
  });
  ctx.fillStyle = SECONDARY;
  ctx.font = `500 20px ${font}`;
  const sets = model.sets.map((s) => `${s.name} ×${String(s.pieces)}`).join(' · ');
  if (sets) ctx.fillText(fit(ctx, sets, 520), 640, echoTop - 18);

  ctx.fillStyle = SECONDARY;
  ctx.font = `600 20px ${font}`;
  ctx.fillText('rivvu.build', left, CARD_HEIGHT - 40);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Export PNG impossible'));
    }, 'image/png');
  });
}

/** Propose le fichier au téléchargement. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
