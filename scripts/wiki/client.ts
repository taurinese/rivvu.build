/** Client minimal de l'API MediaWiki du wiki Wuthering Waves (lecture seule). */

export const WIKI_BASE = 'https://wutheringwaves.fandom.com';
const API = `${WIKI_BASE}/api.php`;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; RivvuDataImporter/1.0; +https://rivvu.build)',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(url: string, tries = 4): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status} pour ${url}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(1000 * 2 ** attempt);
  }
  throw lastError;
}

async function api<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  const response = await fetchWithRetry(`${API}?${query.toString()}`);
  return (await response.json()) as T;
}

export const pageUrl = (title: string) =>
  `${WIKI_BASE}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

/** Titres des pages (espace principal) qui utilisent un modèle donné. */
export async function pagesUsingTemplate(template: string): Promise<string[]> {
  const titles: string[] = [];
  let cont: string | undefined;
  do {
    const data = await api<{
      query: { embeddedin: { title: string }[] };
      continue?: { eicontinue: string };
    }>({
      action: 'query',
      list: 'embeddedin',
      eititle: `Template:${template}`,
      einamespace: '0',
      eilimit: '500',
      ...(cont ? { eicontinue: cont } : {}),
    });
    titles.push(...data.query.embeddedin.map((p) => p.title));
    cont = data.continue?.eicontinue;
  } while (cont);
  return titles;
}

/** Wikitext de plusieurs pages (par lots de 50), suivant les redirections. */
export async function wikitextOf(titles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const data = await api<{
      query: {
        pages: {
          title: string;
          missing?: boolean;
          revisions?: { slots: { main: { content: string } } }[];
        }[];
        redirects?: { from: string; to: string }[];
        normalized?: { from: string; to: string }[];
      };
    }>({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      redirects: '1',
      titles: batch.join('|'),
    });
    const byTitle = new Map<string, string>();
    for (const page of data.query.pages) {
      const content = page.revisions?.[0]?.slots.main.content;
      if (content !== undefined) byTitle.set(page.title, content);
    }
    const alias = new Map<string, string>();
    for (const { from, to } of [
      ...(data.query.normalized ?? []),
      ...(data.query.redirects ?? []),
    ]) {
      alias.set(from, to);
    }
    for (const title of batch) {
      let resolved = title;
      for (let hop = 0; hop < 3 && alias.has(resolved); hop++)
        resolved = alias.get(resolved) ?? resolved;
      const content = byTitle.get(resolved);
      if (content !== undefined) result.set(title, content);
    }
  }
  return result;
}

export async function moduleSource(name: string): Promise<string> {
  const pages = await wikitextOf([`Module:${name}`]);
  const content = pages.get(`Module:${name}`);
  if (content === undefined) throw new Error(`Module introuvable : ${name}`);
  return content;
}

/** URL (vignette WebP de largeur `width`) de chaque fichier existant, par nom de fichier. */
export async function imageUrls(files: string[], width: number): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const data = await api<{
      query: {
        pages: {
          title: string;
          missing?: boolean;
          imageinfo?: { url: string; thumburl?: string }[];
        }[];
        normalized?: { from: string; to: string }[];
      };
    }>({
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: String(width),
      titles: batch.map((f) => `File:${f}`).join('|'),
    });
    const alias = new Map((data.query.normalized ?? []).map(({ from, to }) => [to, from]));
    for (const page of data.query.pages) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const requested = (alias.get(page.title) ?? page.title).replace(/^File:/, '');
      result.set(requested, info.thumburl ?? info.url);
    }
  }
  return result;
}
