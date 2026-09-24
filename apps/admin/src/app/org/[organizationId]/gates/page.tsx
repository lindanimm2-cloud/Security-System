'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { OrgPageHeader } from '@/components/org/OrgPageChrome';
import { getOrgSession, listGates } from '@/lib/org';

export default function OrgGatesPage() {
  const params = useParams();
  const organizationId = String(params.organizationId);
  const [tick, setTick] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener('4ds-org-session-changed', refresh);
    return () => window.removeEventListener('4ds-org-session-changed', refresh);
  }, []);

  const siteId = getOrgSession()?.activeSiteId ?? 'all';
  const gates = useMemo(
    () => listGates(organizationId, siteId),
    [organizationId, siteId, tick],
  );

  function requestAction(gateId: string, action: string) {
    setConfirmId(gateId);
    setMessage(`Confirm ${action} for this gate. Action will be audited.`);
  }

  function confirmAction() {
    setMessage('Gate command queued — control room will verify and audit the action.');
    setConfirmId(null);
  }

  return (
    <div className="org-page">
      <OrgPageHeader
        title="Gate control"
        subtitle="Sensitive controls — every open, close, lock, and unlock creates an audit event."
      />
      {message ? <p className="org-confirm-banner">{message}</p> : null}
      <div className="org-gate-grid">
        {gates.map((gate) => (
          <article key={gate.id} className={`org-gate-card org-gate-card--${gate.status.toLowerCase()}`}>
            <p className="org-gate-card__site">{gate.siteName}</p>
            <h2>{gate.name}</h2>
            <p className="org-gate-card__status">{gate.status}</p>
            <div className="org-gate-card__actions">
              <button type="button" className="org-gate-action" onClick={() => requestAction(gate.id, 'OPEN')}>
                Open
              </button>
              <button type="button" className="org-gate-action" onClick={() => requestAction(gate.id, 'CLOSE')}>
                Close
              </button>
              <button
                type="button"
                className="org-gate-action org-gate-action--warn"
                onClick={() => requestAction(gate.id, 'LOCK')}
              >
                Lock
              </button>
              <button
                type="button"
                className="org-gate-action org-gate-action--danger"
                onClick={() => requestAction(gate.id, 'UNLOCK')}
              >
                Unlock
              </button>
            </div>
            {confirmId === gate.id ? (
              <div className="org-gate-confirm">
                <p>Confirm sensitive gate command?</p>
                <button type="button" className="org-btn org-btn--danger" onClick={confirmAction}>
                  Confirm
                </button>
                <button type="button" className="org-btn" onClick={() => setConfirmId(null)}>
                  Cancel
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
