'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { EmergencyDispatchCallCard } from '@/components/portal/EmergencyCallButton';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';
import { useApi } from '@/hooks/useApi';
import { usePlatformEvents } from '@/hooks/usePlatformEvents';
import { useCallsOptional } from '@/components/calls/CallProvider';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import {
  formatEtaClock,
  LIVE_RESPONSE_PIPELINE,
  stageFromIncidentStatus,
  stageIndex,
  type LiveResponseStage,
} from '@/lib/live-response';
import { showClientEmergencyNotification } from '@/lib/client-push';

type LivePayload = {
  id: string;
  publicRef: string;
  type: string;
  status: string;
  title: string | null;
  address: string | null;
  isSilent: boolean;
  priority: string;
  ackedAt: string | null;
  dispatchedAt: string | null;
  onSceneAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  lat: number;
  lng: number;
  unit: {
    callSign: string;
    kind: string;
    status: string;
    etaSeconds: number | null;
    officerName: string | null;
  } | null;
  stage: LiveResponseStage;
  headline: string;
  detail: string;
  timeline: { id: string; type: string; createdAt: string; source: string }[];
};

export default function LiveResponsePage() {
  return (
    <PortalLayout>
      <LiveResponseContent />
    </PortalLayout>
  );
}

function LiveResponseContent() {
  const params = useParams();
  const router = useRouter();
  const incidentId = String(params.incidentId ?? '');
  const calls = useCallsOptional();
  const [tick, setTick] = useState(0);

  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<LivePayload>>(`/client/incidents/${incidentId}/live`),
    [incidentId, tick],
  );

  const refresh = useCallback(() => {
    setTick((n) => n + 1);
    void reload({ silent: true });
  }, [reload]);

  usePlatformEvents(
    'client',
    [
      'incident.created',
      'incident.updated',
      'incident.assigned',
      'incident.acknowledged',
      'incident.resolved',
      'dispatch.created',
      'dispatch.accepted',
      'dispatch.en_route',
      'dispatch.arrived',
      'dispatch.completed',
      'panic.created',
      'panic.cancelled',
      'notification:new',
    ],
    (payload) => {
      const id = String(payload.incidentId ?? payload.id ?? '');
      if (id && id !== incidentId) return;
      refresh();
    },
    incidentId,
  );

  const live = data?.data;

  useEffect(() => {
    if (!live) return;
    void showClientEmergencyNotification({
      title: live.headline,
      body: live.detail,
      tag: `live-${live.id}-${live.stage}`,
      deepLink: `/portal/response/${live.id}`,
      urgency: live.stage === 'RESOLVED' || live.stage === 'CLOSED' ? 'normal' : 'critical',
      kind: live.stage === 'RESOLVED' || live.stage === 'CLOSED' ? 'normal' : 'panic',
    });
  }, [live?.id, live?.stage, live?.headline, live?.detail]);

  const stage = useMemo(() => {
    if (!live) return 'RECEIVED' as LiveResponseStage;
    return (
      live.stage ||
      stageFromIncidentStatus(live.status, {
        ackedAt: live.ackedAt,
        dispatchStatus: live.unit?.status,
        etaSeconds: live.unit?.etaSeconds,
      })
    );
  }, [live]);

  const activeIdx = stageIndex(stage);
  const eta = formatEtaClock(live?.unit?.etaSeconds);
  const resolved = stage === 'RESOLVED' || stage === 'CLOSED';

  async function callDispatch() {
    const phone = '+27860000000';
    if (calls?.portal) {
      try {
        await calls.startCall('DISPATCH_LINE', {
          name: 'Control Room',
          phone,
          role: 'DISPATCH',
        });
        return;
      } catch {
        /* fall through to tel: */
      }
    }
    window.location.href = `tel:${phone}`;
  }

  if (loading && !live) return <LoadingSpinner label="Opening live response…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={refresh} />;
  if (!live) {
    return (
      <div className="page-content">
        <div className="dash-clear">
          <strong>Response not found</strong>
          <p className="text-muted">This incident may have closed or you no longer have access.</p>
          <Link href="/portal/incidents" className="btn-sm">
            Incident history
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-content live-response ${resolved ? 'live-response--resolved' : 'live-response--active'}`}>
      <header className="live-response__hero">
        <p className="live-response__kicker">
          {live.isSilent ? 'Silent alert' : '4DS security response'}
          {live.publicRef ? ` · ${live.publicRef}` : ''}
        </p>
        <h1>{live.headline}</h1>
        <p className="live-response__detail">{live.detail}</p>
        {live.address ? <p className="live-response__loc">📍 {live.address}</p> : null}
      </header>

      <ol className="live-response__pipeline" aria-label="Response progress">
        {LIVE_RESPONSE_PIPELINE.map((step, idx) => {
          const state = idx < activeIdx ? 'done' : idx === activeIdx ? 'current' : 'todo';
          return (
            <li key={step.id} className={`live-response__step live-response__step--${state}`}>
              <span className="live-response__dot" aria-hidden />
              <span className="live-response__step-label">{step.label}</span>
            </li>
          );
        })}
      </ol>

      <section className="live-response__unit portal-card">
        <p className="dash-ops__eyebrow">Responding unit</p>
        {live.unit ? (
          <>
            <h2>{live.unit.callSign}</h2>
            <p className="text-muted">
              {(live.unit.officerName || live.unit.kind).replace(/_/g, ' ')} ·{' '}
              {live.unit.status.replace(/_/g, ' ')}
              {eta ? ` · ETA ${eta}` : ''}
            </p>
            {eta ? (
              <p className="live-response__eta" aria-live="polite">
                ETA <strong>{eta}</strong>
              </p>
            ) : (
              <p className="text-muted">ETA will appear when the unit is en route.</p>
            )}
          </>
        ) : (
          <>
            <h2>Assigning response</h2>
            <p className="text-muted">Control room is notifying the nearest available unit.</p>
          </>
        )}
      </section>

      <div className="live-response__actions">
        <button type="button" className="ops-act ops-act--dispatch" onClick={() => void callDispatch()}>
          Call control room
        </button>
        <Link
          href={`/portal/location`}
          className="ops-act"
        >
          Share my location
        </Link>
        <Link href={`/portal/incidents`} className="ops-act">
          Incident file
        </Link>
        <button type="button" className="ops-act" onClick={() => router.push('/portal')}>
          Dashboard
        </button>
      </div>

      <EmergencyDispatchCallCard />

      {live.timeline?.length ? (
        <section className="portal-card live-response__timeline">
          <p className="dash-ops__eyebrow">Live updates</p>
          <ul>
            {live.timeline.map((ev) => (
              <li key={ev.id}>
                <time>
                  {new Date(ev.createdAt).toLocaleTimeString('en-ZA', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <span>{ev.type.replace(/[._]/g, ' ')}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
