import { describe, expect, it } from 'vitest';
import { BUILD_SCHEMA_VERSION, FORTE_SKILLS, createBuild, totalEchoCost } from './build';

const now = '2026-10-23T12:00:00.000Z';

describe('createBuild', () => {
  it('crée un build local prêt pour la synchronisation future', () => {
    const build = createBuild({ id: 'b1', resonatorId: 'jiyan', now });
    expect(build).toEqual({
      id: 'b1',
      ownerId: null,
      name: 'Nouveau build',
      createdAt: now,
      updatedAt: now,
      revision: 0,
      deletedAt: null,
      schemaVersion: BUILD_SCHEMA_VERSION,
      resonatorId: 'jiyan',
      level: { level: 90, ascension: 6 },
      chain: 0,
      weapon: null,
      forte: { normal: 10, skill: 10, circuit: 10, liberation: 10, intro: 10 },
      echoes: [],
      team: [null, null],
      notes: '',
      combat: true,
      enemy: { level: 90, res: 10 },
      customBuffs: [],
      planner: null,
    });
  });

  it('accepte un nom personnalisé', () => {
    expect(
      createBuild({ id: 'b2', resonatorId: 'jiyan', now, name: 'Jiyan — Hypercarry' }).name,
    ).toBe('Jiyan — Hypercarry');
  });

  it('liste les 5 compétences de Forte dans l’ordre du jeu', () => {
    expect(FORTE_SKILLS).toEqual(['normal', 'skill', 'circuit', 'liberation', 'intro']);
  });
});

describe('totalEchoCost', () => {
  it('additionne le coût des Échos équipés', () => {
    const build = createBuild({ id: 'b', resonatorId: 'jiyan', now });
    expect(totalEchoCost(build)).toBe(0);
    const echo = { uid: 'u', echoId: 'x', sonata: 's', mainStat: 'atkPct' as const, substats: [] };
    expect(
      totalEchoCost({
        ...build,
        echoes: [
          { ...echo, cost: 4 },
          { ...echo, uid: 'v', cost: 3 },
        ],
      }),
    ).toBe(7);
  });
});

describe('createBuild — combat', () => {
  it('active les bonus de combat et cible un ennemi niv. 90 à 10 % de résistance', () => {
    const build = createBuild({ id: 'b', resonatorId: 'jiyan', now });
    expect(build.combat).toBe(true);
    expect(build.enemy).toEqual({ level: 90, res: 10 });
    expect(build.customBuffs).toEqual([]);
  });
});
