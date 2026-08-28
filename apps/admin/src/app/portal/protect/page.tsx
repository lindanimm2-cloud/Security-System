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
import { EmergencyCallButton, EmergencyDispatchCallCard } from '@/components/portal/EmergencyCallButton';
import { CONTROL_ROOM_LINE } from '@/lib/control-room-line';
import { EmergencyProtectionBanner } from '@/components/security/EmergencyProtectionBanner';
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
    <div className="page-content portal-dash">
      <div className="portal-dash__stage">
      <div className="page-header">
        <div>
          <h1>Protect</h1>
          <p className="text-muted">Hold to activate. Panic is the large control.</p>
        </div>
        <div className="sec-sheet__actions">
          <Link href="/portal" className="link-sm">
            Dashboard
          </Link>
          <Link href="/portal/security" className="link-sm">
            Protection file
          </Link>
        </div>
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
              <EmergencyCallButton
                name={CONTROL_ROOM_LINE.name}
                phone={CONTROL_ROOM_LINE.phone}
                isDispatch
              />
              <Link href="/portal/incidents" className="btn-sm btn-sm--link">
                View response
              </Link>
            </>
          }
          onDismiss={() => setEmergencyOpen(false)}
        />
      )}

      <EmergencyDispatchCallCard />

      {access?.emergency !== false && (
        <section className="panic-section panic-tray" aria-label="Emergency controls">
          <HoldToActivate
            label="Panic"
            holdLabel="Sending panic…"
            holdMs={3000}
            hideHint
            keepLabel
            loading={busy === 'panic'}
            disabled={!!busy && busy !== 'panic'}
            className="hold-activate--circle panic-knob"
            onActivate={() => send('panic')}
          >
            <span className="panic-knob__title">Panic</span>
            <span className="panic-knob__sub">Hold 3 seconds</span>
          </HoldToActivate>
          <p className="panic-note">Release to cancel</p>
          <div className="panic-orbit">
            <HoldToActivate
              label="Silent Panic. Hold 2 seconds to notify control room discreetly."
              holdMs={2000}
              tone="warn"
              hideHint
              keepLabel
              className="panic-orbit-btn panic-orbit-btn--silent panic-knob"
              loading={busy === 'silent'}
              disabled={!!busy && busy !== 'silent'}
              onActivate={() => send('silent')}
            >
              <span className="panic-knob__kicker">Hold 2s</span>
              <span className="panic-knob__title">Silent</span>
            </HoldToActivate>
            {access?.medical !== false && (
              <HoldToActivate
                label="Medical emergency. Hold 2 seconds."
                holdMs={2000}
                tone="medical"
                hideHint
                keepLabel
                className="panic-orbit-btn panic-orbit-btn--medical panic-knob"
                loading={busy === 'medical'}
                disabled={!!busy && busy !== 'medical'}
                onActivate={() => send('medical')}
              >
                <span className="panic-knob__kicker">Hold 2s</span>
                <span className="panic-knob__title">Medical</span>
              </HoldToActivate>
            )}
            <HoldToActivate
              label="Fire emergency. Hold 2 seconds."
              holdMs={2000}
              tone="warn"
              hideHint
              keepLabel
              className="panic-orbit-btn panic-orbit-btn--fire panic-knob"
              loading={busy === 'fire'}
              disabled={!!busy && busy !== 'fire'}
              onActivate={() => send('fire')}
            >
              <span className="panic-knob__kicker">Hold 2s</span>
              <span className="panic-knob__title">Fire</span>
            </HoldToActivate>
          </div>
        </section>
      )}

      {msg ? <p className="alert alert--success">{msg}</p> : null}

      <div className="portal-status-dock">
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
        <EmergencyProtectionBanner />
      </div>
      </div>
    </div>
  );
}
