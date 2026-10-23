import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useBuilds } from '@/app/services';
import { echoById, weaponById } from '@/data/game';
import type { Resonator } from '@/data/schema';
import { FORTE_SKILLS, MAX_CHAIN, totalEchoCost } from '@/domain/build';
import type { Build } from '@/domain/build';
import { MAX_COST } from '@/domain/echoes';
import { stepAfter, stepBefore, stepLabel } from '@/domain/levels';
import { computeFinalStats } from '@/domain/stats';
import { elementIcon, weaponTypeIcon } from '@/features/game/assets';
import {
  ELEMENT_LABEL,
  WEAPON_TYPE_LABEL,
  elementColor,
  elementTint,
} from '@/features/game/labels';
import { formatPercent } from '@/lib/format';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { GroupedList, ListRow } from '@/ui/GroupedList';
import { IconCheck, IconChevronRight, IconTrash } from '@/ui/icons';
import { Pill } from '@/ui/Pill';
import { ProgressRing } from '@/ui/ProgressRing';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Stepper } from '@/ui/Stepper';
import { computeBuildStats } from './build-stats';
import { FORTE_LABEL } from './forte-labels';
import { buildProgress } from './progress';
import { StatsCard } from './StatsCard';
import styles from './BuildOverview.module.css';

interface Props {
  build: Build;
  resonator: Resonator;
}

