import { curves, resonatorById, weaponById } from '@/data/game';
import { characterBaseStats, weaponStats } from '@/domain/base-stats';
import type { BaseTriplet, WeaponLevelStats } from '@/domain/base-stats';
import type { Build } from '@/domain/build';
import { echoStatBlock } from '@/domain/echoes';
import { computeFinalStats, sumStatBlocks } from '@/domain/stats';
import type { FinalStats } from '@/domain/stats';
import type { StatBlock } from '@/domain/types';

export interface BuildStats {
  stats: FinalStats;
  character: BaseTriplet;
  weapon: WeaponLevelStats | null;
  /** Somme des apports des Échos équipés. */
  echoBonus: StatBlock;
}

/** Stats d'un build à partir des données du jeu (Résonateur, arme, Échos). */
export function computeBuildStats(build: Build): BuildStats {
  const resonator = resonatorById.get(build.resonatorId);
  if (!resonator) throw new Error(`Résonateur inconnu : ${build.resonatorId}`);
  const character = characterBaseStats(resonator.base, build.level, curves);
  const weaponData = build.weapon ? weaponById.get(build.weapon.id) : undefined;
  const weapon =
    build.weapon && weaponData ? weaponStats(weaponData, build.weapon.level, curves) : null;
  const echoBonus = sumStatBlocks(build.echoes.map(echoStatBlock));
  return {
    stats: computeFinalStats({ character, weapon, bonuses: [echoBonus] }),
    character,
    weapon,
    echoBonus,
  };
}
