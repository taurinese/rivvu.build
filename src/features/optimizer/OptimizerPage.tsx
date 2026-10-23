import { useId, useState } from 'react';
import { Link } from 'react-router';
import { useBuilds, useInventory } from '@/app/services';
import { echoById, sonataById } from '@/data/game';
import type { Resonator } from '@/data/schema';
import type { Build } from '@/domain/build';
import { sonataPieceCounts } from '@/domain/echoes';
import type { EchoInstance } from '@/domain/echoes';
import { BuildLoader } from '@/features/builds/BuildLoader';
import { computeBuildStats } from '@/features/builds/build-stats';
import { resonatorSkills, strongestHit } from '@/features/damage/skill-damage';
import { STAT_LABEL } from '@/features/game/labels';
import { formatFlat, formatPercent } from '@/lib/format';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { IconBolt, IconCheck } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Pill } from '@/ui/Pill';
import type { OptimizeOutcome } from './optimize-build';
import { runOptimizer } from './run-optimizer';
import styles from './OptimizerPage.module.css';

type Run =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; outcome: OptimizeOutcome; skillId: string }
  | { status: 'error' };

/** Échos candidats : l'inventaire et ceux déjà équipés sur ce build (sans doublon). */
function candidatesFor(build: Build, inventory: readonly EchoInstance[]): EchoInstance[] {
  const byUid = new Map<string, EchoInstance>();
  for (const echo of [...build.echoes, ...inventory]) byUid.set(echo.uid, echo);
  return [...byUid.values()];
}

function Optimizer({ build, resonator }: { build: Build; resonator: Resonator }) {
  const update = useBuilds((s) => s.update);
  const inventory = useInventory((s) => s.echoes);
  const selectId = useId();
  const skills = resonatorSkills(resonator.id);
  const { stats } = computeBuildStats(build);
  const [skillId, setSkillId] = useState(
    () => strongestHit(build, stats, resonator)?.skill.id ?? skills[0]?.id ?? '',
  );
  const [run, setRun] = useState<Run>({ status: 'idle' });
  const [equipped, setEquipped] = useState<number | null>(null);
  const candidates = candidatesFor(build, inventory);

  const start = async () => {
    setRun({ status: 'running' });
    setEquipped(null);
    try {
      const outcome = await runOptimizer({ build, inventory: candidates, skillId });
      setRun({ status: 'done', outcome, skillId });
    } catch {
      setRun({ status: 'error' });
    }
  };

  const equip = (index: number, echoes: EchoInstance[]) => {
    void update(build.id, (b) => ({ ...b, echoes }));
    setEquipped(index);
  };

  return (
    <Page
      eyebrow={<BackLink to={`/builds/${build.id}`} label={resonator.name.fr} />}
      title="Optimiseur d’Échos"
      subtitle="Cherche dans vos Échos la combinaison qui inflige le plus de dégâts à la compétence choisie."
    >
      <div className={styles.stack}>
        <Card heading="Objectif">
          {skills.length === 0 ? (
            <p className={styles.hint}>Aucune donnée de compétence pour ce Résonateur.</p>
          ) : (
            <div className={styles.field}>
              <label htmlFor={selectId} className={styles.label}>
                Compétence à maximiser
              </label>
              <select
                id={selectId}
                className={styles.select}
                value={skillId}
                onChange={(event) => {
                  setSkillId(event.target.value);
                }}
              >
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name.fr}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className={styles.hint}>
            Total des dégâts moyens de la compétence, avec la situation réglée dans{' '}
            <Link to={`/builds/${build.id}/degats`}>Dégâts</Link> (ennemi, bonus de combat, buffs).{' '}
            {candidates.length} Écho{candidates.length > 1 ? 's' : ''} pris en compte : votre{' '}
            <Link to="/echos">inventaire</Link> et ceux de ce build.
          </p>
          <div>
            <Button
              variant="filled"
              size="large"
              icon={<IconBolt size={16} />}
              disabled={run.status === 'running' || candidates.length === 0 || !skillId}
              onClick={() => void start()}
            >
              {run.status === 'running' ? 'Calcul en cours…' : 'Lancer l’optimisation'}
            </Button>
          </div>
        </Card>

        <div aria-live="polite" className={styles.stack}>
          {run.status === 'error' ? (
            <p className={styles.hint}>L’optimisation a échoué. Réessayez.</p>
          ) : null}
          {run.status === 'done' && run.outcome.results.length === 0 ? (
            <p className={styles.hint}>Aucune combinaison possible avec ces Échos.</p>
          ) : null}
          {run.status === 'done'
            ? run.outcome.results.map((result, index) => (
                <Result
                  key={result.echoes.map((e) => e.uid).join('-')}
                  rank={index + 1}
                  value={result.value}
                  current={run.outcome.current}
                  echoes={result.echoes}
                  equipped={equipped === index}
                  onEquip={() => {
                    equip(index, result.echoes);
                  }}
                />
              ))
            : null}
        </div>
      </div>
    </Page>
  );
}

function Result({
  rank,
  value,
  current,
  echoes,
  equipped,
  onEquip,
}: {
  rank: number;
  value: number;
  current: number;
  echoes: EchoInstance[];
  equipped: boolean;
  onEquip: () => void;
}) {
  const gain = current > 0 ? ((value - current) / current) * 100 : 0;
  const sets = Object.entries(sonataPieceCounts(echoes))
    .filter(([, pieces]) => pieces >= 2)
    .map(([id, pieces]) => `${sonataById.get(id)?.name.fr ?? id} ×${String(pieces)}`);
  return (
    <Card
      heading={`Option ${String(rank)}`}
      accessory={
        equipped ? (
          <span className={styles.done}>
            <IconCheck size={14} strokeWidth={3} /> Équipée
          </span>
        ) : (
          <Button size="small" variant="tinted" onClick={onEquip}>
            Équiper
          </Button>
        )
      }
    >
      <p className={styles.value}>
        <strong>{formatFlat(value)}</strong>
        {current > 0 ? (
          <span className={gain >= 0 ? styles.up : styles.down}>
            {formatPercent(gain, { signed: true })} par rapport aux Échos actuels
          </span>
        ) : null}
      </p>
      <ul className={styles.echoes}>
        {echoes.map((echo) => {
          const data = echoById.get(echo.echoId);
          return (
            <li key={echo.uid} className={styles.echo}>
              {data?.icon ? <img src={data.icon} alt="" width={44} height={44} /> : null}
              <span className={styles.echoText}>
                <span className={styles.echoName}>{data?.name.fr ?? echo.echoId}</span>
                <span className={styles.hint}>{STAT_LABEL[echo.mainStat]}</span>
              </span>
              <Pill variant="badge">C{echo.cost}</Pill>
            </li>
          );
        })}
      </ul>
      {sets.length > 0 ? <p className={styles.hint}>Ensembles : {sets.join(' · ')}</p> : null}
    </Card>
  );
}

export function OptimizerPage() {
  return (
    <BuildLoader>
      {(build, resonator) => <Optimizer build={build} resonator={resonator} />}
    </BuildLoader>
  );
}
