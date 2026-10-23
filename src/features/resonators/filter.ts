import type { Element, WeaponType } from '@/domain/types';

interface Filterable {
  id: string;
  name: { en: string; fr: string };
  element: Element;
  weaponType: WeaponType;
  rarity: number;
  releaseDate: string | null;
}

export interface ResonatorFilter {
  query?: string;
  element?: Element | null;
  weaponType?: WeaponType | null;
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Filtre puis trie : rareté décroissante, sortie la plus récente, nom. */
export function filterResonators<T extends Filterable>(
  items: readonly T[],
  filter: ResonatorFilter,
): T[] {
  const query = normalize(filter.query?.trim() ?? '');
  return items
    .filter((r) => !filter.element || r.element === filter.element)
    .filter((r) => !filter.weaponType || r.weaponType === filter.weaponType)
    .filter(
      (r) => !query || normalize(r.name.fr).includes(query) || normalize(r.name.en).includes(query),
    )
    .sort(
      (a, b) =>
        b.rarity - a.rarity ||
        (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '') ||
        a.name.fr.localeCompare(b.name.fr, 'fr'),
    );
}
