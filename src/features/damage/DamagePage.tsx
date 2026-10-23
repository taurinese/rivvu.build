import { useId, useState } from 'react';
import { useBuilds } from '@/app/services';
import { resonatorById, resonators } from '@/data/game';
import type { Resonator, Skill } from '@/data/schema';
import type { Build, CustomBuff } from '@/domain/build';
import { STAT_KEYS } from '@/domain/types';
import type { StatKey } from '@/domain/types';
import { BuildLoader } from '@/features/builds/BuildLoader';
import { computeBuildStats } from '@/features/builds/build-stats';
import { FORTE_LABEL } from '@/features/builds/forte-labels';
import { elementIcon } from '@/features/game/assets';
import { ATTACK_TYPE_LABEL, STAT_LABEL, isPercentStat } from '@/features/game/labels';
import { filterResonators } from '@/features/resonators/filter';
import { formatFlat, formatPercent } from '@/lib/format';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { GroupedList, ListRow } from '@/ui/GroupedList';
import { IconClose, IconPlus, IconTrash } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Pill } from '@/ui/Pill';
import { SearchField } from '@/ui/SearchField';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Sheet } from '@/ui/Sheet';
import { Stepper } from '@/ui/Stepper';
import { Toggle } from '@/ui/Toggle';
import { translateRowLabel } from './row-label';
import { resonatorSkills, skillDamage } from './skill-damage';
import styles from './DamagePage.module.css';

const SKILL_TYPE_LABEL: Record<Skill['type'], string> = {
  basic: FORTE_LABEL.normal,
  skill: FORTE_LABEL.skill,
  circuit: FORTE_LABEL.circuit,
  liberation: FORTE_LABEL.liberation,
  intro: FORTE_LABEL.intro,
  outro: "Compétence d'outro",
  inherent: 'Compétence innée',
};

const ENEMY_LEVELS = [80, 90, 100, 110, 120];
const BUFF_STATS: StatKey[] = STAT_KEYS.filter((k) => !['hp', 'def'].includes(k));

