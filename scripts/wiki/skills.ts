import type { AttackType } from '../../src/domain/types.ts';

/**
 * Multiplicateur total d'une valeur du wiki (« 11.87%*7 + 77.18%*2 » → 0.1187×7 + 0.7718×2).
 * Les lignes de dégâts sans « % » (oubli fréquent du wiki) sont lues comme des pourcentages et signalées.
 */
export function parseMotionValue(
  raw: string,
  { percentUnit = false }: { percentUnit?: boolean } = {},
): { value: number; assumedPercent: boolean } | null {
  const text = raw.replace(/\s+/g, '');
  if (!/^[\d.%*+]+$/.test(text) || !/\d/.test(text)) return null;
  let assumedPercent = false;
  let total = 0;
  for (const term of text.split('+')) {
    const match = /^([\d.]+)(%?)(?:\*(\d+))?$/.exec(term);
    if (!match) return null;
    const [, amount, percent, hits] = match;
    if (!percent && !percentUnit) assumedPercent = true;
    total += (Number(amount) / 100) * Number(hits ?? 1);
  }
  return Number.isFinite(total) && total > 0 ? { value: total, assumedPercent } : null;
}

const NON_DAMAGE =
  /reduction|bonus|taken|heal|shield|restore|regen|recover|cost|cooldown|duration/i;

export function isDamageRow(title: string): boolean {
  return /(dmg|damage)/i.test(title) && !NON_DAMAGE.test(title);
}

const SKILL_TYPE: Record<string, AttackType> = {
  'Basic Attack': 'basic',
  'Resonance Skill': 'skill',
  'Resonance Liberation': 'liberation',
  'Intro Skill': 'intro',
  'Outro Skill': 'outro',
};

const MENTION: [RegExp, AttackType][] = [
  [/heavy attack/i, 'heavy'],
  [/basic attack/i, 'basic'],
  [/resonance skill/i, 'skill'],
  [/resonance liberation/i, 'liberation'],
  [/intro skill/i, 'intro'],
  [/echo skill/i, 'echo'],
];

/**
 * Type d'attaque d'une ligne de dégâts (il détermine le bonus de DGT appliqué).
 * Ordre : « considered as X damage » du texte du jeu, libellé de la ligne, type de la compétence.
 * `inferred` signale une déduction faute d'indication explicite.
 */
export function inferDamageType(
  skillType: string,
  rowTitle: string,
  info: string,
): { type: AttackType; inferred: boolean } {
  const considered = [...info.matchAll(/considered as (?:an? )?([a-z ]+?) (?:damage|dmg)/gi)]
    .map((m) => MENTION.find(([pattern]) => pattern.test(m[1] ?? ''))?.[1])
    .filter((t): t is AttackType => t !== undefined);
  if (new Set(considered).size === 1 && considered[0])
    return { type: considered[0], inferred: false };

  if (/heavy attack/i.test(rowTitle)) return { type: 'heavy', inferred: false };
  const own = SKILL_TYPE[skillType];
  if (own) return { type: own, inferred: false };

  const fromTitle = MENTION.find(([pattern]) => pattern.test(rowTitle))?.[1];
  if (fromTitle) return { type: fromTitle, inferred: false };
  return { type: 'skill', inferred: true };
}

/** Valeurs par niveau d'une ligne : format « clé_1 … clé_10 » ou « clé = v1;v2;… ». */
export function scalingValues(params: Record<string, string>, key: string): string[] {
  const perLevel: string[] = [];
  for (let level = 1; level <= 10; level++) {
    const value = params[`${key}_${String(level)}`];
    if (value === undefined) break;
    perLevel.push(value);
  }
  if (perLevel.length > 0) return perLevel;
  const joined = params[key];
  return joined
    ? joined
        .split(';')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
}
