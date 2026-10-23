import { describe, expect, it } from 'vitest';
import { createBuild } from '@/domain/build';
import { buildProgress } from './progress';

const build = createBuild({ id: 'b', resonatorId: 'jiyan', now: '2026-10-23T12:00:00.000Z' });
const echo = (uid: string, cost: 1 | 3 | 4) => ({
  uid,
  echoId: uid,
  cost,
  sonata: 'sierra-gale',
  mainStat: 'atkPct' as const,
  substats: [],
});

describe('buildProgress', () => {
  it('un build neuf a son Résonateur, son Forte et sa Chaîne (S0 est un choix valide)', () => {
    const progress = buildProgress(build);
    expect(progress.steps.map((s) => [s.id, s.done])).toEqual([
      ['resonator', true],
      ['weapon', false],
      ['forte', true],
      ['echoes', false],
    ]);
    expect(progress.done).toBe(2);
    expect(progress.total).toBe(4);
  });

  it('les Échos comptent comme faits avec 5 Échos ou le coût maximal atteint', () => {
    const four = [echo('a', 4), echo('b', 3), echo('c', 3), echo('d', 1)];
    expect(
      buildProgress({ ...build, echoes: four }).steps.find((s) => s.id === 'echoes')?.done,
    ).toBe(false);
    expect(
      buildProgress({ ...build, echoes: [...four, echo('e', 1)] }).steps.find(
        (s) => s.id === 'echoes',
      )?.done,
    ).toBe(true);
  });

  it('l’arme compte dès qu’elle est choisie', () => {
    const progress = buildProgress({
      ...build,
      weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
    });
    expect(progress.steps.find((s) => s.id === 'weapon')?.done).toBe(true);
  });
});
