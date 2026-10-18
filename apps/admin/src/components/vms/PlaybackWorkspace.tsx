'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CctvLiveFeed } from '@/components/portal/CctvLiveFeed';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { logOpsAudit } from '@/lib/vms/api';
import {
  DAY_MS,
  SEGMENT_META,
  dayStart,
  flattenCameras,
  formatClock,
  toDateKey,
  type ExportJob,
  type RecordingSegment,
  type RecordingsResponse,
  type SegmentKind,
  type VmsCamera,
  type VmsTree,
} from '@/lib/vms/types';
import { CalendarPicker } from './CalendarPicker';
import { ResourceTree } from './ResourceTree';
import { Timeline24h, type TimeRange, type TimelineZoom } from './Timeline24h';
import { TransportBar, type PlaybackSpeed } from './TransportBar';
import { VmsGrid, type VmsLayout } from './VmsGrid';

const MAX_CAMS = 9;
const EVENT_KINDS: SegmentKind[] = ['ALARM', 'MOTION', 'ANALYTICS', 'MANUAL'];

function layoutFor(n: number): VmsLayout {
  if (n <= 1) return 1;
  if (n <= 4) return 4;
  return 9;
}

function segmentAt(segments: RecordingSegment[] | undefined, ms: number) {
  return segments?.find((s) => new Date(s.start).getTime() <= ms && new Date(s.end).getTime() > ms) ?? null;
}

