import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useBuilds } from '@/app/services';
import type { Resonator } from '@/data/schema';
import type { Build } from '@/domain/build';
import { elementIcon, weaponTypeIcon } from '@/features/game/assets';
import {
  ELEMENT_LABEL,
  WEAPON_TYPE_LABEL,
  elementColor,
  elementTint,
} from '@/features/game/labels';
import { Button } from '@/ui/Button';
import { IconTrash } from '@/ui/icons';
import { Pill } from '@/ui/Pill';
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

  const commitName = () => {
    const name = draftName.trim().slice(0, 80) || resonator.name.fr;
    setEditingName(false);
    if (name !== build.name) void update(build.id, (b) => ({ ...b, name }));
  };

  return (
    <div className={styles.page}>
      <section
        className={styles.hero}
        aria-label="Résonateur"
        style={{
          background: `radial-gradient(ellipse at 75% 30%, ${elementTint(resonator.element, 0.42)}, ${elementTint(resonator.element, 0.08)} 55%, var(--bg-card) 100%)`,
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
        </div>
      </section>

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
