import { echoById, echoes } from '@/data/game';
import {
  MAIN_STAT_VALUES,
  MAX_SUBSTATS,
  SECONDARY_MAIN_STAT,
  SUBSTAT_TIERS,
} from '@/domain/echoes';
import type { EchoCost, EchoInstance, Substat } from '@/domain/echoes';
import { ELEMENTS } from '@/domain/types';
import type { Element, StatKey } from '@/domain/types';
import { newEchoInstance } from '@/features/echoes/echo-editing';
import { STAT_LABEL } from '@/features/game/labels';
import { formatFlat, formatPercent } from '@/lib/format';

/** Ce qu'une capture d'Écho a permis de lire ; l'utilisateur vérifie avant d'enregistrer. */
export interface ParsedEcho {
  echoId: string | null;
  cost: EchoCost | null;
  mainStat: StatKey | null;
  substats: Substat[];
  warnings: string[];
}

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Règles de libellés (anglais et français), de la plus précise à la plus générale. */
const LABEL_RULES: [RegExp, StatKey | ((percent: boolean) => StatKey)][] = [
  [/crit.*(taux|rate)|(taux|rate).*crit/, 'critRate'],
  [/crit.*(dmg|dgt|deg)|(dmg|dgt|deg).*crit/, 'critDmg'],
  [/energ|regen/, 'energyRegen'],
  [/heal|soin/, 'healingBonus'],
  [/heavy|lourde/, 'heavyDmg'],
  [/basic|normale/, 'basicDmg'],
  [/liberation/, 'liberationDmg'],
  [/skill|competence/, 'skillDmg'],
  ...ELEMENTS.map((e) => [new RegExp(e), `${e}Dmg`] as [RegExp, StatKey]),
  [/\b(atk|atq)\b/, (pct) => (pct ? 'atkPct' : 'atk')],
  [/\b(hp|pv)\b/, (pct) => (pct ? 'hpPct' : 'hp')],
  [/\bdef\b/, (pct) => (pct ? 'defPct' : 'def')],
];

export function matchStatLabel(label: string, percent: boolean): StatKey | null {
  const text = normalize(label);
  for (const [pattern, stat] of LABEL_RULES)
    if (pattern.test(text)) return typeof stat === 'function' ? stat(percent) : stat;
  return null;
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j] ?? 0;
      row[j] = Math.min(
        current + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length] ?? 0;
}

const compact = (text: string) => normalize(text).replace(/[^a-z]/g, '');

/** Espèce d'Écho la plus proche d'une ligne de texte (noms français et anglais). */
function matchEcho(lines: readonly string[]): string | null {
  let best: { id: string; score: number } | null = null;
  for (const line of lines) {
    const text = compact(line);
    if (text.length < 4) continue;
    for (const echo of echoes)
      for (const name of [echo.name.fr, echo.name.en]) {
        const target = compact(name);
        const score = 1 - levenshtein(text, target) / Math.max(text.length, target.length);
        if (!best || score > best.score) best = { id: echo.id, score };
      }
  }
  return best && best.score >= 0.8 ? best.id : null;
}

/** Palier le plus proche, si la lecture en est assez proche (erreurs d'OCR sur une décimale). */
function snapToTier(stat: StatKey, value: number): number | null {
  const tiers = SUBSTAT_TIERS[stat] ?? [];
  let nearest: number | null = null;
  for (const tier of tiers)
    if (nearest === null || Math.abs(tier - value) < Math.abs(nearest - value)) nearest = tier;
  if (nearest === null) return null;
  return Math.abs(nearest - value) <= Math.max(0.35, nearest * 0.03) ? nearest : null;
}

const LINE = /^(.*?)(\d+(?:[.,]\d+)?)\s*(%)?[^\d%]*$/;
const COSTS: readonly EchoCost[] = [4, 3, 1];

export function parseEchoText(text: string): ParsedEcho {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const warnings: string[] = [];

  const statLines: { stat: StatKey; value: number; percent: boolean }[] = [];
  const header: string[] = [];
  let costRead: EchoCost | null = null;
  for (const line of lines) {
    const cost = /\b(cost|cout)\D*([134])\b/.exec(normalize(line));
    if (cost) {
      costRead = Number(cost[2]) as EchoCost;
      continue;
    }
    const match = LINE.exec(line);
    const stat = match ? matchStatLabel(match[1] ?? '', match[3] === '%') : null;
    if (match && stat) {
      statLines.push({
        stat,
        value: Number((match[2] ?? '').replace(',', '.')),
        percent: !!match[3],
      });
    } else if (statLines.length === 0) header.push(line);
  }

  const echoId = matchEcho(header);
  if (!echoId) warnings.push('Écho non reconnu : choisissez-le à la main.');
  const speciesCost = echoId ? echoById.get(echoId)?.cost : undefined;
  const cost = speciesCost ?? costRead;

  let mainStat: StatKey | null = null;
  let secondarySkipped = false;
  const substats: Substat[] = [];
  for (const { stat, value, percent } of statLines) {
    const costs = cost ? [cost] : COSTS;
    if (
      mainStat === null &&
      costs.some((c) => Math.abs((MAIN_STAT_VALUES[c][stat] ?? -100) - value) <= 0.5)
    ) {
      mainStat = stat;
      continue;
    }
    if (
      !secondarySkipped &&
      costs.some(
        (c) => SECONDARY_MAIN_STAT[c].stat === stat && SECONDARY_MAIN_STAT[c].value === value,
      )
    ) {
      secondarySkipped = true;
      continue;
    }
    if (substats.length >= MAX_SUBSTATS || substats.some((s) => s.stat === stat)) continue;
    const snapped = snapToTier(stat, value);
    if (snapped === null) {
      warnings.push(
        `Valeur illisible pour ${STAT_LABEL[stat]} (${percent ? formatPercent(value).replace(',0', '') : formatFlat(value)})`,
      );
      continue;
    }
    substats.push({ stat, value: snapped });
  }

  return { echoId, cost, mainStat, substats, warnings };
}

/** Écho prêt à équiper : valeurs par défaut de l'espèce, complétées par ce qui a été lu. */
export function echoFromParsed(
  parsed: ParsedEcho,
  species: Parameters<typeof newEchoInstance>[0],
  uid: string,
  element: Element,
  preferredSonata?: string,
): EchoInstance {
  const echo = newEchoInstance(species, uid, element, preferredSonata);
  const mainStat =
    parsed.mainStat && MAIN_STAT_VALUES[species.cost][parsed.mainStat] !== undefined
      ? parsed.mainStat
      : echo.mainStat;
  return { ...echo, mainStat, substats: parsed.substats };
}
