import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface Props extends HTMLAttributes<HTMLElement> {
  heading?: ReactNode;
  /** Éléments à droite du titre (badges, lien « Modifier »…). */
  accessory?: ReactNode;
  padded?: boolean;
}

/** Carte de contenu (section) aux coins arrondis, titre optionnel. */
export function Card({ heading, accessory, padded = true, className, children, ...props }: Props) {
  return (
    <section
      className={[styles.card, padded ? styles.padded : '', className ?? ''].join(' ')}
      {...props}
    >
      {(heading ?? accessory) ? (
        <header className={styles.header}>
          {heading ? <h2 className={styles.title}>{heading}</h2> : null}
          {accessory ? <div className={styles.accessory}>{accessory}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
