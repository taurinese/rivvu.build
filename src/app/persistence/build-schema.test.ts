import { describe, expect, it } from 'vitest';
import { migrateBuild } from './build-schema';

describe('migrateBuild', () => {
  it('rejette une valeur qui n’est pas un objet', () => {
    expect(() => migrateBuild(null)).toThrow('Document de build invalide');
    expect(() => migrateBuild('texte')).toThrow('Document de build invalide');
  });

  it('rejette une version négative sans migration connue', () => {
    expect(() => migrateBuild({ schemaVersion: -1 })).toThrow(
      'Aucune migration depuis la version -1',
    );
  });
});

describe('migration v1 → v2', () => {
  it('ajoute les réglages de combat, l’ennemi par défaut et une liste de buffs vide', () => {
    const v1 = {
      id: 'b',
      ownerId: null,
      name: 'Ancien build',
      createdAt: '2026-10-23T12:00:00.000Z',
      updatedAt: '2026-10-23T12:00:00.000Z',
      revision: 3,
      deletedAt: null,
      schemaVersion: 1,
      resonatorId: 'jiyan',
      level: { level: 90, ascension: 6 },
      chain: 0,
      weapon: null,
      forte: { normal: 10, skill: 10, circuit: 10, liberation: 10, intro: 10 },
      echoes: [],
      team: [null, null],
      notes: '',
    };
    expect(migrateBuild(v1)).toEqual({
      ...v1,
      schemaVersion: 2,
      combat: true,
      enemy: { level: 90, res: 10 },
      customBuffs: [],
    });
  });
});
