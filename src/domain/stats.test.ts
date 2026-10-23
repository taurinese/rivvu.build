import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  BASE_CRIT_DMG,
  BASE_CRIT_RATE,
  BASE_ENERGY_REGEN,
  computeFinalStats,
  sumStatBlocks,
} from './stats';

const jiyan90 = { hp: 10487.5, atk: 437.5, def: 1185.53 };
const verdant90 = { atk: 587, secondary: { stat: 'critDmg' as const, value: 48.6 } };

describe('sumStatBlocks', () => {
  it('additionne les blocs clé par clé', () => {
    expect(sumStatBlocks([{ atk: 10, critRate: 5 }, { atk: 5 }, {}])).toEqual({
      atk: 15,
      critRate: 5,
    });
  });
});

describe('computeFinalStats', () => {
  it('sans bonus : stats de base + constantes (5 % / 150 % / 100 %)', () => {
    const stats = computeFinalStats({ character: jiyan90, weapon: null, bonuses: [] });
    expect(stats).toMatchObject({
      hp: 10487.5,
      atk: 437.5,
      def: 1185.53,
      critRate: BASE_CRIT_RATE,
      critDmg: BASE_CRIT_DMG,
      energyRegen: BASE_ENERGY_REGEN,
    });
    expect(BASE_CRIT_RATE).toBe(5);
    expect(BASE_CRIT_DMG).toBe(150);
    expect(BASE_ENERGY_REGEN).toBe(100);
  });

  it('l’ATQ de l’arme s’ajoute à la base avant les % ; les valeurs plates après', () => {
    const stats = computeFinalStats({
      character: jiyan90,
      weapon: verdant90,
      bonuses: [{ atkPct: 18 }, { atkPct: 12 }, { atk: 150 }],
    });
    expect(stats.baseAtk).toBeCloseTo(1024.5, 5);
    expect(stats.atk).toBeCloseTo(1024.5 * 1.3 + 150, 5);
    expect(stats.critDmg).toBeCloseTo(150 + 48.6, 5);
  });

  it('PV et DÉF : % sur la base du personnage + valeurs plates', () => {
    const stats = computeFinalStats({
      character: jiyan90,
      weapon: null,
      bonuses: [{ hpPct: 10, hp: 2280, defPct: 20, def: 60 }],
    });
    expect(stats.hp).toBeCloseTo(10487.5 * 1.1 + 2280, 5);
    expect(stats.def).toBeCloseTo(1185.53 * 1.2 + 60, 5);
  });

  it('expose les bonus de dégâts par attribut et par type d’attaque', () => {
    const stats = computeFinalStats({
      character: jiyan90,
      weapon: null,
      bonuses: [{ aeroDmg: 30 }, { aeroDmg: 10, heavyDmg: 9.4, allDmg: 12 }],
    });
    expect(stats.dmgBonus.aero).toBe(40);
    expect(stats.dmgBonus.heavy).toBe(9.4);
    expect(stats.dmgBonus.all).toBe(12);
    expect(stats.dmgBonus.fusion).toBe(0);
  });

  it('plus de bonus ne fait jamais baisser une stat (propriété)', () => {
    fc.assert(
      fc.property(
        fc.record({
          atkPct: fc.float({ min: 0, max: 200, noNaN: true }),
          atk: fc.float({ min: 0, max: 2000, noNaN: true }),
        }),
        fc.float({ min: 0, max: 100, noNaN: true }),
        (bonus, extra) => {
          const a = computeFinalStats({ character: jiyan90, weapon: verdant90, bonuses: [bonus] });
          const b = computeFinalStats({
            character: jiyan90,
            weapon: verdant90,
            bonuses: [bonus, { atkPct: extra }],
          });
          expect(b.atk).toBeGreaterThanOrEqual(a.atk);
        },
      ),
    );
  });
});
