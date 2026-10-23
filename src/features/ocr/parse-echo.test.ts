import { describe, expect, it } from 'vitest';
import { echoFromParsed, matchStatLabel, parseEchoText } from './parse-echo';

describe('matchStatLabel', () => {
  it('reconnaît les libellés anglais et français, plats ou en %', () => {
    expect(matchStatLabel('Crit. Rate', true)).toBe('critRate');
    expect(matchStatLabel('Taux crit.', true)).toBe('critRate');
    expect(matchStatLabel('Crit. DMG', true)).toBe('critDmg');
    expect(matchStatLabel('DGT crit.', true)).toBe('critDmg');
    expect(matchStatLabel('ATK', false)).toBe('atk');
    expect(matchStatLabel('ATQ', true)).toBe('atkPct');
    expect(matchStatLabel('PV', true)).toBe('hpPct');
    expect(matchStatLabel('HP', false)).toBe('hp');
    expect(matchStatLabel('DÉF', false)).toBe('def');
    expect(matchStatLabel('Energy Regen', true)).toBe('energyRegen');
    expect(matchStatLabel("Régén. d'énergie", true)).toBe('energyRegen');
    expect(matchStatLabel('Heavy Attack DMG Bonus', true)).toBe('heavyDmg');
    expect(matchStatLabel("Bonus DGT d'attaque normale", true)).toBe('basicDmg');
    expect(matchStatLabel('Resonance Liberation DMG Bonus', true)).toBe('liberationDmg');
    expect(matchStatLabel('Bonus DGT de compétence de résonance', true)).toBe('skillDmg');
    expect(matchStatLabel('Aero DMG Bonus', true)).toBe('aeroDmg');
    expect(matchStatLabel('Bonus DGT Électro', true)).toBe('electroDmg');
    expect(matchStatLabel('Healing Bonus', true)).toBe('healingBonus');
    expect(matchStatLabel('Niveau', false)).toBeNull();
  });
});

describe('parseEchoText', () => {
  it('lit une capture anglaise : espèce, coût, stat principale et sous-stats', () => {
    const parsed = parseEchoText(`Feilian Beringal
COST 4
+25
Crit. DMG 44.0%
ATK 150
Crit. Rate 8.1%
ATK 10.9%
Heavy Attack DMG Bonus 8.6%
DEF 50
Energy Regen 9.2%`);
    expect(parsed).toMatchObject({
      echoId: 'feilian-beringal',
      cost: 4,
      mainStat: 'critDmg',
      substats: [
        { stat: 'critRate', value: 8.1 },
        { stat: 'atkPct', value: 10.9 },
        { stat: 'heavyDmg', value: 8.6 },
        { stat: 'def', value: 50 },
        { stat: 'energyRegen', value: 9.2 },
      ],
      warnings: [],
    });
  });

  it('lit une capture française, virgules et espaces compris, malgré le bruit', () => {
    const parsed = parseEchoText(`  Tortue c1ochante
Coût 4 ~
DGT crit. 44,0 %
ATQ 150
Taux crit. 6,3%
DGT crit. 12,6 %
PV 470
Bonus DGT d'attaque normale 7,1 %
Régén. d'énergie 10,0 %`);
    expect(parsed.echoId).toBe('bell-borne-geochelone');
    expect(parsed.mainStat).toBe('critDmg');
    expect(parsed.substats).toEqual([
      { stat: 'critRate', value: 6.3 },
      { stat: 'critDmg', value: 12.6 },
      { stat: 'hp', value: 470 },
      { stat: 'basicDmg', value: 7.1 },
      { stat: 'energyRegen', value: 10 },
    ]);
  });

  it('ramène une valeur mal lue au palier le plus proche, et signale ce qui est écarté', () => {
    const parsed = parseEchoText(`Feilian Beringal
COST 4
Crit. Rate 22.0%
ATK 150
Crit. DMG 13.9%
Crit. Rate 42.0%
Inconnu 12`);
    expect(parsed.mainStat).toBe('critRate');
    expect(parsed.substats).toEqual([{ stat: 'critDmg', value: 13.8 }]);
    expect(parsed.warnings).toEqual(['Valeur illisible pour Taux crit. (42\u202f%)']);
  });

  it('déduit le coût de l’espèce, et le signale si rien n’est reconnu', () => {
    expect(parseEchoText('Feilian Beringal\nCrit. DMG 44%').cost).toBe(4);
    const unknown = parseEchoText('texte illisible');
    expect(unknown).toMatchObject({ echoId: null, cost: null, mainStat: null, substats: [] });
    expect(unknown.warnings).toContain('Écho non reconnu : choisissez-le à la main.');
  });

  it('garde au plus 5 sous-stats, sans doublon', () => {
    const parsed = parseEchoText(`Feilian Beringal
COST 4
Crit. DMG 44.0%
ATK 150
Crit. Rate 8.1%
Crit. Rate 8.7%
ATK 10.9%
HP 8.6%
DEF 50
Energy Regen 9.2%
Basic Attack DMG Bonus 7.9%`);
    expect(parsed.substats.map((s) => s.stat)).toEqual([
      'critRate',
      'atkPct',
      'hpPct',
      'def',
      'energyRegen',
    ]);
  });
});

describe('echoFromParsed', () => {
  const species = { id: 'feilian-beringal', cost: 4 as const, sonatas: ['sierra-gale'] };

  it('reprend la stat principale et les sous-stats lues', () => {
    const echo = echoFromParsed(
      {
        echoId: species.id,
        cost: 4,
        mainStat: 'critDmg',
        substats: [{ stat: 'critRate', value: 8.1 }],
        warnings: [],
      },
      species,
      'u1',
      'aero',
    );
    expect(echo).toEqual({
      uid: 'u1',
      echoId: 'feilian-beringal',
      cost: 4,
      sonata: 'sierra-gale',
      mainStat: 'critDmg',
      substats: [{ stat: 'critRate', value: 8.1 }],
    });
  });

  it('garde la stat principale par défaut si celle lue est impossible pour ce coût', () => {
    const echo = echoFromParsed(
      { echoId: null, cost: null, mainStat: 'aeroDmg', substats: [], warnings: [] },
      species,
      'u2',
      'aero',
    );
    expect(echo.mainStat).toBe('critRate');
  });
});
