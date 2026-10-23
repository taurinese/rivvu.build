import { skills } from '@/data/skills';
import type { Resonator, Skill } from '@/data/schema';
import type { Build, ForteSkill } from '@/domain/build';
import { computeHit, hitDmgBonus } from '@/domain/damage';
import type { FinalStats } from '@/domain/stats';
import type { AttackType } from '@/domain/types';

const ORDER: Skill['type'][] = [
  'basic',
  'skill',
  'circuit',
  'liberation',
  'intro',
  'outro',
  'inherent',
];

/** Niveau de Forte qui règle chaque type de compétence (l'Outro et les passifs n'ont qu'un niveau). */
const FORTE_SLOT: Partial<Record<Skill['type'], ForteSkill>> = {
  basic: 'normal',
  skill: 'skill',
  circuit: 'circuit',
  liberation: 'liberation',
  intro: 'intro',
};

export function resonatorSkills(resonatorId: string): Skill[] {
  return skills
    .filter((s) => s.resonatorId === resonatorId)
    .slice()
    .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
}

export interface RowDamage {
  label: string;
  damageType: AttackType;
  damageTypeInferred: boolean;
  assumedPercent: boolean;
  motionValue: number;
  normal: number;
  crit: number;
  average: number;
}

/** Dégâts de chaque ligne d'une compétence pour ce build, contre l'ennemi du build. */
export function skillDamage(
  build: Build,
  stats: FinalStats,
  skill: Skill,
  resonator: Resonator,
): RowDamage[] {
  const slot = FORTE_SLOT[skill.type];
  const level = slot ? build.forte[slot] : 1;
  const scalingValue =
    skill.scaling === 'hp' ? stats.hp : skill.scaling === 'def' ? stats.def : stats.atk;
  return skill.rows.map((row) => {
    const motionValue = row.values[Math.min(level, row.values.length) - 1] ?? 0;
    const hit = computeHit({
      scalingValue,
      motionValue,
      dmgBonus: hitDmgBonus(stats, resonator.element, row.damageType),
      amplify: stats.amplify,
      critRate: stats.critRate,
      critDmg: stats.critDmg,
      attackerLevel: build.level.level,
      enemy: { level: build.enemy.level, res: build.enemy.res / 100 },
    });
    return {
      label: row.label,
      damageType: row.damageType,
      damageTypeInferred: row.damageTypeInferred,
      assumedPercent: row.assumedPercent,
      motionValue,
      ...hit,
    };
  });
}

/** Ligne de dégâts moyenne la plus élevée du Résonateur (résumé de la fiche). */
export function strongestHit(
  build: Build,
  stats: FinalStats,
  resonator: Resonator,
): { skill: Skill; row: RowDamage } | null {
  let best: { skill: Skill; row: RowDamage } | null = null;
  for (const skill of resonatorSkills(resonator.id)) {
    for (const row of skillDamage(build, stats, skill, resonator)) {
      if (!best || row.average > best.row.average) best = { skill, row };
    }
  }
  return best;
}
