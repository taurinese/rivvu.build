import type { Element, StatKey, WeaponType } from '@/domain/types';

export const elementIcon = (element: Element) => `/assets/game/elements/${element}.webp`;
export const weaponTypeIcon = (type: WeaponType) => `/assets/game/weapon-types/${type}.webp`;

const STAT_ICON_KEY: Partial<Record<StatKey, string>> = {
  hpPct: 'hp',
  atkPct: 'atk',
  defPct: 'def',
  introDmg: 'skill-dmg',
  outroDmg: 'skill-dmg',
  coordinatedDmg: 'echo-dmg',
  allDmg: 'atk',
};

/** Icône officielle d'une stat (fichiers importés par scripts/import-game-data.ts). */
export function statIcon(stat: StatKey): string {
  const key = STAT_ICON_KEY[stat] ?? stat.replace(/([A-Z])/g, '-$1').toLowerCase();
  return `/assets/game/stats/${key}.webp`;
}
