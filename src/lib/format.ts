/** Espace fine insécable : séparateur des milliers et avant « % » en typographie française. */
const NNBSP = '\u202f';
const MINUS = '−';

interface FormatOptions {
  /** Ajoute « + » devant les valeurs positives. */
  signed?: boolean;
}

const flatFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function withSign(value: number, body: string, { signed = false }: FormatOptions): string {
  if (value < 0) return MINUS + body;
  if (signed && value > 0) return '+' + body;
  return body;
}

function normalizeSpaces(text: string): string {
  return text.replace(/[\s\u00a0\u202f]/g, NNBSP);
}

/** Valeur plate (PV, ATQ, DÉF) : entier, milliers groupés. */
export function formatFlat(value: number, options: FormatOptions = {}): string {
  const rounded = Math.round(value);
  return withSign(rounded, normalizeSpaces(flatFormatter.format(Math.abs(rounded))), options);
}

/** Pourcentage exprimé en points (62.4 → « 62,4 % »). */
export function formatPercent(value: number, options: FormatOptions = {}): string {
  const rounded = Math.round(value * 10) / 10;
  const body = normalizeSpaces(percentFormatter.format(Math.abs(rounded))) + NNBSP + '%';
  return withSign(rounded, body, options);
}
