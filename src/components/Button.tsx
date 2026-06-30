import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantClass = styles[variant];

  return (
    <button
      type="button"
      {...props}
      disabled={isDisabled}
      className={[
        styles.base,
        variantClass,
        isDisabled ? styles.disabled : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <span
          className="spinner"
          style={{ color: variant === 'secondary' ? 'var(--color-primary)' : '#fff' }}
        />
      ) : (
        title
      )}
    </button>
  );
}
