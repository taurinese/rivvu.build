import { z } from 'zod';
import { ELEMENTS, STAT_KEYS, WEAPON_TYPES } from '../domain/types.ts';

export const localizedSchema = z.object({
  en: z.string().min(1),
  fr: z.string().min(1),
});

export const sourceSchema = z.object({
  page: z.string().min(1),
  url: z.url(),
});

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const assetPath = z.string().regex(/^\/assets\/game\/[a-z-]+\/[a-z0-9-]+\.webp$/);

export const resonatorSchema = z.object({
  id,
  name: localizedSchema,
  rarity: z.union([z.literal(4), z.literal(5)]),
  element: z.enum(ELEMENTS),
  weaponType: z.enum(WEAPON_TYPES),
  /** Stats de base au niveau 1 (avant multiplicateurs de niveau). */
  base: z.object({
    hp: z.number().positive(),
    atk: z.number().positive(),
    def: z.number().positive(),
  }),
  releaseDate: z.iso.date().nullable(),
  icon: assetPath.nullable(),
  sprite: assetPath.nullable(),
  source: sourceSchema,
});

export const weaponSchema = z.object({
  id,
  name: localizedSchema,
  rarity: z.number().int().min(1).max(5),
  type: z.enum(WEAPON_TYPES),
  /** ATQ de base au niveau 1. */
  baseAtk: z.number().positive(),
  /** Stat secondaire au niveau 1 (en points de %). */
  secondary: z.object({ stat: z.enum(STAT_KEYS), base: z.number().positive() }),
  passive: z
    .object({
      name: z.string().nullable(),
      /** Texte anglais du wiki avec des marqueurs (var1), (var2)… */
      text: z.string().min(1),
      /** values[rang - 1][var - 1], en points de % ou valeurs brutes. */
      values: z.array(z.array(z.number())).length(5),
    })
    .nullable(),
  icon: assetPath.nullable(),
  source: sourceSchema,
});

export const ECHO_CLASSES = ['Common', 'Elite', 'Overlord', 'Calamity'] as const;

export const echoSchema = z.object({
  id,
  name: localizedSchema,
  cost: z.union([z.literal(1), z.literal(3), z.literal(4)]),
  class: z.enum(ECHO_CLASSES),
  sonatas: z.array(id).min(1),
  nightmare: z.boolean(),
  icon: assetPath.nullable(),
  source: sourceSchema,
});

export const sonataSchema = z.object({
  id,
  name: localizedSchema,
  effects: z
    .array(z.object({ pieces: z.number().int().min(1).max(5), text: z.string().min(1) }))
    .min(1),
  icon: assetPath.nullable(),
  source: sourceSchema,
});

const levelStepSchema = z.object({
  level: z.number().int().min(1).max(90),
  ascension: z.number().int().min(0).max(6),
});

export const curvesSchema = z.object({
  /** Multiplicateurs des stats de base d'un Résonateur par palier. */
  character: z
    .array(levelStepSchema.extend({ hp: z.number(), atk: z.number(), def: z.number() }))
    .length(14),
  /** Ratio ATQ arme(palier) / ATQ arme(niveau 1). */
  weaponAtk: z.array(levelStepSchema.extend({ ratio: z.number().positive() })).length(14),
  /** Ratio stat secondaire(niveau) / stat secondaire(niveau 1). */
  weaponSecondary: z
    .array(z.object({ level: z.number().int(), ratio: z.number().positive() }))
    .length(8),
  /** Tables publiées par le wiki, gardées pour vérifier les ratios. */
  reference: z.object({
    weaponAtk: z.record(z.string(), z.record(z.string(), z.number())),
    weaponSecondary: z.record(z.string(), z.record(z.string(), z.number())),
  }),
});

export const metaSchema = z.object({
  source: z.string(),
  url: z.url(),
  fetchedAt: z.iso.datetime(),
  counts: z.record(z.string(), z.number().int().nonnegative()),
  skipped: z.array(z.object({ page: z.string(), reason: z.string() })),
});

export type Resonator = z.infer<typeof resonatorSchema>;
export type Weapon = z.infer<typeof weaponSchema>;
export type Echo = z.infer<typeof echoSchema>;
export type Sonata = z.infer<typeof sonataSchema>;
export type Curves = z.infer<typeof curvesSchema>;
export type GameDataMeta = z.infer<typeof metaSchema>;
