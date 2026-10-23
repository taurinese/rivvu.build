/**
 * Importe les données du jeu depuis le wiki Wuthering Waves (Fandom) :
 *   node scripts/import-game-data.ts [--skip-images] [--force-images]
 *
 * Sorties : src/data/game/*.json (validés par Zod) et public/assets/game/** (WebP).
 * Toute entrée incomplète est écartée et listée dans meta.json (« skipped ») : on n'invente aucune valeur.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { z } from 'zod';
import type { SKILL_TYPES } from '../src/data/schema.ts';
import {
  curvesSchema,
  echoSchema,
  materialsSchema,
  metaSchema,
  resonatorSchema,
  skillSchema,
  sonataSchema,
  weaponSchema,
} from '../src/data/schema.ts';
import { ELEMENTS, WEAPON_TYPES } from '../src/domain/types.ts';
import type { Element, StatKey, WeaponType } from '../src/domain/types.ts';
import { LEVEL_STEPS } from '../src/domain/levels.ts';
import {
  WIKI_BASE,
  fetchWithRetry,
  imageUrls,
  moduleSource,
  pageUrl,
  pagesUsingTemplate,
  wikitextOf,
} from './wiki/client.ts';
import { costTable, costTablesByRarity, keyedCostTables } from './wiki/costs.ts';
import { parsePassiveBonuses, parseSetBonuses } from './wiki/effects.ts';
import { luaReturnTable } from './wiki/lua.ts';
import { inferDamageType, isDamageRow, parseMotionValue, scalingValues } from './wiki/skills.ts';
import type { LuaValue } from './wiki/lua.ts';
import {
  cleanName,
  parsePercent,
  roundTo,
  slugify,
  toElement,
  toStatKey,
  toWeaponType,
} from './wiki/normalize.ts';
import {
  findTemplate,
  firstImageName,
  otherLanguage,
  parseTemplateParams,
  wikiToText,
} from './wiki/wikitext.ts';

const args = new Set(process.argv.slice(2));
const SKIP_IMAGES = args.has('--skip-images');
const FORCE_IMAGES = args.has('--force-images');
const DATA_DIR = 'src/data/game';

const skipped: { page: string; reason: string }[] = [];
const skip = (page: string, reason: string) => {
  skipped.push({ page, reason });
  console.warn(`  ⚠ ${page} : ${reason}`);
};

type LuaTable = Record<string, LuaValue>;

const localized = (en: string, fr: string) => ({ en: cleanName(en), fr: cleanName(fr) });
const asTable = (value: LuaValue | undefined): LuaTable | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : null;
const asNumber = (value: LuaValue | undefined): number | null =>
  typeof value === 'number' ? value : typeof value === 'string' ? parsePercent(value) : null;

function infobox(page: string, template: string): Record<string, string> | null {
  const call = findTemplate(page, template);
  return call ? parseTemplateParams(call) : null;
}

function validate<T>(schema: z.ZodType<T>, value: unknown, page: string): T | null {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  skip(
    page,
    `schéma invalide : ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join(' ; ')}`,
  );
  return null;
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

interface ImageRequest {
  /** Noms de fichiers candidats sur le wiki, par ordre de préférence. */
  candidates: string[];
  /** Chemin public, ex. /assets/game/resonators/jiyan.webp */
  target: string;
  width: number;
  trim?: boolean;
}

const imageRequests: ImageRequest[] = [];
function requestImage(
  candidates: string[],
  folder: string,
  id: string,
  width: number,
  trim = false,
) {
  const target = `/assets/game/${folder}/${id}.webp`;
  imageRequests.push({ candidates: [...new Set(candidates.filter(Boolean))], target, width, trim });
  return target;
}

