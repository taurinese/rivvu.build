import { describe, expect, it } from 'vitest';
import { parsePercent, roundTo, slugify, toElement, toStatKey, toWeaponType } from './normalize';

describe('slugify', () => {
  it('produit un identifiant stable en minuscules', () => {
    expect(slugify('Xiangli Yao')).toBe('xiangli-yao');
    expect(slugify('Yangyang: Xuanling')).toBe('yangyang-xuanling');
    expect(slugify("Flamewing's Shadow")).toBe('flamewings-shadow');
    expect(slugify('Nightmare: Feilian Beringal')).toBe('nightmare-feilian-beringal');
    expect(slugify('Jué')).toBe('jue');
  });
});

describe('parsePercent', () => {
  it('lit « 48.6% », « 8.4%% » et « 12 »', () => {
    expect(parsePercent('48.6%')).toBe(48.6);
    expect(parsePercent('8.4%%')).toBe(8.4);
    expect(parsePercent(' 12 ')).toBe(12);
    expect(parsePercent('Unknown')).toBeNull();
  });
});

describe('roundTo', () => {
  it('élimine le bruit des flottants du wiki', () => {
    expect(roundTo(11.999999731779099, 2)).toBe(12);
    expect(roundTo(16.050000488758087, 2)).toBe(16.05);
  });
});

describe('correspondances', () => {
  it('traduit les attributs, types d’armes et stats du wiki', () => {
    expect(toElement('Aero')).toBe('aero');
    expect(toElement('Multiple')).toBeNull();
    expect(toWeaponType('Broadblade')).toBe('broadblade');
    expect(toWeaponType('Rectifier')).toBe('rectifier');
    expect(toStatKey('Crit. DMG')).toBe('critDmg');
    expect(toStatKey('ATK')).toBe('atkPct');
    expect(toStatKey('Energy Regen')).toBe('energyRegen');
    expect(toStatKey('???')).toBeNull();
  });
});
