import { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useBuilds } from '@/app/services';
import { ShareError, decodeShare } from '@/app/share/share-codec';
import { echoById, resonatorById, sonataById, weaponById } from '@/data/game';
import type { Resonator } from '@/data/schema';
import { FORTE_SKILLS } from '@/domain/build';
import type { Build } from '@/domain/build';
import { stepLabel } from '@/domain/levels';
import { computeFinalStats } from '@/domain/stats';
import { computeBuildStats } from '@/features/builds/build-stats';
import { FORTE_LABEL } from '@/features/builds/forte-labels';
import { ResonatorHero } from '@/features/builds/ResonatorHero';
import { StatsCard } from '@/features/builds/StatsCard';
import { STAT_LABEL } from '@/features/game/labels';
import { Button, ButtonLink } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { GroupedList, ListRow } from '@/ui/GroupedList';
import { IconPlus } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Pill } from '@/ui/Pill';
import styles from './SharedBuildPage.module.css';

const DamageSummary = lazy(async () => ({
  default: (await import('@/features/damage/DamageSummary')).DamageSummary,
}));

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; build: Build; resonator: Resonator };

/** Build reçu par lien (`/partage#…`) : consultation, puis copie dans « Mes builds ». */
export function SharedBuildPage() {
  const { hash } = useLocation();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    decodeShare(hash.replace(/^#/, ''))
      .then((build) => {
        const resonator = resonatorById.get(build.resonatorId);
        if (!active) return;
        setState(
          resonator
            ? { status: 'ready', build, resonator }
            : { status: 'error', message: 'Le Résonateur de ce build n’est pas disponible.' },
        );
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            status: 'error',
            message: error instanceof ShareError ? error.message : 'Lien de partage illisible.',
          });
      });
    return () => {
      active = false;
    };
  }, [hash]);

  if (state.status === 'loading') return null;
  if (state.status === 'error')
    return (
      <Page title="Lien de partage" subtitle={state.message}>
        <div>
          <ButtonLink to="/" variant="filled">
            Retour à mes builds
          </ButtonLink>
        </div>
      </Page>
    );
  return <SharedBuildView build={state.build} resonator={state.resonator} />;
}

function SharedBuildView({ build, resonator }: { build: Build; resonator: Resonator }) {
  const importBuild = useBuilds((s) => s.importBuild);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const { stats, character, weapon } = computeBuildStats(build);
  const baseline = computeFinalStats({ character, weapon, bonuses: [] });
  const weaponData = build.weapon ? weaponById.get(build.weapon.id) : undefined;

  const save = async () => {
    setSaving(true);
    const id = await importBuild(build);
    void navigate(`/builds/${id}`);
  };

  return (
    <div className={styles.page}>
      <ResonatorHero
        resonator={resonator}
        aside={
          <div className={styles.cta}>
            <p className={styles.ctaText}>Build partagé avec vous</p>
            <Button
              variant="filled"
              size="large"
              icon={<IconPlus size={16} strokeWidth={2.4} />}
              disabled={saving}
              onClick={() => void save()}
            >
              Ajouter à mes builds
            </Button>
          </div>
        }
      >
        <p className={styles.buildName}>{build.name}</p>
        <p className={styles.meta}>
          Niv. {stepLabel(build.level)} · S{build.chain}
        </p>
      </ResonatorHero>

      <div className={styles.grid}>
        <div className={styles.main}>
          <Card heading="Arme">
            {weaponData && build.weapon ? (
              <div className={styles.weapon}>
                {weaponData.icon ? (
                  <img src={weaponData.icon} alt="" width={56} height={56} />
                ) : null}
                <span>
                  <strong>{weaponData.name.fr}</strong>
                  <span className={styles.muted}>
                    Niv. {stepLabel(build.weapon.level)} · R{build.weapon.rank}
                  </span>
                </span>
              </div>
            ) : (
              <p className={styles.muted}>Aucune arme.</p>
            )}
          </Card>

          <Card heading="Échos">
            {build.echoes.length === 0 ? (
              <p className={styles.muted}>Aucun Écho.</p>
            ) : (
              <ul className={styles.echoes}>
                {build.echoes.map((echo) => {
                  const data = echoById.get(echo.echoId);
                  return (
                    <li key={echo.uid} className={styles.echo}>
                      {data?.icon ? <img src={data.icon} alt="" width={56} height={56} /> : null}
                      <span className={styles.echoName}>{data?.name.fr ?? echo.echoId}</span>
                      <span className={styles.muted}>
                        {STAT_LABEL[echo.mainStat]} ·{' '}
                        {sonataById.get(echo.sonata)?.name.fr ?? echo.sonata}
                      </span>
                      <Pill variant="badge">C{echo.cost}</Pill>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card heading="Forte">
            <GroupedList>
              {FORTE_SKILLS.map((skill) => (
                <ListRow
                  key={skill}
                  label={FORTE_LABEL[skill]}
                  trailing={String(build.forte[skill])}
                />
              ))}
            </GroupedList>
          </Card>
        </div>

        <div className={styles.side}>
          <StatsCard stats={stats} baseline={baseline} element={resonator.element} />
          <Card heading="Dégâts">
            <Suspense fallback={<p className={styles.muted}>Calcul des dégâts…</p>}>
              <DamageSummary build={build} stats={stats} resonator={resonator} />
            </Suspense>
          </Card>
        </div>
      </div>
    </div>
  );
}
