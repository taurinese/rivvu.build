import { describe, expect, it } from 'vitest';
import {
  MAIN_STAT_VALUES,
  SECONDARY_MAIN_STAT,
  SUBSTAT_TIERS,
  critValue,
  echoStatBlock,
  sonataPieceCounts,
  validateLoadout,
} from './echoes';
import type { EchoInstance } from './echoes';

const echo = (overrides: Partial<EchoInstance> = {}): EchoInstance => ({
  uid: 'e1',
  echoId: 'feilian-beringal',
  cost: 4,
  sonata: 'sierra-gale',
  mainStat: 'critDmg',
  substats: [],
  ...overrides,
});

describe('valeurs des stats principales (5★, +25) — source wiki Echo/Stats', () => {
  it('4 coûts : Taux crit. 22 %, DGT crit. 44 %, ATQ 33 %, PV 33 %, DÉF 41,5 %, Soins 26 %', () => {
    expect(MAIN_STAT_VALUES[4]).toEqual({
      critRate: 22,
      critDmg: 44,
      atkPct: 33,
      hpPct: 33,
      defPct: 41.5,
      healingBonus: 26,
    });
  });

  it('3 coûts : DGT d’attribut 30 %, ATQ/PV 30 %, DÉF 38 %, Régén. 32 %', () => {
    expect(MAIN_STAT_VALUES[3]).toMatchObject({
      aeroDmg: 30,
      havocDmg: 30,
      atkPct: 30,
      hpPct: 30,
      defPct: 38,
      energyRegen: 32,
    });
  });

  it('1 coût : PV 22,8 %, ATQ 18 %, DÉF 18 %', () => {
    expect(MAIN_STAT_VALUES[1]).toEqual({ hpPct: 22.8, atkPct: 18, defPct: 18 });
  });

  it('stat principale secondaire fixe : ATQ 150 / ATQ 100 / PV 2 280', () => {
    expect(SECONDARY_MAIN_STAT).toEqual({
      4: { stat: 'atk', value: 150 },
      3: { stat: 'atk', value: 100 },
      1: { stat: 'hp', value: 2280 },
    });
  });
});

describe('paliers de sous-stats', () => {
  it('8 paliers pour Taux crit. (6,3 → 10,5) et DGT crit. (12,6 → 21)', () => {
    expect(SUBSTAT_TIERS.critRate).toEqual([6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5]);
    expect(SUBSTAT_TIERS.critDmg).toEqual([12.6, 13.8, 15, 16.2, 17.4, 18.6, 19.8, 21]);
  });

  it('4 paliers pour l’ATQ et la DÉF plates', () => {
    expect(SUBSTAT_TIERS.atk).toEqual([30, 40, 50, 60]);
    expect(SUBSTAT_TIERS.def).toEqual([40, 50, 60, 70]);
  });

  it('13 sous-stats possibles', () => {
    expect(Object.keys(SUBSTAT_TIERS)).toHaveLength(13);
  });
});

describe('echoStatBlock', () => {
  it('additionne stat principale, stat secondaire fixe et sous-stats', () => {
    const block = echoStatBlock(
      echo({
        substats: [
          { stat: 'critRate', value: 9.3 },
          { stat: 'atk', value: 50 },
        ],
      }),
    );
    expect(block).toEqual({ critDmg: 44, atk: 200, critRate: 9.3 });
  });
});

describe('critValue', () => {
  it('CV = 2 × Taux crit. + DGT crit. (sous-stats uniquement)', () => {
    expect(
      critValue(
        echo({
          substats: [
            { stat: 'critRate', value: 9.3 },
            { stat: 'critDmg', value: 18.6 },
            { stat: 'atkPct', value: 10.1 },
          ],
        }),
      ),
    ).toBeCloseTo(37.2, 5);
  });
});

describe('sonataPieceCounts', () => {
  it('compte une seule fois un même Écho équipé deux fois', () => {
    const counts = sonataPieceCounts([
      echo({ uid: 'a', echoId: 'whiff-whaff', cost: 1 }),
      echo({ uid: 'b', echoId: 'whiff-whaff', cost: 1 }),
      echo({ uid: 'c', echoId: 'carapace', cost: 3 }),
      echo({ uid: 'd', echoId: 'hoochief', cost: 3, sonata: 'moonlit-clouds' }),
    ]);
    expect(counts).toEqual({ 'sierra-gale': 2, 'moonlit-clouds': 1 });
  });
});

describe('validateLoadout', () => {
  const valid = [
    echo({ uid: '1' }),
    echo({ uid: '2', echoId: 'carapace', cost: 3, mainStat: 'aeroDmg' }),
    echo({ uid: '3', echoId: 'cyan-feathered-heron', cost: 3, mainStat: 'aeroDmg' }),
    echo({ uid: '4', echoId: 'whiff-whaff', cost: 1, mainStat: 'atkPct' }),
    echo({ uid: '5', echoId: 'dwarf-cassowary', cost: 1, mainStat: 'atkPct' }),
  ];

  it('accepte un ensemble 4-3-3-1-1 valide', () => {
    expect(validateLoadout(valid)).toEqual([]);
  });

  it('refuse plus de 12 de coût et plus de 5 Échos', () => {
    const issues = validateLoadout([...valid, echo({ uid: '6' })]);
    expect(issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['too-many-echoes', 'cost-exceeded']),
    );
  });

  it('refuse une stat principale impossible pour ce coût', () => {
    expect(validateLoadout([echo({ cost: 1, mainStat: 'critRate' })])).toEqual([
      { code: 'invalid-main-stat', uid: 'e1' },
    ]);
  });

  it('refuse un sous-stat hors palier, en double, ou plus de 5 sous-stats', () => {
    const codes = validateLoadout([
      echo({
        substats: [
          { stat: 'critRate', value: 9.4 },
          { stat: 'critDmg', value: 21 },
          { stat: 'critDmg', value: 12.6 },
          { stat: 'atk', value: 40 },
          { stat: 'hp', value: 320 },
          { stat: 'def', value: 40 },
        ],
      }),
    ]).map((i) => i.code);
    expect(codes).toEqual(['too-many-substats', 'invalid-substat-value', 'duplicate-substat']);
  });
});

describe('echoStatBlock — stat principale invalide', () => {
  it('ne compte aucune valeur pour une stat principale impossible (signalée par validateLoadout)', () => {
    expect(echoStatBlock(echo({ cost: 1, mainStat: 'critRate' }))).toEqual({
      critRate: 0,
      hp: 2280,
    });
  });
});