export function BuildOverview({ build, resonator }: Props) {
  const update = useBuilds((s) => s.update);
  const remove = useBuilds((s) => s.remove);
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(build.name);

  const change = (updater: (b: Build) => Build) => void update(build.id, updater);
  const commitName = () => {
    const name = draftName.trim().slice(0, 80) || 'Mon build';
    setEditingName(false);
    if (name !== build.name) change((b) => ({ ...b, name }));
  };

  const { stats, character, weapon } = computeBuildStats(build);
  const baseline = computeFinalStats({ character, weapon, bonuses: [] });
  const weaponData = build.weapon ? weaponById.get(build.weapon.id) : undefined;
  const progress = buildProgress(build);
  const next = stepAfter(build.level);
  const previous = stepBefore(build.level);
  const cost = totalEchoCost(build);
  const base = `/builds/${build.id}`;

  return (
    <div className={styles.page}>
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

        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
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
            {editingName ? (
              <form
                className={styles.renameForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  commitName();
                }}
              >
                <label htmlFor="build-name" className="visually-hidden">
                  Nom du build
                </label>
                <input
                  id="build-name"
                  className={styles.renameInput}
                  value={draftName}
                  maxLength={80}
                  onChange={(event) => {
                    setDraftName(event.target.value);
                  }}
                  onBlur={commitName}
                />
                <Button type="submit" variant="filled" size="small">
                  OK
                </Button>
              </form>
            ) : (
              <button
                type="button"
                className={styles.buildName}
                aria-label={`Renommer « ${build.name} »`}
                onClick={() => {
                  setDraftName(build.name);
                  setEditingName(true);
                }}
              >
                {build.name}
              </button>
            )}
            <div className={styles.progress}>
              <ProgressRing
                value={progress.done / progress.total}
                label={`${String(progress.done)} étapes sur ${String(progress.total)}`}
              />
              <span aria-hidden="true">
                {progress.done} étapes sur {progress.total}
              </span>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelRow}>
              <span className={styles.panelLabel}>Niveau</span>
              <Stepper
                label="Niveau"
                valueText={stepLabel(build.level)}
                canDecrement={previous !== null}
                canIncrement={next !== null}
                onDecrement={() => {
                  if (previous) change((b) => ({ ...b, level: previous }));
                }}
                onIncrement={() => {
                  if (next) change((b) => ({ ...b, level: next }));
                }}
              />
            </div>
            <div className={styles.panelColumn}>
              <span className={styles.panelLabel}>Chaîne de résonance</span>
              <SegmentedControl
                label="Chaîne de résonance"
                value={String(build.chain)}
                stretch
                size="small"
                onChange={(value) => {
                  change((b) => ({ ...b, chain: Number(value) }));
                }}
                options={Array.from({ length: MAX_CHAIN + 1 }, (_, i) => ({
                  value: String(i),
                  label: `S${String(i)}`,
                }))}
              />
            </div>
            <Link to={`${base}/arme`} className={styles.weaponRow}>
              <span className={styles.weaponIcon}>
                {weaponData?.icon ? (
                  <img src={weaponData.icon} alt="" width={46} height={46} />
                ) : null}
              </span>
              <span className={styles.weaponText}>
                <span className={styles.weaponName}>
                  {weaponData ? weaponData.name.fr : 'Choisir une arme'}
                </span>
                <span className={styles.weaponMeta}>
                  {weaponData && build.weapon
                    ? `Niv. ${stepLabel(build.weapon.level)} · R${String(build.weapon.rank)}`
                    : WEAPON_TYPE_LABEL[resonator.weaponType]}
                </span>
              </span>
              <IconChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <nav aria-label="Étapes du build" className={styles.steps}>
        {progress.steps.map((step, index) => (
          <Link key={step.id} to={`${base}/${step.path}`} className={styles.step}>
            <span className={step.done ? styles.stepDone : styles.stepTodo} aria-hidden="true">
              {step.done ? <IconCheck size={12} strokeWidth={3} /> : index + 1}
            </span>
            {step.label}
            <span className="visually-hidden">{step.done ? ', fait' : ', à faire'}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <Card
            heading="Échos"
            accessory={
              <>
                <span className={styles.muted}>
                  Coût {cost} / {MAX_COST}
                </span>
                <Link to={`${base}/echos`}>Modifier</Link>
              </>
            }
          >
            {build.echoes.length === 0 ? (
              <p className={styles.muted}>Aucun Écho équipé pour l’instant.</p>
            ) : (
              <ul className={styles.echoes}>
                {build.echoes.map((echo) => {
                  const data = echoById.get(echo.echoId);
                  return (
                    <li key={echo.uid} className={styles.echo}>
                      {data?.icon ? <img src={data.icon} alt="" width={56} height={56} /> : null}
                      <span className={styles.echoName}>{data?.name.fr ?? echo.echoId}</span>
                      <Pill variant="badge">C{echo.cost}</Pill>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card heading="Forte" accessory={<Link to={`${base}/forte`}>Modifier</Link>}>
            <GroupedList>
              {FORTE_SKILLS.map((skill) => (
                <ListRow
                  key={skill}
                  label={FORTE_LABEL[skill]}
                  trailing={
                    <span className={styles.forteLevel}>
                      <span className={styles.forteBar} aria-hidden="true">
                        <span
                          style={{
                            width: `${String(build.forte[skill] * 10)}%`,
                            background: elementColor(resonator.element),
                          }}
                        />
                      </span>
                      {build.forte[skill]}
                    </span>
                  }
                />
              ))}
            </GroupedList>
          </Card>
        </div>

        <div className={styles.sideColumn}>
          <StatsCard stats={stats} baseline={baseline} element={resonator.element} />
          <Card heading="Repères">
            <GroupedList>
              <ListRow
                label="Ratio crit."
                trailing={`1 : ${(stats.critDmg / Math.max(stats.critRate, 1)).toFixed(1).replace('.', ',')}`}
              />
              <ListRow
                label="Taux crit. effectif"
                trailing={formatPercent(Math.min(100, stats.critRate))}
              />
            </GroupedList>
          </Card>
        </div>
      </div>

      <div className={styles.footer}>
        <Button
          variant="destructive"
          icon={<IconTrash size={16} />}
          onClick={() => {
            if (window.confirm(`Supprimer le build « ${build.name} » ?`)) {
              void remove(build.id).then(() => navigate('/'));
            }
          }}
        >
          Supprimer ce build
        </Button>
      </div>
    </div>
  );
}
