import luaparse from 'luaparse';
import type { Expression, Node, TableConstructorExpression } from 'luaparse';

/**
 * Tables de coûts écrites dans le code des modules Lua du wiki (pas dans des modules de données) :
 * on lit l'arbre syntaxique sans exécuter de code. Les clés symboliques (`com[1]`, `locspec`,
 * `weapon_data.ascension[2]`, `wsm1`…) deviennent des emplacements de matériaux (`common1`,
 * `local`, `ascension2`, `forte1`…), résolus ensuite avec les matériaux propres à chaque Résonateur.
 */
export interface CostStep {
  credits: number;
  items: { slot: string; qty: number }[];
}

type Aliases = Record<string, string>;
const DEFAULT_ALIASES: Aliases = {
  com: 'common',
  common: 'common',
  locspec: 'local',
  ascension: 'ascension',
};

function walk(node: unknown, visit: (node: Node) => void): void {
  if (!node || typeof node !== 'object') return;
  if ('type' in node && typeof node.type === 'string') visit(node as Node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) for (const child of value) walk(child, visit);
    else if (value && typeof value === 'object') walk(value, visit);
  }
}

const parse = (source: string) => luaparse.parse(source, { comments: false, luaVersion: '5.1' });

/** Emplacement de matériau d'une clé, `'credits'` pour les Coquilles, ou null. */
function slotOf(key: Expression, aliases: Aliases): string | null {
  const alias = (name: string) => aliases[name] ?? DEFAULT_ALIASES[name] ?? name;
  switch (key.type) {
    case 'StringLiteral':
      return /credit/i.test(key.raw) ? 'credits' : null;
    case 'Identifier': {
      if (/^credit$/i.test(key.name)) return 'credits';
      const numbered = /^([a-z]+)(\d)$/i.exec(key.name);
      return numbered ? `${alias(numbered[1] ?? '')}${numbered[2] ?? ''}` : alias(key.name);
    }
    case 'IndexExpression': {
      const base =
        key.base.type === 'MemberExpression'
          ? key.base.identifier.name
          : key.base.type === 'Identifier'
            ? key.base.name
            : null;
      const index = key.index.type === 'NumericLiteral' ? key.index.value : null;
      return base && index !== null ? `${alias(base)}${String(index)}` : null;
    }
    default:
      return null;
  }
}

/** Un palier `{ [clé] = quantité, … }` ; null s'il est incomplet (valeur vide sur le wiki). */
function costStep(table: TableConstructorExpression, aliases: Aliases): CostStep | null {
  let credits: number | null = null;
  const items: CostStep['items'] = [];
  for (const field of table.fields) {
    if (field.type === 'TableValue') return null;
    const key: Expression = field.type === 'TableKeyString' ? field.key : field.key;
    const slot = slotOf(key, aliases);
    if (!slot || field.value.type !== 'NumericLiteral') return null;
    if (slot === 'credits') credits = field.value.value;
    else items.push({ slot, qty: field.value.value });
  }
  return credits === null ? null : { credits, items };
}

function steps(table: TableConstructorExpression, aliases: Aliases): CostStep[] {
  return table.fields.flatMap((field) =>
    field.value.type === 'TableConstructorExpression'
      ? [costStep(field.value, aliases)].filter((s): s is CostStep => s !== null)
      : [],
  );
}

function findLocalTable(source: string, name: string): TableConstructorExpression {
  const matches: TableConstructorExpression[] = [];
  walk(parse(source), (node) => {
    if (node.type !== 'LocalStatement') return;
    node.variables.forEach((variable, i) => {
      const init = node.init[i];
      if (variable.name === name && init?.type === 'TableConstructorExpression') matches.push(init);
    });
  });
  const [found] = matches;
  if (!found) throw new Error(`Table « ${name} » introuvable`);
  return found;
}

/** `local name = { {palier}, {palier}, … }` */
export function costTable(source: string, name: string, aliases: Aliases = {}): CostStep[] {
  return steps(findLocalTable(source, name), aliases);
}

/** `local name = { ['groupe'] = { ['1'] = {palier}, … }, … }` */
export function keyedCostTables(
  source: string,
  name: string,
  aliases: Aliases = {},
): Record<string, CostStep[]> {
  const result: Record<string, CostStep[]> = {};
  for (const field of findLocalTable(source, name).fields) {
    if (field.type !== 'TableKey' || field.key.type !== 'StringLiteral') continue;
    if (field.value.type !== 'TableConstructorExpression') continue;
    result[field.key.raw.slice(1, -1)] = steps(field.value, aliases);
  }
  return result;
}

/** `function name(x) if (x.rarity == 5) then return { … } elseif … end end` */
export function costTablesByRarity(
  source: string,
  functionName: string,
): Record<number, CostStep[]> {
  const result: Record<number, CostStep[]> = {};
  walk(parse(source), (node) => {
    if (node.type !== 'FunctionDeclaration') return;
    const id = node.identifier;
    if (!id || id.type !== 'Identifier' || id.name !== functionName) return;
    walk(node.body, (inner) => {
      if (inner.type !== 'IfClause' && inner.type !== 'ElseifClause') return;
      const condition = inner.condition;
      if (condition.type !== 'BinaryExpression' || condition.right.type !== 'NumericLiteral')
        return;
      const rarity = condition.right.value;
      for (const statement of inner.body)
        if (
          statement.type === 'ReturnStatement' &&
          statement.arguments[0]?.type === 'TableConstructorExpression'
        )
          result[rarity] = steps(statement.arguments[0], {});
    });
  });
  return result;
}
