import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import curvesJson from './game/curves.json';
import echoesJson from './game/echoes.json';
import materialsJson from './game/materials.json';
import metaJson from './game/meta.json';
import resonatorsJson from './game/resonators.json';
import skillsJson from './game/skills.json';
import sonatasJson from './game/sonatas.json';
import weaponsJson from './game/weapons.json';
import {
  curvesSchema,
  echoSchema,
  materialsSchema,
  metaSchema,
  resonatorSchema,
  skillSchema,
  sonataSchema,
  weaponSchema,
} from './schema';

const collections = [
  ['resonators', resonatorsJson, resonatorSchema],
  ['weapons', weaponsJson, weaponSchema],
  ['echoes', echoesJson, echoSchema],
  ['sonatas', sonatasJson, sonataSchema],
] as const;

describe('matériaux d’évolution', () => {
  const materials = materialsSchema.parse(materialsJson);
  const items = new Set(materials.items.map((i) => i.id));
  const credits = (steps: { credits: number }[]) => steps.reduce((sum, s) => sum + s.credits, 0);
  const needs = (keys: (keyof typeof materials.costs)[]) =>
    new Set(
      keys.flatMap((k) => {
        const value = materials.costs[k];
        const steps = Array.isArray(value) ? value : Object.values(value).flat();
        return steps.flatMap((s) => s.items.map((i) => i.slot));
      }),
    );

  it('retrouvent les totaux publiés par le wiki (Jiyan, Forte)', () => {
    // Wiki, page Jiyan : 280 000 Coquilles pour une compétence de 1 à 10, 30 000 pour les
    // compétences innées, 150 000 pour une branche de bonus de stats.
    expect(credits(materials.costs.forte)).toBe(280000);
    expect(credits(materials.costs.inherent)).toBe(30000);
    expect(credits(materials.costs.statBonus)).toBe(150000);
  });

  it('couvrent chaque Résonateur et chaque arme, avec des objets connus et illustrés', () => {
    expect(Object.keys(materials.resonators).sort()).toEqual(
      resonatorsJson.map((r) => r.id).sort(),
    );
    expect(Object.keys(materials.weapons).sort()).toEqual(weaponsJson.map((w) => w.id).sort());
    for (const slots of [
      ...Object.values(materials.resonators),
      ...Object.values(materials.weapons),
    ])
      for (const item of Object.values(slots)) expect(items.has(item), item).toBe(true);
    for (const item of materials.items)
      if (item.icon) expect(existsSync(join('public', item.icon)), item.icon).toBe(true);
    expect(items.has('shell-credit')).toBe(true);
  });

  it('résolvent tous les emplacements, sauf objets absents du wiki (signalés dans meta)', () => {
    const resonatorSlots = needs(['resonatorAscension', 'forte', 'inherent', 'statBonus']);
    const missing = Object.entries(materials.resonators).flatMap(([id, slots]) =>
      [...resonatorSlots].filter((slot) => !(slot in slots)).map((slot) => `${id}:${slot}`),
    );
    // Pages d'objets absentes du wiki lors du dernier import (voir meta.json → skipped).
    expect(missing.sort()).toEqual(['hsin:local', 'suoming:local']);
    const weaponSlots = needs(['weaponAscension']);
    for (const [id, slots] of Object.entries(materials.weapons))
      for (const slot of weaponSlots) expect(slot in slots, `${id}:${slot}`).toBe(true);
  });
});

describe('compétences', () => {
  it('respectent le schéma et référencent un Résonateur connu', () => {
    const ids = new Set(resonatorsJson.map((r) => r.id));
    for (const skill of skillsJson) {
      expect(skillSchema.safeParse(skill).error?.issues ?? [], skill.id).toEqual([]);
      expect(ids.has(skill.resonatorId), skill.id).toBe(true);
    }
  });

  it('couvrent presque tous les Résonateurs', () => {
    const covered = new Set(skillsJson.map((s) => s.resonatorId));
    expect(covered.size).toBeGreaterThanOrEqual(resonatorsJson.length - 2);
  });
});

