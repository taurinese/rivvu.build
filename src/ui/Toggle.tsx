import styles from './Toggle.module.css';

interface Props {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Masque le libellé visuellement (il reste annoncé). */
  hideLabel?: boolean;
}

/** Interrupteur HIG (role="switch"). */
export function Toggle({ label, checked, onChange, hideLabel = true }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={styles.toggle}
      onClick={() => {
        onChange(!checked);
      }}
    >
      <span className={hideLabel ? 'visually-hidden' : styles.label}>{label}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
