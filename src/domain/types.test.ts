import { describe, expect, it } from 'vitest';
import { attackDmgKey, elementDmgKey, isStatKey } from './types';

describe('clés de bonus de dégâts', () => {
  it('dérivent la clé de stat d’un attribut ou d’un type d’attaque', () => {
    expect(elementDmgKey('aero')).toBe('aeroDmg');
    expect(attackDmgKey('liberation')).toBe('liberationDmg');
  });
});

describe('isStatKey', () => {
  it('n’accepte que les stats connues (jamais « __proto__ » ni « constructor »)', () => {
    expect(isStatKey('critRate')).toBe(true);
    expect(isStatKey('__proto__')).toBe(false);
    expect(isStatKey('constructor')).toBe(false);
  });
});
