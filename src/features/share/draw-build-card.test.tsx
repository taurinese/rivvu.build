import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BuildCardModel } from './build-card';
import { CARD_HEIGHT, CARD_WIDTH, downloadBlob, renderBuildCard } from './draw-build-card';

const model: BuildCardModel = {
  resonatorName: 'Jiyan',
  buildName: 'Un nom de build vraiment très long qui ne tiendra jamais dans la largeur prévue',
  element: 'aero',
  sprite: '/assets/game/resonators/jiyan.webp',
  subtitle: 'Niv. 90/90 · S0',
  weapon: null,
  stats: [{ label: 'ATQ', value: '1 025' }],
  echoes: [{ name: 'Feilian', icon: null, cost: 4, mainStat: 'DGT crit.' }],
  sets: [{ name: 'Hurle de Sierra', icon: null, pieces: 1 }],
};

/** Contexte 2D factice : enregistre le texte dessiné ; un caractère mesure 10 px. */
function fakeContext() {
  const texts: string[] = [];
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    fillText: (text: string) => texts.push(text),
    measureText: (text: string) => ({ width: text.length * 10 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
  };
  return { ctx, texts };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renderBuildCard', () => {
  it('dessine le nom, les stats, les Échos et tronque les textes trop longs', async () => {
    const { ctx, texts } = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback,
    ) {
      expect([this.width, this.height]).toEqual([CARD_WIDTH, CARD_HEIGHT]);
      callback(new Blob(['png'], { type: 'image/png' }));
    });
    Object.defineProperty(document, 'fonts', {
      value: { ready: Promise.resolve() },
      configurable: true,
    });

    const blob = await renderBuildCard(model);
    expect(blob.type).toBe('image/png');
    expect(texts).toEqual(
      expect.arrayContaining(['Jiyan', 'Sans arme', 'ATQ', '1 025', 'C4', 'rivvu.build']),
    );
    const subtitle = texts.find((t) => t.startsWith('Un nom de build'))!;
    expect(subtitle.endsWith('…')).toBe(true);
    expect(subtitle.length * 10).toBeLessThanOrEqual(600);
  });

  it('échoue proprement sans canvas ou sans PNG', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(renderBuildCard(model)).rejects.toThrow('Canvas indisponible');

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      fakeContext().ctx as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(null);
    });
    await expect(renderBuildCard(model)).rejects.toThrow('Export PNG impossible');
  });
});

describe('downloadBlob', () => {
  it('propose le fichier sous le nom donné puis libère l’URL', async () => {
    const create = vi.fn(() => 'blob:rivvu');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('rivvu.png');
      expect(this.href).toBe('blob:rivvu');
    });
    downloadBlob(new Blob(['x']), 'rivvu.png');
    expect(click).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(revoke).toHaveBeenCalledWith('blob:rivvu');
    });
  });
});
