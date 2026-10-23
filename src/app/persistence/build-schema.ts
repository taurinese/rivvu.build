import { z } from 'zod';
import { BUILD_SCHEMA_VERSION } from '@/domain/build';
import type { Build } from '@/domain/build';
import { STAT_KEYS } from '@/domain/types';

const levelStep = z.object({
  level: z.number().int().min(1).max(90),
  ascension: z.number().int().min(0).max(6),
});

const forteLevel = z.number().int().min(1).max(10);

const echoInstance = z.object({
  uid: z.string().min(1),
  echoId: z.string().min(1),
  cost: z.union([z.literal(1), z.literal(3), z.literal(4)]),
  sonata: z.string().min(1),
  mainStat: z.enum(STAT_KEYS),
  substats: z.array(z.object({ stat: z.enum(STAT_KEYS), value: z.number() })).max(5),
});

/** Schéma du document persisté (version courante). */
export const buildSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().nullable(),
  name: z.string().max(80),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  revision: z.number().int().nonnegative(),
  deletedAt: z.iso.datetime().nullable(),
  schemaVersion: z.literal(BUILD_SCHEMA_VERSION),
  resonatorId: z.string().min(1),
  level: levelStep,
  chain: z.number().int().min(0).max(6),
  weapon: z
    .object({ id: z.string().min(1), level: levelStep, rank: z.number().int().min(1).max(5) })
    .nullable(),
  forte: z.object({
    normal: forteLevel,
    skill: forteLevel,
    circuit: forteLevel,
    liberation: forteLevel,
    intro: forteLevel,
  }),
  echoes: z.array(echoInstance).max(5),
  team: z.tuple([z.string().nullable(), z.string().nullable()]),
  notes: z.string().max(2000),
}) satisfies z.ZodType<Build>;

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] transforme un document de la version n en version n + 1. */
const migrations: Record<number, Migration> = {
  0: (doc) => ({
    ownerId: null,
    revision: 0,
    deletedAt: null,
    ...doc,
    schemaVersion: 1,
  }),
};

export function migrateBuild(doc: unknown): Build {
  if (!doc || typeof doc !== 'object') throw new Error('Document de build invalide');
  let current = doc as Record<string, unknown>;
  let version = typeof current.schemaVersion === 'number' ? current.schemaVersion : 0;
  while (version < BUILD_SCHEMA_VERSION) {
    const migrate = migrations[version];
    if (!migrate) throw new Error(`Aucune migration depuis la version ${version}`);
    current = migrate(current);
    version++;
  }
  return buildSchema.parse(current);
}
