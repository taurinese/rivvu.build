import { useEffect, useState } from 'react';
import { echoById } from '@/data/game';
import { STAT_LABEL, isPercentStat } from '@/features/game/labels';
import { formatFlat, formatPercent } from '@/lib/format';
import { Button } from '@/ui/Button';
import { IconWarning } from '@/ui/icons';
import { Pill } from '@/ui/Pill';
import { Sheet } from '@/ui/Sheet';
import { parseEchoText } from './parse-echo';
import type { ParsedEcho } from './parse-echo';
import styles from './ImportEchoSheet.module.css';

interface Props {
  image: Blob;
  /** Coût encore disponible dans le build. */
  maxCost: number;
  /** Ajoute l'Écho lu (espèce reconnue). */
  onAdd: (parsed: ParsedEcho) => void;
  /** Espèce non reconnue : la choisir à la main en gardant les stats lues. */
  onChooseSpecies: (parsed: ParsedEcho) => void;
  onClose: () => void;
}

type State =
  | { status: 'reading'; progress: number }
  | { status: 'done'; parsed: ParsedEcho }
  | { status: 'error' };

/** Lit une capture d'Écho (OCR local) et montre ce qui a été compris avant de l'ajouter. */
export function ImportEchoSheet({ image, maxCost, onAdd, onChooseSpecies, onClose }: Props) {
  const [state, setState] = useState<State>({ status: 'reading', progress: 0 });

  useEffect(() => {
    let active = true;
    void import('./recognize')
      .then(({ recognizeImage }) =>
        recognizeImage(image, (progress) => {
          if (active) setState({ status: 'reading', progress });
        }),
      )
      .then((text) => {
        if (active) setState({ status: 'done', parsed: parseEchoText(text) });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [image]);

  return (
    <Sheet title="Importer une capture" onClose={onClose}>
      {state.status === 'reading' ? (
        <div className={styles.reading}>
          <label className={styles.label} htmlFor="ocr-progress">
            Lecture de la capture…
          </label>
          <progress id="ocr-progress" className={styles.progress} max={1} value={state.progress} />
          <p className={styles.hint}>
            La lecture se fait sur votre appareil : la capture n’est envoyée nulle part.
          </p>
        </div>
      ) : null}
      {state.status === 'error' ? (
        <p className={styles.hint} role="alert">
          Impossible de lire cette image. Essayez une capture plus nette du panneau de l’Écho.
        </p>
      ) : null}
      {state.status === 'done' ? (
        <Result
          parsed={state.parsed}
          maxCost={maxCost}
          onAdd={onAdd}
          onChooseSpecies={onChooseSpecies}
        />
      ) : null}
    </Sheet>
  );
}

function Result({
  parsed,
  maxCost,
  onAdd,
  onChooseSpecies,
}: {
  parsed: ParsedEcho;
  maxCost: number;
  onAdd: (parsed: ParsedEcho) => void;
  onChooseSpecies: (parsed: ParsedEcho) => void;
}) {
  const species = parsed.echoId ? echoById.get(parsed.echoId) : undefined;
  const tooExpensive = species !== undefined && species.cost > maxCost;
  return (
    <div className={styles.result}>
      <div className={styles.species}>
        {species?.icon ? <img src={species.icon} alt="" width={56} height={56} /> : null}
        <div>
          <p className={styles.name}>{species ? species.name.fr : 'Écho non reconnu'}</p>
          {parsed.cost ? <Pill variant="badge">C{parsed.cost}</Pill> : null}
        </div>
      </div>
      <dl className={styles.stats}>
        <div>
          <dt>Stat principale</dt>
          <dd>{parsed.mainStat ? STAT_LABEL[parsed.mainStat] : 'non lue'}</dd>
        </div>
        {parsed.substats.map((s) => (
          <div key={s.stat}>
            <dt>{STAT_LABEL[s.stat]}</dt>
            <dd>{isPercentStat(s.stat) ? formatPercent(s.value) : formatFlat(s.value)}</dd>
          </div>
        ))}
      </dl>
      {parsed.warnings.length > 0 || tooExpensive ? (
        <ul className={styles.warnings}>
          {tooExpensive ? <li>Coût trop élevé pour ce build.</li> : null}
          {parsed.warnings.map((w) => (
            <li key={w}>
              <IconWarning size={14} /> {w}
            </li>
          ))}
        </ul>
      ) : null}
      <p className={styles.hint}>Vérifiez puis corrigez si besoin dans l’éditeur après l’ajout.</p>
      <div className={styles.actions}>
        {species ? (
          <Button
            variant="filled"
            disabled={tooExpensive}
            onClick={() => {
              onAdd(parsed);
            }}
          >
            Ajouter cet Écho
          </Button>
        ) : null}
        <Button
          variant={species ? 'gray' : 'filled'}
          onClick={() => {
            onChooseSpecies(parsed);
          }}
        >
          {species ? 'Choisir un autre Écho' : 'Choisir l’Écho'}
        </Button>
      </div>
    </div>
  );
}
