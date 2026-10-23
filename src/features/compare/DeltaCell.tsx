import { formatFlat, formatPercent } from '@/lib/format';
import { deltaTone } from './compare';
import styles from './ComparePage.module.css';

interface Props {
  a: number;
  b: number;
  /** Valeur en points de % (sinon valeur plate). */
  percent?: boolean;
  /** Ajoute l'écart relatif (« +12,3 % ») à l'écart absolu. */
  relative?: boolean;
}

const TONE_LABEL = { up: 'en hausse', down: 'en baisse', same: 'identique' } as const;

/** Écart B − A : signe explicite, couleur en complément, annoncé aux lecteurs d'écran. */
export function DeltaCell({ a, b, percent = false, relative = false }: Props) {
  const delta = b - a;
  const tone = deltaTone(percent ? delta : Math.round(delta));
  const absolute = percent
    ? formatPercent(delta, { signed: true })
    : formatFlat(delta, { signed: true });
  const ratio = relative && a > 0 ? ` (${formatPercent((delta / a) * 100, { signed: true })})` : '';
  return (
    <td className={styles[tone]}>
      {tone === 'same' ? '=' : `${absolute}${ratio}`}
      <span className="visually-hidden">, {TONE_LABEL[tone]}</span>
    </td>
  );
}
