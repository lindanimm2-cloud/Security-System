'use client';

import Link from 'next/link';
import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi, type ApiResponse } from '@/lib/api-client';

type TeamData = {
  id: string;
  name: string;
  branch: { id: string; name: string; code: string } | null;
  myRole: 'LEAD' | 'MEMBER';
  members: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    jobTitle: string | null;
    isLead: boolean;
    isMe: boolean;
    openJobs: number;
    statusLabel: string;
  }[];
};

export default function TechTeamPage() {
  return (
    <TechLayout title="My Team">
      <TechTeamContent />
    </TechLayout>
  );
}

function TechTeamContent() {
  const { data, loading, error, reload } = useApi(
    () => techApi.get<ApiResponse<TeamData | null>>('/store/tech/team'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading team..." />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;

  const team = data?.data;
  if (!team) {
    return (
      <div className="page-content">
        <div className="empty-state">
          You are not assigned to a tech team yet. Ask control room to add you to Install Tech Unit.
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>{team.name}</h1>
          <p className="text-muted">
            {team.branch ? `${team.branch.name} (${team.branch.code})` : 'Field install unit'}
            {' · '}
            {team.members.length} technicians
            {team.myRole === 'LEAD' ? ' · You are team lead' : ''}
          </p>
        </div>
        <div className="entity-card-actions">
          <Link href="/tech/chat" className="btn-primary">
            Team chat
          </Link>
          <Link href="/tech/inventory" className="btn-secondary">
            Parts / inventory
          </Link>
        </div>
      </div>

      <div className="tech-profile-grid">
        {team.members.map((m) => (
          <article
            key={m.id}
            className={`tech-profile-card ${m.isMe ? 'tech-profile-card--me' : ''}`}
          >
            <div className="card-header-row">
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
                {m.firstName} {m.lastName}
                {m.isMe ? ' (you)' : ''}
              </h2>
              {m.isLead && <span className="badge">Lead</span>}
            </div>
            <p className="text-muted" style={{ margin: '0.35rem 0' }}>
              {m.jobTitle ?? 'Technician'}
            </p>
            <p>
              <span className={`status-pill status-pill--${m.statusLabel === 'Available' ? 'ok' : 'pending'}`}>
                {m.statusLabel}
              </span>
              {m.openJobs > 0 ? ` · ${m.openJobs} open job${m.openJobs === 1 ? '' : 's'}` : ''}
            </p>
            {m.phone && (
              <p style={{ marginTop: '0.5rem' }}>
                <a href={`tel:${m.phone}`}>{m.phone}</a>
              </p>
            )}
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              {m.email}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
