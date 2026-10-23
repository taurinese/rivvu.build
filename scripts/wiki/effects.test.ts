import { describe, expect, it } from 'vitest';
import { parsePassiveBonuses, parseSetBonuses } from './effects';

describe('parseSetBonuses', () => {
  it('lit un bonus 2 pièces permanent', () => {
    expect(parseSetBonuses('Aero DMG +10%.')).toEqual([
      { stat: 'aeroDmg', value: 10, conditional: false },
    ]);
    expect(parseSetBonuses('ATK +10%.')).toEqual([
      { stat: 'atkPct', value: 10, conditional: false },
    ]);
    expect(parseSetBonuses('Energy Regen +10%.')).toEqual([
      { stat: 'energyRegen', value: 10, conditional: false },
    ]);
    expect(parseSetBonuses('Healing + 10%')).toEqual([
      { stat: 'healingBonus', value: 10, conditional: false },
    ]);
  });

  it('marque comme conditionnel un bonus qui dépend d’une action', () => {
    expect(parseSetBonuses('Aero DMG +30% for 15s after releasing Intro Skill.')).toEqual([
      { stat: 'aeroDmg', value: 30, conditional: true },
    ]);
  });

  it('ne devine rien quand le texte est ambigu', () => {
    expect(
      parseSetBonuses(
        'Healing a Resonator in the team increases the ATK of all Resonators in the team by 10% for 30s.',
      ),
    ).toEqual([]);
  });
});

describe('parsePassiveBonuses', () => {
  it('lit les phrases « Increases X by (varN)% » et leur condition', () => {
    expect(
      parsePassiveBonuses(
        'Increases Attribute DMG Bonus by (var1)%. Every time Intro Skill or Resonance Liberation is cast, increases Heavy Attack DMG Bonus by (var2)%, stacking up to 2 time(s). This effect lasts for 14s.',
      ),
    ).toEqual([
      { stat: 'elementalDmg', variable: 1, conditional: false, stacks: 1 },
      { stat: 'heavyDmg', variable: 2, conditional: true, stacks: 2 },
    ]);
  });

  it('reconnaît les stats usuelles', () => {
    expect(parsePassiveBonuses('Increases ATK by (var1)%.')).toEqual([
      { stat: 'atkPct', variable: 1, conditional: false, stacks: 1 },
    ]);
    expect(parsePassiveBonuses('Increases Crit. Rate by (var1)%.')).toEqual([
      { stat: 'critRate', variable: 1, conditional: false, stacks: 1 },
    ]);
    expect(parsePassiveBonuses('Increases Energy Regen by (var1)%.')).toEqual([
      { stat: 'energyRegen', variable: 1, conditional: false, stacks: 1 },
    ]);
  });

  it('ignore les effets qu’il ne sait pas modéliser', () => {
    expect(
      parsePassiveBonuses('When the Resonator dashes, heals (var1)% of their Max HP.'),
    ).toEqual([]);
  });
});
