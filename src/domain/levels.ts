/**
 * Paliers de niveau d'un Résonateur ou d'une arme : niveau + phase d'ascension.
 * Les stats de base ne sont publiées qu'à ces paliers (source : wiki, Module:Character Ascensions and Stats).
 */
export interface LevelStep {
  level: number;
  ascension: number;
}

export const LEVEL_STEPS: readonly LevelStep[] = [
  { level: 1, ascension: 0 },
  { level: 20, ascension: 0 },
  { level: 20, ascension: 1 },
  { level: 40, ascension: 1 },
  { level: 40, ascension: 2 },
  { level: 50, ascension: 2 },
  { level: 50, ascension: 3 },
  { level: 60, ascension: 3 },
  { level: 60, ascension: 4 },
  { level: 70, ascension: 4 },
  { level: 70, ascension: 5 },
  { level: 80, ascension: 5 },
  { level: 80, ascension: 6 },
  { level: 90, ascension: 6 },
];

export const MAX_LEVEL_STEP: LevelStep = { level: 90, ascension: 6 };

export const sameStep = (a: LevelStep, b: LevelStep) =>
  a.level === b.level && a.ascension === b.ascension;

export function stepIndex(step: LevelStep): number {
  const index = LEVEL_STEPS.findIndex((s) => sameStep(s, step));
  if (index === -1)
    throw new RangeError(`Palier inconnu : niv. ${step.level}, ascension ${step.ascension}`);
  return index;
}
