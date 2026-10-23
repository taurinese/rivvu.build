import { Link } from 'react-router';
import { useBuilds, useInventory } from '@/app/services';
import { echoById, sonataById } from '@/data/game';
import { MAIN_STAT_VALUES, critValue } from '@/domain/echoes';
import { STAT_LABEL, isPercentStat } from '@/features/game/labels';
import { formatFlat, formatPercent } from '@/lib/format';
import { Button } from '@/ui/Button';
import { IconTrash } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Pill } from '@/ui/Pill';
import styles from './InventoryPage.module.css';

export function InventoryPage() {
  const echoes = useInventory((s) => s.echoes);
  const remove = useInventory((s) => s.remove);
  const builds = useBuilds((s) => s.builds);

  return (
    <Page
      title="Inventaire d’Échos"
      subtitle="Les Échos enregistrés depuis un build, réutilisables dans tous vos builds."
    >
      {echoes.length === 0 ? (
        <div className={styles.empty}>
          <h2>Inventaire vide</h2>
          <p>Dans l’éditeur d’Échos d’un build, utilisez « Enregistrer dans l’inventaire ».</p>
        </div>
      ) : (
        <ul className={styles.grid} aria-label="Échos de l’inventaire">
          {echoes.map((echo) => {
            const data = echoById.get(echo.echoId);
            const set = sonataById.get(echo.sonata);
            const usedIn = builds.filter((b) => b.echoes.some((e) => e.uid === echo.uid));
            const main = MAIN_STAT_VALUES[echo.cost][echo.mainStat] ?? 0;
            return (
              <li key={echo.uid} className={styles.card}>
                <div className={styles.header}>
                  {data?.icon ? <img src={data.icon} alt="" width={64} height={64} /> : null}
                  <div className={styles.title}>
                    <h2>{data?.name.fr ?? echo.echoId}</h2>
                    <span className={styles.meta}>
                      {set?.icon ? <img src={set.icon} alt="" width={18} height={18} /> : null}
                      {set?.name.fr ?? echo.sonata}
                    </span>
                  </div>
                  <Pill variant="badge">C{echo.cost}</Pill>
                </div>
                <p className={styles.main}>
                  {STAT_LABEL[echo.mainStat]}{' '}
                  <strong>
                    {isPercentStat(echo.mainStat) ? formatPercent(main) : formatFlat(main)}
                  </strong>
                </p>
                <ul className={styles.substats}>
                  {echo.substats.map((s) => (
                    <li key={s.stat}>
                      <span>{STAT_LABEL[s.stat]}</span>
                      <span>
                        {isPercentStat(s.stat) ? formatPercent(s.value) : formatFlat(s.value)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className={styles.meta}>
                  Valeur crit. {critValue(echo).toFixed(1).replace('.', ',')}
                  {usedIn.length > 0 ? ' · équipé sur ' : ' · non équipé'}
                  {usedIn.map((b, i) => (
                    <span key={b.id}>
                      {i > 0 ? ', ' : ''}
                      <Link to={`/builds/${b.id}/echos`}>{b.name}</Link>
                    </span>
                  ))}
                </p>
                <div>
                  <Button
                    size="small"
                    variant="destructive"
                    icon={<IconTrash size={14} />}
                    onClick={() => {
                      void remove(echo.uid);
                    }}
                  >
                    Supprimer de l’inventaire
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
