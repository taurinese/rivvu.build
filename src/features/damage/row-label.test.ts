import { describe, expect, it } from 'vitest';
import { translateRowLabel } from './row-label';

describe('translateRowLabel', () => {
  it('traduit les termes courants des lignes de dégâts', () => {
    expect(translateRowLabel('Part 1 Damage')).toBe('Partie 1 — DGT');
    expect(translateRowLabel('Heavy Attack Damage')).toBe('Attaque lourde — DGT');
    expect(translateRowLabel('Skill DMG')).toBe('Compétence — DGT');
    expect(translateRowLabel('Mid-Air Attack Damage')).toBe('Attaque aérienne — DGT');
    expect(translateRowLabel('Dodge Counter Damage')).toBe('Contre-esquive — DGT');
    expect(translateRowLabel('Basic Attack 3 DMG')).toBe('Attaque normale 3 — DGT');
  });

  it('traduit les étapes, la charge et les noms de catégories de compétences', () => {
    expect(translateRowLabel('Stage 3 DMG')).toBe('Coup 3 — DGT');
    expect(translateRowLabel('Mid-air Attack Stage 2 DMG')).toBe('Attaque aérienne coup 2 — DGT');
    expect(translateRowLabel('Full Charge Heavy Attack Damage')).toBe(
      'Attaque lourde pleine charge — DGT',
    );
    expect(translateRowLabel('Mid-air Dodge Counter DMG')).toBe('Contre-esquive aérienne — DGT');
    expect(translateRowLabel('Resonance Skill - Furled Canopy DMG')).toBe(
      'Compétence de résonance - Furled Canopy — DGT',
    );
    expect(translateRowLabel('Resonance Liberation DMG')).toBe('Libération de résonance — DGT');
    expect(translateRowLabel('Intro Skill DMG')).toBe('Compétence d’intro — DGT');
  });

  it('garde les noms propres et le reste tel quel', () => {
    expect(translateRowLabel('Lance Of Qingloong Part 2 Damage')).toBe(
      'Lance Of Qingloong Partie 2 — DGT',
    );
    expect(translateRowLabel('Vining Ronde')).toBe('Vining Ronde');
  });
});
