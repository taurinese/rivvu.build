import type { StatKey } from '../../src/domain/types.ts';

/** Libellés de stats du wiki (anglais) → clés du moteur. Les plus longs d'abord. */
const LABELS: [RegExp, StatKey][] = [
  [/^(?:all-)?attribute dmg(?: bonus)?$/i, 'elementalDmg'],
  [/^aero dmg(?: bonus)?$/i, 'aeroDmg'],
  [/^electro dmg(?: bonus)?$/i, 'electroDmg'],
  [/^fusion dmg(?: bonus)?$/i, 'fusionDmg'],
  [/^glacio dmg(?: bonus)?$/i, 'glacioDmg'],
  [/^havoc dmg(?: bonus)?$/i, 'havocDmg'],
  [/^spectro dmg(?: bonus)?$/i, 'spectroDmg'],
  [/^basic attack dmg(?: bonus)?$/i, 'basicDmg'],
  [/^heavy attack dmg(?: bonus)?$/i, 'heavyDmg'],
  [/^resonance skill dmg(?: bonus)?$/i, 'skillDmg'],
  [/^resonance liberation dmg(?: bonus)?$/i, 'liberationDmg'],
  [/^echo skill dmg(?: bonus)?$/i, 'echoDmg'],
  [/^crit\.? rate$/i, 'critRate'],
  [/^crit\.? dmg$/i, 'critDmg'],
  [/^energy regen$/i, 'energyRegen'],
  [/^healing(?: bonus)?$/i, 'healingBonus'],
  [/^atk$/i, 'atkPct'],
  [/^hp$/i, 'hpPct'],
  [/^def$/i, 'defPct'],
];

const toStat = (label: string): StatKey | null =>
  LABELS.find(([pattern]) => pattern.test(label.trim()))?.[1] ?? null;

export interface SetBonus {
  stat: StatKey;
  value: number;
  /** Vrai si le bonus dépend d'une action en combat (appliqué en mode « en combat »). */
  conditional: boolean;
}

/**
 * Bonus chiffré d'un effet d'ensemble : « <stat> +X% » au début du texte.
 * Ce qui suit (« for 15s after… ») rend le bonus conditionnel. Rien n'est deviné sinon.
 */
export function parseSetBonuses(text: string): SetBonus[] {
  const match = /^([A-Za-z. -]+?) ?\+ ?(\d+(?:\.\d+)?)%(.*)$/.exec(text.trim());
  if (!match) return [];
  const [, label = '', value = '', rest = ''] = match;
  const stat = toStat(label);
  if (!stat) return [];
  return [{ stat, value: Number(value), conditional: rest.replace(/[.\s]/g, '') !== '' }];
}

export interface PassiveBonus {
  stat: StatKey;
  /** Numéro du marqueur (varN) qui donne la valeur selon le rang. */
  variable: number;
  conditional: boolean;
  /** Cumuls maximum (la valeur est multipliée en mode « en combat »). */
  stacks: number;
}

/** Bonus d'un passif d'arme : phrases « [condition,] increases <stat> by (varN)% [, stacking up to N time(s)] ». */
export function parsePassiveBonuses(text: string): PassiveBonus[] {
  const bonuses: PassiveBonus[] = [];
  // Découpe en phrases sans couper « Crit. Rate » / « Crit. DMG ».
  for (const sentence of text.split(/(?<!Crit)\.\s+/)) {
    const match =
      /^(.*?)\bincreases (?:the )?(?:resonator's )?([A-Za-z. -]+?) by \(var(\d+)\)%(.*)$/i.exec(
        sentence,
      );
    if (!match) continue;
    const [, before = '', label = '', variable = '', after = ''] = match;
    const stat = toStat(label);
    if (!stat) continue;
    const stacks = Number(/stacking up to (\d+) time/i.exec(after)?.[1] ?? 1);
    const conditional =
      before.trim() !== '' || /\bfor \d+s\b|when|after|if\b/i.test(after) || stacks > 1;
    bonuses.push({ stat, variable: Number(variable), conditional, stacks });
  }
  return bonuses;
}
