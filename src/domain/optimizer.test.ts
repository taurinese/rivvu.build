import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { EchoCost } from './echoes';
import { costPatterns, optimizeLoadout } from './optimizer';

interface Item {
  uid: string;
  cost: EchoCost;
  power: number;
  group: string;
}

const item = (uid: string, cost: EchoCost, power: number, group = 'x'): Item => ({
  uid,
  cost,
  power,
  group,
});

/** Objectif simple : somme des puissances, +50 si 2 pièces d'un même groupe. */
const additive = (loadout: readonly Item[]) => {
  const sum = loadout.reduce((s, e) => s + e.power, 0);
  const groups = new Map<string, number>();
  for (const e of loadout) groups.set(e.group, (groups.get(e.group) ?? 0) + 1);
  return sum + ([...groups.values()].some((n) => n >= 2) ? 50 : 0);
};

describe('costPatterns', () => {
  it('liste les répartitions de coûts valides (≤ 5 Échos, coût ≤ 12), les plus complètes', () => {
    const patterns = costPatterns(12, 5).map((p) => p.join('-'));
    expect(patterns).toContain('4-3-3-1-1');
    expect(patterns).toContain('4-4-1-1-1');
    expect(patterns).toContain('4-4-4');
    expect(patterns).not.toContain('4-4-4-1');
    for (const p of costPatterns(12, 5)) {
      expect(p.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(12);
      expect(p.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('optimizeLoadout', () => {
  it('trouve la meilleure combinaison qui respecte le coût', () => {
    const candidates = [
      item('a', 4, 10),
      item('b', 4, 9),
      item('c', 4, 1),
      item('d', 3, 6),
      item('e', 3, 5),
      item('f', 1, 2),
      item('g', 1, 1),
      item('h', 1, 1),
    ];
    const [best] = optimizeLoadout({ candidates, evaluate: additive });
    // 4-4-3-1 = 10+9+6+2 = 27 > 4-3-3-1-1 = 24 > 4-4-1-1-1 = 23 (+50 : même groupe partout).
    expect(best?.loadout.map((e) => e.uid).sort()).toEqual(['a', 'b', 'd', 'f']);
    expect(best?.value).toBe(77);
  });

  it('sait préférer un ensemble à des pièces isolées plus fortes', () => {
    const candidates = [
      item('solo1', 4, 30, 'a'),
      item('solo2', 4, 29, 'b'),
      item('set1', 4, 5, 'c'),
      item('set2', 4, 5, 'c'),
    ];
    const evaluate = (loadout: readonly Item[]) =>
      loadout.reduce((s, e) => s + e.power, 0) +
      (loadout.filter((e) => e.group === 'c').length >= 2 ? 100 : 0);
    const [best] = optimizeLoadout({ candidates, evaluate, maxCost: 8, maxEchoes: 2 });
    expect(best?.loadout.map((e) => e.uid).sort()).toEqual(['set1', 'set2']);
  });

  it('garde les pièces d’un même ensemble même quand le budget force l’élagage', () => {
    const solos = Array.from({ length: 12 }, (_, i) =>
      item(`solo${String(i)}`, 4, 20 - i, `g${String(i)}`),
    );
    const candidates = [...solos, item('set1', 4, 1, 'set'), item('set2', 4, 1, 'set')];
    const evaluate = (loadout: readonly Item[]) =>
      loadout.reduce((s, e) => s + e.power, 0) +
      (loadout.filter((e) => e.group === 'set').length >= 2 ? 100 : 0);
    const options = { candidates, evaluate, maxCost: 8, maxEchoes: 2, maxEvaluations: 10 };
    const blind = optimizeLoadout(options)[0];
    expect(blind?.loadout.map((e) => e.uid)).not.toContain('set1');
    const aware = optimizeLoadout({ ...options, groupOf: (e) => e.group })[0];
    expect(aware?.loadout.map((e) => e.uid).sort()).toEqual(['set1', 'set2']);
  });

  it('renvoie plusieurs résultats distincts, du meilleur au moins bon', () => {
    const candidates = [item('a', 4, 3), item('b', 4, 2), item('c', 4, 1)];
    const results = optimizeLoadout({ candidates, evaluate: additive, keep: 3, maxCost: 4 });
    expect(results.map((r) => r.loadout[0]?.uid)).toEqual(['a', 'b', 'c']);
  });

  it('s’arrête au budget même quand l’élagage ne suffit pas', () => {
    const candidates = [item('a', 4, 1), item('b', 3, 1), item('c', 1, 1)];
    let calls = 0;
    const results = optimizeLoadout({
      candidates,
      evaluate: (l) => {
        calls++;
        return additive(l);
      },
      maxEvaluations: 2,
    });
    expect(calls).toBe(candidates.length + 2);
    expect(results).toHaveLength(2);
  });

  it('ne renvoie rien sans candidat', () => {
    expect(optimizeLoadout({ candidates: [], evaluate: additive })).toEqual([]);
  });

  it('respecte toujours les contraintes et le budget d’évaluations', () => {
    const arbItem = fc.record({
      cost: fc.constantFrom<EchoCost>(1, 3, 4),
      power: fc.integer({ min: 0, max: 100 }),
    });
    fc.assert(
      fc.property(fc.array(arbItem, { maxLength: 40 }), (raw) => {
        const candidates = raw.map((r, i) => item(String(i), r.cost, r.power));
        let calls = 0;
        const results = optimizeLoadout({
          candidates,
          evaluate: (l) => {
            calls++;
            return additive(l);
          },
          maxEvaluations: 3000,
        });
        expect(calls).toBeLessThanOrEqual(3000 + candidates.length);
        for (const { loadout } of results) {
          expect(loadout.reduce((s, e) => s + e.cost, 0)).toBeLessThanOrEqual(12);
          expect(loadout.length).toBeLessThanOrEqual(5);
          expect(new Set(loadout.map((e) => e.uid)).size).toBe(loadout.length);
        }
      }),
      { numRuns: 60 },
    );
  });
});
