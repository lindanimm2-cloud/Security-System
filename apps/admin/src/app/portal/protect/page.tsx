'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  EmergencyModeBanner,
  ProtectionStatusCard,
} from '@/components/ops/EmergencyMode';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { EmergencyCallButton, EmergencyDispatchCallCard } from '@/components/portal/EmergencyCallButton';
import { CONTROL_ROOM_LINE } from '@/lib/control-room-line';
import { EmergencyProtectionBanner } from '@/components/security/EmergencyProtectionBanner';
import { PanicNeuConsole, type PanicNeuBusy } from '@/components/portal/PanicNeuConsole';
import { OpsUndoToast, useUndoToast } from '@/components/ops/OpsUndoToast';
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
  const undo = useUndoToast();

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
      if (kind === 'panic') {
        undo.show('Panic alert sent', async () => {
          await clientApi.post('/client/panic/cancel');
          void reload();
        }, { kind: 'critical', detail: 'Control room notified · help is on the way' });
      } else if (kind === 'silent') {
        undo.show('Silent alert sent', async () => {
          await clientApi.post('/client/panic/cancel');
          void reload();
        }, { kind: 'silent', detail: 'Sent discreetly' });
      } else if (kind === 'medical') {
        undo.show('Ambulance requested', undefined, {
          kind: 'medical',
          detail: 'Medical profile shared with responders',
        });
      } else {
        undo.show('Fire response requested', undefined, {
          kind: 'fire',
          detail: 'Dispatch and fire unit notified',
        });
      }
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
              ? `Location · ${d.user.address}`
              : 'Location sharing active'
          }
          liveLabel="Live · control room"
          primaryAction={
            <EmergencyCallButton
              name={CONTROL_ROOM_LINE.name}
              phone={CONTROL_ROOM_LINE.phone}
              isDispatch
              size="lg"
            />
          }
          actions={
            <Link href="/portal/incidents">View response</Link>
          }
          onDismiss={() => setEmergencyOpen(false)}
        />
      )}

      <EmergencyDispatchCallCard />

      {access?.emergency !== false && (
        <PanicNeuConsole
          className="panic-section"
          showMedical={access?.medical !== false}
          busy={
            (busy === 'panic'
              ? 'panic'
              : busy === 'silent'
                ? 'silent'
                : busy === 'medical'
                  ? 'medical'
                  : busy === 'fire'
                    ? 'fire'
                    : null) satisfies PanicNeuBusy
          }
          onPanic={() => send('panic')}
          onSilent={() => send('silent')}
          onMedical={() => send('medical')}
          onFire={() => send('fire')}
        />
      )}

      {msg ? <p className="alert alert--success">{msg}</p> : null}
      </div>

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
      <OpsUndoToast toast={undo.toast} onDismiss={undo.clear} />
    </div>
  );
}
