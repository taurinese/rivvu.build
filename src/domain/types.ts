/** Vocabulaire commun du moteur de calcul (aucune dépendance UI). */

export const ELEMENTS = ['aero', 'electro', 'fusion', 'glacio', 'havoc', 'spectro'] as const;
export type Element = (typeof ELEMENTS)[number];

export const WEAPON_TYPES = ['broadblade', 'sword', 'pistols', 'gauntlets', 'rectifier'] as const;
export type WeaponType = (typeof WEAPON_TYPES)[number];

/** Types d'attaque qui reçoivent chacun leur propre bonus de dégâts. */
export const ATTACK_TYPES = [
  'basic',
  'heavy',
  'skill',
  'liberation',
  'intro',
  'outro',
  'echo',
  'coordinated',
] as const;
export type AttackType = (typeof ATTACK_TYPES)[number];

/**
 * Clés de statistiques. Les pourcentages sont exprimés en points (12 = 12 %).
 * `xxxPct` s'applique à la base (personnage + arme), `xxx` est une valeur plate.
 */
export const STAT_KEYS = [
  'hp',
  'hpPct',
  'atk',
  'atkPct',
  'def',
  'defPct',
  'critRate',
  'critDmg',
  'energyRegen',
  'healingBonus',
  'aeroDmg',
  'electroDmg',
  'fusionDmg',
  'glacioDmg',
  'havocDmg',
  'spectroDmg',
  /** Bonus de DGT de tous les attributs (« Attribute DMG Bonus »). */
  'elementalDmg',
  'basicDmg',
  'heavyDmg',
  'skillDmg',
  'liberationDmg',
  'introDmg',
  'outroDmg',
  'echoDmg',
  'coordinatedDmg',
  'allDmg',
  /** Amplification des dégâts (multiplicateur séparé du bonus de DGT). */
  'amplify',
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type StatBlock = Partial<Record<StatKey, number>>;

export const elementDmgKey = (element: Element): StatKey => `${element}Dmg`;
export const attackDmgKey = (type: AttackType): StatKey => `${type}Dmg`;
