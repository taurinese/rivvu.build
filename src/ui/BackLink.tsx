import { Link } from 'react-router';
import { IconChevronLeft } from './icons';
import styles from './BackLink.module.css';

/** Bouton « retour » HIG (chevron + libellé de la page parente). */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className={styles.back}>
      <IconChevronLeft size={18} strokeWidth={2.4} />
      {label}
    </Link>
  );
}
