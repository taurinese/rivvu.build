import { describe, expect, it } from 'vitest';
import { costTable, costTablesByRarity, keyedCostTables } from './costs.ts';

const character = `
local p = {}
function p._main(args)
  local com = args.common
  local asc_costs = {
    { ['Shell Credit'] = 5000,                        [com[1]] = 4                 },
    { ['Shell Credit'] = 10000,    [locspec] = 4,     [com[2]] = 4,    [boss] = 3  },
  }
  return asc_costs
end
return p`;

const skill = `
local p = {}
function p._main(args)
  local cost = {
    ['main5'] = {
      ['1'] = { Credit =   1500, wsm1 = 2, dwsm1 = 2 },
      ['2'] = { Credit =  30000, wsm3 = 5, dwsm3 = 3, boss = 1 },
    },
    ['inherent'] = { ['1'] = { Credit = 10000, wsm1 = 3, dwsm1 = 3, boss = 1 } },
  }
end
return p`;

const weapon = `
 function getAscensionCosts(weapon_data)
  if (weapon_data.rarity == 5) then
    return {
      { ['Shell Credit'] = 10000, [weapon_data.common[1]] = 6 },
      { ['Shell Credit'] = 20000, [weapon_data.ascension[1]] = 6, [weapon_data.common[2]] = 6 },
    }
  elseif (weapon_data.rarity == 2) then
    return {
      { ['Shell Credit'] = 4000, [weapon_data.common[1]] = 2 },
      { ['Shell Credit'] = '', [weapon_data.common[1]] = 2 },
    }
  end
end`;

describe('costTable', () => {
  it('lit une table de coûts locale et nomme les emplacements de matériaux', () => {
    expect(costTable(character, 'asc_costs')).toEqual([
      { credits: 5000, items: [{ slot: 'common1', qty: 4 }] },
      {
        credits: 10000,
        items: [
          { slot: 'local', qty: 4 },
          { slot: 'common2', qty: 4 },
          { slot: 'boss', qty: 3 },
        ],
      },
    ]);
  });

  it('échoue clairement si la table a disparu du module', () => {
    expect(() => costTable(character, 'absente')).toThrow('Table « absente » introuvable');
  });
});

describe('keyedCostTables', () => {
  it('lit les coûts du Forte par niveau, avec les matériaux de compétence et du boss hebdomadaire', () => {
    const tables = keyedCostTables(skill, 'cost', {
      boss: 'weeklyBoss',
      wsm: 'forte',
      dwsm: 'forteDrop',
    });
    expect(tables.main5).toEqual([
      {
        credits: 1500,
        items: [
          { slot: 'forte1', qty: 2 },
          { slot: 'forteDrop1', qty: 2 },
        ],
      },
      {
        credits: 30000,
        items: [
          { slot: 'forte3', qty: 5 },
          { slot: 'forteDrop3', qty: 3 },
          { slot: 'weeklyBoss', qty: 1 },
        ],
      },
    ]);
    expect(tables.inherent).toHaveLength(1);
  });
});

describe('costTablesByRarity', () => {
  it('lit les coûts d’ascension des armes par rareté, en écartant les paliers incomplets', () => {
    const byRarity = costTablesByRarity(weapon, 'getAscensionCosts');
    expect(byRarity[5]).toEqual([
      { credits: 10000, items: [{ slot: 'common1', qty: 6 }] },
      {
        credits: 20000,
        items: [
          { slot: 'ascension1', qty: 6 },
          { slot: 'common2', qty: 6 },
        ],
      },
    ]);
    expect(byRarity[2]).toEqual([{ credits: 4000, items: [{ slot: 'common1', qty: 2 }] }]);
  });
});
