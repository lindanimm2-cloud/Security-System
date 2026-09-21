'use client';

import { useEffect, useState } from 'react';
import {
  DUTY_CHECKLIST,
  OPS_READY_ACK_KEY,
  probeOperationalChecks,
} from '@/lib/officer-duty';

/**
 * First-session “Operational Ready” gate.
 * Explains Persistent Operational Mode honestly — OS may still stop the app;
 * 4DS Cloud remains source of truth for duty + alerts.
 */
export function OperationalReadyGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      if (sessionStorage.getItem(OPS_READY_ACK_KEY) === '1') {
        setReady(true);
        return;
      }
    } catch {
      /* private mode */
    }
    setReady(false);
    void probeOperationalChecks().then(setChecks);
  }, []);

  if (ready === null) return null;
  if (ready) return <>{children}</>;

  const rows = [
    { key: 'controlRoom', label: 'Connected' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'sound', label: 'Emergency alerts' },
    { key: 'location', label: 'Location' },
    { key: 'background', label: 'Background operation' },
    { key: 'deviceRegistered', label: 'Device registered' },
  ];

  return (
    <div className="ops-ready-gate" role="dialog" aria-modal="true" aria-labelledby="ops-ready-title">
      <div className="ops-ready-gate__panel">
        <p className="ops-ready-gate__brand">4DS MOBILE</p>
        <h1 id="ops-ready-title">Operational Status</h1>
        <ul className="ops-ready-gate__list">
          {rows.map((row) => {
            const ok = checks[row.key] !== false;
            return (
              <li key={row.key} className={ok ? 'is-ok' : 'is-warn'}>
                <span aria-hidden>{ok ? '🟢' : '🟡'}</span>
                <span>{row.label}</span>
              </li>
            );
          })}
        </ul>
        <p className="ops-ready-gate__ready">OPERATION READY</p>
        <p className="ops-ready-gate__copy">
          You can safely leave this screen. 4DS continues receiving authorized operational alerts
          through OS-supported background and push mechanisms. The cloud remains the source of
          truth — Duty Mode is not a fake “can’t close” lock.
        </p>
        <button
          type="button"
          className="btn-primary ops-ready-gate__cta"
          onClick={() => {
            try {
              sessionStorage.setItem(OPS_READY_ACK_KEY, '1');
            } catch {
              /* ignore */
            }
            setReady(true);
          }}
        >
          Continue
        </button>
        <p className="ops-ready-gate__hint">
          Start <strong>Duty Mode</strong> before a shift to verify{' '}
          {DUTY_CHECKLIST.length} readiness checks and begin heartbeats for Control Room.
        </p>
      </div>
    </div>
  );
}
