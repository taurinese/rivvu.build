import type { CSSProperties, ReactNode } from 'react';
import styles from './Pill.module.css';

interface Props {
  children: ReactNode;
  icon?: ReactNode;
  /** Couleur du texte (token CSS). La teinte de fond en est dérivée. */
  tone?: string;
  variant?: 'tinted' | 'neutral' | 'badge' | 'media';
}

/** Pastille (attribut, rareté, coût…). */
export function Pill({ children, icon, tone, variant = 'tinted' }: Props) {
  const style = tone ? ({ '--pill-tone': tone } as CSSProperties) : undefined;
  return (
    <span
      className={[styles.pill, styles[variant], icon ? styles.withIcon : ''].join(' ')}
      style={style}
    >
      {icon}
      {children}
    </span>
  );
}
