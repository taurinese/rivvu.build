import { stepIndex } from './levels';
import type { LevelStep } from './levels';
import type { StatKey } from './types';

export interface BaseTriplet {
  hp: number;
  atk: number;
  def: number;
}

/** Sous-ensemble des courbes de niveau dont le moteur a besoin (structurellement compatible avec les données). */
export interface LevelCurves {
  character: readonly (LevelStep & BaseTriplet)[];
  weaponAtk: readonly (LevelStep & { ratio: number })[];
  weaponSecondary: readonly { level: number; ratio: number }[];
}

export interface WeaponBase {
  baseAtk: number;
  secondary: { stat: StatKey; base: number };
}

export interface WeaponLevelStats {
  atk: number;
  secondary: { stat: StatKey; value: number };
}

/** Stats de base d'un Résonateur à un palier : base niveau 1 × multiplicateur du palier. */
export function characterBaseStats(
  base: BaseTriplet,
  step: LevelStep,
  curves: LevelCurves,
): BaseTriplet {
  const mult = curves.character[stepIndex(step)];
  if (!mult) throw new RangeError('Courbe de personnage incomplète');
  return { hp: base.hp * mult.hp, atk: base.atk * mult.atk, def: base.def * mult.def };
}

/** ATQ et stat secondaire d'une arme à un palier. */
export function weaponStats(
  weapon: WeaponBase,
  step: LevelStep,
  curves: LevelCurves,
): WeaponLevelStats {
  const atkRatio = curves.weaponAtk[stepIndex(step)]?.ratio;
  const secondaryRatio = curves.weaponSecondary.find((s) => s.level === step.level)?.ratio;
  if (atkRatio === undefined || secondaryRatio === undefined) {
    throw new RangeError(`Courbe d'arme incomplète au niveau ${step.level}`);
  }
  return {
    atk: weapon.baseAtk * atkRatio,
    secondary: { stat: weapon.secondary.stat, value: weapon.secondary.base * secondaryRatio },
  };
}
