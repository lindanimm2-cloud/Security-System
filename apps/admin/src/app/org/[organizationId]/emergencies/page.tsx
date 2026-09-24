'use client';

import { useState } from 'react';
import { OrgPageHeader } from '@/components/org/OrgPageChrome';

const EMERGENCY_TYPES = [
  { id: 'panic', label: 'PANIC', tone: 'danger' },
  { id: 'medical', label: 'MEDICAL', tone: 'danger' },
  { id: 'fire', label: 'FIRE', tone: 'danger' },
  { id: 'threat', label: 'SECURITY THREAT', tone: 'warn' },
  { id: 'evac', label: 'EVACUATION', tone: 'warn' },
  { id: 'lockdown', label: 'LOCKDOWN', tone: 'warn' },
] as const;

export default function OrgEmergenciesPage() {
  const [active, setActive] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <div className="org-page">
      <OrgPageHeader
        title="Panic & SOS"
        subtitle="Organization-wide emergency controls. Red is reserved for genuine emergencies."
      />

      {active ? (
        <div className="org-active-emergency" role="alert">
          <strong>ACTIVE EMERGENCY · {active}</strong>
          <p>Control room notified · Responders coordinating · Broadcast channels open</p>
          <button type="button" className="org-btn" onClick={() => setActive(null)}>
            Mark resolved
          </button>
        </div>
      ) : null}

      <div className="org-emergency-grid">
        {EMERGENCY_TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`org-emergency-btn org-emergency-btn--${item.tone}`}
            onClick={() => setConfirm(item.label)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {confirm ? (
        <div className="org-gate-confirm org-gate-confirm--block">
          <p>
            Confirm initiating <strong>{confirm}</strong> for the current site scope? This alerts
            organization security and control room.
          </p>
          <button
            type="button"
            className="org-btn org-btn--danger"
            onClick={() => {
              setActive(confirm);
              setConfirm(null);
            }}
          >
            Confirm emergency
          </button>
          <button type="button" className="org-btn" onClick={() => setConfirm(null)}>
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
