import type { ReactNode } from 'react';
import styles from './Page.module.css';

interface Props {
  title: ReactNode;
  /** Sur-titre (catégorie, contexte). */
  eyebrow?: ReactNode;
  /** Sous-titre sous le grand titre. */
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: 'regular' | 'wide';
}

/** Page avec grand titre (HIG « Large Title »). */
export function Page({ title, eyebrow, subtitle, actions, children, width = 'regular' }: Props) {
  return (
    <div className={`${styles.page} ${styles[width]}`}>
      <header className={styles.header}>
        <div className={styles.titles}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}
