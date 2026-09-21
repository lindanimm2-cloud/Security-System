'use client';

import { useState } from 'react';
import { pushPriorityAlert } from '@/components/control-room/PriorityAlertProvider';
import type { PriorityAlert, PriorityAlertKind } from '@/lib/alert-priority';
import {
  listAlertSounds,
  previewAlertSound,
  requestDesktopPermission,
  type AlertSoundId,
} from '@/lib/alert-engine';
import { CONTROL_ROOM_ROUTES } from '@/lib/control-room-routes';
import { adminApi } from '@/lib/api-client';

type TestDef = {
  id: string;
  label: string;
  kind: PriorityAlertKind;
  tier: PriorityAlert['tier'];
  title: string;
  subtitle: string;
  sound?: AlertSoundId;
  /** Optional demo ingest that creates a correlated incident via IntegrationsModule stubs. */
  ingest?: () => Promise<void>;
};

const TESTS: TestDef[] = [
  {
    id: 'panic',
    label: 'Test Panic',
    kind: 'panic',
    tier: 'critical',
    title: 'PANIC ACTIVATED',
    subtitle: 'TEST MODE — Client · 12 Example Road · Unit: none assigned',
    sound: 'panic',
  },
  {
    id: 'voice-sos',
    label: 'Test Voice SOS',
    kind: 'panic',
    tier: 'critical',
    title: 'VOICE SOS · ALEXA',
    subtitle: 'TEST MODE — Voice emergency via assistant · no real skill',
    sound: 'panic',
    ingest: async () => {
      await adminApi.post('/integrations/voice/command', {
        platform: 'alexa',
        level: 'EMERGENCY',
        confirmed: true,
        lat: -29.8587,
        lng: 31.0218,
      });
    },
  },
  {
    id: 'voice-silent',
    label: 'Test Silent Voice',
    kind: 'silent',
    tier: 'critical',
    title: 'SILENT VOICE SOS',
    subtitle: 'TEST MODE — Covert voice phrase · haptic only',
    sound: 'silent',
    ingest: async () => {
      await adminApi.post('/integrations/voice/command', {
        platform: 'siri',
        level: 'SILENT_SOS',
        silentEnabled: true,
        lat: -29.8587,
        lng: 31.0218,
      });
    },
  },
  {
    id: 'crash',
    label: 'Test Crash',
    kind: 'panic',
    tier: 'critical',
    title: 'SEVERE VEHICULAR CRASH DETECTED',
    subtitle: 'TEST MODE — OS_CONFIRMED crash signal · no SafetyKit entitlement claimed',
    sound: 'panic',
    ingest: async () => {
      await adminApi.post('/integrations/crash/event', {
        platform: 'apple-safetykit',
        confidence: 'OS_CONFIRMED',
        lat: -29.81,
        lng: 31.04,
      });
    },
  },
  {
    id: 'medical',
    label: 'Test Medical',
    kind: 'medical',
    tier: 'critical',
    title: 'Medical emergency',
    subtitle: 'TEST MODE — ALS requested · no real dispatch',
    sound: 'medical',
  },
  {
    id: 'fire',
    label: 'Test Fire',
    kind: 'fire',
    tier: 'critical',
    title: 'Fire / alarm triggered',
    subtitle: 'TEST MODE — Site alarm · channels online',
    sound: 'fire',
  },
  {
    id: 'vehicle',
    label: 'Test Vehicle',
    kind: 'theft',
    tier: 'high',
    title: 'Vehicle theft / recovery',
    subtitle: 'TEST MODE — Recovery mode armed',
    sound: 'theft',
  },
  {
    id: 'officer',
    label: 'Test Officer SOS',
    kind: 'call',
    tier: 'critical',
    title: 'Officer SOS',
    subtitle: 'TEST MODE — Field officer distress',
    sound: 'officer_sos',
  },
  {
    id: 'high',
    label: 'Test Notification',
    kind: 'high',
    tier: 'high',
    title: 'Ops notification',
    subtitle: 'TEST MODE — High priority briefing',
    sound: 'high',
  },
  {
    id: 'sla',
    label: 'Test SLA',
    kind: 'critical',
    tier: 'high',
    title: 'SLA overdue',
    subtitle: 'TEST MODE — Response window breached',
    sound: 'sla',
  },
];

export function AlertEngineTestPanel() {
  const [note, setNote] = useState('');
  const sounds = listAlertSounds();

  async function fire(def: TestDef) {
    if (def.ingest) {
      try {
        await def.ingest();
        pushPriorityAlert({
          id: `test-${def.id}-${Date.now()}`,
          tier: def.tier,
          kind: def.kind,
          category: def.kind === 'silent' ? 'SILENT_PANIC' : 'PANIC',
          title: def.title,
          subtitle: def.subtitle,
          link: CONTROL_ROOM_ROUTES.overview,
          incidentId: `demo-${def.id}`,
          createdAt: new Date().toISOString(),
          force: true,
        });
        setNote(`${def.label} ingested · demo incident + alert · TEST MODE — NO REAL DISPATCH`);
        return;
      } catch (err) {
        setNote(
          `${def.label} ingest failed (${err instanceof Error ? err.message : 'error'}) — firing local alert only`,
        );
      }
    }
    pushPriorityAlert({
      id: `test-${def.id}-${Date.now()}`,
      tier: def.tier,
      kind: def.kind,
      category:
        def.kind === 'medical'
          ? 'MEDICAL'
          : def.kind === 'theft'
            ? 'THEFT_RECOVERY'
            : def.kind === 'silent'
              ? 'SILENT_PANIC'
              : 'PANIC',
      title: def.title,
      subtitle: def.subtitle,
      link: CONTROL_ROOM_ROUTES.overview,
      incidentId: def.tier === 'critical' ? `test-incident-${def.id}` : undefined,
      createdAt: new Date().toISOString(),
      force: true,
    });
    setNote(`${def.label} fired · TEST MODE — NO REAL DISPATCH`);
  }

  return (
    <section className="alert-engine-test panel" aria-label="Alert engine tests">
      <header className="ops-board__pane-head" style={{ borderBottom: 'none', paddingLeft: 0 }}>
        <div>
          <h2>Alert engine · Test console</h2>
          <p className="text-muted">
            TEST MODE — NO REAL DISPATCH. Sounds, overlay, tab title, and escalation timers run locally.
            Voice SOS / Crash buttons also hit demo ingest routes.
          </p>
        </div>
      </header>

      <div className="alert-engine-test__grid">
        {TESTS.map((def) => (
          <button key={def.id} type="button" className="ops-act" onClick={() => void fire(def)}>
            {def.label}
          </button>
        ))}
        <button
          type="button"
          className="ops-act ops-act--dispatch"
          onClick={async () => {
            const perm = await requestDesktopPermission();
            setNote(`Desktop notification permission: ${perm}`);
          }}
        >
          Test desktop push permission
        </button>
      </div>

      <h3 className="alert-engine-test__sub">Sound library</h3>
      <div className="alert-engine-test__grid">
        {sounds.map((s) => (
          <button
            key={s.id}
            type="button"
            className="ops-act ops-act--open"
            onClick={() => {
              previewAlertSound(s.id);
              setNote(`Playing · ${s.label}`);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {note ? (
        <p className="alert alert--success" role="status" style={{ marginTop: '0.75rem', fontSize: '0.82rem' }}>
          {note}
        </p>
      ) : null}
    </section>
  );
}
