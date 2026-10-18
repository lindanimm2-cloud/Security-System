'use client';

import { useMemo, useRef, useState } from 'react';
import {
  DAY_MS,
  SEGMENT_META,
  formatClock,
  type RecordingSegment,
  type SegmentKind,
} from '@/lib/vms/types';

export const TIMELINE_ZOOMS = [24, 12, 6, 2, 1] as const;
export type TimelineZoom = (typeof TIMELINE_ZOOMS)[number];

const TICK_STEP_MIN: Record<TimelineZoom, number> = { 24: 120, 12: 60, 6: 30, 2: 10, 1: 5 };

export type TimelineTrack = {
  id: string;
  label: string;
  segments: RecordingSegment[];
};

export type TimeRange = { start: number; end: number };

export function TimelineLegend({ kinds }: { kinds?: SegmentKind[] }) {
  const list = kinds ?? (Object.keys(SEGMENT_META) as SegmentKind[]);
  return (
    <ul className="vms-legend" aria-label="Recording types">
      {list.map((kind) => (
        <li key={kind}>
          <span className={`vms-swatch vms-seg-tone--${SEGMENT_META[kind].tone}`} aria-hidden />
          {SEGMENT_META[kind].label}
        </li>
      ))}
    </ul>
  );
}

export function Timeline24h({
  dayStartMs,
  tracks,
  playhead,
  onSeek,
  zoom = 24,
  onZoom,
  selectMode = false,
  selection,
  onSelect,
  hiddenKinds,
}: {
  dayStartMs: number;
  tracks: TimelineTrack[];
  playhead: number;
  onSeek: (ms: number) => void;
  zoom?: TimelineZoom;
  onZoom?: (zoom: TimelineZoom) => void;
  selectMode?: boolean;
  selection?: TimeRange | null;
  onSelect?: (range: TimeRange | null) => void;
  hiddenKinds?: SegmentKind[];
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<TimeRange | null>(null);

  const span = zoom * 3_600_000;
  const viewStart = Math.min(Math.max(playhead - span / 2, dayStartMs), dayStartMs + DAY_MS - span);
  const viewEnd = viewStart + span;
  const hidden = useMemo(() => new Set(hiddenKinds ?? []), [hiddenKinds]);

  const ticks = useMemo(() => {
    const stepMs = TICK_STEP_MIN[zoom] * 60_000;
    const first = Math.ceil((viewStart - dayStartMs) / stepMs) * stepMs + dayStartMs;
    const out: number[] = [];
    for (let t = first; t <= viewEnd; t += stepMs) out.push(t);
    return out;
  }, [zoom, viewStart, viewEnd, dayStartMs]);

  const pct = (ms: number) => ((ms - viewStart) / span) * 100;

  function msFromClientX(clientX: number) {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return playhead;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(viewStart + ratio * span);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const ms = msFromClientX(e.clientX);
    if (selectMode && onSelect) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ start: ms, end: ms });
    } else {
      onSeek(ms);
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    setDrag({ ...drag, end: msFromClientX(e.clientX) });
  }

  function onPointerUp() {
    if (!drag || !onSelect) return;
    const start = Math.min(drag.start, drag.end);
    const end = Math.max(drag.start, drag.end);
    setDrag(null);
    onSelect(end - start < 5_000 ? null : { start, end });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 600_000 : 60_000;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(dayStartMs, playhead - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(dayStartMs + DAY_MS - 1, playhead + step));
    }
  }

  const shownRange = drag
    ? { start: Math.min(drag.start, drag.end), end: Math.max(drag.start, drag.end) }
    : selection ?? null;

  return (
    <div className="vms-timeline">
      <div className="vms-timeline__bar">
        <span className="vms-timeline__clock">{formatClock(playhead)}</span>
        {onZoom ? (
          <div className="vms-seg vms-seg--sm" role="radiogroup" aria-label="Timeline zoom">
            {TIMELINE_ZOOMS.map((z) => (
              <button
                key={z}
                type="button"
                role="radio"
                aria-checked={zoom === z}
                className={zoom === z ? 'is-on' : ''}
                onClick={() => onZoom(z)}
              >
                {z}h
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="vms-timeline__grid">
        <div className="vms-timeline__labels">
          <span className="vms-timeline__ruler-spacer" />
          {tracks.map((t) => (
            <span key={t.id} className="vms-timeline__label" title={t.label}>
              {t.label}
            </span>
          ))}
        </div>
        <div
          ref={areaRef}
          className={`vms-timeline__area ${selectMode ? 'is-select' : ''}`}
          role="slider"
          tabIndex={0}
          aria-label="Playback position"
          aria-valuemin={dayStartMs}
          aria-valuemax={dayStartMs + DAY_MS}
          aria-valuenow={playhead}
          aria-valuetext={formatClock(playhead)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(null)}
          onKeyDown={onKeyDown}
        >
          <div className="vms-timeline__ruler">
            {ticks.map((t) => (
              <span key={t} className="vms-timeline__tick" style={{ left: `${pct(t)}%` }}>
                {formatClock(t, false)}
              </span>
            ))}
          </div>
          {tracks.map((track) => (
            <div key={track.id} className="vms-timeline__track">
              {track.segments.map((seg, i) => {
                if (hidden.has(seg.kind)) return null;
                const s = Math.max(new Date(seg.start).getTime(), viewStart);
                const e = Math.min(new Date(seg.end).getTime(), viewEnd);
                if (e <= s) return null;
                return (
                  <span
                    key={`${seg.start}-${i}`}
                    className={`vms-timeline__seg vms-seg-tone--${SEGMENT_META[seg.kind].tone}`}
                    style={{ left: `${pct(s)}%`, width: `${Math.max(0.15, pct(e) - pct(s))}%` }}
                    title={`${SEGMENT_META[seg.kind].label} ${formatClock(new Date(seg.start).getTime())}–${formatClock(new Date(seg.end).getTime())}${seg.label ? ` · ${seg.label}` : ''}`}
                  />
                );
              })}
            </div>
          ))}
          {shownRange ? (
            <span
              className="vms-timeline__selection"
              style={{ left: `${pct(shownRange.start)}%`, width: `${pct(shownRange.end) - pct(shownRange.start)}%` }}
            />
          ) : null}
          {playhead >= viewStart && playhead <= viewEnd ? (
            <span className="vms-timeline__playhead" style={{ left: `${pct(playhead)}%` }} aria-hidden />
          ) : null}
        </div>
      </div>
    </div>
  );
}
