import { useBuilds } from '@/app/services';
import type { Resonator } from '@/data/schema';
import { FORTE_SKILLS, MAX_FORTE_LEVEL } from '@/domain/build';
import type { Build, PlannerState } from '@/domain/build';
import { stepAfter, stepBefore, stepLabel } from '@/domain/levels';
import type { LevelStep } from '@/domain/levels';
import { INHERENT_SKILLS, STAT_BONUS_STRANDS } from '@/domain/planner';
import { BuildLoader } from '@/features/builds/BuildLoader';
import { FORTE_LABEL } from '@/features/builds/forte-labels';
import { itemById } from '@/data/materials';
import { formatFlat } from '@/lib/format';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { GroupedList, ListRow } from '@/ui/GroupedList';
import { Page } from '@/ui/Page';
import { Stepper } from '@/ui/Stepper';
import { materialPlan, plannerOf } from './plan-for-build';
import styles from './PlannerPage.module.css';

function CountStepper({
  label,
  value,
  min = 0,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Stepper
      label={label}
      valueText={String(value)}
      canDecrement={value > min}
      canIncrement={value < max}
      onDecrement={() => {
        onChange(value - 1);
      }}
      onIncrement={() => {
        onChange(value + 1);
      }}
    />
  );
}

function LevelStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LevelStep;
  onChange: (value: LevelStep) => void;
}) {
  const previous = stepBefore(value);
  const next = stepAfter(value);
  return (
    <Stepper
      label={label}
      valueText={stepLabel(value)}
      canDecrement={previous !== null}
      canIncrement={next !== null}
      onDecrement={() => {
        if (previous) onChange(previous);
      }}
      onIncrement={() => {
        if (next) onChange(next);
      }}
    />
  );
}

