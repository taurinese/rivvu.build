import { describe, expect, it } from 'vitest';
import { filterResonators } from './filter';

const make = (
  id: string,
  en: string,
  fr: string,
  element: 'aero' | 'havoc' | 'spectro',
  weaponType: 'broadblade' | 'sword',
  rarity: 4 | 5,
  releaseDate: string | null,
) => ({ id, name: { en, fr }, element, weaponType, rarity, releaseDate });

const list = [
  make('yangyang', 'Yangyang', 'Yangyang', 'aero', 'sword', 4, '2024-05-23'),
  make('jiyan', 'Jiyan', 'Jiyan', 'aero', 'broadblade', 5, '2024-05-23'),
  make('camellya', 'Camellya', 'Camellya', 'havoc', 'sword', 5, '2024-09-29'),
  make('shorekeeper', 'Shorekeeper', 'Gardienne du rivage', 'spectro', 'broadblade', 5, null),
];

describe('filterResonators', () => {
  it('trie par rareté, puis du plus récent au plus ancien, puis par nom', () => {
    expect(filterResonators(list, {}).map((r) => r.id)).toEqual([
      'camellya',
      'jiyan',
      'shorekeeper',
      'yangyang',
    ]);
  });

  it('filtre par attribut et par type d’arme', () => {
    expect(filterResonators(list, { element: 'aero' }).map((r) => r.id)).toEqual([
      'jiyan',
      'yangyang',
    ]);
    expect(filterResonators(list, { weaponType: 'sword' }).map((r) => r.id)).toEqual([
      'camellya',
      'yangyang',
    ]);
    expect(
      filterResonators(list, { element: 'aero', weaponType: 'sword' }).map((r) => r.id),
    ).toEqual(['yangyang']);
  });

  it('cherche dans les noms français et anglais, sans tenir compte de la casse ni des accents', () => {
    expect(filterResonators(list, { query: 'gardienne' }).map((r) => r.id)).toEqual([
      'shorekeeper',
    ]);
    expect(filterResonators(list, { query: 'SHORE' }).map((r) => r.id)).toEqual(['shorekeeper']);
    expect(filterResonators(list, { query: 'camélya' }).map((r) => r.id)).toEqual([]);
    expect(filterResonators(list, { query: 'cAmEll' }).map((r) => r.id)).toEqual(['camellya']);
  });
});
