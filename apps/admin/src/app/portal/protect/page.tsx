'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  EmergencyModeBanner,
  HoldToActivate,
  ProtectionStatusCard,
} from '@/components/ops/EmergencyMode';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { EmergencyCallButton } from '@/components/portal/EmergencyCallButton';
import { useApi } from '@/hooks/useApi';
import { clientApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { protectionStatusTone } from '@/lib/portal-priority';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';

type Overview = {
  user: { firstName: string; address: string | null };
  stats: {
    activeIncidents: number;
    unreadNotifications: number;
    familyCount: number;
  };
  properties: { id: string; name: string; alarmStatus: string; alarmLinked: boolean }[];
  family: { id: string; name: string; trackingEnabled: boolean }[];
  recentIncidents: { id: string; type: string; status: string; title: string; time: string }[];
};

export default function ProtectPage() {
  return (
    <PortalLayout>
      <ProtectContent />
    </PortalLayout>
  );
}

function ProtectContent() {
  const { access } = useSubscriptionAccess();
  const { data, loading, error, reload } = useApi(
    () => clientApi.get<ApiResponse<Overview>>('/client/overview'),
    [],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  async function send(kind: 'panic' | 'silent' | 'medical' | 'fire') {
    setBusy(kind);
    setMsg('');
    try {
      if (kind === 'panic' || kind === 'silent') {
        await clientApi.post('/client/panic', { silent: kind === 'silent' });
      } else if (kind === 'medical') {
        await clientApi.post('/client/medical/emergency', {});
      } else {
        await clientApi.post('/client/fire/emergency', {});
      }
      setEmergencyOpen(true);
      setMsg(
        kind === 'silent'
          ? 'Silent alert sent discreetly.'
          : kind === 'medical'
            ? 'Medical emergency requested.'
            : kind === 'fire'
              ? 'Fire emergency requested.'
              : 'Panic alert sent. Control room notified.',
      );
      void reload();
    } catch (e) {
      setMsg(friendlyErrorMessage(e, 'action'));
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading protect…" fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const d = data?.data;
  if (!d) return null;

  const critical =
    d.stats.activeIncidents > 0 ||
    d.recentIncidents.some((i) =>
      ['PANIC', 'MEDICAL', 'FIRE'].includes(i.type.toUpperCase()),
    );
  const tone = protectionStatusTone({
    activeIncidents: d.stats.activeIncidents,
    criticalIncidents: critical ? d.stats.activeIncidents : 0,
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Protect</h1>
          <p className="text-muted">Hold to activate — never a single tap.</p>
        </div>
        <Link href="/portal" className="link-sm">
          Back home
        </Link>
      </div>

      {(emergencyOpen || critical) && (
        <EmergencyModeBanner
          title={
            d.recentIncidents[0]
              ? d.recentIncidents[0].title
              : 'Emergency active'
          }
          detail="Control room has been notified. Stay on the line if safe."
          statusLine={
            d.user.address
              ? `Location shared · ${d.user.address}`
              : 'Location sharing active'
          }
          actions={
            <>
              <EmergencyCallButton name="4DS Dispatch" phone="+27110000000" isDispatch />
              <Link href="/portal/incidents" className="btn-sm btn-sm--link">
                View response
              </Link>
            </>
          }
          onDismiss={() => setEmergencyOpen(false)}
        />
      )}

      <ProtectionStatusCard
        tone={tone}
        title={
          tone === 'emergency'
            ? 'Emergency active'
            : tone === 'attention'
              ? 'Attention required'
              : 'You are protected'
        }
        lines={[
          `${d.stats.familyCount} family linked`,
          d.properties[0]
            ? `Home · ${d.properties[0].alarmStatus}`
            : 'Home security ready',
          msg || 'Hold Panic for 2 seconds only in a real emergency.',
        ]}
      />

      {access?.emergency !== false && (
        <div className="protect-grid">
          <div className="protect-tile protect-tile--panic">
            <HoldToActivate
              label="Panic"
              holdLabel="Sending panic…"
              loading={busy === 'panic'}
              onActivate={() => send('panic')}
            />
          </div>
          <button
            type="button"
            className="protect-tile"
            disabled={!!busy}
            onClick={() => void send('silent')}
          >
            <strong>Silent panic</strong>
            <span>Discreet alert to control room</span>
          </button>
          {access?.medical !== false && (
            <button
              type="button"
              className="protect-tile"
              disabled={!!busy}
              onClick={() => void send('medical')}
            >
              <strong>Medical</strong>
              <span>Request medical assistance</span>
            </button>
          )}
          <button
            type="button"
            className="protect-tile"
            disabled={!!busy}
            onClick={() => void send('fire')}
          >
            <strong>Fire</strong>
            <span>Fire emergency response</span>
          </button>
        </div>
      )}

      {msg ? <p className="alert alert--success">{msg}</p> : null}
    </div>
  );
}
