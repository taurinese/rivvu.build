import { useRef, useState } from 'react';
import { useBuilds, useInventory } from '@/app/services';
import { echoById, sonataById, sonatas } from '@/data/game';
import type { Echo, Resonator } from '@/data/schema';
import type { Build } from '@/domain/build';
import {
  MAIN_STAT_VALUES,
  MAX_COST,
  MAX_ECHOES,
  MAX_SUBSTATS,
  SECONDARY_MAIN_STAT,
  SUBSTAT_TIERS,
  critValue,
  echoStatBlock,
  validateLoadout,
} from '@/domain/echoes';
import type { EchoInstance } from '@/domain/echoes';
import { sumStatBlocks } from '@/domain/stats';
import type { StatKey } from '@/domain/types';
import { BuildLoader } from '@/features/builds/BuildLoader';
import { statIcon } from '@/features/game/assets';
import { STAT_LABEL, elementColor, isPercentStat } from '@/features/game/labels';
import { formatFlat, formatPercent } from '@/lib/format';
import { BackLink } from '@/ui/BackLink';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { GroupedList, ListRow } from '@/ui/GroupedList';
import { IconImage, IconPlus, IconTrash, IconWarning } from '@/ui/icons';
import { Page } from '@/ui/Page';
import { Pill } from '@/ui/Pill';
import { Sheet } from '@/ui/Sheet';
import {
  activeSonatas,
  allowedMainStats,
  availableSubstats,
  newEchoInstance,
  remainingCost,
  setPrincipal,
  substatQuality,
} from './echo-editing';
import { ImportEchoSheet } from '@/features/ocr/ImportEchoSheet';
import { echoFromParsed } from '@/features/ocr/parse-echo';
import type { ParsedEcho } from '@/features/ocr/parse-echo';
import { EchoPickerSheet } from './EchoPickerSheet';
import styles from './EchoesPage.module.css';

const formatStat = (stat: StatKey, value: number) =>
  isPercentStat(stat) ? formatPercent(value) : formatFlat(value);

const ISSUE_LABEL: Record<string, string> = {
  'too-many-echoes': `Plus de ${String(MAX_ECHOES)} Échos équipés.`,
  'cost-exceeded': `Le coût total dépasse ${String(MAX_COST)}.`,
  'invalid-main-stat': 'Une stat principale est impossible pour ce coût.',
  'too-many-substats': `Plus de ${String(MAX_SUBSTATS)} sous-stats sur un Écho.`,
  'invalid-substat-value': 'Une valeur de sous-stat ne correspond à aucun palier du jeu.',
  'duplicate-substat': 'Une sous-stat apparaît deux fois sur le même Écho.',
};

type PickerMode =
  | { kind: 'add' }
  | { kind: 'replace'; uid: string }
  | { kind: 'inventory' }
  | { kind: 'import'; image: Blob }
  | { kind: 'import-pick'; parsed: ParsedEcho }
  | null;

