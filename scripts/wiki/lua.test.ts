import { describe, expect, it } from 'vitest';
import { luaReturnTable } from './lua';

describe('luaReturnTable', () => {
  it('convertit une table Lua retournée en objet JS', () => {
    const src = `-- commentaire
return {
  ['Jiyan'] = {
    ['rarity'] = 5,
    ['common'] = {'LF Howler Core', 'MF Howler Core'},
    ['base_atk'] = 35,
    ok = true,
  },
  ["Verdant Summit"] = { base = 47.0, ratio = 11+1/6, neg = -2 },
}`;
    expect(luaReturnTable(src)).toEqual({
      Jiyan: { rarity: 5, common: ['LF Howler Core', 'MF Howler Core'], base_atk: 35, ok: true },
      'Verdant Summit': { base: 47, ratio: 11 + 1 / 6, neg: -2 },
    });
  });

  it('résout une table locale renvoyée ensuite', () => {
    const src = `local t = { ['1b'] = "47"; ["20b"] = "122"; }
local house = { ["47"] = t }
return house`;
    expect(luaReturnTable(src)).toEqual({ '47': { '1b': '47', '20b': '122' } });
  });

  it('lève une erreur explicite si aucune table n’est retournée', () => {
    expect(() => luaReturnTable('local x = 1')).toThrow(/return/);
  });
});
