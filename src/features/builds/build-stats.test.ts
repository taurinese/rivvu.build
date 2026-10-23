import { describe, expect, it } from 'vitest';
import { createBuild } from '@/domain/build';
import type { Build } from '@/domain/build';
import { computeBuildStats } from './build-stats';

const base = createBuild({ id: 'b', resonatorId: 'jiyan', now: '2026-10-23T12:00:00.000Z' });
const withWeapon: Build = {
  ...base,
  weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
};

describe('computeBuildStats', () => {
  it('Jiyan niv. 90 sans arme : stats de base du wiki', () => {
    const { stats } = computeBuildStats(base);
    expect(stats.baseAtk).toBeCloseTo(437.5, 2);
    expect(stats.hp).toBeCloseTo(10487.5, 2);
    expect(stats.critRate).toBe(5);
  });

  it('ajoute l’ATQ et la stat secondaire du Sommet verdoyant niv. 90', () => {
    const { stats } = computeBuildStats(withWeapon);
    expect(stats.baseAtk).toBeCloseTo(437.5 + 587, 0);
    expect(stats.critDmg).toBeCloseTo(198.6, 1);
  });

  it('ajoute les Échos équipés et détaille leur apport', () => {
    const { stats, echoBonus } = computeBuildStats({
      ...withWeapon,
      echoes: [
        {
          uid: 'e1',
          echoId: 'feilian-beringal',
          cost: 4,
          sonata: 'sierra-gale',
          mainStat: 'critDmg',
          substats: [
            { stat: 'critRate', value: 9.3 },
            { stat: 'atkPct', value: 10.1 },
          ],
        },
      ],
    });
    expect(echoBonus).toEqual({ critDmg: 44, atk: 150, critRate: 9.3, atkPct: 10.1 });
    expect(stats.critDmg).toBeCloseTo(242.6, 1);
    expect(stats.critRate).toBeCloseTo(14.3, 5);
    expect(stats.atk).toBeCloseTo(stats.baseAtk * 1.101 + 150, 5);
  });

  it('ignore une arme inconnue plutôt que d’échouer', () => {
    const { stats } = computeBuildStats({
      ...withWeapon,
      weapon: { ...withWeapon.weapon!, id: 'inconnue' },
    });
    expect(stats.baseAtk).toBeCloseTo(437.5, 2);
  });

  it('lève une erreur explicite si le Résonateur est inconnu', () => {
    expect(() => computeBuildStats({ ...base, resonatorId: 'inconnu' })).toThrow(/inconnu/);
  });
});

describe('computeBuildStats — ensembles, passif et buffs', () => {
  const sierra = (
    uid: string,
    echoId: string,
    cost: 1 | 3 | 4,
    mainStat: 'critDmg' | 'aeroDmg' | 'atkPct',
  ) => ({
    uid,
    echoId,
    cost,
    sonata: 'sierra-gale',
    mainStat,
    substats: [],
  });
  const full: Build = {
    ...withWeapon,
    echoes: [
      sierra('a', 'feilian-beringal', 4, 'critDmg'),
      sierra('b', 'carapace', 3, 'aeroDmg'),
      sierra('c', 'cyan-feathered-heron', 3, 'aeroDmg'),
      sierra('d', 'whiff-whaff', 1, 'atkPct'),
      sierra('e', 'dwarf-cassowary', 1, 'atkPct'),
    ],
  };

  it('en combat : 2 et 5 pièces, passif d’attribut et cumuls d’attaque lourde', () => {
    const { stats, sources } = computeBuildStats({ ...full, combat: true });
    // Échos 30 + 30, ensemble 10 + 30, passif « DGT d'attribut » 12
    expect(stats.dmgBonus.aero).toBeCloseTo(112, 5);
    // Passif conditionnel : 24 % × 2 cumuls
    expect(stats.dmgBonus.heavy).toBeCloseTo(48, 5);
    expect(sources.map((s) => s.kind)).toEqual(['echoes', 'set', 'set', 'weapon', 'weapon']);
  });

  it('hors combat : seulement les bonus permanents', () => {
    const { stats } = computeBuildStats({ ...full, combat: false });
    expect(stats.dmgBonus.aero).toBeCloseTo(82, 5);
    expect(stats.dmgBonus.heavy).toBe(0);
  });

  it('le passif suit le rang de syntonisation', () => {
    const { stats } = computeBuildStats({
      ...full,
      combat: false,
      weapon: { ...full.weapon!, rank: 5 },
    });
    expect(stats.dmgBonus.aero).toBeCloseTo(60 + 10 + 24, 5);
  });

  it('ajoute les buffs personnalisés actifs uniquement', () => {
    const { stats } = computeBuildStats({
      ...base,
      customBuffs: [
        { id: '1', label: 'Outro', stat: 'amplify', value: 15, enabled: true },
        { id: '2', label: 'Off', stat: 'critRate', value: 20, enabled: false },
      ],
    });
    expect(stats.amplify).toBe(15);
    expect(stats.critRate).toBe(5);
  });
});