function DamageEditor({ build, resonator }: { build: Build; resonator: Resonator }) {
  const update = useBuilds((s) => s.update);
  const change = (updater: (b: Build) => Build) => void update(build.id, updater);
  const [teamSlot, setTeamSlot] = useState<0 | 1 | null>(null);
  const { stats, sources } = computeBuildStats(build);
  const list = resonatorSkills(resonator.id);
  const levelIndex = ENEMY_LEVELS.indexOf(build.enemy.level);

  const setBuffs = (customBuffs: CustomBuff[]) => {
    change((b) => ({ ...b, customBuffs }));
  };

  return (
    <Page
      width="wide"
      eyebrow={<BackLink to={`/builds/${build.id}`} label={resonator.name.fr} />}
      title="Dégâts estimés"
      subtitle="Calcul de la formule du jeu (wiki) à partir de vos stats, contre l’ennemi choisi."
    >
      <div className={styles.layout}>
        <div className={styles.side}>
          <Card heading="Situation">
            <GroupedList>
              <ListRow
                label="Bonus de combat"
                detail="Effets 5 pièces, cumuls de passifs…"
                trailing={
                  <Toggle
                    label="Compter les bonus de combat"
                    checked={build.combat}
                    onChange={(combat) => {
                      change((b) => ({ ...b, combat }));
                    }}
                  />
                }
              />
              <ListRow
                label="Niveau de l’ennemi"
                trailing={
                  <Stepper
                    label="Niveau de l’ennemi"
                    valueText={String(build.enemy.level)}
                    canDecrement={levelIndex > 0}
                    canIncrement={levelIndex !== -1 && levelIndex < ENEMY_LEVELS.length - 1}
                    onDecrement={() => {
                      const level = ENEMY_LEVELS[levelIndex - 1];
                      if (level) change((b) => ({ ...b, enemy: { ...b.enemy, level } }));
                    }}
                    onIncrement={() => {
                      const level = ENEMY_LEVELS[levelIndex + 1];
                      if (level) change((b) => ({ ...b, enemy: { ...b.enemy, level } }));
                    }}
                  />
                }
              />
            </GroupedList>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Résistance de l’ennemi</span>
              <SegmentedControl
                label="Résistance de l’ennemi"
                value={String(build.enemy.res)}
                stretch
                onChange={(value) => {
                  change((b) => ({ ...b, enemy: { ...b.enemy, res: Number(value) } }));
                }}
                options={[
                  { value: '0', label: '0 %' },
                  { value: '10', label: '10 %' },
                  { value: '40', label: '40 %' },
                  { value: '60', label: '60 %' },
                ]}
              />
              <span className={styles.hint}>
                10 % pour la plupart des ennemis, 40 % pour un boss résistant à l’attribut (source :
                wiki).
              </span>
            </div>
          </Card>

          <Card heading="Équipe">
            <div className={styles.team}>
              {([0, 1] as const).map((slot) => {
                const mate = build.team[slot] ? resonatorById.get(build.team[slot]) : undefined;
                return (
                  <div key={slot} className={styles.mate}>
                    <button
                      type="button"
                      className={styles.mateButton}
                      onClick={() => {
                        setTeamSlot(slot);
                      }}
                    >
                      {mate?.icon ? (
                        <img src={mate.icon} alt="" width={56} height={56} />
                      ) : (
                        <IconPlus />
                      )}
                      <span>{mate ? mate.name.fr : `Coéquipier ${String(slot + 1)}`}</span>
                    </button>
                    {mate ? (
                      <button
                        type="button"
                        className={styles.mateRemove}
                        aria-label={`Retirer ${mate.name.fr} de l’équipe`}
                        onClick={() => {
                          change((b) => {
                            const team: Build['team'] = [...b.team];
                            team[slot] = null;
                            return { ...b, team };
                          });
                        }}
                      >
                        <IconClose size={14} />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <p className={styles.hint}>
              Les buffs des coéquipiers (Outro, ensembles de soutien…) ne sont pas encore calculés
              automatiquement : ajoutez-les ci-dessous.
            </p>
          </Card>

          <BuffsCard buffs={build.customBuffs} onChange={setBuffs} />

          <Card heading="Bonus comptés">
            <ul className={styles.sources}>
              {sources
                .filter((s) => Object.values(s.block).some((v) => v !== 0))
                .map((source, i) => (
                  <li key={`${source.kind}-${String(i)}`}>
                    <span className={styles.sourceLabel}>
                      {source.label}
                      {source.conditional ? <Pill variant="badge">combat</Pill> : null}
                    </span>
                    <span className={styles.sourceStats}>
                      {(Object.entries(source.block) as [StatKey, number][])
                        .filter(([, v]) => v !== 0)
                        .map(
                          ([stat, value]) =>
                            `${STAT_LABEL[stat]} +${isPercentStat(stat) ? formatPercent(value) : formatFlat(value)}`,
                        )
                        .join(' · ')}
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        </div>

        <div className={styles.main}>
          <div className={styles.summary}>
            <div>
              <span className={styles.hint}>ATQ</span>
              <strong>{formatFlat(stats.atk)}</strong>
            </div>
            <div>
              <span className={styles.hint}>Taux crit.</span>
              <strong>{formatPercent(stats.critRate)}</strong>
            </div>
            <div>
              <span className={styles.hint}>DGT crit.</span>
              <strong>{formatPercent(stats.critDmg)}</strong>
            </div>
            <div>
              <span className={styles.hint}>Bonus DGT</span>
              <strong className={styles.withIcon}>
                <img src={elementIcon(resonator.element)} alt="" width={20} height={20} />
                {formatPercent(stats.dmgBonus[resonator.element])}
              </strong>
            </div>
          </div>

          {list.length === 0 ? (
            <Card>
              <p className={styles.hint}>
                Aucune donnée de compétence disponible pour ce Résonateur.
              </p>
            </Card>
          ) : null}

          {list.map((skill) => (
            <Card
              key={skill.id}
              heading={skill.name.fr}
              accessory={<span className={styles.hint}>{SKILL_TYPE_LABEL[skill.type]}</span>}
            >
              {/* Région focalisable : le tableau défile horizontalement sur mobile (WCAG 2.1.1). */}
              <div
                className={styles.tableWrap}
                role="region"
                aria-label={`Dégâts de ${skill.name.fr}`}
                tabIndex={0}
              >
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Coup</th>
                      <th scope="col">
                        <span className={styles.long}>Multiplicateur</span>
                        <abbr className={styles.short} title="Multiplicateur">
                          Mult.
                        </abbr>
                      </th>
                      <th scope="col">Normal</th>
                      <th scope="col">Critique</th>
                      <th scope="col">Moyenne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skillDamage(build, stats, skill, resonator).map((row, i) => (
                      <tr key={`${row.label}-${String(i)}`}>
                        <th scope="row">
                          <span className={styles.rowLabel}>{translateRowLabel(row.label)}</span>
                          <span className={styles.rowMeta}>
                            {ATTACK_TYPE_LABEL[row.damageType]}
                            {row.damageTypeInferred ? ' (type déduit)' : ''}
                            {row.assumedPercent ? ' · % supposé' : ''}
                          </span>
                        </th>
                        <td>{formatPercent(row.motionValue * 100)}</td>
                        <td>{formatFlat(row.normal)}</td>
                        <td>{formatFlat(row.crit)}</td>
                        <td className={styles.average}>{formatFlat(row.average)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {teamSlot !== null ? (
        <TeamPicker
          exclude={[resonator.id, ...build.team.filter((id): id is string => id !== null)]}
          onClose={() => {
            setTeamSlot(null);
          }}
          onPick={(id) => {
            change((b) => {
              const team: Build['team'] = [...b.team];
              team[teamSlot] = id;
              return { ...b, team };
            });
            setTeamSlot(null);
          }}
        />
      ) : null}
    </Page>
  );
}

function BuffsCard({
  buffs,
  onChange,
}: {
  buffs: CustomBuff[];
  onChange: (buffs: CustomBuff[]) => void;
}) {
  const ids = useId();
  const patch = (id: string, changes: Partial<CustomBuff>) => {
    onChange(buffs.map((b) => (b.id === id ? { ...b, ...changes } : b)));
  };
  return (
    <Card
      heading="Buffs personnalisés"
      accessory={
        <Button
          size="small"
          variant="tinted"
          icon={<IconPlus size={14} />}
          onClick={() => {
            onChange([
              ...buffs,
              {
                id: crypto.randomUUID(),
                label: 'Nouveau buff',
                stat: 'amplify',
                value: 10,
                enabled: true,
              },
            ]);
          }}
        >
          Ajouter
        </Button>
      }
    >
      {buffs.length === 0 ? (
        <p className={styles.hint}>Ex. Outro d’un coéquipier : « Amplification des DGT +15 % ».</p>
      ) : (
        <ul className={styles.buffs}>
          {buffs.map((buff, index) => (
            <li key={buff.id} className={styles.buff}>
              <Toggle
                label={`Activer ${buff.label}`}
                checked={buff.enabled}
                onChange={(enabled) => {
                  patch(buff.id, { enabled });
                }}
              />
              <label className={styles.buffField}>
                <span className="visually-hidden">Nom du buff {index + 1}</span>
                <input
                  id={`${ids}-label-${String(index)}`}
                  value={buff.label}
                  maxLength={60}
                  onChange={(event) => {
                    patch(buff.id, { label: event.target.value });
                  }}
                />
              </label>
              <label className={styles.buffField}>
                <span className="visually-hidden">Stat du buff {index + 1}</span>
                <select
                  value={buff.stat}
                  onChange={(event) => {
                    patch(buff.id, { stat: event.target.value as StatKey });
                  }}
                >
                  {BUFF_STATS.map((stat) => (
                    <option key={stat} value={stat}>
                      {STAT_LABEL[stat]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${styles.buffField ?? ''} ${styles.buffValue ?? ''}`}>
                <span className="visually-hidden">Valeur du buff {index + 1}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={buff.value}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value)) patch(buff.id, { value });
                  }}
                />
              </label>
              <button
                type="button"
                className={styles.buffRemove}
                aria-label={`Supprimer ${buff.label}`}
                onClick={() => {
                  onChange(buffs.filter((b) => b.id !== buff.id));
                }}
              >
                <IconTrash size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TeamPicker({
  exclude,
  onPick,
  onClose,
}: {
  exclude: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const list = filterResonators(resonators, { query }).filter((r) => !exclude.includes(r.id));
  return (
    <Sheet title="Choisir un coéquipier" onClose={onClose}>
      <SearchField
        label="Rechercher un Résonateur"
        value={query}
        onChange={setQuery}
        size="large"
      />
      <ul className={styles.teamGrid} aria-label="Coéquipiers possibles">
        {list.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className={styles.teamItem}
              onClick={() => {
                onPick(r.id);
              }}
            >
              {r.icon ? <img src={r.icon} alt="" width={72} height={72} loading="lazy" /> : null}
              <span>{r.name.fr}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export function DamagePage() {
  return (
    <BuildLoader>
      {(build, resonator) => <DamageEditor build={build} resonator={resonator} />}
    </BuildLoader>
  );
}
