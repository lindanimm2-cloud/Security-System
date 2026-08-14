'use client';

import { ButtonSpinner } from './ButtonSpinner';

type LoadingSpinnerProps = {
  label?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  /** Stronger branded boot screen (login redirect, auth guard). */
  brand?: boolean;
};

export function LoadingSpinner({
  label = 'Loading...',
  hint,
  size = 'md',
  fullScreen = false,
  brand = false,
}: LoadingSpinnerProps) {
  if (fullScreen || brand) {
    return (
      <div
        className={`loading-screen loading-screen--v2 ${brand ? 'loading-screen--brand' : ''}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="loading-screen__glow" aria-hidden />
        <div className="loading-screen__scan" aria-hidden />
        <div className="loading-screen__content">
          <div className="loader-orbit" aria-label={label || 'Loading'}>
            <span className="loader-orbit__track" aria-hidden />
            <span className="loader-orbit__ring loader-orbit__ring--a" aria-hidden />
            <span className="loader-orbit__ring loader-orbit__ring--b" aria-hidden />
            <span className="loader-orbit__ring loader-orbit__ring--c" aria-hidden />
            <span className="loader-orbit__core" aria-hidden />
          </div>
          <p className="loading-screen__label">{label}</p>
          <p className="loading-screen__hint">
            {hint ??
              (brand
                ? 'Securing your session…'
                : 'Pulling live ops data…')}
          </p>
          <div className="loading-screen__bar" aria-hidden>
            <span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`loader-wrap loader-wrap--${size}`}>
      {size === 'sm' ? (
        <ButtonSpinner />
      ) : (
        <div className="loader-spinner" role="status" aria-label={label || 'Loading'}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="loader-bar"
              style={{
                transform: `rotate(${i * 45}deg)`,
                animationDelay: `${i * 0.125}s`,
              }}
            />
          ))}
        </div>
      )}
      {label ? <p className="loader-label">{label}</p> : null}
    </div>
  );
}
