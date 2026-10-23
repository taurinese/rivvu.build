import type { FinalStats } from '@/domain/stats';
import type { Element } from '@/domain/types';

export type CompareKey =
  'hp' | 'atk' | 'def' | 'energyRegen' | 'critRate' | 'critDmg' | 'elementDmg' | 'amplify';

export interface CompareRow {
  key: CompareKey;
  a: number;
  b: number;
  /** B − A. */
  delta: number;
  percent: boolean;
}

export interface CompareSide {
  stats: FinalStats;
  element: Element;
}

const PICK: [CompareKey, boolean, (side: CompareSide) => number][] = [
  ['hp', false, (s) => s.stats.hp],
  ['atk', false, (s) => s.stats.atk],
  ['def', false, (s) => s.stats.def],
  ['energyRegen', true, (s) => s.stats.energyRegen],
  ['critRate', true, (s) => s.stats.critRate],
  ['critDmg', true, (s) => s.stats.critDmg],
  ['elementDmg', true, (s) => s.stats.dmgBonus[s.element]],
  ['amplify', true, (s) => s.stats.amplify],
];

/** Stats clés de deux builds côte à côte ; le bonus d'attribut est celui de chaque Résonateur. */
export function compareStats(a: CompareSide, b: CompareSide): CompareRow[] {
  return PICK.map(([key, percent, pick]) => {
    const va = pick(a);
    const vb = pick(b);
    return { key, a: va, b: vb, delta: vb - va, percent };
  });
}

/** Sens de l'écart, avec une tolérance sous la précision affichée (0,1). */
export function deltaTone(delta: number): 'up' | 'down' | 'same' {
  if (Math.abs(delta) < 0.05) return 'same';
  return delta > 0 ? 'up' : 'down';
}
