import { describe, expect, it } from 'vitest';
import { createBuild } from '@/domain/build';
import { emptyProgress } from '@/domain/planner';
import { materialPlan, plannerOf } from './plan-for-build';

const build = {
  ...createBuild({ id: 'b', resonatorId: 'jiyan', now: '2026-10-23T12:00:00.000Z' }),
  weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
};

describe('materialPlan', () => {
  it('Jiyan de zéro au maximum, avec Sommet verdoyant', () => {
    const plan = materialPlan(build);
    // Ascension 170 000 + arme 5★ 330 000 + Forte 5 × 280 000 + innées 30 000 + 4 × 150 000.
    expect(plan.credits).toBe(170000 + 330000 + 5 * 280000 + 30000 + 4 * 150000);
    const qty = (id: string) => plan.lines.find((l) => l.item?.id === id)?.qty;
    expect(qty('monument-bell')).toBe(5 * 4 + 2 + 4);
    expect(qty('roaring-rock-fist')).toBe(3 + 6 + 9 + 12 + 16);
    // Les noyaux servent au Résonateur et à l'arme : additionnés sur une seule ligne.
    expect(plan.lines.filter((l) => l.item?.id === 'lf-howler-core')).toHaveLength(1);
    expect(plan.lines[0]?.item?.id).not.toBe('shell-credit');
  });

  it('ne compte que ce qui reste, et signale un matériau inconnu du wiki', () => {
    const done = materialPlan({
      ...build,
      planner: {
        current: { ...plannerOf(build).target },
        inherent: 2,
        statBonus: { tier1: 4, tier2: 4 },
      },
    });
    expect(done).toEqual({ credits: 0, lines: [] });

    const hsin = materialPlan({ ...build, resonatorId: 'hsin', weapon: null });
    expect(hsin.lines.some((l) => l.item === null && l.slot === 'local')).toBe(true);
  });
});

describe('plannerOf', () => {
  it('part d’un Résonateur neuf quand le planificateur n’a jamais servi', () => {
    const { current, target } = plannerOf(build);
    expect(current).toEqual(emptyProgress());
    expect(target).toMatchObject({
      level: build.level,
      weaponLevel: build.weapon.level,
      forte: build.forte,
      inherent: 2,
      statBonus: { tier1: 4, tier2: 4 },
    });
  });
});
