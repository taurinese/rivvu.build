import type { Element, StatKey, WeaponType } from '../../src/domain/types.ts';

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parsePercent(raw: string): number | null {
  const match = /-?\d+(?:\.\d+)?/.exec(raw.trim());
  return match ? Number(match[0]) : null;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

const ELEMENT_MAP: Record<string, Element> = {
  Aero: 'aero',
  Electro: 'electro',
  Fusion: 'fusion',
  Glacio: 'glacio',
  Havoc: 'havoc',
  Spectro: 'spectro',
};

const WEAPON_MAP: Record<string, WeaponType> = {
  Broadblade: 'broadblade',
  Sword: 'sword',
  Pistols: 'pistols',
  Gauntlets: 'gauntlets',
  Rectifier: 'rectifier',
};

/** Stat secondaire d'arme telle qu'écrite par le wiki → clé du moteur. */
const STAT_MAP: Record<string, StatKey> = {
  ATK: 'atkPct',
  HP: 'hpPct',
  DEF: 'defPct',
  'Crit. Rate': 'critRate',
  'Crit. DMG': 'critDmg',
  'Energy Regen': 'energyRegen',
};

export const toElement = (raw: string): Element | null => ELEMENT_MAP[raw.trim()] ?? null;
export const toWeaponType = (raw: string): WeaponType | null => WEAPON_MAP[raw.trim()] ?? null;
export const toStatKey = (raw: string): StatKey | null => STAT_MAP[raw.trim()] ?? null;

/** Nom affichable : sans guillemets droits ou typographiques parasites, espaces normalisés. */
export function cleanName(raw: string): string {
  return raw.replace(/["“”]/g, '').replace(/\s+/g, ' ').trim();
}
