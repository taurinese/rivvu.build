import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import type { LinkProps } from 'react-router';
import styles from './Button.module.css';

export type ButtonVariant = 'filled' | 'tinted' | 'gray' | 'destructive' | 'plain';
export type ButtonSize = 'small' | 'regular' | 'large';

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  block?: boolean;
}

const classes = (
  { variant = 'gray', size = 'regular', block = false }: StyleProps,
  extra?: string,
) =>
  [styles.button, styles[variant], styles[size], block ? styles.block : '', extra ?? ''].join(' ');

export function Button({
  variant,
  size,
  icon,
  block,
  className,
  children,
  type = 'button',
  ...props
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classes({ variant, size, block }, className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

/** Lien stylé comme un bouton (navigation interne). */
export function ButtonLink({
  variant,
  size,
  icon,
  block,
  className,
  children,
  ...props
}: StyleProps & LinkProps) {
  return (
    <Link className={classes({ variant, size, block }, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Nom accessible obligatoire. */
  label: string;
  icon: ReactNode;
  variant?: 'gray' | 'plain' | 'material';
}

export function IconButton({
  label,
  icon,
  variant = 'gray',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[styles.iconButton, styles[`icon-${variant}`], className ?? ''].join(' ')}
      {...props}
    >
      {icon}
    </button>
  );
}
