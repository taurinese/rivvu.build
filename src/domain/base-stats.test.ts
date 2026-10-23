import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { curves, resonatorById, weaponById } from '@/data/game';
import { characterBaseStats, weaponStats } from './base-stats';
import { LEVEL_STEPS, MAX_LEVEL_STEP } from './levels';

const jiyan = resonatorById.get('jiyan')!;
const verdantSummit = weaponById.get('verdant-summit')!;

describe('characterBaseStats — vérité wiki', () => {
  it('Jiyan niveau 90 : PV 10 487,50 · ATQ 437,50 · DÉF 1 185,53', () => {
    const stats = characterBaseStats(jiyan.base, MAX_LEVEL_STEP, curves);
    expect(stats.hp).toBeCloseTo(10487.5, 2);
    expect(stats.atk).toBeCloseTo(437.5, 2);
    expect(stats.def).toBeCloseTo(1185.53, 1);
  });

  it('Jiyan 80/90 (ascension 6) : PV 9 780,91 · ATQ 408,33 · DÉF 1 105,65', () => {
    const stats = characterBaseStats(jiyan.base, { level: 80, ascension: 6 }, curves);
    expect(stats.hp).toBeCloseTo(9780.91, 1);
    expect(stats.atk).toBeCloseTo(408.33, 1);
    expect(stats.def).toBeCloseTo(1105.65, 1);
  });

  it('niveau 1 = stats de base brutes', () => {
    expect(characterBaseStats(jiyan.base, { level: 1, ascension: 0 }, curves)).toEqual(jiyan.base);
  });

  it('refuse un palier inexistant', () => {
    expect(() => characterBaseStats(jiyan.base, { level: 33, ascension: 2 }, curves)).toThrow(
      RangeError,
    );
  });

  it('les stats ne décroissent jamais d’un palier au suivant (propriété)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: LEVEL_STEPS.length - 2 }), (i) => {
        const a = characterBaseStats(jiyan.base, LEVEL_STEPS[i]!, curves);
        const b = characterBaseStats(jiyan.base, LEVEL_STEPS[i + 1]!, curves);
        expect(b.hp).toBeGreaterThanOrEqual(a.hp);
        expect(b.atk).toBeGreaterThanOrEqual(a.atk);
        expect(b.def).toBeGreaterThanOrEqual(a.def);
      }),
    );
  });
});

describe('weaponStats — vérité wiki', () => {
  it('Sommet verdoyant 90/90 : ATQ 587 · DGT crit. 48,6 %', () => {
    const stats = weaponStats(verdantSummit, MAX_LEVEL_STEP, curves);
    expect(Math.round(stats.atk)).toBe(587);
    expect(stats.secondary).toEqual({ stat: 'critDmg', value: expect.closeTo(48.6, 1) as number });
  });

  it('Sommet verdoyant 50/60 (ascension 3) : ATQ 335 · DGT crit. 31,7 %', () => {
    const stats = weaponStats(verdantSummit, { level: 50, ascension: 3 }, curves);
    expect(Math.round(stats.atk)).toBe(335);
    expect(stats.secondary.value).toBeCloseTo(31.7, 0);
  });

  it('niveau 1 = valeurs de base', () => {
    const stats = weaponStats(verdantSummit, { level: 1, ascension: 0 }, curves);
    expect(stats.atk).toBe(47);
    expect(stats.secondary.value).toBe(10.8);
  });
});

describe('courbes incomplètes', () => {
  it('lève une erreur explicite plutôt que de calculer une valeur fausse', () => {
    const truncated = { ...curves, character: curves.character.slice(0, 2) };
    expect(() => characterBaseStats(jiyan.base, MAX_LEVEL_STEP, truncated)).toThrow(RangeError);
    const noSecondary = { ...curves, weaponSecondary: [] };
    expect(() => weaponStats(verdantSummit, MAX_LEVEL_STEP, noSecondary)).toThrow(RangeError);
  });
});
