'use client';

import { useEffect, useState } from 'react';
import {
  CLOCK_MODE_LABELS,
  getClockMode,
  nextClockMode,
  setClockMode,
  type ClockDisplayMode,
} from '@/lib/clock-preference';
import { formatScreenshotAliasDate } from '@/lib/map-screenshot';


type NavClockProps = {
  compact?: boolean;
  className?: string;
  /** Futurist mode corner tag — portal uses protection status instead of LIVE */
  futuristTag?: string | null;
  /** When set, clock stays on this time (no tick) — used for live-map screenshots */
  frozenAt?: Date;
};

function formatFuturistTime(date: Date, mode: ClockDisplayMode) {
  const opts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: mode === 'standard',
    timeZone: mode === 'utc' ? 'UTC' : undefined,
  };
  const parts = new Intl.DateTimeFormat('en-ZA', opts).formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const second = parts.find((p) => p.type === 'second')?.value ?? '00';
  const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value;

  return { hour, minute, second, dayPeriod };
}

function formatDateLine(date: Date, mode: ClockDisplayMode, aliasDate?: boolean) {
  if (aliasDate) return formatScreenshotAliasDate(date);
  return date.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: mode === 'utc' ? 'UTC' : undefined,
  });
}

export function NavClock({
  compact = false,
  className = '',
  futuristTag = 'LIVE',
  frozenAt,
}: NavClockProps) {
  const [mode, setMode] = useState<ClockDisplayMode>('futurist');
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMode(getClockMode());
    if (frozenAt) {
      setNow(frozenAt);
      return;
    }
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [frozenAt]);

  function cycleMode() {
    const next = nextClockMode(mode);
    setMode(next);
    setClockMode(next);
  }

  if (!now) {
    return (
      <div className={`nav-clock nav-clock--loading ${className}`.trim()} aria-hidden>
        <span className="nav-clock__digit">--:--</span>
      </div>
    );
  }

  const useAliasDate = Boolean(frozenAt);
  const { hour, minute, second, dayPeriod } = formatFuturistTime(now, mode);
  const dateLine = formatDateLine(now, mode, useAliasDate);
  const nextLabel = CLOCK_MODE_LABELS[nextClockMode(mode)];

  if (mode === 'standard' || mode === 'utc') {
    const timeText = now.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      second: compact ? undefined : '2-digit',
      hour12: true,
      timeZone: mode === 'utc' ? 'UTC' : undefined,
    });

    return (
      <button
        type="button"
        className={`nav-clock nav-clock--standard ${compact ? 'nav-clock--compact' : ''} ${className}`.trim()}
        onClick={cycleMode}
        title={`${CLOCK_MODE_LABELS[mode]} time · Click for ${nextLabel}`}
        aria-label={`${CLOCK_MODE_LABELS[mode]} time, switch to ${nextLabel}`}
      >
        <span className="nav-clock__mode-tag">{mode === 'utc' ? 'UTC' : 'LOCAL'}</span>
        <span className="nav-clock__standard-time">{timeText}</span>
        {(useAliasDate || !compact) && <span className="nav-clock__date">{dateLine}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`nav-clock nav-clock--futurist ${compact ? 'nav-clock--compact' : ''} ${className}`.trim()}
      onClick={cycleMode}
      title={`Futurist clock · Click for ${nextLabel}`}
      aria-label={`Futurist clock, switch to ${nextLabel}`}
    >
      <span className="nav-clock__scan" aria-hidden />
      {futuristTag && <span className="nav-clock__mode-tag">{futuristTag}</span>}
      <div className="nav-clock__digits" aria-live="polite">
        <span className="nav-clock__digit">{hour}</span>
        <span className="nav-clock__sep">:</span>
        <span className="nav-clock__digit">{minute}</span>
        {!compact && (
          <>
            <span className="nav-clock__sep">:</span>
            <span className="nav-clock__digit nav-clock__digit--sec">{second}</span>
          </>
        )}
        {dayPeriod && <span className="nav-clock__ampm">{dayPeriod}</span>}
      </div>
      {(useAliasDate || !compact) && <span className="nav-clock__date">{dateLine}</span>}
    </button>
  );
}
