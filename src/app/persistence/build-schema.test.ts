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
