import { resonatorById } from '@/data/game';
import { skills } from '@/data/skills';
import type { Build } from '@/domain/build';
import type { EchoInstance } from '@/domain/echoes';
import { validateLoadout } from '@/domain/echoes';
import { optimizeLoadout } from '@/domain/optimizer';
import { computeBuildStats } from '@/features/builds/build-stats';
import { skillDamage } from '@/features/damage/skill-damage';

export interface OptimizeRequest {
  build: Build;
  inventory: readonly EchoInstance[];
  /** Compétence dont on maximise le total des dégâts moyens. */
  skillId: string;
  keep?: number;
}

export interface OptimizeOutcome {
  /** Valeur avec les Échos actuels du build. */
  current: number;
  results: { echoes: EchoInstance[]; value: number }[];
}

/** Meilleures combinaisons d'Échos de l'inventaire pour une compétence du build. */
export function optimizeBuild({
  build,
  inventory,
  skillId,
  keep = 5,
}: OptimizeRequest): OptimizeOutcome {
  const resonator = resonatorById.get(build.resonatorId);
  const skill = skills.find((s) => s.id === skillId && s.resonatorId === build.resonatorId);
  if (!resonator || !skill) throw new Error('Compétence inconnue pour ce Résonateur');

  const evaluate = (echoes: readonly EchoInstance[]) => {
    const candidate = { ...build, echoes: [...echoes] };
    const { stats } = computeBuildStats(candidate);
    return skillDamage(candidate, stats, skill, resonator).reduce(
      (sum, row) => sum + row.average,
      0,
    );
  };

  // Un Écho mal saisi (valeur hors paliers…) fausserait le résultat : il est écarté.
  const candidates = inventory
    .map(({ uid, echoId, cost, sonata, mainStat, substats }) => ({
      uid,
      echoId,
      cost,
      sonata,
      mainStat,
      substats,
    }))
    .filter((echo) => validateLoadout([echo]).length === 0);

  const results = optimizeLoadout({
    candidates,
    evaluate,
    groupOf: (echo) => echo.sonata,
    keep,
  }).map(({ loadout, value }) => ({ echoes: loadout, value }));

  return { current: evaluate(build.echoes), results };
}