async function downloadImages(): Promise<Set<string>> {
  const available = new Set<string>();
  const byWidth = Map.groupBy(imageRequests, (r) => r.width);
  for (const [width, requests] of byWidth) {
    const urls = await imageUrls([...new Set(requests.flatMap((r) => r.candidates))], width);
    for (const request of requests) {
      const file = join('public', request.target);
      if (existsSync(file) && !FORCE_IMAGES) {
        available.add(request.target);
        continue;
      }
      const name = request.candidates.find((c) => urls.has(c));
      const url = name ? urls.get(name) : undefined;
      if (!url) {
        console.warn(`  ⚠ image introuvable : ${request.candidates.join(' | ')}`);
        continue;
      }
      const bytes = Buffer.from(await (await fetchWithRetry(url)).arrayBuffer());
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, bytes);
      const isWebp =
        bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
      if (!isWebp || request.trim) {
        // ImageMagick : conversion WebP et rognage des marges transparentes des illustrations.
        execFileSync('convert', [
          file,
          ...(request.trim ? ['-trim', '+repage'] : []),
          '-quality',
          '88',
          `webp:${file}`,
        ]);
      }
      available.add(request.target);
    }
  }
  return available;
}

// ---------------------------------------------------------------------------
// Courbes de niveau
// ---------------------------------------------------------------------------

