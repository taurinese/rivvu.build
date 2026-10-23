import { useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import styles from './SegmentedControl.module.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Nom accessible si `label` n'est pas du texte. */
  ariaLabel?: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
  /** Étire les segments sur toute la largeur. */
  stretch?: boolean;
  size?: 'regular' | 'small';
}

/** Contrôle segmenté HIG : groupe radio, flèches gauche/droite, tabulation itinérante. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  stretch = false,
  size = 'regular',
}: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (event: KeyboardEvent, index: number) => {
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={[styles.group, stretch ? styles.stretch : '', styles[size]].join(' ')}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.ariaLabel}
            tabIndex={checked ? 0 : -1}
            className={styles.segment}
            onClick={() => {
              onChange(option.value);
            }}
            onKeyDown={(event) => {
              move(event, index);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
