import { Suspense, lazy, useId } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useBuilds } from '@/app/services';
import { resonatorById } from '@/data/game';
import type { Build } from '@/domain/build';
import { computeBuildStats } from '@/features/builds/build-stats';
import { STAT_LABEL } from '@/features/game/labels';
import { formatFlat, formatPercent } from '@/lib/format';
import { ButtonLink } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Page } from '@/ui/Page';
import { compareStats } from './compare';
import type { CompareKey } from './compare';
import { DeltaCell } from './DeltaCell';
import styles from './ComparePage.module.css';

const CompareDamage = lazy(async () => ({
  default: (await import('./CompareDamage')).CompareDamage,
}));

const ROW_LABEL: Record<CompareKey, string> = {
  hp: STAT_LABEL.hp,
  atk: STAT_LABEL.atk,
  def: STAT_LABEL.def,
  energyRegen: STAT_LABEL.energyRegen,
  critRate: STAT_LABEL.critRate,
  critDmg: STAT_LABEL.critDmg,
  elementDmg: 'Bonus DGT d’attribut',
  amplify: STAT_LABEL.amplify,
};

function BuildSelect({
  label,
  value,
  builds,
  onChange,
}: {
  label: string;
  value: string;
  builds: Build[];
  onChange: (id: string) => void;
}) {
  const id = useId();
  const build = builds.find((b) => b.id === value);
  const resonator = build ? resonatorById.get(build.resonatorId) : undefined;
  return (
    <Card className={styles.side}>
      <div className={styles.sideHead}>
        {resonator?.icon ? <img src={resonator.icon} alt="" width={56} height={56} /> : null}
        <div className={styles.field}>
          <label htmlFor={id} className={styles.fieldLabel}>
            {label}
          </label>
          <select
            id={id}
            className={styles.select}
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
            }}
          >
            {builds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {resonatorById.get(b.resonatorId)?.name.fr ?? '?'}
              </option>
            ))}
          </select>
        </div>
      </div>
      {build ? (
        <Link to={`/builds/${build.id}`} className={styles.open}>
          Ouvrir le build
        </Link>
      ) : null}
    </Card>
  );
}

/** Deux builds côte à côte : stats clés et dégâts, avec l'écart de B par rapport à A. */
export function ComparePage() {
  const builds = useBuilds((s) => s.builds);
  const status = useBuilds((s) => s.status);
  const [params, setParams] = useSearchParams();

  const aId = params.get('a') ?? builds[0]?.id ?? '';
  const bId = params.get('b') ?? builds.find((b) => b.id !== aId)?.id ?? '';
  const a = builds.find((b) => b.id === aId);
  const b = builds.find((x) => x.id === bId);
  const resA = a ? resonatorById.get(a.resonatorId) : undefined;
  const resB = b ? resonatorById.get(b.resonatorId) : undefined;

  const select = (key: 'a' | 'b', id: string) => {
    const next = new URLSearchParams(params);
    next.set('a', aId);
    next.set('b', bId);
    next.set(key, id);
    setParams(next, { replace: true });
  };

  if (status === 'ready' && builds.length < 2)
    return (
      <Page title="Comparer" subtitle="Il faut au moins deux builds pour les comparer.">
        <div>
          <ButtonLink to="/nouveau" variant="filled">
            Créer un build
          </ButtonLink>
        </div>
      </Page>
    );

  const statsA = a ? computeBuildStats(a).stats : undefined;
  const statsB = b ? computeBuildStats(b).stats : undefined;

  return (
    <Page
      width="wide"
      title="Comparer"
      subtitle="Stats et dégâts de deux builds ; l’écart est celui de B par rapport à A."
    >
      <div className={styles.pickers}>
        <BuildSelect
          label="Build A"
          value={aId}
          builds={builds}
          onChange={(id) => {
            select('a', id);
          }}
        />
        <BuildSelect
          label="Build B"
          value={bId}
          builds={builds}
          onChange={(id) => {
            select('b', id);
          }}
        />
      </div>

      {a && b && resA && resB && statsA && statsB ? (
        <>
          <Card heading="Statistiques">
            <div
              className={styles.tableWrap}
              role="region"
              aria-label="Statistiques comparées"
              tabIndex={0}
            >
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Stat</th>
                    <th scope="col">A</th>
                    <th scope="col">B</th>
                    <th scope="col">Écart</th>
                  </tr>
                </thead>
                <tbody>
                  {compareStats(
                    { stats: statsA, element: resA.element },
                    { stats: statsB, element: resB.element },
                  ).map((row) => {
                    const format = row.percent ? formatPercent : formatFlat;
                    return (
                      <tr key={row.key}>
                        <th scope="row">{ROW_LABEL[row.key]}</th>
                        <td>{format(row.a)}</td>
                        <td>{format(row.b)}</td>
                        <DeltaCell a={row.a} b={row.b} percent={row.percent} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card heading="Dégâts">
            <div
              className={styles.tableWrap}
              role="region"
              aria-label="Dégâts comparés"
              tabIndex={0}
            >
              <Suspense fallback={<p className={styles.muted}>Calcul des dégâts…</p>}>
                <CompareDamage
                  a={{ build: a, stats: statsA, resonator: resA }}
                  b={{ build: b, stats: statsB, resonator: resB }}
                />
              </Suspense>
            </div>
          </Card>
        </>
      ) : null}
    </Page>
  );
}
