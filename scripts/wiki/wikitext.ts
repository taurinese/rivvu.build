/** Outils minimaux pour lire le wikitext MediaWiki du wiki Wuthering Waves. */

const normalizeName = (name: string) => name.trim().replace(/_/g, ' ').toLowerCase();

/** Renvoie le premier appel du modèle `name` (accolades équilibrées), ou null. */
export function findTemplate(source: string, name: string): string | null {
  const wanted = normalizeName(name);
  let index = source.indexOf('{{');
  while (index !== -1) {
    const nameMatch = /^\{\{\s*([^|}\n]+)/.exec(source.slice(index));
    if (nameMatch?.[1] && normalizeName(nameMatch[1]) === wanted) {
      const end = matchingClose(source, index);
      if (end !== -1) return source.slice(index, end);
    }
    index = source.indexOf('{{', index + 2);
  }
  return null;
}

/** Index juste après les `}}` qui ferment les `{{` situés à `start`. */
function matchingClose(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length - 1; i++) {
    const pair = source.slice(i, i + 2);
    if (pair === '{{') {
      depth++;
      i++;
    } else if (pair === '}}') {
      depth--;
      i++;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Découpe les paramètres d'un appel de modèle, en respectant les `{{ }}` et `[[ ]]` imbriqués. */
export function parseTemplateParams(call: string): Record<string, string> {
  const inner = call.slice(2, -2);
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < inner.length; i++) {
    const pair = inner.slice(i, i + 2);
    if (pair === '{{' || pair === '[[') {
      depth++;
      current += pair;
      i++;
    } else if (pair === '}}' || pair === ']]') {
      depth--;
      current += pair;
      i++;
    } else if (inner[i] === '|' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += inner.charAt(i);
    }
  }
  parts.push(current);

  const params: Record<string, string> = {};
  let position = 1;
  for (const part of parts.slice(1)) {
    const eq = indexOfTopLevelEquals(part);
    if (eq === -1) {
      params[String(position++)] = part.trim();
    } else {
      params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
  }
  return params;
}

function indexOfTopLevelEquals(part: string): number {
  let depth = 0;
  for (let i = 0; i < part.length; i++) {
    const pair = part.slice(i, i + 2);
    if (pair === '{{' || pair === '[[') {
      depth++;
      i++;
    } else if (pair === '}}' || pair === ']]') {
      depth--;
      i++;
    } else if (part[i] === '=' && depth === 0) {
      return i;
    }
  }
  return -1;
}

/** Applique un remplacement jusqu'à stabilité : un retrait peut reformer un motif (`<!-<!---->-`). */
function removeAll(text: string, pattern: RegExp): string {
  let previous: string;
  let current = text;
  do {
    previous = current;
    current = current.replace(pattern, '');
  } while (current !== previous);
  return current;
}

/** Convertit un fragment de wikitext en texte brut lisible. */
export function wikiToText(source: string): string {
  let text = removeAll(source, /<!--[\s\S]*?-->/g)
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/'''|''/g, '');

  // Modèles d'affichage : on garde le dernier paramètre positionnel « visible ».
  for (let guard = 0; guard < 20 && text.includes('{{'); guard++) {
    text = text.replace(/\{\{([^{}]*)\}\}/g, (_, body: string) => {
      const parts = body.split('|').filter((p) => !/^\s*\w+\s*=/.test(p));
      return parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
    });
  }

  text = removeAll(text.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1'), /<[^<>]+>/g)
    .replace(/&shy;/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
  return text;
}

/** Lit une traduction dans le modèle {{Other Languages}} (clé `fr` ou `1_fr`). */
export function otherLanguage(page: string, lang: string): string | null {
  const call = findTemplate(page, 'Other Languages');
  if (!call) return null;
  const params = parseTemplateParams(call);
  const value = params[lang] ?? params[`1_${lang}`];
  return value ? wikiToText(value) : null;
}

/** Nom du premier fichier d'un paramètre `image` (nom simple ou balise <gallery>). */
export function firstImageName(raw: string): string {
  const withoutGallery = raw.replace(/<\/?gallery[^>]*>/g, '').trim();
  const firstLine = withoutGallery.split('\n')[0] ?? '';
  return (firstLine.split('|')[0] ?? '').replace(/^(File|Image):/i, '').trim();
}
