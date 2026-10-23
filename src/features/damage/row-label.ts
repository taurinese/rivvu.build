/** Termes du plus spécifique au plus général (les composés d'abord). */
const TERMS: [RegExp, string][] = [
  [/\bMid-?air Dodge Counter\b/gi, 'Contre-esquive aérienne'],
  [/\bFull Charge Heavy Attack\b/gi, 'Attaque lourde pleine charge'],
  [/\bResonance Skill\b/gi, 'Compétence de résonance'],
  [/\bResonance Liberation\b/gi, 'Libération de résonance'],
  [/\bIntro Skill\b/gi, 'Compétence d’intro'],
  [/\bOutro Skill\b/gi, 'Compétence d’outro'],
  [/\bMid-?air Attack\b/gi, 'Attaque aérienne'],
  [/\bHeavy Attack\b/gi, 'Attaque lourde'],
  [/\bBasic Attack\b/gi, 'Attaque normale'],
  [/\bDodge Counter\b/gi, 'Contre-esquive'],
  [/\bPlunging Attack\b/gi, 'Attaque plongeante'],
  [/\bStage\b/gi, 'coup'],
  [/\bSkill\b/gi, 'Compétence'],
  [/\bPart\b/gi, 'Partie'],
];

/** Traduit les termes génériques d'une ligne de dégâts du wiki ; les noms propres restent tels quels. */
export function translateRowLabel(label: string): string {
  let text = label.trim();
  const damage = /\s*\b(?:Damage|DMG)\b\s*$/i.test(text);
  text = text.replace(/\s*\b(?:Damage|DMG)\b\s*$/i, '');
  for (const [pattern, replacement] of TERMS) text = text.replace(pattern, replacement);
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return damage ? `${text} — DGT` : text;
}
