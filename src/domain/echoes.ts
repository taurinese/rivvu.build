/**
 * Règles des Échos. Source : wiki, page « Echo/Stats » (valeurs 5★ au niveau +25).
 * https://wutheringwaves.fandom.com/wiki/Echo/Stats
 */
import { ELEMENTS, elementDmgKey, isStatKey } from './types';
import type { StatBlock, StatKey } from './types';

export type EchoCost = 1 | 3 | 4;

export const MAX_ECHOES = 5;
export const MAX_COST = 12;
export const MAX_SUBSTATS = 5;

export interface Substat {
  stat: StatKey;
  value: number;
}

/** Un Écho équipé (instance possédée par le joueur). */
export interface EchoInstance {
  /** Identifiant unique de l'instance (UUID). */
  uid: string;
  /** Espèce d'Écho (identifiant des données du jeu). */
  echoId: string;
  cost: EchoCost;
  /** Ensemble de sonate choisi parmi ceux possibles pour cette espèce. */
  sonata: string;
  mainStat: StatKey;
  substats: Substat[];
}

const elementalMainStats = Object.fromEntries(ELEMENTS.map((e) => [elementDmgKey(e), 30]));

/** Stat principale (choisie) au niveau +25, par coût. */
export const MAIN_STAT_VALUES: Record<EchoCost, StatBlock> = {
  4: { critRate: 22, critDmg: 44, atkPct: 33, hpPct: 33, defPct: 41.5, healingBonus: 26 },
  3: { ...elementalMainStats, atkPct: 30, hpPct: 30, defPct: 38, energyRegen: 32 },
  1: { hpPct: 22.8, atkPct: 18, defPct: 18 },
};

/** Stat principale secondaire, fixée par le coût, au niveau +25. */
export const SECONDARY_MAIN_STAT: Record<EchoCost, Substat> = {
  4: { stat: 'atk', value: 150 },
  3: { stat: 'atk', value: 100 },
  1: { stat: 'hp', value: 2280 },
};

const percentTiers = [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6];

/** Valeurs possibles de chaque sous-stat (paliers fixes du jeu). */
export const SUBSTAT_TIERS: Partial<Record<StatKey, readonly number[]>> = {
  critRate: [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5],
  critDmg: [12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21],
  atkPct: percentTiers,
  hpPct: percentTiers,
  defPct: [8.1, 9, 10, 10.9, 11.8, 12.8, 13.8, 14.7],
  energyRegen: [6.8, 7.6, 8.4, 9.2, 10, 10.8, 11.6, 12.4],
  basicDmg: percentTiers,
  heavyDmg: percentTiers,
  skillDmg: percentTiers,
  liberationDmg: percentTiers,
  atk: [30, 40, 50, 60],
  hp: [320, 360, 390, 430, 470, 510, 540, 580],
  def: [40, 50, 60, 70],
};

export function echoStatBlock(echo: EchoInstance): StatBlock {
  const block: StatBlock = {};
  const add = (stat: StatKey, value: number) => {
    if (!isStatKey(stat)) return;
    block[stat] = (block[stat] ?? 0) + value;
  };
  add(echo.mainStat, MAIN_STAT_VALUES[echo.cost][echo.mainStat] ?? 0);
  const secondary = SECONDARY_MAIN_STAT[echo.cost];
  add(secondary.stat, secondary.value);
  for (const substat of echo.substats) add(substat.stat, substat.value);
  return block;
}

/** Valeur crit. des sous-stats : 2 × Taux crit. + DGT crit. */
export function critValue(echo: EchoInstance): number {
  return echo.substats.reduce((sum, { stat, value }) => {
    if (stat === 'critRate') return sum + 2 * value;
    if (stat === 'critDmg') return sum + value;
    return sum;
  }, 0);
}

/** Nombre de pièces par ensemble : une même espèce d'Écho ne compte qu'une fois par ensemble. */
export function sonataPieceCounts(loadout: readonly EchoInstance[]): Record<string, number> {
  const species = new Map<string, Set<string>>();
  for (const echo of loadout) {
    const set = species.get(echo.sonata) ?? new Set<string>();
    set.add(echo.echoId);
    species.set(echo.sonata, set);
  }
  return Object.fromEntries([...species].map(([sonata, ids]) => [sonata, ids.size]));
}

export type LoadoutIssue =
  | { code: 'too-many-echoes' }
  | { code: 'cost-exceeded'; cost: number }
  | { code: 'invalid-main-stat'; uid: string }
  | { code: 'too-many-substats'; uid: string }
  | { code: 'invalid-substat-value'; uid: string; stat: StatKey }
  | { code: 'duplicate-substat'; uid: string; stat: StatKey };

export function validateLoadout(loadout: readonly EchoInstance[]): LoadoutIssue[] {
  const issues: LoadoutIssue[] = [];
  if (loadout.length > MAX_ECHOES) issues.push({ code: 'too-many-echoes' });
  const cost = loadout.reduce((sum, e) => sum + e.cost, 0);
  if (cost > MAX_COST) issues.push({ code: 'cost-exceeded', cost });

  for (const echo of loadout) {
    if (MAIN_STAT_VALUES[echo.cost][echo.mainStat] === undefined) {
      issues.push({ code: 'invalid-main-stat', uid: echo.uid });
    }
    if (echo.substats.length > MAX_SUBSTATS)
      issues.push({ code: 'too-many-substats', uid: echo.uid });
    const seen = new Set<StatKey>();
    for (const { stat, value } of echo.substats) {
      const tiers = SUBSTAT_TIERS[stat];
      if (!tiers?.some((tier) => Math.abs(tier - value) < 1e-6)) {
        issues.push({ code: 'invalid-substat-value', uid: echo.uid, stat });
      }
      if (seen.has(stat)) issues.push({ code: 'duplicate-substat', uid: echo.uid, stat });
      seen.add(stat);
    }
  }
  return issues;
}