export function PlaybackWorkspace({
  tree,
  initialCams,
  initialAt,
  initialSiteId,
  onExported,
}: {
  tree: VmsTree;
  initialCams: string[];
  initialAt: string | null;
  initialSiteId: string | null;
  onExported: () => void;
}) {
  const cameras = useMemo(() => flattenCameras(tree), [tree]);
  const byId = useMemo(() => new Map(cameras.map((c) => [c.id, c])), [cameras]);

  const initialMs = useMemo(() => {
    const t = initialAt ? new Date(initialAt).getTime() : NaN;
    return Number.isFinite(t) ? t : Date.now() - 15 * 60_000;
  }, [initialAt]);

  const [checked, setChecked] = useState<string[]>(() => {
    const valid = initialCams.filter((id) => byId.has(id));
    if (valid.length) return valid.slice(0, MAX_CAMS);
    const site = initialSiteId ? tree.sites.find((s) => s.id === initialSiteId) : tree.sites[0];
    return (site?.recorders.flatMap((r) => r.cameras.map((c) => c.id)) ?? []).slice(0, 4);
  });
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date(initialMs)));
  const [mode, setMode] = useState<'time' | 'event'>('time');
  const [times, setTimes] = useState<Record<string, number>>({});
  const [base, setBase] = useState(initialMs);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [synced, setSynced] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState<TimelineZoom>(initialAt ? 2 : 24);
  const [hiddenKinds, setHiddenKinds] = useState<SegmentKind[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selection, setSelection] = useState<TimeRange | null>(null);
  const [eventKinds, setEventKinds] = useState<SegmentKind[]>(['ALARM', 'MOTION', 'ANALYTICS']);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const loggedRef = useRef<string>('');

  const shown = checked.slice(0, MAX_CAMS);
  const layout = layoutFor(shown.length);
  const paneCams = Array.from({ length: layout }, (_, i) => (shown[i] ? byId.get(shown[i]) ?? null : null));
  const activeCam = paneCams[activeIndex] ?? paneCams.find(Boolean) ?? null;
  const dayStartMs = dayStart(dateKey);
  const today = toDateKey(new Date());
  const minDate = toDateKey(new Date(Date.now() - 30 * DAY_MS));

  const { data, loading } = useApi(
    () =>
      shown.length
        ? adminApi.get<ApiResponse<RecordingsResponse>>(
            `/control-room/vms/recordings?cameraIds=${encodeURIComponent(shown.join(','))}&date=${dateKey}`,
          )
        : Promise.resolve({ success: true, data: { date: dateKey, cameras: [] } } as ApiResponse<RecordingsResponse>),
    [shown.join(','), dateKey],
  );
  const recordings = data?.data;
  const segMap = useMemo(
    () => new Map((recordings?.cameras ?? []).map((c) => [c.cameraId, c.segments])),
    [recordings],
  );

  const timeFor = (camId: string) => (synced ? base : times[camId] ?? base);
  const playhead = activeCam ? timeFor(activeCam.id) : base;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const step = 250 * speed;
      const clamp = (v: number) => Math.min(dayStartMs + DAY_MS - 1, v + step);
      if (synced) setBase((b) => clamp(b));
      else if (activeCam) setTimes((prev) => ({ ...prev, [activeCam.id]: clamp(prev[activeCam.id] ?? base) }));
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, speed, synced, activeCam, base, dayStartMs]);

  useEffect(() => {
    if (!playing || !shown.length) return;
    const key = `${shown.join(',')}|${dateKey}`;
    if (loggedRef.current === key) return;
    loggedRef.current = key;
    const names = shown.map((id) => byId.get(id)?.name ?? id).join(', ');
    void logOpsAudit('PLAYBACK', 'Playback started', names, `${dateKey} ${formatClock(playhead)}`);
  }, [playing, shown, dateKey, byId, playhead]);

  function seek(ms: number) {
    if (synced) {
      setBase(ms);
      setTimes({});
    } else if (activeCam) {
      setTimes((prev) => ({ ...prev, [activeCam.id]: ms }));
    }
  }

  function changeDate(next: string) {
    setDateKey(next);
    const offset = (playhead - dayStartMs + DAY_MS) % DAY_MS;
    setBase(dayStart(next) + offset);
    setTimes({});
    setSelection(null);
  }

  function changeSync(on: boolean) {
    if (on) setBase(playhead);
    else setTimes(Object.fromEntries(shown.map((id) => [id, base])));
    setSynced(on);
  }

  const events = useMemo(() => {
    const rows: Array<RecordingSegment & { cameraId: string; cameraName: string }> = [];
    for (const id of shown) {
      for (const seg of segMap.get(id) ?? []) {
        if (eventKinds.includes(seg.kind)) rows.push({ ...seg, cameraId: id, cameraName: byId.get(id)?.name ?? id });
      }
    }
    return rows.sort((a, b) => a.start.localeCompare(b.start));
  }, [shown, segMap, eventKinds, byId]);

  async function exportSelection() {
    if (!selection) return;
    setExporting(true);
    setNotice(null);
    try {
      const res = await adminApi.post<ApiResponse<ExportJob[]>>('/control-room/vms/exports', {
        items: shown.map((cameraId) => ({
          cameraId,
          start: new Date(selection.start).toISOString(),
          end: new Date(selection.end).toISOString(),
          format: 'MP4',
        })),
      });
      setNotice(`${res.data.length} clip${res.data.length === 1 ? '' : 's'} queued for export.`);
      setSelection(null);
      setSelectMode(false);
      onExported();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  function snapshot() {
    if (!activeCam) return;
    void logOpsAudit('PLAYBACK', 'Snapshot captured', activeCam.name, `${dateKey} ${formatClock(playhead)}`);
    setNotice(`Snapshot of ${activeCam.name} at ${formatClock(playhead)} saved to the operations log (Demo).`);
  }

  return (
    <div className="vms-work vms-work--playback">
      <div className="vms-work__tree vms-pb-side">
        <div className="vms-seg vms-seg--sm vms-pb-side__mode" role="tablist" aria-label="Search mode">
          <button type="button" role="tab" aria-selected={mode === 'time'} className={mode === 'time' ? 'is-on' : ''} onClick={() => setMode('time')}>
            By time
          </button>
          <button type="button" role="tab" aria-selected={mode === 'event'} className={mode === 'event' ? 'is-on' : ''} onClick={() => setMode('event')}>
            By event
          </button>
        </div>
        <CalendarPicker value={dateKey} onChange={changeDate} maxDate={today} minDate={minDate} />
        {mode === 'time' ? (
          <ResourceTree
            tree={tree}
            checked={checked}
            onCheck={(ids) => {
              setChecked(ids.slice(0, MAX_CAMS));
              setActiveIndex(0);
            }}
            activeId={activeCam?.id}
            title={`Cameras (${checked.length}/${MAX_CAMS})`}
          />
        ) : (
          <div className="vms-events">
            <div className="vms-chips" role="group" aria-label="Event types">
              {EVENT_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`vms-chip ${eventKinds.includes(k) ? 'is-on' : ''}`}
                  aria-pressed={eventKinds.includes(k)}
                  onClick={() =>
                    setEventKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
                  }
                >
                  <span className={`vms-swatch vms-seg-tone--${SEGMENT_META[k].tone}`} aria-hidden />
                  {SEGMENT_META[k].label}
                </button>
              ))}
            </div>
            {shown.length === 0 ? <p className="vms-muted">Pick cameras under “By time” first.</p> : null}
            <ul className="vms-events__list">
              {events.map((ev, i) => (
                <li key={`${ev.cameraId}-${ev.start}-${i}`}>
                  <button
                    type="button"
                    className="vms-events__row"
                    onClick={() => {
                      const idx = shown.indexOf(ev.cameraId);
                      if (idx >= 0) setActiveIndex(idx);
                      seek(new Date(ev.start).getTime());
                      setZoom(2);
                    }}
                  >
                    <span className={`vms-swatch vms-seg-tone--${SEGMENT_META[ev.kind].tone}`} aria-hidden />
                    <strong>{formatClock(new Date(ev.start).getTime())}</strong>
                    <span>{ev.label ?? SEGMENT_META[ev.kind].label}</span>
                    <em>{ev.cameraName}</em>
                  </button>
                </li>
              ))}
              {shown.length > 0 && events.length === 0 && !loading ? (
                <li className="vms-muted">No events on {dateKey}.</li>
              ) : null}
            </ul>
          </div>
        )}
      </div>

      <section className="vms-work__main vms-work__main--playback" aria-label="Playback">
        {recordings?.integrationPending ? (
          <p className="vms-banner">Recorder playback is pending integration for this tenant. Timeline shows no footage yet.</p>
        ) : null}
        {notice ? (
          <p className="vms-banner vms-banner--info" role="status">
            {notice}
            <button type="button" className="vms-link" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </p>
        ) : null}
        <div className="vms-work__grid">
          <VmsGrid
            layout={layout}
            panes={paneCams}
            activeIndex={activeIndex}
            onActivate={setActiveIndex}
            emptyHint="Tick cameras in the tree"
            renderPane={(cam: VmsCamera) => {
              const t = timeFor(cam.id);
              const seg = segmentAt(segMap.get(cam.id), t);
              return (
                <div className={`vms-pb-pane ${seg ? '' : 'is-gap'}`}>
                  <CctvLiveFeed camera={cam} compact showControls={false} onSelect={() => undefined} />
                  <span className="vms-pane__tag">
                    {cam.name} · {formatClock(t)}
                  </span>
                  <span className={`vms-pb-pane__state ${seg ? `vms-seg-tone--${SEGMENT_META[seg.kind].tone}` : ''}`}>
                    {seg ? (playing ? `▶ ${speed}× ${SEGMENT_META[seg.kind].label}` : `Ⅱ ${SEGMENT_META[seg.kind].label}`) : 'No recording'}
                  </span>
                </div>
              );
            }}
          />
        </div>

        <TransportBar
          playing={playing}
          speed={speed}
          onPlayPause={() => setPlaying((p) => !p)}
          onStop={() => {
            setPlaying(false);
            seek(dayStartMs);
          }}
          onStep={(d) => seek(Math.min(dayStartMs + DAY_MS - 1, Math.max(dayStartMs, playhead + d)))}
          onSpeed={setSpeed}
          synced={synced}
          onSync={changeSync}
          extra={
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={snapshot} disabled={!activeCam}>
                Snapshot
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectMode ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  setSelectMode((s) => !s);
                  setSelection(null);
                }}
                aria-pressed={selectMode}
              >
                {selectMode ? 'Drag on timeline…' : 'Clip'}
              </button>
              {selection ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void exportSelection()} disabled={exporting}>
                  Export {formatClock(selection.start)}–{formatClock(selection.end)}
                </button>
              ) : null}
            </>
          }
        />

        <Timeline24h
          dayStartMs={dayStartMs}
          tracks={shown.map((id) => ({ id, label: byId.get(id)?.name ?? id, segments: segMap.get(id) ?? [] }))}
          playhead={playhead}
          onSeek={seek}
          zoom={zoom}
          onZoom={setZoom}
          selectMode={selectMode}
          selection={selection}
          onSelect={setSelection}
          hiddenKinds={hiddenKinds}
        />
        <div className="vms-legend-row">
          <div className="vms-chips" role="group" aria-label="Show recording types">
            {(Object.keys(SEGMENT_META) as SegmentKind[]).map((k) => (
              <label key={k} className="vms-check">
                <input
                  type="checkbox"
                  checked={!hiddenKinds.includes(k)}
                  onChange={(e) =>
                    setHiddenKinds((prev) => (e.target.checked ? prev.filter((x) => x !== k) : [...prev, k]))
                  }
                />
                <span className={`vms-swatch vms-seg-tone--${SEGMENT_META[k].tone}`} aria-hidden />
                {SEGMENT_META[k].label}
              </label>
            ))}
          </div>
          {recordings && !recordings.integrationPending ? <span className="vms-badge">Demo footage</span> : null}
        </div>
      </section>
    </div>
  );
}
