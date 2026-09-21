'use client';

import { ErrorAlert } from '@/components/ErrorAlert';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { officerApi, type ApiResponse } from '@/lib/api-client';
import { friendlyErrorMessage } from '@/lib/friendly-error';
import { useOfficerStatus } from '@/components/officer/OfficerStatusProvider';
import {
  DUTY_CHECKLIST,
  collectDutyDeviceTelemetry,
  deviceLinkLabel,
  probeOperationalChecks,
  type OfficerDutySnapshot,
} from '@/lib/officer-duty';

export default function OfficerDutyPage() {
  return (
    <OfficerLayout title="Duty Mode">
      <DutyContent />
    </OfficerLayout>
  );
}

function DutyContent() {
  const { reload: reloadStatus } = useOfficerStatus();
  const { data, loading, error, reload } = useApi(
    () => officerApi.get<ApiResponse<OfficerDutySnapshot>>('/officer/duty'),
    [],
  );
  const duty = data?.data;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [probing, setProbing] = useState(false);

  const runProbe = useCallback(async () => {
    setProbing(true);
    try {
      const next = await probeOperationalChecks();
      setChecks(next);
    } finally {
      setProbing(false);
    }
  }, []);

  useEffect(() => {
    void runProbe();
  }, [runProbe]);

  async function startDuty() {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const probed = Object.keys(checks).length ? checks : await probeOperationalChecks();
      setChecks(probed);
      const telemetry = await collectDutyDeviceTelemetry();
      await officerApi.post('/officer/duty/start', {
        checks: probed,
        ...telemetry,
      });
      setMsg('Duty Mode active. Heartbeats will keep Control Room updated.');
      reload();
      reloadStatus();
    } catch (e) {
      setErr(friendlyErrorMessage(e, 'Could not start Duty Mode'));
    } finally {
      setBusy(false);
    }
  }

  async function endDuty() {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await officerApi.post('/officer/duty/end', {});
      setMsg('Duty ended. You are off duty.');
      reload();
      reloadStatus();
    } catch (e) {
      setErr(friendlyErrorMessage(e, 'Could not end Duty Mode'));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !duty) return <LoadingSpinner label="Loading Duty Mode…" />;
  if (error) return <ErrorAlert error={error} />;

  const active = Boolean(duty?.dutyModeActive);
  const link = duty?.deviceLink ?? 'STANDBY';

  return (
    <div className="duty-mode">
      <section className={`duty-mode__hero ${active ? 'is-active' : ''}`}>
        <p className="duty-mode__kicker">Persistent Operational Mode</p>
        <h2>{active ? '🟢 DUTY ACTIVE' : 'Duty Mode'}</h2>
        <p className="duty-mode__lede">
          {active
            ? 'You can leave the app, lock the phone, or use other apps. Alerts continue via OS-supported push and background mechanisms. 4DS Cloud remains the source of truth.'
            : 'Start Duty Mode at the beginning of your shift. This verifies readiness and registers your device with Control Room — it does not prevent the OS from stopping the app.'}
        </p>
        <div className="duty-mode__status-row">
          <span className={`duty-chip duty-chip--${link.toLowerCase()}`}>
            {deviceLinkLabel(link)}
          </span>
          <span className="duty-chip">{duty?.status?.replace(/_/g, ' ') ?? '—'}</span>
        </div>
        <div className="duty-mode__actions">
          {active ? (
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => void endDuty()}>
              End Duty
            </button>
          ) : (
            <button type="button" className="btn-primary" disabled={busy || probing} onClick={() => void startDuty()}>
              Start Duty Mode
            </button>
          )}
          <button type="button" className="btn-ghost" disabled={probing} onClick={() => void runProbe()}>
            {probing ? 'Checking…' : 'Re-check readiness'}
          </button>
        </div>
        {msg ? <p className="duty-mode__msg">{msg}</p> : null}
        {err ? <ErrorAlert error={err} /> : null}
      </section>

      <section className="field-ops-panel duty-mode__checks">
        <div className="field-ops-panel__head">
          <div>
            <p className="field-ops-panel__kicker">Readiness</p>
            <h2>Operational checks</h2>
          </div>
        </div>
        <ul className="duty-check-list">
          {DUTY_CHECKLIST.map((item) => {
            const ok = checks[item.key] ?? Boolean(duty?.operationalChecks?.[item.key]);
            return (
              <li key={item.key} className={ok ? 'is-ok' : 'is-warn'}>
                <span aria-hidden>{ok ? '✓' : '!'}</span>
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="field-ops-panel duty-mode__device">
        <div className="field-ops-panel__head">
          <div>
            <p className="field-ops-panel__kicker">Device Security</p>
            <h2>4DS Device Security</h2>
          </div>
          <span className={`duty-chip duty-chip--${link.toLowerCase()}`}>
            {link === 'ONLINE' || link === 'STANDBY' ? '🟢 Trusted' : '⚠️ Offline'}
          </span>
        </div>
        <dl className="duty-device-grid">
          <div>
            <dt>Device</dt>
            <dd>{duty?.deviceLabel ?? '—'}</dd>
          </div>
          <div>
            <dt>Last heartbeat</dt>
            <dd>{duty?.lastHeartbeatAt ? new Date(duty.lastHeartbeatAt).toLocaleTimeString() : '—'}</dd>
          </div>
          <div>
            <dt>Battery</dt>
            <dd>{duty?.batteryPct != null ? `${duty.batteryPct}%` : '—'}</dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd>{duty?.networkType ?? '—'}</dd>
          </div>
          <div>
            <dt>GPS</dt>
            <dd>{duty?.lat != null && duty?.lng != null ? 'Available' : 'Unavailable'}</dd>
          </div>
          <div>
            <dt>Notifications</dt>
            <dd>
              {typeof Notification !== 'undefined' && Notification.permission === 'granted'
                ? 'Enabled'
                : 'Check permission'}
            </dd>
          </div>
          <div>
            <dt>Duty Mode</dt>
            <dd>{active ? 'ACTIVE' : 'INACTIVE'}</dd>
          </div>
          <div>
            <dt>App version</dt>
            <dd>{duty?.appVersion ?? '1.4.0'}</dd>
          </div>
        </dl>
      </section>

      <p className="duty-mode__footnote">
        Native Android builds may use a declared foreground service for active duty sessions.
        iOS uses push and supported background capabilities. See{' '}
        <Link href="/officer/settings">Settings</Link> for account options.
      </p>
    </div>
  );
}
