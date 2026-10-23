import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { formatFlat, formatPercent } from './format';

const NBSP = '\u202f';

describe('formatFlat', () => {
  it('arrondit à l’entier et groupe les milliers avec une espace fine insécable', () => {
    expect(formatFlat(2184.4)).toBe(`2${NBSP}184`);
    expect(formatFlat(999)).toBe('999');
    expect(formatFlat(14382)).toBe(`14${NBSP}382`);
  });

  it('préfixe le signe quand demandé', () => {
    expect(formatFlat(1185, { signed: true })).toBe(`+1${NBSP}185`);
    expect(formatFlat(-3, { signed: true })).toBe('−3');
    expect(formatFlat(0, { signed: true })).toBe('0');
  });
});

describe('formatPercent', () => {
  it('affiche une décimale avec une virgule et un % séparé', () => {
    expect(formatPercent(62.4)).toBe(`62,4${NBSP}%`);
    expect(formatPercent(100)).toBe(`100,0${NBSP}%`);
    expect(formatPercent(238.56)).toBe(`238,6${NBSP}%`);
  });

  it('préfixe le signe quand demandé', () => {
    expect(formatPercent(42.9, { signed: true })).toBe(`+42,9${NBSP}%`);
  });

  it('produit toujours exactement une décimale (propriété)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1e6, noNaN: true }), (n) => {
        expect(formatPercent(n)).toMatch(/^[\d\u202f]+,\d\u202f%$/);
      }),
    );
  });
});
