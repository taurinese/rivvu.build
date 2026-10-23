import type { Resonator } from '@/data/schema';
import type { Build } from '@/domain/build';
import type { FinalStats } from '@/domain/stats';
import { formatFlat } from '@/lib/format';
import { translateRowLabel } from './row-label';
import { strongestHit } from './skill-damage';
import styles from './DamageSummary.module.css';

interface Props {
  build: Build;
  stats: FinalStats;
  resonator: Resonator;
}

/** Résumé de la fiche : coup le plus fort. Chargé à la demande avec les données de compétences. */
export function DamageSummary({ build, stats, resonator }: Props) {
  const best = strongestHit(build, stats, resonator);
  if (!best) return <p className={styles.muted}>Aucune donnée de compétence pour ce Résonateur.</p>;
  return (
    <div className={styles.damage}>
      <span className={styles.muted}>Coup le plus fort (moyenne)</span>
      <strong className={styles.value}>{formatFlat(best.row.average)}</strong>
      <span className={styles.muted}>
        {best.skill.name.fr} · {translateRowLabel(best.row.label)}
      </span>
    </div>
  );
}
