import type { ReactNode } from 'react';
import type { Resonator } from '@/data/schema';
import { elementIcon, weaponTypeIcon } from '@/features/game/assets';
import {
  ELEMENT_LABEL,
  WEAPON_TYPE_LABEL,
  elementColor,
  elementTint,
} from '@/features/game/labels';
import { Pill } from '@/ui/Pill';
import styles from './ResonatorHero.module.css';

interface Props {
  resonator: Resonator;
  /** Sous le nom du Résonateur (nom du build, avancement…). */
  children?: ReactNode;
  /** Panneau à droite (réglages ou résumé). */
  aside?: ReactNode;
}

/** Bandeau immersif : illustration du Résonateur sur fond de son attribut, toujours sombre. */
export function ResonatorHero({ resonator, children, aside }: Props) {
  return (
    <section
      className={`${styles.hero ?? ''} surface-dark`}
      aria-label="Résonateur"
      style={{
        background: `radial-gradient(ellipse at 62% 30%, ${elementTint(resonator.element, 0.42)}, ${elementTint(resonator.element, 0.08)} 55%, var(--surface-dark-base) 100%), var(--surface-dark-base)`,
      }}
    >
      <img src={elementIcon(resonator.element)} alt="" className={styles.watermark} />
      {resonator.sprite ? (
        <img
          src={resonator.sprite}
          alt={`${resonator.name.fr}, illustration`}
          className={styles.sprite}
        />
      ) : null}
      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.pills}>
            <Pill
              variant="media"
              tone={elementColor(resonator.element)}
              icon={<img src={elementIcon(resonator.element)} alt="" width={22} height={22} />}
            >
              {ELEMENT_LABEL[resonator.element]}
            </Pill>
            <Pill
              variant="media"
              tone="#ffffff"
              icon={
                <img src={weaponTypeIcon(resonator.weaponType)} alt="" width={22} height={22} />
              }
            >
              {WEAPON_TYPE_LABEL[resonator.weaponType]}
            </Pill>
            <Pill
              variant="media"
              tone={resonator.rarity === 5 ? 'var(--rarity-5)' : 'var(--rarity-4)'}
            >
              {'★'.repeat(resonator.rarity)}
            </Pill>
          </div>
          <h1 className={styles.title}>{resonator.name.fr}</h1>
          {children}
        </div>
        {aside}
      </div>
    </section>
  );
}
