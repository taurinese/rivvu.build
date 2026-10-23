import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { IconChevronRight } from './icons';
import styles from './GroupedList.module.css';

/** Liste groupée inset (HIG). */
export function GroupedList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul className={styles.list} aria-label={label}>
      {children}
    </ul>
  );
}

interface RowProps {
  label: ReactNode;
  /** Icône ou visuel à gauche. */
  leading?: ReactNode;
  /** Valeur ou contrôle à droite. */
  trailing?: ReactNode;
  /** Ligne secondaire sous le libellé. */
  detail?: ReactNode;
  /** Rend la ligne navigable. */
  to?: string;
  onClick?: () => void;
  muted?: boolean;
}

export function ListRow({
  label,
  leading,
  trailing,
  detail,
  to,
  onClick,
  muted = false,
}: RowProps) {
  const content = (
    <>
      {leading ? <span className={styles.leading}>{leading}</span> : null}
      <span className={styles.text}>
        <span className={muted ? styles.mutedLabel : styles.label}>{label}</span>
        {detail ? <span className={styles.detail}>{detail}</span> : null}
      </span>
      {trailing ? <span className={styles.trailing}>{trailing}</span> : null}
      {to || onClick ? <IconChevronRight size={14} className={styles.chevron} /> : null}
    </>
  );
  return (
    <li className={styles.item}>
      {to ? (
        <Link to={to} className={`${styles.row} ${styles.interactive}`}>
          {content}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={`${styles.row} ${styles.interactive}`}>
          {content}
        </button>
      ) : (
        <div className={styles.row}>{content}</div>
      )}
    </li>
  );
}
