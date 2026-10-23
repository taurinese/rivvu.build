const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Filterable {
  id: string;
  name: { en: string; fr: string };
  cost: number;
  sonatas: readonly string[];
}

export interface EchoFilter {
  query?: string;
  cost?: number | null;
  sonata?: string | null;
  /** Coût maximal encore disponible dans l'équipement. */
  maxCost?: number;
}

export function filterEchoes<T extends Filterable>(items: readonly T[], filter: EchoFilter): T[] {
  const query = normalize(filter.query?.trim() ?? '');
  return items
    .filter((e) => !filter.cost || e.cost === filter.cost)
    .filter((e) => !filter.sonata || e.sonatas.includes(filter.sonata))
    .filter((e) => filter.maxCost === undefined || e.cost <= filter.maxCost)
    .filter(
      (e) => !query || normalize(e.name.fr).includes(query) || normalize(e.name.en).includes(query),
    )
    .sort((a, b) => b.cost - a.cost || a.name.fr.localeCompare(b.name.fr, 'fr'));
}
