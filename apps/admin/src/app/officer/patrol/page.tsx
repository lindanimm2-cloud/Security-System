'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import type {
  OfficerPatrolShift,
  PatrolPhotoStop,
} from '@/lib/demo/demo-patrol-shift';

type PatrolShiftPayload = {
  shift: OfficerPatrolShift;
  summary: {
    totalStops: number;
    requiredTotal: number;
    requiredDone: number;
    requiredRemaining: number;
    optionalDone: number;
    photosTaken: number;
    progressPct: number;
  };
};

export default function OfficerPatrolPage() {
  return (
    <OfficerLayout title="Patrol Photos">
      <PatrolContent />
    </OfficerLayout>
  );
}

function PatrolContent() {
  const { data, loading, error, reload } = useApi(
    () => officerApi.get<ApiResponse<PatrolShiftPayload>>('/officer/patrol/shift'),
    [],
  );
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'required' | 'all'>('required');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const payload = data?.data;
  const shift = payload?.shift;
  const summary = payload?.summary;

  const stops = useMemo(() => {
    if (!shift) return [];
    const list = filter === 'required' ? shift.stops.filter((s) => s.required) : shift.stops;
    return [...list].sort((a, b) => {
      if (a.status === b.status) return 0;
      if (a.status === 'PENDING') return -1;
      if (b.status === 'PENDING') return 1;
      return 0;
    });
  }, [shift, filter]);

  const activeStop = shift?.stops.find((s) => s.id === activeStopId) ?? null;

  const openCamera = useCallback((stopId: string) => {
    setActiveStopId(stopId);
    setMsg('');
    setNote('');
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    window.setTimeout(() => photoInputRef.current?.click(), 50);
  }, []);

  function onFilePicked(file: File | null | undefined) {
    if (!file) return;
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
  }

  async function fileToDataUrl(file: File): Promise<string | undefined> {
    if (file.size >= 4_000_000) return undefined;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function getGps(): Promise<{ lat: number; lng: number } | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 4000 },
      );
    });
  }

  async function savePhoto() {
    if (!activeStop || !preview) return;
    setUploading(true);
    setMsg('');
    try {
      const dataUrl = await fileToDataUrl(preview.file);
      const gps = await getGps();
      await officerApi.post(`/officer/patrol/stops/${activeStop.id}/photo`, {
        fileName: preview.file.name || `patrol-${activeStop.id}-${Date.now()}.jpg`,
        fileType: preview.file.type,
        note: note.trim() || undefined,
        capturedAt: new Date().toISOString(),
        lat: gps?.lat ?? null,
        lng: gps?.lng ?? null,
        dataUrl,
        fileSizeKb: Math.round(preview.file.size / 1024),
      });
      const willComplete = activeStop.photos.length + 1 >= activeStop.minPhotos;
      setMsg(`Photo saved for ${activeStop.siteName}.`);
      URL.revokeObjectURL(preview.url);
      setPreview(null);
      setNote('');
      if (willComplete) {
        setActiveStopId(null);
      }
      await reload({ silent: true });
    } catch (e) {
      setMsg(friendlyErrorMessage(e, 'upload'));
    } finally {
      setUploading(false);
    }
  }

  function discardPreview() {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }

  if (loading) return <LoadingSpinner label="Loading patrol stops…" fullScreen />;
  if (error || !shift || !summary) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <div className="officer-patrol">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          onFilePicked(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <header className="officer-patrol__hero portal-card">
        <div className="officer-patrol__hero-top">
          <div>
            <p className="officer-patrol__kicker">Shift patrol</p>
            <h2>{shift.shiftLabel}</h2>
            <p className="text-muted">{shift.notes}</p>
          </div>
          <StatusBadge
            tone={summary.requiredRemaining === 0 ? 'success' : 'warning'}
            label={
              summary.requiredRemaining === 0
                ? 'Required complete'
                : `${summary.requiredRemaining} required left`
            }
          />
        </div>
        <ProgressBar
          value={summary.requiredDone}
          max={Math.max(1, summary.requiredTotal)}
          label={`${summary.requiredDone}/${summary.requiredTotal} required sites photographed`}
          tone={summary.requiredRemaining === 0 ? 'success' : 'accent'}
        />
        <div className="officer-patrol__stats">
          <span>{summary.photosTaken} photos taken</span>
          <span>{summary.optionalDone} optional logged</span>
          <span>
            Ends{' '}
            {new Date(shift.endsAt).toLocaleTimeString('en-ZA', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </header>

      {msg ? (
        <div className={`alert ${msg.includes('saved') ? 'alert--success' : 'alert--error'}`}>
          {msg}
        </div>
      ) : null}

      {preview && activeStop ? (
        <section className="officer-patrol__preview portal-card">
          <h3>Review — {activeStop.siteName}</h3>
          <p className="text-muted">{activeStop.instruction}</p>
          <img src={preview.url} alt="Patrol site preview" className="officer-patrol__preview-img" />
          <label className="officer-patrol__note">
            <span>Note (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Front gate, house number visible"
              maxLength={120}
            />
          </label>
          <div className="officer-patrol__preview-acts">
            <button
              type="button"
              className="btn-primary"
              disabled={uploading}
              onClick={() => void savePhoto()}
            >
              {uploading ? <LoadingSpinner label="" size="sm" /> : 'Save site photo'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={uploading}
              onClick={() => {
                discardPreview();
                openCamera(activeStop.id);
              }}
            >
              Retake
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={uploading}
              onClick={() => {
                discardPreview();
                setActiveStopId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <div className="officer-patrol__filters" role="tablist" aria-label="Patrol filter">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'required'}
          className={filter === 'required' ? 'is-on' : ''}
          onClick={() => setFilter('required')}
        >
          Required ({summary.requiredTotal})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={filter === 'all' ? 'is-on' : ''}
          onClick={() => setFilter('all')}
        >
          All stops ({shift.stops.length})
        </button>
      </div>

      <ul className="officer-patrol__list">
        {stops.map((stop) => (
          <PatrolStopCard
            key={stop.id}
            stop={stop}
            active={activeStopId === stop.id && !preview}
            onCapture={() => openCamera(stop.id)}
            onSelect={() => setActiveStopId(stop.id === activeStopId ? null : stop.id)}
          />
        ))}
      </ul>

      <p className="officer-patrol__foot text-muted">
        Photos are stamped with time and GPS (when permitted) and shared with the control room.
        <Link href="/officer/record"> Open general evidence capture</Link>
      </p>
    </div>
  );
}

function PatrolStopCard({
  stop,
  active,
  onCapture,
  onSelect,
}: {
  stop: PatrolPhotoStop;
  active: boolean;
  onCapture: () => void;
  onSelect: () => void;
}) {
  const remaining = Math.max(0, stop.minPhotos - stop.photos.length);
  const done = stop.status === 'DONE';

  return (
    <li className={`officer-patrol__card portal-card ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}>
      <button type="button" className="officer-patrol__card-hit" onClick={onSelect}>
        <div className="officer-patrol__card-head">
          <StatusBadge
            tone={done ? 'success' : stop.required ? 'warning' : 'neutral'}
            label={done ? 'Done' : stop.required ? 'Required' : 'Optional'}
          />
          <span className="officer-patrol__due">{stop.dueLabel}</span>
        </div>
        <strong>{stop.siteName}</strong>
        <span className="text-muted">
          {stop.address} · {stop.zone}
        </span>
        <p>{stop.instruction}</p>
        <div className="officer-patrol__card-meta">
          <span>
            {stop.photos.length}/{stop.minPhotos} photo{stop.minPhotos === 1 ? '' : 's'}
          </span>
          {remaining > 0 ? <span>{remaining} still needed</span> : <span>Requirement met</span>}
        </div>
      </button>

      {stop.photos.length > 0 ? (
        <ul className="officer-patrol__thumbs">
          {stop.photos.map((ph) => (
            <li key={ph.id}>
              {ph.dataUrl ? (
                <img src={ph.dataUrl} alt={ph.note || ph.fileName || 'Site photo'} />
              ) : (
                <span className="officer-patrol__thumb-fallback" title={ph.fileName}>
                  📷
                </span>
              )}
              <em>
                {ph.note || 'Site photo'} ·{' '}
                {new Date(ph.capturedAt).toLocaleTimeString('en-ZA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </em>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="officer-patrol__card-acts">
        <button type="button" className="btn-primary" onClick={onCapture}>
          {done ? 'Add another photo' : 'Take site photo'}
        </button>
        {!done && stop.required ? (
          <span className="officer-patrol__need">Required this shift</span>
        ) : null}
      </div>
    </li>
  );
}