describe('données du jeu', () => {
  it.each(collections)('%s : chaque entrée respecte le schéma', (_, items, schema) => {
    for (const item of items) {
      const result = schema.safeParse(item);
      expect(result.error?.issues ?? [], JSON.stringify(item).slice(0, 120)).toEqual([]);
    }
  });

  it.each(collections)('%s : identifiants uniques', (_, items) => {
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(collections)('%s : toutes les images référencées existent', (_, items) => {
    for (const item of items) {
      for (const path of [item.icon, 'sprite' in item ? item.sprite : null]) {
        if (path) expect(existsSync(join('public', path)), path).toBe(true);
      }
    }
  });

  it.each(collections)(
    '%s : noms sans caractères parasites (guillemets, balises, espaces doubles)',
    (_, items) => {
      for (const item of items) {
        for (const name of [item.name.en, item.name.fr]) {
          expect(name, item.id).not.toMatch(/["“”<>{}[\]|=]|\s{2,}|^\s|\s$/);
        }
      }
    },
  );

  it('les Échos ne référencent que des ensembles connus', () => {
    const sonataIds = new Set(sonatasJson.map((s) => s.id));
    for (const echo of echoesJson) {
      for (const sonata of echo.sonatas)
        expect(sonataIds.has(sonata), `${echo.id} → ${sonata}`).toBe(true);
    }
  });

  it('chaque ensemble de sonate a au moins un Écho', () => {
    const used = new Set(echoesJson.flatMap((e) => e.sonatas));
    for (const sonata of sonatasJson) expect(used.has(sonata.id), sonata.id).toBe(true);
  });

  it('les courbes et les métadonnées respectent leur schéma', () => {
    expect(curvesSchema.safeParse(curvesJson).error?.issues ?? []).toEqual([]);
    expect(metaSchema.safeParse(metaJson).error?.issues ?? []).toEqual([]);
  });

  it('la couverture minimale du jeu est atteinte', () => {
    expect(resonatorsJson.length).toBeGreaterThanOrEqual(45);
    expect(weaponsJson.length).toBeGreaterThanOrEqual(100);
    expect(echoesJson.length).toBeGreaterThanOrEqual(150);
    expect(sonatasJson.length).toBeGreaterThanOrEqual(30);
  });
});

describe('courbes d’armes dérivées', () => {
  const curves = curvesSchema.parse(curvesJson);
  const ATK_KEYS = [
    '1b',
    '20b',
    '20a',
    '40b',
    '40a',
    '50b',
    '50a',
    '60b',
    '60a',
    '70b',
    '70a',
    '80b',
    '80a',
    '90b',
  ];

  it('reproduisent toutes les tables d’ATQ publiées à ±1 près', () => {
    for (const [base, table] of Object.entries(curves.reference.weaponAtk)) {
      ATK_KEYS.forEach((key, i) => {
        const ratio = curves.weaponAtk[i]?.ratio ?? NaN;
        expect(
          Math.abs(Math.round(Number(base) * ratio) - (table[key] ?? NaN)),
          `${base}@${key}`,
        ).toBeLessThanOrEqual(1);
      });
    }
  });

  it('reproduisent toutes les tables de stat secondaire publiées à ±0,1 près (base réelle à ±0,05 de l’étiquette)', () => {
    // Les clés du wiki sont des étiquettes arrondies (« 6.8% » pour une base réelle de 6,75 %).
    const levels = curves.weaponSecondary.filter((s) => s.level > 1);
    for (const [label, table] of Object.entries(curves.reference.weaponSecondary)) {
      const candidates = Array.from({ length: 11 }, (_, i) => parseFloat(label) - 0.05 + i * 0.01);
      const fits = candidates.some((base) =>
        levels.every(
          ({ level, ratio }) =>
            Math.abs(base * ratio - (table[String(level)] ?? NaN)) <= 0.1 + 1e-9,
        ),
      );
      expect(fits, label).toBe(true);
    }
  });
});
