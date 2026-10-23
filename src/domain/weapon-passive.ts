export interface WeaponPassive {
  name: string | null;
  /** Texte avec des marqueurs (var1), (var2)… */
  text: string;
  /** values[rang - 1][var - 1] */
  values: readonly (readonly number[])[];
}

/** Texte du passif avec les valeurs du rang de syntonisation (1 à 5). */
export function formatPassive(passive: WeaponPassive, rank: number): string {
  const row = passive.values[Math.min(5, Math.max(1, rank)) - 1] ?? [];
  return passive.text.replace(/\(var(\d+)\)/g, (marker, n: string) => {
    const value = row[Number(n) - 1];
    return value === undefined ? marker : String(value);
  });
}
