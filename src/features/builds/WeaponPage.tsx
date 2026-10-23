import { useBuilds } from '@/app/services';
import { curves, weaponById, weapons } from '@/data/game';
import type { Resonator, Weapon } from '@/data/schema';
import { weaponStats } from '@/domain/base-stats';
import { MAX_WEAPON_RANK } from '@/domain/build';
import type { Build } from '@/domain/build';
import { MAX_LEVEL_STEP, stepAfter, stepBefore, stepLabel } from '@/domain/levels';
import { formatPassive } from '@/domain/weapon-passive';
import { STAT_LABEL, WEAPON_TYPE_LABEL } from '@/features/game/labels';
import { formatFlat, formatPercent } from '@/lib/format';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { IconCheck } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Stepper } from '@/ui/Stepper';
import { BuildLoader } from './BuildLoader';
import styles from './WeaponPage.module.css';

function summary(weapon: Weapon) {
  const at90 = weaponStats(weapon, MAX_LEVEL_STEP, curves);
  return `ATQ ${formatFlat(at90.atk)} · ${STAT_LABEL[at90.secondary.stat]} ${formatPercent(at90.secondary.value)}`;
}

function WeaponEditor({ build, resonator }: { build: Build; resonator: Resonator }) {
  const update = useBuilds((s) => s.update);
  const change = (updater: (b: Build) => Build) => void update(build.id, updater);
  const current = build.weapon ? weaponById.get(build.weapon.id) : undefined;
  const candidates = weapons
    .filter((w) => w.type === resonator.weaponType)
    .slice()
    .sort((a, b) => b.rarity - a.rarity || a.name.fr.localeCompare(b.name.fr, 'fr'));

  return (
    <Page
      eyebrow={<BackLink to={`/builds/${build.id}`} label={resonator.name.fr} />}
      title="Arme"
      subtitle={`${String(candidates.length)} armes de type ${WEAPON_TYPE_LABEL[resonator.weaponType]}`}
    >
      {current && build.weapon ? (
        <Card heading="Arme équipée">
          <div className={styles.current}>
            <span className={styles.currentIcon}>
              {current.icon ? <img src={current.icon} alt="" width={72} height={72} /> : null}
            </span>
            <div className={styles.currentText}>
              <span className={styles.currentName}>{current.name.fr}</span>
              <span className={styles.meta}>
                {(() => {
                  const s = weaponStats(current, build.weapon.level, curves);
                  return `ATQ ${formatFlat(s.atk)} · ${STAT_LABEL[s.secondary.stat]} ${formatPercent(s.secondary.value)}`;
                })()}
              </span>
            </div>
          </div>
          <div className={styles.controls}>
            <div className={styles.control}>
              <span>Niveau</span>
              <Stepper
                label="Niveau de l’arme"
                valueText={stepLabel(build.weapon.level)}
                canDecrement={stepBefore(build.weapon.level) !== null}
                canIncrement={stepAfter(build.weapon.level) !== null}
                onDecrement={() => {
                  const step = build.weapon ? stepBefore(build.weapon.level) : null;
                  if (step)
                    change((b) => (b.weapon ? { ...b, weapon: { ...b.weapon, level: step } } : b));
                }}
                onIncrement={() => {
                  const step = build.weapon ? stepAfter(build.weapon.level) : null;
                  if (step)
                    change((b) => (b.weapon ? { ...b, weapon: { ...b.weapon, level: step } } : b));
                }}
              />
            </div>
            <div className={styles.control}>
              <span>Syntonisation</span>
              <SegmentedControl
                label="Rang de syntonisation"
                value={String(build.weapon.rank)}
                size="small"
                onChange={(value) => {
                  change((b) =>
                    b.weapon ? { ...b, weapon: { ...b.weapon, rank: Number(value) } } : b,
                  );
                }}
                options={Array.from({ length: MAX_WEAPON_RANK }, (_, i) => ({
                  value: String(i + 1),
                  label: `R${String(i + 1)}`,
                }))}
              />
            </div>
          </div>
          {current.passive ? (
            <div className={styles.passive}>
              {current.passive.name ? <strong>{current.passive.name}</strong> : null}
              <p lang="en">{formatPassive(current.passive, build.weapon.rank)}</p>
              <span className={styles.meta}>Description en anglais (source : wiki).</span>
            </div>
          ) : null}
          <div>
            <Button
              variant="destructive"
              size="small"
              onClick={() => {
                change((b) => ({ ...b, weapon: null }));
              }}
            >
              Retirer l’arme
            </Button>
          </div>
        </Card>
      ) : null}

      <ul className={styles.list} aria-label="Armes disponibles">
        {candidates.map((weapon) => {
          const selected = weapon.id === build.weapon?.id;
          return (
            <li key={weapon.id}>
              <button
                type="button"
                className={styles.item}
                aria-pressed={selected}
                onClick={() => {
                  change((b) => ({
                    ...b,
                    weapon: {
                      id: weapon.id,
                      level: b.weapon?.level ?? { ...MAX_LEVEL_STEP },
                      rank: 1,
                    },
                  }));
                }}
              >
                <span
                  className={styles.itemIcon}
                  style={{
                    borderColor:
                      weapon.rarity >= 5
                        ? 'var(--rarity-5)'
                        : weapon.rarity === 4
                          ? 'var(--rarity-4)'
                          : 'var(--separator)',
                  }}
                >
                  {weapon.icon ? (
                    <img src={weapon.icon} alt="" width={48} height={48} loading="lazy" />
                  ) : null}
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemName}>
                    {weapon.name.fr}
                    <span className={styles.stars} aria-label={`${String(weapon.rarity)} étoiles`}>
                      {' '}
                      {'★'.repeat(weapon.rarity)}
                    </span>
                  </span>
                  <span className={styles.meta}>Niv. 90 : {summary(weapon)}</span>
                </span>
                {selected ? <IconCheck className={styles.check} /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}

export function WeaponPage() {
  return (
    <BuildLoader>
      {(build, resonator) => <WeaponEditor build={build} resonator={resonator} />}
    </BuildLoader>
  );
}
