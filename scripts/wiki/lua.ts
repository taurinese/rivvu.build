import luaparse from 'luaparse';
import type { Expression, Statement } from 'luaparse';

export type LuaValue = string | number | boolean | null | LuaValue[] | { [key: string]: LuaValue };

/**
 * Évalue (sans exécuter de code) un module de données Lua du wiki :
 * tables littérales, chaînes, nombres, arithmétique simple et références à des `local`.
 */
export function luaReturnTable(source: string): LuaValue {
  const ast = luaparse.parse(source, { comments: false, luaVersion: '5.1' });
  const locals = new Map<string, LuaValue>();
  for (const statement of ast.body) {
    const value = evaluateStatement(statement, locals);
    if (value !== undefined) return value;
  }
  throw new Error('Le module ne contient pas de « return » de table');
}

function evaluateStatement(
  statement: Statement,
  locals: Map<string, LuaValue>,
): LuaValue | undefined {
  if (statement.type === 'LocalStatement' || statement.type === 'AssignmentStatement') {
    statement.variables.forEach((variable, i) => {
      const init = statement.init[i];
      if (variable.type === 'Identifier' && init) locals.set(variable.name, evaluate(init, locals));
    });
    return undefined;
  }
  if (statement.type === 'ReturnStatement') {
    const [first] = statement.arguments;
    if (!first) throw new Error('« return » vide');
    return evaluate(first, locals);
  }
  return undefined;
}

function evaluate(node: Expression, locals: Map<string, LuaValue>): LuaValue {
  switch (node.type) {
    case 'StringLiteral': {
      // luaparse ne renseigne `value` que si un encodingMode est fourni : on décode `raw` sinon.
      const value = node.value as string | null;
      return value ?? decodeRaw(node.raw);
    }
    case 'NumericLiteral':
      return node.value;
    case 'BooleanLiteral':
      return node.value;
    case 'NilLiteral':
      return null;
    case 'Identifier': {
      const value = locals.get(node.name);
      if (value === undefined) throw new Error(`Variable inconnue : ${node.name}`);
      return value;
    }
    case 'UnaryExpression': {
      const value = evaluate(node.argument, locals);
      if (node.operator === '-' && typeof value === 'number') return -value;
      throw new Error(`Opérateur unaire non supporté : ${node.operator}`);
    }
    case 'BinaryExpression': {
      const left = evaluate(node.left, locals);
      const right = evaluate(node.right, locals);
      if (typeof left !== 'number' || typeof right !== 'number') {
        throw new Error('Arithmétique sur des valeurs non numériques');
      }
      switch (node.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
        default:
          throw new Error(`Opérateur non supporté : ${node.operator}`);
      }
    }
    case 'TableConstructorExpression': {
      const keyed: Record<string, LuaValue> = {};
      const list: LuaValue[] = [];
      for (const field of node.fields) {
        if (field.type === 'TableValue') list.push(evaluate(field.value, locals));
        else if (field.type === 'TableKeyString')
          keyed[field.key.name] = evaluate(field.value, locals);
        else {
          const key = evaluate(field.key, locals);
          if (typeof key !== 'string' && typeof key !== 'number')
            throw new Error('Clé de table non scalaire');
          keyed[String(key)] = evaluate(field.value, locals);
        }
      }
      if (list.length > 0 && Object.keys(keyed).length === 0) return list;
      list.forEach((value, i) => (keyed[String(i + 1)] = value));
      return keyed;
    }
    default:
      throw new Error(`Expression Lua non supportée : ${node.type}`);
  }
}

function decodeRaw(raw: string): string {
  return raw.slice(1, -1).replace(/\\(["'\\])/g, '$1');
}
