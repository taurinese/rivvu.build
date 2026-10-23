import { totalEchoCost } from '@/domain/build';
import type { Build } from '@/domain/build';
import { MAX_COST, MAX_ECHOES } from '@/domain/echoes';

export type StepId = 'resonator' | 'weapon' | 'forte' | 'echoes';

export interface BuildStep {
  id: StepId;
  label: string;
  /** Segment d'URL sous /builds/:id/ */
  path: string;
  done: boolean;
}

export function buildProgress(build: Build) {
  const steps: BuildStep[] = [
    { id: 'resonator', label: 'Résonateur', path: 'resonateur', done: true },
    { id: 'weapon', label: 'Arme', path: 'arme', done: build.weapon !== null },
    { id: 'forte', label: 'Forte', path: 'forte', done: true },
    {
      id: 'echoes',
      label: 'Échos',
      path: 'echos',
      done: build.echoes.length >= MAX_ECHOES || totalEchoCost(build) >= MAX_COST,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length };
}
