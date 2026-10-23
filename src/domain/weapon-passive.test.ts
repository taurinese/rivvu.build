import { describe, expect, it } from 'vitest';
import { formatPassive } from './weapon-passive';

const passive = {
  name: 'Swordsworn',
  text: 'Increases Attribute DMG Bonus by (var1)%. Heavy Attack DMG Bonus +(var2)%, up to 2 time(s).',
  values: [
    [12, 24],
    [15, 30],
    [18, 36],
    [21, 42],
    [24, 48],
  ],
};

describe('formatPassive', () => {
  it('remplace les marqueurs par les valeurs du rang choisi', () => {
    expect(formatPassive(passive, 1)).toBe(
      'Increases Attribute DMG Bonus by 12%. Heavy Attack DMG Bonus +24%, up to 2 time(s).',
    );
    expect(formatPassive(passive, 5)).toBe(
      'Increases Attribute DMG Bonus by 24%. Heavy Attack DMG Bonus +48%, up to 2 time(s).',
    );
  });

  it('borne le rang entre 1 et 5 et laisse un marqueur inconnu intact', () => {
    expect(formatPassive({ ...passive, text: '(var1) (var9)' }, 9)).toBe('24 (var9)');
    expect(formatPassive({ ...passive, text: '(var1)' }, 0)).toBe('12');
  });

  it('affiche les décimales utiles', () => {
    expect(
      formatPassive(
        { name: null, text: '(var1)%', values: [[6.25], [7.5], [8.75], [10], [11.25]] },
        1,
      ),
    ).toBe('6.25%');
  });
});
