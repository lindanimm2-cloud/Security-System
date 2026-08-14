'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SupervisorLayout } from '@/components/supervisor/SupervisorLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { OpsKpi } from '@/components/ops/OpsKpi';
import { PORTAL_HOME_PRIORITIES } from '@/lib/portal-priority';

type SupervisorHome = {
  incidents: { id: string; type: string; user: string; location: string; slaBreached: boolean }[];
  officers: {
    onDuty: number;
    onScene: number;
    available: number;
    needingAttention: number;
    roster: { id: string; name: string; status: string; zone: string }[];
  };
};

export default function SupervisorHomePage() {
  return (
    <SupervisorLayout title="Supervisor desk">
      <SupervisorHomeContent />
    </SupervisorLayout>
  );
}

function SupervisorHomeContent() {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<SupervisorHome>>('/supervisor/dashboard'),
    [],
  );
  const [focus, setFocus] = useState<'all' | 'duty' | 'scene' | 'available' | 'attention'>('all');
  const p = PORTAL_HOME_PRIORITIES.supervisor;
  const d = data?.data;

  if (loading) return <LoadingSpinner label="Loading supervisor desk…" fullScreen />;
  if (error || !d) return <ErrorAlert error={error} onRetry={reload} />;

  const roster = d.officers.roster.filter((o) => {
    const s = o.status.toUpperCase();
    if (focus === 'scene') return s.includes('SCENE') || s === 'ON_SCENE';
    if (focus === 'available') return s === 'AVAILABLE';
    if (focus === 'attention') return ['BUSY', 'SOS', 'LATE', 'OFFLINE'].includes(s);
    if (focus === 'duty') return s !== 'OFF_DUTY' && s !== 'OFFLINE';
    return true;
  });

  return (
    <div className="page-content">
      <p className="text-muted" style={{ fontSize: '0.8rem' }}>
        Priority · {p.p1} → {p.p2} → {p.p3} → {p.p4}
      </p>
      <div className="ops-board__kpi" style={{ marginBottom: '1rem' }}>
        <OpsKpi
          label="On duty"
          value={d.officers.onDuty}
          active={focus === 'duty'}
          onClick={() => setFocus(focus === 'duty' ? 'all' : 'duty')}
        />
        <OpsKpi
          label="On scene"
          value={d.officers.onScene}
          active={focus === 'scene'}
          onClick={() => setFocus(focus === 'scene' ? 'all' : 'scene')}
        />
        <OpsKpi
          label="Available"
          value={d.officers.available}
          active={focus === 'available'}
          onClick={() => setFocus(focus === 'available' ? 'all' : 'available')}
        />
        <OpsKpi
          label="Need attention"
          value={d.officers.needingAttention}
          hot={d.officers.needingAttention > 0}
          active={focus === 'attention'}
          onClick={() => setFocus(focus === 'attention' ? 'all' : 'attention')}
        />
      </div>

      <section className="portal-card" style={{ marginBottom: '1rem' }}>
        <div className="card-header-row">
          <h2>Active incidents</h2>
          <Link href="/supervisor/map" className="link-sm">
            Officer map
          </Link>
        </div>
        {d.incidents.length === 0 ? (
          <p className="text-muted">No open incidents.</p>
        ) : (
          <ul className="incident-list">
            {d.incidents.map((i) => (
              <li key={i.id} className="incident-row">
                <div>
                  <strong>
                    {i.type} — {i.user}
                  </strong>
                  <span className="text-muted">
                    {i.location}
                    {i.slaBreached ? ' · SLA breach' : ''}
                  </span>
                </div>
                <Link href={`/control-room/incidents?id=${i.id}`} className="btn-sm">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="portal-card">
        <h2>Deployment</h2>
        <ul className="officer-list">
          {roster.map((o) => (
            <li key={o.id} className="officer-row">
              <div>
                <div className="officer-name">{o.name}</div>
                <div className="officer-meta">
                  {o.status} · {o.zone}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
