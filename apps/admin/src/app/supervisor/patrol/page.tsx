'use client';

import { useState } from 'react';
import { SupervisorLayout } from '@/components/supervisor/SupervisorLayout';
import { adminApi } from '@/lib/api-client';

export default function SupervisorPatrolPage() {
  return (
    <SupervisorLayout title="Patrol checkpoints">
      <PatrolContent />
    </SupervisorLayout>
  );
}

function PatrolContent() {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function scan() {
    setBusy(true);
    try {
      await adminApi.post('/supervisor/patrol/checkin', {
        code: code || 'GEO-UMHLANGA-01',
        method: code ? 'QR' : 'GEO',
      });
      setMsg(`Checkpoint logged · ${code || 'geo fence Umhlanga'}`);
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-content">
      <section className="portal-card">
        <h2>QR / geo check-in</h2>
        <p className="text-muted">MVP — scan a checkpoint code or log the current geo fence.</p>
        <input
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Checkpoint code"
          aria-label="Checkpoint code"
        />
        <div className="queue-card__actions" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void scan()}>
            {busy ? 'Logging…' : 'Log checkpoint'}
          </button>
        </div>
        {msg ? (
          <p className="alert alert--success" role="status">
            {msg}
          </p>
        ) : null}
      </section>
    </div>
  );
}
