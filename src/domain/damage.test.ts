import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeHit, defMultiplier, enemyDef, hitDmgBonus, resMultiplier } from './damage';
import { computeFinalStats } from './stats';

describe('enemyDef — source wiki « Damage »', () => {
  it('DÉF ennemie = 8 × niveau + 792', () => {
    expect(enemyDef(90)).toBe(1512);
    expect(enemyDef(100)).toBe(1592);
  });
});

describe('defMultiplier', () => {
  it('niv. 90 contre niv. 90 : 1520 / (1520 + 1512)', () => {
    expect(defMultiplier({ attackerLevel: 90, enemyLevel: 90 })).toBeCloseTo(1520 / 3032, 10);
  });

  it('l’ignorance de DÉF réduit la DÉF prise en compte', () => {
    expect(defMultiplier({ attackerLevel: 90, enemyLevel: 90, defIgnore: 0.18 })).toBeCloseTo(
      1520 / (1520 + 1512 * 0.82),
      10,
    );
  });

  it('la réduction de DÉF s’applique avant la formule', () => {
    expect(defMultiplier({ attackerLevel: 90, enemyLevel: 90, defReduction: 0.1 })).toBeCloseTo(
      1520 / (1520 + 1512 * 0.9),
      10,
    );
  });
});

describe('resMultiplier', () => {
  it('suit les trois régimes du wiki', () => {
    expect(resMultiplier(-0.2)).toBeCloseTo(1.1, 10);
    expect(resMultiplier(0.1)).toBeCloseTo(0.9, 10);
    expect(resMultiplier(0.4)).toBeCloseTo(0.6, 10);
    expect(resMultiplier(0.8)).toBeCloseTo(1 / 5, 10);
  });

  it('est décroissant (propriété)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1, max: 2, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (r, d) => {
          expect(resMultiplier(r + d)).toBeLessThanOrEqual(resMultiplier(r) + 1e-12);
        },
      ),
    );
  });
});

describe('hitDmgBonus', () => {
  it('additionne attribut + type d’attaque + tous dégâts', () => {
    const stats = computeFinalStats({
      character: { hp: 1, atk: 1, def: 1 },
      weapon: null,
      bonuses: [{ aeroDmg: 40, heavyDmg: 18.6, allDmg: 12, liberationDmg: 50 }],
    });
    expect(hitDmgBonus(stats, 'aero', 'heavy')).toBeCloseTo(70.6, 10);
  });
});

describe('computeHit', () => {
  const base = {
    scalingValue: 2000,
    motionValue: 1.5,
    dmgBonus: 50,
    amplify: 0,
    critRate: 60,
    critDmg: 250,
    attackerLevel: 90,
    enemy: { level: 90, res: 0.1 },
  };
  const def = 1520 / 3032;

  it('coup normal = valeur × MV × (1 + bonus) × DÉF × RÉS', () => {
    expect(computeHit(base).normal).toBeCloseTo(2000 * 1.5 * 1.5 * def * 0.9, 6);
  });

  it('coup critique = coup normal × DGT crit.', () => {
    const hit = computeHit(base);
    expect(hit.crit).toBeCloseTo(hit.normal * 2.5, 6);
  });

  it('moyenne pondérée par le taux crit. (plafonné à 100 %)', () => {
    const hit = computeHit(base);
    expect(hit.average).toBeCloseTo(hit.normal * 0.4 + hit.crit * 0.6, 6);
    expect(computeHit({ ...base, critRate: 130 }).average).toBeCloseTo(computeHit(base).crit, 6);
  });

  it('l’amplification multiplie séparément', () => {
    expect(computeHit({ ...base, amplify: 20 }).normal).toBeCloseTo(
      computeHit(base).normal * 1.2,
      6,
    );
  });

  it('plus de taux crit. ne baisse jamais la moyenne (propriété)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 50, noNaN: true }),
        (cr, d) => {
          expect(computeHit({ ...base, critRate: cr + d }).average).toBeGreaterThanOrEqual(
            computeHit({ ...base, critRate: cr }).average - 1e-9,
          );
        },
      ),
    );
  });
});
