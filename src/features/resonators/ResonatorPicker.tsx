import { useMemo, useState } from 'react';
import { resonators, sonatas } from '@/data/game';
import type { Resonator } from '@/data/schema';
import { ELEMENTS, WEAPON_TYPES } from '@/domain/types';
import type { Element, WeaponType } from '@/domain/types';
import { elementIcon, weaponTypeIcon } from '@/features/game/assets';
import {
  ELEMENT_LABEL,
  WEAPON_TYPE_LABEL,
  elementColor,
  elementTint,
} from '@/features/game/labels';
import { Button } from '@/ui/Button';
import { GroupedList, ListRow } from '@/ui/GroupedList';
import { Pill } from '@/ui/Pill';
import { SearchField } from '@/ui/SearchField';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { filterResonators } from './filter';
import styles from './ResonatorPicker.module.css';

/** Ensemble « Bonus DGT d'attribut » conseillé par défaut pour chaque attribut. */
const ELEMENT_SET: Record<Element, string> = {
  aero: 'sierra-gale',
  electro: 'void-thunder',
  fusion: 'molten-rift',
  glacio: 'freezing-frost',
  havoc: 'havoc-eclipse',
  spectro: 'celestial-light',
};

interface Props {
  initialId?: string;
  confirmLabel: (resonator: Resonator) => string;
  onConfirm: (resonator: Resonator) => void;
}

export function ResonatorPicker({ initialId, confirmLabel, onConfirm }: Props) {
  const [query, setQuery] = useState('');
  const [element, setElement] = useState<Element | null>(null);
  const [weaponType, setWeaponType] = useState<WeaponType | 'all'>('all');
  const [selectedId, setSelectedId] = useState(initialId ?? 'jiyan');

  const list = useMemo(
    () =>
      filterResonators(resonators, {
        query,
        element,
        weaponType: weaponType === 'all' ? null : weaponType,
      }),
    [query, element, weaponType],
  );
  const selected = resonators.find((r) => r.id === selectedId) ?? list[0] ?? resonators[0];
  const set = selected ? sonatas.find((s) => s.id === ELEMENT_SET[selected.element]) : undefined;

  return (
    <div className={styles.layout}>
      <div className={styles.picker}>
        <SearchField
          label="Rechercher un Résonateur"
          value={query}
          onChange={setQuery}
          size="large"
        />

        <div role="group" aria-label="Filtrer par attribut" className={styles.chips}>
          <button
            type="button"
            className={styles.chip}
            aria-pressed={element === null}
            onClick={() => {
              setElement(null);
            }}
          >
            <span className={styles.dot} aria-hidden="true" />
            Tous
          </button>
          {ELEMENTS.map((el) => (
            <button
              key={el}
              type="button"
              className={styles.chip}
              aria-pressed={element === el}
              onClick={() => {
                setElement(element === el ? null : el);
              }}
            >
              <img src={elementIcon(el)} alt="" width={22} height={22} />
              {ELEMENT_LABEL[el]}
            </button>
          ))}
        </div>

        <SegmentedControl
          label="Filtrer par type d’arme"
          value={weaponType}
          onChange={setWeaponType}
          options={[
            { value: 'all', label: 'Toutes' },
            ...WEAPON_TYPES.map((type) => ({
              value: type,
              label: (
                <>
                  <img
                    src={weaponTypeIcon(type)}
                    alt=""
                    width={18}
                    height={18}
                    className={styles.weaponIcon}
                  />
                  {WEAPON_TYPE_LABEL[type]}
                </>
              ),
              ariaLabel: WEAPON_TYPE_LABEL[type],
            })),
          ]}
        />

        <p className={styles.count} aria-live="polite">
          {list.length} Résonateur{list.length > 1 ? 's' : ''}
        </p>

        {list.length === 0 ? (
          <div className={styles.empty}>
            <strong>Aucun Résonateur</strong>
            <span>Essayez un autre filtre ou une autre recherche.</span>
          </div>
        ) : (
          <ul className={styles.grid} aria-label="Résonateurs">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={styles.card}
                  aria-pressed={r.id === selected?.id}
                  onClick={() => {
                    setSelectedId(r.id);
                  }}
                >
                  <span
                    className={styles.portrait}
                    style={{ background: elementTint(r.element, 0.22) }}
                  >
                    {r.icon ? (
                      <img src={r.icon} alt="" className={styles.portraitImg} loading="lazy" />
                    ) : null}
                    <img src={elementIcon(r.element)} alt="" className={styles.portraitElement} />
                    <span
                      className={styles.rarityBar}
                      style={{ background: r.rarity === 5 ? 'var(--rarity-5)' : 'var(--rarity-4)' }}
                    />
                  </span>
                  <span className={styles.cardName}>{r.name.fr}</span>
                  <span className={styles.cardMeta}>
                    {WEAPON_TYPE_LABEL[r.weaponType]} · {r.rarity}★
                    <span className="visually-hidden">, {ELEMENT_LABEL[r.element]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected ? (
        <aside className={styles.inspector} aria-label={`Aperçu : ${selected.name.fr}`}>
          <div
            className={styles.stage}
            style={{
              background: `radial-gradient(ellipse at 50% 35%, ${elementTint(selected.element, 0.4)}, ${elementTint(selected.element, 0.06)} 60%, var(--bg-card) 100%)`,
            }}
          >
            <img src={elementIcon(selected.element)} alt="" className={styles.watermark} />
            {selected.sprite ? (
              <img
                src={selected.sprite}
                alt={`${selected.name.fr}, illustration`}
                className={styles.sprite}
              />
            ) : null}
            <div className={styles.stageFade} />
            <div className={styles.stageText}>
              <h2 className={styles.selectedName}>{selected.name.fr}</h2>
              <div className={styles.pills}>
                <Pill
                  variant="media"
                  tone={elementColor(selected.element)}
                  icon={<img src={elementIcon(selected.element)} alt="" width={22} height={22} />}
                >
                  {ELEMENT_LABEL[selected.element]}
                </Pill>
                <Pill
                  variant="media"
                  tone="#ffffff"
                  icon={
                    <img src={weaponTypeIcon(selected.weaponType)} alt="" width={22} height={22} />
                  }
                >
                  {WEAPON_TYPE_LABEL[selected.weaponType]}
                </Pill>
                <Pill
                  variant="media"
                  tone={selected.rarity === 5 ? 'var(--rarity-5)' : 'var(--rarity-4)'}
                >
                  {'★'.repeat(selected.rarity)}
                </Pill>
              </div>
            </div>
          </div>
          <div className={styles.inspectorBody}>
            {set ? (
              <GroupedList>
                <ListRow
                  label="Ensemble d’attribut"
                  trailing={
                    <>
                      {set.icon ? <img src={set.icon} alt="" width={24} height={24} /> : null}
                      <span style={{ color: elementColor(selected.element), fontWeight: 600 }}>
                        {set.name.fr}
                      </span>
                    </>
                  }
                />
                <ListRow
                  label="Stat principale 3 coûts"
                  trailing={`Bonus DGT ${ELEMENT_LABEL[selected.element]}`}
                />
              </GroupedList>
            ) : null}
            <Button
              variant="filled"
              size="large"
              block
              onClick={() => {
                onConfirm(selected);
              }}
            >
              {confirmLabel(selected)}
            </Button>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
