import { describe, expect, it } from 'vitest';
import { prepareForOcr } from './recognize';

const pixels = (...rgb: number[][]) =>
  new Uint8ClampedArray(rgb.flatMap(([r, g, b]) => [r!, g!, b!, 255]));

describe('prepareForOcr', () => {
  it('passe en niveaux de gris et inverse une capture sombre (texte clair sur fond foncé)', () => {
    const data = pixels([10, 10, 10], [20, 20, 20], [240, 240, 240]);
    prepareForOcr(data);
    expect([...data]).toEqual([245, 245, 245, 255, 235, 235, 235, 255, 15, 15, 15, 255]);
  });

  it('garde une image claire telle quelle (en gris)', () => {
    const data = pixels([250, 250, 250], [100, 100, 100]);
    prepareForOcr(data);
    expect([...data]).toEqual([250, 250, 250, 255, 100, 100, 100, 255]);
  });
});
