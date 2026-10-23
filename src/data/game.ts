/**
 * Données du jeu importées du wiki (voir scripts/import-game-data.ts).
 * Validées par Zod en CI (src/data/game.test.ts) : pas de validation à l'exécution pour garder le bundle léger.
 */
import curvesJson from './game/curves.json';
import echoesJson from './game/echoes.json';
import metaJson from './game/meta.json';
import resonatorsJson from './game/resonators.json';
import sonatasJson from './game/sonatas.json';
import weaponsJson from './game/weapons.json';
import type { Curves, Echo, GameDataMeta, Resonator, Sonata, Weapon } from './schema';

export const resonators = resonatorsJson as unknown as readonly Resonator[];
export const weapons = weaponsJson as unknown as readonly Weapon[];
export const echoes = echoesJson as unknown as readonly Echo[];
export const sonatas = sonatasJson as unknown as readonly Sonata[];
export const curves = curvesJson as unknown as Curves;
export const gameDataMeta = metaJson as unknown as GameDataMeta;

const index = <T extends { id: string }>(items: readonly T[]) =>
  new Map(items.map((item) => [item.id, item] as const));

export const resonatorById = index(resonators);
export const weaponById = index(weapons);
export const echoById = index(echoes);
export const sonataById = index(sonatas);