function Planner({ build, resonator }: { build: Build; resonator: Resonator }) {
  const update = useBuilds((s) => s.update);
  const { current, target } = plannerOf(build);
  const state: PlannerState = {
    current,
    inherent: target.inherent,
    statBonus: target.statBonus,
  };
  const save = (next: PlannerState) => void update(build.id, (b) => ({ ...b, planner: next }));
  const setCurrent = (changes: Partial<PlannerState['current']>) => {
    const next = { ...current, ...changes };
    // Un nœud de niveau 2 suppose le nœud de niveau 1 de la même branche.
    next.statBonus = {
      ...next.statBonus,
      tier2: Math.min(next.statBonus.tier2, next.statBonus.tier1),
    };
    save({ ...state, current: next });
  };
  const plan = materialPlan(build);
  const credit = itemById.get('shell-credit');

  return (
    <Page
      width="wide"
      eyebrow={<BackLink to={`/builds/${build.id}`} label={resonator.name.fr} />}
      title="Matériaux"
      subtitle="Ce qu’il vous reste à réunir pour atteindre ce build, d’après votre progression en jeu."
    >
      <div className={styles.layout}>
        <div className={styles.side}>
          <Card
            heading="Progression actuelle"
            accessory={
              <Button
                size="small"
                variant="gray"
                onClick={() => {
                  save({ ...state, current: { ...target } });
                }}
              >
                Tout est monté
              </Button>
            }
          >
            <GroupedList label="Progression actuelle">
              <ListRow
                label="Niveau du Résonateur"
                trailing={
                  <LevelStepper
                    label="Niveau actuel du Résonateur"
                    value={current.level}
                    onChange={(level) => {
                      setCurrent({ level });
                    }}
                  />
                }
              />
              {target.weaponLevel ? (
                <ListRow
                  label="Niveau de l’arme"
                  trailing={
                    <LevelStepper
                      label="Niveau actuel de l’arme"
                      value={current.weaponLevel ?? { level: 1, ascension: 0 }}
                      onChange={(weaponLevel) => {
                        setCurrent({ weaponLevel });
                      }}
                    />
                  }
                />
              ) : null}
              {FORTE_SKILLS.map((skill) => (
                <ListRow
                  key={skill}
                  label={FORTE_LABEL[skill]}
                  trailing={
                    <CountStepper
                      label={`${FORTE_LABEL[skill]} actuel`}
                      value={current.forte[skill]}
                      min={1}
                      max={MAX_FORTE_LEVEL}
                      onChange={(level) => {
                        setCurrent({ forte: { ...current.forte, [skill]: level } });
                      }}
                    />
                  }
                />
              ))}
              <ListRow
                label="Compétences innées"
                trailing={
                  <CountStepper
                    label="Compétences innées débloquées"
                    value={current.inherent}
                    max={INHERENT_SKILLS}
                    onChange={(inherent) => {
                      setCurrent({ inherent });
                    }}
                  />
                }
              />
              <ListRow
                label="Bonus de stats, niveau 1"
                detail={`Nœuds débloqués sur ${String(STAT_BONUS_STRANDS)}`}
                trailing={
                  <CountStepper
                    label="Bonus de stats de niveau 1 débloqués"
                    value={current.statBonus.tier1}
                    max={STAT_BONUS_STRANDS}
                    onChange={(tier1) => {
                      setCurrent({ statBonus: { ...current.statBonus, tier1 } });
                    }}
                  />
                }
              />
              <ListRow
                label="Bonus de stats, niveau 2"
                detail="Après le niveau 1 de la même branche"
                trailing={
                  <CountStepper
                    label="Bonus de stats de niveau 2 débloqués"
                    value={current.statBonus.tier2}
                    max={current.statBonus.tier1}
                    onChange={(tier2) => {
                      setCurrent({ statBonus: { ...current.statBonus, tier2 } });
                    }}
                  />
                }
              />
            </GroupedList>
          </Card>

          <Card heading="Objectif">
            <p className={styles.hint}>
              Niveau {stepLabel(target.level)}
              {target.weaponLevel ? `, arme niveau ${stepLabel(target.weaponLevel)}` : ''} et Forte
              du build. À régler ici :
            </p>
            <GroupedList label="Objectif">
              <ListRow
                label="Compétences innées"
                trailing={
                  <CountStepper
                    label="Compétences innées visées"
                    value={state.inherent}
                    max={INHERENT_SKILLS}
                    onChange={(inherent) => {
                      save({ ...state, inherent });
                    }}
                  />
                }
              />
              <ListRow
                label="Bonus de stats, niveau 1"
                trailing={
                  <CountStepper
                    label="Bonus de stats de niveau 1 visés"
                    value={state.statBonus.tier1}
                    max={STAT_BONUS_STRANDS}
                    onChange={(tier1) => {
                      save({
                        ...state,
                        statBonus: { tier1, tier2: Math.min(state.statBonus.tier2, tier1) },
                      });
                    }}
                  />
                }
              />
              <ListRow
                label="Bonus de stats, niveau 2"
                trailing={
                  <CountStepper
                    label="Bonus de stats de niveau 2 visés"
                    value={state.statBonus.tier2}
                    max={state.statBonus.tier1}
                    onChange={(tier2) => {
                      save({ ...state, statBonus: { ...state.statBonus, tier2 } });
                    }}
                  />
                }
              />
            </GroupedList>
          </Card>
        </div>

        <div className={styles.main}>
          <Card heading="À réunir">
            {plan.credits === 0 && plan.lines.length === 0 ? (
              <p className={styles.done}>Tout est prêt : rien à réunir pour ce build.</p>
            ) : (
              <>
                <div className={styles.credits}>
                  {credit?.icon ? <img src={credit.icon} alt="" width={48} height={48} /> : null}
                  <span>
                    <strong>{formatFlat(plan.credits)}</strong>
                    <span className={styles.hint}>{credit?.name.fr ?? 'Crédits coquille'}</span>
                  </span>
                </div>
                <ul className={styles.items} aria-label="Matériaux à réunir">
                  {plan.lines.map((line) => (
                    <li
                      key={line.item?.id ?? line.slot}
                      className={styles.item}
                      data-rarity={line.item?.rarity ?? undefined}
                    >
                      {line.item?.icon ? (
                        <img src={line.item.icon} alt="" width={56} height={56} loading="lazy" />
                      ) : (
                        <span className={styles.unknownIcon} aria-hidden="true">
                          ?
                        </span>
                      )}
                      <span className={styles.itemName}>
                        {line.item?.name.fr ?? 'Matériau inconnu (absent du wiki)'}
                      </span>
                      <strong className={styles.qty}>×{formatFlat(line.qty)}</strong>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className={styles.hint}>
              Non inclus : l’expérience (potions de Résonateur et cœurs d’énergie d’arme). Coûts
              d’après le wiki Wuthering Waves.
            </p>
          </Card>
        </div>
      </div>
    </Page>
  );
}

export function PlannerPage() {
  return (
    <BuildLoader>
      {(build, resonator) => <Planner build={build} resonator={resonator} />}
    </BuildLoader>
  );
}
