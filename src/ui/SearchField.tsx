import { useId } from 'react';
import { IconSearch } from './icons';
import styles from './SearchField.module.css';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: 'regular' | 'large';
}

export function SearchField({ label, value, onChange, size = 'regular' }: Props) {
  const id = useId();
  return (
    <div className={`${styles.field} ${styles[size]}`}>
      <IconSearch size={size === 'large' ? 18 : 16} className={styles.icon} />
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <input
        id={id}
        type="search"
        placeholder={label}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className={styles.input}
        autoComplete="off"
      />
    </div>
  );
}
