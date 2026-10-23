import { MAIN_STAT_VALUES, MAX_COST, SUBSTAT_TIERS, sonataPieceCounts } from '@/domain/echoes';
import type { EchoCost, EchoInstance, Substat } from '@/domain/echoes';
import { ELEMENTS } from '@/domain/types';
import type { Element, StatKey } from '@/domain/types';

const MAIN_STAT_ORDER: StatKey[] = [
  'critRate',
  'critDmg',
  ...ELEMENTS.map((e) => `${e}Dmg` as const),
  'energyRegen',
  'atkPct',
  'hpPct',
  'defPct',
  'healingBonus',
];

/** Stats principales possibles pour un coût, dans l'ordre d'affichage. */
export function allowedMainStats(cost: EchoCost): StatKey[] {
  const values = MAIN_STAT_VALUES[cost];
  return MAIN_STAT_ORDER.filter((stat) => values[stat] !== undefined);
}

const DEFAULT_MAIN_STAT: Record<EchoCost, (element: Element) => StatKey> = {
  4: () => 'critRate',
  3: (element) => `${element}Dmg`,
  1: () => 'atkPct',
};

interface EchoSpecies {
  id: string;
  cost: EchoCost;
  sonatas: readonly string[];
}

/** Nouvel Écho équipé à partir d'une espèce, avec des choix par défaut cohérents. */
export function newEchoInstance(
  species: EchoSpecies,
  uid: string,
  element: Element,
  preferredSonata?: string,
): EchoInstance {
  const sonata =
    preferredSonata && species.sonatas.includes(preferredSonata)
      ? preferredSonata
      : (species.sonatas[0] ?? '');
  return {
    uid,
    echoId: species.id,
    cost: species.cost,
    sonata,
    mainStat: DEFAULT_MAIN_STAT[species.cost](element),
    substats: [],
  };
}

/** Sous-stats encore disponibles pour cet Écho (`keep` reste proposée : c'est celle qu'on modifie). */
export function availableSubstats(echo: EchoInstance, keep?: StatKey): StatKey[] {
  const used = new Set(echo.substats.map((s) => s.stat).filter((s) => s !== keep));
  return (Object.keys(SUBSTAT_TIERS) as StatKey[]).filter((stat) => !used.has(stat));
}

/** Qualité d'un jet : rang du palier / nombre de paliers (0 si la valeur n'est pas un palier). */
export function substatQuality({ stat, value }: Substat): number {
  const tiers = SUBSTAT_TIERS[stat] ?? [];
  const index = tiers.findIndex((tier) => Math.abs(tier - value) < 1e-6);
  return index === -1 ? 0 : (index + 1) / tiers.length;
}

export function remainingCost(loadout: readonly EchoInstance[], ignoreUid?: string): number {
  return MAX_COST - loadout.filter((e) => e.uid !== ignoreUid).reduce((sum, e) => sum + e.cost, 0);
}

/** Place un Écho en premier (Écho principal). */
export function setPrincipal(loadout: readonly EchoInstance[], uid: string): EchoInstance[] {
  const target = loadout.find((e) => e.uid === uid);
  return target ? [target, ...loadout.filter((e) => e.uid !== uid)] : [...loadout];
}

interface SonataEffects {
  id: string;
  effects: readonly { pieces: number; text: string }[];
}

/** Ensembles présents dans l'équipement, avec les effets atteints. Tri : plus de pièces d'abord. */
export function activeSonatas(loadout: readonly EchoInstance[], sonatas: readonly SonataEffects[]) {
  const counts = sonataPieceCounts(loadout);
  return Object.entries(counts)
    .flatMap(([id, pieces]) => {
      const sonata = sonatas.find((s) => s.id === id);
      return sonata
        ? [
            {
              id,
              pieces,
              effects: sonata.effects.map((e) => ({ ...e, active: pieces >= e.pieces })),
            },
          ]
        : [];
    })
    .sort((a, b) => b.pieces - a.pieces);
}
