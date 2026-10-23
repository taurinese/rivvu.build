import { useMemo, useState } from 'react';
import { echoes, sonataById, sonatas } from '@/data/game';
import type { Echo } from '@/data/schema';
import { SearchField } from '@/ui/SearchField';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Sheet } from '@/ui/Sheet';
import { filterEchoes } from './filter-echoes';
import styles from './EchoPickerSheet.module.css';

interface Props {
  title: string;
  /** Coût encore disponible pour cet emplacement. */
  maxCost: number;
  /** Ensemble mis en avant (celui de l'équipement actuel). */
  preferredSonata?: string;
  onPick: (echo: Echo) => void;
  onClose: () => void;
}

type CostFilter = 'all' | '4' | '3' | '1';

export function EchoPickerSheet({ title, maxCost, preferredSonata, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [cost, setCost] = useState<CostFilter>('all');
  const [sonata, setSonata] = useState(preferredSonata ?? '');

  const list = useMemo(
    () =>
      filterEchoes(echoes, {
        query,
        cost: cost === 'all' ? null : Number(cost),
        sonata: sonata || null,
        maxCost,
      }),
    [query, cost, sonata, maxCost],
  );

  return (
    <Sheet title={title} onClose={onClose}>
      <SearchField label="Rechercher un Écho" value={query} onChange={setQuery} size="large" />
      <div className={styles.filters}>
        <SegmentedControl<CostFilter>
          label="Filtrer par coût"
          value={cost}
          onChange={setCost}
          options={[
            { value: 'all', label: 'Tous' },
            { value: '4', label: 'Coût 4' },
            { value: '3', label: 'Coût 3' },
            { value: '1', label: 'Coût 1' },
          ]}
        />
        <label className={styles.select}>
          <span className="visually-hidden">Filtrer par ensemble</span>
          <select
            value={sonata}
            onChange={(event) => {
              setSonata(event.target.value);
            }}
          >
            <option value="">Tous les ensembles</option>
            {sonatas
              .slice()
              .sort((a, b) => a.name.fr.localeCompare(b.name.fr, 'fr'))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name.fr}
                </option>
              ))}
          </select>
        </label>
      </div>
      <p className={styles.count} aria-live="polite">
        {list.length} Écho{list.length > 1 ? 's' : ''}
        {maxCost < 4 ? ` · coût restant ${String(maxCost)}` : ''}
      </p>
      <ul className={styles.grid} aria-label="Échos disponibles">
        {list.map((echo) => (
          <li key={echo.id}>
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                onPick(echo);
              }}
            >
              <span className={styles.icon}>
                {echo.icon ? (
                  <img src={echo.icon} alt="" width={64} height={64} loading="lazy" />
                ) : null}
                <span className={styles.cost}>C{echo.cost}</span>
              </span>
              <span className={styles.name}>{echo.name.fr}</span>
              <span
                className={styles.sets}
                aria-label={echo.sonatas.map((id) => sonataById.get(id)?.name.fr ?? id).join(', ')}
              >
                {echo.sonatas.map((id) => {
                  const s = sonataById.get(id);
                  return s?.icon ? (
                    <img key={id} src={s.icon} alt="" width={18} height={18} />
                  ) : null;
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
