'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import { PORTAL_HOME_PRIORITIES } from '@/lib/portal-priority';

type SiteProfile = {
  id: string;
  name: string;
  address: string;
  alarmStatus: string;
  people: { name: string; role: string; phone: string }[];
  response: { slaMinutes: number; nearestUnit: string; lastIncident: string };
  equipment: { name: string; serial: string; status: string }[];
  incidents: { id: string; type: string; status: string; time: string }[];
};

export default function SiteProfilePage() {
  const params = useParams<{ id: string }>();
  return (
    <ControlRoomLayout title="Site profile">
      <SiteContent id={params.id} />
    </ControlRoomLayout>
  );
}

function SiteContent({ id }: { id: string }) {
  const { data, loading, error, reload } = useApi(
    () => adminApi.get<ApiResponse<SiteProfile>>(`/control-room/sites/${id}`),
    [id],
  );
  const p = PORTAL_HOME_PRIORITIES['control-room'];
  if (loading) return <LoadingSpinner label="Loading site…" fullScreen />;
  if (error || !data?.data) return <ErrorAlert error={error} onRetry={reload} />;
  const s = data.data;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>{s.name}</h1>
          <p className="text-muted">{s.address}</p>
        </div>
        <Link href="/control-room/customers" className="btn-secondary">
          Customers
        </Link>
      </div>
      <p className="text-muted" style={{ fontSize: '0.8rem' }}>
        {p.p1} · site file
      </p>
      <section className="portal-card" style={{ marginBottom: '0.85rem' }}>
        <h2>Security</h2>
        <p>Alarm · {s.alarmStatus}</p>
      </section>
      <section className="portal-card" style={{ marginBottom: '0.85rem' }}>
        <h2>People</h2>
        {s.people.map((person) => (
          <p key={person.phone}>
            {person.name} · {person.role} · {person.phone}
          </p>
        ))}
      </section>
      <section className="portal-card" style={{ marginBottom: '0.85rem' }}>
        <h2>Response</h2>
        <p>
          SLA {s.response.slaMinutes} min · nearest {s.response.nearestUnit} · last{' '}
          {s.response.lastIncident}
        </p>
      </section>
      <section className="portal-card" style={{ marginBottom: '0.85rem' }}>
        <h2>Equipment</h2>
        {s.equipment.map((eq) => (
          <p key={eq.serial}>
            {eq.name} · {eq.serial} · {eq.status}
          </p>
        ))}
      </section>
      <section className="portal-card">
        <h2>Incidents</h2>
        {s.incidents.map((i) => (
          <p key={i.id}>
            <Link href={`/control-room/incidents?id=${i.id}`}>
              {i.type} · {i.status} · {i.time}
            </Link>
          </p>
        ))}
      </section>
    </div>
  );
}
