'use client';

import { ButtonSpinner } from './ButtonSpinner';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
  /** Visual variant classes are passed via className */
};

export function LoadingButton({
  loading = false,
  loadingLabel,
  children,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      className={`loading-btn ${loading ? 'loading-btn--busy' : ''} ${className}`}
      aria-busy={loading || undefined}
      {...rest}
      disabled={disabled || loading}
    >
      {loading ? (
        <span className="btn-loading">
          <ButtonSpinner />
          <span>{loadingLabel ?? 'Please wait…'}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
