/**
 * Matériaux d'évolution (importés du wiki, validés en CI par src/data/game.test.ts).
 * Module séparé : chargé seulement avec le planificateur.
 */
import materialsJson from './game/materials.json';
import type { Materials } from './schema';

export const materials = materialsJson as unknown as Materials;
export const itemById = new Map(materials.items.map((item) => [item.id, item] as const));
