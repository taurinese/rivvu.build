import { describe, expect, it } from 'vitest';
import { createBuild } from '@/domain/build';
import { computeBuildStats } from '@/features/builds/build-stats';
import { compareStats, deltaTone } from './compare';

const now = '2026-10-23T12:00:00.000Z';
const jiyan = createBuild({ id: 'a', resonatorId: 'jiyan', now });
const withWeapon = {
  ...jiyan,
  id: 'b',
  weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
};

describe('compareStats', () => {
  it('aligne les stats des deux builds et calcule l’écart de B par rapport à A', () => {
    const rows = compareStats(
      { stats: computeBuildStats(jiyan).stats, element: 'aero' },
      { stats: computeBuildStats(withWeapon).stats, element: 'aero' },
    );
    const atk = rows.find((r) => r.key === 'atk')!;
    expect(atk.b).toBeGreaterThan(atk.a);
    expect(atk.delta).toBeCloseTo(atk.b - atk.a, 6);
    expect(rows.find((r) => r.key === 'critDmg')?.delta).toBeCloseTo(48.6, 1);
    expect(rows.map((r) => r.key)).toEqual([
      'hp',
      'atk',
      'def',
      'energyRegen',
      'critRate',
      'critDmg',
      'elementDmg',
      'amplify',
    ]);
  });

  it('compare le bonus de l’attribut propre à chaque Résonateur', () => {
    const stats = computeBuildStats(jiyan).stats;
    const boosted = { ...stats, dmgBonus: { ...stats.dmgBonus, fusion: 30, aero: 0 } };
    const row = compareStats(
      { stats, element: 'aero' },
      { stats: boosted, element: 'fusion' },
    ).find((r) => r.key === 'elementDmg')!;
    expect(row).toMatchObject({ a: stats.dmgBonus.aero, b: 30 });
  });
});

describe('deltaTone', () => {
  it('signale un gain, une perte ou une égalité (arrondie à l’affichage)', () => {
    expect(deltaTone(12)).toBe('up');
    expect(deltaTone(-0.4)).toBe('down');
    expect(deltaTone(0.04)).toBe('same');
  });
});
