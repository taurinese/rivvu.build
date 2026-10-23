import type { BaseTriplet, WeaponLevelStats } from './base-stats';
import { ATTACK_TYPES, ELEMENTS } from './types';
import type { AttackType, Element, StatBlock, StatKey } from './types';

/** Source : wiki, pages « Crit. Rate » et « Crit. DMG ». */
export const BASE_CRIT_RATE = 5;
export const BASE_CRIT_DMG = 150;
/** Valeur affichée en jeu pour tous les Résonateurs. */
export const BASE_ENERGY_REGEN = 100;

export interface FinalStats {
  /** ATQ de base = personnage + arme (avant pourcentages). */
  baseAtk: number;
  baseHp: number;
  baseDef: number;
  hp: number;
  atk: number;
  def: number;
  critRate: number;
  critDmg: number;
  energyRegen: number;
  healingBonus: number;
  /** Bonus de dégâts en points de % : par attribut, par type d'attaque et « all » (tous dégâts). */
  dmgBonus: Record<Element | AttackType | 'all', number>;
}

export interface StatsInput {
  character: BaseTriplet;
  weapon: WeaponLevelStats | null;
  /** Tous les autres apports : Forte, Échos, ensembles, passifs, buffs d'équipe… */
  bonuses: readonly StatBlock[];
}

export function sumStatBlocks(blocks: readonly StatBlock[]): StatBlock {
  const total: StatBlock = {};
  for (const block of blocks) {
    for (const [key, value] of Object.entries(block) as [StatKey, number][]) {
      total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}

export function computeFinalStats({ character, weapon, bonuses }: StatsInput): FinalStats {
  const blocks = weapon
    ? [...bonuses, { [weapon.secondary.stat]: weapon.secondary.value }]
    : bonuses;
  const total = sumStatBlocks(blocks);
  const get = (key: StatKey) => total[key] ?? 0;

  const baseAtk = character.atk + (weapon?.atk ?? 0);
  const dmgBonus = Object.fromEntries([
    ...ELEMENTS.map((e) => [e, get(`${e}Dmg`)]),
    ...ATTACK_TYPES.map((t) => [t, get(`${t}Dmg`)]),
    ['all', get('allDmg')],
  ]) as FinalStats['dmgBonus'];

  return {
    baseAtk,
    baseHp: character.hp,
    baseDef: character.def,
    hp: character.hp * (1 + get('hpPct') / 100) + get('hp'),
    atk: baseAtk * (1 + get('atkPct') / 100) + get('atk'),
    def: character.def * (1 + get('defPct') / 100) + get('def'),
    critRate: BASE_CRIT_RATE + get('critRate'),
    critDmg: BASE_CRIT_DMG + get('critDmg'),
    energyRegen: BASE_ENERGY_REGEN + get('energyRegen'),
    healingBonus: get('healingBonus'),
    dmgBonus,
  };
}