function EchoesEditor({ build, resonator }: { build: Build; resonator: Resonator }) {
  const update = useBuilds((s) => s.update);
  const inventory = useInventory((s) => s.echoes);
  const saveToInventory = useInventory((s) => s.save);
  const [selectedUid, setSelectedUid] = useState(build.echoes[0]?.uid ?? null);
  const [picker, setPicker] = useState<PickerMode>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadout = build.echoes;
  const selected = loadout.find((e) => e.uid === selectedUid) ?? loadout[0] ?? null;
  const cost = loadout.reduce((sum, e) => sum + e.cost, 0);
  const issues = validateLoadout(loadout);
  const contribution = sumStatBlocks(loadout.map(echoStatBlock));
  const sets = activeSonatas(loadout, sonatas);
  const mainSonata = sets[0]?.id;

  const setLoadout = (next: EchoInstance[]) =>
    void update(build.id, (b) => ({ ...b, echoes: next }));
  const patch = (uid: string, changes: Partial<EchoInstance>) => {
    setLoadout(loadout.map((e) => (e.uid === uid ? { ...e, ...changes } : e)));
  };

  const addSpecies = (species: Echo) => {
    const echo = newEchoInstance(species, crypto.randomUUID(), resonator.element, mainSonata);
    setLoadout([...loadout, echo]);
    setSelectedUid(echo.uid);
    setPicker(null);
  };

  const replaceSpecies = (uid: string, species: Echo) => {
    const fresh = newEchoInstance(species, uid, resonator.element, mainSonata);
    setLoadout(loadout.map((e) => (e.uid === uid ? fresh : e)));
    setPicker(null);
  };

  const addParsed = (parsed: ParsedEcho, species: Echo) => {
    const echo = echoFromParsed(
      parsed,
      species,
      crypto.randomUUID(),
      resonator.element,
      mainSonata,
    );
    setLoadout([...loadout, echo]);
    setSelectedUid(echo.uid);
    setPicker(null);
  };

  const inInventory = (uid: string) => inventory.find((e) => e.uid === uid);
  const canAdd = loadout.length < MAX_ECHOES && remainingCost(loadout) >= 1;

  return (
    <Page
      width="wide"
      eyebrow={<BackLink to={`/builds/${build.id}`} label={resonator.name.fr} />}
      title="Échos"
      subtitle="Le premier Écho est l’Écho principal : c’est sa compétence que vous utilisez en combat."
      actions={
        <div
          className={styles.costMeter}
          aria-label={`Coût total ${String(cost)} sur ${String(MAX_COST)}`}
          role="img"
        >
          <span className={styles.costText}>
            Coût <strong>{cost}</strong> / {MAX_COST}
          </span>
          <span className={styles.costCells} aria-hidden="true">
            {Array.from({ length: MAX_COST }, (_, i) => (
              <span
                key={i}
                className={i < cost ? styles.costOn : styles.costOff}
                style={i < cost ? { background: elementColor(resonator.element) } : undefined}
              />
            ))}
          </span>
        </div>
      }
    >
      {issues.length > 0 ? (
        <div className={styles.issues} role="alert">
          <IconWarning size={18} />
          <ul>
            {[...new Set(issues.map((i) => i.code))].map((code) => (
              <li key={code}>{ISSUE_LABEL[code]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.slots}>
          <ul className={styles.slotList} aria-label="Emplacements d’Échos">
            {loadout.map((echo, index) => {
              const data = echoById.get(echo.echoId);
              const set = sonataById.get(echo.sonata);
              return (
                <li key={echo.uid}>
                  <button
                    type="button"
                    className={styles.slot}
                    aria-pressed={echo.uid === selected?.uid}
                    onClick={() => {
                      setSelectedUid(echo.uid);
                    }}
                  >
                    <span className={styles.slotIcon}>
                      {data?.icon ? <img src={data.icon} alt="" width={52} height={52} /> : null}
                      {set?.icon ? (
                        <img
                          src={set.icon}
                          alt=""
                          width={20}
                          height={20}
                          className={styles.slotSet}
                        />
                      ) : null}
                    </span>
                    <span className={styles.slotText}>
                      <span className={styles.slotName}>
                        {data?.name.fr ?? echo.echoId}
                        {index === 0 ? <span className={styles.principal}>Principal</span> : null}
                      </span>
                      <span className={styles.slotMeta}>
                        {STAT_LABEL[echo.mainStat]}{' '}
                        {formatStat(echo.mainStat, MAIN_STAT_VALUES[echo.cost][echo.mainStat] ?? 0)}
                      </span>
                    </span>
                    <span className={styles.slotSide}>
                      <Pill variant="badge">C{echo.cost}</Pill>
                      <span className={styles.slotMeta}>
                        CV {critValue(echo).toFixed(1).replace('.', ',')}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {canAdd ? (
            <div className={styles.addRow}>
              <Button
                variant="tinted"
                block
                icon={<IconPlus size={16} />}
                onClick={() => {
                  setPicker({ kind: 'add' });
                }}
              >
                Ajouter un Écho
              </Button>
              <Button
                variant="gray"
                block
                disabled={inventory.length === 0}
                onClick={() => {
                  setPicker({ kind: 'inventory' });
                }}
              >
                Depuis l’inventaire
              </Button>
              <Button
                variant="gray"
                block
                icon={<IconImage size={16} />}
                onClick={() => {
                  fileInput.current?.click();
                }}
              >
                Importer une capture
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="visually-hidden"
                aria-label="Capture d’un Écho"
                tabIndex={-1}
                onChange={(event) => {
                  const image = event.target.files?.[0];
                  event.target.value = '';
                  if (image) setPicker({ kind: 'import', image });
                }}
              />
            </div>
          ) : null}
        </div>

        <div className={styles.detail}>
          {selected ? (
            <EchoDetail
              key={selected.uid}
              echo={selected}
              isPrincipal={loadout[0]?.uid === selected.uid}
              savedInInventory={inInventory(selected.uid) !== undefined}
              onChange={(changes) => {
                patch(selected.uid, changes);
              }}
              onReplace={() => {
                setPicker({ kind: 'replace', uid: selected.uid });
              }}
              onRemove={() => {
                const next = loadout.filter((e) => e.uid !== selected.uid);
                setLoadout(next);
                setSelectedUid(next[0]?.uid ?? null);
              }}
              onMakePrincipal={() => {
                setLoadout(setPrincipal(loadout, selected.uid));
              }}
              onSaveToInventory={() => {
                void saveToInventory(selected);
              }}
            />
          ) : (
            <Card>
              <p className={styles.empty}>
                Aucun Écho pour l’instant. Ajoutez votre Écho principal (souvent un Écho de coût 4),
                puis complétez jusqu’à un coût de 12.
              </p>
            </Card>
          )}
        </div>

        <div className={styles.rail}>
          <Card heading="Ensembles">
            {sets.length === 0 ? <p className={styles.empty}>Aucun ensemble.</p> : null}
            {sets.map((set) => {
              const data = sonataById.get(set.id);
              return (
                <div key={set.id} className={styles.set}>
                  <div className={styles.setHeader}>
                    {data?.icon ? <img src={data.icon} alt="" width={36} height={36} /> : null}
                    <span className={styles.setName}>{data?.name.fr ?? set.id}</span>
                    <Pill variant="badge">{set.pieces} p.</Pill>
                  </div>
                  <ul className={styles.effects}>
                    {set.effects.map((effect) => (
                      <li
                        key={effect.pieces}
                        className={effect.active ? styles.effectOn : styles.effectOff}
                      >
                        <span className={styles.effectPieces}>{effect.pieces} p.</span>
                        <span lang="en">{effect.text}</span>
                        <span className="visually-hidden">
                          {effect.active ? ' (actif)' : ' (inactif)'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </Card>
          <Card heading="Apport des Échos">
            <dl className={styles.contribution}>
              {(Object.entries(contribution) as [StatKey, number][])
                .filter(([, v]) => v > 0)
                .map(([stat, value]) => (
                  <div key={stat} className={styles.contributionRow}>
                    <dt>
                      <img
                        src={statIcon(stat)}
                        alt=""
                        width={18}
                        height={18}
                        className="game-glyph"
                      />
                      {STAT_LABEL[stat]}
                    </dt>
                    <dd>+{formatStat(stat, value)}</dd>
                  </div>
                ))}
            </dl>
          </Card>
        </div>
      </div>

      {picker?.kind === 'add' || picker?.kind === 'replace' ? (
        <EchoPickerSheet
          title={picker.kind === 'add' ? 'Ajouter un Écho' : 'Changer d’Écho'}
          maxCost={Math.min(
            4,
            remainingCost(loadout, picker.kind === 'replace' ? picker.uid : undefined),
          )}
          {...(mainSonata ? { preferredSonata: mainSonata } : {})}
          onPick={(species) => {
            if (picker.kind === 'replace') replaceSpecies(picker.uid, species);
            else addSpecies(species);
          }}
          onClose={() => {
            setPicker(null);
          }}
        />
      ) : null}

      {picker?.kind === 'import' ? (
        <ImportEchoSheet
          image={picker.image}
          maxCost={remainingCost(loadout)}
          onAdd={(parsed) => {
            const species = parsed.echoId ? echoById.get(parsed.echoId) : undefined;
            if (species) addParsed(parsed, species);
          }}
          onChooseSpecies={(parsed) => {
            setPicker({ kind: 'import-pick', parsed });
          }}
          onClose={() => {
            setPicker(null);
          }}
        />
      ) : null}

      {picker?.kind === 'import-pick' ? (
        <EchoPickerSheet
          title="Choisir l’Écho de la capture"
          maxCost={Math.min(4, remainingCost(loadout))}
          {...(mainSonata ? { preferredSonata: mainSonata } : {})}
          onPick={(species) => {
            addParsed(picker.parsed, species);
          }}
          onClose={() => {
            setPicker(null);
          }}
        />
      ) : null}

      {picker?.kind === 'inventory' ? (
        <Sheet
          title="Depuis l’inventaire"
          onClose={() => {
            setPicker(null);
          }}
        >
          <ul className={styles.inventoryList} aria-label="Échos de l’inventaire">
            {inventory.map((item) => {
              const data = echoById.get(item.echoId);
              const equipped = loadout.some((e) => e.uid === item.uid);
              const fits = item.cost <= remainingCost(loadout);
              return (
                <li key={item.uid}>
                  <button
                    type="button"
                    className={styles.inventoryItem}
                    disabled={equipped || !fits}
                    onClick={() => {
                      const { uid, echoId, cost: c, sonata, mainStat, substats } = item;
                      setLoadout([
                        ...loadout,
                        { uid, echoId, cost: c, sonata, mainStat, substats },
                      ]);
                      setSelectedUid(uid);
                      setPicker(null);
                    }}
                  >
                    {data?.icon ? <img src={data.icon} alt="" width={44} height={44} /> : null}
                    <span className={styles.slotText}>
                      <span className={styles.slotName}>{data?.name.fr ?? item.echoId}</span>
                      <span className={styles.slotMeta}>
                        {STAT_LABEL[item.mainStat]} · CV{' '}
                        {critValue(item).toFixed(1).replace('.', ',')}
                        {equipped ? ' · déjà équipé ici' : !fits ? ' · coût trop élevé' : ''}
                      </span>
                    </span>
                    <Pill variant="badge">C{item.cost}</Pill>
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      ) : null}
    </Page>
  );
}

interface DetailProps {
  echo: EchoInstance;
  isPrincipal: boolean;
  savedInInventory: boolean;
  onChange: (changes: Partial<EchoInstance>) => void;
  onReplace: () => void;
  onRemove: () => void;
  onMakePrincipal: () => void;
  onSaveToInventory: () => void;
}

function EchoDetail({
  echo,
  isPrincipal,
  savedInInventory,
  onChange,
  onReplace,
  onRemove,
  onMakePrincipal,
  onSaveToInventory,
}: DetailProps) {
  const data = echoById.get(echo.echoId);
  const secondary = SECONDARY_MAIN_STAT[echo.cost];
  const setSubstats = (substats: EchoInstance['substats']) => {
    onChange({ substats });
  };

  return (
    <Card padded={false} className={styles.detailCard}>
      <div className={styles.detailHeader}>
        <span className={styles.detailIcon}>
          {data?.icon ? <img src={data.icon} alt="" width={104} height={104} /> : null}
        </span>
        <div className={styles.detailTitle}>
          <h2>{data?.name.fr ?? echo.echoId}</h2>
          <span className={styles.slotMeta}>
            Coût {echo.cost} · {isPrincipal ? 'Écho principal' : 'Écho secondaire'}
          </span>
          <div className={styles.detailActions}>
            <Button size="small" variant="tinted" onClick={onReplace}>
              Changer d’Écho
            </Button>
            {!isPrincipal ? (
              <Button size="small" variant="gray" onClick={onMakePrincipal}>
                Définir comme principal
              </Button>
            ) : null}
            <Button size="small" variant="gray" onClick={onSaveToInventory}>
              {savedInInventory ? 'Mettre à jour l’inventaire' : 'Enregistrer dans l’inventaire'}
            </Button>
            <Button
              size="small"
              variant="destructive"
              icon={<IconTrash size={14} />}
              onClick={onRemove}
            >
              Retirer
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.detailBody}>
        {data && data.sonatas.length > 0 ? (
          <fieldset className={styles.fieldset}>
            <legend>Ensemble de sonate</legend>
            <div className={styles.choices}>
              {data.sonatas.map((id) => {
                const set = sonataById.get(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={styles.choice}
                    aria-pressed={echo.sonata === id}
                    onClick={() => {
                      onChange({ sonata: id });
                    }}
                  >
                    {set?.icon ? <img src={set.icon} alt="" width={24} height={24} /> : null}
                    {set?.name.fr ?? id}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <GroupedList>
          <ListRow
            leading={
              <img
                src={statIcon(echo.mainStat)}
                alt=""
                width={22}
                height={22}
                className="game-glyph"
              />
            }
            label={
              <label className={styles.inlineSelect}>
                Stat principale
                <select
                  value={echo.mainStat}
                  onChange={(event) => {
                    onChange({ mainStat: event.target.value as StatKey });
                  }}
                >
                  {allowedMainStats(echo.cost).map((stat) => (
                    <option key={stat} value={stat}>
                      {STAT_LABEL[stat]}
                    </option>
                  ))}
                </select>
              </label>
            }
            trailing={
              <strong>
                {formatStat(echo.mainStat, MAIN_STAT_VALUES[echo.cost][echo.mainStat] ?? 0)}
              </strong>
            }
          />
          <ListRow
            leading={
              <img
                src={statIcon(secondary.stat)}
                alt=""
                width={22}
                height={22}
                className="game-glyph"
              />
            }
            label="Stat secondaire (fixe)"
            muted
            trailing={`${STAT_LABEL[secondary.stat]} ${formatStat(secondary.stat, secondary.value)}`}
          />
        </GroupedList>

        <div className={styles.substatsHeader}>
          <h3>Sous-statistiques</h3>
          <span className={styles.slotMeta}>
            {echo.substats.length} / {MAX_SUBSTATS} · Valeur crit.{' '}
            {critValue(echo).toFixed(1).replace('.', ',')}
          </span>
        </div>
        <ul className={styles.substats} aria-label="Sous-statistiques">
          {echo.substats.map((substat, index) => {
            const tiers = SUBSTAT_TIERS[substat.stat] ?? [];
            return (
              <li key={substat.stat} className={styles.substat}>
                <div className={styles.substatTop}>
                  <img
                    src={statIcon(substat.stat)}
                    alt=""
                    width={20}
                    height={20}
                    className="game-glyph"
                  />
                  <label className={styles.inlineSelect}>
                    <span className="visually-hidden">Sous-stat {index + 1}</span>
                    <select
                      value={substat.stat}
                      onChange={(event) => {
                        const stat = event.target.value as StatKey;
                        const first = SUBSTAT_TIERS[stat]?.[0] ?? 0;
                        setSubstats(
                          echo.substats.map((s, i) => (i === index ? { stat, value: first } : s)),
                        );
                      }}
                    >
                      {availableSubstats(echo, substat.stat).map((stat) => (
                        <option key={stat} value={stat}>
                          {STAT_LABEL[stat]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className={styles.quality} aria-hidden="true">
                    <span style={{ width: `${String(substatQuality(substat) * 100)}%` }} />
                  </span>
                  <button
                    type="button"
                    className={styles.removeSubstat}
                    aria-label={`Retirer ${STAT_LABEL[substat.stat]}`}
                    onClick={() => {
                      setSubstats(echo.substats.filter((_, i) => i !== index));
                    }}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
                <div
                  role="radiogroup"
                  aria-label={`Valeur de ${STAT_LABEL[substat.stat]}`}
                  className={styles.tiers}
                >
                  {tiers.map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      role="radio"
                      aria-checked={Math.abs(tier - substat.value) < 1e-6}
                      className={styles.tier}
                      onClick={() => {
                        setSubstats(
                          echo.substats.map((s, i) => (i === index ? { ...s, value: tier } : s)),
                        );
                      }}
                    >
                      {isPercentStat(substat.stat) ? tier.toFixed(1).replace('.', ',') : tier}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        {echo.substats.length < MAX_SUBSTATS ? (
          <Button
            variant="tinted"
            icon={<IconPlus size={16} />}
            onClick={() => {
              const stat = availableSubstats(echo)[0];
              if (stat)
                setSubstats([...echo.substats, { stat, value: SUBSTAT_TIERS[stat]?.[0] ?? 0 }]);
            }}
          >
            Ajouter une sous-stat
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function EchoesPage() {
  return (
    <BuildLoader>
      {(build, resonator) => <EchoesEditor build={build} resonator={resonator} />}
    </BuildLoader>
  );
}
