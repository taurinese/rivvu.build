/**
 * Optimiseur de combinaison d'Échos, indépendant de l'objectif : on lui donne des candidats
 * et une fonction d'évaluation (ex. dégâts moyens d'une compétence), il renvoie les meilleures
 * combinaisons valides (≤ 5 Échos, coût total ≤ 12).
 *
 * Recherche exhaustive sur un sous-ensemble : chaque candidat est d'abord évalué seul, puis
 * on garde les meilleurs de chaque coût (et de chaque ensemble, pour ne pas rater un bonus
 * de set) en réduisant la sélection jusqu'à tenir dans le budget d'évaluations.
 */
import type { EchoCost } from './echoes';
import { MAX_COST, MAX_ECHOES } from './echoes';

const COSTS: readonly EchoCost[] = [4, 3, 1];

export interface OptimizeCandidate {
  uid: string;
  cost: EchoCost;
}

export interface OptimizeOptions<T extends OptimizeCandidate> {
  candidates: readonly T[];
  evaluate: (loadout: readonly T[]) => number;
  /** Clé de regroupement (ensemble de sonate) : les meilleurs de chaque groupe sont conservés. */
  groupOf?: (candidate: T) => string;
  maxCost?: number;
  maxEchoes?: number;
  /** Nombre de résultats renvoyés. */
  keep?: number;
  /** Plafond d'évaluations de combinaisons (hors évaluation individuelle des candidats). */
  maxEvaluations?: number;
}

export interface OptimizeResult<T> {
  loadout: T[];
  value: number;
}

/** Répartitions de coûts possibles, triées par coût décroissant (ex. [4, 3, 3, 1, 1]). */
export function costPatterns(maxCost = MAX_COST, maxEchoes = MAX_ECHOES): EchoCost[][] {
  const patterns: EchoCost[][] = [];
  for (let n4 = 0; n4 <= maxEchoes; n4++)
    for (let n3 = 0; n3 + n4 <= maxEchoes; n3++)
      for (let n1 = 0; n1 + n3 + n4 <= maxEchoes; n1++) {
        const count = n4 + n3 + n1;
        if (count === 0 || 4 * n4 + 3 * n3 + n1 > maxCost) continue;
        patterns.push([
          ...Array<EchoCost>(n4).fill(4),
          ...Array<EchoCost>(n3).fill(3),
          ...Array<EchoCost>(n1).fill(1),
        ]);
      }
  return patterns;
}

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return Math.round(result);
}

function* combinations<T>(items: readonly T[], k: number, start = 0): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = start; i <= items.length - k; i++) {
    const head = items[i] as T;
    for (const tail of combinations(items, k - 1, i + 1)) yield [head, ...tail];
  }
}

function* product<T>(lists: readonly (readonly T[][])[]): Generator<T[]> {
  const [first, ...rest] = lists;
  if (!first) {
    yield [];
    return;
  }
  const tails = [...product(rest)];
  for (const head of first) for (const tail of tails) yield [...head, ...tail];
}

export function optimizeLoadout<T extends OptimizeCandidate>({
  candidates,
  evaluate,
  groupOf,
  maxCost = MAX_COST,
  maxEchoes = MAX_ECHOES,
  keep = 5,
  maxEvaluations = 50_000,
}: OptimizeOptions<T>): OptimizeResult<T>[] {
  if (candidates.length === 0) return [];

  const scored = candidates
    .map((candidate) => ({ candidate, score: evaluate([candidate]) }))
    .sort((a, b) => b.score - a.score);
  const byCost = (cost: EchoCost) => scored.filter((s) => s.candidate.cost === cost);
  type Pool = Record<EchoCost, T[]>;

  // Ensembles prometteurs : au moins deux candidats, classés par la somme de leurs 5 meilleurs.
  const members = new Map<string, number[]>();
  if (groupOf)
    for (const { candidate, score } of scored) {
      const group = groupOf(candidate);
      members.set(group, [...(members.get(group) ?? []), score]);
    }
  const rankedGroups = [...members]
    .filter(([, scores]) => scores.length >= 2)
    .map(([group, scores]) => ({ group, potential: scores.slice(0, 5).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.potential - a.potential)
    .map((g) => g.group);

  /** Les `topK` meilleurs de chaque coût + `perGroup` pièces des `groups` meilleurs ensembles. */
  const prune = (topK: number, perGroup: number, groups: number): Pool => {
    const favored = new Set(rankedGroups.slice(0, groups));
    const pool: Pool = { 1: [], 3: [], 4: [] };
    for (const cost of COSTS) {
      const ranked = byCost(cost);
      const kept = new Set(ranked.slice(0, topK));
      const seen = new Map<string, number>();
      for (const entry of ranked) {
        const group = groupOf?.(entry.candidate);
        if (group === undefined || !favored.has(group)) continue;
        const n = seen.get(group) ?? 0;
        if (n < perGroup) kept.add(entry);
        seen.set(group, n + 1);
      }
      // Ordre de score conservé.
      pool[cost] = ranked.filter((e) => kept.has(e)).map((e) => e.candidate);
    }
    return pool;
  };

  const patterns = costPatterns(maxCost, maxEchoes);
  const countOf = (pattern: EchoCost[], cost: EchoCost) => pattern.filter((c) => c === cost).length;
  const total = (pool: Pool) =>
    patterns.reduce(
      (sum, p) =>
        sum + COSTS.reduce<number>((prod, c) => prod * binomial(pool[c].length, countOf(p, c)), 1),
      0,
    );

  // Plus grande sélection qui tient dans le budget, en réduisant d'abord la part des ensembles.
  const largest = Math.max(...COSTS.map((c) => byCost(c).length));
  let pool = prune(1, 0, 0);
  search: for (const [perGroup, groups] of [
    [2, 3],
    [1, 3],
    [0, 0],
  ] as const) {
    for (let topK = largest; topK >= 1; topK--) {
      const candidate = prune(topK, perGroup, groups);
      if (total(candidate) <= maxEvaluations) {
        pool = candidate;
        break search;
      }
    }
  }

  const best: OptimizeResult<T>[] = [];
  let evaluations = 0;
  for (const pattern of patterns) {
    const lists = COSTS.filter((c) => countOf(pattern, c) > 0).map((c) => [
      ...combinations(pool[c], countOf(pattern, c)),
    ]);
    if (lists.some((l) => l.length === 0)) continue;
    for (const loadout of product(lists)) {
      if (evaluations++ >= maxEvaluations) break;
      const value = evaluate(loadout);
      if (best.length < keep || value > (best[best.length - 1]?.value ?? -Infinity)) {
        best.push({ loadout, value });
        best.sort((a, b) => b.value - a.value);
        if (best.length > keep) best.pop();
      }
    }
  }
  return best;
}
