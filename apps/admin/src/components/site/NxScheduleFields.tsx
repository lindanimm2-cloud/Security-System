'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function parseIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(iso: string, days: number) {
  const base = parseIso(iso) ?? new Date();
  base.setDate(base.getDate() + days);
  return toIso(base);
}

function formatDisplayDate(iso: string) {
  const date = parseIso(iso);
  if (!date) return 'Select date';
  return date.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function parseTime24(value: string): { hour24: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) return null;
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return null;
  return { hour24, minute };
}

function toTime24(hour24: number, minute: number) {
  return `${pad(hour24)}:${pad(minute)}`;
}

function formatDisplayTime(value: string) {
  const parsed = parseTime24(value);
  if (!parsed) return 'Select time';
  const hour12 = ((parsed.hour24 + 11) % 12) + 1;
  const meridiem = parsed.hour24 >= 12 ? 'PM' : 'AM';
  return `${pad(hour12)}:${pad(parsed.minute)} ${meridiem}`;
}

function useOutsideClose(
  open: boolean,
  onClose: () => void,
  rootRef: { current: HTMLElement | null },
) {
  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent | TouchEvent) {
      const node = rootRef.current;
      if (!node) return;
      if (event.target instanceof Node && node.contains(event.target)) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, rootRef]);
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.5l3 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type DateFieldProps = {
  label: string;
  value: string;
  min?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

export function NxDateField({ label, value, min, required, onChange }: DateFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const minDate = parseIso(min || todayIso()) ?? new Date();
  const selected = parseIso(value);
  const [cursor, setCursor] = useState(() => selected ?? minDate);

  useEffect(() => {
    if (open) setCursor(selected ?? minDate);
  }, [open, selected, minDate]);

  useOutsideClose(open, () => setOpen(false), rootRef);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: Array<{ iso: string; day: number; inMonth: boolean; disabled: boolean }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      const date = new Date(year, month, -startOffset + i + 1);
      const iso = toIso(date);
      list.push({
        iso,
        day: date.getDate(),
        inMonth: false,
        disabled: iso < toIso(minDate),
      });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const iso = toIso(date);
      list.push({
        iso,
        day,
        inMonth: true,
        disabled: iso < toIso(minDate),
      });
    }
    while (list.length % 7 !== 0) {
      const date = new Date(year, month + 1, list.length - startOffset - daysInMonth + 1);
      const iso = toIso(date);
      list.push({
        iso,
        day: date.getDate(),
        inMonth: false,
        disabled: iso < toIso(minDate),
      });
    }
    return list;
  }, [cursor, minDate]);

  const quick = [
    { id: 'today', label: 'Today', iso: todayIso() },
    { id: 'tomorrow', label: 'Tomorrow', iso: addDays(todayIso(), 1) },
    { id: 'weekend', label: 'This Sat', iso: nextSaturdayIso() },
  ].filter((item) => item.iso >= toIso(minDate));

  function choose(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  return (
    <div className={`nx-schedule ${open ? 'is-open' : ''}`} ref={rootRef}>
      <span className="nx-schedule__label">{label}</span>
      <button
        type="button"
        className={`nx-schedule__trigger ${value ? 'has-value' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{formatDisplayDate(value)}</span>
        <CalendarIcon />
      </button>
      {required ? (
        <input
          className="nx-schedule__native"
          tabIndex={-1}
          required
          value={value}
          onChange={() => undefined}
          aria-hidden
        />
      ) : null}
      {open ? (
        <div className="nx-schedule__panel nx-schedule__panel--date" id={panelId} role="dialog" aria-label={label}>
          <div className="nx-schedule__chips" role="group" aria-label="Quick dates">
            {quick.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nx-schedule__chip ${value === item.iso ? 'is-on' : ''}`}
                onClick={() => choose(item.iso)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="nx-schedule__month">
            <button
              type="button"
              className="nx-schedule__nav"
              aria-label="Previous month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <strong>
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </strong>
            <button
              type="button"
              className="nx-schedule__nav"
              aria-label="Next month"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>
          <div className="nx-schedule__weekdays" aria-hidden>
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="nx-schedule__grid" role="grid" aria-label="Calendar">
            {cells.map((cell) => (
              <button
                key={`${cell.iso}-${cell.inMonth ? 'in' : 'out'}`}
                type="button"
                role="gridcell"
                disabled={cell.disabled}
                className={[
                  'nx-schedule__day',
                  cell.inMonth ? '' : 'is-muted',
                  cell.iso === value ? 'is-on' : '',
                  cell.iso === todayIso() ? 'is-today' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => choose(cell.iso)}
              >
                {cell.day}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function nextSaturdayIso() {
  const day = new Date().getDay();
  if (day === 6) return todayIso();
  return addDays(todayIso(), (6 - day + 7) % 7);
}

type TimeFieldProps = {
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
};

const MINUTE_OPTIONS = [0, 15, 30, 45] as const;
const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export function NxTimeField({ label, value, required, onChange }: TimeFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const parsed = parseTime24(value) ?? { hour24: 9, minute: 0 };
  const hour12 = ((parsed.hour24 + 11) % 12) + 1;
  const meridiem = parsed.hour24 >= 12 ? 'PM' : 'AM';
  const minute = MINUTE_OPTIONS.includes(parsed.minute as (typeof MINUTE_OPTIONS)[number])
    ? parsed.minute
    : Math.round(parsed.minute / 15) * 15 % 60;

  useOutsideClose(open, () => setOpen(false), rootRef);

  function commit(nextHour12: number, nextMinute: number, nextMeridiem: 'AM' | 'PM') {
    let hour24 = nextHour12 % 12;
    if (nextMeridiem === 'PM') hour24 += 12;
    onChange(toTime24(hour24, nextMinute));
  }

  const presets = [
    { id: 'morning', label: 'Morning', hint: '08:00', value: '08:00' },
    { id: 'midday', label: 'Midday', hint: '12:00', value: '12:00' },
    { id: 'afternoon', label: 'Afternoon', hint: '15:00', value: '15:00' },
    { id: 'evening', label: 'Evening', hint: '18:00', value: '18:00' },
  ];

  return (
    <div className={`nx-schedule ${open ? 'is-open' : ''}`} ref={rootRef}>
      <span className="nx-schedule__label">{label}</span>
      <button
        type="button"
        className={`nx-schedule__trigger ${value ? 'has-value' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!value) onChange('09:00');
          setOpen((v) => !v);
        }}
      >
        <span>{formatDisplayTime(value)}</span>
        <ClockIcon />
      </button>
      {required ? (
        <input
          className="nx-schedule__native"
          tabIndex={-1}
          required
          value={value}
          onChange={() => undefined}
          aria-hidden
        />
      ) : null}
      {open ? (
        <div className="nx-schedule__panel nx-schedule__panel--time" id={panelId} role="dialog" aria-label={label}>
          <div className="nx-schedule__chips" role="group" aria-label="Quick times">
            {presets.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nx-schedule__chip ${value === item.value ? 'is-on' : ''}`}
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
              >
                <strong>{item.label}</strong>
                <em>{item.hint}</em>
              </button>
            ))}
          </div>

          <div className="nx-schedule__clock" aria-label="Choose hour and minute">
            <div className="nx-schedule__clock-col" role="listbox" aria-label="Hour">
              <span className="nx-schedule__clock-kicker">Hour</span>
              <div className="nx-schedule__clock-scroll">
                {HOUR_OPTIONS.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    role="option"
                    aria-selected={hour === hour12}
                    className={`nx-schedule__clock-opt ${hour === hour12 ? 'is-on' : ''}`}
                    onClick={() => commit(hour, minute, meridiem)}
                  >
                    {pad(hour)}
                  </button>
                ))}
              </div>
            </div>
            <div className="nx-schedule__clock-col" role="listbox" aria-label="Minute">
              <span className="nx-schedule__clock-kicker">Min</span>
              <div className="nx-schedule__clock-scroll">
                {MINUTE_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="option"
                    aria-selected={m === minute}
                    className={`nx-schedule__clock-opt ${m === minute ? 'is-on' : ''}`}
                    onClick={() => commit(hour12, m, meridiem)}
                  >
                    {pad(m)}
                  </button>
                ))}
              </div>
            </div>
            <div className="nx-schedule__clock-col nx-schedule__clock-col--ampm" role="listbox" aria-label="AM or PM">
              <span className="nx-schedule__clock-kicker">Period</span>
              <div className="nx-schedule__clock-scroll">
                {(['AM', 'PM'] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    role="option"
                    aria-selected={period === meridiem}
                    className={`nx-schedule__clock-opt ${period === meridiem ? 'is-on' : ''}`}
                    onClick={() => commit(hour12, minute, period)}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="nx-schedule__footer">
            <p>{formatDisplayTime(value || toTime24(
              meridiem === 'PM' ? (hour12 % 12) + 12 : hour12 % 12,
              minute,
            ))}</p>
            <button type="button" className="nx-schedule__done" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
