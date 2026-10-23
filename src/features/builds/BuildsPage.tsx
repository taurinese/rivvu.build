import { Link } from 'react-router';
import { useBuilds } from '@/app/services';
import { resonatorById } from '@/data/game';
import { elementIcon } from '@/features/game/assets';
import { ELEMENT_LABEL, elementColor, elementTint } from '@/features/game/labels';
import { ButtonLink } from '@/ui/Button';
import { IconCompare, IconPlus } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Pill } from '@/ui/Pill';
import styles from './BuildsPage.module.css';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export function BuildsPage() {
  const builds = useBuilds((s) => s.builds);
  const status = useBuilds((s) => s.status);

  return (
    <Page
      title="Mes builds"
      subtitle={
        builds.length > 0
          ? `${String(builds.length)} build${builds.length > 1 ? 's' : ''} enregistré${builds.length > 1 ? 's' : ''} sur cet appareil`
          : undefined
      }
      actions={
        <>
          {builds.length >= 2 ? (
            <ButtonLink to="/comparer" variant="gray" icon={<IconCompare size={16} />}>
              Comparer
            </ButtonLink>
          ) : null}
          <ButtonLink
            to="/nouveau"
            variant="filled"
            icon={<IconPlus size={16} strokeWidth={2.4} />}
          >
            Nouveau build
          </ButtonLink>
        </>
      }
    >
      {status === 'ready' && builds.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Aucun build pour l’instant</h2>
          <p className={styles.emptyText}>
            Choisissez un Résonateur pour commencer : arme, Forte, Chaîne, Échos, tout se configure
            étape par étape.
          </p>
          <ButtonLink to="/nouveau" variant="filled" size="large">
            Créer mon premier build
          </ButtonLink>
        </div>
      ) : (
        <ul className={styles.grid} aria-label="Builds">
          {builds.map((build) => {
            const resonator = resonatorById.get(build.resonatorId);
            return (
              <li key={build.id}>
                <Link to={`/builds/${build.id}`} className={styles.card}>
                  <span
                    className={styles.art}
                    style={
                      resonator ? { background: elementTint(resonator.element, 0.18) } : undefined
                    }
                  >
                    {resonator?.sprite ? (
                      <img src={resonator.sprite} alt="" className={styles.sprite} loading="lazy" />
                    ) : null}
                  </span>
                  <span className={styles.body}>
                    <span className={styles.name}>{build.name}</span>
                    <span className={styles.meta}>
                      {resonator ? (
                        <Pill
                          tone={elementColor(resonator.element)}
                          icon={
                            <img
                              src={elementIcon(resonator.element)}
                              alt=""
                              width={20}
                              height={20}
                            />
                          }
                        >
                          {resonator.name.fr}
                        </Pill>
                      ) : null}
                      {resonator ? (
                        <span className="visually-hidden">{ELEMENT_LABEL[resonator.element]}</span>
                      ) : null}
                    </span>
                    <span className={styles.date}>
                      Modifié le {dateFormatter.format(new Date(build.updatedAt))}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
