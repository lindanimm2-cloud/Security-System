'use client';

import { useEffect, useState } from 'react';
import { ButtonSpinner } from './ButtonSpinner';
import {
  type ActionKind,
  actionCopy,
  getActionKind,
} from '@/lib/action-status';

type LoadingSpinnerProps = {
  label?: string;
  hint?: string;
  hints?: string[];
  action?: ActionKind;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  /** Stronger branded boot screen (login redirect, auth guard). */
  brand?: boolean;
};

function RotatingHint({ lines }: { lines: string[] }) {
  const joined = lines.join('\n');
  const items = joined.split('\n').filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (items.length < 2) return undefined;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [joined, items.length]);

  return (
    <p className="loading-screen__hint" key={`${joined}:${items[index] ?? ''}`}>
      {items[index] ?? items[0]}
    </p>
  );
}

export function LoadingSpinner({
  label,
  hint,
  hints,
  action,
  size = 'md',
  fullScreen = false,
  brand = false,
}: LoadingSpinnerProps) {
  const resolvedAction = action ?? (fullScreen || brand ? getActionKind() : null);
  const copy = actionCopy(resolvedAction);
  const displayLabel = label === undefined ? copy.label : label;
  const hintLines =
    hints && hints.length > 0
      ? hints
      : hint
        ? [hint, ...copy.hints.filter((line) => line !== hint)]
        : copy.hints;

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
          <div className="loader-orbit" aria-label={displayLabel}>
            <span className="loader-orbit__track" aria-hidden />
            <span className="loader-orbit__ring loader-orbit__ring--a" aria-hidden />
            <span className="loader-orbit__ring loader-orbit__ring--b" aria-hidden />
            <span className="loader-orbit__ring loader-orbit__ring--c" aria-hidden />
            <span className="loader-orbit__core" aria-hidden />
          </div>
          <p className="loading-screen__label">{displayLabel}</p>
          <RotatingHint lines={hintLines} />
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
        <div className="loader-spinner" role="status" aria-label={displayLabel}>
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
      {displayLabel ? <p className="loader-label">{displayLabel}</p> : null}
    </div>
  );
}
