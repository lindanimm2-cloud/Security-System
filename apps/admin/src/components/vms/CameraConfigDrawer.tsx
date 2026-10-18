'use client';

import { useEffect, useRef, useState } from 'react';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import {
  formatDateTime,
  type CameraConfig,
  type OsdPosition,
  type RecordMode,
  type RecordSchedule,
  type StreamProfile,
} from '@/lib/vms/types';

type Tab = 'image' | 'encoding' | 'osd' | 'schedule';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'image', label: 'Image' },
  { id: 'encoding', label: 'Encoding' },
  { id: 'osd', label: 'OSD' },
  { id: 'schedule', label: 'Recording schedule' },
];

const RESOLUTIONS = ['3840x2160', '2560x1440', '1920x1080', '1280x720', '704x576', '640x360'];
const POSITIONS: Array<{ value: OsdPosition; label: string }> = [
  { value: 'TOP_LEFT', label: 'Top left' },
  { value: 'TOP_RIGHT', label: 'Top right' },
  { value: 'BOTTOM_LEFT', label: 'Bottom left' },
  { value: 'BOTTOM_RIGHT', label: 'Bottom right' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MODES: Array<{ value: RecordMode; label: string; cell: string }> = [
  { value: 'CONTINUOUS', label: 'Continuous', cell: 'CONTINUOUS' },
  { value: 'MOTION', label: 'Motion', cell: 'MOTION' },
  { value: 'ALARM', label: 'Alarm', cell: 'ALARM' },
  { value: 'OFF', label: 'Erase', cell: 'NONE' },
];

export type ConfigTarget = { id: string; name: string; deviceName: string };

export function CameraConfigDrawer({ camera, onClose }: { camera: ConfigTarget; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('image');
  const [config, setConfig] = useState<CameraConfig | null>(null);
  const [schedule, setSchedule] = useState<RecordSchedule | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setConfig(null);
    setSchedule(null);
    setError('');
    Promise.all([
      adminApi.get<ApiResponse<CameraConfig>>(`/control-room/vms/cameras/${camera.id}/config`),
      adminApi.get<ApiResponse<RecordSchedule>>(`/control-room/vms/cameras/${camera.id}/schedule`),
    ])
      .then(([c, s]) => {
        if (cancelled) return;
        setConfig(c.data);
        setSchedule(s.data);
        setSavedAt(c.data.stagedAt ?? s.data.stagedAt);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Could not load settings'));
    return () => {
      cancelled = true;
    };
  }, [camera.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    if (!config || !schedule) return;
    setSaving(true);
    setError('');
    try {
      if (tab === 'schedule') {
        const res = await adminApi.patch<ApiResponse<RecordSchedule>>(`/control-room/vms/cameras/${camera.id}/schedule`, {
          days: schedule.days,
          retentionDays: schedule.retentionDays,
          preRecordSec: schedule.preRecordSec,
          postRecordSec: schedule.postRecordSec,
        });
        setSchedule(res.data);
        setSavedAt(res.data.stagedAt);
      } else {
        const res = await adminApi.patch<ApiResponse<CameraConfig>>(`/control-room/vms/cameras/${camera.id}/config`, {
          [tab]: config[tab],
        });
        setConfig(res.data);
        setSavedAt(res.data.stagedAt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function patchImage(p: Partial<CameraConfig['image']>) {
    setConfig((c) => (c ? { ...c, image: { ...c.image, ...p } } : c));
  }
  function patchStream(key: keyof CameraConfig['encoding'], p: Partial<StreamProfile>) {
    setConfig((c) => (c ? { ...c, encoding: { ...c.encoding, [key]: { ...c.encoding[key], ...p } } } : c));
  }
  function patchOsd(p: Partial<CameraConfig['osd']>) {
    setConfig((c) => (c ? { ...c, osd: { ...c.osd, ...p } } : c));
  }

  return (
    <>
      <div className="vms-drawer-scrim" onClick={onClose} aria-hidden />
      <aside className="vms-drawer" role="dialog" aria-modal="true" aria-labelledby="vms-cfg-title">
        <header className="vms-drawer__head">
          <div>
            <h2 id="vms-cfg-title">{camera.name}</h2>
            <span className="vms-sub">{camera.deviceName}</span>
          </div>
          <button type="button" className="vms-icon-btn" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </header>
        <div className="vms-drawer__tabs">
          <div className="vms-tabs" role="tablist" aria-label="Camera settings">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`vms-tab ${tab === t.id ? 'is-on' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="vms-drawer__body">
          {error ? <p className="vms-error">{error}</p> : null}
          {config?.integrationPending ? (
            <p className="vms-banner">Settings are stored but not yet pushed to the recorder (integration pending).</p>
          ) : null}
          {!config || !schedule ? (
            !error ? <p className="vms-muted">Loading settings…</p> : null
          ) : tab === 'image' ? (
            <ImageTab image={config.image} onChange={patchImage} />
          ) : tab === 'encoding' ? (
            <EncodingTab encoding={config.encoding} onChange={patchStream} />
          ) : tab === 'osd' ? (
            <OsdTab osd={config.osd} cameraName={camera.name} onChange={patchOsd} />
          ) : (
            <ScheduleTab schedule={schedule} onChange={setSchedule} />
          )}
        </div>
        <footer className="vms-drawer__foot">
          <span className="vms-muted">
            {savedAt ? `Staged (Demo) · ${formatDateTime(savedAt)}` : 'Changes are staged until a recorder integration is connected.'}
          </span>
          <span className="vms-toolbar__spacer" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => void save()} disabled={saving || !config}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </aside>
    </>
  );
}

function Slider({ label, value, onChange, max = 100 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <label className="vms-field">
      <span>
        {label}: <strong>{value}</strong>
      </span>
      <input type="range" min={0} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function ImageTab({ image, onChange }: { image: CameraConfig['image']; onChange: (p: Partial<CameraConfig['image']>) => void }) {
  return (
    <>
      <div
        className="vms-osd-preview"
        style={{
          filter: `brightness(${0.4 + image.brightness / 80}) contrast(${0.4 + image.contrast / 80}) saturate(${image.saturation / 50})`,
          transform:
            image.rotation === 'FLIP' ? 'scaleY(-1)' : image.rotation === 'MIRROR' ? 'scaleX(-1)' : image.rotation === 'ROTATE_180' ? 'rotate(180deg)' : undefined,
        }}
        aria-label="Image preview"
      >
        <span className="vms-osd-preview__text vms-osd-preview__text--BOTTOM_RIGHT">Preview</span>
      </div>
      <div className="vms-form-grid">
        <Slider label="Brightness" value={image.brightness} onChange={(v) => onChange({ brightness: v })} />
        <Slider label="Contrast" value={image.contrast} onChange={(v) => onChange({ contrast: v })} />
        <Slider label="Saturation" value={image.saturation} onChange={(v) => onChange({ saturation: v })} />
        <Slider label="Sharpness" value={image.sharpness} onChange={(v) => onChange({ sharpness: v })} />
        <Slider label="2D noise reduction" value={image.nr2d} onChange={(v) => onChange({ nr2d: v })} />
        <Slider label="3D noise reduction" value={image.nr3d} onChange={(v) => onChange({ nr3d: v })} />
        <label className="vms-field">
          <span>Mirror / rotate</span>
          <select value={image.rotation} onChange={(e) => onChange({ rotation: e.target.value as CameraConfig['image']['rotation'] })}>
            <option value="NORMAL">Normal</option>
            <option value="FLIP">Flip</option>
            <option value="MIRROR">Mirror</option>
            <option value="ROTATE_180">Rotate 180°</option>
          </select>
        </label>
      </div>
    </>
  );
}

function EncodingTab({
  encoding,
  onChange,
}: {
  encoding: CameraConfig['encoding'];
  onChange: (key: keyof CameraConfig['encoding'], p: Partial<StreamProfile>) => void;
}) {
  const streams: Array<{ key: keyof CameraConfig['encoding']; label: string }> = [
    { key: 'main', label: 'Main stream' },
    { key: 'sub', label: 'Sub stream' },
    { key: 'third', label: 'Third stream' },
  ];
  return (
    <div className="vms-table-wrap">
      <table className="vms-table">
        <thead>
          <tr>
            <th>Stream</th>
            <th>On</th>
            <th>Codec</th>
            <th>Resolution</th>
            <th>FPS</th>
            <th>Bitrate</th>
            <th>Type</th>
            <th>GOP</th>
            <th>Smart</th>
          </tr>
        </thead>
        <tbody>
          {streams.map(({ key, label }) => {
            const s = encoding[key];
            return (
              <tr key={key}>
                <td>{label}</td>
                <td>
                  <input type="checkbox" checked={s.enabled} disabled={key === 'main'} onChange={(e) => onChange(key, { enabled: e.target.checked })} aria-label={`${label} enabled`} />
                </td>
                <td>
                  <select className="vms-input" value={s.codec} onChange={(e) => onChange(key, { codec: e.target.value as StreamProfile['codec'] })} aria-label={`${label} codec`}>
                    <option>H.264</option>
                    <option>H.265</option>
                  </select>
                </td>
                <td>
                  <select className="vms-input" value={s.resolution} onChange={(e) => onChange(key, { resolution: e.target.value })} aria-label={`${label} resolution`}>
                    {RESOLUTIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input className="vms-input" type="number" min={1} max={30} value={s.fps} onChange={(e) => onChange(key, { fps: Number(e.target.value) })} aria-label={`${label} frame rate`} style={{ width: 58 }} />
                </td>
                <td>
                  <input className="vms-input" type="number" min={64} max={16384} step={64} value={s.bitrateKbps} onChange={(e) => onChange(key, { bitrateKbps: Number(e.target.value) })} aria-label={`${label} bitrate kbps`} style={{ width: 80 }} />
                </td>
                <td>
                  <select className="vms-input" value={s.bitrateType} onChange={(e) => onChange(key, { bitrateType: e.target.value as StreamProfile['bitrateType'] })} aria-label={`${label} bitrate type`}>
                    <option>CBR</option>
                    <option>VBR</option>
                  </select>
                </td>
                <td>
                  <input className="vms-input" type="number" min={1} max={200} value={s.gop} onChange={(e) => onChange(key, { gop: Number(e.target.value) })} aria-label={`${label} GOP`} style={{ width: 58 }} />
                </td>
                <td>
                  <input type="checkbox" checked={s.smartEncoding} onChange={(e) => onChange(key, { smartEncoding: e.target.checked })} aria-label={`${label} smart encoding`} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OsdTab({
  osd,
  cameraName,
  onChange,
}: {
  osd: CameraConfig['osd'];
  cameraName: string;
  onChange: (p: Partial<CameraConfig['osd']>) => void;
}) {
  const now = new Date();
  const dateText = osd.dateFormat
    .replace('YYYY', String(now.getFullYear()))
    .replace('MM', String(now.getMonth() + 1).padStart(2, '0'))
    .replace('DD', String(now.getDate()).padStart(2, '0'));
  const hours = osd.timeFormat === '12H' ? ((now.getHours() + 11) % 12) + 1 : now.getHours();
  const timeText = `${String(hours).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}${osd.timeFormat === '12H' ? (now.getHours() < 12 ? ' AM' : ' PM') : ''}`;

  function setOverlay(i: number, p: Partial<CameraConfig['osd']['overlays'][number]>) {
    onChange({ overlays: osd.overlays.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  }

  return (
    <>
      <div className="vms-osd-preview" aria-label="OSD preview">
        {osd.showDate ? (
          <span className={`vms-osd-preview__text vms-osd-preview__text--${osd.datePosition}`}>
            {dateText} {timeText}
          </span>
        ) : null}
        {osd.showName ? (
          <span className={`vms-osd-preview__text vms-osd-preview__text--${osd.namePosition}`} style={osd.namePosition === osd.datePosition ? { marginTop: 18 } : undefined}>
            {cameraName}
          </span>
        ) : null}
        {osd.overlays
          .filter((o) => o.text.trim())
          .map((o, i) => (
            <span key={i} className={`vms-osd-preview__text vms-osd-preview__text--${o.position}`} style={{ marginTop: 36 + i * 16 }}>
              {o.text}
            </span>
          ))}
      </div>
      <div className="vms-form-grid">
        <label className="vms-check">
          <input type="checkbox" checked={osd.showDate} onChange={(e) => onChange({ showDate: e.target.checked })} />
          Show date &amp; time
        </label>
        <label className="vms-check">
          <input type="checkbox" checked={osd.showName} onChange={(e) => onChange({ showName: e.target.checked })} />
          Show camera name
        </label>
        <label className="vms-field">
          <span>Date format</span>
          <select value={osd.dateFormat} onChange={(e) => onChange({ dateFormat: e.target.value })}>
            <option>YYYY-MM-DD</option>
            <option>DD/MM/YYYY</option>
            <option>MM/DD/YYYY</option>
          </select>
        </label>
        <label className="vms-field">
          <span>Time format</span>
          <select value={osd.timeFormat} onChange={(e) => onChange({ timeFormat: e.target.value as '24H' | '12H' })}>
            <option value="24H">24 hour</option>
            <option value="12H">12 hour</option>
          </select>
        </label>
        <label className="vms-field">
          <span>Date position</span>
          <select value={osd.datePosition} onChange={(e) => onChange({ datePosition: e.target.value as OsdPosition })}>
            {POSITIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="vms-field">
          <span>Name position</span>
          <select value={osd.namePosition} onChange={(e) => onChange({ namePosition: e.target.value as OsdPosition })}>
            {POSITIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="vms-card">
        <h3>Text overlays</h3>
        {osd.overlays.map((o, i) => (
          <div key={i} className="vms-inline-form">
            <input value={o.text} onChange={(e) => setOverlay(i, { text: e.target.value })} placeholder={`Overlay ${i + 1}`} maxLength={32} aria-label={`Overlay ${i + 1} text`} />
            <select className="vms-input" value={o.position} onChange={(e) => setOverlay(i, { position: e.target.value as OsdPosition })} aria-label={`Overlay ${i + 1} position`} style={{ flex: '0 0 130px' }}>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button type="button" className="vms-icon-btn vms-icon-btn--sm" aria-label={`Remove overlay ${i + 1}`} onClick={() => onChange({ overlays: osd.overlays.filter((_, j) => j !== i) })}>
              ×
            </button>
          </div>
        ))}
        {osd.overlays.length < 4 ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ overlays: [...osd.overlays, { position: 'BOTTOM_LEFT', text: '' }] })}>
            Add overlay
          </button>
        ) : null}
      </div>
    </>
  );
}

function ScheduleTab({ schedule, onChange }: { schedule: RecordSchedule; onChange: (s: RecordSchedule) => void }) {
  const [brush, setBrush] = useState<RecordMode>('CONTINUOUS');
  const painting = useRef(false);

  function paint(day: number, hour: number) {
    if (schedule.days[day]?.[hour] === brush) return;
    onChange({
      ...schedule,
      days: schedule.days.map((row, d) => (d === day ? row.map((m, h) => (h === hour ? brush : m)) : row)),
    });
  }

  function fill(mode: RecordMode) {
    onChange({ ...schedule, days: schedule.days.map((row) => row.map(() => mode)) });
  }

  return (
    <>
      <div className="vms-toolbar" style={{ padding: 0, border: 0, background: 'transparent' }}>
        <div className="vms-seg vms-seg--sm" role="radiogroup" aria-label="Paint mode">
          {MODES.map((m) => (
            <button key={m.value} type="button" role="radio" aria-checked={brush === m.value} className={brush === m.value ? 'is-on' : ''} onClick={() => setBrush(m.value)}>
              <span className={`vms-swatch vms-sched__cell--${m.cell}`} aria-hidden />
              {m.label}
            </button>
          ))}
        </div>
        <span className="vms-toolbar__spacer" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fill(brush)}>
          Fill week
        </button>
      </div>
      <div
        className="vms-sched"
        onPointerUp={() => (painting.current = false)}
        onPointerLeave={() => (painting.current = false)}
        role="grid"
        aria-label="Weekly recording schedule"
      >
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="vms-sched__hour">
            {h % 3 === 0 ? h : ''}
          </span>
        ))}
        {DAYS.map((day, d) => (
          <div key={day} style={{ display: 'contents' }} role="row">
            <span className="vms-sched__day">{day}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const mode = schedule.days[d]?.[h] ?? 'OFF';
              return (
                <button
                  key={h}
                  type="button"
                  className={`vms-sched__cell vms-sched__cell--${mode === 'OFF' ? 'NONE' : mode}`}
                  aria-label={`${day} ${String(h).padStart(2, '0')}:00 ${mode.toLowerCase()}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    painting.current = true;
                    paint(d, h);
                  }}
                  onPointerEnter={() => painting.current && paint(d, h)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="vms-form-grid">
        <label className="vms-field">
          <span>Retention (days)</span>
          <input type="number" min={1} max={365} value={schedule.retentionDays} onChange={(e) => onChange({ ...schedule, retentionDays: Number(e.target.value) })} />
        </label>
        <label className="vms-field">
          <span>Pre-record (s)</span>
          <input type="number" min={0} max={30} value={schedule.preRecordSec} onChange={(e) => onChange({ ...schedule, preRecordSec: Number(e.target.value) })} />
        </label>
        <label className="vms-field">
          <span>Post-record (s)</span>
          <input type="number" min={0} max={300} value={schedule.postRecordSec} onChange={(e) => onChange({ ...schedule, postRecordSec: Number(e.target.value) })} />
        </label>
      </div>
    </>
  );
}