const WEAPON_ATK_KEYS = [
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
const SECONDARY_LEVELS = [1, 20, 40, 50, 60, 70, 80, 90];

async function importCurves() {
  const charModule = await moduleSource('Character Ascensions and Stats');
  const character = [...charModule.matchAll(/\['(\d)_(\d)'\]\s*=\s*\{([\s\S]*?)\n\t\t\}/g)].map(
    (m) => {
      const fields = [...(m[3] ?? '').matchAll(/^\s*(mult(?:_hp|_def)?)\s*=\s*([^,\n]+),?/gm)]
        .map((f) => `${f[1]} = ${f[2]}`)
        .join(', ');
      const values = asTable(luaReturnTable(`return { ${fields} }`));
      const index = Number(m[1]) * 2 + Number(m[2]) - 1;
      const step = LEVEL_STEPS[index];
      const atk = asNumber(values?.mult);
      const hp = asNumber(values?.mult_hp);
      const def = asNumber(values?.mult_def);
      if (!step || atk === null || hp === null || def === null)
        throw new Error(`Courbe de personnage illisible (${m[1]}_${m[2]})`);
      return { ...step, atk, hp, def };
    },
  );

  const atkTables = asTable(luaReturnTable(await moduleSource('WeaponScaling/DataATK'))) ?? {};
  const secTables = asTable(luaReturnTable(await moduleSource('WeaponScaling/Data2ndStat'))) ?? {};

  const reference = {
    weaponAtk: {} as Record<string, Record<string, number>>,
    weaponSecondary: {} as Record<string, Record<string, number>>,
  };
  for (const [base, table] of Object.entries(atkTables)) {
    const values = Object.fromEntries(
      Object.entries(asTable(table) ?? {}).flatMap(([k, v]) => {
        const n = asNumber(v);
        return n === null ? [] : [[k, n]];
      }),
    );
    if (Object.keys(values).length === WEAPON_ATK_KEYS.length) reference.weaponAtk[base] = values;
  }
  for (const [base, table] of Object.entries(secTables)) {
    const values = Object.fromEntries(
      Object.entries(asTable(table) ?? {}).flatMap(([k, v]) => {
        const n = asNumber(v);
        return n === null ? [] : [[k.replace('Lv', ''), n]];
      }),
    );
    if (Object.keys(values).length === SECONDARY_LEVELS.length - 1)
      reference.weaponSecondary[base] = values;
  }

  // Ratios dérivés des tables publiées les plus grandes (moins d'erreur d'arrondi).
  const atk47 = reference.weaponAtk['47'];
  const sec12 = reference.weaponSecondary['12%'];
  if (!atk47 || !sec12) throw new Error('Tables de référence d’armes manquantes (47 / 12%)');
  const weaponAtk = WEAPON_ATK_KEYS.map((key, i) => {
    const step = LEVEL_STEPS[i];
    if (!step) throw new Error(`Palier manquant pour ${key}`);
    return { ...step, ratio: roundTo((atk47[key] ?? NaN) / 47, 6) };
  });
  const weaponSecondary = SECONDARY_LEVELS.map((level) => ({
    level,
    ratio: level === 1 ? 1 : roundTo((sec12[String(level)] ?? NaN) / 12, 6),
  }));

  return curvesSchema.parse({ character, weaponAtk, weaponSecondary, reference });
}

// ---------------------------------------------------------------------------
// Résonateurs
// ---------------------------------------------------------------------------

async function importResonators() {
  const stats =
    asTable(luaReturnTable(await moduleSource('Resonator Ascensions and Stats/data'))) ?? {};
  const titles = await pagesUsingTemplate('Resonator Infobox');
  const pages = await wikitextOf(titles);
  const out = [];
  for (const title of titles) {
    const page = pages.get(title);
    const box = page ? infobox(page, 'Resonator Infobox') : null;
    if (!page || !box) {
      skip(title, 'infobox absente');
      continue;
    }
    if (box.type !== 'Playable') {
      skip(title, `type « ${box.type ?? '?'} » (non jouable ou à venir)`);
      continue;
    }
    const element = toElement(box.attribute ?? '');
    const weaponType = toWeaponType(box.weapon ?? '');
    if (!element || !weaponType) {
      skip(title, `attribut « ${box.attribute ?? '?'} » ou arme « ${box.weapon ?? '?'} » non géré`);
      continue;
    }
    const row = asTable(stats[title]);
    const base = {
      hp: asNumber(row?.base_hp),
      atk: asNumber(row?.base_atk),
      def: asNumber(row?.base_def),
    };
    if (!row || !base.hp || !base.atk || !base.def) {
      skip(title, 'stats de base absentes du module de données');
      continue;
    }
    const id = slugify(title);
    const plain = title.replace(/:/g, '');
    const entity = validate(
      resonatorSchema,
      {
        id,
        name: localized(title, otherLanguage(page, 'fr') ?? title),
        rarity: Number(box.rarity),
        element,
        weaponType,
        base,
        releaseDate: /^\d{4}-\d{2}-\d{2}$/.test(box.releaseDate ?? '') ? box.releaseDate : null,
        icon: requestImage(
          [`Resonator ${title}.png`, `Resonator The ${title}.png`, `Resonator ${plain}.png`],
          'resonators',
          id,
          192,
        ),
        sprite: requestImage(
          [`${title} Full Sprite.png`, `${plain} Full Sprite.png`],
          'sprites',
          id,
          560,
          true,
        ),
        source: { page: title, url: pageUrl(title) },
      },
      title,
    );
    if (entity) out.push(entity);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Armes
// ---------------------------------------------------------------------------

async function importWeapons() {
  const stats =
    asTable(luaReturnTable(await moduleSource('Weapon Ascensions and Stats/data'))) ?? {};
  const titles = await pagesUsingTemplate('Weapon Infobox');
  const pages = await wikitextOf(titles);
  const out = [];
  for (const title of titles) {
    const page = pages.get(title);
    const box = page ? infobox(page, 'Weapon Infobox') : null;
    if (!page || !box) {
      skip(title, 'infobox absente');
      continue;
    }
    const displayName = wikiToText(box.name ?? title);
    const row = asTable(stats[title]) ?? asTable(stats[displayName]);
    const type = toWeaponType(box.type ?? '');
    const rawType = row?.['2nd_stat_type'];
    const secondaryStat = toStatKey(
      typeof rawType === 'string' ? rawType : (box['2nd_stat_type'] ?? ''),
    );
    const baseAtk = asNumber(row?.base_atk);
    const secondaryBase = asNumber(row?.['2nd_stat']);
    if (!row || !type || !secondaryStat || !baseAtk || !secondaryBase) {
      skip(title, 'type, ATQ de base ou stat secondaire manquants');
      continue;
    }

    let passive: {
      name: string | null;
      text: string;
      values: number[][];
      bonuses: ReturnType<typeof parsePassiveBonuses>;
    } | null = null;
    if (box.effect) {
      const varCount = Math.max(
        0,
        ...Object.keys(box).map((k) => Number(/^eff_rank1_var(\d+)$/.exec(k)?.[1] ?? 0)),
      );
      const values = [1, 2, 3, 4, 5].map((rank) =>
        Array.from({ length: varCount }, (_, v) =>
          parsePercent(box[`eff_rank${rank}_var${v + 1}`] ?? ''),
        ),
      );
      const complete = values.map((rank) => rank.filter((v): v is number => v !== null));
      if (complete.every((rank) => rank.length === varCount)) {
        const text = wikiToText(box.effect);
        passive = {
          name: box.rank_name ? wikiToText(box.rank_name) : null,
          text,
          values: complete,
          bonuses: parsePassiveBonuses(text).filter((b) => b.variable <= varCount),
        };
      } else {
        skip(
          title,
          'passif incomplet (valeurs par rang manquantes) : passif ignoré, arme conservée',
        );
      }
    }

    const id = slugify(displayName);
    const entity = validate(
      weaponSchema,
      {
        id,
        name: localized(displayName, otherLanguage(page, 'fr') ?? displayName),
        rarity: Number(box.rarity),
        type,
        baseAtk: roundTo(baseAtk, 2),
        secondary: { stat: secondaryStat, base: roundTo(secondaryBase, 2) },
        passive,
        icon: requestImage(
          [firstImageName(box.image ?? ''), `Weapon ${title}.png`],
          'weapons',
          id,
          160,
        ),
        source: { page: title, url: pageUrl(title) },
      },
      title,
    );
    if (entity) out.push(entity);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ensembles de sonate
// ---------------------------------------------------------------------------

async function importSonatas() {
  const titles = await pagesUsingTemplate('Sonata Infobox');
  const pages = await wikitextOf(titles);
  const out = [];
  for (const title of titles) {
    const page = pages.get(title);
    const box = page ? infobox(page, 'Sonata Infobox') : null;
    if (!page || !box) {
      skip(title, 'infobox absente');
      continue;
    }
    const effects = Object.entries(box)
      .flatMap(([key, value]) => {
        const pieces = /^(\d)pc$/.exec(key)?.[1];
        if (!pieces || !value) return [];
        const text = wikiToText(value);
        return [{ pieces: Number(pieces), text, bonuses: parseSetBonuses(text) }];
      })
      .sort((a, b) => a.pieces - b.pieces);
    const id = slugify(title);
    const entity = validate(
      sonataSchema,
      {
        id,
        name: localized(title, otherLanguage(page, 'fr') ?? title),
        effects,
        icon: requestImage(
          [firstImageName(box.image ?? ''), `Icon ${title}.png`],
          'sonatas',
          id,
          128,
        ),
        source: { page: title, url: pageUrl(title) },
      },
      title,
    );
    if (entity) out.push(entity);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Échos
// ---------------------------------------------------------------------------

async function importEchoes(sonataIds: Set<string>) {
  const titles = await pagesUsingTemplate('Echo Infobox');
  const pages = await wikitextOf(titles);
  const basePages = await wikitextOf(titles.map((t) => t.replace(/\/Echo$/, '')));
  const out = [];
  for (const title of titles) {
    const page = pages.get(title);
    const box = page ? infobox(page, 'Echo Infobox') : null;
    if (!page || !box) {
      skip(title, 'infobox absente');
      continue;
    }
    const name = wikiToText(box.name ?? title.replace(/\/Echo$/, ''));
    const sonatas = Object.entries(box)
      .filter(([key, value]) => /^sonata_eff\d*$/.test(key) && value)
      .map(([, value]) => slugify(wikiToText(value)));
    const unknown = sonatas.filter((s) => !sonataIds.has(s));
    if (unknown.length > 0) skip(title, `ensembles inconnus ignorés : ${unknown.join(', ')}`);
    const basePage = basePages.get(title.replace(/\/Echo$/, '')) ?? '';
    const id = slugify(name);
    const entity = validate(
      echoSchema,
      {
        id,
        name: localized(name, otherLanguage(basePage, 'fr') ?? otherLanguage(page, 'fr') ?? name),
        cost: Number(box.cost),
        class: box.class,
        sonatas: sonatas.filter((s) => sonataIds.has(s)),
        nightmare: (box.nightmare ?? '').toLowerCase() === 'yes' || name.startsWith('Nightmare:'),
        icon: requestImage(
          [firstImageName(box.image ?? ''), `${name} Icon.png`],
          'echoes',
          id,
          160,
        ),
        source: { page: title, url: pageUrl(title) },
      },
      title,
    );
    if (entity) out.push(entity);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Compétences (multiplicateurs)
// ---------------------------------------------------------------------------

const SKILL_TYPE: Record<string, (typeof SKILL_TYPES)[number]> = {
  'Basic Attack': 'basic',
  'Resonance Skill': 'skill',
  'Forte Circuit': 'circuit',
  'Resonance Liberation': 'liberation',
  'Intro Skill': 'intro',
  'Outro Skill': 'outro',
  'Inherent Skill': 'inherent',
};

async function importSkills(resonatorIds: Set<string>) {
  const titles = await pagesUsingTemplate('Skill Infobox');
  const pages = await wikitextOf(titles);
  const out = [];
  for (const title of titles) {
    const page = pages.get(title);
    const box = page ? infobox(page, 'Skill Infobox') : null;
    const scaling = page ? infobox(page, 'Skill Scaling') : null;
    if (!page || !box || !scaling) continue;
    const type = SKILL_TYPE[box.type ?? ''];
    const resonatorId = slugify(box.resonator ?? '');
    if (!type || !resonatorIds.has(resonatorId)) continue;
    const keys = (scaling.order ?? '').split(',').map((k) => k.trim());
    const labels = (scaling.titles ?? '').split(',').map((k) => wikiToText(k.trim()));
    const info = wikiToText(box.info ?? '');
    const rows = keys.flatMap((key, i) => {
      const label = labels[i] ?? key;
      if (!key || !isDamageRow(label)) return [];
      const percentUnit = /\(%\)/.test(label);
      const parsed = [];
      for (const raw of scalingValues(scaling, key).slice(0, 10)) {
        const value = parseMotionValue(wikiToText(raw), { percentUnit });
        if (!value) return [];
        parsed.push(value);
      }
      if (parsed.length === 0) return [];
      const { type: damageType, inferred } = inferDamageType(box.type ?? '', label, info);
      return [
        {
          label: label.replace(/\s*\(%\)\s*$/, ''),
          damageType,
          damageTypeInferred: inferred,
          values: parsed.map((p) => roundTo(p.value, 6)),
          assumedPercent: parsed.some((p) => p.assumedPercent),
        },
      ];
    });
    if (rows.length === 0) continue;
    const scaleAttr = (box.scale_att1 ?? 'ATK').trim().toUpperCase();
    const entity = validate(
      skillSchema,
      {
        id: `${resonatorId}-${slugify(title)}`,
        resonatorId,
        name: localized(title, otherLanguage(page, 'fr') ?? title),
        type,
        scaling: scaleAttr === 'HP' ? 'hp' : scaleAttr === 'DEF' ? 'def' : 'atk',
        rows,
        source: { page: title, url: pageUrl(title) },
      },
      title,
    );
    if (entity) out.push(entity);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Icônes d'interface (attributs, types d'armes, stats)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Matériaux d'évolution (planificateur)
// ---------------------------------------------------------------------------

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const asStrings = (value: LuaValue | undefined): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v !== '') : [];

/** Emplacements nommés à partir des listes du wiki (`common` → common1…common4). */
function slots(entries: Record<string, LuaValue | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [slot, value] of Object.entries(entries)) {
    if (typeof value === 'string' && value !== '' && value !== 'None') result[slot] = value;
    else asStrings(value).forEach((name, i) => (result[`${slot}${String(i + 1)}`] = name));
  }
  return result;
}

async function importMaterials(resonatorIds: Set<string>, weaponIdByName: Map<string, string>) {
  const resonatorAscension = costTable(
    await moduleSource('Character Ascensions and Stats'),
    'asc_costs',
  );
  const weaponAscension = costTablesByRarity(
    await moduleSource('Weapon Ascensions and Stats'),
    'getAscensionCosts',
  );
  const forte = keyedCostTables(await moduleSource('Skill Upgrade'), 'cost', {
    boss: 'weeklyBoss',
    wsm: 'forte',
    dwsm: 'forteDrop',
  });

  const ascension =
    asTable(luaReturnTable(await moduleSource('Resonator Ascensions and Stats/data'))) ?? {};
  const skill = asTable(luaReturnTable(await moduleSource('Skill Upgrade/data'))) ?? {};
  const resonators: Record<string, Record<string, string>> = {};
  for (const [title, raw] of Object.entries(ascension)) {
    const id = slugify(title);
    const a = asTable(raw);
    const k = asTable(skill[title]);
    if (!resonatorIds.has(id) || !a) continue;
    if (!k) {
      skip(title, 'matériaux de Forte absents (Module:Skill Upgrade/data)');
      continue;
    }
    resonators[id] = slots({
      common: a.common,
      local: a.local,
      boss: a.boss,
      forte: k.wsm,
      forteDrop: k.dwsm,
      weeklyBoss: k.boss,
    });
  }

  const weaponData =
    asTable(luaReturnTable(await moduleSource('Weapon Ascensions and Stats/data'))) ?? {};
  const weapons: Record<string, Record<string, string>> = {};
  for (const [title, raw] of Object.entries(weaponData)) {
    const id = weaponIdByName.get(title);
    const row = asTable(raw);
    if (id && row) weapons[id] = slots({ common: row.common, ascension: row.ascension });
  }

  // Objets : nom français, rareté et icône depuis leur page.
  const names = [
    'Shell Credit',
    ...new Set(
      [...Object.values(resonators), ...Object.values(weapons)].flatMap((m) => Object.values(m)),
    ),
  ];
  const pages = await wikitextOf(names);
  const items = [];
  const idByName = new Map<string, string>();
  for (const name of names) {
    const page = pages.get(name);
    const box = page ? (infobox(page, 'Item Infobox') ?? infobox(page, 'Currency Infobox')) : null;
    if (!page || !box) {
      skip(name, 'page d’objet absente');
      continue;
    }
    const id = slugify(name);
    idByName.set(name, id);
    items.push({
      id,
      name: localized(name, capitalize(otherLanguage(page, 'fr') ?? name)),
      rarity: asNumber(Number(box.rarity)) ?? null,
      icon: requestImage([firstImageName(box.image ?? ''), `Item ${name}.png`], 'items', id, 128),
    });
  }
  const resolve = (map: Record<string, Record<string, string>>) =>
    Object.fromEntries(
      Object.entries(map).flatMap(([owner, entries]) => {
        const resolved = Object.entries(entries).flatMap(([slot, name]) => {
          const itemId = idByName.get(name);
          return itemId ? [[slot, itemId] as const] : [];
        });
        return [[owner, Object.fromEntries(resolved)]];
      }),
    );

  return {
    costs: {
      resonatorAscension,
      weaponAscension,
      forte: forte.main5 ?? [],
      inherent: forte.inherent ?? [],
      statBonus: forte.statBonus ?? [],
    },
    resonators: resolve(resonators),
    weapons: resolve(weapons),
    items: sortById(items),
  };
}

const ELEMENT_FILE: Record<Element, string> = {
  aero: 'Aero',
  electro: 'Electro',
  fusion: 'Fusion',
  glacio: 'Glacio',
  havoc: 'Havoc',
  spectro: 'Spectro',
};
const WEAPON_FILE: Record<WeaponType, string> = {
  broadblade: 'Broadblade',
  sword: 'Sword',
  pistols: 'Pistols',
  gauntlets: 'Gauntlets',
  rectifier: 'Rectifier',
};
const STAT_FILE: Partial<Record<StatKey, string>> = {
  hp: 'Icon Attribute Health.png',
  atk: 'Icon Attribute Attack.png',
  def: 'Icon Attribute Defense.png',
  critRate: 'Icon Attribute Crit Rate.png',
  critDmg: 'Icon Attribute Crit DMG.png',
  energyRegen: 'Icon Attribute Energy Regen.png',
  healingBonus: 'Icon Attribute Healing.png',
  basicDmg: 'Icon Basic Attack Damage.png',
  heavyDmg: 'Icon Heavy Attack Damage.png',
  skillDmg: 'Icon Resonance Skill Damage.png',
  liberationDmg: 'Icon Resonance Liberation Damage.png',
  echoDmg: 'Icon Echo Skill Damage.png',
  ...Object.fromEntries(ELEMENTS.map((e) => [`${e}Dmg`, `Icon ${ELEMENT_FILE[e]} DMG Bonus.png`])),
};

function requestUiIcons() {
  for (const element of ELEMENTS)
    requestImage([`${ELEMENT_FILE[element]} Icon.png`], 'elements', element, 96);
  for (const type of WEAPON_TYPES)
    requestImage([`${WEAPON_FILE[type]} Icon.png`], 'weapon-types', type, 96);
  for (const [key, file] of Object.entries(STAT_FILE))
    requestImage([file], 'stats', slugify(key.replace(/([A-Z])/g, '-$1')), 64);
}

// ---------------------------------------------------------------------------

const sortById = <T extends { id: string }>(items: T[]) =>
  items.sort((a, b) => a.id.localeCompare(b.id));

function dedupe<T extends { id: string; source: { page: string } }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    if (seen.has(item.id)) skip(item.source.page, `identifiant en double « ${item.id} »`);
    else seen.set(item.id, item);
  }
  return [...seen.values()];
}

function writeJson(name: string, value: unknown) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, `${name}.json`), JSON.stringify(value, null, 2) + '\n');
}

async function main() {
  console.log('Courbes…');
  const curves = await importCurves();
  console.log('Ensembles de sonate…');
  const sonatas = sortById(dedupe(await importSonatas()));
  console.log('Résonateurs…');
  const resonators = sortById(dedupe(await importResonators()));
  console.log('Armes…');
  const weapons = sortById(dedupe(await importWeapons()));
  console.log('Échos…');
  const echoes = sortById(dedupe(await importEchoes(new Set(sonatas.map((s) => s.id)))));
  console.log('Compétences…');
  const skills = sortById(dedupe(await importSkills(new Set(resonators.map((r) => r.id)))));
  console.log('Matériaux…');
  const weaponIdByName = new Map(
    weapons.flatMap((w) => [[w.name.en, w.id] as const, [w.source.page, w.id] as const]),
  );
  const materials = await importMaterials(new Set(resonators.map((r) => r.id)), weaponIdByName);
  requestUiIcons();

  if (!SKIP_IMAGES) {
    console.log(`Images (${imageRequests.length})…`);
    const available = await downloadImages();
    const keep = <T extends Record<string, unknown>>(items: T[], ...keys: (keyof T)[]) =>
      items.map((item) => {
        const copy = { ...item };
        for (const key of keys) {
          const value = copy[key];
          if (typeof value === 'string' && !available.has(value))
            (copy as Record<string, unknown>)[key as string] = null;
        }
        return copy;
      });
    writeJson('resonators', keep(resonators, 'icon', 'sprite'));
    writeJson('weapons', keep(weapons, 'icon'));
    writeJson('echoes', keep(echoes, 'icon'));
    writeJson('sonatas', keep(sonatas, 'icon'));
  } else {
    writeJson('resonators', resonators);
    writeJson('weapons', weapons);
    writeJson('echoes', echoes);
    writeJson('sonatas', sonatas);
  }
  writeJson(
    'materials',
    materialsSchema.parse({
      ...materials,
      items: materials.items.map((item) =>
        item.icon && !existsSync(join('public', item.icon)) ? { ...item, icon: null } : item,
      ),
    }),
  );
  writeJson('skills', skills);
  writeJson('curves', curves);
  writeJson(
    'meta',
    metaSchema.parse({
      source: 'Wuthering Waves Wiki (Fandom), contenu sous licence CC BY-SA ; images © Kuro Games',
      url: WIKI_BASE,
      fetchedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      counts: {
        resonators: resonators.length,
        weapons: weapons.length,
        echoes: echoes.length,
        sonatas: sonatas.length,
        skills: skills.length,
        materials: materials.items.length,
      },
      skipped,
    }),
  );
  execFileSync('pnpm', ['exec', 'prettier', '--write', DATA_DIR, '--log-level', 'warn'], {
    stdio: 'inherit',
  });
  console.log(
    `Terminé : ${resonators.length} Résonateurs, ${weapons.length} armes, ${echoes.length} Échos, ${sonatas.length} ensembles, ${skills.length} compétences. ${skipped.length} avertissements.`,
  );
}

await main();
