'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { OrgPageHeader } from '@/components/org/OrgPageChrome';
import { IntercomStationPanel } from '@/components/access/IntercomStationPanel';
import { ParkingTicketAssist } from '@/components/access/ParkingTicketAssist';
import {
  accessKindLabel,
  handlePhysicalControlDemo,
  listDemoAccessPoints,
  type DemoAccessPoint,
} from '@/lib/demo/demo-physical-control';
import { getOrgSession } from '@/lib/org';

const MALL_PROPERTY_ID = 'demo-prop-4';

type OrgGateTab = 'gates' | 'ticket' | 'intercoms';

export default function OrgGatesPage() {
  const params = useParams();
  const organizationId = String(params.organizationId);
  void organizationId;

  const [tab, setTab] = useState<OrgGateTab>('gates');
  const [tick, setTick] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pendingCommand, setPendingCommand] = useState<'OPEN' | 'CLOSE' | 'LOCK' | 'UNLOCK' | null>(
    null,
  );
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    function refresh() {
      setTick((n) => n + 1);
    }
    window.addEventListener('4ds-org-session-changed', refresh);
    return () => window.removeEventListener('4ds-org-session-changed', refresh);
  }, []);

  const actorName = useMemo(() => {
    const session = getOrgSession();
    const name = `${session?.user.firstName ?? ''} ${session?.user.lastName ?? ''}`.trim();
    return name || session?.user.email || 'Mall security';
  }, [tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  const gates = useMemo(() => {
    void tick;
    return listDemoAccessPoints(MALL_PROPERTY_ID);
  }, [tick]);

  function requestAction(gate: DemoAccessPoint, action: 'OPEN' | 'CLOSE' | 'LOCK' | 'UNLOCK') {
    setConfirmId(gate.id);
    setPendingCommand(action);
    setMessage(`Confirm ${action.replace(/_/g, ' ').toLowerCase()} for ${gate.name}. Action will be audited.`);
  }

  function confirmAction() {
    if (!confirmId || !pendingCommand) return;
    setBusyId(confirmId);
    const result = handlePhysicalControlDemo({
      clean: `/org/access-points/${confirmId}/command`,
      method: 'POST',
      payload: { command: pendingCommand, confirmedClear: true },
      actorName,
    });
    if (result.handled && result.response.success) {
      setMessage(`${pendingCommand.replace(/_/g, ' ')} sent — audited for ${actorName}.`);
    } else {
      const err = (result.handled ? result.response.data : null) as { error?: string } | null;
      setMessage(err?.error ?? 'Command failed');
    }
    setConfirmId(null);
    setPendingCommand(null);
    setBusyId(null);
    reload();
  }

  return (
    <div className="org-page">
      <OrgPageHeader
        title="Gates & intercoms"
        subtitle="Mall security desk — remote booms, ticket assist when the card machine fails, and booth intercoms."
      />

      <div className="gates-comms-tabs" role="tablist" aria-label="Gate operations">
        {(
          [
            ['gates', 'Gates'],
            ['ticket', 'Ticket assist'],
            ['intercoms', 'Intercoms'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`gates-comms-tabs__btn ${tab === id ? 'is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? <p className="org-confirm-banner">{message}</p> : null}

      {tab === 'gates' ? (
        <div className="org-gate-grid">
          {gates.map((gate) => (
            <article
              key={gate.id}
              className={`org-gate-card org-gate-card--${gate.state.toLowerCase()}`}
            >
              <p className="org-gate-card__site">
                {gate.site} · {accessKindLabel(gate.kind)}
              </p>
              <h2>{gate.name}</h2>
              <p className="org-gate-card__status">{gate.state.replace(/_/g, ' ')}</p>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.78rem' }}>
                {gate.lastEvent}
              </p>
              <div className="org-gate-card__actions">
                <button
                  type="button"
                  className="org-gate-action"
                  disabled={busyId === gate.id || gate.state === 'OFFLINE'}
                  onClick={() => requestAction(gate, 'OPEN')}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="org-gate-action"
                  disabled={busyId === gate.id || gate.state === 'OFFLINE'}
                  onClick={() => requestAction(gate, 'CLOSE')}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="org-gate-action org-gate-action--warn"
                  disabled={busyId === gate.id || gate.state === 'OFFLINE'}
                  onClick={() => requestAction(gate, 'LOCK')}
                >
                  Lock
                </button>
                <button
                  type="button"
                  className="org-gate-action org-gate-action--danger"
                  disabled={busyId === gate.id || gate.state === 'OFFLINE'}
                  onClick={() => requestAction(gate, 'UNLOCK')}
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
                  <button
                    type="button"
                    className="org-btn"
                    onClick={() => {
                      setConfirmId(null);
                      setPendingCommand(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {tab === 'ticket' ? (
        <ParkingTicketAssist
          mode="org"
          defaultAccessPointId="ap-mall-park-exit"
          onOpened={() => {
            setMessage('Exit boom raised — ticket assist audited.');
            reload();
          }}
        />
      ) : null}

      {tab === 'intercoms' ? (
        <IntercomStationPanel
          mode="org"
          propertyId={MALL_PROPERTY_ID}
          onChanged={reload}
        />
      ) : null}
    </div>
  );
}
