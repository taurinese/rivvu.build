import { describe, expect, it } from 'vitest';
import { resonatorById } from '@/data/game';
import { skills } from '@/data/skills';
import { createBuild } from '@/domain/build';
import { computeHit, defMultiplier } from '@/domain/damage';
import { computeBuildStats } from '@/features/builds/build-stats';
import { resonatorSkills, skillDamage, strongestHit } from './skill-damage';

const jiyan = resonatorById.get('jiyan')!;
const build = {
  ...createBuild({ id: 'b', resonatorId: 'jiyan', now: '2026-10-23T12:00:00.000Z' }),
  weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
};

describe('resonatorSkills', () => {
  it('liste les compétences qui infligent des dégâts, dans l’ordre du jeu (l’Outro de Jiyan est un buff)', () => {
    expect(resonatorSkills('jiyan').map((s) => s.type)).toEqual([
      'basic',
      'skill',
      'circuit',
      'liberation',
      'intro',
    ]);
  });
});

describe('skillDamage', () => {
  const liberation = skills.find((s) => s.resonatorId === 'jiyan' && s.type === 'liberation')!;

  it('Libération de Jiyan : compte en attaque lourde, au niveau de Forte du build', () => {
    const { stats } = computeBuildStats(build);
    const [first] = skillDamage(build, stats, liberation, jiyan);
    expect(first?.damageType).toBe('heavy');
    const expected = computeHit({
      scalingValue: stats.atk,
      motionValue: 0.6552 * 8,
      dmgBonus: stats.dmgBonus.aero + stats.dmgBonus.heavy + stats.dmgBonus.all,
      amplify: stats.amplify,
      critRate: stats.critRate,
      critDmg: stats.critDmg,
      attackerLevel: 90,
      enemy: { level: 90, res: 0.1 },
    });
    expect(first?.normal).toBeCloseTo(expected.normal, 6);
    expect(first?.average).toBeCloseTo(expected.average, 6);
  });

  it('suit le niveau de Forte et l’ennemi choisis', () => {
    const { stats } = computeBuildStats(build);
    const at10 = skillDamage(build, stats, liberation, jiyan)[0]!.normal;
    const at1 = skillDamage(
      { ...build, forte: { ...build.forte, liberation: 1 } },
      stats,
      liberation,
      jiyan,
    )[0]!.normal;
    expect(at1 / at10).toBeCloseTo(0.3295 / 0.6552, 6);
    const tanky = skillDamage(
      { ...build, enemy: { level: 100, res: 40 } },
      stats,
      liberation,
      jiyan,
    )[0]!.normal;
    const ratio =
      (defMultiplier({ attackerLevel: 90, enemyLevel: 100 }) * 0.6) /
      (defMultiplier({ attackerLevel: 90, enemyLevel: 90 }) * 0.9);
    expect(tanky / at10).toBeCloseTo(ratio, 6);
  });
});

describe('strongestHit', () => {
  it('renvoie la ligne de dégâts moyenne la plus élevée, avec sa compétence', () => {
    const { stats } = computeBuildStats(build);
    const best = strongestHit(build, stats, jiyan);
    const all = resonatorSkills('jiyan').flatMap((skill) =>
      skillDamage(build, stats, skill, jiyan).map((row) => row.average),
    );
    expect(best?.row.average).toBe(Math.max(...all));
    expect(best?.skill.resonatorId).toBe('jiyan');
  });

  it('renvoie null sans donnée de compétence', () => {
    const { stats } = computeBuildStats(build);
    expect(strongestHit(build, stats, { ...jiyan, id: 'inconnu' })).toBeNull();
  });
});

describe('skillDamage — mise à l’échelle et niveau', () => {
  const { stats } = computeBuildStats(build);
  const base = {
    ...skills.find((s) => s.resonatorId === 'jiyan')!,
    rows: [
      {
        label: 'Test DMG',
        damageType: 'skill' as const,
        damageTypeInferred: false,
        values: [0.1, 0.2, 0.3],
        assumedPercent: false,
      },
    ],
  };

  it('utilise les PV ou la DÉF selon la compétence', () => {
    const atk = skillDamage(build, stats, { ...base, type: 'skill', scaling: 'atk' }, jiyan)[0]!;
    const hp = skillDamage(build, stats, { ...base, type: 'skill', scaling: 'hp' }, jiyan)[0]!;
    const def = skillDamage(build, stats, { ...base, type: 'skill', scaling: 'def' }, jiyan)[0]!;
    expect(hp.normal / atk.normal).toBeCloseTo(stats.hp / stats.atk, 6);
    expect(def.normal / atk.normal).toBeCloseTo(stats.def / stats.atk, 6);
  });

  it('prend la dernière valeur connue au-delà des données, le niveau 1 sans emplacement de Forte', () => {
    const skill = skillDamage(build, stats, { ...base, type: 'skill', scaling: 'atk' }, jiyan)[0]!;
    expect(skill.motionValue).toBe(0.3);
    const outro = skillDamage(build, stats, { ...base, type: 'outro', scaling: 'atk' }, jiyan)[0]!;
    expect(outro.motionValue).toBe(0.1);
  });
});
