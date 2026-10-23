import { describe, expect, it } from 'vitest';
import { LEVEL_STEPS, MAX_LEVEL_STEP, stepAfter, stepBefore, stepIndex, stepLabel } from './levels';

describe('paliers de niveau', () => {
  it('14 paliers de 1/20 à 90/90', () => {
    expect(LEVEL_STEPS).toHaveLength(14);
    expect(stepIndex(MAX_LEVEL_STEP)).toBe(13);
  });

  it('libellé « niveau / niveau max » comme en jeu', () => {
    expect(stepLabel({ level: 1, ascension: 0 })).toBe('1/20');
    expect(stepLabel({ level: 20, ascension: 0 })).toBe('20/20');
    expect(stepLabel({ level: 20, ascension: 1 })).toBe('20/40');
    expect(stepLabel({ level: 80, ascension: 6 })).toBe('80/90');
    expect(stepLabel(MAX_LEVEL_STEP)).toBe('90/90');
  });

  it('passe au palier suivant ou précédent, borné aux extrémités', () => {
    expect(stepAfter({ level: 80, ascension: 5 })).toEqual({ level: 80, ascension: 6 });
    expect(stepAfter(MAX_LEVEL_STEP)).toBeNull();
    expect(stepBefore({ level: 20, ascension: 1 })).toEqual({ level: 20, ascension: 0 });
    expect(stepBefore({ level: 1, ascension: 0 })).toBeNull();
  });
});
