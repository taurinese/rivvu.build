import type { EchoInstance } from './echoes';
import { MAX_LEVEL_STEP } from './levels';
import type { LevelStep } from './levels';

/** Version du format persisté d'un build (voir ADR 0002 et les migrations de persistance). */
export const BUILD_SCHEMA_VERSION = 1;

export const FORTE_SKILLS = ['normal', 'skill', 'circuit', 'liberation', 'intro'] as const;
export type ForteSkill = (typeof FORTE_SKILLS)[number];
export type ForteLevels = Record<ForteSkill, number>;

export const MAX_FORTE_LEVEL = 10;
export const MAX_CHAIN = 6;
export const MAX_WEAPON_RANK = 5;

export interface WeaponSetup {
  id: string;
  level: LevelStep;
  /** Rang de syntonisation, 1 à 5. */
  rank: number;
}

/**
 * Un build : document autonome, identifié par un UUID généré côté client.
 * `ownerId`, `revision` et `deletedAt` préparent la synchronisation avec de futurs comptes.
 */
export interface Build {
  id: string;
  ownerId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  deletedAt: string | null;
  schemaVersion: typeof BUILD_SCHEMA_VERSION;
  resonatorId: string;
  level: LevelStep;
  /** Chaîne de résonance, 0 à 6. */
  chain: number;
  weapon: WeaponSetup | null;
  forte: ForteLevels;
  /** Échos équipés ; le premier est l'Écho principal (sa compétence active est utilisée). */
  echoes: EchoInstance[];
  /** Deux coéquipiers (identifiants de Résonateurs). */
  team: [string | null, string | null];
  notes: string;
}

export interface NewBuildInput {
  id: string;
  resonatorId: string;
  now: string;
  name?: string;
}

export function createBuild({ id, resonatorId, now, name }: NewBuildInput): Build {
  return {
    id,
    ownerId: null,
    name: name ?? 'Nouveau build',
    createdAt: now,
    updatedAt: now,
    revision: 0,
    deletedAt: null,
    schemaVersion: BUILD_SCHEMA_VERSION,
    resonatorId,
    level: { ...MAX_LEVEL_STEP },
    chain: 0,
    weapon: null,
    forte: { normal: 10, skill: 10, circuit: 10, liberation: 10, intro: 10 },
    echoes: [],
    team: [null, null],
    notes: '',
  };
}

export const totalEchoCost = (build: Pick<Build, 'echoes'>) =>
  build.echoes.reduce((sum, echo) => sum + echo.cost, 0);
