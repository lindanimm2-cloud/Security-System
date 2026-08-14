'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useMediaCapture } from '@/hooks/useMediaCapture';
import { useOfficerActiveIncident } from '@/hooks/useOfficerActiveIncident';
import { officerApi } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';

export default function OfficerRecordPage() {
  return (
    <OfficerLayout title="Quick Record">
      <RecordContent />
    </OfficerLayout>
  );
}

function RecordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quick = searchParams.get('quick') === '1';

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const quickTriggered = useRef(false);
  const nativePendingRef = useRef(false);

  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: assignmentData } = useOfficerActiveIncident();
  const assignment = assignmentData?.data;

  const {
    mode,
    recording,
    previewUrl,
    previewType,
    previewFile,
    cameraError,
    videoRef,
    startLiveCamera,
    startRecording,
    stopRecording,
    cancelLive,
    acceptNativeFile,
    discardPreview,
    reset,
  } = useMediaCapture();

  const exitFlow = useCallback(async () => {
    await reset();
    router.push('/officer');
  }, [reset, router]);

  const exitIfQuickIdle = useCallback(async () => {
    if (!quick) return;
    if (mode === 'choose' && !previewFile) {
      await exitFlow();
    }
  }, [mode, previewFile, exitFlow, quick]);

  useEffect(() => {
    if (!quick || quickTriggered.current) return;
    quickTriggered.current = true;
    if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      nativePendingRef.current = true;
      videoInputRef.current?.click();
    } else {
      void startLiveCamera();
    }
  }, [quick, startLiveCamera]);

  useEffect(() => {
    const onFocus = () => {
      window.setTimeout(() => {
        if (!nativePendingRef.current) return;
        nativePendingRef.current = false;
        void exitIfQuickIdle();
      }, 400);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [exitIfQuickIdle]);

  function openNativeInput(type: 'photo' | 'video') {
    nativePendingRef.current = true;
    const input = type === 'photo' ? photoInputRef.current : videoInputRef.current;
    input?.click();
  }

  function handleNativeChange(file: File | null | undefined, type: 'photo' | 'video') {
    nativePendingRef.current = false;
    if (!file) {
      void exitIfQuickIdle();
      return;
    }
    acceptNativeFile(file, type);
  }

  async function handleCancelLive() {
    await cancelLive();
    if (quick) await exitFlow();
  }

  async function handleDiscard() {
    await discardPreview();
    if (quick) await exitFlow();
  }

  async function saveEvidence() {
    if (!previewFile) return;
    setUploading(true);
    setMsg('');
    try {
      let dataUrl: string | undefined;
      if (previewType === 'photo' && previewFile.size < 4_000_000) {
        dataUrl = await fileToDataUrl(previewFile);
      }
      let gps: { lat: number; lng: number } | null = null;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        gps = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 4000 },
          );
        });
      }
      const capturedAt = new Date().toISOString();
      await officerApi.post('/officer/evidence', {
        fileName: previewFile.name,
        fileType: previewFile.type,
        title: `Field ${previewType} — ${new Date(capturedAt).toLocaleString('en-ZA')}`,
        incidentId: assignment?.incidentId,
        capturedAt,
        lat: gps?.lat ?? null,
        lng: gps?.lng ?? null,
        dataUrl,
        fileSizeKb: Math.round(previewFile.size / 1024),
      });
      setMsg('Evidence saved and linked to dispatch.');
      await reset();
      window.setTimeout(() => router.push('/officer'), 800);
    } catch (e) {
      setMsg(friendlyErrorMessage(e, 'upload'));
    } finally {
      setUploading(false);
    }
  }

  const showAssignmentBanner = assignment && (mode === 'live' || mode === 'preview');

  return (
    <div className="officer-record">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          handleNativeChange(e.target.files?.[0], 'photo');
          e.target.value = '';
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          handleNativeChange(e.target.files?.[0], 'video');
          e.target.value = '';
        }}
      />

      {showAssignmentBanner && (
        <div className="officer-record__assignment" role="status">
          {recording ? (
            <>
              Recording for <strong>{assignment.type}</strong> — {assignment.client}
            </>
          ) : (
            <>
              Evidence for <strong>{assignment.type}</strong> — {assignment.client}
            </>
          )}
          {assignment.address && <span className="text-muted"> · {assignment.address}</span>}
        </div>
      )}

      {msg && (
        <div className={`alert ${msg.includes('saved') ? 'alert--success' : 'alert--error'}`}>{msg}</div>
      )}
      {cameraError && <ErrorAlert error={cameraError} />}

      {mode === 'choose' && (
        <section className="officer-record__chooser portal-card">
          <h2>Quick evidence capture</h2>
          <p className="text-muted">
            Open your camera when you are on scene. Evidence is saved to the document library
            {assignment ? ' and linked to your active incident' : ''}.
          </p>
          {assignment && (
            <p className="officer-record__linked-incident text-muted">
              Active incident: <strong>{assignment.type}</strong> — {assignment.client}
            </p>
          )}
          <div className="officer-record__actions">
            <button type="button" className="officer-record-btn officer-record-btn--video" onClick={() => openNativeInput('video')}>
              <span className="officer-record-btn__icon">🎥</span>
              Record video
              <span className="officer-record-btn__hint">Opens phone camera</span>
            </button>
            <button type="button" className="officer-record-btn officer-record-btn--photo" onClick={() => openNativeInput('photo')}>
              <span className="officer-record-btn__icon">📷</span>
              Take photo
              <span className="officer-record-btn__hint">Rear camera</span>
            </button>
            <button type="button" className="officer-record-btn officer-record-btn--live" onClick={() => void startLiveCamera()}>
              <span className="officer-record-btn__icon">●</span>
              Live camera
              <span className="officer-record-btn__hint">In-browser preview</span>
            </button>
          </div>
          <button type="button" className="link-sm" onClick={() => void exitFlow()}>
            Back to dashboard
          </button>
        </section>
      )}

      {mode === 'live' && (
        <section className="officer-record__live">
          <video ref={videoRef} className="officer-record__video" playsInline muted autoPlay />
          <div className="officer-record__live-controls">
            {!recording ? (
              <button type="button" className="officer-record-shutter" onClick={startRecording} aria-label="Start recording">
                <span />
              </button>
            ) : (
              <button type="button" className="officer-record-shutter officer-record-shutter--active" onClick={stopRecording} aria-label="Stop recording">
                <span />
              </button>
            )}
            <p className="officer-record__status">
              {recording ? 'Recording… tap to stop' : 'Tap to record'}
            </p>
            <button type="button" className="btn-ghost" onClick={() => void handleCancelLive()}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {mode === 'preview' && previewUrl && (
        <section className="officer-record__preview portal-card">
          <h2>Review capture</h2>
          <p className="text-muted" style={{ fontSize: '0.8rem' }}>
            Metadata · {new Date().toLocaleString('en-ZA')}
            {assignment?.incidentId ? ` · incident ${assignment.incidentId}` : ' · no incident linked'}
            {' · GPS attached if permitted'}
          </p>
          {previewType === 'photo' ? (
            <img src={previewUrl} alt="Captured evidence" className="officer-record__preview-media" />
          ) : (
            <video src={previewUrl} controls className="officer-record__preview-media" />
          )}
          <div className="officer-record__preview-actions">
            <button type="button" className="btn-primary" onClick={() => void saveEvidence()} disabled={uploading}>
              {uploading ? <LoadingSpinner label="" size="sm" /> : 'Save to dispatch'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => void handleDiscard()} disabled={uploading}>
              Retake
            </button>
            <button type="button" className="btn-ghost" onClick={() => void exitFlow()} disabled={uploading}>
              Discard & close
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
