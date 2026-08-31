'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { ServiceRequestForm } from '@/components/portal/ServiceRequestForm';
import { isServiceRequestKind, SERVICE_REQUESTS } from '@/lib/service-requests';

const TIPS = [
  'Tell someone your route before a late journey.',
  'Keep panic as a 3-second hold so accidental taps do not dispatch.',
  'Share live location for the duration of a trip, then stop sharing.',
  'For product moves, list vehicle count and cargo type so escort is sized correctly.',
  'If a check-in is missed, stay put if safe and wait for control room contact.',
];

export default function ServiceRequestKindPage() {
  return (
    <PortalLayout>
      <KindContent />
    </PortalLayout>
  );
}

function KindContent() {
  const params = useParams();
  const kind = String(params.kind ?? '');

  if (kind === 'tips') {
    return (
      <div className="page-content svc-req">
        <p className="text-muted">
          <Link href="/portal/personal">← Personal security</Link>
        </p>
        <div className="page-header">
          <div>
            <h1>Safety tips</h1>
            <p className="text-muted">Practical habits for check-ins, journeys and escorts.</p>
          </div>
        </div>
        <section className="portal-card">
          <ol className="svc-req__tips">
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ol>
        </section>
      </div>
    );
  }

  if (kind === 'alerts') {
    return (
      <div className="page-content svc-req">
        <p className="text-muted">
          <Link href="/portal/personal">← Personal security</Link>
        </p>
        <div className="page-header">
          <div>
            <h1>Community alerts</h1>
            <p className="text-muted">Neighbourhood alerts for your area appear in Updates.</p>
          </div>
        </div>
        <section className="portal-card">
          <p>You receive local safety alerts when they affect your saved address and safe zones.</p>
          <div className="svc-req__actions" style={{ marginTop: '1rem' }}>
            <Link href="/portal/updates" className="btn-primary">
              Open updates
            </Link>
            <Link href="/portal/safe-zones" className="btn-secondary">
              Manage safe zones
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!isServiceRequestKind(kind)) {
    return (
      <div className="page-content svc-req">
        <p className="text-muted">
          <Link href="/portal/personal">← Personal security</Link>
        </p>
        <div className="page-header">
          <div>
            <h1>Request not found</h1>
            <p className="text-muted">That service type is not available. Pick a request from Personal Security.</p>
          </div>
        </div>
      </div>
    );
  }

  const def = SERVICE_REQUESTS[kind];

  return (
    <div className="page-content svc-req">
      <p className="text-muted">
        <Link href="/portal/personal">← Personal security</Link>
        {' · '}
        <Link href="/portal/requests">My requests</Link>
      </p>
      <div className="page-header">
        <div>
          <h1>{def.title}</h1>
          <p className="text-muted">{def.summary}</p>
        </div>
      </div>
      <ServiceRequestForm def={def} />
    </div>
  );
}
