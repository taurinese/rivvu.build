import { describe, expect, it } from 'vitest';
import type { EchoInstance } from '@/domain/echoes';
import {
  activeSonatas,
  allowedMainStats,
  availableSubstats,
  newEchoInstance,
  remainingCost,
  setPrincipal,
  substatQuality,
} from './echo-editing';

const echo = (overrides: Partial<EchoInstance> = {}): EchoInstance => ({
  uid: 'a',
  echoId: 'feilian-beringal',
  cost: 4,
  sonata: 'sierra-gale',
  mainStat: 'critRate',
  substats: [],
  ...overrides,
});

describe('allowedMainStats', () => {
  it('liste les stats principales possibles par coût, dans l’ordre d’affichage', () => {
    expect(allowedMainStats(4)).toEqual([
      'critRate',
      'critDmg',
      'atkPct',
      'hpPct',
      'defPct',
      'healingBonus',
    ]);
    expect(allowedMainStats(1)).toEqual(['atkPct', 'hpPct', 'defPct']);
    expect(allowedMainStats(3)).toEqual([
      'aeroDmg',
      'electroDmg',
      'fusionDmg',
      'glacioDmg',
      'havocDmg',
      'spectroDmg',
      'energyRegen',
      'atkPct',
      'hpPct',
      'defPct',
    ]);
  });
});

describe('newEchoInstance', () => {
  it('choisit un ensemble possible et une stat principale adaptée au Résonateur', () => {
    const data = { id: 'carapace', cost: 3 as const, sonatas: ['sierra-gale', 'moonlit-clouds'] };
    expect(newEchoInstance(data, 'u1', 'aero')).toEqual({
      uid: 'u1',
      echoId: 'carapace',
      cost: 3,
      sonata: 'sierra-gale',
      mainStat: 'aeroDmg',
      substats: [],
    });
    expect(newEchoInstance({ ...data, cost: 4 }, 'u2', 'aero').mainStat).toBe('critRate');
    expect(newEchoInstance({ ...data, cost: 1 }, 'u3', 'aero').mainStat).toBe('atkPct');
  });

  it('garde l’ensemble préféré s’il est possible pour cette espèce', () => {
    const data = { id: 'carapace', cost: 3 as const, sonatas: ['sierra-gale', 'moonlit-clouds'] };
    expect(newEchoInstance(data, 'u1', 'aero', 'moonlit-clouds').sonata).toBe('moonlit-clouds');
    expect(newEchoInstance(data, 'u1', 'aero', 'molten-rift').sonata).toBe('sierra-gale');
  });
});

describe('availableSubstats', () => {
  it('exclut les sous-stats déjà présentes sauf celle qu’on modifie', () => {
    const e = echo({
      substats: [
        { stat: 'critRate', value: 6.3 },
        { stat: 'critDmg', value: 12.6 },
      ],
    });
    const all = availableSubstats(e);
    expect(all).not.toContain('critRate');
    expect(all).not.toContain('critDmg');
    expect(all).toHaveLength(11);
    expect(availableSubstats(e, 'critDmg')).toContain('critDmg');
  });
});

describe('substatQuality', () => {
  it('rang du palier entre 0 et 1', () => {
    expect(substatQuality({ stat: 'critRate', value: 10.5 })).toBe(1);
    expect(substatQuality({ stat: 'critRate', value: 6.3 })).toBe(1 / 8);
    expect(substatQuality({ stat: 'atk', value: 50 })).toBe(3 / 4);
    expect(substatQuality({ stat: 'critRate', value: 9.4 })).toBe(0);
  });
});

describe('remainingCost', () => {
  it('coût restant sur 12, en ignorant éventuellement un emplacement', () => {
    const loadout = [echo({ uid: 'a', cost: 4 }), echo({ uid: 'b', cost: 3 })];
    expect(remainingCost(loadout)).toBe(5);
    expect(remainingCost(loadout, 'a')).toBe(9);
  });
});

describe('setPrincipal', () => {
  it('place l’Écho choisi en premier sans changer l’ordre des autres', () => {
    const loadout = [echo({ uid: 'a' }), echo({ uid: 'b' }), echo({ uid: 'c' })];
    expect(setPrincipal(loadout, 'c').map((e) => e.uid)).toEqual(['c', 'a', 'b']);
    expect(setPrincipal(loadout, 'absent').map((e) => e.uid)).toEqual(['a', 'b', 'c']);
  });
});

describe('activeSonatas', () => {
  const sonatas = [
    {
      id: 'sierra-gale',
      effects: [
        { pieces: 2, text: 'Aero DMG +10%.' },
        { pieces: 5, text: 'Aero DMG +30%…' },
      ],
    },
    {
      id: 'moonlit-clouds',
      effects: [
        { pieces: 2, text: 'ER +10%.' },
        { pieces: 5, text: '…' },
      ],
    },
  ];

  it('compte les pièces et marque les effets atteints', () => {
    const loadout = [
      echo({ uid: '1', echoId: 'a' }),
      echo({ uid: '2', echoId: 'b' }),
      echo({ uid: '3', echoId: 'c', sonata: 'moonlit-clouds' }),
    ];
    expect(activeSonatas(loadout, sonatas)).toEqual([
      {
        id: 'sierra-gale',
        pieces: 2,
        effects: [
          { pieces: 2, text: 'Aero DMG +10%.', active: true },
          { pieces: 5, text: 'Aero DMG +30%…', active: false },
        ],
      },
      {
        id: 'moonlit-clouds',
        pieces: 1,
        effects: [
          { pieces: 2, text: 'ER +10%.', active: false },
          { pieces: 5, text: '…', active: false },
        ],
      },
    ]);
  });
});
