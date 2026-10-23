import { describe, expect, it } from 'vitest';
import { inferDamageType, isDamageRow, parseMotionValue, scalingValues } from './skills';

describe('parseMotionValue', () => {
  it('additionne les termes « valeur × coups »', () => {
    expect(parseMotionValue('36.80%')).toEqual({ value: 0.368, assumedPercent: false });
    expect(parseMotionValue('32.95%*8')?.value).toBeCloseTo(2.636, 10);
    expect(parseMotionValue('11.87%*7 + 77.18%*2')?.value).toBeCloseTo(0.8309 + 1.5436, 10);
    expect(parseMotionValue('60%+120%')?.value).toBeCloseTo(1.8, 10);
  });

  it('interprète un nombre sans % comme un pourcentage et le signale', () => {
    expect(parseMotionValue('11.16*6')).toEqual({
      value: expect.closeTo(0.6696, 10) as number,
      assumedPercent: true,
    });
  });

  it('refuse une valeur vide ou non numérique', () => {
    expect(parseMotionValue('')).toBeNull();
    expect(parseMotionValue('16s')).toBeNull();
    expect(parseMotionValue('Unknown')).toBeNull();
  });
});

describe('isDamageRow', () => {
  it('ne garde que les lignes de dégâts', () => {
    expect(isDamageRow('Lance Of Qingloong Part 1 Damage')).toBe(true);
    expect(isDamageRow('Skill DMG')).toBe(true);
    expect(isDamageRow('Cooldown')).toBe(false);
    expect(isDamageRow('DMG Reduction')).toBe(false);
    expect(isDamageRow('Healing')).toBe(false);
    expect(isDamageRow('Shield Absorption')).toBe(false);
  });
});

describe('inferDamageType', () => {
  it('suit le type de la compétence par défaut', () => {
    expect(inferDamageType('Resonance Skill', 'Skill DMG', '')).toEqual({
      type: 'skill',
      inferred: false,
    });
    expect(inferDamageType('Resonance Liberation', 'Skill DMG', '')).toEqual({
      type: 'liberation',
      inferred: false,
    });
    expect(inferDamageType('Intro Skill', 'Skill DMG', '')).toEqual({
      type: 'intro',
      inferred: false,
    });
  });

  it('distingue attaque normale et attaque lourde dans l’attaque de base', () => {
    expect(inferDamageType('Basic Attack', 'Part 1 Damage', '')).toEqual({
      type: 'basic',
      inferred: false,
    });
    expect(inferDamageType('Basic Attack', 'Heavy Attack Damage', '')).toEqual({
      type: 'heavy',
      inferred: false,
    });
    expect(inferDamageType('Basic Attack', 'Dodge Counter Damage', '')).toEqual({
      type: 'basic',
      inferred: false,
    });
  });

  it('applique « considered as … damage » du texte du jeu', () => {
    const info =
      'Perform up to 3 continuous attacks, dealing Aero DMG, considered as Heavy Attack damage.';
    expect(
      inferDamageType('Resonance Liberation', 'Lance Of Qingloong Part 1 Damage', info),
    ).toEqual({
      type: 'heavy',
      inferred: false,
    });
  });

  it('marque comme déduit un circuit Forte sans précision', () => {
    expect(inferDamageType('Forte Circuit', 'Some Damage', '')).toEqual({
      type: 'skill',
      inferred: true,
    });
    expect(inferDamageType('Forte Circuit', 'Heavy Attack Damage', '')).toEqual({
      type: 'heavy',
      inferred: false,
    });
  });
});

describe('scalingValues', () => {
  it('lit le format « clé_niveau »', () => {
    expect(scalingValues({ dmg_1: '10%', dmg_2: '11%' }, 'dmg')).toEqual(['10%', '11%']);
  });

  it('lit le format « valeurs séparées par ; »', () => {
    expect(scalingValues({ 'Skill DMG': '100.00;108.20;116.40' }, 'Skill DMG')).toEqual([
      '100.00',
      '108.20',
      '116.40',
    ]);
  });

  it('renvoie une liste vide si la clé est absente', () => {
    expect(scalingValues({}, 'x')).toEqual([]);
  });
});

describe('parseMotionValue avec unité dans le titre', () => {
  it('lit « 100.00 » comme 100 % sans le signaler comme supposé', () => {
    expect(parseMotionValue('100.00', { percentUnit: true })).toEqual({
      value: 1,
      assumedPercent: false,
    });
    expect(parseMotionValue('21.00*5', { percentUnit: true })?.value).toBeCloseTo(1.05, 10);
  });
});
