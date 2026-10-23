import { describe, expect, it } from 'vitest';
import { MAX_LEVEL_STEP } from './levels';
import { emptyProgress, planMaterials } from './planner';
import type { PlanCosts } from './planner';

const step = (credits: number, items: [string, number][] = []) => ({
  credits,
  items: items.map(([slot, qty]) => ({ slot, qty })),
});

const costs: PlanCosts = {
  resonatorAscension: [1, 2, 3, 4, 5, 6].map((n) => step(n * 1000, [['common1', n]])),
  weaponAscension: [1, 2, 3, 4, 5, 6].map((n) => step(n * 100, [['ascension1', n]])),
  // Coûts réels du wiki (Module:Skill Upgrade) pour une compétence : 280 000 Coquilles de 1 à 10.
  forte: [1500, 2000, 4500, 6000, 16000, 30000, 50000, 70000, 100000].map((c) =>
    step(c, [['forte1', 1]]),
  ),
  inherent: [step(10000, [['weeklyBoss', 1]]), step(20000, [['weeklyBoss', 1]])],
  statBonus: [step(50000, [['forte3', 3]]), step(100000, [['forte4', 3]])],
};

const maxed = {
  level: MAX_LEVEL_STEP,
  weaponLevel: MAX_LEVEL_STEP,
  forte: { normal: 10, skill: 10, circuit: 10, liberation: 10, intro: 10 },
  inherent: 2,
  statBonus: { tier1: 4, tier2: 4 },
};

describe('planMaterials', () => {
  it('additionne tout ce qui manque entre l’état actuel et l’objectif', () => {
    const plan = planMaterials(emptyProgress(), maxed, costs);
    // Ascensions 21 000 + arme 2 100 + Forte 5 × 280 000 + innées 30 000 + bonus 4 × 150 000.
    expect(plan.credits).toBe(21000 + 2100 + 5 * 280000 + 30000 + 4 * 150000);
    expect(plan.resonator).toEqual({
      common1: 21,
      forte1: 45,
      weeklyBoss: 2,
      forte3: 12,
      forte4: 12,
    });
    expect(plan.weapon).toEqual({ ascension1: 21 });
  });

  it('ne compte que ce qui reste à monter', () => {
    const current = {
      ...maxed,
      level: { level: 70, ascension: 4 },
      forte: { ...maxed.forte, liberation: 8 },
      statBonus: { tier1: 4, tier2: 3 },
    };
    const plan = planMaterials(current, maxed, costs);
    expect(plan.credits).toBe(5000 + 6000 + 70000 + 100000 + 100000);
    expect(plan.resonator).toEqual({ common1: 11, forte1: 2, forte4: 3 });
    expect(plan.weapon).toEqual({});
  });

  it('ne compte rien si l’état actuel dépasse déjà l’objectif, et ignore l’arme absente', () => {
    const plan = planMaterials(maxed, { ...emptyProgress(), weaponLevel: null }, costs);
    expect(plan).toEqual({ credits: 0, resonator: {}, weapon: {} });
  });
});

describe('emptyProgress', () => {
  it('part d’un Résonateur niveau 1 sans ascension ni Forte', () => {
    expect(emptyProgress()).toEqual({
      level: { level: 1, ascension: 0 },
      weaponLevel: { level: 1, ascension: 0 },
      forte: { normal: 1, skill: 1, circuit: 1, liberation: 1, intro: 1 },
      inherent: 0,
      statBonus: { tier1: 0, tier2: 0 },
    });
  });
});
