import { useState } from 'react';
import type { FinalStats } from '@/domain/stats';
import { ATTACK_TYPES, ELEMENTS } from '@/domain/types';
import type { Element, StatKey } from '@/domain/types';
import { statIcon } from '@/features/game/assets';
import { STAT_LABEL } from '@/features/game/labels';
import { formatFlat, formatPercent } from '@/lib/format';
import { Card } from '@/ui/Card';
import { SegmentedControl } from '@/ui/SegmentedControl';
import styles from './StatsCard.module.css';

/** Icônes déjà colorées (bonus d'attribut) : pas d'inversion en thème clair. */
const COLORED_ICONS = new Set<StatKey>(ELEMENTS.map((e) => `${e}Dmg` as const));

interface Row {
  key: StatKey;
  value: number;
  base: number;
  flat: boolean;
}

function rows(stats: FinalStats, element: Element): Row[] {
  const list: Row[] = [
    { key: 'hp', value: stats.hp, base: stats.baseHp, flat: true },
    { key: 'atk', value: stats.atk, base: stats.baseAtk, flat: true },
    { key: 'def', value: stats.def, base: stats.baseDef, flat: true },
    { key: 'energyRegen', value: stats.energyRegen, base: 100, flat: false },
    { key: 'critRate', value: stats.critRate, base: 5, flat: false },
    { key: 'critDmg', value: stats.critDmg, base: 150, flat: false },
    { key: `${element}Dmg`, value: stats.dmgBonus[element], base: 0, flat: false },
  ];
  for (const type of ATTACK_TYPES) {
    if (stats.dmgBonus[type] > 0)
      list.push({ key: `${type}Dmg`, value: stats.dmgBonus[type], base: 0, flat: false });
  }
  if (stats.amplify > 0) list.push({ key: 'amplify', value: stats.amplify, base: 0, flat: false });
  if (stats.healingBonus > 0)
    list.push({ key: 'healingBonus', value: stats.healingBonus, base: 0, flat: false });
  return list;
}

interface Props {
  stats: FinalStats;
  /** Stats sans Échos ni bonus (personnage + arme). */
  baseline: FinalStats;
  element: Element;
}

export function StatsCard({ stats, baseline, element }: Props) {
  const [mode, setMode] = useState<'base' | 'final'>('final');
  const shown = mode === 'final' ? stats : baseline;
  return (
    <Card heading="Statistiques">
      <SegmentedControl
        label="Affichage des statistiques"
        value={mode}
        onChange={setMode}
        stretch
        options={[
          { value: 'base', label: 'Base' },
          { value: 'final', label: 'Finales' },
        ]}
      />
      <dl className={styles.list}>
        {rows(shown, element).map((row, i) => {
          const baselineRow = rows(baseline, element)[i];
          const delta = mode === 'final' && baselineRow ? row.value - baselineRow.value : 0;
          const format = row.flat ? formatFlat : formatPercent;
          return (
            <div key={row.key} className={styles.row}>
              <dt className={styles.label}>
                <img
                  src={statIcon(row.key)}
                  alt=""
                  width={20}
                  height={20}
                  className={`${styles.icon ?? ''} ${COLORED_ICONS.has(row.key) ? '' : 'game-glyph'}`}
                />
                {STAT_LABEL[row.key]}
              </dt>
              <dd className={styles.value}>
                {delta > 0.05 ? (
                  <span className={styles.delta}>
                    {row.flat
                      ? formatFlat(delta, { signed: true })
                      : formatPercent(delta, { signed: true })}
                  </span>
                ) : null}
                {format(row.value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
}
