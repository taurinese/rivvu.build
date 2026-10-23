/**
 * Planificateur de matériaux : ce qu'il reste à réunir entre l'état actuel d'un Résonateur
 * et l'objectif du build. Les coûts viennent du wiki (code des modules d'ascension et de Forte) ;
 * les emplacements (`common1`, `boss`…) sont résolus en objets par la couche données.
 * Non couverts : l'expérience (potions, cœurs d'énergie) et l'expérience d'arme.
 */
import { FORTE_SKILLS } from './build';
import type { ForteLevels } from './build';
import type { LevelStep } from './levels';

export interface CostStep {
  credits: number;
  items: readonly { slot: string; qty: number }[];
}

export interface PlanCosts {
  resonatorAscension: readonly CostStep[];
  /** Coûts de la rareté de l'arme du build (vide sans arme). */
  weaponAscension: readonly CostStep[];
  forte: readonly CostStep[];
  inherent: readonly CostStep[];
  statBonus: readonly CostStep[];
}

/** État d'avancement d'un Résonateur (actuel ou visé). */
export interface Progress {
  level: LevelStep;
  weaponLevel: LevelStep | null;
  forte: ForteLevels;
  /** Compétences innées débloquées, 0 à 2. */
  inherent: number;
  /** Nœuds de bonus de stats débloqués, par niveau (4 branches dans le jeu). */
  statBonus: { tier1: number; tier2: number };
}

export interface MaterialPlan {
  credits: number;
  /** Emplacement de matériau du Résonateur → quantité. */
  resonator: Record<string, number>;
  weapon: Record<string, number>;
}

export const STAT_BONUS_STRANDS = 4;
export const INHERENT_SKILLS = 2;

export function emptyProgress(): Progress {
  return {
    level: { level: 1, ascension: 0 },
    weaponLevel: { level: 1, ascension: 0 },
    forte: { normal: 1, skill: 1, circuit: 1, liberation: 1, intro: 1 },
    inherent: 0,
    statBonus: { tier1: 0, tier2: 0 },
  };
}

export function planMaterials(current: Progress, target: Progress, costs: PlanCosts): MaterialPlan {
  const plan: MaterialPlan = { credits: 0, resonator: {}, weapon: {} };
  const add = (into: Record<string, number>, step: CostStep | undefined, times = 1) => {
    if (!step || times <= 0) return;
    plan.credits += step.credits * times;
    for (const { slot, qty } of step.items) into[slot] = (into[slot] ?? 0) + qty * times;
  };
  /** Paliers `from` (inclus) à `to` (exclu) d'une table de coûts. */
  const range = (
    into: Record<string, number>,
    steps: readonly CostStep[],
    from: number,
    to: number,
  ) => {
    for (let i = from; i < to; i++) add(into, steps[i]);
  };

  range(plan.resonator, costs.resonatorAscension, current.level.ascension, target.level.ascension);
  if (target.weaponLevel)
    range(
      plan.weapon,
      costs.weaponAscension,
      current.weaponLevel?.ascension ?? 0,
      target.weaponLevel.ascension,
    );
  for (const skill of FORTE_SKILLS)
    range(plan.resonator, costs.forte, current.forte[skill] - 1, target.forte[skill] - 1);
  range(plan.resonator, costs.inherent, current.inherent, target.inherent);
  add(plan.resonator, costs.statBonus[0], target.statBonus.tier1 - current.statBonus.tier1);
  add(plan.resonator, costs.statBonus[1], target.statBonus.tier2 - current.statBonus.tier2);
  return plan;
}
