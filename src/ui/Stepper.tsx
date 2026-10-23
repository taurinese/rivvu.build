import styles from './Stepper.module.css';

interface Props {
  label: string;
  valueText: string;
  canDecrement: boolean;
  canIncrement: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}

/** Stepper HIG : −/+ autour d'une valeur annoncée aux lecteurs d'écran. */
export function Stepper({
  label,
  valueText,
  canDecrement,
  canIncrement,
  onDecrement,
  onIncrement,
}: Props) {
  return (
    <div role="group" aria-label={label} className={styles.stepper}>
      <button
        type="button"
        className={styles.button}
        aria-label={`Diminuer ${label}`}
        disabled={!canDecrement}
        onClick={onDecrement}
      >
        −
      </button>
      <span className={styles.value} aria-live="polite">
        {valueText}
      </span>
      <button
        type="button"
        className={styles.button}
        aria-label={`Augmenter ${label}`}
        disabled={!canIncrement}
        onClick={onIncrement}
      >
        +
      </button>
    </div>
  );
}
