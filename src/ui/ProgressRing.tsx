import type { CSSProperties } from 'react';
import styles from './ProgressRing.module.css';

interface Props {
  /** 0 à 1. */
  value: number;
  size?: number;
  label: string;
}

export function ProgressRing({ value, size = 34, label }: Props) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <span
      role="img"
      aria-label={label}
      className={styles.ring}
      style={{ '--ring-pct': `${pct}%`, '--ring-size': `${size}px` } as CSSProperties}
    />
  );
}
