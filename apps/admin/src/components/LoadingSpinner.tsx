'use client';

import { useEffect, useState } from 'react';
import { ActivitySpinner } from './ActivitySpinner';
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
  /** Stronger branded boot screen. Defaults on for fullScreen (login/boot parity). */
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
  brand,
}: LoadingSpinnerProps) {
  const branded = brand ?? fullScreen;
  const resolvedAction = action ?? (fullScreen || branded ? getActionKind() : null);
  const copy = actionCopy(resolvedAction);
  const displayLabel = label === undefined ? copy.label : label;
  const hintLines =
    hints && hints.length > 0
      ? hints
      : hint
        ? [hint, ...copy.hints.filter((line) => line !== hint)]
        : copy.hints;

  if (fullScreen || branded) {
    return (
      <div
        className="loading-screen loading-screen--v2 loading-screen--brand loading-screen--ios"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="loading-screen__card">
          <div className="loading-screen__row">
            <ActivitySpinner size="md" label={displayLabel || 'Loading'} />
            <p className="loading-screen__label">{displayLabel || 'Loading...'}</p>
          </div>
          {hintLines.length > 0 ? <RotatingHint lines={hintLines} /> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`loader-wrap loader-wrap--${size}${size === 'sm' ? '' : ' loader-wrap--ios'}`}
    >
      <ActivitySpinner size={size} label={displayLabel || 'Loading'} />
      {displayLabel ? <p className="loader-label">{displayLabel}</p> : null}
    </div>
  );
}
