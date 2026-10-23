import { describe, expect, it } from 'vitest';
import { filterEchoes } from './filter-echoes';

const make = (id: string, en: string, fr: string, cost: 1 | 3 | 4, sonatas: string[]) => ({
  id,
  name: { en, fr },
  cost,
  sonatas,
});

const list = [
  make('whiff-whaff', 'Whiff Whaff', 'Houhouu', 1, ['sierra-gale']),
  make('carapace', 'Carapace', 'Rasoir chasseur', 3, ['sierra-gale', 'moonlit-clouds']),
  make('feilian-beringal', 'Feilian Beringal', 'Feilian Beringal', 4, ['sierra-gale']),
  make('inferno-rider', 'Inferno Rider', 'Cavalier infernal', 4, ['molten-rift']),
];

describe('filterEchoes', () => {
  it('trie par coût décroissant puis par nom français', () => {
    expect(filterEchoes(list, {}).map((e) => e.id)).toEqual([
      'inferno-rider',
      'feilian-beringal',
      'carapace',
      'whiff-whaff',
    ]);
  });

  it('filtre par coût et par ensemble', () => {
    expect(filterEchoes(list, { cost: 4 }).map((e) => e.id)).toEqual([
      'inferno-rider',
      'feilian-beringal',
    ]);
    expect(filterEchoes(list, { sonata: 'moonlit-clouds' }).map((e) => e.id)).toEqual(['carapace']);
  });

  it('cherche en français et en anglais', () => {
    expect(filterEchoes(list, { query: 'carapace' }).map((e) => e.id)).toEqual(['carapace']);
    expect(filterEchoes(list, { query: 'rasoir' }).map((e) => e.id)).toEqual(['carapace']);
  });

  it('ne garde que les Échos qui tiennent dans le coût restant', () => {
    expect(filterEchoes(list, { maxCost: 3 }).map((e) => e.id)).toEqual([
      'carapace',
      'whiff-whaff',
    ]);
  });
});
