import { describe, expect, it } from 'vitest';
import { attackDmgKey, elementDmgKey } from './types';

describe('clés de bonus de dégâts', () => {
  it('dérivent la clé de stat d’un attribut ou d’un type d’attaque', () => {
    expect(elementDmgKey('aero')).toBe('aeroDmg');
    expect(attackDmgKey('liberation')).toBe('liberationDmg');
  });
});
