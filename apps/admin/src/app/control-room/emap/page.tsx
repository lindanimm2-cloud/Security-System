'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CctvLiveFeed } from '@/components/portal/CctvLiveFeed';
import { ResourceTree, VMS_CAMERA_DRAG_TYPE } from '@/components/vms/ResourceTree';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { shouldBackgroundPoll } from '@/lib/demo/is-demo-mode';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { fetchVmsTree, VMS_ALARM_POLL_EVENT } from '@/lib/vms/api';
import {
  alarmTypeLabel,
  flattenCameras,
  formatDateTime,
  playbackHref,
  type AlarmFeedItem,
  type Floorplan,
  type VmsCamera,
  type VmsCameraPlacement,
} from '@/lib/vms/types';

const MAX_UPLOAD_BYTES = 2_500_000;

export default function EmapPage() {
  return (
    <ControlRoomLayout title="E-map">
      <EmapContent />
    </ControlRoomLayout>
  );
}

type Layers = { cameras: boolean; labels: boolean; fov: boolean; alarms: boolean };

function EmapContent() {
  const { data: treeRes, loading, error, reload: reloadTree } = useApi(() => fetchVmsTree(), []);
  const tree = treeRes?.data ?? null;
  const sites = useMemo(() => (tree?.sites ?? []).filter((s) => s.group === 'SITE'), [tree]);
  const cameras = useMemo(() => flattenCameras(tree), [tree]);
  const camById = useMemo(() => new Map(cameras.map((c) => [c.id, c])), [cameras]);

  const [siteId, setSiteId] = useState<string>('');
  const [planId, setPlanId] = useState<string>('');
  const [mode, setMode] = useState<'monitor' | 'edit'>('monitor');
  const [draft, setDraft] = useState<VmsCameraPlacement[] | null>(null);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layers>({ cameras: true, labels: true, fov: true, alarms: true });
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [dismissed, setDismissed] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!siteId && sites[0]) setSiteId(sites[0].id);
  }, [sites, siteId]);

  const { data: plansRes, reload: reloadPlans } = useApi(
    () =>
      siteId
        ? adminApi.get<ApiResponse<Floorplan[]>>(`/control-room/vms/floorplans?propertyId=${encodeURIComponent(siteId)}`)
        : Promise.resolve({ success: true, data: [] } as ApiResponse<Floorplan[]>),
    [siteId],
  );
  const plans = plansRes?.data ?? [];
  const plan = plans.find((p) => p.id === planId) ?? plans[0] ?? null;

  useEffect(() => {
    setDraft(null);
    setSelectedPin(null);
    setPreview(null);
  }, [plan?.id]);

  const { data: feedRes, reload: reloadFeed } = useApi(
    () => adminApi.get<ApiResponse<AlarmFeedItem[]>>('/control-room/vms/alarm-feed'),
    [],
  );
  useEffect(() => {
    const onPoll = () => void reloadFeed({ silent: true });
    window.addEventListener(VMS_ALARM_POLL_EVENT, onPoll);
    const id = shouldBackgroundPoll() ? window.setInterval(onPoll, 10_000) : null;
    return () => {
      window.removeEventListener(VMS_ALARM_POLL_EVENT, onPoll);
      if (id) window.clearInterval(id);
    };
  }, [reloadFeed]);

  const alarmsByCamera = useMemo(() => {
    const map = new Map<string, AlarmFeedItem>();
    for (const item of feedRes?.data ?? []) {
      if (item.siteId !== siteId || dismissed.includes(item.eventId)) continue;
      for (const cam of item.cameras) if (!map.has(cam.id)) map.set(cam.id, item);
    }
    return map;
  }, [feedRes, siteId, dismissed]);

  const placements = draft ?? plan?.placements ?? [];
  const placedIds = new Set(placements.map((p) => p.cameraId));
  const dirty = draft !== null;

  function startEdit() {
    setMode('edit');
    setPreview(null);
    setDraft(plan ? plan.placements.map((p) => ({ ...p })) : []);
  }

  function discard() {
    setDraft(null);
    setSelectedPin(null);
    setMode('monitor');
  }

  async function savePlacements() {
    if (!plan || !draft) return;
    setBusy(true);
    try {
      await adminApi.put(`/control-room/vms/floorplans/${plan.id}/placements`, { placements: draft });
      await reloadPlans({ silent: true });
      setDraft(null);
      setMode('monitor');
      setNotice({ tone: 'ok', text: `Saved ${draft.length} camera position${draft.length === 1 ? '' : 's'}.` });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setBusy(false);
    }
  }

  async function createPlan(imageUrl?: string) {
    if (!siteId) return;
    setBusy(true);
    try {
      const res = await adminApi.post<ApiResponse<Floorplan>>('/control-room/vms/floorplans', {
        propertyId: siteId,
        name: newName.trim() || 'Floor plan',
        imageUrl,
      });
      setNewName('');
      await reloadPlans({ silent: true });
      setPlanId(res.data.id);
      setNotice({ tone: 'ok', text: `Map “${res.data.name}” added. Switch to Edit to place cameras.` });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Could not add map' });
    } finally {
      setBusy(false);
    }
  }

  function onUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ tone: 'err', text: 'Upload a PNG, JPG or SVG floor plan.' });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setNotice({ tone: 'err', text: 'Floor plan images must be under 2.5 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (!newName.trim()) setNewName(file.name.replace(/\.[^.]+$/, ''));
      void createPlan(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  async function deletePlan() {
    if (!plan || !window.confirm(`Delete map “${plan.name}”? Camera positions on it will be lost.`)) return;
    try {
      await adminApi.delete(`/control-room/vms/floorplans/${plan.id}`);
      setPlanId('');
      setDraft(null);
      setMode('monitor');
      await reloadPlans({ silent: true });
    } catch (err) {
      setNotice({ tone: 'err', text: err instanceof Error ? err.message : 'Delete failed' });
    }
  }

  async function clearAlarm(item: AlarmFeedItem) {
    setDismissed((d) => [...d, item.eventId]);
    try {
      await adminApi.post('/control-room/alarm-history/ack', { ids: [item.eventId], remark: 'Cleared from E-map' });
      void reloadFeed({ silent: true });
    } catch {
      /* stays dismissed locally */
    }
  }

  const placeAt = useCallback((cameraId: string, x: number, y: number) => {
    setDraft((prev) => {
      const list = prev ?? [];
      const rest = list.filter((p) => p.cameraId !== cameraId);
      return [...rest, { cameraId, x, y }];
    });
    setSelectedPin(cameraId);
  }, []);

  if (loading) return <LoadingSpinner label="Loading maps…" />;
  if (error || !tree) return <ErrorAlert error={error ?? 'Failed to load'} onRetry={reloadTree} />;

  const site = sites.find((s) => s.id === siteId) ?? null;
  const previewCam = preview ? camById.get(preview) ?? null : null;
  const previewPlacement = preview ? placements.find((p) => p.cameraId === preview) : null;
  const previewAlarm = preview ? alarmsByCamera.get(preview) ?? null : null;
  const activeAlarms = Array.from(new Set(alarmsByCamera.values()));

  return (
    <div className="vms-page">
      <header className="vms-page__head">
        <label className="vms-field" style={{ minWidth: 220 }}>
          <span>Site</span>
          <select value={siteId} onChange={(e) => { setSiteId(e.target.value); setPlanId(''); setMode('monitor'); }}>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="vms-field" style={{ minWidth: 200 }}>
          <span>Map</span>
          <select value={plan?.id ?? ''} onChange={(e) => setPlanId(e.target.value)} disabled={plans.length === 0}>
            {plans.length === 0 ? <option value="">No maps yet</option> : null}
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="vms-seg" role="radiogroup" aria-label="Map mode">
          <button type="button" role="radio" aria-checked={mode === 'monitor'} className={mode === 'monitor' ? 'is-on' : ''} onClick={() => (dirty ? discard() : setMode('monitor'))}>
            Monitor
          </button>
          <button type="button" role="radio" aria-checked={mode === 'edit'} className={mode === 'edit' ? 'is-on' : ''} disabled={!plan} onClick={startEdit}>
            Edit
          </button>
        </div>
        <div className="vms-page__meta">
          {activeAlarms.length > 0 ? <span className="vms-pill vms-pill--alarm">{activeAlarms.length} active alarm{activeAlarms.length === 1 ? '' : 's'}</span> : null}
          {tree.demo ? <span className="vms-badge">Demo</span> : null}
          {mode === 'edit' ? (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={discard}>
                Discard
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || busy} onClick={() => void savePlacements()}>
                {busy ? 'Saving…' : 'Save positions'}
              </button>
            </>
          ) : (
            <Link href={`${CONTROL_ROOM_ROUTES.surveillance}${siteId ? `?site=${siteId}` : ''}`} className="btn btn-ghost btn-sm">
              Open site in live view
            </Link>
          )}
        </div>
      </header>
      {notice ? (
        <p className={`vms-banner ${notice.tone === 'ok' ? 'vms-banner--info' : ''}`} role="status">
          {notice.text}
          <button type="button" className="vms-link" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      <div className="vms-emap">
        <div className="vms-work__tree" style={{ overflow: 'auto' }}>
          {mode === 'edit' ? (
            <>
              <p className="vms-muted" style={{ margin: '10px 12px 0' }}>
                Drag cameras onto the plan. Drag pins to move them; select a pin and press Delete to remove it.
              </p>
              <ResourceTree tree={tree} siteFilter={siteId} groups={['SITE']} draggable title="Site cameras" activeId={selectedPin} onOpen={(c) => placeAt(c.id, 0.5, 0.5)} />
            </>
          ) : (
            <>
              <div className="vms-card" style={{ margin: 10 }}>
                <h3>Layers</h3>
                {(
                  [
                    ['cameras', 'Cameras'],
                    ['labels', 'Camera names'],
                    ['fov', 'Field of view'],
                    ['alarms', 'Alarm highlights'],
                  ] as Array<[keyof Layers, string]>
                ).map(([key, label]) => (
                  <label key={key} className="vms-check">
                    <input type="checkbox" checked={layers[key]} onChange={(e) => setLayers((l) => ({ ...l, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
              <div className="vms-card" style={{ margin: '0 10px 10px' }}>
                <h3>Active alarms</h3>
                {activeAlarms.length === 0 ? <p className="vms-muted">No camera alarms at {site?.name ?? 'this site'}.</p> : null}
                <ul className="vms-list">
                  {activeAlarms.map((a) => (
                    <li key={a.eventId} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <strong>{alarmTypeLabel(a.type)}</strong>
                      <span className="vms-sub">
                        {a.cameras.map((c) => c.name).join(', ')} · {formatDateTime(a.triggeredAt)}
                      </span>
                      <span className="vms-actions">
                        <button type="button" className="vms-link" onClick={() => setPreview(a.cameras[0]?.id ?? null)}>
                          Show
                        </button>
                        <button type="button" className="vms-link" onClick={() => void clearAlarm(a)}>
                          Clear alarm
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="vms-card" style={{ margin: '0 10px 10px' }}>
                <h3>Add map</h3>
                <input className="vms-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ground floor" aria-label="Map name" maxLength={60} />
                <div className="vms-actions">
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !siteId} onClick={() => fileRef.current?.click()}>
                    Upload image
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !siteId} onClick={() => void createPlan()}>
                    Use sample plan
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ''; }} />
                {plan ? (
                  <button type="button" className="vms-link vms-link--danger" onClick={() => void deletePlan()} style={{ alignSelf: 'flex-start' }}>
                    Delete “{plan.name}”
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="vms-emap__canvas-wrap">
          {plan ? (
            <PlanCanvas
              plan={plan}
              placements={placements}
              camById={camById}
              editing={mode === 'edit'}
              layers={layers}
              alarmIds={new Set(alarmsByCamera.keys())}
              selectedPin={selectedPin}
              onSelectPin={setSelectedPin}
              onPlace={placeAt}
              onRemove={(id) => {
                setDraft((prev) => (prev ?? []).filter((p) => p.cameraId !== id));
                setSelectedPin(null);
              }}
              onOpen={(id) => setPreview(id)}
              preview={
                previewCam && previewPlacement && mode === 'monitor' ? (
                  <PinPreview
                    camera={previewCam}
                    placement={previewPlacement}
                    alarm={previewAlarm}
                    onClose={() => setPreview(null)}
                    onClear={previewAlarm ? () => void clearAlarm(previewAlarm) : undefined}
                  />
                ) : null
              }
            />
          ) : (
            <div className="vms-emap__canvas">
              <div className="vms-emap__empty">
                <strong>No map for {site?.name ?? 'this site'} yet</strong>
                <span>Upload a floor plan or site layout, then place cameras on it to monitor them spatially.</span>
                <div className="vms-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={!siteId}>
                    Upload floor plan
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => void createPlan()} disabled={!siteId}>
                    Use sample plan
                  </button>
                </div>
              </div>
            </div>
          )}
          {mode === 'edit' && plan ? (
            <div className="vms-toolbar vms-toolbar--foot">
              <span className="vms-muted">
                {placements.length} placed · {cameras.filter((c) => c.siteId === siteId && !placedIds.has(c.id)).length} not on map
              </span>
              {selectedPin ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setDraft((prev) => (prev ?? []).filter((p) => p.cameraId !== selectedPin));
                    setSelectedPin(null);
                  }}
                >
                  Remove {camById.get(selectedPin)?.name ?? 'pin'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PlanCanvas({
  plan,
  placements,
  camById,
  editing,
  layers,
  alarmIds,
  selectedPin,
  onSelectPin,
  onPlace,
  onRemove,
  onOpen,
  preview,
}: {
  plan: Floorplan;
  placements: VmsCameraPlacement[];
  camById: Map<string, VmsCamera>;
  editing: boolean;
  layers: Layers;
  alarmIds: Set<string>;
  selectedPin: string | null;
  onSelectPin: (id: string | null) => void;
  onPlace: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
  preview: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(16 / 10);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [dropping, setDropping] = useState(false);
  const dragRef = useRef<string | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      const pad = 24;
      const w = Math.max(0, width - pad);
      const h = Math.max(0, height - pad);
      if (w / h > ratio) setBox({ w: h * ratio, h });
      else setBox({ w, h: w / ratio });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);

  useEffect(() => {
    if (!editing || !selectedPin) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        onRemove(selectedPin);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, selectedPin, onRemove]);

  function rel(clientX: number, clientY: number) {
    const rect = planRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return { x: 0.5, y: 0.5 };
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }

  return (
    <div ref={wrapRef} className="vms-emap__canvas" onClick={() => editing && onSelectPin(null)}>
      <div
        ref={planRef}
        className={`vms-emap__plan ${dropping ? 'is-drop' : ''}`}
        style={{ width: box.w, height: box.h, aspectRatio: 'auto' }}
        onDragOver={(e) => {
          if (!editing) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(e) => {
          setDropping(false);
          if (!editing) return;
          const id = e.dataTransfer.getData(VMS_CAMERA_DRAG_TYPE) || e.dataTransfer.getData('text/plain');
          if (!id || !camById.has(id)) return;
          e.preventDefault();
          const { x, y } = rel(e.clientX, e.clientY);
          onPlace(id, x, y);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plan.imageUrl}
          alt={`${plan.name} floor plan`}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
          }}
          draggable={false}
        />
        {layers.cameras || editing
          ? placements.map((p) => {
              const cam = camById.get(p.cameraId);
              if (!cam) return null;
              const offline = cam.status.toUpperCase() === 'OFFLINE';
              const alarm = layers.alarms && alarmIds.has(cam.id);
              return (
                <button
                  key={p.cameraId}
                  type="button"
                  className={`vms-pin ${offline ? 'vms-pin--offline' : ''} ${alarm ? 'vms-pin--alarm' : ''} ${editing ? 'is-editing' : ''} ${selectedPin === cam.id ? 'is-selected' : ''}`}
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                  title={`${cam.name}${offline ? ' · offline' : ''}${alarm ? ' · ALARM' : ''}`}
                  aria-label={`${cam.name}${alarm ? ', alarm active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editing) onSelectPin(cam.id);
                    else onOpen(cam.id);
                  }}
                  onPointerDown={(e) => {
                    if (!editing) return;
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    dragRef.current = cam.id;
                    onSelectPin(cam.id);
                  }}
                  onPointerMove={(e) => {
                    if (dragRef.current !== cam.id) return;
                    const { x, y } = rel(e.clientX, e.clientY);
                    onPlace(cam.id, x, y);
                  }}
                  onPointerUp={() => {
                    dragRef.current = null;
                  }}
                >
                  {layers.fov ? <span className="vms-pin__fov" aria-hidden /> : null}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="3" y="7" width="13" height="10" rx="2" />
                    <path d="m16 10 5-3v10l-5-3" />
                  </svg>
                  {layers.labels ? <span className="vms-pin__label">{cam.name}</span> : null}
                </button>
              );
            })
          : null}
        {preview}
      </div>
    </div>
  );
}

function PinPreview({
  camera,
  placement,
  alarm,
  onClose,
  onClear,
}: {
  camera: VmsCamera;
  placement: VmsCameraPlacement;
  alarm: AlarmFeedItem | null;
  onClose: () => void;
  onClear?: () => void;
}) {
  const left = placement.x > 0.6 ? `calc(${placement.x * 100}% - 340px)` : `calc(${placement.x * 100}% + 20px)`;
  const top = placement.y > 0.55 ? `calc(${placement.y * 100}% - 250px)` : `calc(${placement.y * 100}% - 20px)`;
  return (
    <div className="vms-emap__preview" style={{ left, top }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${camera.name} preview`}>
      <div className="vms-emap__preview-head">
        <span className={`vms-dot ${camera.status.toUpperCase() === 'OFFLINE' ? 'vms-dot--off' : ''}`} aria-hidden />
        <strong>{camera.name}</strong>
        {alarm ? <span className="vms-pill vms-pill--alarm">{alarmTypeLabel(alarm.type)}</span> : null}
        <button type="button" className="vms-icon-btn vms-icon-btn--sm" onClick={onClose} aria-label="Close preview">
          ×
        </button>
      </div>
      <div className="vms-emap__preview-video">
        <CctvLiveFeed camera={camera} compact onSelect={() => undefined} />
      </div>
      <div className="vms-emap__preview-foot">
        <Link
          href={playbackHref({ cameraIds: [camera.id], at: alarm?.triggeredAt, siteId: camera.siteId })}
          className="btn btn-ghost btn-sm"
        >
          {alarm ? 'Playback at alarm' : 'Playback'}
        </Link>
        <Link href={`${CONTROL_ROOM_ROUTES.surveillance}?site=${camera.siteId}`} className="btn btn-ghost btn-sm">
          Live view
        </Link>
        {onClear ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={onClear}>
            Clear alarm
          </button>
        ) : null}
      </div>
    </div>
  );
}
