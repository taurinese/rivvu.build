import { describe, expect, it } from 'vitest';
import { createBuild } from '@/domain/build';
import type { EchoInstance } from '@/domain/echoes';
import { optimizeBuild } from './optimize-build';

const build = {
  ...createBuild({ id: 'b', resonatorId: 'jiyan', now: '2026-10-23T12:00:00.000Z' }),
  weapon: { id: 'verdant-summit', level: { level: 90, ascension: 6 }, rank: 1 },
};
const liberation = 'jiyan-emerald-storm-prelude';

const echo = (
  uid: string,
  echoId: string,
  cost: EchoInstance['cost'],
  sonata: string,
  mainStat: EchoInstance['mainStat'],
  substats: EchoInstance['substats'] = [],
): EchoInstance => ({ uid, echoId, cost, sonata, mainStat, substats });

const inventory: EchoInstance[] = [
  echo('crit', 'feilian-beringal', 4, 'sierra-gale', 'critDmg', [
    { stat: 'critRate', value: 10.5 },
  ]),
  echo('hp4', 'nightmare-feilian-beringal', 4, 'sierra-gale', 'hpPct'),
  echo('aero1', 'carapace', 3, 'sierra-gale', 'aeroDmg'),
  echo('aero2', 'cyan-feathered-heron', 3, 'sierra-gale', 'aeroDmg'),
  echo('energy', 'hoochief', 3, 'sierra-gale', 'energyRegen'),
  echo('atk1', 'aero-predator', 1, 'sierra-gale', 'atkPct'),
  echo('atk2', 'chirpuff', 1, 'sierra-gale', 'atkPct'),
  echo('def1', 'dwarf-cassowary', 1, 'sierra-gale', 'defPct'),
];

describe('optimizeBuild', () => {
  it('choisit les Échos qui maximisent les dégâts de la compétence visée', () => {
    const outcome = optimizeBuild({ build, inventory, skillId: liberation });
    const [best] = outcome.results;
    expect(best?.echoes.map((e) => e.uid).sort()).toEqual([
      'aero1',
      'aero2',
      'atk1',
      'atk2',
      'crit',
    ]);
    expect(best!.value).toBeGreaterThan(outcome.current);
    expect(outcome.current).toBeGreaterThan(0);
  });

  it('ignore les Échos invalides et sait n’avoir rien à proposer', () => {
    expect(optimizeBuild({ build, inventory: [], skillId: liberation }).results).toEqual([]);
    expect(() => optimizeBuild({ build, inventory, skillId: 'inconnue' })).toThrow();
  });
});
