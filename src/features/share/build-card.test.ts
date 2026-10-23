import { describe, expect, it } from 'vitest';
import { createBuild } from '@/domain/build';
import type { Build } from '@/domain/build';
import { buildCardModel } from './build-card';

const build: Build = {
  ...createBuild({
    id: 'b',
    resonatorId: 'jiyan',
    now: '2026-10-23T12:00:00.000Z',
    name: 'Jiyan crit',
  }),
  chain: 2,
  weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
  echoes: [
    {
      uid: 'e1',
      echoId: 'feilian-beringal',
      cost: 4,
      sonata: 'sierra-gale',
      mainStat: 'critDmg',
      substats: [],
    },
  ],
};

describe('buildCardModel', () => {
  it('rassemble ce que montre l’image partagée', () => {
    const model = buildCardModel(build)!;
    expect(model).toMatchObject({
      resonatorName: 'Jiyan',
      buildName: 'Jiyan crit',
      element: 'aero',
      subtitle: 'Niv. 90/90 · S2',
      weapon: { name: 'Sommet verdoyant', meta: 'Niv. 90/90 · R1' },
    });
    expect(model.stats.map((s) => s.label)).toEqual([
      'PV',
      'ATQ',
      'DÉF',
      'Taux crit.',
      'DGT crit.',
      'Régén.',
      'Bonus Aero',
    ]);
    expect(model.stats.find((s) => s.label === 'ATQ')?.value).toMatch(/^\d/);
    expect(model.echoes).toEqual([
      expect.objectContaining({ name: 'Feilian Beringal', cost: 4, mainStat: 'DGT crit.' }),
    ]);
    expect(model.sets).toEqual([expect.objectContaining({ pieces: 1 })]);
  });

  it('renvoie null pour un Résonateur absent des données', () => {
    expect(buildCardModel({ ...build, resonatorId: 'disparu' })).toBeNull();
  });

  it('reste lisible sans arme ni données connues pour un Écho', () => {
    const model = buildCardModel({
      ...build,
      weapon: null,
      echoes: [{ ...build.echoes[0]!, echoId: 'echo-inconnu', sonata: 'ensemble-inconnu' }],
    })!;
    expect(model.weapon).toBeNull();
    expect(model.echoes[0]).toMatchObject({ name: 'echo-inconnu', icon: null });
    expect(model.sets[0]).toMatchObject({ name: 'ensemble-inconnu', icon: null });
  });
});
