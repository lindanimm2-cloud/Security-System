'use client';

import { useMemo, useState } from 'react';
import { toDateKey } from '@/lib/vms/types';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function CalendarPicker({
  value,
  onChange,
  maxDate,
  minDate,
  markedDates,
}: {
  value: string;
  onChange: (dateKey: string) => void;
  maxDate?: string;
  minDate?: string;
  /** Days with recordings get a dot. */
  markedDates?: Set<string>;
}) {
  const [y0, m0] = value.split('-').map(Number);
  const [cursor, setCursor] = useState({ y: y0, m: (m0 ?? 1) - 1 });

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: Array<string | null> = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= days; d += 1) out.push(toDateKey(new Date(cursor.y, cursor.m, d)));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const title = new Date(cursor.y, cursor.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const today = toDateKey(new Date());

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="vms-cal">
      <div className="vms-cal__head">
        <button type="button" className="vms-icon-btn vms-icon-btn--sm" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <strong>{title}</strong>
        <button type="button" className="vms-icon-btn vms-icon-btn--sm" onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="vms-cal__grid" role="grid" aria-label={title}>
        {WEEKDAYS.map((d) => (
          <span key={d} className="vms-cal__dow">
            {d}
          </span>
        ))}
        {cells.map((key, i) =>
          key ? (
            <button
              key={key}
              type="button"
              className={`vms-cal__day ${key === value ? 'is-on' : ''} ${key === today ? 'is-today' : ''}`}
              disabled={(maxDate != null && key > maxDate) || (minDate != null && key < minDate)}
              onClick={() => onChange(key)}
              aria-pressed={key === value}
            >
              {Number(key.slice(8))}
              {markedDates?.has(key) ? <span className="vms-cal__mark" aria-hidden /> : null}
            </button>
          ) : (
            <span key={`pad-${i}`} />
          ),
        )}
      </div>
    </div>
  );
}
