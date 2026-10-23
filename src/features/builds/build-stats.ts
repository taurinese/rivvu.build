import { curves, resonatorById, sonataById, weaponById } from '@/data/game';
import { characterBaseStats, weaponStats } from '@/domain/base-stats';
import type { BaseTriplet, WeaponLevelStats } from '@/domain/base-stats';
import type { Build } from '@/domain/build';
import { echoStatBlock, sonataPieceCounts } from '@/domain/echoes';
import { computeFinalStats, sumStatBlocks } from '@/domain/stats';
import type { FinalStats } from '@/domain/stats';
import type { StatBlock } from '@/domain/types';

export interface BonusSource {
  kind: 'echoes' | 'set' | 'weapon' | 'buff';
  /** Libellé lisible : nom de l'ensemble, de l'arme ou du buff. */
  label: string;
  conditional: boolean;
  block: StatBlock;
}

export interface BuildStats {
  stats: FinalStats;
  character: BaseTriplet;
  weapon: WeaponLevelStats | null;
  /** Somme des apports des Échos équipés (stats principales et sous-stats). */
  echoBonus: StatBlock;
  /** Chaque apport compté, dans l'ordre : Échos, ensembles, passif d'arme, buffs. */
  sources: BonusSource[];
}

/** Stats d'un build : Résonateur, arme, Échos, ensembles, passif d'arme et buffs saisis. */
export function computeBuildStats(build: Build): BuildStats {
  const resonator = resonatorById.get(build.resonatorId);
  if (!resonator) throw new Error(`Résonateur inconnu : ${build.resonatorId}`);
  const character = characterBaseStats(resonator.base, build.level, curves);
  const weaponData = build.weapon ? weaponById.get(build.weapon.id) : undefined;
  const weapon =
    build.weapon && weaponData ? weaponStats(weaponData, build.weapon.level, curves) : null;
  const echoBonus = sumStatBlocks(build.echoes.map(echoStatBlock));

  const sources: BonusSource[] = [
    { kind: 'echoes', label: 'Échos', conditional: false, block: echoBonus },
  ];

  for (const [id, pieces] of Object.entries(sonataPieceCounts(build.echoes))) {
    const sonata = sonataById.get(id);
    for (const effect of sonata?.effects ?? []) {
      if (pieces < effect.pieces) continue;
      for (const bonus of effect.bonuses) {
        if (bonus.conditional && !build.combat) continue;
        sources.push({
          kind: 'set',
          label: `${sonata?.name.fr ?? id} (${String(effect.pieces)} p.)`,
          conditional: bonus.conditional,
          block: { [bonus.stat]: bonus.value },
        });
      }
    }
  }

  if (build.weapon && weaponData?.passive) {
    const row = weaponData.passive.values[build.weapon.rank - 1] ?? [];
    for (const bonus of weaponData.passive.bonuses) {
      if (bonus.conditional && !build.combat) continue;
      const value = (row[bonus.variable - 1] ?? 0) * (bonus.conditional ? bonus.stacks : 1);
      sources.push({
        kind: 'weapon',
        label: weaponData.name.fr,
        conditional: bonus.conditional,
        block: { [bonus.stat]: value },
      });
    }
  }

  for (const buff of build.customBuffs) {
    if (!buff.enabled) continue;
    sources.push({
      kind: 'buff',
      label: buff.label,
      conditional: false,
      block: { [buff.stat]: buff.value },
    });
  }

  return {
    stats: computeFinalStats({ character, weapon, bonuses: sources.map((s) => s.block) }),
    character,
    weapon,
    echoBonus,
    sources,
  };
}
