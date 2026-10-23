import type { AttackType, Element, StatKey, WeaponType } from '@/domain/types';

export const ELEMENT_LABEL: Record<Element, string> = {
  aero: 'Aero',
  electro: 'Électro',
  fusion: 'Fusion',
  glacio: 'Glacio',
  havoc: 'Havoc',
  spectro: 'Spectro',
};

/** Noms officiels de la version française du jeu. */
export const WEAPON_TYPE_LABEL: Record<WeaponType, string> = {
  broadblade: 'Épée',
  sword: 'Sabre',
  pistols: 'Pistolets',
  gauntlets: 'Gantelets',
  rectifier: 'Amplificateur',
};

export const ATTACK_TYPE_LABEL: Record<AttackType, string> = {
  basic: 'Attaque normale',
  heavy: 'Attaque lourde',
  skill: 'Compétence de résonance',
  liberation: 'Libération de résonance',
  intro: "Compétence d'intro",
  outro: "Compétence d'outro",
  echo: "Compétence d'Écho",
  coordinated: 'Attaque coordonnée',
};

export const STAT_LABEL: Record<StatKey, string> = {
  hp: 'PV',
  hpPct: 'PV %',
  atk: 'ATQ',
  atkPct: 'ATQ %',
  def: 'DÉF',
  defPct: 'DÉF %',
  critRate: 'Taux crit.',
  critDmg: 'DGT crit.',
  energyRegen: "Régén. d'énergie",
  healingBonus: 'Bonus de soins',
  aeroDmg: 'Bonus DGT Aero',
  electroDmg: 'Bonus DGT Électro',
  fusionDmg: 'Bonus DGT Fusion',
  glacioDmg: 'Bonus DGT Glacio',
  havocDmg: 'Bonus DGT Havoc',
  spectroDmg: 'Bonus DGT Spectro',
  basicDmg: 'Bonus DGT Attaque normale',
  heavyDmg: 'Bonus DGT Attaque lourde',
  skillDmg: 'Bonus DGT Compétence',
  liberationDmg: 'Bonus DGT Libération',
  introDmg: 'Bonus DGT Intro',
  outroDmg: 'Bonus DGT Outro',
  echoDmg: 'Bonus DGT Écho',
  coordinatedDmg: 'Bonus DGT Coordonné',
  allDmg: 'Bonus de DGT',
};

/** Stats affichées en pourcentage (les autres sont des valeurs plates). */
export const isPercentStat = (stat: StatKey) => !['hp', 'atk', 'def'].includes(stat);

export const elementColor = (element: Element) => `var(--el-${element})`;
export const elementRgb = (element: Element) => `var(--el-${element}-rgb)`;

/** Teinte translucide de la couleur d'un attribut (alpha 0 à 1). */
export const elementTint = (element: Element, alpha: number) =>
  `rgba(var(--el-${element}-rgb), ${String(alpha)})`;
