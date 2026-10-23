/**
 * Formule de dégâts. Source : wiki, page « Damage » (https://wutheringwaves.fandom.com/wiki/Damage).
 *
 *   DMG = valeur de scaling × MV × (1 + bonus DGT) × (1 + amplification) × crit × DÉF% × RÉS%
 */
import type { FinalStats } from './stats';
import type { AttackType, Element } from './types';

export const enemyDef = (level: number) => 8 * level + 792;

export interface DefInput {
  attackerLevel: number;
  enemyLevel: number;
  /** Ignorance de DÉF, fraction (0.18 = 18 %). */
  defIgnore?: number;
  /** Réduction de DÉF de l'ennemi, fraction, appliquée avant la formule. */
  defReduction?: number;
}

/** DÉF% = (800 + 8 × niv.) / (800 + 8 × niv. + DÉF ennemie × (1 − ignorance)), plafonné à 200 %. */
export function defMultiplier({
  attackerLevel,
  enemyLevel,
  defIgnore = 0,
  defReduction = 0,
}: DefInput): number {
  const attacker = 800 + 8 * attackerLevel;
  const def = enemyDef(enemyLevel) * (1 - defReduction) * (1 - defIgnore);
  return Math.min(2, attacker / (attacker + def));
}

/** Multiplicateur de résistance (RÉS totale en fraction). */
export function resMultiplier(res: number): number {
  if (res < 0) return 1 - res / 2;
  if (res < 0.8) return 1 - res;
  return 1 / (1 + 5 * res);
}

/** Bonus de DGT (points de %) appliqué à un coup : attribut + type d'attaque + tous dégâts. */
export function hitDmgBonus(stats: FinalStats, element: Element, type: AttackType): number {
  return stats.dmgBonus[element] + stats.dmgBonus[type] + stats.dmgBonus.all;
}

export interface EnemyConfig {
  level: number;
  /** Résistance de base à l'attribut du coup, fraction (0.1 par défaut chez la plupart des ennemis). */
  res: number;
  defIgnore?: number;
  defReduction?: number;
  /** Pénétration de résistance de l'attaquant, fraction (soustraite à la RÉS). */
  resPen?: number;
}

export interface HitInput {
  /** Stat de scaling (ATQ, PV ou DÉF selon la compétence). */
  scalingValue: number;
  /** Multiplicateur de la compétence (1.5 = 150 %). */
  motionValue: number;
  /** Dégâts plats ajoutés à la base. */
  flatDmg?: number;
  /** Bonus de DGT total en points de %. */
  dmgBonus: number;
  /** Amplification totale en points de %. */
  amplify: number;
  critRate: number;
  critDmg: number;
  attackerLevel: number;
  enemy: EnemyConfig;
}

export interface HitResult {
  normal: number;
  crit: number;
  average: number;
}

export function computeHit(input: HitInput): HitResult {
  const { enemy } = input;
  const base = input.scalingValue * input.motionValue + (input.flatDmg ?? 0);
  const def = defMultiplier({
    attackerLevel: input.attackerLevel,
    enemyLevel: enemy.level,
    defIgnore: enemy.defIgnore ?? 0,
    defReduction: enemy.defReduction ?? 0,
  });
  const res = resMultiplier(enemy.res - (enemy.resPen ?? 0));
  const normal = base * (1 + input.dmgBonus / 100) * (1 + input.amplify / 100) * def * res;
  const crit = normal * (input.critDmg / 100);
  const rate = Math.min(1, Math.max(0, input.critRate / 100));
  return { normal, crit, average: normal * (1 - rate) + crit * rate };
}
